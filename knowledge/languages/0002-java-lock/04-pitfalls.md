---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# Java 락: 흔한 함정과 해결 방법

## 쉬운 설명

잠금장치 사고는 대개 이렇다. ① 문을 **엉뚱한 곳에** 달았다(다른 락 객체). ② 잠그고 **안 열고** 나왔다(unlock 누락). ③ 잠근 채로 **밖에 볼일**을 보러 갔다(락 안에서 느린 I/O). ④ "들어가도 되나 보고 → 들어가기" 사이에 남이 먼저 들어왔다(check-then-act). 대부분은 테스트에서 잘 안 보이고 운영에서 가끔 터진다.

## 일반 설명

> 데드락·스레드 고갈 같은 **장애 상황과 탐지·복구**, 그리고 **여러 서버 사이의 락**은 [장애 대응과 다중 인스턴스 환경](./05-failure-modes.md)에서 다룬다.

### 1. 경쟁 조건 (Race Condition)

| 패턴 | 잘못된 코드 | 해결 |
|---|---|---|
| **읽고-고치고-쓰기** | `count++` (volatile이어도 깨짐) | `AtomicLong.incrementAndGet()`, `LongAdder`, 락 |
| **확인 후 실행** | `if (!map.containsKey(k)) map.put(k, v);` | `putIfAbsent`, `computeIfAbsent` |
| 복합 연산 | 동기화 컬렉션 두 번 호출 사이 끼어들기 | 연산 전체를 하나의 락으로, 또는 원자적 메서드 |
| 지연 초기화 | `if (instance == null) instance = new X();` | 홀더 클래스 패턴, `enum` 싱글톤, 또는 `volatile` + DCL |

```java
// 올바른 지연 초기화 — 홀더 패턴 (클래스 초기화의 스레드 안전성 이용)
class Registry {
    private static class Holder { static final Registry INSTANCE = new Registry(); }
    static Registry get() { return Holder.INSTANCE; }
}
```

### 2. 가시성 문제

```java
// ✗ stop이 다른 스레드에 안 보여 영원히 돌 수 있다 (JIT가 루프 밖으로 읽기를 끌어올림)
private boolean stop;
void run() { while (!stop) { work(); } }

// ✓
private volatile boolean stop;
```

- **Double-Checked Locking**은 필드가 `volatile`일 때만 안전하다.
- 생성자에서 `this`를 다른 스레드에 넘기면(리스너 등록, 스레드 시작) 덜 초기화된 객체가 보일 수 있다 → 팩토리 메서드에서 생성 완료 후 등록.
- `final` 필드는 생성자 종료 후 안전하게 공개된다 → **불변 객체**가 가장 쉬운 해결책.

### 3. 잘못된 대상에 락 걸기

| 실수 | 왜 문제인가 | 해결 |
|---|---|---|
| `synchronized (new Object())` | 매번 다른 락 → 효과 없음 | 필드에 `private final Object lock` |
| 인스턴스 락으로 `static` 필드 보호 | 인스턴스마다 다른 락 | `static final` 락 또는 클래스 락 |
| `synchronized ("LOCK")` 문자열 리터럴, `Integer`/`Boolean` | 인턴·캐싱으로 **전혀 다른 코드와 같은 락을 공유** | 전용 락 객체 |
| `synchronized (this)` 공개 | 외부 코드가 같은 객체로 락을 잡아 간섭 | private 락 객체 |
| Spring 빈이 prototype·요청 스코프 | 인스턴스마다 락이 달라 보호 안 됨 | 싱글톤 빈의 락, 또는 DB 수준 동시성 제어 |
| 키별 락을 `ConcurrentHashMap<String, Lock>`으로 만들고 안 지움 | 메모리 누수 | 고정 개수 **락 스트라이핑**(Guava `Striped`), 또는 `compute` 활용 |

### 4. 락 해제·사용 실수

| 실수 | 해결 |
|---|---|
| `lock()` 후 예외로 `unlock()` 누락 → 영원히 잠김 | `lock()`은 `try` **바로 앞**, `unlock()`은 `finally` |
| `lock()`을 `try` 안에 둠 → 획득 실패해도 `finally`에서 `unlock()` → `IllegalMonitorStateException` | 순서 지키기 |
| `wait()`/`notify()`를 `synchronized` 밖에서 호출 | `IllegalMonitorStateException` — 같은 객체의 모니터 안에서 |
| `if (cond) wait();` | **가짜 깨어남(spurious wakeup)** 대비 `while`로 |
| `notify()`로 엉뚱한 대기자만 깨움 → 신호 유실 | 조건이 여럿이면 `notifyAll()` 또는 `Condition` 분리 |
| `ReadWriteLock` 읽기 락 쥔 채 쓰기 락 요청 | **업그레이드 불가 → 스스로 데드락**. 읽기 해제 후 쓰기 획득, 다시 검증 |
| `StampedLock` 재진입 | 재진입 불가 → 데드락 |

### 5. 성능 문제: 경합

| 증상 | 원인 | 해결 |
|---|---|---|
| CPU는 낮은데 처리량이 안 오름, BLOCKED 스레드 다수 | 하나의 전역 락에 경합 집중 | 임계 구역 축소, 락 분할·스트라이핑, 불변 스냅샷(copy-on-write) |
| 락 안에서 DB·HTTP 호출 | 락 보유 시간 = 네트워크 지연 | **락 밖에서 I/O**, 락 안에서는 메모리 연산만 |
| 고경합 카운터 | `AtomicLong` CAS 실패 반복 | `LongAdder` |
| `Collections.synchronizedMap` 전체 락 | 모든 연산 직렬화 | `ConcurrentHashMap` |
| 공정 락(`new ReentrantLock(true)`) | 컨텍스트 스위치 증가로 처리량 크게 감소([수치](./03-tradeoffs.md#2-수치로-보는-비용)) | 기아가 실제 문제일 때만 |

진단: JFR 이벤트 `jdk.JavaMonitorEnter`(synchronized 대기), `jdk.ThreadPark`(j.u.c 락 대기), async-profiler `-e lock` 플레임 그래프. 덤프 비교 등 탐지 방법은 [장애 대응 — 탐지](./05-failure-modes.md#2-탐지).

### 6. Spring·JPA와 섞일 때

**`@Transactional` 안의 JVM 락은 커밋 전에 풀린다**

```java
@Transactional
public synchronized void decrease(Long id) {   // ✗
    Stock s = repo.findById(id).orElseThrow();
    s.decrease();
}   // ← 메서드 종료 시 락 해제, 그 "후에" 프록시가 커밋
    //   → 다음 스레드가 커밋 전 옛 값을 읽어 재고가 덜 줄어듦
```

- 해결: 락을 트랜잭션 **바깥**에서 잡거나, 애초에 **DB 수준 동시성 제어**(원자적 UPDATE, `FOR UPDATE`, `@Version`)를 쓴다. 서버가 2대 이상이면 JVM 락은 어차피 무의미하므로 DB 쪽이 기본이다 → [다중 인스턴스 환경의 방법별 구현·주의점](./05-failure-modes.md#5-다중-인스턴스-jvm-락의-한계).

### 7. 동시성 컬렉션의 함정

| 함정 | 해결 |
|---|---|
| `ConcurrentHashMap.computeIfAbsent` 안에서 같은 맵을 다시 수정 | `IllegalStateException: Recursive update` 또는 행 → 매핑 함수는 짧고 부수효과 없이 |
| `computeIfAbsent` 안에서 느린 I/O | 해당 버킷이 잠겨 같은 버킷 키들이 대기 |
| `ConcurrentHashMap`의 `size()`·순회 결과를 정확한 값으로 신뢰 | 약한 일관성 — 순회 중 변경이 반영될 수도 안 될 수도 |
| `Collections.synchronizedList` 순회 | 순회 동안 직접 `synchronized (list)` 필요 |
| `ArrayList`/`HashMap`을 여러 스레드가 수정 | 데이터 손상, 과거 `HashMap`은 무한 루프 → 동시성 컬렉션 |

### 8. 가상 스레드와 락

| 항목 | 내용 |
|---|---|
| JDK 21~23의 `synchronized` | 블로킹하면 캐리어 스레드 **고정(pinning)** → 캐리어(기본 CPU 코어 수)가 모두 고정되면 전체 정지 가능. `ReentrantLock`으로 교체가 권장됐다 |
| **JDK 24+** | JEP 491로 해결. 단, 네이티브 코드(JNI·FFM)가 스택에 있는 동안의 블로킹과 클래스 초기화 관련 블로킹은 여전히 고정. 다른 스레드의 클래스 초기화를 기다리는 흔한 경로는 JDK 26에서 고정되지 않게 개선됐다(JDK-8369238) |
| 진단 | JFR `jdk.VirtualThreadPinned` 이벤트 |
| `ThreadLocal` | 가상 스레드 수십만 개 × 큰 값 = 메모리 폭증 → Scoped Values(JDK 25 정식) |
| 자원 보호 | 스레드 수가 사실상 무제한이므로 DB 커넥션·외부 API 동시 호출은 **`Semaphore`로 제한** |

### 9. 테스트하기 어렵다는 문제

| 도구 | 용도 |
|---|---|
| **jcstress** (OpenJDK) | 메모리 모델 수준의 경쟁·가시성 버그를 수백만 번 실행해 재현 |
| `CountDownLatch`로 동시 출발 + 다수 반복 | 경쟁 조건 통합 테스트 |
| Awaitility | 비동기 결과 대기 (`Thread.sleep` 대신) |
| 정적 분석 (Error Prone, SpotBugs) | `@GuardedBy` 위반, 잘못된 DCL 탐지 |

## 관련 문서

- [Java 락의 역사](./01-history.md)
- [Java 락 개요와 기본 사용법](./02-overview.md)
- [Java 락 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [Java 락 장애 대응과 다중 인스턴스 환경](./05-failure-modes.md)
- [Java AQS와 LockSupport 정리](../../../inquiry/languages/0003-java-aqs-locksupport.md)
- [MySQL 운영 시 흔한 함정 — 락 대기와 데드락](../../database/0001-mysql/04-pitfalls.md)

## 참고 자료

- [Java Concurrency in Practice — Brian Goetz et al.](https://jcip.net/)
- [The "Double-Checked Locking is Broken" Declaration](https://www.cs.umd.edu/~pugh/java/memoryModel/DoubleCheckedLocking.html)
- [ConcurrentHashMap — Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)
- [JEP 491: Synchronize Virtual Threads without Pinning](https://openjdk.org/jeps/491)
- [JDK 26 EA builds: changes to avoid pinning while waiting for class initialization — loom-dev](https://mail.openjdk.org/pipermail/loom-dev/2025-November/008027.html)
- [JEP 506: Scoped Values](https://openjdk.org/jeps/506)
- [jcstress — OpenJDK](https://github.com/openjdk/jcstress)
- [Spring Framework — Transaction Management](https://docs.spring.io/spring-framework/reference/data-access/transaction.html)
