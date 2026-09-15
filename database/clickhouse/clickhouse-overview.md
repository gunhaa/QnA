# ClickHouse란 무엇인가

## 쉬운 설명

도서관에 책이 아주 많다고 생각해보자. 보통 책(행 기반 DB)은 한 사람의 정보(이름, 나이, 주소 등)를 한 페이지에 몰아서 적어둔다. 그런데 "전국 사람들의 평균 나이"만 알고 싶다면, 이름이나 주소는 필요 없는데도 모든 페이지를 넘겨야 한다.

ClickHouse는 책을 다르게 정리한다. "이름만 모아놓은 서랍", "나이만 모아놓은 서랍", "주소만 모아놓은 서랍"을 따로 만들어둔다. 그래서 "평균 나이"를 물어보면 나이 서랍만 열어보면 되니까 훨씬 빠르다. 대신 "김건하라는 사람의 모든 정보를 보여줘" 같은 질문에는 여러 서랍을 뒤져야 해서 상대적으로 느리다. 그래서 ClickHouse는 "많은 데이터를 한꺼번에 집계·분석"하는 데 특화된 데이터베이스다.

## 일반 설명

### 정의와 위치

ClickHouse는 Yandex에서 시작되어 현재는 ClickHouse, Inc.가 개발하는 오픈소스(Apache 2.0) **컬럼 지향(columnar) OLAP(Online Analytical Processing) DBMS**다. MySQL·PostgreSQL 같은 OLTP(Online Transaction Processing) 데이터베이스가 "적은 행을 빠르게 읽고 쓰는" 트랜잭션 처리에 최적화된 것과 달리, ClickHouse는 "수십억~수조 행을 스캔해 집계 함수를 계산"하는 분석 쿼리에 최적화되어 있다.

### 컬럼 지향 저장구조

- 행 기반(row-oriented) DB는 한 행의 모든 컬럼 값을 디스크에 연속으로 저장한다.
- ClickHouse는 반대로 같은 컬럼의 값들을 연속으로 저장한다.
- 이 구조 덕분에 `SELECT AVG(age) FROM users`처럼 일부 컬럼만 필요한 쿼리는 해당 컬럼 데이터만 디스크에서 읽으면 되어 I/O가 크게 줄어든다.
- 같은 타입의 값이 연속으로 모여 있어 압축률도 높다(같은 값이 반복되거나 패턴이 유사하므로 LZ4, ZSTD 등 압축 알고리즘 효율이 좋음).

### 벡터화 실행(Vectorized Execution)

ClickHouse는 한 번에 한 행씩 처리하는 대신, 한 컬럼의 값들을 배열(벡터) 단위로 묶어 CPU 명령어 하나로 여러 값을 동시에 연산한다(SIMD 활용). 이는 CPU 캐시 활용도를 높이고 분기 예측 실패를 줄여 처리량을 극대화한다.

### MergeTree 엔진 계열

ClickHouse의 핵심 테이블 엔진은 **MergeTree** 계열이다.

- 데이터를 INSERT하면 즉시 정렬된 작은 조각(part)으로 디스크에 기록된다.
- 백그라운드에서 여러 part를 주기적으로 병합(merge)해 더 큰 part로 합치는데, 이 과정에서 정렬 순서를 유지하고 중복 제거·집계 등을 수행할 수 있다(변형 엔진: `ReplacingMergeTree`, `SummingMergeTree`, `AggregatingMergeTree` 등).
- 테이블 정의 시 지정하는 **ORDER BY(정렬 키)**가 사실상 1차 인덱스 역할을 하며, 이를 기반으로 스파스 인덱스(sparse index)를 만들어 불필요한 데이터 블록을 건너뛴다(data skipping).

### 샤딩(Sharding)과 복제(Replication)

두 개념은 서로 다른 목적을 가진다.

- **복제(Replication)**: `ReplicatedMergeTree` 엔진을 사용하면 동일한 데이터를 여러 노드(replica)에 복제해 가용성과 내결함성을 확보한다. 복제 조정에는 ZooKeeper 또는 ClickHouse 자체의 경량 대안인 **ClickHouse Keeper**가 사용된다. INSERT는 자동으로 다른 replica에 전파되지만, SELECT는 접속한 서버 하나에서만 실행된다.
- **샤딩(Sharding)**: 데이터를 여러 서버로 분산 저장해 클러스터를 수평 확장하는 방법이다. `Distributed` 테이블 엔진을 통해 특정 컬럼을 해시 기반 샤딩 키로 사용, 값을 해시화해 어느 샤드에 저장할지 결정한다. 즉 복제는 가용성, 샤딩은 확장성을 담당하며 둘을 조합해 "샤드마다 여러 replica를 두는" 구조를 구성하는 것이 일반적이다.
- 최근에는 ClickHouse Cloud에서 스토리지와 컴퓨팅을 분리한 **SharedMergeTree**를 도입해, 오브젝트 스토리지(S3 등)를 공유하는 방식으로 복제·확장 모델을 단순화하는 추세다.

### 주요 특징 요약

- **압축**: 컬럼 지향 + 다양한 코덱(LZ4, ZSTD, Delta, Gorilla 등)으로 높은 압축률.
- **수평/수직 확장성**: 단일 서버 성능 강화(수직)와 수백~수천 노드 클러스터 구성(수평) 모두 지원.
- **SQL 인터페이스**: 표준 SQL과 유사한 방언을 제공하며, 배열·JSON·중첩 구조 등 분석에 유용한 확장 함수도 풍부.
- **실시간에 가까운 집계**: 페타바이트급 데이터에서도 서브초(sub-second) 단위 응답을 목표로 설계.
- **대표 사용 사례**: Uber, Cloudflare, eBay, ByteDance 등에서 사용자 대상 실시간 분석·로그 분석·모니터링 대시보드 백엔드로 활용.

### OLTP와의 트레이드오프

- 개별 행 단위 UPDATE/DELETE는 원래 무겁다(백그라운드 병합 시점에 반영되는 구조이기 때문). 최근 버전은 "Lightweight Update/Delete" 기능으로 이를 개선하고 있으나, 여전히 OLTP처럼 빈번한 단건 트랜잭션 처리에는 적합하지 않다.
- 따라서 일반적인 아키텍처는 MySQL/PostgreSQL 같은 OLTP DB에서 트랜잭션을 처리하고, 변경분을 ClickHouse로 스트리밍(예: Kafka, CDC)해 분석 전용으로 사용하는 조합이 흔하다.

---

### Sources
- [ClickHouse architecture 101: A comprehensive overview (2026)](https://www.flexera.com/blog/finops/clickhouse-architecture/)
- [What is an OLAP database?](https://clickhouse.com/resources/engineering/olap-database)
- [What is a columnar database?](https://clickhouse.com/resources/engineering/what-is-columnar-database)
- [Fast Open-Source OLAP DBMS | ClickHouse](https://clickhouse.com/)
- [Deep Dive on ClickHouse Sharding and Replication (Altinity, 2024)](https://altinity.com/wp-content/uploads/2024/05/Deep-Dive-on-ClickHouse-Sharding-and-Replication-2024-1-1.pdf)
- [ClickHouse Data Management Internals — MergeTree Storage, Merges, Replication (Altinity, 2023)](https://altinity.com/wp-content/uploads/2023/11/ClickHouse-Data-Management-Internals-MergeTree-Storage-Merges-Replication-2023-11-15.pdf)
- [Replicated* table engines - ClickHouse Documentation](https://clickhouse.com/docs/reference/engines/table-engines/mergetree-family/replication)
- [Replicating data | ClickHouse Docs](https://clickhouse.com/docs/architecture/replication)
- [Introduction to Sharding in ClickHouse | ChistaDATA Blog](https://chistadata.com/sharding-in-clickhouse-part-1/)
- [ClickHouse Cloud boosts performance with SharedMergeTree and Lightweight Updates](https://clickhouse.com/blog/clickhouse-cloud-boosts-performance-with-sharedmergetree-and-lightweight-updates)
