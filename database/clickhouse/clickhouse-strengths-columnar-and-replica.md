# ClickHouse의 강점 — 컬럼 지향 저장과 복제(Replica) 관점 심화

## 쉬운 설명

**컬럼 지향**은 앞서 말한 "서랍 정리"에 한 가지가 더 있다. 서랍 안에서도 비슷한 물건끼리는 "포장을 압축해서" 넣어두고(압축 코덱), 한 번에 여러 개를 손으로 집을 수 있게 규격화해서 쌓아둔다(벡터화 실행). 그리고 서랍 앞에 "이 서랍엔 1번~100번 물건이 있어요"라는 대략적인 표지판만 붙여둬서(스파스 인덱스), 필요 없는 서랍은 아예 열어보지도 않는다.

**복제(Replica)**는 "같은 물건을 여러 창고에 똑같이 보관해두기"다. 창고 관리자들(replica)은 서로 직접 연락하는 대신, 중앙 게시판(ClickHouse Keeper)에 "누가 뭘 넣었는지" 공지를 붙여서 확인한다. 중요한 물건은 "최소 2개 창고에 확실히 들어간 걸 확인하고 나서야 완료 도장을 찍어줘"(quorum insert)라고 요청할 수도 있다.

## 일반 설명

### 1. 컬럼 지향(Columnar) 저장의 심화 원리

기본 개념은 [[clickhouse-overview]]에서 다뤘으니, 여기서는 "왜 빠른가"를 한 단계 더 파고든다.

**(1) 물리적 저장 구조**
- 각 컬럼은 독립된 `.bin` 파일에 저장되며, 값들이 메모리에서도 연속된(contiguous) 배열로 로드된다. 50개 컬럼 중 3개만 필요한 쿼리는 정말로 그 3개 파일만 건드린다 — 나머지 47개는 디스크에서 읽지도 않는다.
- 이 "연속된 메모리 배열"이라는 성질이 다음 두 최적화의 전제 조건이 된다.

**(2) 특화 압축 코덱(Codec)**
- 범용 코덱: LZ4(기본값, 빠른 압축/해제), ZSTD(압축률 더 높음, CPU 비용 더 큼).
- 데이터 타입 특화 코덱: 부동소수점엔 **Gorilla**, 타임스탬프처럼 단조 증가하는 값엔 **Delta 인코딩**, 64비트 정수엔 **T64** 등.
- 코덱은 체이닝 가능하다 — 예를 들어 타임스탬프 컬럼에 `Delta(먼저 차분값으로 변환) + LZ4(그 다음 일반 압축)`를 적용하면 각 단계가 서로 다른 종류의 중복을 제거해 압축률이 배가된다.
- 컬럼마다 값의 성격이 다르므로(같은 타입끼리 모여 있으니) 컬럼별로 최적 코덱을 고를 수 있다는 것 자체가 행 지향 DB는 흉내내기 어려운 구조적 이점이다.

**(3) 벡터화 실행(Vectorized Execution)과 SIMD**
- ClickHouse는 데이터를 최대 65,536개 값 단위의 "블록(vector)"으로 묶어 처리한다(`max_block_size` 기본값).
- 이 블록 단위 처리 덕분에 CPU의 SIMD 명령어(AVX2/AVX-512 등 256~512비트 레지스터)를 활용해 한 번의 명령으로 8~32개 값을 동시에 연산할 수 있다.
- 여기에 멀티스레딩까지 결합된다 — 각 CPU 스레드가 서로 다른 데이터 구간(granule)을 맡고, 그 안에서 다시 SIMD로 병렬화하므로, 16코어 서버라면 "16배 스레드 병렬성 × 8배 SIMD 폭"이 동시에 곱해지는 효과를 얻는다.
- 행 지향 DB의 "한 번에 한 행씩" 처리 방식은 이런 CPU 레벨 병렬화를 활용하기 어렵다.

**(4) 스파스 인덱스(Sparse Index)와 데이터 스키핑**
- B-tree처럼 모든 행을 정밀 인덱싱하는 대신, ClickHouse는 정렬 키 기준으로 일정 간격(기본 8192행 단위 granule)마다 대표값만 기록하는 **스파스 인덱스**를 사용한다.
- 이 덕분에 인덱스 자체가 매우 작아 메모리에 상주시키기 쉽고, 조건에 안 맞는 granule 전체를 건너뛰는(data skipping) 방식으로 B-tree 유지 비용 없이도 빠른 필터링이 가능하다.
- `min_max`, `set`, `bloom_filter` 같은 보조 데이터 스키핑 인덱스를 컬럼별로 추가하면 스캔 범위를 더 좁힐 수 있다.

### 2. 복제(Replica) 관점 심화

**(1) ReplicatedMergeTree와 조정(coordination) 계층**
- 일반 `MergeTree`에 복제 기능을 얹은 것이 `ReplicatedMergeTree`다. 각 replica는 INSERT된 part의 메타데이터(어떤 part가 언제 어디에 생겼는지)를 서로 직접 주고받지 않고, 중앙 조정 서비스에 기록/조회하는 방식으로 동기화한다.
- 조정 서비스로는 전통적으로 **ZooKeeper**(3.4.5 이상)를 썼으나, 현재는 ClickHouse가 직접 만든 **ClickHouse Keeper**(C++로 구현, ZooKeeper와 동일한 데이터 모델·클라이언트 프로토콜 지원)가 기본 권장된다. Keeper는 ZooKeeper의 ZAB 대신 **Raft 합의 알고리즘**을 사용한다.
- Keeper 클러스터는 과반수(quorum) 합의가 필요하므로 홀수 개 노드로 구성한다 — 3대는 1대 장애까지, 5대는 2대 장애까지 허용한다. Keeper 자체의 quorum이 깨지면(과반수 미달) 클러스터 전체의 복제 쓰기가 멈춘다는 점은 운영 시 반드시 고려해야 할 트레이드오프다.

**(2) 쓰기(INSERT) 흐름과 quorum insert**
- 기본적으로 INSERT는 접속한 replica 하나에 먼저 기록되고, 그 사실이 Keeper에 공지되면 다른 replica들이 비동기로 해당 part를 내려받아 복제한다(비동기 복제가 기본).
- 더 강한 내구성이 필요하면 `insert_quorum` 설정으로 "최소 N개 replica가 실제로 데이터를 받아 적었다는 걸 확인한 후에야 INSERT를 성공으로 응답"하도록 강제할 수 있다(기본값 0 = 비활성화). 이는 RDBMS의 동기 복제(synchronous replication)와 유사한 내구성 보장을 제공한다.

**(3) 리더 없는(leaderless) 구조로의 진화 — SharedMergeTree**
- 전통적 `ReplicatedMergeTree`는 replica 간 통신(병합 작업 조율 등)이 상대적으로 많다.
- ClickHouse Cloud에서 도입한 **SharedMergeTree**는 스토리지를 오브젝트 스토리지(S3 등)로 공유하고, replica 간에는 리더 선출 없이 **leaderless 비동기 복제** 방식을 취하며 메타데이터 조율만 Keeper에 맡긴다. 이는 replica 수를 늘릴 때의 복잡도를 크게 낮추는 방향의 아키텍처 진화다.

**(4) 복제의 목적 재확인**
- 복제는 "가용성/내결함성"이 목적이고, 수평 확장(scale-out)은 `Distributed` 테이블과 샤딩이 담당한다는 점은 [[clickhouse-overview]]에서 다룬 그대로다. 다만 quorum insert, Keeper 기반 조정, SharedMergeTree 같은 세부 메커니즘을 알면 "왜 ClickHouse 복제가 RDBMS 복제보다 대량 쓰기에 유리한가"(비동기 기본 + 필요 시에만 quorum 강제)를 이해할 수 있다.

### 3. 두 관점을 합친 ClickHouse의 강점 요약

- **컬럼 지향 + 압축 + 벡터화 + 스파스 인덱스**의 조합은 "읽어야 할 바이트 수 자체를 줄이고, 남은 바이트는 CPU 한 사이클에 최대한 많이 처리"하는 두 축을 동시에 공략한다.
- **Keeper 기반 조정 + 비동기 기본 복제 + 선택적 quorum**은 "대량 INSERT 처리량은 유지하면서, 필요한 경우에만 내구성을 강화"할 수 있는 유연성을 제공한다.
- 두 관점 모두 "기본은 빠르고 가볍게, 필요할 때만 비용을 지불하는" 설계 철학을 공유하며, 이것이 ClickHouse가 대규모 분석 워크로드에서 반복적으로 선택되는 근본 이유다.

---

### Sources
- [How ClickHouse Column-Oriented Storage Works](https://oneuptime.com/blog/post/2026-03-31-clickhouse-column-oriented-storage/view)
- [How ClickHouse Vectorized Query Execution Works](https://oneuptime.com/blog/post/2026-03-31-clickhouse-vectorized-execution/view)
- [ClickHouse architecture 101: A comprehensive overview (2026)](https://www.flexera.com/blog/finops/clickhouse-architecture/)
- [Learning System Design #9: ClickHouse — Why Analytical Databases Are Absurdly Fast](https://sadensmol.com/posts/2026/04/learning-system-design-9-clickhouse/)
- [ReplicatedMergeTree in ClickHouse: Replication via ClickHouse Keeper](https://pulse.support/kb/what-is-clickhouse-replicatedmergetree)
- [ClickHouse Replication: ReplicatedMergeTree, ClickHouse Keeper, and HA Architecture](https://pulse.support/kb/clickhouse-replication)
- [How to Use insert_quorum Setting in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-insert-quorum/view)
- [How to Handle a ClickHouse Keeper Quorum Loss](https://oneuptime.com/blog/post/2026-03-31-clickhouse-handle-keeper-quorum-loss/view)
- [ClickHouse Cluster, Replication, and Keeper in Practice](https://queryplane.com/blog/clickhouse-cluster-replication-and-keeper-in-practice/)
- [A cloud-native replacement of ReplicatedMergeTree — SharedMergeTree](https://www.alibabacloud.com/help/en/clickhouse/product-overview/sharedmergetree-table-engine)
