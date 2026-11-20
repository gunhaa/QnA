---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# ClickHouse 사용 시 흔한 함정과 해결 방법

## 쉬운 설명

사람들은 ClickHouse를 **익숙한 MySQL처럼** 쓰다가 넘어진다. 한 줄씩 자주 넣고, 한 줄씩 고치고, 큰 표끼리 이어 붙이고, "중복은 알아서 지워지겠지" 하고 믿는다. ClickHouse는 이런 사용을 막지 않고 받아 주다가, 어느 순간 느려지거나 "파트가 너무 많다"며 쓰기를 거부한다. 대부분은 엔진 탓이 아니라 **넣는 방식과 테이블 설계** 탓이다.

## 일반 설명

원인이 **사용자**인 문제만 다룬다. 노드·Keeper·디스크처럼 ClickHouse 쪽의 장애는 [장애 유형과 복구](./05-failure-modes.md)에 있다.

| # | 실수 | 증상 | 한 줄 해결 |
|---|---|---|---|
| 1 | 작은 INSERT를 자주 | `TOO_MANY_PARTS`, 병합 CPU 폭주 | 배치 또는 `async_insert` |
| 2 | 파티션을 잘게 | 파트 폭증, 느린 시작 | 월·일 단위 |
| 3 | 정렬 키 설계 실패 | 거의 모든 질의가 풀 스캔 | 필터 순서·카디널리티로 재설계 |
| 4 | Replacing 중복 제거를 즉시로 믿음 | 집계 값이 부풀려짐 | `FINAL`·`argMax` |
| 5 | 뮤테이션을 UPDATE처럼 | 디스크 I/O 폭주, 뮤테이션 적체 | 경량 DELETE/UPDATE, 파티션 교체 |
| 6 | 큰 테이블을 JOIN 오른쪽에 | `MEMORY_LIMIT_EXCEEDED` | 딕셔너리·비정규화 |
| 7 | MV를 뷰처럼 오해 | 과거 데이터·오른쪽 테이블 변경 미반영 | 백필, 리프레시형 MV |
| 8 | 타입을 대충 | 저장·성능 낭비 | 엄격한 타입, `LowCardinality` |
| 9 | 비동기 경로의 내구성 오해 | 승인된 데이터 유실 | `wait_for_async_insert=1`, `distributed_foreground_insert` |

### 1. 작은 INSERT를 자주 보낸다

- **원인**: INSERT 1회마다 파티션별로 새 파트가 생긴다 ([개요 — 쓰기 경로](./02-overview.md#3-쓰기-경로)). 초당 수백 번 한두 행씩 넣으면 병합이 따라가지 못한다.
- **증상**: 처음엔 INSERT가 지연되고(`parts_to_delay_insert`), 파티션의 활성 파트가 `parts_to_throw_insert`를 넘으면 `Too many parts`(에러 코드 252)로 **INSERT가 거부**된다. 병합 때문에 CPU·디스크 사용률이 계속 높다.
- **진단**:
  ```sql
  SELECT database, table, partition, count() AS parts
  FROM system.parts WHERE active
  GROUP BY database, table, partition ORDER BY parts DESC LIMIT 10;
  ```
- **해결**:
  - 클라이언트·수집기(OTel Collector, Vector, Kafka)에서 **배치 1만~10만 행, 초당 약 1회**로 묶는다.
  - 묶을 수 없으면 `async_insert=1`, `wait_for_async_insert=1`.
  - **한도(`parts_to_throw_insert`, `max_parts_in_total`)를 올리는 것은 해결이 아니다.** 공식 문서도 원인을 고치지 않고 에러를 미룰 뿐이며 메타데이터 부담과 질의 성능 저하를 부른다고 경고한다.

### 2. 파티션 키를 너무 잘게 잡는다

- **원인**: `PARTITION BY user_id`, `PARTITION BY toStartOfHour(ts)`처럼 고카디널리티 키. 한 INSERT가 여러 파티션에 걸치면 **파티션 수만큼 파트**가 생기고, 다른 파티션의 파트끼리는 절대 병합되지 않는다.
- **증상**: 1번과 같은 `Too many parts`, 서버 재시작이 느림(파트 메타데이터 로드), 파일 수 폭증.
- **해결**: 월(`toYYYYMM`)이나 일 단위. 파티션은 **수명 관리용**이고 질의 가속은 정렬 키가 맡는다.

### 3. 정렬 키를 MySQL 기본 키처럼 잡는다

- **원인**: `ORDER BY id`(고유 ID)나 `ORDER BY ts`만 두는 경우. 질의는 `WHERE tenant = ? AND service = ?`인데 정렬 키 앞쪽에 그 컬럼이 없다.
- **증상**: 작은 결과를 원하는 질의도 거의 모든 그래뉼을 읽는다.
- **진단**: `EXPLAIN indexes = 1 SELECT ...`로 선택된 그래뉼 비율을 보고, `system.query_log`의 `read_rows`와 결과 행 수를 비교한다.
- **해결**: 자주 거르는 컬럼을 앞에, 카디널리티 낮은 순으로 다시 정한다 ([트레이드오프 — 정렬 키](./03-tradeoffs.md#31-정렬-키order-by--가장-자주-거르는-순서로-고른다)). 정렬 키는 바꿀 수 없으니 새 테이블을 만들고 `INSERT ... SELECT`로 옮긴다. 두 번째 접근 축은 프로젝션이나 MV로 따로 둔다.

### 4. ReplacingMergeTree가 바로 중복을 없애 준다고 믿는다

- **원인**: 중복 제거는 **병합 때만**, 그리고 **같은 파티션 안에서만** 일어난다. 병합이 언제 끝날지는 보장되지 않는다.
- **증상**: CDC로 받은 테이블의 `count()`·`sum()`이 실제보다 크다.
- **해결**:
  - 읽을 때 `SELECT ... FROM t FINAL`(질의 시점 병합이라 추가 비용), 또는 `argMax(value, version)`과 `GROUP BY key`.
  - 같은 키가 다른 파티션에 들어가지 않게 파티션 키를 정한다.
  - 주기적인 `OPTIMIZE TABLE ... FINAL`로 강제 병합하는 것은 큰 테이블에서 전체 재작성이 되므로 피한다.
- `SummingMergeTree`·`AggregatingMergeTree`도 같다. 질의에서 항상 `sum()`·`-Merge`로 한 번 더 집계한다.

### 5. 뮤테이션을 UPDATE처럼 쓴다

- **원인**: `ALTER TABLE ... UPDATE/DELETE`를 행 단위 수정 API처럼 반복 호출. 뮤테이션은 영향을 받는 **파트 전체를 다시 쓰는** 비동기 작업이다.
- **증상**: 디스크 쓰기 폭증, `system.mutations`에 `is_done = 0` 작업이 쌓임, 이후 병합까지 밀림.
- **진단·조치**:
  ```sql
  SELECT database, table, mutation_id, command, parts_to_do, latest_fail_reason
  FROM system.mutations WHERE NOT is_done;
  -- 잘못 건 뮤테이션 중단
  KILL MUTATION WHERE mutation_id = '...';
  ```
- **해결**: 행 삭제는 경량 `DELETE FROM`(23.3+), 소량 갱신은 경량 `UPDATE`(25.7+, 베타라 운영 적용 전 검증), 대량 정정은 파티션 단위로 새로 적재 후 `REPLACE PARTITION`. 갱신이 잦다면 데이터 모델을 `ReplacingMergeTree`로 바꾸거나 원본을 OLTP DB에 둔다.
- 경량 DELETE도 공짜가 아니다. 지운 행은 병합 전까지 디스크에 남고, 대량 삭제는 `SELECT`를 느리게 한다.

### 6. 큰 테이블을 JOIN 오른쪽에 둔다

- **원인**: 기본 해시 조인은 **오른쪽 테이블 전체를 메모리 해시 테이블**로 올린다. 분산 테이블이면 오른쪽 테이블이 샤드마다 전송된다.
- **증상**: `MEMORY_LIMIT_EXCEEDED`, 질의 실패 또는 매우 느림.
- **해결**:
  - 작은 차원 테이블은 **딕셔너리**와 `dictGet()` (공식 권장. 딕셔너리는 키 중복을 허용하지 않는다).
  - 핫 패스는 **비정규화**해 넓은 테이블 하나로.
  - 25.12 이전 버전이면 작은 테이블을 오른쪽에 수동으로 둔다 (25.12부터 조인 순서 재배치 기본 활성).
  - 메모리 한도를 넘을 수밖에 없으면 `grace_hash` 등 디스크 스필 알고리즘을 설정한다.
  - 분산 조인은 `GLOBAL JOIN`으로 오른쪽을 한 번만 브로드캐스트하거나, 같은 키로 샤딩해 로컬 조인.

### 7. 머티리얼라이즈드 뷰를 일반 뷰처럼 생각한다

- **원인**: 증분형 MV는 **원본(SELECT의 가장 왼쪽 테이블)에 들어오는 새 INSERT 블록**에만 반응하는 삽입 트리거다.
- **증상**:
  - MV를 만들기 전 데이터가 대상 테이블에 없다.
  - MV 안에서 JOIN한 오른쪽 테이블이 바뀌어도 기존 결과는 그대로다.
  - 원본에 뮤테이션·DELETE를 해도 MV 대상 테이블은 안 바뀐다.
- **해결**: 생성 후 `INSERT INTO target SELECT ... FROM source WHERE ts < 생성시각`으로 1회 백필. 오른쪽 테이블 변경까지 반영해야 하면 **리프레시형 MV**나 딕셔너리를 쓴다.

### 8. 타입을 대충 정한다

| 실수 | 대가 | 대신 |
|---|---|---|
| 숫자·날짜를 `String`으로 | 비교·집계 느림, 압축 나쁨 | 정확한 숫자·`DateTime` 타입 |
| 습관적 `Nullable` | 컬럼마다 별도 `UInt8` 널 마스크를 처리 | 빈 값·0이 의미상 충분하면 기본값 사용 (공식 권장) |
| 저카디널리티 문자열을 그냥 `String` | 저장·메모리 낭비 | 고유값 약 1만 개 미만이면 `LowCardinality(String)` |
| 25.3 이전 버전에서 새 `JSON` 타입 | 공식 문서상 프로덕션 비권장 | 25.3+로 올리거나, 스키마가 안정된 필드는 일반 컬럼으로 뽑기 |
| 고QPS 경로에 `JSON` 남발 | 고정 타입 컬럼보다 느릴 수 있음 | 자주 쓰는 필드는 타입 컬럼으로 |

### 9. 비동기 경로의 내구성을 오해한다

- `async_insert=1`에 `wait_for_async_insert=0`이면 서버 버퍼에 들어간 시점에 성공을 응답한다. 버퍼를 디스크에 쓰기 전 서버가 죽으면 **승인된 데이터가 사라진다.** 공식 권장은 `wait_for_async_insert=1`.
- `Distributed` 테이블에 INSERT하면 기본은 **백그라운드 전송**이다. 데이터를 먼저 받은 노드 디스크에 두었다가 샤드로 보낸다. 그 노드에 장애가 나거나 배치 파일이 손상되면 유실된다. 즉시 모든 샤드 기록을 보장하려면 `distributed_foreground_insert=1`(옛 이름 `insert_distributed_sync`)을 쓰거나, 샤드의 로컬 테이블에 직접 넣는다.
- 기본 복제는 비동기라 INSERT 승인 직후 그 레플리카가 죽으면 다른 레플리카에 없을 수 있다. 필요하면 `insert_quorum` ([장애 유형과 복구 — 복제](./05-failure-modes.md#3-복제와-keeper)).

### 10. 기타 자주 보는 실수

- `SELECT *`로 넓은 테이블을 조회 → 모든 컬럼 파일을 읽는다. 필요한 컬럼만.
- `ORDER BY` 없이 `LIMIT` 결과가 매번 같다고 가정 → 병렬 실행이라 순서가 바뀐다.
- 운영 서버의 `default` 사용자를 그대로 사용 → 비밀번호·네트워크 제한을 걸고 용도별 사용자·`readonly` 프로필을 만든다.
- 정기 릴리스를 깔고 방치 → 정기 릴리스는 최근 3개만 지원된다. LTS를 쓰거나 매월 올린다 ([역사 — 릴리스 주기](./01-history.md#4-릴리스-주기)).

## 관련 문서

- [ClickHouse의 역사](./01-history.md)
- [ClickHouse 개요와 동작 방식](./02-overview.md)
- [ClickHouse 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [ClickHouse 장애 유형과 복구](./05-failure-modes.md)
- [Append-only 로그에 ClickHouse를 쓰는 이유](../../../inquiry/database/0008-clickhouse-append-only-log-reason.md)

## 참고 자료

- [Exception: Too many parts — ClickHouse Knowledge Base](https://clickhouse.com/docs/knowledgebase/exception-too-many-parts)
- [Bulk inserts — ClickHouse Docs](https://clickhouse.com/docs/cloud/bestpractices/bulk-inserts)
- [Asynchronous Data Inserts in ClickHouse — ClickHouse Blog](https://clickhouse.com/blog/asynchronous-data-inserts-in-clickhouse)
- [A practical introduction to primary indexes in ClickHouse — ClickHouse Docs](https://clickhouse.com/docs/guides/best-practices/sparse-primary-indexes)
- [Lightweight DELETE — ClickHouse Docs](https://clickhouse.com/docs/guides/developer/lightweight-delete)
- [UPDATE statement (lightweight updates) — ClickHouse Docs](https://clickhouse.com/docs/sql-reference/statements/update)
- [Handling Updates and Deletes in ClickHouse — ClickHouse Blog](https://clickhouse.com/blog/handling-updates-and-deletes-in-clickhouse)
- [Minimize and optimize JOINs — ClickHouse Docs](https://clickhouse.com/docs/best-practices/minimize-optimize-joins)
- [Joins in ClickHouse Materialized Views — Altinity](https://altinity.com/blog/2020-07-14-joins-in-clickhouse-materialized-views)
- [Select data types — ClickHouse Docs](https://clickhouse.com/docs/best-practices/select-data-types)
- [JSON data type — ClickHouse Docs](https://clickhouse.com/docs/sql-reference/data-types/newjson)
- [Distributed settings (distributed_foreground_insert) — ClickHouse Docs](https://clickhouse.com/docs/reference/settings/session-settings/distributed)
- [Distributed table engine — ClickHouse Docs](https://clickhouse.com/docs/reference/engines/table-engines/special/distributed)
