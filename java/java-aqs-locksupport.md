# Java AQS와 LockSupport 정리

## 쉬운 설명

- **AQS**는 열쇠 관리인이다. 열쇠가 몇 개 남았는지 숫자 하나로 기억하고, 못 빌린 사람은 줄을 세운다.
- **LockSupport**는 줄 선 사람을 재우고(`park`) 깨우는(`unpark`) 알람이다.

## 일반 설명

### 1. 계층 구조

```
Semaphore, CountDownLatch, ReentrantReadWriteLock ...  (내부 Sync 클래스가 AQS 상속)
        │
AbstractQueuedSynchronizer (AQS)      ← state + 대기 큐를 다루는 프레임워크
        │
LockSupport.park / unpark             ← 스레드 단위 블로킹 원시 연산
        │
JVM (Unsafe.park, 가상 스레드라면 continuation yield) / OS (futex 등)
```

### 2. AQS (`AbstractQueuedSynchronizer`)

Doug Lea가 만든 동기화 장치 골격이다. **`volatile int state` 하나 + FIFO 대기 큐**로 동기화 장치 대부분을 표현한다. 템플릿 메서드 패턴을 쓰며, 하위 클래스는 "state를 어떻게 해석하는지"만 구현한다.

**state의 의미는 구현체마다 다르다**

| 구현 | state의 의미 |
|---|---|
| `Semaphore` | 남은 permit 수 |
| `CountDownLatch` | 남은 카운트 (0이 되면 공유 모드 대기자 전원 통과) |
| `ReentrantReadWriteLock` | 상위 16비트는 읽기 보유 수, 하위 16비트는 쓰기 재진입 수 |
| `ThreadPoolExecutor.Worker` | 작업자가 실행 중인지를 나타내는 배타 플래그 (일부러 재진입 불가) |

**하위 클래스가 구현하는 메서드 (protected)**

| 모드 | 메서드 |
|---|---|
| 배타(exclusive) | `tryAcquire(int)`, `tryRelease(int)`, `isHeldExclusively()` |
| 공유(shared) | `tryAcquireShared(int)` (음수면 실패, 0이면 성공했지만 다음 대기자는 못 감, 양수면 다음 대기자도 시도 가능), `tryReleaseShared(int)` |

state를 다룰 때는 `getState()`, `setState()`, `compareAndSetState()`를 쓴다. 배타 모드의 소유 스레드는 상위 클래스 `AbstractOwnableSynchronizer`의 `setExclusiveOwnerThread()`로 기록한다. 공정 모드에서는 `tryAcquire` 안에서 `hasQueuedPredecessors()`로 앞에 기다리는 스레드가 있는지 확인한다.

**AQS가 제공하는 메서드 (public final)** — `acquire`, `acquireInterruptibly`, `tryAcquireNanos`, `release`, 그리고 각각의 `...Shared` 버전이 있다. 상위 동기화 장치는 이 메서드들을 호출만 한다. 예를 들어 `Semaphore.acquire()`는 `sync.acquireSharedInterruptibly(1)`을 부른다.

**획득 흐름 (단순화)**

```
acquire(arg):
  1. tryAcquire(arg) 성공 → 바로 반환 (fast path, CAS 한 번)
  2. 실패 → 노드를 만들어 큐 꼬리에 CAS로 붙임 (CLH 큐 변형)
  3. 루프:
       내가 head 바로 다음이면 tryAcquire 재시도 → 성공하면 내가 head가 됨
       아니면 노드 status를 WAITING으로 표시하고 잠깐 spin한 뒤
       LockSupport.park(this)
  4. 깨어나면 (unpark, 인터럽트, 타임아웃) 3으로 돌아감

release(arg):
  tryRelease(arg)가 true면 → head의 다음 노드를 LockSupport.unpark(그 노드의 스레드)
```

- **CLH 큐 변형**: 원래 CLH 락은 앞 노드를 spin하며 지켜보는 방식이다. AQS는 이를 바꿔 spin 대신 park를 쓰고, 노드에 명시적인 `next` 링크를 둬서 깨울 대상을 찾는다.
- **JDK 14 재작성**: `acquire` 로직이 하나의 메서드로 합쳐졌고, 노드 종류가 `ExclusiveNode`, `SharedNode`, `ConditionNode`로 나뉘었다. 그 전의 `SIGNAL`/`PROPAGATE` 같은 waitStatus 조합은 단순한 상태 비트로 바뀌었다.
- **barging(끼어들기)**: 비공정 모드에서는 새로 온 스레드가 큐를 무시하고 바로 `tryAcquire`에 성공할 수 있다. 깨어난 스레드를 기다리는 동안 생기는 컨텍스트 스위치 지연이 줄어 처리량이 높다. 공정 모드는 이 끼어들기를 막는 대신 느리다.
- **`ConditionObject`**: AQS의 내부 클래스로, 대기 큐와 별도인 **조건 큐**를 가진다. `await()`는 state를 통째로 저장한 뒤 `release`하고, 조건 큐에서 park한다. `signal()`이 오면 노드를 조건 큐에서 메인 대기 큐로 옮긴다. 깨어난 스레드는 저장해 둔 state로 `acquire`를 다시 한다.
- state를 `long`으로 쓰는 `AbstractQueuedLongSynchronizer`도 있다.

**직접 구현 예 — 재진입 없는 뮤텍스**

```java
class Mutex {
    private static final class Sync extends AbstractQueuedSynchronizer {
        @Override protected boolean tryAcquire(int ignore) {
            if (compareAndSetState(0, 1)) {
                setExclusiveOwnerThread(Thread.currentThread());
                return true;
            }
            return false;
        }
        @Override protected boolean tryRelease(int ignore) {
            if (getState() == 0) throw new IllegalMonitorStateException();
            setExclusiveOwnerThread(null);
            setState(0);    // volatile write → 이후 획득자에게 happens-before
            return true;
        }
        @Override protected boolean isHeldExclusively() {
            return getExclusiveOwnerThread() == Thread.currentThread();
        }
    }

    private final Sync sync = new Sync();
    public void lock()       { sync.acquire(1); }
    public boolean tryLock() { return sync.tryAcquire(1); }
    public void unlock()     { sync.release(1); }
}
```

**공유 모드 예 — 한 번 열리면 계속 열리는 게이트**

```java
class BooleanLatch {
    private static final class Sync extends AbstractQueuedSynchronizer {
        boolean isSignalled() { return getState() != 0; }
        @Override protected int tryAcquireShared(int ignore) {
            return isSignalled() ? 1 : -1;      // 열렸으면 통과, 아니면 대기
        }
        @Override protected boolean tryReleaseShared(int ignore) {
            setState(1);
            return true;                        // 대기자 전원 깨우기 전파
        }
    }

    private final Sync sync = new Sync();
    public void signal()                               { sync.releaseShared(1); }
    public void await() throws InterruptedException    { sync.acquireSharedInterruptibly(1); }
}
```

AQS 하위 클래스는 공개 API로 노출하지 않고, 위처럼 private 내부 `Sync` 클래스로 숨기는 것이 javadoc이 권장하는 방식이다.

### 3. `LockSupport`

모든 `j.u.c` 블로킹의 바닥에 있는 정적 유틸이다. 스레드마다 **permit 하나(0 또는 1, 쌓이지 않음)**가 있는 바이너리 세마포어로 생각하면 된다.

| 메서드 | 동작 |
|---|---|
| `park()` / `park(Object blocker)` | permit이 있으면 그것을 쓰고 바로 반환한다. 없으면 블로킹한다. |
| `parkNanos(blocker, nanos)` | 상대 시간만큼 블로킹한다. |
| `parkUntil(blocker, deadline)` | 절대 시각(epoch ms)까지 블로킹한다. |
| `unpark(Thread)` | 대상 스레드의 permit을 1로 만든다. 대상이 park 중이면 깨운다. |
| `getBlocker(Thread)` | 대상 스레드가 무엇 때문에 park 중인지 반환한다. 스레드 덤프에 `parking to wait for <0x...> (a ...Semaphore$NonfairSync)`로 나오는 정보다. |

**`wait/notify`와 다른 점**

1. **모니터가 필요 없다** — `synchronized` 블록 밖에서 부를 수 있다.
2. **순서가 상관없다** — `unpark`를 `park`보다 먼저 불러도 permit이 남아 있으므로, 이후 `park`가 바로 반환된다. 그래서 notify보다 먼저 와서 신호를 놓치는(lost wakeup) 문제가 없다.
3. **대상을 정확히 지정한다** — 깨울 스레드를 콕 집어 깨운다. AQS는 이 덕분에 큐의 다음 노드만 깨울 수 있다.
4. **인터럽트에 예외를 던지지 않는다** — 인터럽트되면 그냥 반환한다. 인터럽트 여부는 호출자가 `Thread.interrupted()`로 직접 확인한다.
5. **이유 없이 반환할 수 있다** — 그래서 항상 루프 안에서 조건을 다시 확인해야 한다.

```java
// 단순화한 FIFO 뮤텍스 (LockSupport javadoc 예제 축약)
while (queue.peek() != current || !locked.compareAndSet(false, true)) {
    LockSupport.park(this);
    if (Thread.interrupted()) wasInterrupted = true;   // 인터럽트는 기록만
}
```

**JVM 내부 동작**
- 플랫폼 스레드: `Unsafe.park`가 호출되고, 스레드별 `Parker` 객체가 mutex와 condvar(Linux에서는 pthread → futex)로 OS 스레드를 재운다.
- 가상 스레드: `park`를 부르면 continuation이 yield되어 **캐리어 스레드를 반납**한다. `unpark`가 오면 스케줄러(ForkJoinPool)에 다시 제출된다. 그래서 AQS·LockSupport 위에 만든 동기화 장치(`Semaphore`, `BlockingQueue` 등)는 처음부터 가상 스레드와 잘 맞았다. 반면 `synchronized`는 JDK 24의 JEP 491 전까지 캐리어 스레드에 고정(pinning)됐다.

### 4. 정리

| 계층 | 책임 | 직접 쓸 일 |
|---|---|---|
| AQS | state 해석과 대기 큐 관리 | 커스텀 동기화 장치를 만들 때 |
| `LockSupport` | 스레드 하나를 재우고 깨우는 원시 연산 | 프레임워크·라이브러리 수준에서 드물게 |

## Sources

- [AbstractQueuedSynchronizer — OpenJDK 25 API (w3cub mirror)](https://docs.w3cub.com/openjdk~25/java.base/java/util/concurrent/locks/abstractqueuedsynchronizer)
- [java.util.concurrent.locks package summary — OpenJDK 25](https://docs.w3cub.com/openjdk~25/java.base/java/util/concurrent/locks/package-summary)
- [AbstractQueuedSynchronizer.ConditionObject — OpenJDK 25](https://docs.w3cub.com/openjdk~25/java.base/java/util/concurrent/locks/abstractqueuedsynchronizer.conditionobject)
- [AQS source — Doug Lea jsr166](https://gee.cs.oswego.edu/dl/jsr166/src/main/java/util/concurrent/locks/AbstractQueuedSynchronizer.java)
- [JEP 491: Synchronize Virtual Threads without Pinning](https://openjdk.org/jeps/491)
