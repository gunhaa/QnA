---
type: knowledge
created: 2026-11-20
author: agent
model: claude-opus-5-5
---

# Redis 락 트레이드오프와 선택 기준

## 쉬운 설명

Redis 락은 **빠르고 간편한 대신 "가끔 두 명이 동시에 열쇠를 가질 수 있는" 자물쇠**다. 열쇠를 30초 뒤 저절로 사라지게 만들어서 주인이 쓰러져도 문이 영원히 잠기지 않게 했고, 그 대가로 주인이 잠깐 멈춘 사이 열쇠가 사라질 수 있게 됐다. 그래서 "같은 일을 두 번 하면 조금 손해" 정도의 일에는 좋지만, "두 번 하면 돈이 두 번 나가는" 일에는 자물쇠 말고 다른 안전장치가 함께 필요하다.

## 일반 설명

> 각 방식이 **어떻게 동작하는지**는 [개요](./02-overview.md), 고른 뒤 **잘못 쓰는 패턴**은 [흔한 함정](./04-pitfalls.md), **장애 유형**은 [장애 유형](./05-failure-modes.md)에 있다.

### 1. 핵심 설계 선택: 얻은 것과 포기한 것

| 설계 선택 | 얻은 것 | 포기한 것 |
|---|---|---|
| **인메모리 + 단일 스레드 명령 실행** | 획득·해제가 네트워크 왕복 1번(같은 데이터센터 기준 1ms 안쪽). `SET NX` 하나로 원자적 | 디스크 기록 전 장애 시 락 소실 |
| **TTL(lease) 기반** | 보유자가 죽어도 TTL 뒤 자동 해제 → 영구 교착 없음 | 보유자가 **살아 있는데** 멈추면(GC, 네트워크) 락이 먼저 풀림 → 동시 보유 |
| **비동기 복제** | 마스터 쓰기 지연이 복제에 묶이지 않음 | 장애 조치 시 아직 복제 안 된 락이 사라짐 |
| **합의 없음** | 노드 1대로 운영 가능, 구조 단순 | 락 서비스 자체가 "누가 보유자인지"를 장애 중에도 보장하지 못함 |
| **fencing token 기본 미제공** | 키 하나로 끝나는 단순함 | 정확성을 지키려면 보호 대상 쪽 검사가 따로 필요 |

### 2. 효율용인가, 정확성용인가

락을 고르기 전 가장 먼저 답할 질문이다 (Kleppmann의 구분).

| | 효율용 (efficiency) | 정확성용 (correctness) |
|---|---|---|
| 목적 | 같은 일을 여러 번 하지 않게 | 동시에 실행되면 데이터가 틀어짐 |
| 락이 가끔 뚫리면 | 비용이 조금 늘어남 (중복 계산, 알림 2번) | 이중 결제, 재고 음수, 데이터 손상 |
| 예 | 스케줄러 배치, 캐시 재계산(stampede 방지), 외부 API 호출 횟수 절약 | 결제·정산, 재고 차감, 계좌 이체, 파일 덮어쓰기 |
| Redis 락 | **단일 Redis로 충분** | Redis 락 **+ fencing token / DB 제약 / 멱등성**, 또는 다른 수단 |

정확성용인데 Redis 락만 쓰고 있다면 그 락은 **최적화**일 뿐이고, 진짜 안전장치는 DB의 유니크 제약·조건부 UPDATE·트랜잭션이어야 한다.

### 3. 대안 비교

| 수단 | 획득 비용 | 장애 중 상호 배제 | fencing | 맞는 곳 |
|---|---|---|---|---|
| **Redis 단일/복제** | 왕복 1번, 1ms 안쪽 | 장애 조치·멈춤 시 뚫릴 수 있음 | 직접 구현(`INCR`) 또는 `RFencedLock` | 효율용, 높은 획득 빈도 |
| **Redlock (독립 5대)** | 5대 병렬 왕복 | 소수 노드 장애는 견딤, 멈춤·시계 문제는 남음 | 없음 | 단일 Redis보다 가용성이 필요한 효율용. 실무에선 드묾 |
| **DB 행 락** (`SELECT ... FOR UPDATE`) | 트랜잭션 + 커넥션 점유 | 트랜잭션 안에서 보장 | 필요 없음(같은 트랜잭션) | 보호 대상이 그 DB의 행일 때 → [MySQL 락](../0004-mysql-lock/03-tradeoffs.md) |
| **DB advisory lock** (MySQL `GET_LOCK`, PostgreSQL `pg_advisory_lock`) | 커넥션(세션) 점유 | 세션이 끊기면 해제 | 없음 | 이미 DB가 있고 획득 빈도가 낮을 때 |
| **낙관적 락** (`version` 컬럼, `@Version`) | 락 없음, 커밋 시 비교 | 충돌 시 한쪽 실패 | 버전 자체가 fencing | 충돌이 드문 갱신 |
| **유니크 제약·멱등키** | INSERT 1번 | DB가 보장 | 필요 없음 | "한 번만 실행" 보장 (결제 요청 ID 등) |
| **etcd** (lease + revision) | Raft 합의 + 디스크 fsync, 수 ms | 과반 합의로 보장 | `revision`이 단조 증가 | 정확성용 락, 리더 선출 |
| **ZooKeeper** (ephemeral sequential znode) | ZAB 합의, 수 ms | 세션 만료 기반으로 보장 | `zxid`/znode 순번 | 정확성용, 기존 ZK 인프라가 있을 때 |
| **파티셔닝으로 락 제거** | 없음 | 같은 키는 한 소비자만 처리 | 오프셋 | Kafka 키 파티셔닝, 액터 모델 |

- 가장 좋은 락은 **필요 없게 만드는 것**이다. 같은 주문을 한 워커에게만 보내면(키 파티셔닝) 락이 사라진다.
- 보호 대상이 DB 한 곳이면 **DB 안에서 해결**하는 것이 Redis 락 + DB보다 단순하고 정확하다.

### 4. 주요 선택지

#### 4.1 TTL 길이 — 작업 시간 분포로 정한다

| TTL | 장점 | 위험 |
|---|---|---|
| 짧게 (작업 p99보다 짧음) | 보유자가 죽으면 빨리 회복 | **작업 도중 만료** → 동시 실행 |
| 길게 (p99의 2~3배) | 정상 작업 중 만료 거의 없음 | 보유자 사망 시 그만큼 대기 |
| 짧은 TTL + 자동 연장(watchdog) | 둘의 장점 | 프로세스가 살아 있지만 멈춘(hang) 경우 **영원히 연장** |

권장: 작업에 **자체 타임아웃을 TTL보다 짧게** 두고, 자동 연장을 쓰더라도 작업 타임아웃이 연장을 끊게 한다.

#### 4.2 기다리는 방식 — 경합 정도로 고른다

| 상황 | 방식 |
|---|---|
| "누가 하면 나는 안 해도 됨" (배치, 캐시 재계산) | **즉시 포기** (`tryLock(0)`) |
| 경합 낮음, 대기 짧음 | 스핀 + 지수 백오프·지터 |
| 경합 높음, 대기 김 | Pub/Sub 알림 (Redisson `RLock`) |
| 순서가 중요 | 공정 락 (`RFairLock`) — 처리량은 떨어짐 |
| 락 키가 매우 많음(수만 개 동시) | `RSpinLock` — 키마다 Pub/Sub 구독을 만들지 않음 |

#### 4.3 배포 형태 — 장애 조치 때 락을 잃어도 되나

| 배포 | 장애 시 락 | 고를 때 |
|---|---|---|
| 단일 인스턴스 | 락 서비스 중단, 재시작 시 락 소실 | 효율용, 락 서비스 중단을 견딜 수 있음 |
| Replica + Sentinel / Cluster | 장애 조치 순간 일부 락 소실 가능 | 효율용 대부분. 캐시용 Redis와 함께 쓰는 흔한 구성 |
| Replica + `WAIT 1 timeout` | 복제 확인 후 진행 → 유실 확률 감소(0은 아님) | 유실을 줄이고 싶고 지연을 감수 |
| Redlock 5대 | 소수 장애 견딤 | 거의 고르지 않는다. 그 비용이면 etcd를 검토 |

캐시용 Redis와 락용 Redis를 나눌지: 캐시 축출(eviction)·대량 쓰기·`FLUSHALL`이 락에 영향을 줄 수 있으므로, 락이 중요하면 **`noeviction` 정책의 별도 인스턴스(또는 논리 분리)** 를 쓴다 → [흔한 함정](./04-pitfalls.md#9-축출-정책이-락-키를-지움-실수).

#### 4.4 구현 — 직접 만들까, 라이브러리를 쓸까

| 선택 | 맞는 곳 | 주의 |
|---|---|---|
| **Redisson** `RLock` | Java, 재진입·자동 연장·대기 알림이 필요 | 스레드 귀속(코루틴·비동기에서 주의), 의존성 큼 |
| Redisson `RFencedLock` | 정확성용, 보호 대상이 토큰을 검사할 수 있음 | 저장소 쪽 검사 구현 필요 |
| Spring `RedisLockRegistry` | 스프링 통합, `Lock` 인터페이스만 필요 | 자동 연장 없음 → TTL을 넉넉히 |
| **ShedLock** | `@Scheduled` 중복 실행 방지 | 상호 배제가 아니라 "주기당 한 번 실행" 용도 |
| 직접 구현 (`SET NX PX` + `DELEX`/Lua) | 의존성 최소, 언어 무관 | 재진입·연장·재시도를 직접. Redis 8.4+/Valkey 9.0+이면 Lua 없이 가능 |

### 5. 쓰지 말아야 할 때

| 상황 | 이유 | 대신 |
|---|---|---|
| 보호 대상이 같은 DB의 행뿐 | DB 트랜잭션·락이 더 정확하고, 두 시스템 사이 틈이 없음 | `FOR UPDATE`, 조건부 UPDATE, 낙관적 락 |
| 정확성이 필수인데 fencing을 걸 곳이 없음 | 락이 뚫리는 순간을 막을 수단이 없음 | etcd/ZooKeeper + fencing, 멱등키 |
| 락 보유 시간이 길다(수 분~시간) | TTL·연장 관리가 어려워지고 장애 시 대기 김 | 작업 상태 테이블(상태 컬럼 + 조건부 갱신), 워크플로 엔진 |
| 한 키에 초당 수천 번 경합 | 핫 키 → Redis 한 샤드 과부하, 대부분 대기 | 파티셔닝, 큐로 직렬화, 원자 명령(`INCRBY`, Lua)으로 락 없이 |
| 단일 프로세스 | 네트워크 왕복이 낭비 | JVM 락 → [Java 락](../../java/0002-java-lock/03-tradeoffs.md) |

### 6. 선택 체크리스트

1. **락이 뚫리면 무슨 일이 생기나?** 비용 증가 → Redis 단일. 데이터 손상 → fencing·DB 제약을 반드시 함께, 또는 etcd.
2. **락 없이 되나?** 원자 명령(`INCRBY`, `SET NX` 하나로 끝), 유니크 제약, 키 파티셔닝을 먼저 본다.
3. **보호 대상이 DB 하나인가?** 그렇다면 DB 안에서.
4. **작업 시간 p99는?** TTL은 그보다 길게, 작업 타임아웃은 TTL보다 짧게. 길면 자동 연장.
5. **기다려야 하나, 포기해도 되나?** 포기 가능하면 `tryLock(0)`.
6. **장애 조치 때 락을 잃어도 되나?** 안 되면 Redis만으로는 부족하다.
7. **락용 Redis의 축출 정책은 `noeviction`인가?**

## 관련 문서

- [Redis 락의 역사](./01-history.md)
- [Redis 락 개요와 동작 방식](./02-overview.md)
- [Redis 락 사용 시 흔한 함정과 해결 방법](./04-pitfalls.md)
- [Redis 락 장애 유형과 대응](./05-failure-modes.md)
- [Redis 트레이드오프와 선택 기준](../0002-redis/03-tradeoffs.md)
- [MySQL 락 트레이드오프와 선택 기준](../0004-mysql-lock/03-tradeoffs.md)
- [Java 락 트레이드오프](../../java/0002-java-lock/03-tradeoffs.md)
- [고가용성: 복제 vs 클러스터와 패턴](../../../inquiry/distributed-systems/0009-high-availability-replication-vs-cluster-and-patterns.md)

## 참고 자료

- [Martin Kleppmann — How to do distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
- [antirez — Is Redlock safe?](https://www.antirez.com/news/101)
- [Distributed Locks with Redis — Redis Docs](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)
- [Redisson — Locks and synchronizers](https://redisson.pro/docs/data-and-services/locks-and-synchronizers/)
- [What Is the Redlock Algorithm? — Redisson](https://redisson.pro/glossary/redlock-algorithm.html)
- [RedisLockRegistry — Spring Integration API](https://docs.spring.io/spring-integration/api/org/springframework/integration/redis/util/RedisLockRegistry.html)
- [ShedLock README](https://github.com/lukas-krecan/ShedLock/blob/master/README.md)
- [Distributed lock: Redis, Redlock, ZooKeeper, etcd comparison (2026)](https://www.youngju.dev/transcribe/architecture/2026-03-12-distributed-lock-redis-redlock-zookeeper-etcd-comparison.en)
- [Locks, leases, fencing tokens — Surfing Complexity](https://surfingcomplexity.blog/2025/03/03/locks-leases-fencing-tokens-fizzbee/)
