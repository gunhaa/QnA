# Entity 정의는 어떻게 써야 하는가 — 필드(상태)는 정의에서 "역산"되는 것

> 배경: [`entity-concept.md`](./entity-concept.md), [`web-infra/kong-consumer-entity-vs-state-machine.md`](../web-infra/kong-consumer-entity-vs-state-machine.md)에서 "Kong의 `Consumer`는 상태가 아니라 Entity"라고 정리했습니다. 그렇다면 **"Consumer란 무엇이다"라는 정의 자체는 어떻게 써야, 거기서 어떤 필드(상태 포함)를 가져야 할지가 명확해지는가**에 대한 질문.

## 쉬운 설명

동아리에 새 회원을 받는다고 해봅시다. **회원 카드에 어떤 정보를 적을지**를 먼저 정하고 그 다음 "이 동아리가 뭘 하는 곳인지"를 생각하나요? 아닙니다. 순서는 반대입니다.

1. 먼저 **"이 동아리는 무슨 활동을 하고, 회원에게 어떤 자격 규칙이 있는가"**를 정합니다. (예: "회비를 내야 정회원, 안 내면 활동 불가")
2. 그 규칙에서 **"그럼 회원 카드에 '납부 여부'라는 항목이 필요하네"** 가 자동으로 따라 나옵니다.

**필드(상태 포함)는 정의에서 거꾸로 뽑아내는 결과물**이지, 먼저 나열하고 보는 목록이 아닙니다. "이 필드가 왜 필요한가?"라는 질문에 "동아리 규칙 몇 번 때문에"라고 답할 수 없다면, 그 필드는 애초에 불필요한 것입니다.

---

## 일반 설명

### 1. 필드 나열보다 정의가 먼저인 이유

**속성(필드)만 나열하고 "왜 이게 필요한가"에 답하지 못하는 모델**을 DDD 커뮤니티는 **Anemic Domain Model(빈혈 도메인 모델)** 이라 부르며 안티패턴으로 취급합니다. 데이터 덩어리만 있고 그 데이터가 어떤 규칙을 지키기 위한 것인지 설명이 없으면, 나중에 "이 필드가 왜 있는지 아무도 모르는" 상태가 됩니다.

올바른 순서는 이렇습니다.

```
1. 책임(Responsibility) 정의   → "이 Entity는 도메인에서 무슨 역할을 하는가"
2. 불변식(Invariant) 도출      → "그 역할을 수행하려면 항상 지켜져야 하는 규칙은 무엇인가"
3. 속성/상태/행위 역산         → "그 불변식을 표현·검증하려면 어떤 데이터·연산이 최소한 필요한가"
```

**상태(state) 필드도 예외가 아닙니다.** "국면(phase)에 따라 이 Entity가 할 수 있는 일이나 지켜야 할 규칙이 달라지는가?"라는 불변식이 있을 때만 상태 필드가 정당화됩니다. 그런 불변식이 없다면 상태 필드는 그냥 우발적 복잡성(accidental complexity)입니다.

---

### 2. Entity 정의 템플릿

DDD(Eric Evans, Vaughn Vernon)의 관용적 구성 요소를 정리하면 다음과 같은 템플릿이 됩니다.

| 항목 | 질문 | 비고 |
|---|---|---|
| **① 이름 (Ubiquitous Language)** | 도메인 전문가와 개발자가 **똑같은 단어**로 부르는가? | 코드의 클래스명 = 회의에서 쓰는 용어여야 함 |
| **② 식별자 (Identity)** | 무엇이 이 개체를 유일하게 만드는가? 그 식별자는 생명주기 내내 불변인가? | 시스템 생성 ID vs 비즈니스 키(자연키) 구분 |
| **③ 책임 (Responsibility)** | 도메인에서 이 개체가 담당하는 **단 하나의 역할**은 무엇인가? | "이 Entity가 없으면 어떤 질문에 답할 수 없는가?"로 검증 |
| **④ 불변식 (Invariant)** | 이 개체가 **어떤 상황에서도 항상** 지켜야 하는 규칙은 무엇인가? | **필드·상태를 정당화하는 핵심 근거.** 아래 §3 참고 |
| **⑤ 속성 (Attributes)** | ④를 표현하는 데 **최소한 필요한** 데이터는 무엇인가? | "이 필드가 없으면 어떤 불변식을 검증할 수 없는가?"로 역산 |
| **⑥ 행위 (Behaviors)** | 이 개체가 외부에 노출하는 연산(메서드)은 무엇인가? | 단순 getter/setter만 있다면 Anemic Model 신호 |
| **⑦ 생명주기·상태 (Lifecycle & State)** | ④의 불변식이 **국면별로 다른 행동·권한**을 요구하는가? | 요구하지 않으면 상태 필드 생략 (YAGNI) |
| **⑧ 경계 (Aggregate/관계)** | 어떤 Aggregate에 속하고, 다른 Entity·Value Object와 어떤 관계를 맺는가? | 트랜잭션 일관성 경계를 결정 |

★ Insight ─────────────────────────────────────
④(불변식)와 ⑤(속성)의 화살표 방향에 주목하세요. **"이 속성이 있으니 이런 규칙을 만들자"가 아니라 "이런 규칙이 있으니 이 속성이 있어야 한다"** 순서입니다. 방향이 뒤집히면 "일단 다 넣고 보는" 필드 목록이 되고, 나중에 "이거 왜 있는 필드죠?"라는 질문에 아무도 답을 못 하게 됩니다.
─────────────────────────────────────────────────

---

### 3. 상태(state) 필드를 넣을지 판단하는 구체적 기준

불변식이 다음 형태를 띨 때만 상태 필드가 정당화됩니다.

> **"이 Entity가 [상태 A]일 때는 [행동/규칙 X]가 적용되고, [상태 B]일 때는 [행동/규칙 Y]가 적용된다."**

이 형태의 규칙이 **하나도 없다면**, 그 Entity는 "존재하거나 존재하지 않거나(CRUD)"만으로 충분하고 별도 상태 필드는 불필요합니다.

---

### 4. 템플릿을 Kong `Consumer`에 적용해보기

앞선 두 문서의 결론([`entity-concept.md`](./entity-concept.md), [`kong-consumer-entity-vs-state-machine.md`](../web-infra/kong-consumer-entity-vs-state-machine.md))이 왜 나왔는지, 템플릿으로 재구성하면 명확해집니다.

| 항목 | Kong Consumer의 정의 |
|---|---|
| **① 이름** | Consumer — "API를 소비(consume)하는 주체" |
| **② 식별자** | `id`(UUID, 시스템 생성) — 생명주기 내내 불변. `username`/`custom_id`는 사람이 읽는 보조 식별자 |
| **③ 책임** | Kong Gateway를 통해 업스트림 API를 호출하는 **외부 클라이언트(앱·서비스·사람)를 대표**하고, 그 클라이언트에 귀속되는 **인증 자격증명(Credential)·ACL 그룹·요청 정책(rate-limit 등)을 앵커링(anchor)** 한다 |
| **④ 불변식** | "`username` 또는 `custom_id` 중 최소 하나는 존재해야 한다" (Kong 스키마의 entity check). **"국면에 따라 API 호출 가능 여부가 달라진다"는 불변식은 코어에 존재하지 않음** |
| **⑤ 속성** | `id`, `username`, `custom_id`, `tags` — 위 불변식을 표현하는 데 필요한 최소 집합 |
| **⑥ 행위** | Kong 코어의 Consumer는 도메인 로직(계산·검증 메서드)이 거의 없는 **설정 리소스**에 가까움 — Admin API를 통한 CRUD가 사실상 유일한 "행위". 실제 동작(인증 통과 여부, rate-limit 적용)은 Consumer에 **연관된 Plugin/Credential**이 수행 |
| **⑦ 생명주기·상태** | **없음.** ③의 책임 수행에 "존재 여부"만 필요하고 국면 구분이 필요 없기 때문 |
| **⑧ 경계** | Credential, ACL, 특정 Consumer에 스코프된 Plugin 설정과 연관관계를 맺음. 자기 자신이 Aggregate Root |

**"Kong Enterprise의 Developer"** 는 여기에 **④번이 다른 하나의 개념**입니다.

> 불변식: "**포털에 가입 신청(pending)한 개발자는 API 자격증명을 발급받을 수 없고, 승인(approved)된 이후에만** 자격증명 발급이 가능하다. 관리자가 차단(revoked)하면 기존 자격증명도 무효화된다."

이 불변식은 **정확히 §3의 형태**("상태 A일 때 규칙 X, 상태 B일 때 규칙 Y")를 띠기 때문에, `status: pending|approved|rejected|revoked` 필드가 **정당하게** 추가됩니다. Kong이 이 개념을 `Consumer` 코어 스키마에 넣지 않고 Enterprise의 별도 `Developer` 엔티티로 분리한 것도, **"승인 워크플로우가 필요 없는 대다수 사용자에게 불필요한 필드를 강요하지 않는다"** 는 같은 원칙의 실천입니다.

---

### 5. 정리

```
정의(책임 + 불변식)가 먼저
        ↓ 역산
속성 / 행위 / (필요하다면) 상태

Kong Consumer:
  책임 = "API 소비 주체를 대표하고 자격증명·정책을 앵커링"
  불변식 = "식별자 최소 하나 필수" (국면 구분 불변식 없음)
        ↓
  상태 필드 불필요 → 실제로 없음

Kong Enterprise Developer:
  책임 = "포털 가입 개발자를 대표"
  불변식 = "승인 전엔 자격증명 발급 불가" (국면 구분 불변식 있음)
        ↓
  상태 필드 필요 → status: pending/approved/rejected/revoked
```

**질문에 대한 답:** Consumer 같은 Entity를 정의할 때는 "이게 어떤 필드를 가지나"부터 적지 말고, **"도메인에서 이게 무슨 역할(책임)을 하며, 그 역할을 수행하는 동안 항상 지켜야 하는 규칙(불변식)이 무엇인가"** 를 먼저 문장으로 씁니다. 그 불변식 문장에 "~일 때는 ~하고, ~일 때는 ~하다"라는 국면 구분이 등장하면 그때 비로소 상태 필드를 추가하면 되고, 등장하지 않으면 상태 필드는 넣지 않는 것이 맞습니다.

---

## Sources

- [Designing the DDD way — Introduction (Nikesh Shetty, Medium)](https://nikeshshetty.medium.com/designing-the-ddd-way-introduction-9acd910e418)
- [How do you define the boundaries of an entity in DDD? — LinkedIn Collaborative Article](https://www.linkedin.com/advice/0/how-do-you-define-boundaries-entity-ddd)
- [How do you design entities that reflect the ubiquitous language of your domain? — LinkedIn](https://www.linkedin.com/advice/3/how-do-you-design-entities-reflect-ubiquitous)
- [Entities, Value Objects, Aggregates and Roots — Jimmy Bogard, Los Techies](https://lostechies.com/jimmybogard/2008/05/21/entities-value-objects-aggregates-and-roots/)
- [Modelling Aggregates: Invariants vs Corrective Policies — Domain Centric](https://domaincentric.net/blog/modelling-business-rules-invariants-vs-corrective-policies)
- [Demystifying Event Storming, Part 3: Design Level — DZone](https://dzone.com/articles/demystifying-event-storming-design-level-identifyi)

---

## 관련 문서

- [`cs-fundamentals/entity-concept.md`](./entity-concept.md) — Entity 개념 자체의 정의와 Value Object/DTO 구분
- [`web-infra/kong-consumer-entity-vs-state-machine.md`](../web-infra/kong-consumer-entity-vs-state-machine.md) — Kong Consumer가 상태가 아니라 Entity인 이유
