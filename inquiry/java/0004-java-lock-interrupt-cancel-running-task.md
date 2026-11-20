---
type: inquiry
created: 2026-11-19
author: agent
model: claude-opus-5-5
---

# Java 락을 잡고 작업 중일 때 외부 인터럽트로 취소할 수 있나

## 쉬운 설명

화장실 열쇠를 들고 들어간 사람을 밖에서 강제로 끌어낼 수는 없다. 문을 두드려(`interrupt()`) "나와 주세요"라고 알릴 수 있을 뿐이고, 안에 있는 사람이 그 소리를 듣고 **스스로 정리하고 열쇠를 반납하고**(`finally { unlock() }`) 나와야 한다. 다만 **줄 서서 기다리는 사람**은 `lockInterruptibly()`로 기다렸다면 두드리는 소리에 바로 줄에서 빠질 수 있다.

## 일반 설명

### 1. 결론

- **강제 취소는 없다.** `Thread.stop()`은 JDK 20부터 무조건 `UnsupportedOperationException`을 던졌고, **JDK 26에서 삭제됐다.** 락을 쥔 채 스레드를 죽이면 공유 상태가 반쯤 바뀐 채로 남기 때문이다.
- 유일한 표준 방법은 **협조적 취소(cooperative cancellation)** 다. 밖에서 `Thread.interrupt()`(또는 `Future.cancel(true)`)로 인터럽트 플래그를 세우고, 작업 코드가 그 플래그를 확인하거나 인터럽트에 반응하는 메서드에서 `InterruptedException`을 받아 스스로 빠져나온다.
- 락은 `finally`에서 풀리므로, 작업이 예외로 빠져나와도 락은 반납된다.

### 2. 상황별로 인터럽트가 먹히는가

| 스레드 상태 | 인터럽트 효과 |
|---|---|
| `synchronized` 진입을 **기다리는 중** | ✗ 계속 기다린다(플래그만 선다) |
| `lock.lock()`으로 **기다리는 중** | ✗ 계속 기다린다. 락을 얻은 뒤 플래그가 남아 있다 |
| `lock.lockInterruptibly()`로 **기다리는 중** | ✓ 즉시 `InterruptedException` |
| `lock.tryLock(timeout, unit)`으로 **기다리는 중** | ✓ 즉시 `InterruptedException` (시간 초과로도 빠짐) |
| 락을 **쥐고** `Condition.await()`·`Object.wait()` 중 | ✓ 락을 **다시 얻은 뒤** `InterruptedException` |
| 락을 쥐고 `sleep`·`join`·`BlockingQueue.take/put` 중 | ✓ `InterruptedException` |
| 락을 쥐고 **CPU 연산 루프** 중 | △ 코드가 `Thread.currentThread().isInterrupted()`를 확인해야만 멈춘다 |
| 락을 쥐고 NIO `InterruptibleChannel` I/O 중 | ✓ 채널이 닫히고 `ClosedByInterruptException` |
| 락을 쥐고 고전 `java.io` 소켓 I/O 중 (플랫폼 스레드) | ✗ 반응 없음 — 다른 스레드가 소켓을 `close()`해야 풀린다 |
| 락을 쥐고 `java.net` 소켓 I/O 중 (가상 스레드) | ✓ 인터럽트하면 소켓이 닫히고 스레드가 깨어난다 (JEP 444) |

`synchronized`와 `ReentrantLock`의 차이는 [Java 락 — 02-overview](../../knowledge/java/0002-java-lock/02-overview.md)의 비교표에 있다. 취소가 필요한 경로라면 **기다리는 단계부터** `lockInterruptibly()`나 `tryLock(timeout)`을 써야 한다.

### 3. 기본 패턴

```java
void work() throws InterruptedException {
    lock.lockInterruptibly();          // ① 대기 중 취소 가능
    try {
        for (Item item : items) {
            if (Thread.currentThread().isInterrupted()) {   // ② 연산 중 취소 지점
                rollback();                                 // ③ 불변식 복구
                throw new InterruptedException();
            }
            process(item);
        }
    } finally {
        lock.unlock();                 // ④ 어떤 경로로 나가도 반납
    }
}
```

외부에서 취소하는 쪽:

```java
Future<?> f = executor.submit(this::work);
// ...
f.cancel(true);   // 실행 중인 스레드에 interrupt()
```

### 4. 지켜야 할 것

1. **락을 쥔 구간에 취소 지점을 둔다.** 반복문 한 바퀴마다, 또는 단계 사이마다 플래그를 확인한다. 확인하는 코드가 없으면 인터럽트는 무시된다.
2. **취소 전에 공유 상태를 일관되게 되돌린다.** 락이 지키던 불변식이 반쯤 깨진 채로 `unlock()`하면, 다음에 락을 잡는 스레드가 깨진 상태를 본다. 바꿀 내용을 지역 변수에 만들어 두고 마지막에 한 번에 반영하면 되돌릴 필요가 없어진다.
3. **`InterruptedException`을 삼키지 않는다.** 직접 처리하지 못하면 다시 던지거나 `Thread.currentThread().interrupt()`로 플래그를 복원한다. 예외가 던져질 때 플래그는 지워진다.
4. **`Thread.interrupted()`와 `isInterrupted()`를 구분한다.** 앞의 것은 플래그를 **지운다.**
5. **`CompletableFuture.cancel(true)`는 작업 스레드를 인터럽트하지 않는다.** future만 취소 상태로 바뀌고 작업은 계속 돈다. 실제로 멈춰야 하면 `ExecutorService.submit()`의 `Future`를 쓰거나 별도 취소 플래그를 둔다.
6. **인터럽트에 반응하지 않는 블로킹은 자원을 닫아서 푼다.** 고전 소켓, JDBC 호출 등은 `socket.close()`나 `Statement.cancel()`을 다른 스레드에서 호출한다.

### 5. 인터럽트 말고 다른 취소 신호

| 방법 | 언제 |
|---|---|
| `volatile boolean cancelled` 플래그 | 인터럽트를 다른 용도로 쓰는 라이브러리와 섞일 때. 블로킹 대기는 못 깨운다 |
| `tryLock(timeout)` / `await(timeout)` | 취소보다 **시간 제한**이 목적일 때 |
| `StructuredTaskScope` | 하위 작업 하나가 실패하면 나머지를 인터럽트로 정리한다. JDK 26에서도 아직 preview(6차, JEP 525)라 `--enable-preview`가 필요하다 |

## 관련 문서

- [Java 락 — 02-overview](../../knowledge/java/0002-java-lock/02-overview.md)
- [Java 락 — 04-pitfalls](../../knowledge/java/0002-java-lock/04-pitfalls.md)
- [Java 락 — 05-failure-modes](../../knowledge/java/0002-java-lock/05-failure-modes.md)
- [AQS와 LockSupport](./0001-java-aqs-locksupport.md)
- [ArrayBlockingQueue와 Condition 생산자/소비자](./0003-java-arrayblockingqueue-condition-producer-consumer.md)

## 출처

- [JDK-8368370 Release Note: Thread.stop is removed](https://bugs.openjdk.org/browse/JDK-8368370)
- [JDK-8293852 Release Note: Thread.stop Changed to Throw UnsupportedOperationException](https://bugs.openjdk.org/browse/JDK-8293852)
- [Lock (java.base API)](https://oop.polito.it/api/java.base/java/util/concurrent/locks/Lock.html)
- [CompletableFuture Can't Be Interrupted — DZone](https://dzone.com/articles/completablefuture-cant-be)
- [JEP 444: Virtual Threads](https://openjdk.org/jeps/444)
- [JEP 525: Structured Concurrency (Sixth Preview)](https://openjdk.org/jeps/525)
