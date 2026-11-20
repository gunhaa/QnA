---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# Redis 트레이드오프와 선택 기준

## 쉬운 설명

Redis는 **요리사가 한 명뿐인 아주 빠른 포장마차**다. 재료를 전부 조리대 위(메모리)에 올려 두고 주문을 한 번에 하나씩만 처리해서 빠르고 실수가 없다. 대신 조리대가 좁아 재료를 많이 못 두고, 손 많이 가는 주문 하나가 들어오면 줄 선 손님이 모두 기다리며, 장부(디스크 기록)는 나중에 몰아 적어서 갑자기 불이 꺼지면 마지막 몇 건이 사라질 수 있다.

## 일반 설명

이 문서는 **고르기 전에** 읽는 문서다. 동작 방식은 [개요](./02-overview.md), 고른 뒤 사람이 잘못 쓰는 문제는 [자주 겪는 문제](./04-pitfalls.md), Redis 자체의 장애는 [장애 대응](./05-failure-modes.md)에서 다룬다.

### 1. 핵심 설계 선택: 얻은 것과 포기한 것

| 설계 선택 | 얻은 것 | 포기한 것 (대가) | 수치·사례 |
|---|---|---|---|
| **인메모리** | 서브 밀리초 응답 | 데이터 크기 ≤ RAM, GB당 비용이 디스크보다 훨씬 비쌈 | 키 하나당 메타데이터 오버헤드가 대략 수십~100바이트대. 작은 값 1억 개면 값보다 오버헤드가 더 클 수 있다 |
| **단일 스레드 명령 실행** | 락 없이 모든 명령이 원자적, 동작 예측이 쉬움 | 명령 실행은 코어 1개. 느린 명령 하나가 전체를 막음 | 8.0의 `io-threads 8`로 처리량 최대 +112%(공식, Intel), 8.2에서 단일 인스턴스 100만 ops/s 돌파. 그래도 **명령 실행 자체는 단일 스레드** |
| **선택적·비동기 영속성** | 디스크 I/O가 응답 경로에 없음 | 크래시 시 유실 창이 생김. 스냅샷마다 `fork()` | RDB는 보통 5분 이상 간격 → 수 분 유실. AOF `everysec`은 최대 1초. 큰 데이터셋에서 `fork()`가 클라이언트를 수 ms~1초 멈출 수 있다(공식 문서) |
| **비동기 복제** | 쓰기 지연이 레플리카 수와 무관 | 승인된 쓰기도 장애 조치 때 사라질 수 있음 | 대조: 다중 AZ 로그에 커밋 후 응답하는 AWS MemoryDB는 쓰기 p50 약 3ms, p99 약 6ms (Redis는 서브 ms) |
| **Cluster: 16384 해시 슬롯, 프록시 없음** | 선형 확장(권장 상한 약 1000노드), 프록시 홉 없음 | 다른 슬롯 키끼리 `MGET`·트랜잭션·Lua 불가, "마지막 장애 조치가 이긴다" 병합 | 공식 명세: 분리 시 소수 쪽 클라이언트의 쓰기는 `cluster-node-timeout`까지 유실될 수 있다 |
| **서버 측 자료구조** | `ZADD`, `INCR`처럼 읽기-수정-쓰기를 왕복 1번으로 원자 처리 | SQL 같은 임의 질의·조인·보조 인덱스 없음. 접근 경로를 키 설계로 미리 정해야 함 | 랭킹·카운터·큐에는 강하지만 "조건으로 검색"은 직접 인덱스(Set/ZSet)를 관리하거나 8.x Search 모듈이 필요 |

한 줄로 줄이면, Redis는 **지연 시간과 단순함을 위해 용량·내구성·질의 표현력을 포기**했다.

### 2. 대안 비교

| 대안 | 다른 점 | 고르는 경우 | 주의 |
|---|---|---|---|
| **Valkey** (BSD-3, Linux Foundation) | Redis 7.2.4 포크. 9.x에서 클러스터 멀티 DB, 원자적 슬롯 이동 | BSD 라이선스가 필요, AWS·GCP 매니지드 비용 절감 | Redis 8.x 신기능(Vector Sets, 통합 Search, LRM 축출 정책)은 없음 |
| **Memcached** | 멀티스레드, 문자열 KV만, 영속성·복제 없음 | 단순 문자열 캐시를 다중 코어로 처리 | 자료구조·TTL 외 기능 없음. 노드 장애 = 그 노드 캐시 소실 |
| **Dragonfly** (소스 공개, 비오픈소스) | 공유 없는(shared-nothing) 멀티스레드, Redis/Memcached 프로토콜 호환 | 한 노드에서 수십 코어를 쓰고 싶음, 클러스터 운영을 피하고 싶음 | 벤더 벤치마크: Graviton에서 Valkey 9.0 대비 쓰기 1.5배(816K vs 548K ops/s). **독립 재현은 드묾**. 라이선스가 BSL 1.1에서 v2.1부터 자체 **DSAL**로 바뀌었다(프로덕션 합계 100 vCPU 초과 시 상용 라이선스, 단독 DB·캐시 제품으로 재배포 금지) |
| **KeyDB** (BSD-3, Snap) | 멀티스레드 Redis 포크, active-active 복제 | 기존 사용처 유지 정도 | 원저자 John Sully가 2025년 1월 Snap을 떠났고 Snap도 Valkey로 돌아갔다는 보도(Momento 블로그, 단일 출처) 등 개발 동력 약화. 신규 도입은 권하지 않는다 |
| **Garnet** (MIT, Microsoft) | .NET 기반 RESP 호환, 멀티스레드 | .NET 생태계, 실험적 대체 | 명령 호환 범위를 사전 확인 |
| **AWS MemoryDB** | Redis/Valkey 호환 + 다중 AZ 트랜잭션 로그 | Redis를 **원장(주 DB)** 으로 쓰고 싶음 | 쓰기 지연이 한 자릿수 ms로 늘어남, ElastiCache보다 비쌈 |
| **앱 로컬 캐시**(Caffeine 등) | 네트워크 홉 없음(ns~μs) | 작고 자주 읽히는 참조 데이터 | 서버마다 사본 → 무효화가 어렵다. Redis와 2단으로 쓰는 경우가 많다 |
| **DB 자체**(버퍼 캐시, 읽기 복제본, 머티리얼라이즈드 뷰) | 정합성 문제가 없음 | 캐시 적중률이 낮거나 데이터가 자주 바뀜 | Redis를 추가하면 무효화·장애 지점이 하나 늘어난다는 비용과 비교 |

### 3. 주요 선택지

#### 3.1 영속성 모드 — 무엇을 잃어도 되나로 고른다

| 용도 | 권장 | 이유 |
|---|---|---|
| 순수 캐시 (원본이 DB에 있음) | 영속성 끔 또는 RDB만 | 재시작 시 다시 채우면 됨. `fork()` 비용과 디스크 I/O 제거 |
| 세션·토큰처럼 잃으면 불편한 데이터 | **RDB + AOF `everysec`** (공식 권장 조합) | 최대 약 1초 유실, RDB 프리앰블로 재시작 빠름 |
| 한 건도 잃으면 안 됨 | AOF `always`는 "매우 느림"(공식). 차라리 원장을 RDBMS에 두거나 MemoryDB | Redis OSS 복제가 비동기라 디스크만 지켜서는 해결되지 않음 |

유실 범위(RPO)·복구 시간(RTO)의 구체 표는 [장애 대응 — 영속성](./05-failure-modes.md#2-영속성-재시작-후-무엇이-남나)에 있다.

#### 3.2 축출 정책 — 데이터의 성격으로 고른다

| 정책 | 축출 대상 | 고르는 경우 |
|---|---|---|
| `noeviction` (기본) | 없음. 메모리가 차면 쓰기 에러 | Redis를 데이터 저장소로 써서 아무것도 지우면 안 될 때 |
| `allkeys-lru` | 전체 키 중 가장 오래 안 쓰인 것 | 다시 만들 수 있는 순수 캐시 |
| `allkeys-lfu` | 전체 키 중 덜 자주 쓰인 것 | 순수 캐시이고 인기도 편차가 클 때 |
| `allkeys-random` | 전체 키 중 무작위 | 접근이 키 전체에 고르게 퍼질 때 |
| `volatile-lru` / `volatile-lfu` / `volatile-ttl` / `volatile-random` | TTL 있는 키만 | 캐시와 지우면 안 되는 데이터가 한 인스턴스에 섞일 때 |
| `allkeys-lrm` / `volatile-lrm` (8.6+) | 마지막 **쓰기** 시점이 오래된 것 | 자주 읽히지만 오래 안 바뀐 값을 지키고 싶을 때. Redis 전용이라 Valkey·매니지드에서는 없을 수 있다 |

- 캐시와 영구 데이터가 섞인 경우 `volatile-*`보다 **인스턴스를 나누는 편이 낫다.**
- 기본값 `noeviction`을 캐시에 그대로 두는 실수, TTL 없는 키만 남아 `volatile-*`가 쓰기 에러를 내는 함정은 [자주 겪는 문제 — 메모리](./04-pitfalls.md#4-메모리-부족과-eviction)에 있다.

#### 3.3 배포 형태 — 크기와 쓰기량으로 고른다

| 조건 | 선택 | 대가 |
|---|---|---|
| 잃어도 되는 캐시, 개발·소규모 | 단일 노드 | Redis 장애 = 캐시 전체 미스 → DB가 감당 가능한지 확인 |
| 데이터가 노드 1대 RAM(흔히 수십 GB)에 들어가고, 자동 장애 조치 필요 | 마스터 + 레플리카 + **Sentinel 3대** | 쓰기 확장 없음 |
| 데이터·쓰기량이 노드 1대를 넘음 | **Cluster** (최소 마스터 3 + 레플리카 3) | 다중 키 연산에 해시 태그 필요, 클러스터 지원 클라이언트 필요, 리샤딩 운영 |

**Sentinel vs Cluster 비교**

| 기준 | Sentinel | Cluster |
|---|---|---|
| 데이터 크기 | 한 노드 메모리에 들어감 | 한 노드를 넘음 |
| 쓰기 처리량 | 마스터 1대 한계 | 샤드 수만큼 확장 |
| 다중 키 명령·트랜잭션·Lua | 제약 없음 | 같은 슬롯에서만 (해시 태그 필요) |
| DB 번호(`SELECT`) | 사용 가능 | DB 0만 (Valkey 9.0은 멀티 DB 지원) |
| 운영 복잡도 | 낮음 | 높음 (리샤딩, 슬롯 관리) |
| 클라이언트 | Sentinel 지원 클라이언트 | Cluster 지원 클라이언트 (`MOVED`/`ASK` 처리) |

장애 조치가 실제로 어떻게 일어나는지는 [장애 대응 — Sentinel](./05-failure-modes.md#4-sentinel-단일-샤드-자동-장애-조치)과 [장애 대응 — Cluster](./05-failure-modes.md#5-cluster-샤딩--자동-장애-조치)에, 제품을 가리지 않는 복제·클러스터 구성 방식 비교는 [고가용성 구성 방식 — replica vs cluster](../../../inquiry/distributed-systems/0009-high-availability-replication-vs-cluster-and-patterns.md)에 있다.

#### 3.4 엔진과 매니지드 서비스 — 라이선스와 비용으로 고른다

| 선택 | 근거 |
|---|---|
| Redis 8.x (RSALv2/SSPLv1/**AGPLv3**) | Vector Sets·Search·JSON 등 최신 기능이 필요. AGPL은 서비스 형태로 수정본을 제공하면 소스 공개 의무가 있으니 법무 확인 |
| Valkey (BSD-3) | 라이선스 부담이 없어야 함. 핵심 명령·RESP 호환 |
| ElastiCache for Valkey | AWS 기준 Redis OSS 대비 노드형 **20%**, 서버리스 **33%** 저렴. Redis OSS → Valkey 무중단 제자리 업그레이드 지원 |
| MemoryDB | 원장 수준 내구성이 필요할 때. 쓰기 지연 증가를 감수 |
| Redis Cloud / Redis Software의 **Flex** | RAM + SSD 계층화. RAM 비율 10~50%로 "메모리보다 큰 데이터"를 GB당 낮은 비용에 둠(벤더 주장 최대 80% 절감). SSD 접근 시 지연 증가 |

### 4. 쓰지 말아야 할 때

| 상황 | 이유 | 대신 |
|---|---|---|
| 데이터가 수백 GB~TB이고 대부분 차가움 | RAM 비용이 데이터 가치보다 큼 | RDBMS·KV 스토어(디스크 기반), 또는 Flex 같은 계층화 |
| 원장 데이터, 감사 대상 거래 | 비동기 복제·`fsync` 정책상 유실 창이 존재 | RDBMS. Redis는 파생 데이터만 |
| 임의 조건 검색·조인·집계 | 질의 언어가 없고 키 설계로 경로를 고정해야 함 | SQL DB, 검색 엔진 |
| 수일~수주 보관·재처리가 필요한 이벤트 로그 | Streams는 메모리 안에서만 보관 | Kafka |
| 정합성이 걸린 분산 락(중복 결제 방지 등) | 장애 조치·GC 정지 시 락 이중 보유 가능 | DB 락, etcd/ZooKeeper, fencing token |
| 캐시 적중률이 낮은데(예: 50% 미만) "일단 캐시" | 무효화 버그·장애 지점만 늘어남 | DB 인덱스·쿼리 튜닝, 읽기 복제본 |

### 5. 선택 체크리스트

- [ ] 데이터 총량(키 오버헤드 포함)과 증가율을 추정했고, `maxmemory`를 물리 메모리의 60~70%로 잡아도 들어가는가?
- [ ] 이 데이터는 **잃어도 되는가**, 1초 유실까지 되는가, 전혀 안 되는가? → 영속성·엔진(MemoryDB) 결정
- [ ] 원본(source of truth)이 Redis 밖에 있는가?
- [ ] 다중 키 연산·트랜잭션·Lua가 필요한가? Cluster라면 해시 태그로 묶을 수 있는 키 설계인가?
- [ ] 쓰기량이 단일 마스터 한계를 넘는가? (넘지 않으면 Sentinel이 운영이 단순하다)
- [ ] O(N) 명령·큰 키 없이 접근 패턴을 설계할 수 있는가?
- [ ] 라이선스: AGPL/RSAL을 받아들일 수 있는가, BSD(Valkey)가 필요한가?
- [ ] Redis 전체 다운 시 DB가 그 트래픽을 견디는가? (못 견디면 HA 구성과 클라이언트 폴백이 필수)
- [ ] 직접 운영할 인력이 있는가, 매니지드로 갈 것인가?

## 관련 문서

- [Redis의 역사](./01-history.md)
- [Redis 개요와 기본 사용법](./02-overview.md)
- [Redis 운영 시 자주 겪는 문제와 해결 방법](./04-pitfalls.md)
- [Redis 장애 대응과 고가용성](./05-failure-modes.md)

## 참고 자료

- [Redis Docs — Persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- [Redis Docs — Redis cluster specification](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/)
- [Redis Docs — Key eviction](https://redis.io/docs/latest/develop/reference/eviction/)
- [Redis 8 is now GA (io-threads 성능) — Redis Blog](https://redis.io/blog/redis-8-ga/)
- [Redis 8.2 GA — Redis Blog](https://redis.io/blog/redis-82-ga/)
- [Redis Open Source 8.6 release notes (LRM 축출 정책)](https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/release-notes/redisce/redisos-8.6-release-notes/)
- [Redis Docs — Flex and Auto Tiering](https://redis.io/docs/latest/operate/rs/databases/flash/)
- [Scale your workloads without paying all-RAM prices — Redis Blog](https://redis.io/blog/scale-your-workloads-without-paying-all-ram-prices/)
- [Announcing Amazon ElastiCache for Valkey — AWS](https://aws.amazon.com/about-aws/whats-new/2024/10/amazon-elasticache-valkey)
- [Amazon MemoryDB FAQs — AWS](https://aws.amazon.com/memorydb/faqs/)
- [Measuring database performance of Amazon MemoryDB — AWS Database Blog](https://aws.amazon.com/blogs/database/measuring-database-performance-of-amazon-memorydb-for-redis)
- [Amazon MemoryDB: A Fast and Durable Memory-First Cloud Database — Murat Demirbas](https://muratbuffalo.blogspot.com/2024/05/amazon-memorydb-fast-and-durable-memory.html)
- [Dragonfly LICENSE.md (DSAL) — GitHub](https://github.com/dragonflydb/dragonfly/blob/main/LICENSE.md)
- [microsoft/garnet (MIT) — GitHub](https://github.com/microsoft/garnet)
- [Dragonfly vs Valkey 9.0 on AWS Graviton — Dragonfly Blog](https://www.dragonflydb.io/blog/dragonfly-vs-valkey-90-on-aws-graviton-an-honest-head-to-head)
- [Why Snap was willing to fork, and why they still came back — Momento](https://www.gomomento.com/blog/why-snap-was-willing-to-fork-and-why-they-still-came-back/)
- [Snapchat/KeyDB — GitHub](https://github.com/Snapchat/KeyDB)
- [Redis memory usage (키당 오버헤드 분석) — redis-db Google Group](https://groups.google.com/g/redis-db/c/hoOzbJcs5Ek)
- [Redis vs Memcached: Key Differences — Redisson](https://redisson.pro/blog/redis-vs-memcached-key-differences-and-when-to-use-each.html)
