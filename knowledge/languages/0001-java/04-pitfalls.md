---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# Java 개발·운영 시 자주 겪는 문제와 해결 방법

## 쉬운 설명

Java는 청소부(GC)가 있어 편하지만, ① 청소부가 못 치우게 물건을 계속 붙잡아 두면(누수) 집이 꽉 차고, ② 청소하느라 잠깐씩 모두가 멈추고, ③ 통역사(JVM)가 처음엔 서툴러서 출발이 느리다. 여기에 "없는 걸 꺼내려다(NPE)" 넘어지는 실수가 가장 흔하다.

## 일반 설명

> 락·동시성 문제는 [Java 락: 자주 겪는 문제와 해결](../0002-java-lock/04-pitfalls.md), 프로세스가 죽거나 멈추는 장애와 다중 인스턴스 운영은 [장애 대응과 고가용성](./05-failures.md)에서 다룬다.

### 1. 코드 수준의 흔한 버그

| 문제 | 예 | 해결 |
|---|---|---|
| **NullPointerException** | `user.getAddress().getCity()` | 경계에서 검증, 반환에 `Optional`, JSpecify `@Nullable`/`@NonNull` + NullAway 정적 분석. JDK 14+ 헬프풀 NPE 메시지로 어느 참조가 null인지 확인 |
| `equals`/`hashCode` 불일치 | `HashSet`에 넣은 객체를 못 찾음 | 둘을 함께 재정의, 가능하면 **record** 사용. JPA 엔티티는 식별자 기반으로 신중히 |
| `==`로 문자열·박싱 비교 | `Integer a=1000, b=1000; a==b` → false | `equals()`, `Objects.equals()` |
| `ConcurrentModificationException` | for-each 중 `list.remove()` | `removeIf()`, `Iterator.remove()`, 새 리스트로 수집 |
| 정수 오버플로·실수 오차 | 금액 `double` 계산 | `BigDecimal`, `Math.addExact()` |
| 예외 삼키기 | `catch (Exception e) {}` | 최소한 로그 + 재던지기, 체크 예외는 의미 있는 런타임 예외로 감싸기(원인 포함) |
| 자원 누수 | 스트림·커넥션 close 누락 | **try-with-resources** |
| 날짜·타임존 | `Date`, `SimpleDateFormat`(스레드 불안전) | `java.time` (`Instant`, `ZonedDateTime`), 저장은 UTC |
| 문자셋 | 플랫폼 기본 인코딩 의존 | JDK 18+ 기본 UTF-8(JEP 400), 그래도 명시적 `StandardCharsets.UTF_8` |

### 2. 메모리 누수와 GC 문제

GC 언어에서 누수는 "**도달 가능하지만 다시 쓰지 않는 객체**"다.

| 흔한 원인 | 해결 |
|---|---|
| `static` 컬렉션·캐시에 계속 추가 | 크기 제한·만료가 있는 캐시(Caffeine) |
| 스레드 풀에서 `ThreadLocal` 미정리 | `finally { tl.remove(); }`, 가상 스레드에선 Scoped Values 고려 |
| 리스너·콜백 등록 후 해제 안 함 | 해제 경로 보장, 약한 참조 |
| 클래스로더 누수(재배포 반복) | Metaspace 증가 → 재배포 대신 프로세스 재시작 |
| 큰 결과 한 번에 로딩 | JPA 페이징·스트리밍, `fetchSize` |

**GC 정지가 길 때**
1. GC 로그로 사실 확인: `-Xlog:gc*:file=gc.log:time,uptime:filecount=5,filesize=20m`
2. 할당률이 높은 코드부터 줄인다 (JFR `jdk.ObjectAllocationSample`).
3. 지연이 중요하면 **ZGC**(`-XX:+UseZGC`)로 교체를 검토.
4. 힙을 무작정 키우는 건 마지막 수단.

### 3. 컨테이너에서의 메모리 설정

| 문제 | 원인 | 해결 |
|---|---|---|
| 파드가 **OOMKilled(137)** 로 죽는데 Java OOM 로그가 없음 | 힙 외 메모리(메타스페이스, 스레드 스택, 다이렉트 버퍼, 코드 캐시, GC 자료구조)까지 합쳐 컨테이너 limit 초과 | `-XX:MaxRAMPercentage=70~75`로 힙을 limit의 일부로, 나머지는 비힙 몫. `-Xmx`를 limit과 같게 두지 말 것 |
| CPU limit이 작아 GC·JIT 스레드가 굶음 | JVM이 CPU 수로 스레드 수 결정 | CPU limit 최소 1~2 코어, 필요하면 `-XX:ActiveProcessorCount` |
| 네이티브 메모리 추적 필요 | — | `-XX:NativeMemoryTracking=summary` + `jcmd <pid> VM.native_memory summary` |

### 4. 느린 시작과 워밍업

| 해법 | 효과 | 비용 |
|---|---|---|
| CDS / **AOT 캐시**(JDK 24+ `-XX:AOTCache`, 26에서 모든 GC 지원) | 클래스 로딩·링킹 결과 재사용, 시작 시간 단축 | 학습 실행(training run) 필요 |
| Spring Boot 지연 초기화, 불필요 자동 설정 제거 | 시작 시간 단축 | 첫 요청 지연 |
| **GraalVM Native Image** | 수십 ms 시작, 적은 메모리 | 빌드 시간·리플렉션 설정, 최고 처리량은 JIT보다 낮을 수 있음 |
| CRaC | 워밍업된 상태를 체크포인트로 저장 후 복원 | 리눅스 전용, 지원 JDK 필요 |
| readiness를 워밍업 후 열기 | 첫 사용자 요청이 느린 코드 경로를 밟지 않음 | 배포 시간 증가 |

### 5. 의존성과 업그레이드

| 문제 | 해결 |
|---|---|
| 같은 라이브러리 여러 버전(jar hell) → `NoSuchMethodError` | `gradle dependencies` / `mvn dependency:tree`, BOM(Spring Boot BOM 등)으로 버전 정렬 |
| `javax.*` → `jakarta.*` (Spring Boot 3+) | OpenRewrite 레시피로 일괄 변환 |
| JDK 16/17+ 강한 캡슐화로 내부 API 접근 실패 | 라이브러리 업데이트, 최후엔 `--add-opens` |
| SecurityManager 제거(JDK 24에서 영구 비활성) | 의존 라이브러리 확인 |
| JDK 26+ final 필드 리플렉션 변경 경고 | 직렬화·DI 라이브러리 최신 버전 |
| 업그레이드 경로 | LTS 간 이동(17 → 21 → 25), OpenRewrite `UpgradeToJava25` 레시피, CI에서 새 JDK로 미리 빌드 |

### 6. 성능 문제 진단 도구

| 도구 | 용도 |
|---|---|
| `jcmd <pid> Thread.print` | 스레드 덤프 (`jstack` 대체) |
| `jcmd <pid> GC.heap_info`, `GC.heap_dump` | 힙 상태, 힙 덤프 |
| **JFR** (`-XX:StartFlightRecording`) + JDK Mission Control | 상시 켜 둘 수 있는 저오버헤드 프로파일링·이벤트 기록 |
| **async-profiler** | CPU·할당·락 플레임 그래프 |
| Eclipse MAT | 힙 덤프에서 누수 원인(dominator tree) 분석 |
| VisualVM, Arthas | 실시간 관찰, 운영 중 메서드 추적 |

### 7. 로깅·관측 함정

- 문자열 연결 로그 `log.debug("x=" + heavy())` → 레벨이 꺼져도 계산됨. `log.debug("x={}", value)` 또는 람다 공급자.
- 동기 파일 로깅이 병목 → 비동기 appender, 로그 양 줄이기.
- 스레드 풀·가상 스레드 사이에서 MDC(trace id) 유실 → Micrometer Context Propagation, OpenTelemetry agent.

## 관련 문서

- [Java의 역사](./01-history.md)
- [Java 개요와 기본 사용법](./02-overview.md)
- [Java 애플리케이션 장애 대응과 고가용성](./05-failures.md)
- [Java 락: 자주 겪는 문제와 해결](../0002-java-lock/04-pitfalls.md)

## 참고 자료

- [JEP 400: UTF-8 by Default](https://openjdk.org/jeps/400)
- [JEP 483: Ahead-of-Time Class Loading & Linking](https://openjdk.org/jeps/483)
- [JEP 486: Permanently Disable the Security Manager](https://openjdk.org/jeps/486)
- [JEP 500: Prepare to Make Final Mean Final](https://openjdk.org/jeps/500)
- [Java 26 features — HappyCoders](https://www.happycoders.eu/java/java-26-features/)
- [JDK Flight Recorder — Oracle Docs](https://docs.oracle.com/en/java/javase/25/jfapi/)
- [async-profiler](https://github.com/async-profiler/async-profiler)
- [OpenRewrite — Migrate to Java 25](https://docs.openrewrite.org/recipes/java/migrate/upgradetojava25)
