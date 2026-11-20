---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# Java 락 트레이드오프와 선택 기준

## 쉬운 설명

줄 서기 규칙을 엄격하게 할수록 **새치기는 사라지지만 줄이 느리게 줄어든다.** 손님 셋이 다 같이 쓰는 칠판 대신 **각자 메모지에 적고 나중에 합치면** 빠르지만 "지금 정확히 몇 개냐"는 바로 못 답한다. Java 락의 선택은 모두 이렇게 **빠름·단순함·공정함·정확한 즉시 값·여러 서버 지원 중 무엇을 내주고 무엇을 얻을지** 고르는 일이다.

## 일반 설명

> 각 도구가 **어떻게 동작하는지**는 [개요](./02-overview.md), 고른 뒤 **잘못 쓰는 패턴**은 [자주 겪는 문제](./04-pitfalls.md), **깨지는 상황과 분산 락 장애**는 [장애 대응](./05-failures.md)에서 다룬다. 이 문서는 "왜 그렇게 만들었고, 대가는 무엇이고, 언제 고르나"만 다룬다.

### 1. 핵심 설계 선택: 얻은 것과 포기한 것

| 설계 선택 | 얻은 것 | 포기한 것 |
|---|---|---|
| **`synchronized`를 언어에 내장** (블록 구조) | 해제 누락 불가(예외 시에도 자동), JIT가 락 제거·굵게 만들기·적응형 스핀 등 최적화, 스레드 덤프에 소유자 표시 | 타임아웃·`tryLock`·인터럽트 대기·공정성·다중 조건. 블록을 넘는 락(손에 손 잡기, hand-over-hand) 불가 |
| **`ReentrantLock`을 라이브러리(AQS)로** | 위 기능 전부, `Condition` 여러 개, `getQueueLength()` 같은 관측 API | `finally` 해제 책임이 사람에게 넘어옴. 락 객체 할당·AQS 노드 비용, JIT의 락 제거 대상 아님 |
| **기본값 비공정(barging)** | 깨어나는 중인 스레드 대신 **이미 실행 중인 스레드가 바로 획득** → 컨텍스트 스위치 절감 | 특정 스레드 기아 가능 |
| **읽기/쓰기 분리** (`ReentrantReadWriteLock`) | 읽기끼리 병렬 | 읽기 락 획득도 공유 카운터 CAS → 짧은 임계 구역에선 일반 락보다 느릴 수 있음. 업그레이드 불가, 보유 횟수 상한 65,535(JDK 24까지, JDK 25부터 `Integer.MAX_VALUE`) |
| **낙관적 읽기** (`StampedLock`) | 읽기 경로에 **쓰기 연산 없음** → 캐시 라인 경합 없이 읽기 확장 | 재진입·`Condition` 없음, `validate` 재시도 코드를 사람이 짜야 함, 읽은 값이 일시적으로 불일치할 수 있음 |
| **lock-free CAS** (`Atomic*`) | 블로킹·데드락 없음, 단일 변수 갱신이 가장 빠름 | **변수 하나**만 원자적. 고경합 시 CAS 실패 재시도로 성능 급락 |
| **셀 분산** (`LongAdder`) | 고경합에서도 증가 비용 일정 | 메모리(셀마다 캐시 라인 패딩), `sum()`이 **스냅샷이 아님**, 시퀀스 발급 불가 |
| **biased locking 제거** (JEP 374, JDK 15 비활성화) | JVM 단순화, 편향 취소용 안전점 정지 제거 | `Vector`/`Hashtable`처럼 한 스레드가 매번 락을 잡는 레거시 코드는 일부 회귀 |

`synchronized` vs `ReentrantLock` 성능은 Java 6 이후 비슷하다(→ [역사](./01-history.md#2-주요-변천)). 그래서 **선택 기준은 성능이 아니라 기능**이다.

### 2. 수치로 보는 비용

**공정 vs 비공정** — Marc Brooker의 측정(읽기 3 + 쓰기 1 스레드, 각 5억 회)

| 구성 | 락 1회 비용 | 비고 |
|---|---|---|
| `volatile` 읽기 | 기준 | 락 읽기는 이보다 약 33배 비쌈 |
| 비공정 `ReentrantLock` | 약 0.5µs (545ns) | 5회 중 1회꼴로 스레드가 **완전히 직렬로** 실행되는 기아 관찰 |
| 공정 `ReentrantLock` | 약 32µs (**약 60배**) | 기아 사라짐. 매 인계마다 대기 스레드를 깨우는 컨텍스트 스위치 비용 |

**왜 60배나 차이 나나** — 락을 넘겨주는 방식이 다르다.

| | 비공정 | 공정 |
|---|---|---|
| 획득 조건 | `state`가 0이면 바로 CAS | 큐에 앞선 대기자가 없을 때만 CAS (`hasQueuedPredecessors()`) |
| 락이 풀린 직후 | **이미 실행 중인 스레드**(방금 푼 스레드 포함)가 바로 다시 잡는다 | 반드시 **큐 맨 앞의 잠든 스레드**에게 넘어간다 |
| 넘겨주는 비용 | CAS 한 번 (수십 ns), 캐시도 그대로 따뜻함 | `unpark` → OS가 그 스레드를 깨워 CPU에 올릴 때까지 대기 (µs 단위) |
| 그동안 락 상태 | 거의 쉬지 않음 | 깨어나는 동안 **아무도 못 쓰고 비어 있다** |

- 경합이 계속되면 큐가 비지 않으므로, 공정 락은 **매 획득마다** 잠들기(`park`) → 깨우기(`unpark`) → 스케줄링을 거친다. 락 1회 비용이 사실상 **컨텍스트 스위치 1회 비용**이 된다. 545ns → 32µs의 차이가 이것이다.
- 비공정 락은 깨어난 스레드가 늦게 도착하면 그 사이 실행 중인 스레드가 먼저 가져간다. 잠들기·깨우기 횟수가 크게 줄어드는 대신, 운 나쁜 스레드는 계속 밀린다(위 표의 기아).
- 60배는 이 측정(4스레드, 짧은 임계 구역, 계속 경합) 기준이다. 임계 구역이 길거나 경합이 드물면 컨텍스트 스위치 비중이 작아져 차이도 줄어든다. 실제 부하에서는 JMH로 잰다.

JDK Javadoc도 "많은 스레드가 쓰는 공정 락은 처리량이 낮다(often much slower)"고 명시하고, Doug Lea는 공정 락이 **임계 구역이 길거나 획득 간격이 넓을 때만** 어울린다고 본다.

**`AtomicLong` vs `LongAdder`** — Nitsan Wakart, Xeon X5650 2소켓 12코어, JDK 8u5, 증가 1회 평균(ns)

| 스레드 | `AtomicLong` | `LongAdder` |
|---|---|---|
| 1 | 6.2 | 9.8 |
| 4 | 85.4 | 10.3 |
| 8 | 307.8 | 10.8 |
| 12 | 351.3 | 10.4 |

- 경합 없으면 `AtomicLong`이 약간 빠르고, `LongAdder`는 4스레드에서 약 8배, 12스레드에서 약 34배 빠르다.
- 대신 읽기가 잦으면 역전된다: 증가 6 + 읽기 6 스레드에서 읽기 1회가 `LongAdder` 약 600ns vs `AtomicLong` 약 152ns.
- 결론: **쓰기 위주 통계·메트릭 = `LongAdder`, ID·시퀀스·자주 읽는 값 = `AtomicLong`.**

**`ReentrantReadWriteLock` vs `StampedLock`** — 읽기 19 : 쓰기 1에서는 `StampedLock` 낙관적 읽기가 크게 앞서지만, 읽기 10 : 쓰기 10에서는 `validate` 실패가 늘어 이점이 줄어든다(Takipi 벤치마크). Martin Thompson은 `ReentrantReadWriteLock`이 기대보다 느리다며 **측정 후에만** 고르라고 권한다. 읽기/쓰기 락이 이득이 되려면 **읽기 비율이 높고 임계 구역이 충분히 길어야** 한다.

**스핀 vs 파킹** — 짧은 임계 구역(수십 ns)에서는 잠깐 도는(spin) 편이 잠들고 깨우는(park/unpark, 컨텍스트 스위치 수 µs) 것보다 싸다. HotSpot `synchronized`는 **적응형 스핀**으로 직전 성공률을 보고 스핀 길이를 정하고, AQS는 큐 맨 앞 노드만 짧게 재시도한 뒤 `LockSupport.park`로 잠든다 → [AQS와 LockSupport](../../../inquiry/languages/0003-java-aqs-locksupport.md). 임계 구역에 I/O가 있으면 스핀은 CPU 낭비일 뿐이다.

### 3. 대안 비교

| 대안 | 범위 | 강점 | 대가 | 고를 때 |
|---|---|---|---|---|
| `synchronized` | JVM | 가장 단순, 자동 해제, JIT 최적화, JDK 24+ 가상 스레드 친화 | 타임아웃·공정성·다중 조건 없음 | **기본값** |
| `ReentrantLock` | JVM | `tryLock`·타임아웃·인터럽트·공정성·`Condition` 여럿 | `finally` 필수, 코드 길어짐 | 기능이 필요할 때 |
| `ReentrantReadWriteLock` | JVM | 읽기 병렬 | 짧은 구역에선 오히려 느림, 업그레이드 불가 | 읽기 ≫ 쓰기 + 임계 구역 김 |
| `StampedLock` | JVM | 낙관적 읽기로 읽기 확장성 최고 | 재진입·`Condition` 없음, 코드 복잡 | 측정으로 병목 확인된 읽기 핫스팟 |
| `Atomic*` / `VarHandle` | JVM | 블로킹 없음 | 변수 하나만, 고경합 시 CAS 폭주 | 단일 플래그·시퀀스 |
| `LongAdder` / `LongAccumulator` | JVM | 고경합 증가 비용 일정 | 메모리, 정확한 즉시 값 없음 | 카운터·메트릭 |
| 동시성 컬렉션 (`ConcurrentHashMap`, `BlockingQueue`, `CopyOnWriteArrayList`) | JVM | 검증된 세분화 락·lock-free 구현 | 복합 연산은 제공 메서드 범위 안에서만 원자적. COW는 쓰기마다 배열 전체 복사 | 공유 맵·큐·리스너 목록 |
| 불변 객체·스레드 한정(confinement) | JVM | **락 자체가 없음** | 변경 시 새 객체 할당, 설계 제약 | 설정·스냅샷·요청 단위 상태 |
| DB 락 (원자적 UPDATE, `FOR UPDATE`, `@Version`) | 다중 인스턴스 | 데이터와 같은 곳에서 정확성 보장 | 왕복 지연(ms), 커넥션·트랜잭션 점유, DB 데드락 | 정확성이 데이터에 있을 때 **1순위** |
| Redis 분산 락 (Redisson, `SET NX PX`) | 다중 인스턴스 | sub-ms 획득, 구현 쉬움 | 비동기 복제 → 장애 조치 시 락 유실 가능 | **효율용**(중복 작업 줄이기) |
| ZooKeeper / etcd 락 | 다중 인스턴스 | 합의 기반, 세션·lease 만료로 자동 해제, 순번(fencing token) 활용 | 별도 쿼럼 클러스터 운영, 쓰기마다 쿼럼 왕복 | **정확성용** 조정 |

분산 락 구현별 주의점은 [장애 대응 §5](./05-failures.md#5-다중-인스턴스-jvm-락의-한계), 효율/정확성 구분과 장애 시나리오는 [§6](./05-failures.md#6-분산-락의-장애-시나리오)에 자세히 있다.

### 4. 주요 선택지

**락 범위(granularity)**

| 선택 | 얻는 것 | 대가 |
|---|---|---|
| 전역 락 하나 | 정확성 추론이 쉬움, 데드락 없음 | 경합 시 처리량이 코어 수와 무관하게 1 스레드 수준 |
| 객체·키 단위 락 | 병렬성 | 여러 키를 묶는 연산에서 **락 순서** 관리 필요 → 데드락 위험 |
| **락 스트라이핑** (고정 N개, 해시로 매핑) | 메모리 상한 고정, 병렬성 N배 | 서로 다른 키가 같은 줄무늬를 공유해 가끔 거짓 경합 |

사례: `ConcurrentHashMap`은 Java 7까지 기본 16개 세그먼트(스트라이핑)였다가 Java 8에서 **버킷(bin) 단위 `synchronized` + CAS**로 바꿔 동시성 상한을 없앴다. 앱에서는 Guava `Striped<Lock>`이 같은 방식을 제공한다.

**공정성** — 기본은 비공정. 공정 락은 SLA상 특정 요청의 꼬리 지연(p99.9)이 처리량보다 중요하고, 임계 구역이 길 때만 쓴다(위 표: 약 60배 비용).

**가상 스레드 호환성**

| JDK | `synchronized` 안에서 블로킹 | 선택 |
|---|---|---|
| 21~23 | 캐리어 스레드 **고정(pinning)** | 블로킹 구간은 `ReentrantLock`으로 교체 |
| **24+** (JEP 491) | 고정 없음. 네이티브 프레임·클래스 초기화 등 일부만 남음([자세히](./04-pitfalls.md#8-가상-스레드와-락)) | `synchronized`/`ReentrantLock`을 **기능 기준**으로 고름 |

가상 스레드에서는 스레드 수가 자원 보호 장치가 아니게 되므로, 락보다 **`Semaphore`로 동시 호출 수 제한**이 더 중요한 선택지가 된다.

**단일 JVM vs 분산**

| 질문 | 예 → | 아니오 → |
|---|---|---|
| 인스턴스가 정확히 1개이고 앞으로도 그런가? | JVM 락 | 다음 질문 |
| 보호 대상이 DB 행인가? | DB 원자적 UPDATE·`@Version`·`FOR UPDATE` | 다음 질문 |
| 락이 깨져 두 번 실행돼도 멱등성으로 괜찮은가? | Redis 락 / ShedLock (효율용) | ZooKeeper·etcd + fencing token |

### 5. 쓰지 말아야 할 때

| 상황 | 피할 것 | 대신 |
|---|---|---|
| 서버가 2대 이상 | JVM 락으로 공유 데이터 보호 | DB 제약·트랜잭션, 분산 락 |
| 임계 구역에 DB·HTTP 호출 | 어떤 락이든 I/O를 감싸기 | 락 밖에서 I/O, 결과만 락 안에서 반영 |
| 짧은 임계 구역 + 읽기/쓰기 비율 비슷 | `ReentrantReadWriteLock` | `synchronized` |
| 재진입·`Condition`이 필요 | `StampedLock` | `ReentrantLock` |
| 정확성이 걸린 작업(결제·재고) | Redis 단일 락만으로 보장 | DB 제약 + 멱등성, 필요 시 fencing token |
| 기아가 관찰되지 않음 | 공정 락 | 기본 비공정 |
| 정확한 즉시 값·고유 ID | `LongAdder` | `AtomicLong` |
| 공유 상태를 없앨 수 있음 | 락 자체 | 불변 객체, 스레드 한정, 메시지 큐(단일 소유자) |

### 6. 선택 체크리스트

1. **공유 가변 상태를 없앨 수 있나?** 불변 객체·스레드 한정·요청 단위 상태로 → 락 불필요.
2. **기존 동시성 컬렉션·원자 메서드로 끝나나?** `ConcurrentHashMap.compute*`, `BlockingQueue`, `AtomicLong`.
3. **보호 범위가 JVM 하나인가, 여러 인스턴스인가?** 여러 개면 DB 우선, 그다음 분산 락(효율/정확성 구분).
4. **기능 요구는?** 타임아웃·인터럽트·공정성·다중 조건 중 하나라도 → `ReentrantLock`. 없으면 `synchronized`.
5. **JDK 버전은?** 21~23 + 가상 스레드 + 락 안 블로킹 → `ReentrantLock`. 24+면 무관.
6. **읽기 비율과 임계 구역 길이를 측정했나?** 읽기 ≫ 쓰기가 측정으로 확인될 때만 RW 락·`StampedLock`.
7. **경합이 측정됐나?** JFR `jdk.JavaMonitorEnter`/`jdk.ThreadPark`로 확인([탐지 도구](./05-failures.md#2-탐지)) 후 범위 축소·스트라이핑·`LongAdder`.
8. **여러 락을 잡나?** 획득 순서를 문서화하고 `tryLock(timeout)` 전략을 정한다 → [장애 대응 §4](./05-failures.md#4-예방-설계).

## 관련 문서

- [Java 락의 역사](./01-history.md)
- [Java 락 개요와 기본 사용법](./02-overview.md)
- [Java 락: 자주 겪는 문제와 해결 방법](./04-pitfalls.md)
- [Java 락 장애 대응과 다중 인스턴스 환경](./05-failures.md)
- [Java AQS와 LockSupport 정리](../../../inquiry/languages/0003-java-aqs-locksupport.md)
- [Java 개요와 기본 사용법](../0001-java/02-overview.md)

## 참고 자료

- [ReentrantLock — Java SE 25 API (fairness)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html)
- [ReentrantReadWriteLock — Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/locks/ReentrantReadWriteLock.html)
- [JDK-8352971: Increase maximum number of hold counts for ReentrantReadWriteLock (JDK 25)](https://bugs.openjdk.org/browse/JDK-8352971)
- [StampedLock — Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/locks/StampedLock.html)
- [LongAdder — Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/atomic/LongAdder.html)
- [ReentrantLock.java 소스 (jsr166, FairSync·NonfairSync)](https://gee.cs.oswego.edu/dl/jsr166/src/jdk8/java/util/concurrent/locks/ReentrantLock.java)
- [Marc Brooker — fair vs non-fair ReentrantLock 측정 (2012)](https://brooker.co.za/blog/2012/09/10/locking/)
- [Nitsan Wakart — JDK8 update on scalable counters](https://psy-lob-saw.blogspot.com/2014/06/jdk8-update-on-scalable-counters.html)
- [Martin Thompson — Lock-Based vs Lock-Free Concurrent Algorithms](https://mechanical-sympathy.blogspot.com/2013/08/lock-based-vs-lock-free-concurrent.html)
- [Vanderbilt CS254 — Java StampedLock usage (Takipi benchmark)](https://www.dre.vanderbilt.edu/~schmidt/cs254/2021-PDFs/9.4.4-Java-StampledLock-pt4-usage.pdf)
- [Java Concurrency in Practice, Ch.13 Explicit Locks — reading notes](https://dan-chow.github.io/notes/Java_Concurrency_in_Practice/Ch13_Explicit_Locks.html)
- [JEP 374: Deprecate and Disable Biased Locking](https://openjdk.org/jeps/374)
- [JEP 491: Synchronize Virtual Threads without Pinning](https://openjdk.org/jeps/491)
- [InfoQ — Java Evolves to Tackle Virtual Threads Pinning](https://www.infoq.com/news/2024/11/java-evolves-tackle-pinning)
- [Martin Kleppmann — How to do distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
- [Guava Striped](https://guava.dev/releases/snapshot-jre/api/docs/com/google/common/util/concurrent/Striped.html)
