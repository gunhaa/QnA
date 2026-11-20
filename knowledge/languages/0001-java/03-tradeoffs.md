---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# Java 트레이드오프와 선택 기준

## 쉬운 설명

Java는 **짐을 많이 싣고 어느 길이든 달리는 큰 트럭**을 골랐다. 그 대신 시동 거는 데 오래 걸리고(느린 시작), 연료(메모리)를 많이 먹고, 운전하려면 서류(긴 코드)를 많이 채워야 한다. 옛날 짐칸 규격도 바꾸지 않기로 약속해서, 새 기능을 넣을 때마다 옛 규격에 맞추느라 모양이 어색해진 부분이 있다.

## 일반 설명

> 동작 원리는 [개요](./02-overview.md), 고른 뒤 겪는 실수·장애는 [자주 겪는 문제](./04-pitfalls.md)·[장애 대응](./05-failure-modes.md)에서 다룬다. 이 문서는 **왜 그렇게 만들었고 대가는 무엇이며 언제 고르나**만 다룬다.

### 1. 핵심 설계 선택: 얻은 것과 포기한 것

| 설계 선택 | 얻은 것 | 포기한 것 (수치·사례) | 지금의 완화책 |
|---|---|---|---|
| **바이트코드 + JVM** | 같은 `.jar`가 x86·ARM, 리눅스·윈도우에서 실행. 런타임이 실제 실행 프로필을 보고 최적화 | **시작 시간·메모리**. Spring PetClinic은 JDK 23에서 시작에 약 4.5초, 시작 때 클래스 약 21,000개를 로딩·링킹한다 (JEP 483). 빈 Spring Boot 앱도 RSS 수백 MB | AOT 캐시(JEP 483: PetClinic 4.5초 → 2.6초, **42%** 단축), GraalVM Native Image, CRaC |
| **JIT (인터프리터 → C1 → C2)** | 장기 실행 시 **최고 성능**(프로필 기반 인라이닝·탈가상화). 정적 AOT보다 빠른 경우가 많다 | **워밍업**. 배포 직후 수십 초~수 분 동안 지연·CPU가 높다. 오토스케일로 새로 뜬 인스턴스가 가장 느린 순간에 트래픽을 받는다 | JEP 515(JDK 25) AOT 메서드 프로파일링으로 워밍업 **19%** 단축, readiness 지연 |
| **GC (자동 메모리)** | 해제 누락·이중 해제·댕글링 포인터 계열 버그 제거 | 힙 **여유 공간**이 필요하고 GC 스레드가 CPU를 쓴다. 지연 GC(ZGC)일수록 메모리·CPU를 더 쓴다. 정지 시간 예측은 Rust/C++의 결정적 해제보다 어렵다 | 세대별 ZGC로 정지 1ms 미만 (§3.2) |
| **모든 것이 객체(참조)** | 단순한 메모리 모델, 다형성 | 객체마다 헤더 12바이트(64비트, 압축 포인터 기준). `int`는 4바이트지만 `Integer`는 16바이트 + 참조. `List<Integer>`는 박싱·포인터 추적 비용 | **Compact Object Headers**: 헤더 12 → 8바이트 (JDK 25 옵트인 `-XX:+UseCompactObjectHeaders`, JDK 27부터 기본 — JEP 534). 값 클래스(Valhalla, JEP 401)는 JDK 28(2027.03 예정)에 첫 프리뷰로 통합됨 |
| **정적·명목 타입** | 대규모 팀에서 컴파일 타임 검사, IDE 리팩터링의 정확성 | **장황함**. DTO 하나에 getter·`equals`·`hashCode`·생성자 수십 줄 → Lombok 같은 도구가 생긴 이유 | `record`, `var`, 패턴 매칭, sealed (Java 14~21) |
| **강한 하위 호환** | 수십 년 된 jar와 라이브러리가 그대로 동작. 기업이 Java를 고르는 1순위 이유 | **타입 소거**: 런타임에 `List<String>`과 `List<Integer>`가 같은 클래스, `new T[]`·`List<int>` 불가. 기본 타입/참조 타입 이원화, 모든 참조가 기본적으로 nullable | 소거는 유지하되 Valhalla가 원시·참조 분리를 점진적으로 줄이는 중 |
| **체크 예외** | 실패 가능성을 시그니처에 강제 | 람다·Stream과 충돌(`Function`은 체크 예외를 못 던진다). Spring·JPA 등 주요 프레임워크는 결국 언체크 예외로 감싼다. Kotlin·C#은 체크 예외를 채택하지 않았다 | 관례적으로 도메인 경계에서만 사용 |
| **플랫폼 스레드 1:1 (OS 스레드)** | 디버거·스레드 덤프·`ThreadLocal`이 단순 | 스레드당 스택 예약 기본 1MB(리눅스 x64 `-Xss`) → 요청당 스레드 모델이 수천 동시 연결에서 한계. 그래서 2010년대에 리액티브(WebFlux)로 갔다 | **가상 스레드**(21) — 수백만 개 생성 가능. `synchronized` 고정(pinning)은 JEP 491(24)에서 해소 |

**사례 — 가상 스레드의 대가**: Netflix는 Java 21 + Spring Boot 3 + Tomcat에서 가상 스레드를 켠 뒤 인스턴스가 응답을 멈추는 장애를 겪었다. `synchronized` 안에서 블로킹한 가상 스레드들이 캐리어 스레드를 모두 고정해 남은 스레드가 락을 얻지 못한 것이다(2024, "Dude, Where's My Lock?"). JDK 24 이상에서는 이 원인이 사라졌으므로 **가상 스레드를 쓸 거면 25 LTS**가 기준이다. 고정(pinning)의 원리와 JDK 버전별 대응은 [Java 락: 자주 겪는 문제 §8](../0002-java-lock/04-pitfalls.md#8-가상-스레드와-락)·[Java 락 트레이드오프 §4](../0002-java-lock/03-tradeoffs.md#4-주요-선택지)에서 다룬다.

### 2. 대안 비교 (서버 애플리케이션 기준)

| | **Java** | Kotlin (JVM) | Go | C# / .NET | Rust | Node.js / Python |
|---|---|---|---|---|---|---|
| 런타임 | JVM, JIT | JVM (같음) | 네이티브 바이너리, GC | CLR, JIT (+Native AOT) | 네이티브, GC 없음 | V8 JIT / CPython 인터프리터 |
| 시작·메모리 | 느림·큼 (보완책 있음) | Java와 같음 | **빠름·작음** | 중간, Native AOT 시 빠름 | **가장 작음** | 빠름·중간 |
| 최고 처리량 | 높음 | Java와 같음 | 높음 (GC는 지연 우선) | 높음 | **가장 높음** | 낮음~중간 |
| 동시성 | 가상 스레드, `j.u.c` | 코루틴 + 가상 스레드 | 고루틴 (언어 내장) | async/await | async + 소유권 검사 | 이벤트 루프 / GIL (3.14+ free-threaded 빌드 선택 가능) |
| 널 안전성 | 없음 (JSpecify·NullAway로 보완) | **타입 시스템에 내장** | 없음 (nil) | nullable 참조 타입 | `Option` 강제 | 없음 |
| 생태계 | Spring, 엔터프라이즈·금융·빅데이터(Kafka, Spark) | Java 생태계 그대로 + Android | 클라우드 인프라(k8s, Docker) | MS·게임(Unity)·윈도우 | 시스템·WASM·성능 핵심부 | 웹 프론트 연계 / ML·데이터 |
| 학습·채용 | 인력 풀 가장 큼 | Java 개발자가 빠르게 전환 | 언어가 작아 빠름 | Java와 유사 | **가장 어려움** | 쉬움 |
| 이럴 때 고른다 | 큰 팀, 오래 갈 업무 시스템, JVM 라이브러리 필요 | JVM은 유지하되 간결함·널 안전성 | CLI, 사이드카, 작은 컨테이너 다수 | MS 스택 조직 | 지연·메모리가 비용의 핵심 | 프로토타입, I/O 위주 BFF, ML 서빙 |

Kotlin과 Java는 같은 JVM 위에서 섞어 쓸 수 있으므로 "둘 중 하나"보다 "모듈별 선택"에 가깝다. Kotlin·Go 학습 순서 비교는 [Go vs Kotlin 코루틴 학습 경로](../../../inquiry/languages/0002-go-vs-kotlin-coroutine-learning-path.md)를 참고한다.

### 3. 주요 선택지

#### 3.1 JDK 배포판과 LTS

| LTS | 출시 | Oracle Premier 지원 종료 | 상태 (2026-11 기준) |
|---|---|---|---|
| 17 | 2021.09 | **2026.09 (종료)** | Extended 2029.09 (Oracle은 이 기간 Extended 지원료를 면제하지만 구독은 필요). 신규 채택 비권장 |
| 21 | 2023.09 | 2028.09 | Oracle JDK 21은 2026년 10월 CPU부터 OTN 라이선스(운영 사용은 유료 구독). 무료로 쓰려면 OpenJDK 배포판 |
| **25** | 2025.09 | 2030.09 | **신규 프로젝트 기본값** |
| 29 | 2027.09 예정 | — | 다음 LTS |

- 기술적으로는 거의 같은 OpenJDK 빌드다. 차이는 **라이선스·패치 기간·상용 지원**이다. Oracle JDK는 NFTC 무료 기간이 "다음 LTS 출시 후 1년"으로 짧으므로, 오래 쓸 운영 환경은 Temurin·Corretto·Zulu·Microsoft Build처럼 무료 장기 패치를 주는 배포판을 고르는 경우가 많다.
- 비LTS는 다음 버전이 나오면(6개월 뒤) 패치가 끊긴다 (26은 27 출시와 함께 종료, 27은 2027.03까지). 새 기능이 꼭 필요하고 6개월마다 올릴 수 있는 팀만 쓴다.

#### 3.2 GC 선택

| GC | 얻는 것 | 포기하는 것 | 고르는 경우 |
|---|---|---|---|
| **G1** | 처리량과 정지 시간의 균형, 목표 정지(`MaxGCPauseMillis` 기본 200ms) | 큰 힙에서 수십~수백 ms 정지 가능 | 기본값. JDK 26까지는 CPU 2개 미만 또는 메모리 1792MB 미만이면 Serial이 기본이었으나, JDK 27부터는 모든 환경에서 G1이 기본 (JEP 523) |
| **ZGC** (세대별) | 정지 **1ms 미만**, 힙 최대 16TB. 세대별 모드는 JDK 17 단일 세대 대비 처리량 약 10% 향상 | G1보다 CPU·메모리를 더 쓴다. JDK 25 출시 시점에는 x64에서 Compact Object Headers와의 조합이 아직 개발 중이었다 — 함께 켜려면 대상 JDK에서 확인 필요 | p99 지연이 SLO인 API, 수십 GB 이상 힙 |
| Shenandoah | ZGC와 비슷한 짧은 정지, 세대별 모드 정식(JDK 25, JEP 521 — 기본은 여전히 단일 세대) | Oracle JDK에는 없음 (Red Hat·Temurin·Corretto 등에 포함) | Red Hat 계열, 중간 크기 힙의 저지연 |
| Parallel | **최대 처리량**, 오버헤드 최소 | 정지가 길다 (힙 크기에 비례) | 배치, 정지가 사용자에게 안 보이는 작업 |
| Serial | 메모리·CPU 오버헤드 최소 | 단일 스레드 GC | 힙 수백 MB 이하의 작은 컨테이너·CLI (명시 지정) |

GC를 바꾸기 전에 할당률부터 줄이는 진단 절차는 [자주 겪는 문제 §2](./04-pitfalls.md#2-메모리-누수와-gc-문제).

#### 3.3 시작 시간: JIT vs AOT

| 방식 | 시작 | 최고 성능 | 대가 | 맞는 곳 |
|---|---|---|---|---|
| 일반 JVM (JIT) | 1~5초 (Spring Boot) | **가장 높음** | 워밍업, 메모리 | 오래 떠 있는 서버 |
| **AOT 캐시** (Leyden, JDK 24+) | JEP 483 기준 최대 42% 단축, JEP 515로 워밍업 19% 추가 단축 | JIT와 같음 | 학습 실행(training run)을 빌드에 추가, 같은 JDK·클래스패스 필요 | **코드 변경 없이 먼저 시도할 것** |
| CRaC | 워밍업된 상태에서 복원, Spring Boot 약 4초 → 수십 ms (Azul·BellSoft 측정) | JIT와 같음 | 리눅스 전용, 지원 JDK 필요, 체크포인트 이미지에 비밀값·열린 연결이 남지 않게 처리해야 함 | 빠른 스케일아웃이 필요한 서버 |
| **GraalVM Native Image** | 수십~수백 ms. 블로그 벤치마크 기준 Spring Boot 약 1.4초 → 0.4초, RSS 수십~수백 MB 감소 | 장기 실행 처리량은 JIT보다 낮을 수 있다 (PGO로 일부 보완) | 빌드 수 분·메모리 수 GB, **닫힌 세계 가정** — 리플렉션·동적 프록시·클래스 로딩에 메타데이터 필요, 일부 라이브러리 미지원 | 서버리스, CLI, 짧게 사는 작업 |

#### 3.4 동시성 모델: 가상 스레드 vs 리액티브

| | 가상 스레드 (Spring MVC + `spring.threads.virtual.enabled=true`) | 리액티브 (WebFlux, Reactor) |
|---|---|---|
| 코드 | 평범한 블로킹 코드, 스택 트레이스·디버거 그대로 | 연산자 체인, 학습 곡선이 높고 디버깅이 어렵다 |
| 확장성 | 블로킹 I/O 위주 서버에서 리액티브와 비슷한 동시성 | 같은 수준 + **배압(backpressure)** 내장 |
| 남는 병목 | DB 커넥션 풀·외부 API 한도 → 세마포어로 직접 제한 ([장애 대응 §7](./05-failure-modes.md#7-의존성-장애에-대한-복원력)) | 같음 |
| 고르는 경우 | **신규 서비스 기본** (JDK 24+) | 스트리밍·배압이 핵심이거나 이미 리액티브 스택인 경우 |

#### 3.5 컨테이너 메모리

- 컨테이너 limit 안에 힙과 비힙(메타스페이스·스레드 스택·다이렉트 버퍼 등)이 함께 들어가야 하므로, 힙은 limit의 일부(보통 70~75%)로 잡는다. 기본값을 그대로 두거나 `-Xmx`를 limit과 같게 두는 실수와 진단은 [자주 겪는 문제 §3](./04-pitfalls.md#3-컨테이너에서의-메모리-설정).
- 비용 관점: 같은 기능의 Go 서비스보다 인스턴스당 메모리가 수 배 큰 경우가 흔하다. 인스턴스 수가 많은 마이크로서비스일수록 이 차이가 클라우드 비용으로 드러난다 → Native Image나 Go를 검토하는 지점.

### 4. 쓰지 말아야 할 때

| 상황 | 이유 | 대안 |
|---|---|---|
| 100ms 안에 끝나는 CLI·스크립트, 호출당 과금 서버리스 | JVM 시작·워밍업 비용이 실행 시간보다 크다 | Go, Python, 또는 Native Image |
| 메모리 수십 MB 이하 임베디드, OS·드라이버 | GC·런타임 자체가 예산을 넘는다 | C, C++, Rust |
| 결정적 지연(μs 단위)이 필수인 시스템 | GC 정지는 줄여도 0이 아니다 (초저지연 Java 트레이딩은 할당을 없애는 특수 코딩 필요) | C++, Rust |
| ML 실험·데이터 분석 | 라이브러리·노트북 생태계가 Python 중심 | Python |
| 2~3명 팀의 짧은 프로토타입 | 빌드·프레임워크 설정 부담 | Node.js, Python, Kotlin |

### 5. 선택 체크리스트

- [ ] 서비스가 **오래 떠 있는가**(수 시간 이상)? 짧게 산다면 Native Image·CRaC를 함께 검토했는가?
- [ ] 인스턴스 수 × 메모리(인스턴스당 수백 MB~수 GB)가 예산에 맞는가?
- [ ] 팀이 Spring 등 JVM 생태계에 익숙한가, 아니면 Kotlin으로 같은 생태계를 더 간결하게 쓸 수 있는가?
- [ ] JDK는 **25 LTS**, 배포판과 패치 지원 기간(무료/상용)을 정했는가? 다음 LTS(29, 2027.09)로 올릴 계획이 있는가?
- [ ] GC는 기본 G1로 시작하고, p99 지연 목표가 있으면 ZGC를 측정 후 결정하는가?
- [ ] 동시성은 가상 스레드로 충분한가, 배압이 필요한 스트리밍인가?
- [ ] 컨테이너 limit과 `MaxRAMPercentage`, CPU limit(최소 1~2코어)을 함께 정했는가?
- [ ] 쓰려는 라이브러리가 대상 JDK·Native Image를 지원하는가?

## 관련 문서

- [Java의 역사](./01-history.md)
- [Java 개요와 기본 사용법](./02-overview.md)
- [Java 개발·운영 시 자주 겪는 문제와 해결 방법](./04-pitfalls.md)
- [Java 애플리케이션 장애 대응과 고가용성](./05-failure-modes.md)
- [Java 락 개요와 기본 사용법](../0002-java-lock/02-overview.md)
- [Java 락 트레이드오프와 선택 기준](../0002-java-lock/03-tradeoffs.md)

## 참고 자료

- [JEP 483: Ahead-of-Time Class Loading & Linking](https://openjdk.org/jeps/483)
- [JEP 515: Ahead-of-Time Method Profiling](https://openjdk.org/jeps/515)
- [JEP 519: Compact Object Headers](https://openjdk.org/jeps/519)
- [Java 27 features (JEP 534 Compact Object Headers by Default 포함) — HappyCoders](https://www.happycoders.eu/java/java-27-features/)
- [JEP 534: Compact Object Headers by Default](https://openjdk.org/jeps/534)
- [Java 25 compact object headers (ZGC 지원 현황) — InfoQ](https://www.infoq.com/news/2025/06/java-25-compact-object-headers)
- [JEP 523: Make G1 the Default Garbage Collector in All Environments](https://openjdk.org/jeps/523)
- [JEP 523 targeted to JDK 27: Make G1 the Default GC in All Environments — Inside Java](https://inside.java/2026/05/26/jep523-target-jdk27/)
- [Oracle Releases Java 27 — Oracle](https://www.oracle.com/news/announcement/oracle-releases-java-27-2026-09-15/)
- [JEP 521: Generational Shenandoah](https://openjdk.org/jeps/521)
- [JEP 439: Generational ZGC](https://openjdk.org/jeps/439)
- [Generational ZGC explainer — Inside Java](https://inside.java/2023/11/28/gen-zgc-explainer/)
- [JEP 401: Value Classes and Objects (Preview)](https://openjdk.org/jeps/401)
- [JEP 401 integrated into JDK 28 — InfoQ](https://infoq.com/news/2026/08/jep401-value-objects-preview)
- [JEP 444: Virtual Threads](https://openjdk.org/jeps/444)
- [Netflix performance case study (virtual threads pinning) — InfoQ](https://www.infoq.com/news/2024/08/netflix-performance-case-study)
- [Virtual Threads after JDK 24 — InfoQ](https://infoq.com/articles/virtual-threads-after-jdk24)
- [Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html)
- [JDK 21 approaches end of permissive license — Oracle Java Blog](https://blogs.oracle.com/java/post/jdk-21-approaches-end-of-permissive-license)
- [Java HotSpot VM Options (ThreadStackSize 기본값) — Oracle](https://www.oracle.com/java/technologies/javase/vmoptions-jsp.html)
- [Garbage-First Garbage Collector Tuning (MaxGCPauseMillis 기본 200ms) — Oracle](https://docs.oracle.com/en/java/javase/25/gctuning/garbage-first-g1-garbage-collector1.html)
- [PEP 779: Criteria for supported status for free-threaded Python](https://peps.python.org/pep-0779/)
- [Reduce Java Application Startup and Warmup Times with CRaC — Azul](https://www.azul.com/?p=62257)
- [Alpaquita containers with CRaC — BellSoft](https://bell-sw.com/blog/bellsoft-releases-alpaquita-containers-with-coordinated-restore-at-checkpoint-support/)
- [GraalVM 24 Native Image internals (startup benchmark) — DEV Community](https://dev.to/johalputt/deep-dive-graalvm-24-native-image-internals-how-it-cuts-java-startup-time-by-70-vs-jvm-mode-25i8)
- [Comparing the efficiency of a Spring Boot project (JVM vs native) — DZone](https://dzone.com/articles/comparing-the-efficiency-of-a-spring-boot-project)
