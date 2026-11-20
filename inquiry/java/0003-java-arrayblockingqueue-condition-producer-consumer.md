---
type: inquiry
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# ArrayBlockingQueue가 Condition 생산자/소비자를 대신한다는 의미

## 쉬운 설명

칸이 정해진 빵 진열대를 떠올리면 된다. 진열대가 꽉 차면 제빵사는 기다리고, 비면 손님이 기다린다. `ReentrantLock`과 `Condition`으로 이 "기다렸다 깨우기"를 직접 짤 수도 있지만, `ArrayBlockingQueue`는 이걸 **이미 똑같이 짜 놓은 진열대**다. `put()`·`take()`만 부르면 된다.

## 일반 설명

### 1. 문장의 뜻

[Java 락 개요](../../knowledge/java/0002-java-lock/02-overview.md)의 `Condition` 예제는 **유한 버퍼(bounded buffer)**, 곧 생산자/소비자 큐를 손으로 만든 것이다.

- 락 1개 + `Condition` 2개(`notFull`, `notEmpty`)
- `put`: 가득 차면 `notFull.await()` → 넣고 `notEmpty.signal()`
- `take`: 비면 `notEmpty.await()` → 꺼내고 `notFull.signal()`

`ArrayBlockingQueue`는 **내부 구현이 정확히 이 구조**다. 그래서 "실무에서는 직접 만들지 말고 이걸 쓰라"는 뜻이다. 직접 짜면 `while` 대신 `if`를 쓰거나(가짜 깨어남), `signal`을 빠뜨리거나, `unlock`을 `finally`에 두지 않는 실수가 생기기 쉽다.

### 2. JDK 소스로 확인 (Temurin 21.0.12 `src.zip`)

```java
// 생성자
lock = new ReentrantLock(fair);
notEmpty = lock.newCondition();
notFull  = lock.newCondition();

// put(): lock.lockInterruptibly(); while (count == items.length) notFull.await(); enqueue → notEmpty.signal()
// take(): lock.lockInterruptibly(); while (count == 0) notEmpty.await();         dequeue → notFull.signal()
```

문서 예제와 다른 점은 두 가지뿐이다.

| | 문서 예제 | `ArrayBlockingQueue` |
|---|---|---|
| 저장소 | `ArrayDeque` | 고정 크기 배열(원형 버퍼) |
| 락 획득 | `lock()` | `lockInterruptibly()` — 대기 중 인터럽트로 빠져나올 수 있다 |
| 추가 기능 | 없음 | `offer/poll`(즉시 실패), `offer/poll(timeout)`(`awaitNanos`), 공정성 옵션 `new ArrayBlockingQueue<>(n, true)` |

`LinkedBlockingQueue`는 같은 아이디어지만 락을 **둘**(`putLock`, `takeLock`)로 나눠 생산과 소비가 동시에 진행된다. 처리량은 높지만 노드 할당이 생긴다.

### 3. 직접 실행

용량 2인 큐에 생산자는 쉬지 않고 5개를 넣고, 소비자는 300ms 늦게 시작해 200ms마다 꺼낸다. 직접 만든 큐와 `ArrayBlockingQueue`에 같은 시나리오를 돌렸다.

아래는 `ArrayBlockingQueue` 쪽 코드다. 파일 하나로 저장하고 `java AbqDemo.java`로 바로 실행할 수 있다 (JDK 11+).

```java
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

public class AbqDemo {
    static final long T0 = System.currentTimeMillis();
    static void log(String s) {
        System.out.printf("%5dms [%s] %s%n", System.currentTimeMillis() - T0, Thread.currentThread().getName(), s);
    }

    public static void main(String[] args) throws InterruptedException {
        BlockingQueue<Integer> q = new ArrayBlockingQueue<>(2);   // 최대 2개

        Thread producer = new Thread(() -> {
            try {
                for (int i = 1; i <= 5; i++) {
                    log("put(" + i + ") 시도");
                    q.put(i);                    // 가득 차 있으면 여기서 멈춘다 (내부 notFull.await)
                    log("put(" + i + ") 완료");
                }
            } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }, "producer");

        Thread consumer = new Thread(() -> {
            try {
                Thread.sleep(300);               // 늦게 시작 → 그동안 생산자가 3번째 put에서 멈춘다
                for (int i = 1; i <= 5; i++) {
                    int v = q.take();            // 비어 있으면 여기서 멈춘다 (내부 notEmpty.await)
                    log("take → " + v);
                    Thread.sleep(200);           // 천천히 소비
                }
            } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }, "consumer");

        producer.start();
        consumer.start();
        producer.join();
        consumer.join();
    }
}
```

`put`/`take`는 기다리는 도중 인터럽트되면 `InterruptedException`을 던진다. 그래서 람다 안에서 잡아 인터럽트 상태를 복원한다.

실행 결과 (Temurin 21.0.12, 요약):

```
=== 직접 만든 Condition 큐 ===
   22ms [producer] put(2) 완료
   23ms [producer] 가득 참 → notFull.await()      ← 3번째에서 막힘
  323ms [consumer] take → 1                        ← 소비자가 꺼내며 notFull.signal()
  323ms [producer] put(3) 완료                     ← 깨어나 진행

=== ArrayBlockingQueue ===
 1351ms [producer] put(2) 완료
 1352ms [producer] put(3) 시도                     ← 내부 notFull.await()에서 대기
 1661ms [consumer] take → 1
 1661ms [producer] put(3) 완료                     ← 같은 타이밍으로 풀림

=== 빈 큐에서 take() ===
 2672ms [consumer] take() 호출 → 블록
 3182ms [main    ] put("hello")
 3183ms [consumer] take → hello                    ← notEmpty.signal()로 깨어남
```

두 큐의 동작 타이밍이 같다. 즉 `ArrayBlockingQueue`는 문서의 `Condition` 코드를 라이브러리로 만든 것이다.

### 4. 언제 직접 짜나

- 대기 조건이 "가득 참/비어 있음"이 아닐 때 (예: 우선순위·배치 크기·여러 자원을 동시에 기다림)
- 그 외에는 `BlockingQueue` 구현체(`ArrayBlockingQueue`, `LinkedBlockingQueue`, `SynchronousQueue` 등)를 고른다.

## 관련 문서

- [Java 락 — 02-overview](../../knowledge/java/0002-java-lock/02-overview.md)
- [Java 락 — 03-tradeoffs](../../knowledge/java/0002-java-lock/03-tradeoffs.md)
- [AQS와 LockSupport](./0001-java-aqs-locksupport.md)

## 출처

- OpenJDK `java.util.concurrent.ArrayBlockingQueue` 소스 (Temurin 21.0.12 `lib/src.zip`, 274–276·364–436행)
- [JSR-166 ArrayBlockingQueue.java (jdk8 mirror)](https://gee.cs.oswego.edu/dl/jsr166/src/jdk8/java/util/concurrent/ArrayBlockingQueue.java)
- [mrdrivingduck — ArrayBlockingQueue 소스 분석](https://mrdrivingduck.github.io/blog/jdk-source-code-analysis/java.util.concurrent/Class%20-%20java.util.concurrent.ArrayBlockingQueue.html)
