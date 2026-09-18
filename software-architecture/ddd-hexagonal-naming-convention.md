# DDD/헥사고날 아키텍처의 기본 이름 컨벤션

## 쉬운 설명

집을 지을 때 "거실(핵심 규칙)", "현관문(포트)", "실제 문짝(어댑터)"으로 역할을 나누듯이, 코드도 "규칙을 담은 방(도메인)", "규칙을 쓰는 창구(애플리케이션)", "진짜 세상과 연결하는 문(인프라)"으로 이름을 나눠서 지어요. 그래서 폴더/클래스 이름만 봐도 "이건 규칙", "이건 창구", "이건 실제 연결부"라고 바로 알 수 있게 하는 거예요.

## 일반 설명

DDD(Domain-Driven Design)와 헥사고날 아키텍처(Ports and Adapters)는 별개의 개념이지만 실무에서는 거의 항상 함께 쓰이며, 아래와 같은 이름 컨벤션이 널리 통용됩니다. 다만 헥사고날 창시자 Alistair Cockburn 본인도 "패키지 구조는 아키텍처 스타일과 무관하다"고 강조한 바 있어, 아래는 강제 규칙이 아니라 **업계 관행(convention)**임을 유의해야 합니다.

### 1. 레이어(폴더) 이름 — 헥사고날 3분할

| 레이어 | 역할 | 흔한 이름 |
|---|---|---|
| Domain | 순수 비즈니스 규칙, 프레임워크 의존 없음 | `domain/` |
| Application | 유스케이스 조율, 포트 정의/호출 | `application/` |
| Infrastructure/Adapter | 실제 기술(DB, HTTP, 메시징) 구현 | `infrastructure/` 또는 `adapter/` |

의존 방향은 항상 Application·Infrastructure → Domain으로, Domain은 바깥을 모릅니다.

### 2. 포트(Port) 이름

포트는 "인터페이스"이며 방향에 따라 이름이 갈립니다.

- **인바운드 포트(Input/Driving Port)**: 외부가 도메인/애플리케이션을 호출하는 창구. `UseCase`, `Command`, `Query` 접미사가 흔함. 예) `PlaceOrderUseCase`, `PlaceOrderCommand`.
- **아웃바운드 포트(Output/Driven Port)**: 도메인이 외부 자원을 필요로 할 때 쓰는 창구. 영속성이면 `Repository`, 외부 시스템 연동이면 `Gateway`가 관례. 예) `OrderRepository`(영속성), `OrderNotificationGateway`(알림 발송).

패키지로는 `port/in`(또는 `port/inbound`), `port/out`(또는 `port/outbound`)으로 나누는 구조가 흔합니다.

### 3. 어댑터(Adapter) 이름

어댑터는 포트의 "구현체"이며, 실제 기술명을 접두/접미사로 붙입니다.

- 인바운드 어댑터: `OrderRestController`, `OrderGraphqlResolver` — 외부 요청을 받아 인바운드 포트를 호출.
- 아웃바운드 어댑터: `JpaOrderRepository`, `SqlOrderRepository`, `EmailNotificationAdapter` — 아웃바운드 포트를 실제 기술로 구현.

패키지는 `adapter/in/web`, `adapter/out/persistence`처럼 "방향 + 기술 종류"로 분리하는 경우가 많습니다.

### 4. DDD 전술 패턴(Tactical Pattern) 이름

DDD 쪽에서는 기술적 접미사보다 **유비쿼터스 언어(Ubiquitous Language)**, 즉 비즈니스 용어를 그대로 쓰는 것이 원칙입니다. 단, 몇 가지 역할은 접미사가 관례화되어 있습니다.

- **Entity / Aggregate Root**: 접미사 없이 비즈니스 명사 그대로 (`Order`, `Customer`). Aggregate Root는 해당 Aggregate 하위 패키지의 대표 이름으로 사용(`order/Order.java`가 루트, 나머지는 하위 엔티티).
- **Value Object**: 값 자체를 표현하는 명사 (`Money`, `Email`, `Address`) — 접미사보다는 개념명 그대로.
- **Repository**: `~Repository` 접미사가 사실상 표준 (`OrderRepository`). 도메인 계층에는 인터페이스(포트)만, 구현은 인프라 계층에 위치.
- **Domain Service**: 하나의 Aggregate에 속하지 않는 도메인 로직. `~Service` 또는 `~DomainService` 접미사 (`PricingService`).
- **Application Service**: 유스케이스 오케스트레이션 담당. `~ApplicationService` 또는 `~UseCase` (`PlaceOrderService`, `PlaceOrderUseCase`).
- **Factory**: 복잡한 생성 로직 캡슐화. `~Factory` (`OrderFactory`).
- **Domain Event**: 과거형 동사로 이벤트를 표현. `~Event` 또는 `~ed` 형태 (`OrderPlacedEvent`, `OrderPlaced`).
- **Specification**: 조건/규칙을 캡슐화. `~Specification` (`OverdueOrderSpecification`).

### 5. 주의할 점

- 기술적 접미사(`~Repository`, `~UseCase` 등)는 아키텍처 계층을 드러내는 데 유용하지만, **Entity/Value Object 자체의 이름은 반드시 도메인 전문가와 합의된 유비쿼터스 언어를 따라야** 합니다. 기술 편의를 위해 비즈니스 용어를 왜곡하지 않는 것이 DDD의 핵심입니다.
- 패키지 구조는 계층형(`domain/`, `application/`, `adapter/`)과 기능형(Aggregate별로 `order/`, `payment/` 하위에 각 계층을 두는 방식) 두 흐름이 있으며, 최근에는 Aggregate 단위로 수직 분할하고 그 안에 `domain`/`application`/`adapter`를 두는 방식(패키지-바이-피처)도 널리 선호됩니다.

---

Sources:
- [DDD & Hexagonal Architecture in Java | Vaadin](https://vaadin.com/blog/ddd-part-3-domain-driven-design-and-the-hexagonal-architecture)
- [Hexagonal Architecture — Understanding Ports | Medium](https://medium.com/@akdevblog/hexagonal-architecture-understanding-ports-4020009e1aad)
- [Hexagonal Architecture, DDD, and Spring | Baeldung](https://www.baeldung.com/hexagonal-architecture-ddd-spring)
- [Towards Hexagonal Architecture - Folder Structure](https://codeartify.substack.com/p/folder-structures)
- [How to do the package structure in a Ports and Adapters architecture](https://tbuss.de/posts/2023/9-how-to-do-the-package-structure-in-a-ports-and-adapter-architecture/)
- [Clean DDD lessons: project structure and naming conventions | Medium](https://medium.com/unil-ci-software-engineering/clean-ddd-lessons-project-structure-and-naming-conventions-00d0b9c57610)
- [What is That Domain Service in DDD for .NET Developers | ABP.IO](https://medium.com/volosoft/what-is-that-domain-service-in-ddd-for-net-developers-76911e090b25)
