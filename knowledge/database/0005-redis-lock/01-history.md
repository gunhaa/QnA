---
type: knowledge
created: 2026-11-20
author: agent
model: claude-opus-5-5
---

# Redis 락의 역사

## 쉬운 설명

서버가 한 대일 때는 프로그램 안의 자물쇠(JVM 락)로 충분했다. 서버가 여러 대가 되자 **모두가 같이 보는 게시판**이 필요해졌고, 빠르고 한 번에 한 명령씩만 처리하는 Redis가 그 게시판이 됐다. 처음엔 "내가 쓴다"는 쪽지만 붙였다가, 주인이 쓰러지면 쪽지가 영원히 남는 문제 때문에 **유효 기간**을 붙였고, 남의 쪽지를 떼는 실수 때문에 **이름표**를 붙였다. 그 뒤로는 "이 게시판을 얼마나 믿어도 되나"를 두고 논쟁이 벌어졌고, 결론은 **중복 작업을 줄이는 데는 충분하지만 정확성은 따로 지켜야 한다**였다.

## 일반 설명

### 1. 등장 배경 (2009~2013): JVM 밖의 상호 배제

- 웹 서비스가 **여러 인스턴스**로 늘면서 `synchronized`·`ReentrantLock`은 프로세스 하나 안에서만 유효해졌다. 같은 주문을 두 서버가 동시에 처리하거나, 스케줄러 배치가 서버 수만큼 중복 실행되는 문제가 생겼다 → [Java 락의 역사 — JVM 밖으로](../../languages/0002-java-lock/01-history.md#3-jvm-밖으로-분산-락의-시대).
- DB 락(`SELECT ... FOR UPDATE`)은 정확하지만, 락 하나를 위해 트랜잭션과 커넥션을 붙잡아야 하고 DB 부하가 늘었다.
- Redis는 **단일 스레드로 명령을 하나씩 원자적으로 실행**하고 응답이 1ms 안쪽이라, "키가 없으면 만든다"(`SETNX`)는 명령 하나로 상호 배제를 흉내 낼 수 있었다. 공식 문서도 `SETNX`를 락 용도로 소개했다.
- 초기 패턴의 약점: `SETNX`는 만료 시간을 함께 줄 수 없어서 `SETNX` → `EXPIRE` 두 명령 사이에 클라이언트가 죽으면 **락이 영원히 남았다**. 이를 피하려고 값에 만료 시각을 넣고 `GETSET`으로 빼앗는 복잡한 패턴이 문서에 실렸다.

### 2. 주요 변천

| 시기 | 변화 | 해결하려던 문제 |
|---|---|---|
| 2010 전후 | `SETNX` + 값에 만료 시각 + `GETSET` 패턴 | 죽은 보유자의 락 회수 |
| 2012 | Redis 2.6: **Lua 스크립팅**, 밀리초 TTL | "내 락일 때만 삭제" 같은 비교 후 삭제를 원자적으로 |
| 2013 | Redis **2.6.12: `SET ... NX PX`** 옵션, `SETNX`는 deprecated | 획득과 만료 설정을 **한 명령으로** |
| 2014.01 | **Redisson** 1.0 (Java) — `RLock`이 `java.util.concurrent.locks.Lock` 구현 | 재진입, 자동 연장(watchdog), 대기 알림을 라이브러리로 |
| 2014 무렵 | antirez가 **Redlock** 알고리즘 제안 (독립 마스터 N개 중 과반 획득) | 단일 Redis·복제 구성에서 장애 조치 시 락 유실 |
| **2016.02** | Martin Kleppmann "How to do distributed locking" 비판 → antirez "Is Redlock safe?" 반론 | Redlock이 **시간 가정**에 의존하고 **fencing token**이 없다는 지적 |
| 2016~ | Spring Integration `RedisLockRegistry`, ShedLock Redis provider 등 프레임워크 통합 | 스케줄러 중복 실행 방지, 선언적 락 |
| 2023 무렵 | Redisson **`RFencedLock`** (획득마다 증가하는 토큰 반환) | Kleppmann이 지적한 fencing 부재 |
| 이후 | Redisson `RedissonRedLock` **deprecated** → `RLock`/`RFencedLock` 권장 | Redlock 운영 비용 대비 이득이 작음 |
| 2025 | **Valkey 8.1: `SET ... IFEQ`** (값이 같을 때만 덮어쓰기) | Lua 없이 락 연장 |
| 2025.10 | **Valkey 9.0: `DELIFEQ`** (값이 같을 때만 삭제) | Lua 없이 안전한 해제 |
| 2025.11 | **Redis 8.4: `SET ... IFEQ/IFNE/IFDEQ/IFDNE`, `DELEX`, `DIGEST`** | 같은 문제를 Redis 쪽에서도 내장 명령으로 |

### 3. Redlock 논쟁의 요지

| | Kleppmann (2016.02) | antirez (반론) |
|---|---|---|
| 핵심 주장 | 락 보유자가 GC·네트워크로 멈춘 사이 TTL이 끝나면 두 클라이언트가 동시에 "보유"한다. 이를 막으려면 저장소가 **fencing token**으로 오래된 쓰기를 거부해야 하는데 Redlock은 토큰을 주지 않는다. 또 시계·지연에 대한 가정에 기대므로 합의 알고리즘이 아니다 | 멈춤 문제는 **모든 락 서비스 공통**이다. 토큰이 필요하면 무작위 값을 이용한 check-and-set으로 대신할 수 있다. Redlock은 시계의 **정확한 시각**이 아니라 **흐르는 속도**만 가정한다 |
| 권고 | 효율용이면 단일 Redis로 충분하고, 정확성용이면 ZooKeeper·etcd 같은 합의 시스템 + fencing | Redlock은 실용적으로 충분히 안전하다 |

누가 이겼는지는 지금도 의견이 갈린다. 다만 실무 합의는 하나로 모였다: **Redis 락은 "같은 일을 두 번 하지 않게 하는 효율 장치"로 쓰고, 정확성은 fencing token·DB 제약·멱등성으로 지킨다.** 이 구분은 [트레이드오프](./03-tradeoffs.md#2-효율용인가-정확성용인가)에서 다룬다.

### 4. 현재 상태 (2026년 11월)

- **엔진**: Redis 8.8(2026.05 GA, RSALv2/SSPLv1/AGPLv3), Valkey 9.x(BSD-3). 락에 쓰는 핵심 명령(`SET NX PX`, Lua)은 둘 다 같다. **비교 후 삭제 내장 명령은 갈라졌다** — Redis는 `DELEX key IFEQ v`, Valkey는 `DELIFEQ key v`. 혼합 환경의 클라이언트는 둘을 시도하고 Lua로 폴백한다.
- **라이브러리**: Java는 Redisson(`RLock`, `RFencedLock`, `RReadWriteLock`, `RFairLock`)이 사실상 표준이고, 스프링 진영은 `RedisLockRegistry`, 스케줄러는 ShedLock. Python `redis-py`의 `Lock`, Node `redlock` 등 언어별 구현이 있다.
- **Redlock**: 알고리즘 문서는 남아 있지만, 독립 마스터 5대를 따로 운영하는 비용 때문에 실무에서는 드물다. Redisson도 deprecated 처리했다.
- **경쟁 수단**: 정확성이 필요한 락은 etcd(lease + revision), ZooKeeper(ephemeral sequential znode + zxid), DB 락·advisory lock으로 간다 → [트레이드오프 — 대안 비교](./03-tradeoffs.md#3-대안-비교).

## 관련 문서

- [Redis 락 개요와 동작 방식](./02-overview.md)
- [Redis 락 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [Redis 락 사용 시 흔한 함정과 해결 방법](./04-pitfalls.md)
- [Redis 락 장애 유형과 대응](./05-failure-modes.md)
- [Redis의 역사](../0002-redis/01-history.md)
- [MySQL 락의 역사](../0004-mysql-lock/01-history.md)
- [Java 락의 역사](../../languages/0002-java-lock/01-history.md)

## 참고 자료

- [SETNX (deprecated) — Redis Docs](https://redis.io/docs/latest/commands/setnx/)
- [SET — Redis Docs](https://redis.io/docs/latest/commands/set/)
- [The Redlock Algorithm — redis.antirez.com](https://redis.antirez.com/fundamental/redlock.html)
- [Martin Kleppmann — How to do distributed locking (2016)](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
- [antirez — Is Redlock safe? (2016)](https://www.antirez.com/news/101)
- [Interview with the creator of Redisson — Alibaba Cloud](https://www.alibabacloud.com/blog/interview-with-the-creator-of-redisson-building-an-open-source-enterprise-redis-client_593854)
- [What Is the Redlock Algorithm? — Redisson](https://redisson.pro/glossary/redlock-algorithm.html)
- [Redisson — Locks and synchronizers](https://redisson.pro/docs/data-and-services/locks-and-synchronizers/)
- [Simplifying streams and strings (Redis 8.4) — Redis Blog](https://redis.io/blog/simplifying-streams-and-strings/)
- [DELIFEQ — Valkey](https://valkey.io/commands/delifeq/)
- [SET — Valkey](https://valkey.io/commands/set)
- [Introducing Valkey 9 — Valkey Blog](https://valkey.io/blog/introducing-valkey-9/)
- [What's new in Redis 8.8 — Redis Docs](https://redis.io/docs/latest/develop/whats-new/8-8/)
