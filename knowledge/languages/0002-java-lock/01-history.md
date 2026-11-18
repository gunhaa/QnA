# Java 락의 역사

## 쉬운 설명

처음 Java에는 **방마다 열쇠 하나(`synchronized`)** 만 있었다. 쓰기 쉬웠지만 "열쇠를 기다리다 포기하기", "읽는 사람은 여럿 들어오기" 같은 걸 못 했다. 그래서 Doug Lea라는 사람이 **다양한 열쇠 세트(`java.util.concurrent`)** 를 만들어 넣었다. 그 뒤로는 기본 열쇠를 더 빠르게 다듬고, 최근엔 수십만 명의 작은 일꾼(가상 스레드)도 열쇠를 잘 쓰게 고쳤다. 하지만 이 열쇠들은 **한 건물(JVM) 안에서만** 통한다.

## 일반 설명

### 1. 등장 배경 (1995~2004): 모니터 하나로 시작

- Java는 처음부터 **언어 차원의 스레드**를 가진 드문 언어였다. 동기화 모델은 1970년대 Hoare·Brinch Hansen의 **모니터** 개념을 따왔다.
- 모든 객체가 모니터를 하나씩 가진다: `synchronized`(상호 배제) + `wait`/`notify`/`notifyAll`(조건 대기).
- 풀려던 문제: 여러 스레드가 같은 객체를 고칠 때의 **경쟁 조건**을 쉽게 막기.
- 한계:
  - 기다리다 포기(타임아웃), 인터럽트로 대기 취소 불가
  - 읽기/쓰기 구분 불가, 조건(wait set)이 객체당 하나뿐
  - 공정성 제어 불가
  - `Thread.stop/suspend/resume`은 락을 쥔 채 멈추거나 객체를 반쯤 고친 상태로 남겨 **1.2에서 deprecated**
- 초기 **Java 메모리 모델(JMM)** 은 결함이 있어 `volatile`·`final`의 의미가 약했고, 유명한 **Double-Checked Locking**이 올바르게 동작하지 않았다.

### 2. 주요 변천

| 시기 | 변화 | 해결하려던 문제 |
|---|---|---|
| 1998 | Doug Lea의 `EDU.oswego.cs.dl.util.concurrent` 라이브러리 | 모니터만으로 부족한 동기화 도구 |
| **2004 (Java 5)** | **JSR-166 `java.util.concurrent`**: `ReentrantLock`, `Condition`, `ReadWriteLock`, **AQS**, `Semaphore`, `CountDownLatch`, `CyclicBarrier`, Atomic 클래스, `ConcurrentHashMap`, Executor | 타임아웃·인터럽트·공정성·다중 조건·읽기/쓰기 락 |
| **2004 (Java 5)** | **JSR-133 새 메모리 모델**: happens-before, `volatile`·`final` 의미 강화 | 가시성·재정렬 버그, DCL 수정 가능 |
| 2006 (Java 6) | `synchronized` 최적화: **biased locking**, 경량 락(stack locking), 적응형 스핀, 락 굵게 만들기(coarsening), 탈출 분석 기반 **락 제거(elision)** | "`synchronized`는 느리다" → `ReentrantLock`과 성능 격차 해소 |
| 2011 (Java 7) | `Phaser`, Fork/Join, `TransferQueue` | 단계별 동기화, 분할 정복 병렬 |
| 2014 (Java 8) | **`StampedLock`**(낙관적 읽기), `LongAdder`, `ConcurrentHashMap` 재작성(세그먼트 제거, 버킷 단위 동기화), `CompletableFuture` | 읽기 위주 경합, 고경합 카운터 |
| 2017 (Java 9) | `VarHandle`(Unsafe 대체 메모리 접근 모드), `Thread.onSpinWait()`, `Flow` | 표준화된 저수준 원자 연산 |
| 2020 (JDK 14) | AQS 내부 재작성 | 단순화·성능 |
| 2020 (JDK 15) | **biased locking 기본 비활성화**(JEP 374), 이후 제거 | 현대 하드웨어에선 이득보다 유지 비용·안전점 정지가 큼 |
| **2023 (JDK 21)** | **가상 스레드** 정식. 단, `synchronized` 안에서 블로킹하면 캐리어 스레드에 **고정(pinning)** | 스레드당 요청 모델 확장 — 대신 `synchronized`가 걸림돌 |
| 2023~2026 | HotSpot **lightweight locking**: JDK 21 실험 → **JDK 23 기본** → `LockingMode` 옵션 JDK 24 deprecated, 26 obsolete | 모니터 구현 단순화, compact object header 준비 |
| **2025 (JDK 24)** | **JEP 491**: `synchronized`가 더 이상 가상 스레드를 고정하지 않음 | 가상 스레드에서 `synchronized` 사용 가능 |
| 2025 (JDK 25) | Compact Object Headers 정식(객체 헤더 축소, 모니터는 별도 테이블로), Scoped Values 정식 | 메모리 절감, `ThreadLocal` 대안 |
| 2025~2026 | Structured Concurrency 프리뷰 지속(25: 5차, 26: 6차, 27: 7차) | 하위 작업 수명·취소를 구조적으로 관리 |

### 3. JVM 밖으로: 분산 락의 시대

- 서버가 여러 대(다중 인스턴스, 컨테이너 오토스케일)가 되면서 **JVM 락은 한 프로세스 안에서만 유효**하다는 한계가 실무 문제가 됐다.
- 대안: DB 락(`SELECT ... FOR UPDATE`, 낙관적 락 `@Version`), Redis(Redisson), ZooKeeper(Curator), etcd, 스케줄러 중복 방지용 ShedLock.
- 2016년 Martin Kleppmann의 Redlock 비판과 antirez의 반론 이후, "분산 락은 **효율용**이고 정확성은 **fencing token·DB 제약**으로 지킨다"는 원칙이 정착했다.

### 4. 현재 상태 (2026년 11월)

- 기본 선택: **`synchronized`**(간단, JDK 24+에서 가상 스레드 친화) / 기능이 필요하면 **`ReentrantLock`** / 공유 상태는 가능하면 **불변 객체·동시성 컬렉션·Atomic**으로 락 자체를 피한다.
- JVM 내부적으로 biased locking은 사라졌고, lightweight locking + 객체 모니터 테이블 구조로 바뀌었다.
- 가상 스레드 + Structured Concurrency + Scoped Values가 "락을 덜 쓰는 동시성"의 방향을 제시하고 있다.

## 관련 문서

- [Java 락 개요와 기본 사용법](./java-lock-overview-and-basic-usage.md)
- [Java 락: 자주 겪는 문제와 해결 방법](./java-lock-common-problems-and-solutions.md)
- [Java 락 장애 대응과 다중 인스턴스 환경](./java-lock-failure-and-high-availability.md)
- [Java AQS와 LockSupport 정리](./java-aqs-locksupport.md)
- [Java의 역사](../history.md)

## 참고 자료

- [JSR 166: Concurrency Utilities](https://jcp.org/en/jsr/detail?id=166)
- [JSR 133: Java Memory Model and Thread Specification Revision](https://jcp.org/en/jsr/detail?id=133)
- [The "Double-Checked Locking is Broken" Declaration](https://www.cs.umd.edu/~pugh/java/memoryModel/DoubleCheckedLocking.html)
- [Java Thread Primitive Deprecation — Oracle](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/doc-files/threadPrimitiveDeprecation.html)
- [JEP 374: Deprecate and Disable Biased Locking](https://openjdk.org/jeps/374)
- [JDK-8334496: Deprecate LockingMode option](https://bugs.openjdk.org/browse/JDK-8334496)
- [RFR 8319251: Change LockingMode default to LM_LIGHTWEIGHT](https://mail.openjdk.org/pipermail/hotspot-runtime-dev/2024-March/068812.html)
- [RFR 8359437: Make users not able to set LockingMode flag](https://mail.openjdk.org/pipermail/hotspot-dev/2025-June/107674.html)
- [Compact Java Monitors — arXiv](https://arxiv.org/pdf/2102.04188)
- [JEP 491: Synchronize Virtual Threads without Pinning](https://openjdk.org/jeps/491)
- [JEP 519: Compact Object Headers](https://openjdk.org/jeps/519)
- [Martin Kleppmann — How to do distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
