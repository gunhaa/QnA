# ClickHouse는 시계열 DB와 뭐가 다르고, 로그 전용 DB보다 뭐가 나은가

## 쉬운 설명

문구점을 생각해보자. "시계열 DB"(InfluxDB 등)는 **시간표 전용 노트**만 파는 가게다 — 시간 순서대로 적는 것 하나는 기가 막히게 잘하지만, 다른 용도로는 잘 안 쓴다. "로그 전용 DB"(Elasticsearch 등)는 **낱말 찾기 사전**처럼, 아무 문장에서나 특정 단어를 빨리 찾는 데 특화된 가게다. ClickHouse는 이 둘과 달리 **모든 종류의 숫자·글자 데이터를 다 담을 수 있는 커다란 정리함**에 가깝다 — 시간표도 넣을 수 있고, 낱말 검색도 어느 정도 되고, 무엇보다 "수억 개 항목을 한꺼번에 더하고 세는" 계산을 압도적으로 빠르고 싸게 한다. 그래서 "전용 도구 하나"보다 "여러 일을 다 잘하면서 특히 집계 계산이 빠른 만능 정리함"을 원할 때 ClickHouse를 고른다.

## 일반 설명

### 1. 시계열(Time-Series) DB와의 차이

| 구분 | 시계열 전용 DB (InfluxDB, TimescaleDB 등) | ClickHouse |
|---|---|---|
| 설계 목적 | 시간축 데이터의 수집·다운샘플링·보존 정책(retention)에 특화 | 범용 컬럼 지향 OLAP — 시계열은 그 하위 사용 사례 중 하나 |
| 데이터 모델 | 메트릭(시간, 태그, 값) 구조에 최적화 | 임의의 스키마(로그, 이벤트, 메트릭, 관계형 데이터 등) 모두 표현 가능 |
| 스토리지 | InfluxDB 3는 Rust + Apache Arrow/Parquet 기반, TimescaleDB는 PostgreSQL 확장(하이퍼테이블) | 자체 컬럼 포맷 + MergeTree, 15~30배 압축률(2026년 벤치마크 기준, TimescaleDB 대비 우위) |
| 트랜잭션/ACID | TimescaleDB는 PostgreSQL 기반이라 ACID·관계형 조인 완비 | ACID 트랜잭션은 제한적 — 분석 목적에 최적화되어 있어 OLTP 대체용이 아님 |
| 강점 영역 | InfluxDB: IoT·인프라 모니터링의 실시간 수집·알림 파이프라인. TimescaleDB: 이미 PostgreSQL 생태계에 있고 관계형 데이터와 시계열을 같은 DB에서 다뤄야 할 때 | 수십억 행 규모의 집계 쿼리를 서브초 단위로 처리해야 할 때, 시계열 외에 로그·이벤트 등 이질적 데이터도 한 곳에서 분석해야 할 때 |

즉, InfluxDB나 TimescaleDB는 "시계열이라는 특정 데이터 모양"에 최적화된 반면, ClickHouse는 "시간 컬럼이 있는 어떤 데이터든 컬럼 지향 저장 + 벡터화 실행으로 빠르게 집계"하는 범용 엔진이라 시계열도 잘 다루지만 그것만을 위해 만들어진 것은 아니다. 실무에서는 "센서 → InfluxDB(실시간 알림) → Kafka → ClickHouse(장기 이력 분석)"처럼 역할을 분담해 함께 쓰는 조합도 흔하다.

### 2. 로그 전용 DB(Elasticsearch, Loki 등) 대비 장점

**(1) 압도적인 압축률과 저장 비용**
- ClickHouse는 컬럼 지향 저장 덕분에 원본 로그 100TB를 약 5~10TB로 압축(10~30배)하는 반면, Elasticsearch는 역인덱스(inverted index) 구조상 오히려 원본보다 부풀어 약 30~50TB로 저장되는 경우가 흔하다.
- Loki는 라벨 기반 인덱스만 유지하고 본문은 그대로 압축 저장해 스토리지는 더 저렴할 수 있지만(100GB/일 로그가 Loki에서 약 30GB/일), 그만큼 자유로운 필드 검색·집계 기능이 제한적이다.

**(2) 대규모 집계 쿼리 속도**
- 수십억 건의 로그를 집계할 때 ClickHouse는 약 100~500ms대 응답을 보이는 반면, Elasticsearch는 같은 규모에서 수 초가 걸리는 경우가 보고된다. Elasticsearch의 역인덱스는 "이 단어가 포함된 문서 찾기"(전문 검색)에는 강하지만, "그룹별 합계·평균" 같은 구조적 집계 연산에는 컬럼 지향 엔진만큼 효율적이지 않다.

**(3) 구조화 데이터에 대한 강점 vs 전문 검색의 강점**
- Elasticsearch/OpenSearch는 비정형 텍스트에 대한 전문 검색(full-text search), 형태소 분석, 관련도 랭킹에서 여전히 강점을 가진다.
- ClickHouse는 구조화된 필드(상태 코드, 서비스명, 응답시간 등)에 대한 필터·집계·시계열 분석에서 우위를 가지며, JSON 컬럼 타입으로 반정형 로그도 상당 부분 다룰 수 있다.
- 즉 "로그 텍스트 자체를 자연어처럼 검색"해야 하는 비중이 크면 Elasticsearch 계열이, "로그를 구조화된 이벤트로 보고 집계·대시보드·알림에 쓰는" 비중이 크면 ClickHouse가 유리하다.

**(4) 실제 채택 사례**
- Uber, Cloudflare 등은 로그 볼륨이 커지면서 Elastic Stack(ELK)의 스토리지 비용·집계 성능 한계에 부딪혀 ClickHouse 기반으로 전환한 대표 사례로 자주 언급된다.
- [[clickstack-overview]]에서 다룬 ClickStack(ClickHouse + OTel Collector + HyperDX)도 바로 이 지점 — "로그 전용 DB의 비용/성능 한계를 컬럼 지향 OLAP 엔진으로 해결"하려는 오픈소스 답이다.

### 3. 요약 — 언제 ClickHouse를 고르는가

- 로그·메트릭·이벤트를 **하나의 저장소에서 통합 집계·상관관계 분석**하고 싶을 때 (ClickStack의 "wide event" 모델처럼).
- 전문 검색(자연어 텍스트 매칭)보다 **구조화된 필드 기반 필터링·집계·대시보드**가 주된 조회 패턴일 때.
- 데이터 볼륨이 커서 **저장 비용과 쿼리 지연시간을 동시에 줄여야** 할 때.
- 반대로, 순수 텍스트 전문 검색이 핵심이거나(Elasticsearch), 비용을 극한까지 줄이고 라벨 기반 필터링만으로 충분하거나(Loki), PostgreSQL 생태계 안에서 관계형+시계열을 함께 다뤄야 한다면(TimescaleDB) 각 전용 도구가 더 적합할 수 있다.

---

### Sources
- [ClickHouse vs TimescaleDB vs InfluxDB: 2026 Benchmarks & Comparison](https://sanj.dev/post/clickhouse-timescaledb-influxdb-time-series-comparison/)
- [ClickHouse vs TimescaleDB vs InfluxDB: Picking the Right Analytics Database for Your Self-Hosted Stack](https://blog.elest.io/clickhouse-vs-timescaledb-vs-influxdb-picking-the-right-analytics-database-for-your-self-hosted-stack/)
- [ClickHouse vs Elasticsearch for Log Analytics](https://oneuptime.com/blog/post/2026-01-21-clickhouse-vs-elasticsearch/view)
- [ClickHouse vs Elasticsearch 2026: Log Analytics and Search Comparison](https://tasrieit.com/blog/clickhouse-vs-elasticsearch-2026)
- [Loki vs Elasticsearch 2026: Key Differences | SigNoz](https://signoz.io/blog/loki-vs-elasticsearch/)
- [Elasticsearch vs. OpenSearch vs. Loki vs. Quickwit vs. ClickHouse: UX, Dashboards & Alerts](https://blog.none.at/blog/2026/2026-05-14-es-os-loki-quickwit-clickhouse-ux/)
