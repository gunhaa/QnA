# Append-only 로그에 ClickHouse를 쓰는 이유

## 쉬운 설명

일기장을 생각해보자. 어제 쓴 일기를 지우거나 고치지 않고, 매일매일 새 페이지에 그냥 이어서 쓰기만 한다(append-only). 나중에 "지난달에 슬펐던 날이 며칠이었지?"처럼 전체를 쭉 훑어서 세는 질문을 자주 한다면, 일기장을 "감정별로 미리 분류해서 묶어놓은 서랍"에 보관하는 게 훨씬 빠르다. ClickHouse가 바로 그 서랍이다 — 쓰기는 계속 뒤에 붙이기만 하고, 읽을 때는 수많은 페이지를 한꺼번에 집계하는 데 최적화되어 있어서, 로그처럼 "계속 쌓이기만 하고 거의 안 고치는" 데이터를 다루기에 딱 맞다.

## 일반 설명

### 로그 데이터의 본질과 ClickHouse 설계의 일치

로그(애플리케이션 로그, 이벤트 스트림, 메트릭, IoT 데이터 등)는 대표적인 **append-only(추가만 되는) 워크로드**다. 한번 기록된 로그 행은 거의 수정되거나 삭제되지 않고, 시간이 지나며 새 행만 계속 쌓인다. 반면 조회 패턴은 "특정 시간대의 에러 개수", "엔드포인트별 평균 응답시간" 같은 **집계·필터·시간 범위 스캔**이 대부분이다. 이는 ClickHouse가 원래 최적화된 워크로드와 정확히 일치한다.

### 1. 컬럼 지향 저장 + 압축

로그는 컬럼 간 상관관계가 강하고 반복 값이 많다(같은 `status_code`, 같은 `service_name`이 반복). 컬럼 지향 저장은 같은 종류의 값을 연속으로 묶기 때문에:
- 집계 쿼리 시 필요한 컬럼(예: `response_time`)만 읽으면 되어 I/O가 크게 줄고,
- 반복되는 값이 많은 컬럼일수록 압축률이 매우 높아져(LZ4/ZSTD 등) 페타바이트급 로그도 디스크 비용을 크게 절감할 수 있다.

### 2. MergeTree의 불변(immutable) part 구조가 append-only와 궁합이 좋음

ClickHouse의 MergeTree 엔진은 INSERT될 때마다 정렬된 **불변(immutable) part**를 새로 만들고, 백그라운드에서 이 part들을 점진적으로 병합(merge)한다. 즉 내부 동작 자체가 "새 데이터는 뒤에 계속 쌓이고, 기존 데이터는 거의 건드리지 않는다"는 append-only 로그의 특성과 구조적으로 맞아떨어진다.
- 쓰기 시 락(lock) 경합이 거의 없어 고빈도 INSERT와 동시 SELECT가 충돌 없이 가능하다.
- 기존 행을 수정/삭제하는 OLTP식 UPDATE·DELETE는 원래 무겁게 설계되어 있었는데(백그라운드 병합 시점에 반영), 로그처럼 애초에 거의 수정할 필요가 없는 워크로드에서는 이 제약이 단점이 아니라 오히려 성능 이점으로 작용한다.
- 참고로 최근 ClickHouse는 표준 `UPDATE ... SET ... WHERE`, 경량 DELETE, `ReplacingMergeTree`(중복 제거/upsert) 등을 지원하도록 진화했지만, 로그 워크로드에서는 애초에 이런 기능을 거의 쓸 일이 없다는 점 자체가 ClickHouse 선택의 근거가 된다.

### 3. 벡터화 실행으로 대량 집계에 강함

로그 분석 쿼리는 대부분 `COUNT`, `SUM`, `GROUP BY time_bucket` 같은 집계다. ClickHouse는 벡터화 실행(컬럼 값을 배치 단위로 SIMD 연산)으로 이런 집계를 CPU 캐시 친화적으로 처리해, 수십억 행의 로그도 서브초 단위로 응답할 수 있다.

### 4. 시간 기반 파티셔닝과 TTL로 로그 생명주기 관리 용이

로그는 보통 "최근 N일만 조회 빈도가 높고, 오래된 로그는 보관 후 자동 삭제"하는 생명주기를 가진다. ClickHouse는 `PARTITION BY toYYYYMM(timestamp)` 같은 시간 기반 파티셔닝과 `TTL` 절을 지원해, 오래된 파티션을 통째로 자동 삭제하거나 저비용 스토리지로 이동시킬 수 있다. 이는 append-only 로그의 "쓰기는 항상 최신 시점에만, 삭제는 파티션 단위로 한꺼번에"라는 패턴과 잘 맞는다.

### 5. 수평 확장성

로그 볼륨은 트래픽 증가에 따라 계속 늘어나는 경향이 있다. ClickHouse는 `Distributed` 테이블과 샤딩으로 수평 확장이 가능해, 로그 양이 늘어나도 노드를 추가하는 방식으로 대응할 수 있다.

### 요약

append-only 로그는 "쓰기는 단순 추가, 읽기는 대량 집계"라는 단일 패턴을 갖는데, 이는 OLTP(빈번한 단건 갱신·삭제, 트랜잭션 무결성 중시)가 아니라 OLAP의 전형적인 사용 사례다. ClickHouse는 컬럼 지향 저장, 불변 part 기반 MergeTree, 벡터화 실행, TTL 기반 파티션 관리를 통해 이 패턴에 정확히 맞춰 설계되어 있어, 관측성(observability)·로그 분석·이벤트 스트림 저장소로 널리 채택된다.

---

### Sources
- [Using ClickHouse for log analytics | ClickHouse Docs](https://clickhouse.com/docs/knowledgebase/use-clickhouse-for-log-analytics)
- [How to Model Append-Only Event Streams in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-model-append-only-event-streams/view)
- [ClickHouse®: Breaking the Speed Limit for Observability and Analytics](https://horovits.medium.com/clickhouse-breaking-the-speed-limit-for-observability-and-analytics-2004160b2f5e)
- [ClickHouse vs Parseable: Columnar Analytics for Log Data (2026)](https://www.parseable.com/blog/clickhouse-vs-parseable)
- [ClickHouse vs. Postgres: 5 key differences and how to choose](https://www.instaclustr.com/education/clickhouse/clickhouse-vs-postgres-5-key-differences-and-how-to-choose/)
- [Does ClickHouse Support UPDATEs? A 2026 Data Analysis](https://dataanalyticsguide.substack.com/p/clickhouse-update-support)
