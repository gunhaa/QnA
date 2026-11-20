---
type: knowledge
created: 2026-11-20
author: agent
model: claude-opus-5-5
---

# Redis 락 개요와 동작 방식

## 쉬운 설명

Redis 락은 **"이 자리는 내가 30초 동안 쓴다"는 이름표가 붙은 쪽지**다. 쪽지가 이미 붙어 있으면 다른 사람은 기다리거나 돌아간다. 30초가 지나면 쪽지는 저절로 사라져서, 주인이 쓰러져도 자리가 영원히 묶이지 않는다. 다 쓰고 떼어 낼 때는 **쪽지의 이름표가 내 것인지 확인한 뒤에만** 뗀다.

## 일반 설명

> 이 문서는 **어떻게 동작하나**만 다룬다. 왜 이렇게 설계했고 언제 무엇을 고르는지는 [트레이드오프](./03-tradeoffs.md), 잘못 쓰는 패턴은 [흔한 함정](./04-pitfalls.md), 장애는 [장애 유형](./05-failure-modes.md)에 있다.

### 1. 무엇을 해결하나

여러 프로세스·서버가 **같은 자원을 동시에 건드리지 않게** 한다.

| 쓰임 | 예 | 락이 없으면 |
|---|---|---|
| 중복 작업 방지 | 스케줄러 배치를 서버 1대만 실행, 같은 캐시를 한 번만 재계산 | 같은 일을 N번 함 (비용·외부 API 호출 증가) |
| 공유 자원 갱신 | 쿠폰 선착순, 재고 차감, 같은 사용자의 동시 요청 직렬화 | 갱신 분실, 초과 발급 |
| 리더 선출 흉내 | 여러 워커 중 하나만 특정 큐 처리 | 중복 처리 |

### 2. 기본 락: 획득 · 해제 · 연장

락의 본체는 **키 하나**다. 값에는 보유자만 아는 **무작위 토큰**을, 만료에는 **TTL(lease)** 을 둔다.

```
# 획득: 키가 없을 때만(NX) 만들고 30초 뒤 만료(PX)
SET lock:order:42 7f3a9c1e NX PX 30000
→ OK   (획득)   /   (nil)  (다른 보유자 있음)
```

**해제**는 "값이 내 토큰과 같을 때만 삭제"를 **원자적으로** 해야 한다. `GET` 후 `DEL` 두 명령으로 하면 그 사이에 락이 만료되고 남이 잡은 락을 지울 수 있다.

| 엔진·버전 | 해제 | 연장 (TTL 다시 설정) |
|---|---|---|
| 모든 버전 | Lua: `if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end` | Lua: 같은 비교 후 `pexpire` |
| **Redis 8.4+** | `DELEX lock:order:42 IFEQ 7f3a9c1e` | `SET lock:order:42 7f3a9c1e IFEQ 7f3a9c1e PX 30000` |
| **Valkey 9.0+** | `DELIFEQ lock:order:42 7f3a9c1e` | `SET ... IFEQ ...` (8.1+) |

```
시간 →
클라이언트 A  SET NX PX 30s ─── 작업 ─────────────── DELEX IFEQ tokenA  (내 락만 삭제)
클라이언트 B        SET NX → nil (대기) ··· 재시도 ············ SET NX → OK
```

- **토큰이 없으면**: A의 작업이 30초를 넘겨 락이 만료되고 B가 획득한 뒤, A가 `DEL`하면 **B의 락을 지운다**. 이어서 C도 들어온다.
- **TTL이 없으면**: A가 죽으면 아무도 락을 못 잡는다.
- Redis는 명령을 하나씩 실행하므로 `SET NX`와 Lua 스크립트는 다른 명령과 섞이지 않는다. 이것이 Redis 락의 원자성의 근거다.

### 3. 기다리는 방식

| 방식 | 동작 | 쓰는 곳 |
|---|---|---|
| **즉시 포기** | `SET NX` 실패 → 바로 반환 | 스케줄러 중복 방지("누가 하고 있으면 나는 안 함") |
| **스핀(재시도)** | 실패 → 짧게 쉬고 재시도, 지수 백오프 + 지터 | 직접 구현, `redis-py` `Lock`, `RedisLockRegistry`(SPIN) |
| **Pub/Sub 알림** | 실패 → 채널 구독 → 해제 메시지를 받으면 재시도 (TTL만큼만 기다림) | Redisson `RLock`, `RedisLockRegistry`(PUB_SUB) |
| **공정 대기열** | 대기자를 List/ZSet 대기열에 넣고 순서대로 | Redisson `RFairLock` |

### 4. Redisson `RLock`의 내부

Java에서 가장 많이 쓰는 구현이다. 단순 문자열 키 대신 **Hash**를 쓴다.

```
lock:order:42  (Hash, TTL 30s)
  └─ "c0ffee-uuid:57" → 2      ← 클라이언트 UUID : 스레드 ID → 재진입 횟수
```

| 기능 | 동작 |
|---|---|
| **재진입** | 같은 스레드가 다시 `lock()`하면 Hash 값(횟수)만 올린다. `unlock()`마다 1씩 내리고 0이 되면 키 삭제 |
| **watchdog(자동 연장)** | `leaseTime`을 **지정하지 않으면** 기본 30초(`lockWatchdogTimeout`)로 잡고, 보유 중에는 그 1/3(10초)마다 TTL을 30초로 되돌린다. 프로세스가 죽으면 연장이 멈춰 30초 뒤 풀린다 |
| **명시적 lease** | `lock(10, SECONDS)`처럼 `leaseTime`을 주면 **watchdog이 동작하지 않고** 10초 뒤 무조건 풀린다 |
| **해제 알림** | 해제 시 `PUBLISH`로 대기자를 깨운다 |
| **스레드 귀속** | 락을 건 **스레드**만 풀 수 있다. 다른 스레드가 `unlock()`하면 `IllegalMonitorStateException` |

다른 종류: `RReadWriteLock`(읽기 공유·쓰기 배타), `RFairLock`(요청 순서대로), `RSpinLock`(Pub/Sub 대신 백오프 스핀, 대량 락에 유리), `RFencedLock`(획득마다 증가하는 토큰 반환), `RedissonMultiLock`(여러 락을 한 번에).

### 5. Fencing token

락만으로는 "**지금도 내가 보유자인가**"를 보장하지 못한다(GC 정지 중 만료 등 → [장애 유형](./05-failure-modes.md)). 그래서 **보호 대상 쪽**에서 오래된 보유자를 거부하게 한다.

```
A: lock → token 33 ─── (GC 정지 … 락 만료) ─────────── write(token 33) → 거부 (이미 34를 봄)
B:                       lock → token 34 ─ write(token 34) → 성공
```

- 토큰은 획득할 때마다 **단조 증가**해야 한다. Redis에서는 `INCR lock:order:42:fence`를 획득과 같은 Lua 스크립트에서 실행하거나, Redisson `RFencedLock`을 쓴다.
- 저장소는 "본 적 있는 가장 큰 토큰보다 작으면 거부"를 해야 한다. 예: `UPDATE orders SET ..., fence = :t WHERE id = 42 AND fence < :t`.
- **보호 대상이 토큰을 검사하지 못하면**(외부 API 호출 등) fencing은 효과가 없다. 그때는 멱등키로 대신한다.

### 6. Redlock

단일 Redis(또는 비동기 복제 구성)의 장애 조치 시 락 유실을 줄이려는 알고리즘이다. **서로 복제하지 않는 독립 마스터 N개**(보통 5)를 쓴다.

1. 현재 시각을 잰다.
2. N개 모두에 같은 키·토큰으로 `SET NX PX ttl`을 보낸다. 각 요청은 TTL보다 훨씬 짧은 타임아웃으로.
3. **과반(N/2+1)** 에서 성공했고, 걸린 시간이 TTL보다 짧으면 획득. 남은 유효 시간 = TTL − 걸린 시간 − 시계 오차 보정.
4. 실패하면 **모든 노드**에서 해제한다(성공 응답을 못 받은 노드에도).

복제가 없으므로 마스터 1~2대가 죽어도 과반이 남는다. 대신 노드 재시작 시 **TTL 이상 늦게 재가입**하거나 매 쓰기 fsync를 해야 안전하다는 전제가 붙는다. 이 전제와 시간 가정이 [Redlock 논쟁](./01-history.md#3-redlock-논쟁의-요지)의 대상이다.

### 7. 배포 형태별 락의 위치

| 배포 | 락 키의 위치 | 락에 미치는 영향 |
|---|---|---|
| 단일 인스턴스 | 그 인스턴스 | 죽으면 락 서비스 전체 중단(락 정보도 소실) |
| Replica + Sentinel | 마스터에 쓰고 **비동기 복제** | 복제 전에 장애 조치되면 새 마스터에 락이 없음 |
| Cluster | 키의 해시 슬롯을 가진 샤드 | 락 하나는 샤드 하나에만 존재. 여러 락을 한 스크립트로 다루려면 해시 태그(`lock:{order42}:a`)로 같은 슬롯에 |
| Redlock | 독립 마스터 N개 모두 | 과반 생존 시 유지. 운영 대상이 N배 |

### 8. 바로 써 보기

**Java (Redisson)**

```java
RLock lock = redisson.getLock("lock:order:" + orderId);
// 최대 3초 기다리고, leaseTime 생략 → watchdog 자동 연장
if (!lock.tryLock(3, TimeUnit.SECONDS)) {
    throw new BusyException("처리 중인 주문");
}
try {
    process(orderId);
} finally {
    if (lock.isHeldByCurrentThread()) lock.unlock();
}
```

**Python (redis-py)**

```python
# 토큰 생성·Lua 해제·연장(extend)을 Lock 클래스가 처리한다
with r.lock(f"lock:order:{order_id}", timeout=30, blocking_timeout=3):
    process(order_id)
```

**스케줄러 중복 방지 (ShedLock, Spring)**

```java
@Scheduled(cron = "0 */5 * * * *")
@SchedulerLock(name = "settle", lockAtMostFor = "4m", lockAtLeastFor = "30s")
public void settle() { ... }
```

## 관련 문서

- [Redis 락의 역사](./01-history.md)
- [Redis 락 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [Redis 락 사용 시 흔한 함정과 해결 방법](./04-pitfalls.md)
- [Redis 락 장애 유형과 대응](./05-failure-modes.md)
- [Redis 개요와 기본 사용법](../0002-redis/02-overview.md)
- [MySQL 락 개요와 동작 방식](../0004-mysql-lock/02-overview.md)
- [Java 락 개요](../../languages/0002-java-lock/02-overview.md)

## 참고 자료

- [SET — Redis Docs](https://redis.io/docs/latest/commands/set/)
- [Distributed Locks with Redis — Redis Docs](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)
- [The Redlock Algorithm — redis.antirez.com](https://redis.antirez.com/fundamental/redlock.html)
- [Simplifying streams and strings (DELEX, SET IFEQ) — Redis Blog](https://redis.io/blog/simplifying-streams-and-strings/)
- [DELIFEQ — Valkey](https://valkey.io/commands/delifeq/)
- [Redisson — Locks and synchronizers](https://redisson.pro/docs/data-and-services/locks-and-synchronizers/)
- [Java FencedLock and Fencing Tokens — Redisson](https://redisson.pro/glossary/java-fencedlock.html)
- [RedisLockRegistry — Spring Integration API](https://docs.spring.io/spring-integration/api/org/springframework/integration/redis/util/RedisLockRegistry.html)
- [ShedLock README](https://github.com/lukas-krecan/ShedLock/blob/master/README.md)
- [Martin Kleppmann — How to do distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
