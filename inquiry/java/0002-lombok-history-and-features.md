---
type: inquiry
created: 2026-11-16
author: agent
model: claude-opus-5-5
---

# Lombok: 역사, 기본 기능, 덜 알려진 유용한 기능

## 쉬운 설명

Java로 클래스를 만들면 getter, setter, 생성자처럼 매번 똑같이 적어야 하는 코드가 많다. Lombok은 클래스에 `@Getter` 같은 **스티커만 붙여 두면 컴파일할 때 그 코드를 대신 적어 주는 도우미**다. 소스 파일에는 안 보이지만 완성된 `.class` 파일에는 다 들어 있다.

---

## 일반 설명

### 1. 동작 원리: 왜 "해킹"이라 불리나

일반적인 **어노테이션 프로세서(JSR 269)** 는 *새 파일을 생성*할 수만 있고 기존 클래스를 수정할 수 없다(MapStruct, Immutables가 이 방식). Lombok은 규칙을 우회한다.

1. javac가 소스를 파싱해 **AST(추상 구문 트리)** 를 만든다.
2. Lombok은 어노테이션 프로세서로 등록돼 호출되지만, 공개 API가 아닌 **javac 내부 API(`com.sun.tools.javac.tree.JCTree` 등)** 로 AST를 직접 바꿔 메서드·필드를 끼워 넣는다.
3. javac는 수정된 AST로 바이트코드를 생성한다.

```
Source.java → [Parse] → AST → [Lombok이 AST 수정] → [Analyze/Generate] → Source.class
```

- Eclipse는 javac를 쓰지 않으므로(ECJ) **별도의 Java agent**로 Eclipse 컴파일러를 패치한다. IntelliJ는 플러그인(2020.3부터 기본 번들)이 IDE 내부 모델에 가상 메서드를 보여 준다.
- 내부 API에 기대기 때문에 **새 JDK가 나올 때마다 깨질 위험**이 있다. JDK 16의 강한 캡슐화(JEP 396, 이후 JEP 403)로 내부 API 접근이 막혔을 때도 Lombok은 우회 방법을 넣어 대응했다. 신규 JDK 출시 직후 "Lombok 업데이트할 때까지 빌드 실패"가 반복되는 이유다.
- **delombok**: Lombok이 생성할 코드를 실제 Java 소스로 풀어 준다. Javadoc 생성, 정적 분석 도구 연동, Lombok 제거 시 사용.

### 2. 역사

| 시기 | 버전 | 사건 |
|---|---|---|
| 2009 | v0.8.x | Reinier Zwitserloot, Roel Spilker가 네덜란드 Delft에서 시작. 첫 기록 버전 v0.8.1(2009-07-26). 같은 해 delombok 등장 |
| 2011 | v0.10 | `val`, `@Delegate` 추가 |
| 2012 | v0.11.x | `@ExtensionMethod`, `@Accessors`(fluent), 실험적 `@Value`·`@Wither` |
| 2013-07 | v0.12.0 | `@Value` 정식 승격, 실험적 `@Builder` 등장 |
| 2013-10 | v1.12.2 | 메이저 버전을 0 → 1로 변경 |
| 2015-01 | v1.16.0 | `@Builder` 정식 승격, `@Singular` 추가 |
| 2015-02 | v1.16.2 | `@UtilityClass` 추가 |
| 2017-03 | v1.16.16 | `@Builder.Default`, JDK 9 컴파일 지원 |
| 2018-05 | v1.16.22 | `var` 정식 승격, `@FieldNameConstants` 추가 |
| 2018-06 | v1.18.0 | 1.18 계열 시작 (이후 계속 1.18.x로 패치 릴리스) |
| 2018-07 | v1.18.2 | 실험적 `@SuperBuilder` (상속 빌더) |
| 2019-09 | v1.18.10 | `@Wither` → `@With`로 정식 승격 |
| 2020-10 | v1.18.16 | `@Jacksonized` (Jackson + 빌더 연동) |
| 2021-04 | v1.18.20 | JDK 16, **record** 지원 |
| 2021-10 | v1.18.22 | JDK 17, `@StandardException`. 소스 레벨 10 이상에서 `val`을 `final var`로 변환 |
| 2023-09 | v1.18.30 | JDK 21 지원 |
| 2024-03 | v1.18.32 | `@Locked` (ReentrantLock 기반 동기화) |
| 2025-03 | v1.18.38 | JSpecify null 어노테이션 지원 |
| 2025-09 | v1.18.40 | JDK 25 지원 |
| 2026-03 | v1.18.44 | `@Jacksonized`가 Jackson 2·3 모두 지원 |
| 2026-04 | v1.18.46 | JDK 26 지원 |
| 2026-09 | v1.18.48 | JDK 27 지원, **`@SuperBuilder` 정식 승격**, Checker Framework `@SideEffectFree` 연동 |

> 흐름 요약: 초창기 실험 기능(`lombok.experimental`)을 검증 후 메인 패키지로 승격하는 방식으로 성장했다. 2018년 이후로는 대규모 신기능보다 **새 JDK 대응과 생태계 연동(Jackson, null 어노테이션, record)** 이 중심이다.

### 3. 일반적으로 쓰는 기능

| 어노테이션 | 생성하는 것 |
|---|---|
| `@Getter` / `@Setter` | 필드 접근자. 클래스 또는 필드 단위, `AccessLevel`로 접근 제어 |
| `@NoArgsConstructor` | 기본 생성자 (JPA 엔티티 필수, `access = PROTECTED` 권장) |
| `@RequiredArgsConstructor` | `final` 및 `@NonNull` 필드만 받는 생성자 → **Spring 생성자 주입**의 표준 패턴 |
| `@AllArgsConstructor` | 모든 필드를 받는 생성자 |
| `@ToString` | `toString()` |
| `@EqualsAndHashCode` | `equals()` / `hashCode()` |
| `@Data` | `@Getter` + `@Setter` + `@RequiredArgsConstructor` + `@ToString` + `@EqualsAndHashCode` |
| `@Value` | 불변 클래스: 모든 필드 `private final`, 클래스 `final`, getter·전체 생성자·equals/hashCode/toString |
| `@Builder` | 빌더 패턴 |
| `@Slf4j` / `@Log4j2` 등 | `private static final Logger log = ...` |
| `@NonNull` | 메서드/생성자 시작에 null 체크 삽입 (`NullPointerException`) |
| `val` / `var` | 지역 변수 타입 추론 (Java 10+는 표준 `var` 사용 권장) |

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {
    private final OrderRepository orderRepository;   // 생성자 주입
    private final PaymentClient paymentClient;
}
```

### 4. 잘 안 쓰지만 유용한 기능

#### 4.1 빌더 심화

**`@Builder.Default`**: 빌더를 쓸 때 필드 초기값이 무시되는 함정을 막는다.

```java
@Builder
public class Request {
    @Builder.Default private int retry = 3;              // 없으면 빌더 사용 시 0
    @Builder.Default private List<String> tags = new ArrayList<>();
}
```

**`@Singular`**: 컬렉션 필드에 원소 하나씩 추가하는 메서드와 불변 컬렉션 생성.

```java
@Builder
public class Mail {
    @Singular private List<String> recipients;
}
Mail.builder().recipient("a@x.com").recipient("b@x.com").build(); // 불변 List
```

**`@Builder(toBuilder = true)`**: 기존 객체를 복사해 일부만 바꾼 새 객체 생성.

```java
Request retried = original.toBuilder().retry(5).build();
```

**`@SuperBuilder`**: 상속 계층에서 부모 필드까지 포함한 빌더. 일반 `@Builder`는 상속을 지원하지 않는다. 2026-09 v1.18.48에서 `lombok.SuperBuilder`로 정식 승격됐다.

```java
@SuperBuilder class Animal { String name; }
@SuperBuilder class Dog extends Animal { String breed; }
Dog.builder().name("바둑이").breed("진돗개").build();
```

**`@Jacksonized`**: `@Builder`/`@SuperBuilder` 클래스를 Jackson이 빌더로 역직렬화하도록 `@JsonDeserialize(builder=...)`와 `@JsonPOJOBuilder` 설정을 자동 생성. 불변 DTO에 setter 없이 JSON 바인딩.

```java
@Value @Builder @Jacksonized
public class UserDto { String name; int age; }
```

#### 4.2 불변 객체 다루기

**`@With`**: 필드 하나만 바꾼 **새 인스턴스**를 반환하는 `withXxx()` 생성. `@Value`와 조합.

```java
@Value @With
public class Point { int x; int y; }
Point p2 = p1.withX(10);   // p1은 그대로
```

**`@FieldDefaults`**: 필드 기본 접근 제어자/`final`을 일괄 지정.

```java
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class Config { String host; int port; }   // private final로 처리
```

#### 4.3 클래스 형태

**`@UtilityClass`**: 클래스 `final`, private 생성자(호출 시 예외), 모든 멤버 `static`으로 변환.

```java
@UtilityClass
public class StringUtils {
    public String reverse(String s) { ... }   // 자동으로 static
}
```

**`@StandardException`**: 예외 클래스의 생성자 4종(`()`, `(String)`, `(Throwable)`, `(String, Throwable)`)을 생성.

```java
@StandardException
public class OrderNotFoundException extends RuntimeException {}
```

**`@Accessors`**: 접근자 스타일 변경.
- `fluent = true`: `getName()` 대신 `name()`, `setName(x)` 대신 `name(x)`
- `chain = true`: setter가 `this`를 반환해 `obj.setA(1).setB(2)` 가능
- `prefix = "m"`: `mName` 필드에서 `getName()` 생성

#### 4.4 동시성·지연 로딩

**`@Getter(lazy = true)`**: 비싼 계산을 첫 호출 때 한 번만, 스레드 안전하게(더블 체크 락킹) 수행.

```java
@Getter(lazy = true)
private final double[] table = computeExpensiveTable();
```

**`@Synchronized`**: `synchronized` 메서드와 달리 `this`가 아닌 **private 락 객체**로 동기화해 외부 코드가 같은 락을 잡는 문제를 막는다.

**`@Locked`, `@Locked.Read`, `@Locked.Write`**: `ReentrantLock`/`ReentrantReadWriteLock`으로 메서드를 감싼다. 가상 스레드 환경에서 `synchronized`가 캐리어 스레드를 고정(pinning)하던 문제(JDK 24의 JEP 491로 해결 전) 때문에 등장했다. 읽기가 많은 캐시에 읽기/쓰기 락 분리가 유용하다.

```java
@Locked.Read  public V get(K k)       { return map.get(k); }
@Locked.Write public void put(K k, V v) { map.put(k, v); }
```

#### 4.5 리소스·예외

**`@Cleanup`**: 지역 변수 스코프가 끝나면 `close()` 호출(try-finally 생성). 대부분 try-with-resources로 대체 가능하지만, `close`가 아닌 메서드도 지정 가능(`@Cleanup("release")`).

**`@SneakyThrows`**: checked 예외를 선언 없이 던진다(컴파일러만 속이고 실제 예외는 그대로). 람다 안이나 "절대 발생하지 않는" 예외(`UnsupportedEncodingException` for UTF-8)에 한정해 사용.

#### 4.6 메타프로그래밍류

**`@FieldNameConstants`**: 필드 이름 문자열 상수 생성. Criteria API, MongoDB 쿼리, 정렬 키에 문자열 하드코딩 대신 사용.

```java
@FieldNameConstants
public class User { String email; }
// User.Fields.email == "email"
```

**`@Delegate`**: 필드의 메서드를 위임 메서드로 노출(상속 대신 조합). 실험적 기능이고, v1.18.48 changelog에서는 jar에서 어노테이션을 제거하되 처리는 유지한다고 밝혀 사실상 퇴출 수순이다. 신규 사용 비권장.

**`@ExtensionMethod`**: 정적 메서드를 인스턴스 메서드처럼 호출(Kotlin 확장 함수와 비슷). 실험적.

```java
@ExtensionMethod(StringUtils.class)
class X { void f(String s) { s.reverse(); } }   // StringUtils.reverse(s)
```

**`onX` (`onMethod`, `onConstructor`, `onParam`)**: 생성되는 메서드/생성자/파라미터에 어노테이션을 붙인다.

```java
@RequiredArgsConstructor(onConstructor_ = @Autowired)
@Getter(onMethod_ = @JsonProperty("user_name"))
```

#### 4.7 `@EqualsAndHashCode` / `@ToString` 세밀 제어

```java
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString
public class Member {
    @EqualsAndHashCode.Include private Long id;
    @ToString.Exclude private String password;
    @ToString.Exclude private List<Order> orders;   // 지연 로딩·순환 참조 방지
}
```

`callSuper = true`는 상속 시 부모 필드까지 포함할지 결정한다. 상속 구조에서 기본값(`false`)이면 경고가 뜨는 이유다.

#### 4.8 `lombok.config`: 가장 과소평가된 기능

프로젝트 루트(또는 패키지 디렉터리)에 두면 하위 전체에 적용되는 설정 파일.

```properties
config.stopBubbling = true                       # 상위 디렉터리 설정 탐색 중단
lombok.addLombokGeneratedAnnotation = true       # @lombok.Generated 부착 → JaCoCo 커버리지에서 제외
lombok.anyConstructor.addConstructorProperties = true   # @ConstructorProperties (Jackson 역직렬화)
lombok.copyableAnnotations += org.springframework.beans.factory.annotation.Qualifier
                                                 # 필드의 @Qualifier를 생성자 파라미터로 복사
lombok.log.fieldName = LOG                       # 로거 필드명 변경
lombok.nonNull.exceptionType = IllegalArgumentException
lombok.accessors.chain = true
lombok.toString.includeFieldNames = true
lombok.equalsAndHashCode.callSuper = call
lombok.addNullAnnotations = jspecify             # 생성 코드에 null 어노테이션 부착
lombok.data.flagUsage = error                    # 팀 규칙: @Data 사용 금지
lombok.setter.flagUsage = warning
```

- `copyableAnnotations`는 `@RequiredArgsConstructor` + `@Qualifier` 조합이 동작하지 않는 흔한 문제를 해결한다.
- `flagUsage`로 **팀 컨벤션을 컴파일 단계에서 강제**할 수 있다(`@Data`, `@SneakyThrows`, `val`, 실험 기능 금지 등).

### 5. 주의점

- **JPA 엔티티에 `@Data`·`@EqualsAndHashCode`·`@ToString` 금지**: 지연 로딩 프록시 초기화, 양방향 연관관계 순환 참조로 `StackOverflowError`, 영속화 전후 `id` 변경으로 `HashSet`이 깨진다. `@Getter` + `@NoArgsConstructor(access = PROTECTED)`가 일반적.
- **`@Builder` + `@NoArgsConstructor` 동시 사용 시 컴파일 에러**: `@Builder`가 전체 생성자를 필요로 하므로 `@AllArgsConstructor`도 붙여야 한다.
- **`@Setter` 남용**: 불변성이 깨지고 변경 지점 추적이 어려워진다.
- **Java record와의 관계**: 단순 불변 데이터는 `record`가 `@Value`를 대체한다. 다만 빌더(`@Builder`는 record에도 사용 가능), `@With`, 상속, JPA 엔티티(record 불가) 영역은 여전히 Lombok이 쓰인다.
- **JDK 업그레이드 시 Lombok 먼저 올리기**: 새 JDK 지원은 보통 출시 즈음에 나온다(JDK 25 → v1.18.40, JDK 26 → v1.18.46). Maven에서는 `maven-compiler-plugin`의 `annotationProcessorPaths`에 Lombok을 명시해야 하는 경우가 많다(JDK 23부터 클래스패스의 어노테이션 프로세서 자동 실행이 기본 비활성화).

## 참고 자료

- [Project Lombok Changelog](https://projectlombok.org/changelog)
- [Project Lombok Credits](https://projectlombok.org/credits)
- [Lombok "7 lessons" 발표](https://projectlombok.org/presentations/7lessons)
- [Lombok JDK 25 지원 이슈 #3859](https://github.com/projectlombok/lombok/issues/3859)
- [JDK 24/25에서 @Data 컴파일 실패 이슈 #3967](https://github.com/projectlombok/lombok/issues/3967)
- [Spring Boot – Lombok 1.18.42 관련 이슈 #47400](https://github.com/spring-projects/spring-boot/issues/47400)
- [Debian: Java 25 지원을 위한 Lombok 업데이트](https://salsa.debian.org/java-team/lombok/-/merge_requests/4)
- [Lombok 2.0 – leaving the past behind (Google Groups)](https://groups.google.com/g/project-lombok/c/9Hi9k88u5q0)
- [OpenJDK coin-dev 메일링 (2009)](https://mail.openjdk.org/pipermail/coin-dev/2009-July/002131.html)
