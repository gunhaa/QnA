---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# Java 락 개요와 기본 사용법

## 쉬운 설명

화장실이 하나인데 여러 명이 동시에 들어가면 사고가 난다. 그래서 **문에 잠금장치**를 단다. 들어간 사람이 잠그고, 나올 때 연다. Java의 락도 똑같다. 여러 스레드가 같은 데이터를 동시에 고치지 못하게 한 번에 한 명만 들어가게 하고, 안에서 바꾼 내용이 다음 사람에게 **확실히 보이게** 해 준다.

## 일반 설명

### 1. 락이 해결하는 세 가지 문제

| 문제 | 예 | 락 없이 생기는 일 |
|---|---|---|
| **원자성** | `count++` = 읽기 → 더하기 → 쓰기 | 두 스레드가 같은 값을 읽어 하나가 사라짐 |
| **가시성** | 스레드 A가 `running = false` | 스레드 B는 CPU 캐시·레지스터의 옛 값을 계속 봄 → 무한 루프 |
| **순서(재정렬)** | 객체 생성 후 참조 공개 | 컴파일러·CPU 재정렬로 덜 초기화된 객체를 다른 스레드가 봄 |

Java 메모리 모델(JMM)은 이를 **happens-before** 관계로 정의한다. 대표 규칙:
- 같은 락의 **unlock → 이후 lock**
- `volatile` 쓰기 → 이후 같은 변수 읽기
- `Thread.start()` → 그 스레드의 동작, 스레드 종료 → `join()` 반환

### 2. 도구 한눈에

| 도구 | 원자성 | 가시성 | 특징 |
|---|---|---|---|
| `synchronized` | ✓ | ✓ | 언어 내장, 자동 해제, 재진입 |
| `volatile` | ✗ (단일 읽기/쓰기만) | ✓ | 플래그·상태 공개용 |
| `AtomicInteger/Long/Reference` | ✓ (CAS) | ✓ | 락 없는 단일 변수 갱신 |
| `LongAdder` | ✓ | ✓ | 고경합 카운터 (셀 분산 후 합산) |
| `ReentrantLock` | ✓ | ✓ | 타임아웃·인터럽트·공정성·다중 `Condition` |
| `ReentrantReadWriteLock` | ✓ | ✓ | 읽기 여럿 동시, 쓰기 단독 |
| `StampedLock` | ✓ | ✓ | 낙관적 읽기, **재진입 불가** |
| `Semaphore` | — | ✓ | 동시 접근 수 제한 (permit N개) |
| `CountDownLatch` / `CyclicBarrier` / `Phaser` | — | ✓ | 스레드 간 대기·합류 |
| `ConcurrentHashMap`, `BlockingQueue` 등 | ✓ (연산 단위) | ✓ | 동기화된 자료구조 — 직접 락보다 우선 고려 |

`ReentrantLock`·`Semaphore` 등은 내부적으로 **AQS + LockSupport** 위에 만들어져 있다 → [AQS와 LockSupport 정리](../../../inquiry/languages/0003-java-aqs-locksupport.md)

### 3. 기본 사용법

**`synchronized`**

```java
class Counter {
    private long count;

    public synchronized void increment() { count++; }   // this 모니터
    public synchronized long get() { return count; }    // 읽기도 같은 락 → 가시성 보장
}

// 블록 형태: 전용 락 객체를 쓰면 외부에서 같은 락을 잡는 사고를 막는다
private final Object lock = new Object();
void update() {
    synchronized (lock) { /* 임계 구역 */ }
}
```

**`ReentrantLock` — 반드시 `try/finally`**

```java
private final ReentrantLock lock = new ReentrantLock();

void transfer() throws InterruptedException {
    if (!lock.tryLock(500, TimeUnit.MILLISECONDS)) {     // 기다리다 포기
        throw new IllegalStateException("busy");
    }
    try {
        // 임계 구역
    } finally {
        lock.unlock();
    }
}
```

**`Condition` — 생산자/소비자 (조건별 대기열 분리)**

```java
class BoundedBuffer<E> {
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notEmpty = lock.newCondition();  // "비어 있지 않음"을 기다리는 줄 (소비자)
    private final Condition notFull  = lock.newCondition();  // "가득 차지 않음"을 기다리는 줄 (생산자)
    private final Deque<E> items = new ArrayDeque<>();
    private final int capacity;

    BoundedBuffer(int capacity) { this.capacity = capacity; }

    void put(E item) throws InterruptedException {
        lock.lock();
        try {
            while (items.size() == capacity) notFull.await();  // 가득 참 → 락을 놓고 잠든다
            items.addLast(item);
            notEmpty.signal();                                 // 잠든 소비자 하나를 깨운다
        } finally { lock.unlock(); }
    }

    E take() throws InterruptedException {
        lock.lock();
        try {
            while (items.isEmpty()) notEmpty.await();          // 비어 있음 → 락을 놓고 잠든다
            E item = items.removeFirst();
            notFull.signal();                                  // 잠든 생산자 하나를 깨운다
            return item;
        } finally { lock.unlock(); }
    }
}
```

- `await()`는 락을 **놓고** 잠들었다가, 깨어나면 락을 **다시 잡은 뒤** 돌아온다. 그래서 잠든 동안 다른 스레드가 `put`/`take`를 할 수 있다.
- `if`가 아니라 `while`로 조건을 다시 확인한다. 깨어났을 때 다른 스레드가 먼저 값을 가져갔을 수 있고, 가짜 깨어남(spurious wakeup)도 있기 때문이다.
- 대기 줄을 둘로 나눴으므로 `put`은 소비자만, `take`는 생산자만 깨운다. 조건이 하나뿐인 `wait/notifyAll`은 양쪽을 모두 깨운다.

실무에서는 이 클래스를 직접 만들지 않는다. `ArrayBlockingQueue`가 **내부에 위 코드와 같은 구조**(락 1개 + `notEmpty`·`notFull`)를 갖고 있어서, `put`/`take`만 부르면 대기와 깨우기가 자동으로 일어난다.

```java
BlockingQueue<Order> queue = new ArrayBlockingQueue<>(100);   // 용량 100

// 생산자 스레드
queue.put(order);                       // 가득 차면 빈자리가 날 때까지 블록

// 소비자 스레드
Order next = queue.take();              // 비어 있으면 들어올 때까지 블록

// 블록하지 않는 변형
boolean ok = queue.offer(order);                              // 가득 차면 즉시 false
Order o1  = queue.poll();                                     // 비어 있으면 즉시 null
Order o2  = queue.poll(500, TimeUnit.MILLISECONDS);           // 최대 500ms 기다리고 null
```

`LinkedBlockingQueue`는 같은 방식으로 동작하지만, 락을 `put`용과 `take`용 둘로 나눠 넣기와 꺼내기가 동시에 진행된다. 실행 결과와 JDK 소스 비교는 [inquiry — ArrayBlockingQueue와 Condition 생산자/소비자](../../../inquiry/languages/0005-java-arrayblockingqueue-condition-producer-consumer.md)에 있다.

**`ReadWriteLock` — 읽기 많은 캐시**

```java
private final ReadWriteLock rw = new ReentrantReadWriteLock();
private final Map<String, Config> map = new HashMap<>();

Config get(String key) {
    rw.readLock().lock();
    try { return map.get(key); } finally { rw.readLock().unlock(); }
}
void put(String key, Config value) {
    rw.writeLock().lock();
    try { map.put(key, value); } finally { rw.writeLock().unlock(); }
}
```

**`StampedLock` — 낙관적 읽기**

```java
private final StampedLock sl = new StampedLock();
private double x, y;

double distance() {
    long stamp = sl.tryOptimisticRead();         // 락 없이 읽기 시도
    double cx = x, cy = y;
    if (!sl.validate(stamp)) {                   // 그 사이 쓰기가 있었으면
        stamp = sl.readLock();                   // 진짜 읽기 락으로 재시도
        try { cx = x; cy = y; } finally { sl.unlockRead(stamp); }
    }
    return Math.hypot(cx, cy);
}
```

**락 없이 해결하기**

```java
AtomicLong seq = new AtomicLong();
long id = seq.incrementAndGet();                         // CAS

LongAdder hits = new LongAdder();                        // 고경합 카운터
hits.increment();

ConcurrentHashMap<String, LongAdder> counts = new ConcurrentHashMap<>();
counts.computeIfAbsent(key, k -> new LongAdder()).increment();   // 키 단위 원자적

record Snapshot(List<String> items) {}                   // 불변 객체는 공유해도 안전
```

### 4. 선택 가이드

기본은 `synchronized`, 타임아웃·인터럽트·공정성·여러 조건이 필요하면 `ReentrantLock`이다. 상황별 대안 비교·수치·체크리스트는 [트레이드오프 — 대안 비교](./03-tradeoffs.md#3-대안-비교)와 [선택 체크리스트](./03-tradeoffs.md#6-선택-체크리스트)에 있다. **여러 서버(JVM) 사이**는 JVM 락으로 불가 → [다중 인스턴스 환경](./05-failures.md#5-다중-인스턴스-jvm-락의-한계).

### 5. `synchronized` vs `ReentrantLock`

| 항목 | `synchronized` | `ReentrantLock` |
|---|---|---|
| 해제 | 블록 종료 시 자동 (예외 포함) | `finally`에서 직접 |
| 타임아웃·`tryLock` | ✗ | ✓ |
| 대기 중 인터럽트 | ✗ | ✓ `lockInterruptibly()` |
| 공정성 | ✗ (비공정) | 선택 가능 |
| 조건 변수 | 객체당 1개(`wait/notify`) | 여러 개 `Condition` |
| 가상 스레드 | JDK 21~23 고정 문제, **24+ 해결** ([남은 사례](./04-pitfalls.md#8-가상-스레드와-락)) | 처음부터 문제 없음 |
| 진단 | 스레드 덤프에 `locked <monitor>` | `parking to wait for <...ReentrantLock$NonfairSync>` |

성능은 Java 6 이후 비슷하므로 고르는 기준은 기능이다. 각 설계에서 얻은 것과 포기한 것은 [트레이드오프 §1](./03-tradeoffs.md#1-핵심-설계-선택-얻은-것과-포기한-것)에서 다룬다.

### 6. JVM 내부 (간단히)

- `synchronized`는 바이트코드 `monitorenter`/`monitorexit`로 컴파일된다.
- 경합이 없으면 **lightweight locking**(CAS로 소유 표시, JDK 23+ 기본)으로 끝나고, 경합이 생기면 OS 수준 대기열을 가진 **ObjectMonitor로 팽창(inflate)** 한다.
- `ReentrantLock` 계열은 AQS의 `state` CAS + 대기 큐 + `LockSupport.park/unpark`로 동작한다.

## 관련 문서

- [Java 락의 역사](./01-history.md)
- [Java 락 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [Java 락: 자주 겪는 문제와 해결 방법](./04-pitfalls.md)
- [Java 락 장애 대응과 다중 인스턴스 환경](./05-failures.md)
- [Java AQS와 LockSupport 정리](../../../inquiry/languages/0003-java-aqs-locksupport.md)
- [Java 개요와 기본 사용법](../0001-java/02-overview.md)

## 참고 자료

- [java.util.concurrent.locks — OpenJDK 25 API](https://docs.w3cub.com/openjdk~25/java.base/java/util/concurrent/locks/package-summary)
- [JLS §17.4 Memory Model](https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html#jls-17.4)
- [StampedLock — Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/locks/StampedLock.html)
- [JEP 491: Synchronize Virtual Threads without Pinning](https://openjdk.org/jeps/491)
- [Java Concurrency in Practice — Brian Goetz et al.](https://jcip.net/)
