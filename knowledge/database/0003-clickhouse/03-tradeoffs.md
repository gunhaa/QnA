---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# ClickHouse 트레이드오프와 선택 기준

## 쉬운 설명

ClickHouse는 **"많이 세기"를 위해 "하나 고치기"를 포기**했다. 수십억 줄을 눈 깜짝할 새 더하고 셀 수 있지만, 그 대가로 줄 하나를 찾아 고치거나, 여러 표를 복잡하게 이어 붙이거나, 여러 작업을 한 묶음으로 "전부 되거나 전부 안 되거나" 처리하는 일은 서툴다. 그래서 장부(주문·결제) 원본은 다른 DB에 두고, 분석용 사본만 ClickHouse에 둔다.

## 일반 설명

이 문서는 **고르기 전에** 읽는 문서다. 동작 방식은 [개요](./02-overview.md), 고른 뒤 사람이 잘못 쓰는 문제는 [자주 겪는 문제](./04-pitfalls.md), ClickHouse 자체가 깨지는 상황은 [장애 유형과 복구](./05-failures.md)에서 다룬다.

### 1. 핵심 설계 선택: 얻은 것과 포기한 것

| 설계 선택 | 얻은 것 | 포기한 것 (대가) | 수치·사례 |
|---|---|---|---|
| **컬럼 저장 + 컬럼별 압축** | 필요한 컬럼만 읽음, 높은 압축률 | 한 행 전체 조회는 컬럼 수만큼 파일을 엶 | 로그 기준 원본 대비 수~수십 배 압축 사례가 흔하다 ([로그 DB 비교](../../../inquiry/database/0011-clickhouse-vs-timeseries-and-log-db.md)). `SELECT *` 단건 조회는 행 저장 DB보다 느리다 |
| **불변 파트 + 백그라운드 병합** (LSM 계열) | 락 없는 고속 적재, 읽기·쓰기 충돌 없음 | 작은 INSERT가 많으면 파트 폭증. 수정·삭제가 파트 재작성 | 공식 권장: 배치 1만~10만 행, 초당 INSERT 약 1회 |
| **스파스 기본 키** (그래뉼당 1항목, 기본 8,192행) | 인덱스가 작아 메모리 상주, 범위 스캔 빠름 | **유일성 보장 없음**, 단건 점조회는 그래뉼 1개(8,192행)를 읽음 | 기본 키 제약이 없으니 중복 방지는 엔진(`Replacing*`)이나 앱이 책임진다 |
| **정렬 키 1개가 물리 순서를 결정** | 그 키로 거르는 질의는 극단적으로 빠름 | 다른 축으로 거르면 풀 스캔에 가까움. 정렬 키는 나중에 바꾸기 어렵다 | 축이 여럿이면 프로젝션·머티리얼라이즈드 뷰로 **데이터를 한 벌 더** 저장 |
| **비동기 다중 마스터 복제** | 레플리카 수와 무관한 쓰기 지연 | 기본 설정에서 승인된 INSERT가 다른 레플리카에 아직 없을 수 있음 | `insert_quorum`으로 동기화 가능하나 지연 증가 |
| **트랜잭션 최소화** | 단순한 엔진, 높은 처리량 | INSERT 1문장만 원자적. 다중 문장 트랜잭션은 실험 기능, Cloud 미지원 | 원장·재고처럼 여러 행을 함께 바꿔야 하는 데이터에는 쓸 수 없다 |
| **해시 조인 중심, 비정규화 권장** | 넓은 단일 테이블 스캔이 가장 빠름 | 큰 테이블끼리 조인은 오른쪽 테이블을 메모리 해시 테이블로 올려야 함 | 공식 문서: 조인은 비정규화된 단일 테이블보다 본질적으로 비싸다. 25.12부터 조인 순서 자동 재배치 기본 활성으로 개선 중 |

한 줄로 줄이면, ClickHouse는 **스캔·집계 처리량을 위해 점조회·갱신·트랜잭션·조인 유연성을 포기**했다. 경량 DELETE(23.3)·경량 UPDATE(25.7, 베타)·조인 최적화(25.12)는 이 포기한 쪽을 조금씩 되찾는 변화다 ([역사 — 주요 버전](./01-history.md#3-주요-버전-변천)).

### 2. 대안 비교

| 대안 | 다른 점 | ClickHouse 대신 고르는 경우 | 주의 |
|---|---|---|---|
| **Apache Druid** | 실시간 수집 + 세그먼트 사전 인덱싱, 시간 축 중심 | 이미 Druid 운영 경험이 있고 단일 테이블 시계열 집계 위주 | 조인이 브로드캐스트 해시 조인 위주로 제한적, 표준 SQL `UPDATE`/`DELETE` 없음. 구성 요소가 많아 운영 복잡 |
| **Apache Pinot** | 사용자 대상 초고QPS·저지연에 맞춘 인덱스(스타 트리 등), 네이티브 **업서트** | 수천 QPS의 사용자 대면 분석에서 키 기반 업서트가 필요 | 조인 제한적. 벤더(StarTree) 벤치마크 수치는 독립 검증 드묾 |
| **StarRocks** | 비용 기반 옵티마이저, 코로케이트 조인, Primary Key 테이블 업서트 | **다중 테이블 조인**과 잦은 갱신이 중심인 스타 스키마 | 생태계·커뮤니티 규모는 ClickHouse보다 작다. 비교 글 다수가 벤더 계열 |
| **DuckDB** | 단일 프로세스 임베디드, 서버 없음 | 노트북·배치 작업에서 수 GB~수백 GB 파일 분석, 사용자 1명 | 다중 사용자 서빙·수평 확장 없음. ClickHouse 쪽 같은 용도엔 `clickhouse-local`/chDB |
| **Snowflake·BigQuery** | 완전 관리형 DW, 스토리지·컴퓨트 분리 | 사내 BI·ELT 중심, 질의 지연 수 초도 괜찮음 | 사용자 대면 서브초 대시보드·높은 동시성에는 비용이 빨리 커진다 |
| **Elasticsearch / Loki** | 역색인 전문 검색 / 라벨 인덱스 | 자유 텍스트 검색이 주력, 또는 라벨 필터만으로 충분 | 상세 비교는 [시계열·로그 DB와의 비교](../../../inquiry/database/0011-clickhouse-vs-timeseries-and-log-db.md) |
| **TimescaleDB 등 시계열 DB** | PostgreSQL 확장, 완전한 ACID·조인 | 관계형 데이터와 시계열을 한 DB에서, 규모가 중간 | 같은 문서 참조 |
| **PostgreSQL 자체** | OLTP, 행 저장 | 데이터가 수천만 행 이하이고 집계가 가끔 | 커지면 CDC로 ClickHouse에 복제하는 구성이 흔하다 (ClickHouse의 PeerDB 기반 ClickPipes가 이 경로) |

비교 자료 대부분이 벤더 작성이므로, **자기 데이터와 질의로 직접 벤치마크**하는 것이 유일하게 믿을 수 있는 기준이다.

### 3. 주요 선택지

#### 3.1 정렬 키(`ORDER BY`) — 가장 자주 거르는 순서로 고른다

| 원칙 | 이유 |
|---|---|
| `WHERE`에 가장 자주 나오는 컬럼을 앞에 | 스파스 인덱스는 앞쪽 컬럼일수록 프루닝 효과가 크다 |
| 카디널리티 **낮은 것 → 높은 것** 순 (예: `(tenant, service, ts)`) | 앞 컬럼이 고유하면 뒤 컬럼으로는 거의 못 거른다. 비슷한 값이 모여 압축도 좋아진다 |
| 3~4개 정도로 짧게 | 기본 키는 메모리에 상주한다 |
| 다른 축 질의가 많으면 프로젝션·MV | 정렬 키는 테이블 생성 후 사실상 못 바꾼다 (새 테이블로 재적재) |

#### 3.2 파티션 — 수명 관리 단위로 고른다

- 월(`toYYYYMM`) 또는 일 단위가 일반적이다. **질의 가속 수단으로 쓰지 않는다**(그건 정렬 키의 일).
- 고카디널리티 키(사용자 ID 등)로 나누면 파트가 폭증한다 → [자주 겪는 문제 — 파티션](./04-pitfalls.md#2-파티션-키를-너무-잘게-잡는다).

#### 3.3 적재 방식 — 배치할 수 있나로 고른다

| 상황 | 선택 |
|---|---|
| 앱이나 수집기가 묶어 보낼 수 있음 | 동기 INSERT, 배치 1만~10만 행 |
| 수많은 클라이언트가 소량씩 보냄 | `async_insert=1` + `wait_for_async_insert=1`(서버가 버퍼에 모아 한 파트로 씀) |
| Kafka에 이미 있음 | `Kafka` 엔진 + MV, 또는 Kafka Connect·ClickPipes |
| OLTP DB 변경분 | CDC (Debezium, ClickPipes Postgres CDC) → `ReplacingMergeTree` |

#### 3.4 갱신이 필요한 데이터 — 빈도로 고른다

| 갱신 빈도·형태 | 선택 | 대가 |
|---|---|---|
| 거의 없음 (로그·이벤트) | `MergeTree` + TTL | 없음 |
| 키 기준 최신 상태만 필요 (CDC) | `ReplacingMergeTree(version)` | 읽기 때 `FINAL` 또는 `argMax` 집계 |
| 가끔 정정·GDPR 삭제 | 경량 DELETE / 경량 UPDATE | 마스크·패치 파트만큼 읽기 비용 |
| 대량 일괄 정정 | 뮤테이션 또는 파티션 교체(`REPLACE PARTITION`) | 파트 재작성 I/O |
| 잦은 단건 갱신 | **ClickHouse가 아님** — OLTP DB에 두고 CDC | — |

#### 3.5 배포 형태 — 규모와 운영 인력으로 고른다

| 조건 | 선택 | 대가 |
|---|---|---|
| 개발·소규모, 잃어도 재적재 가능 | 단일 노드 | 노드 장애 = 서비스 중단 |
| 데이터가 노드 1대에 들어가고 HA 필요 | 샤드 1 × 레플리카 2 + **Keeper 3대** | Keeper 운영 |
| 데이터·쓰기가 노드 1대를 넘음 | 샤드 N × 레플리카 2 + `Distributed` | 샤드 추가 시 기존 데이터 재분배가 자동이 아님, 샤드 간 조인 비용 |
| 운영 인력 없음, 탄력적 확장 | **ClickHouse Cloud** (SharedMergeTree) | 벤더 종속. Cloud 전용 기능은 OSS로 못 가져감 |

복제 구성 방식 일반론은 [고가용성 구성 방식 — replica vs cluster](../../../inquiry/distributed-systems/0009-high-availability-replication-vs-cluster-and-patterns.md)에 있다.

### 4. 쓰지 말아야 할 때

| 상황 | 이유 | 대신 |
|---|---|---|
| 주문·결제·재고 같은 원장 | 다중 문장 트랜잭션·유일 제약 없음 | PostgreSQL·MySQL. 분석 사본만 ClickHouse로 |
| 기본 키 단건 조회·갱신이 주된 접근 | 점조회도 그래뉼 단위로 읽고, 갱신은 패치·뮤테이션 | OLTP DB, KV 스토어 |
| 대형 팩트 테이블 여러 개의 복잡한 조인이 주력 | 해시 조인 메모리 압박, 비정규화 전제 | StarRocks, 클라우드 DW |
| 데이터가 작음 (수백만 행) | 운영 비용 대비 이득 없음 | PostgreSQL, DuckDB |
| 자유 텍스트 검색·관련도 랭킹이 핵심 | 역색인 검색 엔진이 아님 | Elasticsearch·OpenSearch |
| 이벤트를 한 건씩 실시간으로 보내야 하고 묶을 방법이 없음 | 파트 폭증 | 앞단에 Kafka·수집기 두고 배치, 또는 `async_insert` |

### 5. 선택 체크리스트

- [ ] 주 질의가 **대량 행의 집계·필터**인가, 단건 조회·갱신인가?
- [ ] 원본(source of truth)은 다른 DB나 로그에 있고, ClickHouse는 분석 사본인가?
- [ ] 적재를 1만 행 이상 배치(또는 async insert)로 묶을 수 있는가?
- [ ] 가장 자주 쓰는 필터 조합으로 정렬 키를 정할 수 있는가? 다른 축은 MV·프로젝션으로 감당되는가?
- [ ] 갱신·삭제 빈도와 형태는? `ReplacingMergeTree`·경량 DELETE로 충분한가?
- [ ] 조인 대상이 딕셔너리나 비정규화로 해결되는 작은 차원 테이블인가?
- [ ] 직접 운영한다면 Keeper 3대와 월간/LTS 업그레이드 주기를 감당할 인력이 있는가?
- [ ] 벤더 벤치마크가 아니라 **자기 데이터로** 대안(StarRocks·Pinot·DuckDB 등)과 비교해 봤는가?

## 관련 문서

- [ClickHouse의 역사](./01-history.md)
- [ClickHouse 개요와 동작 방식](./02-overview.md)
- [ClickHouse 사용 시 자주 겪는 문제](./04-pitfalls.md)
- [ClickHouse 장애 유형과 복구](./05-failures.md)
- [ClickHouse는 시계열 DB와 뭐가 다르고, 로그 전용 DB보다 뭐가 나은가](../../../inquiry/database/0011-clickhouse-vs-timeseries-and-log-db.md)
- [컬럼 지향 vs 행 지향 DB](../../../inquiry/database/0013-columnar-vs-row-oriented-db.md)

## 참고 자료

- [A practical introduction to primary indexes in ClickHouse — ClickHouse Docs](https://clickhouse.com/docs/guides/best-practices/sparse-primary-indexes)
- [Bulk inserts — ClickHouse Docs](https://clickhouse.com/docs/cloud/bestpractices/bulk-inserts)
- [Minimize and optimize JOINs — ClickHouse Docs](https://clickhouse.com/docs/best-practices/minimize-optimize-joins)
- [Transactional (ACID) support — ClickHouse Docs](https://clickhouse.com/docs/guides/developer/transactional)
- [How we made ClickHouse UPDATEs 1,000× faster (Part 3: Benchmarks) — ClickHouse Blog](https://clickhouse.com/blog/updates-in-clickhouse-3-benchmarks)
- [Best real-time analytics database for star schema and fast joins (2026 guide) — ClickHouse](https://clickhouse.com/resources/engineering/real-time-analytics-star-schema-joins)
- [Comparing Three Real-Time OLAP Databases: Apache Pinot, Apache Druid, and ClickHouse — StarTree](https://startree.ai/blog/a-tale-of-three-real-time-olap-databases)
- [ClickHouse vs StarRocks for OLAP Workloads — OneUptime](https://oneuptime.com/blog/post/2026-03-31-clickhouse-vs-starrocks-olap-workloads/view)
- [DuckDB vs ClickHouse: Why we use both at PostHog — PostHog](https://posthog.com/blog/duckdb-vs-clickhouse)
- [clickhouse-local vs DuckDB on Two Billion Rows of Costs — Vantage](https://www.vantage.sh/blog/clickhouse-local-vs-duckdb)
- [Postgres CDC in ClickHouse, A year in review — ClickHouse Blog](https://clickhouse.com/blog/postgres-cdc-year-in-review-2025)
- [SharedMergeTree — ClickHouse Docs](https://clickhouse.com/docs/cloud/reference/shared-merge-tree)
