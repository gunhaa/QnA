---
type: knowledge
created: 2026-11-20
author: agent
model: claude-opus-5-5
---

# Redis 락 사용 시 흔한 함정과 해결 방법

## 쉬운 설명

Redis 락 사고의 대부분은 Redis가 고장 나서가 아니라 **쪽지를 붙이고 떼는 순서를 잘못 짜서** 생긴다. 유효 기간 없이 붙이거나, 이름표를 안 보고 남의 쪽지를 떼거나, 일이 끝나기 전에 쪽지를 떼고 나서 결과를 저장하는 식이다. 그리고 "자물쇠를 걸었으니 절대 동시에 안 들어온다"고 믿는 것이 가장 큰 착각이다.

## 일반 설명

> 용어: **실수**는 잘못 쓰거나 설정한 것, **오해**는 동작을 잘못 알고 있는 것, **안티패턴**은 그럴듯하지만 해가 더 큰 관행이다. 고치는 쪽이 사용자(코드·설정)인 것만 다룬다. Redis·네트워크 장애로 락이 제 기능을 못 하는 경우는 [장애 유형](./05-failure-modes.md)에 있다.

### 1. 획득과 만료를 두 명령으로 (실수)

```
SETNX lock:job 1      ← 여기서 프로세스가 죽으면
EXPIRE lock:job 30    ← 실행되지 않음 → 락이 영원히 남음
```

- **진단**: `TTL lock:job`이 `-1`(만료 없음)인 락 키가 있다.
- **해결**: `SET lock:job <token> NX PX 30000` 한 명령으로. 남은 키는 보유자가 없는지 확인한 뒤 수동 삭제.

### 2. 토큰 없이 해제 — 남의 락을 지움 (실수)

```
A: SET NX PX 30s ── 작업 40초 (도중 만료) ────────── DEL lock  ← B의 락을 지움
B:                          SET NX → OK ── 작업 ──────────────────
C:                                                    SET NX → OK  ← B와 동시 실행
```

- **해결**: 값에 보유자별 무작위 토큰(UUID)을 넣고, 해제는 **비교 후 삭제**로 → [개요 §2](./02-overview.md#2-기본-락-획득--해제--연장).

### 3. `GET` 후 `DEL` — 비교와 삭제 사이의 틈 (실수)

토큰을 비교해도 `GET`과 `DEL`을 따로 보내면 그 사이에 만료·재획득이 끼어든다. **원자적**으로 해야 한다.

| 환경 | 방법 |
|---|---|
| 모든 버전 | Lua 스크립트(`EVALSHA`) |
| Redis 8.4+ | `DELEX key IFEQ token` |
| Valkey 9.0+ | `DELIFEQ key token` |

`MULTI`/`EXEC`는 해결책이 아니다. 트랜잭션 안에서는 `GET` 결과를 보고 분기할 수 없다(`WATCH`로 낙관적으로 하면 되지만 Lua보다 복잡하다).

### 4. 작업이 TTL보다 오래 걸림 (실수)

- **증상**: 가끔 같은 작업이 두 번 실행된 로그. 해제 시 "이미 내 락이 아님"(Lua가 0 반환, Redisson `IllegalMonitorStateException`).
- **원인**: TTL을 평균 작업 시간 기준으로 잡음. 느린 쿼리·외부 API 지연·GC로 꼬리 지연이 TTL을 넘는다.
- **해결**:
  - TTL은 작업 **p99의 2~3배**, 또는 자동 연장(watchdog, `extend()`).
  - 작업에 **TTL보다 짧은 자체 타임아웃**을 둔다(HTTP·DB 타임아웃 포함).
  - 해제 결과가 "내 락이 아님"이면 경고 로그·메트릭을 남긴다. 이것이 동시 실행의 유일한 흔적이다.

### 5. Redisson: `leaseTime`을 주면 watchdog이 꺼진다 (오해)

```java
lock.lock();                       // watchdog 동작: 10초마다 30초로 연장
lock.lock(10, TimeUnit.SECONDS);   // watchdog 없음: 10초 뒤 무조건 해제
lock.tryLock(3, 10, TimeUnit.SECONDS); // 마찬가지로 10초 뒤 해제
```

"안전하게 lease를 명시했다"가 오히려 작업 도중 만료를 만든다. 작업 시간을 예측할 수 없으면 `leaseTime`을 생략하거나 `-1`을 준다. 반대로 watchdog을 쓰면 **프로세스가 살아서 멈춰 있는(hang) 동안 락이 영원히 연장**되므로 작업 타임아웃이 필수다.

### 6. 해제를 `finally`에서 무조건 호출 (실수)

```java
try { lock.tryLock(3, TimeUnit.SECONDS); work(); }   // tryLock 실패 결과를 무시
finally { lock.unlock(); }                           // 안 잡은 락을 해제 → 예외
```

- `tryLock`의 반환값을 확인하지 않으면 **락 없이 작업**하고, `finally`에서 `IllegalMonitorStateException`이 원래 예외를 가린다.
- **해결**: 획득 실패면 작업하지 않고 반환. `finally`에서는 `if (lock.isHeldByCurrentThread()) lock.unlock()`.

### 7. 다른 스레드에서 해제 — 비동기·코루틴 (실수)

Redisson `RLock`은 **스레드 ID**로 보유자를 구분한다.

| 상황 | 문제 |
|---|---|
| `CompletableFuture`·리액티브 체인에서 잡고 다른 스레드에서 해제 | `IllegalMonitorStateException`, 락이 TTL까지 남음 |
| Kotlin 코루틴의 `suspend` 지점 전후로 스레드가 바뀜 | 같음 |
| 가상 스레드 | 스레드 단위라 동작은 하지만, 가상 스레드 ID가 매번 달라 재진입을 기대하면 안 됨 |

- **해결**: 비동기 API의 `lockAsync(threadId)`/`unlockAsync(threadId)`처럼 **보유자 ID를 명시**한다. 또는 토큰 기반 락(직접 구현, `redis-py` `Lock`)을 쓴다.

### 8. `@Transactional` 안에서 락 해제 — 커밋 전에 풀림 (실수)

```
요청 A: [트랜잭션 시작 → 락 획득 → 재고 읽기(10) → 9로 UPDATE → 락 해제] → 커밋
요청 B:                                                  락 획득 → 재고 읽기(10!) → ...
```

- 락은 풀렸지만 A의 트랜잭션이 **아직 커밋되지 않아** B는 옛 값을 읽는다. 락이 있는데도 갱신이 분실된다. Spring에서 매우 흔하다.
- **해결**: 락의 범위가 트랜잭션을 **감싸게** 한다. 락 획득 → 트랜잭션 시작 → 커밋 → 락 해제. AOP로 구현하면 락 aspect의 순서(`@Order`)를 트랜잭션 aspect보다 바깥에 둔다. 또는 `TransactionSynchronization.afterCompletion`에서 해제.

### 9. 축출 정책이 락 키를 지움 (실수)

- 락 키에는 TTL이 있다. `maxmemory-policy`가 `allkeys-*`는 물론 **`volatile-*`(TTL 있는 키만 축출)** 이어도 락 키가 축출 대상이 된다.
- 캐시와 같은 Redis를 쓰면 메모리가 찰 때 **락이 조용히 사라진다**.
- **진단**: `INFO stats`의 `evicted_keys` 증가 시점과 중복 실행 시점 대조.
- **해결**: 락용 Redis는 `noeviction`으로 분리. 분리할 수 없으면 메모리 여유를 유지하고 `evicted_keys`에 경보.

### 10. 재시도를 쉬지 않고 돌림 (안티패턴)

```python
while not r.set(key, token, nx=True, px=30000):
    pass   # 바쁜 대기: 클라이언트 수 × 초당 수만 요청
```

- 경합 시 Redis CPU와 네트워크를 대기자들이 다 쓴다. 락이 풀리는 순간 모두가 동시에 덤벼든다(thundering herd).
- **해결**: 지수 백오프 + 지터, 최대 대기 시간. 또는 Pub/Sub 알림 방식(Redisson). 오래 기다릴 일이면 락 대신 큐.

### 11. 락 키를 너무 굵게 또는 너무 가늘게 (실수)

| 실수 | 결과 | 해결 |
|---|---|---|
| `lock:orders` 하나로 모든 주문 보호 | 서로 무관한 주문이 직렬화 → 처리량 급감, 핫 키 | 보호 대상 단위로: `lock:order:{id}` |
| 두 자원을 각각 다른 순서로 잠금 | **분산 데드락**(TTL까지 둘 다 대기) | 항상 같은 순서(ID 오름차순), 또는 `MultiLock` |
| Cluster에서 여러 키를 한 Lua로 | `CROSSSLOT` 오류 | 해시 태그로 같은 슬롯: `lock:{order42}:pay`, `lock:{order42}:ship` |

### 12. "락이 있으니 동시 실행은 없다" (오해)

- TTL 만료, GC 정지, 장애 조치 중 복제 유실로 **두 보유자가 동시에 존재할 수 있다** → [장애 유형](./05-failure-modes.md).
- Redlock을 써도 마찬가지다. Redlock이 줄이는 것은 "Redis 노드 장애"이지 "클라이언트 멈춤"이 아니다.
- **해결**: 정확성이 걸린 쓰기는 **보호 대상에서** 한 번 더 막는다.
  - fencing token: `UPDATE ... WHERE id=? AND fence < ?`
  - 유니크 제약·멱등키: 결제 요청 ID에 유니크 인덱스
  - 조건부 갱신: `UPDATE stock SET qty = qty - 1 WHERE id = ? AND qty > 0`

### 13. 직접 구현한 락에 재진입을 기대 (오해)

`SET NX` 기반 단순 락은 **재진입이 안 된다**. 같은 스레드가 메서드 A(락) → 메서드 B(같은 락)를 호출하면 자기 자신을 TTL까지 기다린다. 재진입이 필요하면 Redisson처럼 보유자·횟수를 저장하는 구현을 쓰거나, 락은 바깥 메서드 한 곳에서만 잡는다.

### 14. 락을 쓰지 않아도 되는 곳에 락 (안티패턴)

| 하려는 것 | 락 대신 |
|---|---|
| 카운터 증가, 재고 차감 | `INCRBY`/`DECRBY`, 조건이 있으면 Lua 한 번 |
| "처음 한 번만" 실행 | `SET key 1 NX` 자체가 결과(락 해제 없음), DB 유니크 제약 |
| 호출 횟수 제한 | `INCR` + `EXPIRE`, Redis 8.8 `INCREX` |
| 같은 주문을 순서대로 처리 | 키 기준 큐 파티셔닝 |

락 → 읽기 → 계산 → 쓰기 → 해제의 왕복 4~5번이 원자 명령 1번으로 줄어든다.

### 15. 점검 체크리스트

| 항목 | 확인 방법 |
|---|---|
| 만료 없는 락 키 | `SCAN 0 MATCH lock:* COUNT 1000` 후 `TTL` = -1 |
| 해제 실패("내 락 아님") 횟수 | 애플리케이션 메트릭 |
| 락 대기 시간·획득 실패율 | 애플리케이션 메트릭 (p99) |
| 락 보유 시간 vs TTL | 보유 시간 p99가 TTL의 절반을 넘으면 경고 |
| 축출 | `INFO stats` → `evicted_keys` |
| 락 Redis의 축출 정책 | `CONFIG GET maxmemory-policy` = `noeviction` |

## 관련 문서

- [Redis 락의 역사](./01-history.md)
- [Redis 락 개요와 동작 방식](./02-overview.md)
- [Redis 락 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [Redis 락 장애 유형과 대응](./05-failure-modes.md)
- [Redis 운영 시 흔한 함정 — 분산 락의 함정](../0002-redis/04-pitfalls.md#7-분산-락의-함정)
- [MySQL 락: 흔한 함정과 해결 방법](../0004-mysql-lock/04-pitfalls.md)
- [Java 락 흔한 함정](../../java/0002-java-lock/04-pitfalls.md)

## 참고 자료

- [SET — Redis Docs](https://redis.io/docs/latest/commands/set/)
- [Distributed Locks with Redis — Redis Docs](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)
- [Key eviction — Redis Docs](https://redis.io/docs/latest/develop/reference/eviction/)
- [Redisson — Locks and synchronizers](https://redisson.pro/docs/data-and-services/locks-and-synchronizers/)
- [What Is Redis SETNX? — Redisson](https://redisson.pro/glossary/redis-setnx.html)
- [How to Use Redisson Distributed Locks in Java (2026) — OneUptime](https://oneuptime.com/blog/post/2026-03-31-redis-redisson-distributed-locks-java/markdown)
- [DELIFEQ — Valkey](https://valkey.io/commands/delifeq/)
- [Simplifying streams and strings (DELEX) — Redis Blog](https://redis.io/blog/simplifying-streams-and-strings/)
- [What's new in Redis 8.8 (INCREX) — Redis Docs](https://redis.io/docs/latest/develop/whats-new/8-8/)
- [Martin Kleppmann — How to do distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
