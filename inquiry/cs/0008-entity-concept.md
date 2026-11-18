# 개발에서 "Entity(엔티티)"란 무엇인가 — DB, DDD, ORM, 아키텍처를 관통하는 공통 개념

## 쉬운 설명

**주민등록번호**를 생각해봅시다.

여러분이 이사를 가고, 이름을 개명하고, 살이 찌거나 빠져도 — **"그 사람"이라는 사실은 안 변합니다.** 주민등록번호가 그 사람을 계속 가리키기 때문이에요.

반면 **5000원짜리 지폐 한 장**은 다릅니다. 어떤 특정 지폐인지는 중요하지 않고, **"5000원이라는 금액"** 만 중요합니다. 다른 5000원 지폐와 바꿔도 아무 문제 없어요.

개발에서 **엔티티(Entity)** 는 앞의 "사람"과 같습니다. **속성(이름, 주소, 몸무게)이 바뀌어도 고유한 이름표(식별자)로 계속 "같은 것"으로 취급되는 개체**를 말합니다. 반대로 지폐처럼 "값 자체"만 중요한 것은 **Value Object(값 객체)**라고 부릅니다.

---

## 일반 설명

### 1. 모든 맥락을 관통하는 하나의 정의

"Entity"는 데이터베이스 설계, DDD(도메인 주도 설계), ORM, Clean Architecture 등 서로 다른 맥락에서 조금씩 다르게 쓰이지만, 공통 뿌리는 하나입니다.

> **Entity = 고유한 식별자(identity)를 가지고, 그 식별자가 생명주기 내내 유지되는 개체.** 속성 값이 전부 바뀌어도 식별자가 같으면 "같은 엔티티"다.

이 정의에서 파생되는 핵심 성질:

| 성질 | 의미 |
|---|---|
| **식별자(Identity)** | 다른 개체와 구별해주는 고유 값(ID, PK 등). 속성이 아니라 "그 자체"를 가리킴 |
| **동일성 판단 = 식별자 비교** | `entity1.equals(entity2)`는 속성이 아니라 **ID가 같은가**로 판단 |
| **가변성(Mutability)** | 속성은 시간에 따라 바뀔 수 있음. 바뀌어도 여전히 같은 엔티티 |
| **생명주기(Lifecycle)** | 생성 → 변경 → 소멸의 흐름을 추적해야 하는 대상 |

---

### 2. 맥락별로 "Entity"가 강조하는 지점

같은 단어지만 분야마다 초점이 다릅니다. 이게 혼란의 근원입니다.

#### ① ER(Entity-Relationship) 모델 — 데이터 모델링의 원조

1976년 Peter Chen이 제안한 ER 모델에서 **entity**는 "현실 세계에서 식별 가능하고 다른 것과 구별되는 사물"입니다. `학생`, `과목`, `주문` 같은 것들이죠. 같은 속성 집합을 공유하는 엔티티들의 모음을 **entity set**이라 부르고, 그 안에서 각 개체를 구별하는 속성이 **기본키(primary key)** 입니다.

```
[학생] entity set
 ├─ 속성: 학번(PK), 이름, 학년
 └─ 개별 entity: (20231234, "김철수", 2학년)
```

여기서의 초점은 **"현실 세계 개념을 테이블/속성/관계로 어떻게 도식화하는가"** 입니다.

#### ② DDD(Domain-Driven Design) — Eric Evans, 2003

DDD에서 **Entity**는 ER 모델의 정의를 그대로 가져오되, **도메인 로직 관점**을 더합니다.

> "정체성이 연속되는 것이 중요한 객체가 있다. 이런 객체를 정의할 때는 속성이 아니라 정체성이 근본이 된다." — Eric Evans, *Domain-Driven Design*

DDD는 Entity를 **Value Object**와 짝지어 대비시킵니다.

| | Entity | Value Object |
|---|---|---|
| 무엇으로 구별하는가 | **식별자(ID)** | **속성 값의 조합** |
| 두 개체가 같은가? | `id`가 같으면 같음 | 모든 속성이 같으면 같음 (설령 다른 인스턴스여도) |
| 가변성 | 보통 가변(mutable) | 보통 불변(immutable) |
| 예시 | `주문(Order)`, `사용자(User)`, `계좌(Account)` | `금액(Money)`, `주소(Address)`, `날짜범위(DateRange)` |
| 추적 | 시간에 따라 변화를 추적해야 함 | 그 자체로 완결된 값, 추적 불필요 |

```java
// Entity — ID로 동일성 판단
class Order {
    private final OrderId id;   // 식별자
    private OrderStatus status; // 바뀔 수 있음
    private Money total;        // 바뀔 수 있음

    @Override
    public boolean equals(Object o) {
        return o instanceof Order && ((Order) o).id.equals(this.id); // ID만 비교
    }
}

// Value Object — 속성 값으로 동일성 판단, 불변
final class Money {
    private final BigDecimal amount;
    private final Currency currency;

    @Override
    public boolean equals(Object o) {
        if (!(o instanceof Money m)) return false;
        return amount.equals(m.amount) && currency.equals(m.currency); // 값 전체 비교
    }
}
```

★ Insight ─────────────────────────────────────
`equals()`/`hashCode()` 구현 방식 자체가 "이게 Entity인지 Value Object인지"를 코드로 드러내는 가장 확실한 신호입니다. ID만 비교하면 Entity, 모든 필드를 비교하면 Value Object로 설계 의도를 읽어낼 수 있습니다.
─────────────────────────────────────────────────

#### ③ ORM(JPA, Entity Framework, TypeORM 등) — 영속성 관점

ORM에서 **Entity**는 **DB 테이블에 매핑되는 클래스**를 가리킵니다. `@Entity`(JPA), `[Table]`(EF Core), `@Entity()`(TypeORM) 애너테이션이 붙은 클래스가 그것입니다.

```java
@Entity
@Table(name = "orders")
class OrderEntity {
    @Id @GeneratedValue
    private Long id;
    private String status;
    // getter/setter...
}
```

**여기서 함정이 있습니다.** ORM Entity는 DDD Entity와 이름은 같지만 **관심사가 다릅니다.**

| | DDD Entity | ORM(Persistence) Entity |
|---|---|---|
| 목적 | **도메인 로직**을 표현 (비즈니스 규칙, 불변식) | **영속화**를 표현 (테이블 컬럼 매핑, 지연 로딩) |
| 위치 | 도메인 계층 | 인프라(영속성) 계층 |
| 필드 | 도메인 개념에 필요한 것만 | 테이블 구조를 그대로 반영 (FK, 연관관계 매핑 등) |
| 생성자 | 불변식을 강제하는 생성자 | 프레임워크가 요구하는 기본 생성자 필요할 때가 많음 |

많은 프로젝트가 **"편의상 같은 클래스를 두 용도로 재사용"** 하다가 DDD 원칙(도메인이 인프라에 의존하면 안 됨)을 어기는 문제가 생깁니다. 엄격한 DDD/Clean Architecture 프로젝트는 **도메인 Entity와 ORM Entity를 별도 클래스로 분리**하고 매퍼로 변환합니다.

#### ④ Clean Architecture (Robert C. Martin, 2017) — 또 다른 의미 확장

Clean Architecture에서 **Entities 계층**은 가장 안쪽(가장 추상적인) 계층으로, **"기업 전체(enterprise-wide)의 업무 규칙"** 을 캡슐화합니다.

> "Entities encapsulate enterprise-wide business rules... entities should be stable and free of framework or persistence concerns."

여기서 강조점은 DDD의 "식별자 vs 값"이 아니라 **"바뀔 이유가 가장 적은, 프레임워크·DB·UI에 의존하지 않는 순수 업무 로직"** 입니다. Use Case(애플리케이션 계층)가 Entity를 사용해 흐름을 조율하는 구조죠.

---

### 3. Entity vs Value Object vs DTO — 흔히 헷갈리는 삼각관계

| | Entity | Value Object | DTO(Data Transfer Object) |
|---|---|---|---|
| 정체성 | 있음 (ID) | 없음 (값 자체) | 없음 |
| 역할 | 도메인 개념을 표현 | 도메인 개념의 서술적 속성 표현 | **계층/시스템 경계 간 데이터 운반** |
| 로직 포함? | 보통 포함 (비즈니스 규칙) | 포함 가능 (예: `Money.add()`) | **로직 없음, 순수 데이터 컨테이너** |
| 예시 | `User`, `Order` | `Email`, `Money`, `Coordinates` | `UserResponseDto`, API 요청/응답 바디 |

과거 J2EE 시절 "Value Object"라는 말이 지금의 DTO 의미로 쓰인 적이 있어(마틴 파울러가 이를 "옛 용례"로 지적) 문헌을 읽을 때 연도에 주의해야 합니다.

---

### 4. 정리 — 왜 다 "Entity"라고 부르는가

네 가지 맥락(ER 모델·DDD·ORM·Clean Architecture)이 서로 강조점은 다르지만, **"식별자를 통해 연속성을 유지하는 독립적 개체"** 라는 뿌리는 공유합니다.

```
ER 모델        : 식별 가능한 "현실 세계의 사물" → 테이블/속성으로 도식화
     ↓
DDD            : 그중에서도 "ID로 동일성을 판단하고, 속성이 변해도 연속성을 유지"하는 도메인 객체
     ↓
ORM            : 그 도메인 객체(또는 그와 비슷한 구조)를 "DB 테이블에 매핑"한 것
     ↓
Clean Arch.    : "프레임워크에 의존하지 않는 핵심 업무 규칙"이라는 계층으로 재해석
```

실무 조언: **"Entity"라는 단어가 나오면 먼저 "지금 이 맥락이 ER/DB 설계인지, DDD 도메인 모델인지, ORM 매핑 클래스인지, Clean Architecture의 계층 이름인지"를 구분**하세요. 같은 코드베이스 안에서도 "Entity"가 두세 가지 의미로 동시에 쓰이는 경우가 많아 팀 내 용어 정의를 명시적으로 맞추는 것이 좋습니다.

---

## Sources

- [DDD entities and ORM entities — Matthias Noback](https://matthiasnoback.nl/2022/04/ddd-entities-and-orm-entities/)
- [What Is an Entity? Unveiling the Core of Domain-Driven Design and Clean Architecture — Medium](https://medium.com/@michaelmaurice410/what-is-an-entity-unveiling-the-core-of-domain-driven-design-and-clean-architecture-84b492c4398d)
- [Entities vs Entities — Martin Müller, Medium](https://medium.com/@cadothek/entities-vs-entities-8286ca21c42d)
- [Entity vs Value Object: the ultimate list of differences — Enterprise Craftsmanship](https://enterprisecraftsmanship.com/posts/entity-vs-value-object-the-ultimate-list-of-differences/)
- [bliki: Value Object — Martin Fowler](https://martinfowler.com/bliki/ValueObject.html)
- [Value objects vs DTOs — madewithlove](https://madewithlove.com/blog/value-objects-vs-dtos/)
- [The Clean Architecture — Uncle Bob (Clean Coder Blog)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Entity-Relationship Models Explained — ER/Studio](https://erstudio.com/blog/entity-relationship-models-and-diagrams-explained-with-er-studio/)

---

## 관련 문서

- [`cs-fundamentals/first-class-concept.md`](./first-class-concept.md) — "1급 개념"과 "reification(구체화)" — Entity로 승격시킨다는 것의 이론적 배경
