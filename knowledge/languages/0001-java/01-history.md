---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# Java의 역사

## 쉬운 설명

옛날엔 프로그램을 컴퓨터 종류마다 따로 만들어야 했다. Java는 **어느 나라에서나 통하는 통역사(JVM)** 를 각 컴퓨터에 두고, 프로그램은 통역사가 알아듣는 공용어(바이트코드)로 한 번만 쓰게 했다. 거기에 **청소부(GC)** 가 다 쓴 메모리를 알아서 치워 줘서, 사람들이 실수로 집을 어지럽혀 망가뜨리는 일이 크게 줄었다.

## 일반 설명

### 1. 등장 배경 (1991~1996)

- 1991년 Sun Microsystems의 **James Gosling** 팀이 가전제품용 언어를 만드는 **Green Project**를 시작했다. 처음 이름은 **Oak**.
- 풀려던 문제:
  - **이식성**: 가전·기기마다 CPU가 달라 C/C++ 프로그램을 매번 다시 컴파일해야 했다 → **바이트코드 + JVM**으로 "Write Once, Run Anywhere"
  - **안전성**: C/C++의 포인터 연산, 수동 메모리 해제로 인한 크래시·보안 취약점 → **GC, 배열 경계 검사, 포인터 없음**
  - **네트워크 시대**: 인터넷으로 내려받은 코드를 안전하게 실행 → 바이트코드 검증, 샌드박스(애플릿)
- 가전 시장은 실패했지만 웹이 폭발하면서 1995년 **Java**로 이름을 바꿔 공개, 1996년 JDK 1.0 출시. 브라우저 안에서 도는 **애플릿**으로 유명해졌다.

### 2. 주요 변천

| 버전 | 연도 | 핵심 변화 | 해결하려던 문제 |
|---|---|---|---|
| 1.1 | 1997 | 내부 클래스, JDBC, RMI, 리플렉션 | DB 접근, 분산 객체 |
| 1.2 (J2SE) | 1998 | **Collections Framework**, Swing, JIT | 표준 자료구조, 성능 |
| 1.3 | 2000 | **HotSpot JVM** 기본 | "Java는 느리다" → 적응형 JIT |
| 1.4 | 2002 | NIO, 정규식, `assert`, 로깅 | 논블로킹 I/O |
| **5** | 2004 | **제네릭**, 어노테이션, enum, 오토박싱, **`java.util.concurrent`**, 새 메모리 모델(JSR-133) | 타입 안전성, 동시성 |
| 6 | 2006 | 성능 개선, 스크립팅 API | — |
| — | 2006~2007 | **OpenJDK**로 GPL 오픈소스화 | — |
| — | 2010 | **Oracle의 Sun 인수** | — |
| 7 | 2011 | try-with-resources, `<>`, NIO.2, Fork/Join, `invokedynamic` | 자원 누수, JVM 위 다른 언어 |
| **8** | 2014 | **람다, Stream, Optional, `java.time`**, `CompletableFuture` | 함수형 스타일, 날짜 API 지옥 |
| 9 | 2017 | **모듈 시스템(JPMS)**, JShell | 거대한 JDK 쪼개기, 캡슐화 |
| — | 2017~2020 | Java EE → Eclipse **Jakarta EE**, `javax.*` → `jakarta.*` | 엔터프라이즈 표준의 벤더 중립화 |
| 10 | 2018.03 | `var`, **6개월 릴리스 주기** 시작 | 느린 릴리스(8→9가 3년) |
| **11 LTS** | 2018.09 | HTTP Client, 단일 파일 실행. **Oracle JDK 상용 라이선스 변경** → Temurin·Corretto 등 무료 OpenJDK 배포판 확산 | — |
| 14~16 | 2020~2021 | switch 식, records, 텍스트 블록, `instanceof` 패턴 | 보일러플레이트 |
| **17 LTS** | 2021 | sealed 클래스, 강한 캡슐화(내부 API 접근 차단) | 도메인 모델링 |
| **21 LTS** | 2023 | **가상 스레드(Loom)**, switch 패턴 매칭, record 패턴, Sequenced Collections, 세대별 ZGC | 스레드당 요청 모델의 확장성 |
| 22~24 | 2024~2025 | FFM API(JNI 대체) 정식, `synchronized` 가상 스레드 고정 해소(JEP 491), AOT 클래스 캐시(Leyden 첫 결과) | 네이티브 연동, 시작 시간 |
| **25 LTS** | 2025.09 | Scoped Values 정식, `void main()` 간결한 소스 파일, 유연한 생성자 본문, **Compact Object Headers**, 32비트 x86 제거 | 입문 장벽, 메모리 사용량 |
| 26 | 2026.03 | HTTP/3 클라이언트, Applet API 제거, final 필드 변경 경고, 모든 GC에서 AOT 객체 캐시 | — |
| 27 | 2026.09 | TLS 1.3 포스트 양자 하이브리드 키 교환, PEM 인코딩, 모든 환경에서 G1 기본(JEP 523), Compact Object Headers 기본(JEP 534), Structured Concurrency 7차 프리뷰 | 양자 내성 암호, 메모리 사용량 |

### 3. 큰 흐름

| 시기 | 성격 |
|---|---|
| 1995~2004 | 웹·엔터프라이즈 언어로 성장 (애플릿 → 서버, J2EE) |
| 2004~2014 | 언어 기능 정체기를 5와 8이 돌파 (제네릭, 람다). 그 사이 Scala·Kotlin 등 JVM 언어 등장 |
| 2017~ | 6개월 주기 + 프리뷰 기능으로 **빠르고 점진적인 진화** |
| 2021~ | 대형 프로젝트들이 결실: **Loom**(가상 스레드), **Amber**(문법 개선), **Panama**(네이티브 연동), **Leyden**(시작 시간), **Valhalla**(값 타입, 진행 중) |

### 4. 현재 상태 (2026년 11월)

- **LTS**: 17, 21, **25**(최신). 다음 LTS는 29(2027년 9월 예정). 비LTS 최신은 27. Valhalla 값 클래스(JEP 401)는 JDK 28(2027년 3월 예정)에 프리뷰로 통합됐다.
- **배포판**: Oracle JDK(17부터 NFTC로 운영 무료지만 다음 LTS 출시 후 1년까지만 — Oracle JDK 21은 2026년 10월 CPU부터 OTN 유료 라이선스), Eclipse **Temurin**, Amazon **Corretto**, Azul Zulu, Microsoft Build of OpenJDK, Red Hat, **GraalVM**(네이티브 이미지). 버전별 지원 기간과 배포판 고르는 기준은 [트레이드오프 §3.1](./03-tradeoffs.md#31-jdk-배포판과-lts).
- 실무는 Spring Boot 3.x/4.x(최소 Java 17) 중심으로 **17 → 21 → 25** 이동 중. 8·11은 레거시.
- Kotlin이 Android와 서버 일부를 가져갔지만, JVM 생태계와 대규모 백엔드에서 Java는 여전히 주류다.

## 관련 문서

- [Java 개요와 기본 사용법](./02-overview.md)
- [Java 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [Java 개발·운영 시 자주 겪는 문제와 해결 방법](./04-pitfalls.md)
- [Java 애플리케이션 장애 대응과 고가용성](./05-failures.md)
- [Java 락의 역사](../0002-java-lock/01-history.md)

## 참고 자료

- [Java (programming language) — Wikipedia](https://en.wikipedia.org/wiki/Java_(programming_language))
- [Java version history — Wikipedia](https://en.wikipedia.org/wiki/Java_version_history)
- [Java 25 released — InfoQ](https://www.infoq.com/news/2025/09/java25-released)
- [A Java Champion's guide to JDK 25 features — Azul](https://www.azul.com/blog/a-java-champions-guide-to-jdk-25-features/)
- [Java 25 puts 32-bit x86 out to pasture — The Register](https://www.theregister.com/2025/08/12/java_25_at_release_candidate/)
- [Oracle Releases Java 26 — Oracle](https://www.oracle.com/uk/news/announcement/oracle-releases-java-26-2026-03-17/)
- [Java 26 released — InfoQ](https://infoq.com/news/2026/03/java26-released)
- [Java 26 features — HappyCoders](https://www.happycoders.eu/java/java-26-features/)
- [Oracle Releases Java 27 — Oracle](https://www.oracle.com/news/announcement/oracle-releases-java-27-and-strengthens-post-quantum-cryptography-support-2026-09-15/)
- [Java 27 so far — InfoQ](https://infoq.com/news/2026/08/java-27-so-far)
- [JDK 21 approaches end of permissive license — Oracle Java Blog](https://blogs.oracle.com/java/post/jdk-21-approaches-end-of-permissive-license)
- [JEP 401: Value Objects (Preview) integrated into JDK 28 — InfoQ](https://infoq.com/news/2026/08/jep401-value-objects-preview)
