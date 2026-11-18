# Java 개요와 기본 사용법

## 쉬운 설명

Java로 쓴 프로그램은 **공용어(바이트코드)로 쓴 편지**다. 어느 컴퓨터든 **통역사(JVM)** 만 있으면 읽어서 실행한다. 통역사는 자주 읽는 문장은 외워서(JIT) 점점 빨라지고, 다 쓴 종이는 청소부(GC)가 치운다.

## 일반 설명

### 1. Java가 해결하는 문제

| 문제 | Java의 해법 |
|---|---|
| OS·CPU마다 다시 빌드 | **바이트코드 + JVM** — 같은 `.jar`가 리눅스·윈도우·맥, x86·ARM에서 실행 |
| 메모리 해제 실수(누수, 이중 해제, 댕글링 포인터) | **GC** 자동 메모리 관리, 포인터 연산 없음 |
| 대규모 팀 개발에서 런타임 타입 오류 | **정적 타입**, 컴파일 타임 검사, 강력한 IDE 리팩터링 |
| 인터프리터 언어의 느린 실행 | **JIT 컴파일**(실행 중 자주 쓰는 코드를 기계어로) |
| 서버 동시 처리 | 표준 스레드·`java.util.concurrent`, **가상 스레드** |
| 바퀴 재발명 | Maven Central의 방대한 라이브러리, Spring 등 프레임워크 |

### 2. 아키텍처 핵심

```
 .java ──javac──▶ .class (바이트코드) ──▶ JVM
                                         ├─ Class Loader (로딩·링킹·초기화)
                                         ├─ 실행 엔진: 인터프리터 → C1 JIT → C2 JIT (계층형 컴파일)
                                         ├─ GC
                                         └─ 런타임 데이터 영역
                                              ├─ Heap (객체, 모든 스레드 공유)
                                              ├─ Metaspace (클래스 메타데이터, 네이티브 메모리)
                                              ├─ 스레드별 Stack (프레임, 지역 변수)
                                              └─ Code Cache (JIT 결과)
```

- **JDK** = 컴파일러·도구(`javac`, `jcmd`, `jfr`…) + 런타임. 9 이후 별도 JRE 배포는 사라졌고 `jlink`로 필요한 모듈만 담은 런타임을 만든다.
- **JIT 워밍업**: 시작 직후엔 인터프리터로 느리다가 뜨거운 코드가 컴파일되며 빨라진다. 그래서 시작 시간·초기 지연이 약점 → CDS/AOT 캐시, GraalVM Native Image, CRaC로 보완.

**GC 선택**

| GC | 특징 | 용도 |
|---|---|---|
| **G1** (기본) | 리전 기반, 목표 정지 시간(`MaxGCPauseMillis`) | 대부분의 서버 |
| **ZGC** (세대별) | 정지 시간 1ms 미만, 큰 힙 | 지연 민감, 수십 GB~TB 힙 |
| Shenandoah | 동시 압축, 짧은 정지 | ZGC와 유사 (Red Hat 계열) |
| Parallel | 처리량 최우선, 정지 길 수 있음 | 배치 |
| Serial | 단일 스레드 | 아주 작은 힙·컨테이너 |

### 3. 설치와 첫 실행

```bash
# SDKMAN으로 설치·전환
sdk install java 25-tem
sdk use java 25-tem
java -version
```

```java
// Hello.java — JDK 25: 클래스 선언 없이 바로 실행 (JEP 512)
void main() {
    IO.println("Hello, Java");
}
```

```bash
java Hello.java        # 컴파일 없이 소스 직접 실행
```

### 4. 빌드 도구

| 도구 | 설정 | 특징 |
|---|---|---|
| **Gradle** | `build.gradle.kts` (Kotlin DSL) | 빠른 증분 빌드, 유연. Spring Initializr 기본 선택지 |
| **Maven** | `pom.xml` | 관례 중심, 단순·안정 |

```kotlin
// build.gradle.kts
plugins { java }
java { toolchain { languageVersion = JavaLanguageVersion.of(25) } }
repositories { mavenCentral() }
dependencies {
    testImplementation("org.junit.jupiter:junit-jupiter:5.12.2")
}
```

### 5. 현대 Java 문법 한눈에

```java
// record: 불변 데이터 클래스 (equals/hashCode/toString 자동)
record Money(BigDecimal amount, String currency) {}

// sealed + switch 패턴 매칭: 빠진 경우를 컴파일러가 잡아 줌
sealed interface Payment permits Card, Transfer {}
record Card(String number) implements Payment {}
record Transfer(String bank) implements Payment {}

String describe(Payment p) {
    return switch (p) {
        case Card c     -> "card " + c.number();
        case Transfer t -> "transfer via " + t.bank();
    };
}

// var, 텍스트 블록
var sql = """
    SELECT id, name
    FROM users
    WHERE status = 'ACTIVE'
    """;

// Stream
List<String> names = users.stream()
    .filter(User::active)
    .map(User::name)
    .sorted()
    .toList();

// 가상 스레드: 요청마다 스레드 하나, 수십만 개도 가능
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<String>> results = urls.stream()
        .map(url -> executor.submit(() -> httpGet(url)))
        .toList();
}
```

동시성·락은 [Java 락 개요와 기본 사용법](./lock/java-lock-overview-and-basic-usage.md)에서 따로 다룬다.

### 6. 주요 생태계

| 분야 | 대표 |
|---|---|
| 웹·백엔드 | Spring Boot, Quarkus, Micronaut, Helidon |
| 데이터 접근 | JDBC, JPA/Hibernate, MyBatis, jOOQ |
| 테스트 | JUnit 5, AssertJ, Mockito, Testcontainers |
| 빌드 | Gradle, Maven |
| 관측 | Micrometer, OpenTelemetry Java agent, JFR |
| 코드 생성·보조 | Lombok, MapStruct ([Lombok 정리](./lombok-history-and-features.md)) |

### 7. 언제 다른 걸 고려하나

| 상황 | 대안 |
|---|---|
| 아주 작은 CLI·스크립트, 즉시 시작 필요 | Go, Python, 또는 GraalVM Native Image |
| 메모리 극소·OS/임베디드 저수준 | C, C++, Rust |
| 데이터 분석·ML 실험 | Python |
| JVM은 좋지만 간결한 문법·널 안전성 | Kotlin |

## 관련 문서

- [Java의 역사](./history.md)
- [Java 개발·운영 시 자주 겪는 문제와 해결 방법](./java-common-problems-and-solutions.md)
- [Java 애플리케이션 장애 대응과 고가용성](./java-failure-and-high-availability.md)
- [Java 락 개요와 기본 사용법](./lock/java-lock-overview-and-basic-usage.md)

## 참고 자료

- [JEP 512: Compact Source Files and Instance Main Methods](https://openjdk.org/jeps/512)
- [JEP 444: Virtual Threads](https://openjdk.org/jeps/444)
- [Java 25 LTS Overview — madplay](https://madplay.github.io/en/what-is-new-java-25)
- [What's New in Java 25 (LTS) — Keyhole Software](https://keyholesoftware.com/java-25-whats-new/)
- [HotSpot Virtual Machine Garbage Collection Tuning Guide — Oracle](https://docs.oracle.com/en/java/javase/25/gctuning/)
- [Gradle — Java toolchains](https://docs.gradle.org/current/userguide/toolchains.html)
