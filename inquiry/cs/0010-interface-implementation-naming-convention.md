# 인터페이스의 유일한 구현체 이름 짓는 컨벤션 (Simple, Default, Impl 등)

## 쉬운 설명

장난감 설계도(인터페이스)는 하나인데 실제로 만든 장난감(구현체)도 딱 하나뿐일 때, "그냥 진짜 장난감"이라는 뜻으로 이름 뒤에 "-Impl"을 붙이거나, "제일 기본으로 쓰는 것"이라는 뜻으로 "Default-"를 붙이거나, "복잡한 거 다 빼고 단순하게 만든 것"이라는 뜻으로 "Simple-"을 붙여요.

## 일반 설명

인터페이스 하나에 구현체가 딱 하나뿐이라 딱히 구분되는 이름을 짓기 애매할 때 쓰이는 관용적 접두/접미사 패턴들입니다. 정답은 없고 팀/프로젝트 컨벤션에 따라 갈리지만, 아래처럼 의미가 조금씩 다릅니다.

### 1. `Impl` 접미사 (예: `OrderServiceImpl`)

- 가장 흔하게 쓰이지만 "그냥 구현체"라는 뜻 외에 아무 정보도 주지 않는다는 비판이 많습니다. Java Spring 생태계에서 특히 관습적으로 널리 쓰임.
- 단점: 클래스 시그니처(`implements OrderService`)만 봐도 구현체임이 이미 드러나므로 `Impl`이 중복 정보라는 지적이 있습니다.

### 2. `Default` 접두사 (예: `DefaultOrderService`)

- "여러 구현체가 생길 수도 있지만, 특별한 이유가 없다면 이걸 쓰면 된다"는 **기본값/표준 구현**이라는 의미를 담습니다.
- 나중에 특수한 구현체(`CachedOrderService`, `MockOrderService` 등)가 추가될 여지가 있을 때 적합.

### 3. `Simple` / `Basic` 접두사 (예: `SimpleDateFormat`, `SimpleOrderService`)

- "복잡한 옵션 없이 단순하게 동작하는 구현"이라는 뉘앙스. JDK의 `SimpleDateFormat`, `SimpleTimeZone`이 대표 사례.
- `Basic`도 의미상 거의 동일하게 쓰이며, 팀 취향 차이일 뿐 명확한 구분 기준은 없습니다.
- `Default`와 다른 점: `Default`는 "표준/추천"이라는 뉘앙스가 강하고, `Simple`/`Basic`은 "기능이 단순하다"는 뉘앙스가 강함.

### 4. `Base` 접두사 (예: `BaseOrderService`)

- 완전한 구현이라기보다 **상속해서 확장하도록 의도된 추상 골격 클래스**에 주로 붙입니다. 즉 구체 구현이 아니라 템플릿 메서드 패턴용 베이스 클래스인 경우가 많음.

### 5. 기술/역할 기반 서술적 이름 (권장되는 방식)

업계 스타일 가이드(Baeldung, Joda 저자 Stephen Colebourne 등)가 공통적으로 권장하는 방식은 **접미사 대신 역할이나 기술을 드러내는 서술적 이름**을 쓰는 것입니다.

- `MessageStore` 인터페이스 → `DatabaseMessageStore`, `InMemoryMessageStore` (기술 기반)
- `OrderService` 인터페이스 → 구현체가 하나뿐이면 굳이 구분 접미사 없이 `OrderService`를 그대로 클래스명으로 쓰고, 인터페이스는 분리하지 않는 경우도 흔함(YAGNI: 구현체가 하나뿐이면 인터페이스 자체가 불필요하다는 관점).

### 정리: 언제 뭘 쓸까

| 상황 | 추천 |
|---|---|
| 구현체가 앞으로 여러 개로 늘어날 여지가 있고, 지금 것이 "표준"임을 강조하고 싶다 | `Default` |
| 기능이 단순/경량이라는 걸 강조하고 싶다 | `Simple` / `Basic` |
| 상속용 골격 클래스를 만들고 싶다 | `Base` |
| 딱히 의미를 못 찾겠고 관용적으로 빠르게 짓고 싶다 | `Impl` (단, 정보량이 적다는 비판 감수) |
| 기술/저장소/방식이 명확히 구분된다 | 기술명을 그대로 접두사로 (`Jpa~`, `InMemory~`, `Redis~`) |

실무에서는 이 다섯 스타일이 혼재하는 경우가 많으며, 중요한 것은 **한 프로젝트 안에서는 일관된 컨벤션 하나를 고정해서 쓰는 것**입니다.

---

Sources:
- [Java Interface Naming Conventions | Baeldung](https://www.baeldung.com/java-interface-naming-conventions)
- [Stephen Colebourne's blog: Implementations of interfaces - prefixes and suffixes](https://blog.joda.org/2011/08/implementations-of-interfaces-prefixes.html)
- [Naming of Interfaces and Implementations](https://www.amygdalum.net/en/naming-interface-implementation.html)
- [Java: What's up with "Impl" in Class Names? - Power to Build](https://power2build.wordpress.com/2012/12/01/java-whats-up-with-impl-in-class-names/)
- [java how to name interface and implementor | Medium](https://thomaspoignant.medium.com/java-how-to-name-interface-and-implementor-94c0fa564b87)
