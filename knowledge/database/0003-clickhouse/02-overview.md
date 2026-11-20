---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# ClickHouse 개요와 동작 방식

## 쉬운 설명

ClickHouse에 데이터를 넣으면 **정렬된 작은 묶음(파트)** 이 하나 생긴다. 묶음 안에서는 같은 칸(컬럼)끼리 따로 압축해 둔다. 뒤에서 일꾼이 작은 묶음들을 계속 큰 묶음으로 합친다. 질문이 오면 묶음마다 붙은 "여기엔 이 범위 값만 있음" 표지만 보고 필요 없는 묶음을 건너뛰고, 필요한 칸만 꺼내 여러 CPU가 한꺼번에 센다.

## 일반 설명

### 1. 무엇을 해결하나

| 요구 | ClickHouse의 답 |
|---|---|
| 수십억~수조 행을 질의 시점에 집계 | 컬럼 저장 + 벡터화 실행 + 멀티코어 병렬 |
| 초당 수십만~수백만 행 적재 | 삽입 = 새 불변 파트 쓰기, 락 경합 없음 |
| 저장 비용 | 컬럼별 압축 코덱 (LZ4 기본, ZSTD, Delta, Gorilla 등) |
| 표준 도구 연동 | SQL 방언, HTTP·네이티브 프로토콜, JDBC/ODBC, BI 도구 |

대표 용도는 웹·제품 분석, 로그·트레이스 관측성, 광고·과금 집계, 사용자 대상 실시간 대시보드다. 로그에 맞는 이유는 [append-only 로그에 ClickHouse를 쓰는 이유](../../../inquiry/database/0008-clickhouse-append-only-log-reason.md), 컬럼 저장 일반 원리는 [컬럼 지향 vs 행 지향 DB](../../../inquiry/database/0013-columnar-vs-row-oriented-db.md)에 자세히 있다.

### 2. 저장 구조: 테이블 → 파트 → 그래뉼

```
테이블 (MergeTree)
 └─ 파티션 (PARTITION BY toYYYYMM(ts))           ← 삭제·이동 단위
     └─ 파트 (INSERT 1회 = 파트 1개 이상, 불변)    ← 백그라운드 병합 단위
         ├─ 컬럼별 파일 (.bin 압축 데이터 + .mrk 마크)
         ├─ primary.idx  (그래뉼마다 정렬 키 값 1개 = 스파스 인덱스)
         └─ 그래뉼 (기본 8,192행)                   ← 읽기 최소 단위
```

| 요소 | 정의 | 왜 중요한가 |
|---|---|---|
| `ORDER BY` (정렬 키) | 파트 안에서 행을 정렬하는 기준. 별도 `PRIMARY KEY`가 없으면 그대로 기본 키 | **질의 성능을 가장 크게 좌우**한다. 이 키의 앞쪽 컬럼으로 거르는 질의만 그래뉼을 크게 건너뛴다 |
| 기본 키 (스파스 인덱스) | 행마다가 아니라 **그래뉼마다** 1개 항목. 메모리에 상주 | B-tree가 아니다. 유일성을 보장하지 않는다 (같은 키 중복 허용) |
| `PARTITION BY` | 파트를 묶는 논리 단위. 보통 월·일 | 질의 가속보다는 **데이터 수명 관리**(`DROP PARTITION`, TTL)용 |
| 보조 스키핑 인덱스 | `minmax`, `set`, `bloom_filter` 등. 그래뉼 묶음 단위 요약 | 정렬 키에 없는 컬럼의 필터를 보조 |
| `TTL` | 행·컬럼·파트를 기간 후 삭제하거나 다른 디스크(S3 등)로 이동 | 핫/콜드 계층화 |

코덱 체이닝, SIMD 블록 처리, 스파스 인덱스의 세부 원리는 [ClickHouse의 강점 — 컬럼 지향과 복제](../../../inquiry/database/0010-clickhouse-strengths-columnar-and-replica.md)에 있다.

### 3. 쓰기 경로

1. 클라이언트가 `INSERT` 1회를 보낸다.
2. 서버가 행을 정렬 키로 정렬·압축해 **파티션마다 새 파트**를 디스크에 쓴다. 기존 파트는 건드리지 않는다.
3. 백그라운드 스레드가 작은 파트들을 **병합(merge)** 해 큰 파트로 만든다. 이 시점에 엔진별 후처리(중복 제거, 합산 등)가 일어난다.
4. 복제 테이블이면 Keeper에 "새 파트 생김"을 기록하고, 다른 레플리카가 그 파트를 내려받는다.

이 구조의 결과로 **"INSERT는 자주·작게 보내지 말고 크게 묶어서 보낸다"** 가 ClickHouse 사용의 제1원칙이 된다. 공식 권장은 배치당 최소 1,000행, 이상적으로 10,000~100,000행, 초당 약 1회 INSERT다. 배치를 못 하면 서버 측 버퍼링인 **비동기 삽입**(`async_insert=1`)을 쓴다. 이를 어겼을 때 생기는 문제는 [자주 겪는 문제 — 작은 INSERT](./04-pitfalls.md#1-작은-insert를-자주-보낸다)에 있다.

### 4. 읽기 경로

1. **파티션 프루닝**: `WHERE` 조건으로 파티션을 거른다.
2. **기본 키 프루닝**: 스파스 인덱스를 이진 탐색해 해당 그래뉼 범위만 남긴다.
3. **스키핑 인덱스**: 남은 그래뉼을 보조 인덱스로 한 번 더 거른다.
4. **PREWHERE**: 거르기용 컬럼만 먼저 읽어 행을 줄인 뒤 나머지 컬럼을 읽는다.
5. **벡터화 실행**: 블록(기본 최대 65,536행) 단위로 컬럼 배열을 처리하고, 그래뉼 범위를 여러 스레드에 나눈다.

`EXPLAIN indexes = 1`로 각 단계에서 몇 개 파트·그래뉼이 남았는지 볼 수 있다.

### 5. 테이블 엔진

| 엔진 | 병합 시 하는 일 | 쓰는 곳 |
|---|---|---|
| `MergeTree` | 정렬 병합만 | 기본. 로그·이벤트 원본 |
| `ReplacingMergeTree` | 같은 정렬 키의 행 중 최신 버전만 남김 | upsert 흉내, CDC 대상 |
| `SummingMergeTree` | 같은 키의 숫자 컬럼 합산 | 카운터 사전 집계 |
| `AggregatingMergeTree` | 집계 함수의 **중간 상태**(`-State`)를 병합 | 머티리얼라이즈드 뷰의 사전 집계 테이블 |
| `CollapsingMergeTree` / `VersionedCollapsingMergeTree` | `sign` +1/-1 행 쌍을 상쇄 | 상태 변경 이력 |
| `Replicated*MergeTree` | 위 엔진 + Keeper 기반 복제 | 셀프 호스팅 HA |
| `SharedMergeTree` | 위 엔진 + 공유 오브젝트 스토리지 | **ClickHouse Cloud 전용** |
| `Distributed` | 데이터 없음. 여러 샤드에 질의·삽입을 분배 | 셀프 호스팅 샤딩 |
| `Kafka`, `S3`, `PostgreSQL`, `MySQL` 등 | 외부 시스템을 테이블처럼 읽기·쓰기 | 수집·연동 |

**중복 제거·합산은 병합 때만 일어난다.** 병합 전에는 같은 키의 행이 여러 개 보인다. `FINAL`이나 `GROUP BY`로 질의 시점에 정리해야 한다 → [자주 겪는 문제 — ReplacingMergeTree](./04-pitfalls.md#4-replacingmergetree가-바로-중복을-없애-준다고-믿는다).

### 6. 머티리얼라이즈드 뷰와 딕셔너리

- **머티리얼라이즈드 뷰(증분형)**: 원본 테이블에 들어오는 **INSERT 블록마다** `SELECT`를 실행해 결과를 대상 테이블에 넣는 **삽입 트리거**다. 원본 전체를 다시 계산하지 않는다. `AggregatingMergeTree`와 함께 쓰면 "분 단위 집계 테이블"을 실시간으로 유지할 수 있다.
- **리프레시형 머티리얼라이즈드 뷰**: 주기적으로 질의 전체를 다시 실행해 결과를 교체한다.
- **딕셔너리**: 작은 차원 테이블(국가 코드, 상품명)을 메모리 키-값으로 올려 `dictGet()`으로 조회한다. JOIN 대신 쓰는 대표 수단이다.

### 7. 복제와 샤딩

| 구성 | 데이터 위치 | 조정 | 확장 |
|---|---|---|---|
| 단일 노드 | 로컬 디스크 | 없음 | 수직 확장 |
| 셀프 호스팅 클러스터 | 샤드마다 레플리카 N개가 **각자 복사본** 보유 (`ReplicatedMergeTree`) | ClickHouse Keeper(또는 ZooKeeper), 보통 3노드 | `Distributed` 테이블로 샤드 추가 |
| ClickHouse Cloud | **오브젝트 스토리지 1벌**을 모든 컴퓨트 노드가 공유 (`SharedMergeTree`) | Keeper에 메타데이터 | 샤드 없이 레플리카(컴퓨트) 수를 늘림 |

- 복제는 기본 **비동기**다. 한 레플리카에 쓰고 Keeper에 기록하면 나머지가 가져간다. `insert_quorum`으로 N개 레플리카 기록을 기다리게 할 수 있다.
- 복제는 **테이블 단위**, 리더 없음(multi-master): 어느 레플리카에나 쓸 수 있다.
- Keeper·quorum insert의 세부는 [ClickHouse의 강점 — 복제 관점](../../../inquiry/database/0010-clickhouse-strengths-columnar-and-replica.md), 장애 때의 동작은 [장애 유형과 복구](./05-failure-modes.md)에 있다.

### 8. 수정·삭제

| 방법 | 동작 | 비용 |
|---|---|---|
| `ALTER TABLE ... UPDATE/DELETE` (뮤테이션) | 해당 파트를 **새로 써서** 교체. 비동기 | 매우 무거움. 배치성 정정용 |
| `DELETE FROM` (경량 DELETE, 23.3+) | 숨은 `_row_exists` 마스크만 갱신, 실제 제거는 병합 때 | 가벼움. 질의 시 마스크 필터 비용 |
| `UPDATE ... SET` (경량 UPDATE, 25.7+, 베타) | 바뀐 값만 담은 **패치 파트**를 쓰고 읽기·병합 때 적용 | 가벼움. 패치가 쌓이면 읽기 비용 |
| `DROP PARTITION` / `TTL` | 파트·파티션 통째 제거 | 가장 쌈. 로그 보존 기간 관리의 정석 |
| `ReplacingMergeTree`로 새 버전 INSERT | 병합 때 옛 버전 제거 | 쓰기는 쌈, 읽기에 `FINAL` 비용 |

트랜잭션은 **INSERT 1문장 단위로 원자적**이다. 다중 문장 트랜잭션(`BEGIN`/`COMMIT`)은 실험 기능이고 비복제 MergeTree만 지원하며 Cloud에서는 쓸 수 없다.

### 9. 바로 써 보기

```bash
# 단일 노드 실행 (8123: HTTP, 9000: 네이티브 TCP)
docker run -d --name ch -p 8123:8123 -p 9000:9000 clickhouse/clickhouse-server
docker exec -it ch clickhouse-client
```

```sql
CREATE TABLE events
(
    ts       DateTime,
    service  LowCardinality(String),
    status   UInt16,
    latency  Float32 CODEC(Gorilla, ZSTD),
    attrs    JSON
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (service, ts)          -- 자주 거르는 저카디널리티 컬럼 → 시간 순
TTL ts + INTERVAL 90 DAY;       -- 90일 지나면 삭제

-- 분 단위 집계를 실시간 유지
CREATE TABLE events_1m
(
    minute  DateTime,
    service LowCardinality(String),
    cnt     AggregateFunction(count),
    p99     AggregateFunction(quantile(0.99), Float32)
)
ENGINE = AggregatingMergeTree ORDER BY (service, minute);

CREATE MATERIALIZED VIEW events_1m_mv TO events_1m AS
SELECT toStartOfMinute(ts) AS minute, service,
       countState() AS cnt, quantileState(0.99)(latency) AS p99
FROM events GROUP BY minute, service;

-- 조회: -Merge로 중간 상태를 합친다
SELECT minute, countMerge(cnt), quantileMerge(0.99)(p99)
FROM events_1m WHERE service = 'api' GROUP BY minute ORDER BY minute;
```

서버 없이 파일을 바로 질의하려면 `clickhouse-local`(CLI)이나 `chDB`(파이썬 등 임베디드 라이브러리)를 쓴다.

```bash
clickhouse local -q "SELECT status, count() FROM file('access.parquet') GROUP BY status"
```

### 10. 언제 쓰지 말아야 하나

단건 조회·잦은 단건 수정·다중 문장 트랜잭션이 중심인 OLTP, 대형 테이블 간 복잡한 다중 조인이 주력인 경우 등은 다른 선택이 낫다. 근거와 대안은 [트레이드오프 — 쓰지 말아야 할 때](./03-tradeoffs.md#4-쓰지-말아야-할-때)에 있다.

## 관련 문서

- [ClickHouse의 역사](./01-history.md)
- [ClickHouse 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [ClickHouse 사용 시 자주 겪는 문제](./04-pitfalls.md)
- [ClickHouse 장애 유형과 복구](./05-failure-modes.md)
- [ClickHouse란 무엇인가](../../../inquiry/database/0009-clickhouse-overview.md)
- [ClickHouse의 강점 — 컬럼 지향과 복제](../../../inquiry/database/0010-clickhouse-strengths-columnar-and-replica.md)
- [컬럼 지향 vs 행 지향 DB](../../../inquiry/database/0013-columnar-vs-row-oriented-db.md)

## 참고 자료

- [MergeTree table engine — ClickHouse Docs](https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree)
- [A practical introduction to primary indexes in ClickHouse — ClickHouse Docs](https://clickhouse.com/docs/guides/best-practices/sparse-primary-indexes)
- [Selecting an insert strategy — ClickHouse Docs](https://clickhouse.com/docs/best-practices/selecting-an-insert-strategy)
- [Bulk inserts — ClickHouse Docs](https://clickhouse.com/docs/cloud/bestpractices/bulk-inserts)
- [Asynchronous Data Inserts in ClickHouse — ClickHouse Blog](https://clickhouse.com/blog/asynchronous-data-inserts-in-clickhouse)
- [Replicated table engines — ClickHouse Docs](https://clickhouse.com/docs/engines/table-engines/mergetree-family/replication)
- [SharedMergeTree — ClickHouse Docs](https://clickhouse.com/docs/cloud/reference/shared-merge-tree)
- [Lightweight DELETE — ClickHouse Docs](https://clickhouse.com/docs/guides/developer/lightweight-delete)
- [UPDATE statement (lightweight updates) — ClickHouse Docs](https://clickhouse.com/docs/sql-reference/statements/update)
- [Transactional (ACID) support — ClickHouse Docs](https://clickhouse.com/docs/guides/developer/transactional)
- [JSON data type — ClickHouse Docs](https://clickhouse.com/docs/sql-reference/data-types/newjson)
- [Minimize and optimize JOINs (dictionaries) — ClickHouse Docs](https://clickhouse.com/docs/best-practices/minimize-optimize-joins)
- [ClickHouse vs chDB (embedded ClickHouse) — Tinybird](https://www.tinybird.co/blog/clickhouse-vs-chdb-embedded-clickhouse)
