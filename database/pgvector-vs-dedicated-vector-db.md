# pgvector vs 전용 Vector DB 차이

## 쉬운 설명

- **pgvector**: 원래 쓰던 큰 서랍장(PostgreSQL)에 "비슷한 물건 찾기" 칸을 하나 붙인 것. 새 가구를 안 사도 된다.
- **전용 Vector DB**: "비슷한 물건 찾기"만을 위해 만든 전용 창고. 물건이 엄청 많아도 빠르지만, 창고를 하나 더 관리해야 한다.

## 일반 설명

### 1. 정체

| 구분 | pgvector | 전용 Vector DB (Qdrant, Milvus, Pinecone, Weaviate 등) |
|---|---|---|
| 형태 | PostgreSQL **확장(extension)** — `CREATE EXTENSION vector` | 벡터 검색 전용으로 설계된 **독립 DB/서비스** |
| 데이터 모델 | 일반 테이블에 `vector(n)` 컬럼 추가 | 컬렉션 + 포인트(벡터 + payload/메타데이터) |
| 질의 방식 | SQL (`ORDER BY embedding <=> $1 LIMIT k`) | 전용 API/SDK (REST, gRPC) |
| 트랜잭션 | ACID, 비즈니스 데이터와 같은 트랜잭션 | 보통 없음 또는 제한적 (eventual consistency) |

즉 "pgvector vs Vector DB"는 **범용 DB + 벡터 기능** 대 **벡터 특화 엔진**의 비교다. pgvector를 쓴 Postgres도 넓은 의미에서는 vector DB 역할을 한다.

### 2. 인덱스·검색

- **pgvector**
  - 인덱스: `HNSW`, `IVFFlat` (ANN, 근사 최근접 이웃).
  - 거리: L2(`<->`), 코사인(`<=>`), 내적(`<#>`), L1, 해밍/자카드(bit).
  - 타입: `vector`, `halfvec`(float16), `sparsevec`, `bit` → 메모리 절감/양자화 일부 지원.
  - 필터링 한계: ANN 인덱스 스캔 **후에** `WHERE`를 적용(post-filtering)해서, 선택도가 낮은 필터면 결과가 k개보다 적게 나오던 문제가 있었다. 예: 조건이 10% 행만 매칭하고 `hnsw.ef_search=40`이면 평균 4건만 반환. **0.8.0부터 iterative index scan**(`hnsw.iterative_scan = strict_order | relaxed_order`)으로 부족하면 인덱스를 더 훑어 보완한다.
  - HNSW 그래프가 메모리(shared_buffers/OS 캐시)에 올라와야 빠르기 때문에, 벡터 수가 커지면 RAM이 병목. 이를 보완하려 Timescale의 `pgvectorscale`(StreamingDiskANN) 같은 추가 확장이 있다.
- **전용 Vector DB**
  - HNSW 외에 DiskANN, IVF-PQ, GPU 인덱스(Milvus CAGRA 등) 등 선택지가 넓다.
  - **필터 인지형(filter-aware) HNSW**: payload 인덱스를 그래프 탐색 중에 같이 적용(Qdrant 등) → 필터 + 벡터 검색 정확도/속도가 안정적.
  - Product/Scalar/Binary Quantization, 멀티벡터(ColBERT), sparse+dense 하이브리드 검색을 기본 기능으로 제공하는 경우가 많다.

### 3. 확장성·운영

| 항목 | pgvector | 전용 Vector DB |
|---|---|---|
| 적정 규모 | 대략 수백만~1천만 벡터까지 무난 (튜닝 시 그 이상도 가능) | 수억~수십억 벡터 (Milvus 등) |
| 수평 확장 | 기본은 단일 노드. 샤딩은 Citus 등 별도 수단 | 샤딩·레플리카 내장 |
| 인덱스 빌드 | 대량 적재 시 HNSW 빌드가 느리고 `maintenance_work_mem` 영향 큼 | 세그먼트 단위 백그라운드 빌드 |
| 운영 부담 | **기존 Postgres 그대로** — 백업, 모니터링, 권한, HA 재사용 | 새 시스템 추가 → 배포/백업/모니터링/동기화 부담 |
| 데이터 정합성 | 원본 데이터와 임베딩이 **같은 DB** → JOIN, 트랜잭션, 삭제 일관성 쉬움 | 원본 DB와 이중 저장 → CDC/Outbox 등으로 동기화 필요 |

### 4. 언제 무엇을 쓰나

**pgvector가 맞는 경우**
- 이미 PostgreSQL을 쓰고 있고, 벡터 수가 ~1천만 이하.
- 메타데이터 필터, JOIN, 권한(RLS), 트랜잭션이 벡터 검색과 강하게 얽힘 (예: 사내 RAG에서 "부서·문서 권한 + 유사도").
- `tsvector`/`pg_bigm` 같은 키워드 검색과 SQL 하나로 **하이브리드 검색**(RRF) 구성하고 싶을 때.
- Spring AI `PgVectorStore`처럼 프레임워크 지원이 이미 충분할 때.

**전용 Vector DB가 맞는 경우**
- 억 단위 벡터, 높은 QPS, 낮은 p99 지연이 필요.
- 복잡한 필터 + ANN을 대규모로 동시에 돌려야 함.
- 양자화, 멀티벡터, GPU 인덱스 등 고급 벡터 기능이 핵심.
- 벡터 검색 부하를 OLTP DB와 **격리**하고 싶을 때.
- 운영을 아예 맡기고 싶으면 매니지드(Pinecone, Qdrant Cloud, Zilliz 등).

### 5. 요약

> 2026년 기준 업계 합의는 대체로 **"Postgres를 이미 쓰면 pgvector로 시작하고, 규모·필터 성능·지연이 한계에 닿을 때 전용 Vector DB로 옮긴다"**이다. pgvector는 0.8의 iterative scan, halfvec/양자화, Postgres 17·18의 병렬 처리 개선으로 수천만 이하 규모에서는 충분히 프로덕션급이다.

## 출처

- [Vector Database Comparison 2026: pgvector, Pinecone, Turbopuffer, and Qdrant](https://alexcloudstar.com/blog/vector-database-comparison-2026/)
- [Best Vector Databases in 2026 (encore.dev)](https://encore.dev/resources/best-vector-databases)
- [Best Vector Databases in 2026: 8 Options Tested (dupple)](https://dupple.com/learn/best-vector-databases)
- [pgvector iterative index scans (pgEdge docs)](https://docs.pgedge.com/pgvector/v0-8-5/iterative-index-scans/)
- [Announcing pgvector 0.8.0 (Nile)](https://www.thenile.dev/blog/pgvector-080)
- [Supercharging vector search with pgvector 0.8.0 on Aurora (AWS)](https://aws.amazon.com/blogs/database/supercharging-vector-search-performance-and-relevance-with-pgvector-0-8-0-on-amazon-aurora-postgresql)
- [How to scale vector search in Postgres (ClickHouse)](https://clickhouse.com/resources/engineering/scale-vector-search-postgres)
