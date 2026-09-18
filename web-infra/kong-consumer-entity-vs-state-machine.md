# Kong의 Consumer 같은 엔티티는 상태머신의 "상태(state)"인가?

> 배경: [`cs-fundamentals/entity-concept.md`](../cs-fundamentals/entity-concept.md)에서 다룬 "Entity(식별자 기반 동일성을 갖는 개체)" 개념을, Kong API Gateway의 `Consumer` 엔티티에 적용해도 되는지 — 그리고 이걸 "상태머신의 상태 정의"로 봐도 되는지에 대한 질문.

## 쉬운 설명

**학생증**과 **신호등 불빛**을 비교해봅시다.

**학생증**은 "그 학생 한 명"을 가리킵니다. 학번이 같으면 이름이 바뀌고 학년이 올라가도 계속 "같은 학생"이에요. → 이게 **Entity(엔티티)**.

**신호등 불빛**은 다릅니다. "빨강, 노랑, 초록" 중 **지금 이 순간 어느 것인지**를 나타낼 뿐이고, 정해진 몇 가지 값 중 하나를 왔다갔다 할 뿐입니다. 신호등이라는 물건 자체가 아니라, **신호등이 "지금 어떤 국면에 있는지"를 나타내는 값**이에요. → 이게 **상태(state)**.

결론부터 말하면, **Kong의 `Consumer`는 학생증 쪽입니다.** API를 사용하는 외부 클라이언트(앱, 서비스, 사용자)를 가리키는 **식별자를 가진 개체**이지, "지금 어느 국면에 있는지"를 나타내는 값이 아닙니다. 실제로 Kong 코어의 `Consumer` 스키마에는 상태(status) 필드 자체가 없습니다.

---

## 일반 설명

### 1. Kong의 엔티티 모델 — Consumer는 어디에 속하는가

Kong Gateway는 `Service`, `Route`, `Consumer`, `Plugin`을 **코어 엔티티(core entities)**로 정의합니다. 이들은 모두:

- **Admin API로 CRUD**되는 영속 리소스 (`/consumers`, `/services`, `/routes`, `/plugins`)
- **DAO(Data Access Object) 계층**을 통해 Postgres·Cassandra 또는 DB-less(선언적 config)에 저장
- 각각 **UUID 형태의 고유 `id`**를 갖고, `kong.db.consumers`처럼 이름으로 접근

즉 Kong의 "엔티티"는 [지난 문서](../cs-fundamentals/entity-concept.md)에서 다룬 **ORM Entity 관점**과 정확히 같은 결의 개념입니다 — DB 테이블에 매핑되고, 고유 식별자로 CRUD 되는 리소스.

### 2. Consumer 스키마의 실제 필드

Kong 소스코드(`kong/db/schema/entities/consumers.lua`)를 보면:

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | UUID | **기본키(식별자)** |
| `username` | string | 고유(unique) |
| `custom_id` | string | 고유(unique), 외부 시스템의 사용자 ID를 넣는 용도 |
| `tags` | tags | 분류용 태그 |
| `created_at` / `updated_at` | timestamp | 자동 관리 |

**제약조건은 "username 또는 custom_id 중 최소 하나는 있어야 한다"** 뿐입니다. **`status`나 상태값에 해당하는 필드는 없습니다.**

### 3. 왜 "Entity"이지 "State"가 아닌가

Entity와 State는 애초에 답하는 질문이 다릅니다.

| | Entity | State (상태) |
|---|---|---|
| 답하는 질문 | **"무엇이 존재하는가(WHO/WHAT)"** | **"그것이 지금 어느 국면에 있는가(WHICH PHASE)"** |
| 식별자 | 있음 (`id`) — 다른 Consumer와 구별됨 | 없음 — `active`, `pending` 같은 값은 그 자체로 "구별되는 개체"가 아니라 **유한한 값 집합의 원소** |
| 존재 방식 | 독립적으로 생성·조회·삭제됨 (`POST /consumers`) | 항상 **어떤 엔티티에 종속**되어서만 의미가 있음 ("Consumer #123의 상태") |
| 연관관계 | Credential, ACL, Plugin, Rate-limit이 이 `id`에 귀속됨 | 그 자체로는 다른 것과 관계를 맺지 않음 |
| 생명주기 | 생성 → 여러 속성 변경 → 삭제 (연속적 정체성 유지) | 전이 규칙(transition)에 따라 유한한 값 사이를 이동 |
| 비유 | 학생증, 계좌, 사용자 | 신호등 색, 주문의 `PENDING/SHIPPED/DELIVERED` |

Kong의 `Consumer`는 왼쪽 열에 정확히 들어맞습니다. **`username`이나 `custom_id`가 바뀌어도 `id`가 같으면 여전히 "같은 Consumer"** 이고, 여기에 API 키·OAuth 토큰·ACL 그룹·rate-limit 설정 같은 것들이 계속 연결되어 있습니다. 이건 상태값의 동작 방식이 아니라 **[지난 문서](../cs-fundamentals/entity-concept.md)에서 정의한 DDD/ORM Entity** 그 자체입니다.

### 4. 그럼 "상태"는 Kong에서 어디에 위치하는가

정리하면 이렇게 됩니다.

```
Consumer (Entity)                 ← 식별자(id)를 가진 독립 개체
  ├─ username, custom_id, tags    ← 바뀔 수 있는 "속성"
  └─ (Kong 코어에는 없음) status  ← 있었다면 "이 Consumer가 지금 어느 국면인가"를 나타내는 필드
```

실제로 **Kong Enterprise의 Developer Portal**에는 `Consumer`와 연결된 **`Developer`** 라는 별도 개념이 있고, 여기에 `pending → approved / rejected → revoked` 같은 **승인 워크플로우 상태**가 존재합니다. 이 구조가 정확히 "상태머신"에 해당하는 부분입니다.

**핵심은 이겁니다 — 상태(state)는 엔티티를 대체하는 게 아니라, 엔티티가 가질 수 있는 "속성 중 하나"로 내장됩니다.**

```
[Entity]  Developer { id, email, consumer_id, status }
                                          └─ status: Enum(pending|approved|rejected|revoked)
                                             = 이 필드의 "값 자체와 전이 규칙"이 상태머신
```

즉:
- **"Consumer라는 개체가 상태다"** ❌ — Consumer는 상태가 아니라 상태를 담을 수 있는 그릇(Entity)
- **"Consumer가 가진 status 필드의 값이 상태다"** ✅ — 정확히는 이쪽이 상태머신의 "상태"에 해당

### 5. 일반화 — 이 구분이 왜 중요한가

이 구분을 헷갈리면 설계에서 실수가 생깁니다.

| 잘못된 모델링 | 올바른 모델링 |
|---|---|
| "상태별로 별도 엔티티를 만든다" (`PendingConsumer`, `ActiveConsumer` 클래스) | **하나의 Entity + 상태를 나타내는 필드(Enum)**. 식별자(`id`)는 상태 전이와 무관하게 유지되어야 함 |
| 상태 전이 시 엔티티를 삭제 후 재생성 | 상태 전이는 **같은 엔티티의 속성 업데이트** — 식별자와 연관관계(Credential, Plugin 등)는 그대로 유지됨 |
| 상태값 자체에 ID·타임스탬프·연관관계를 부여하려 함 | 상태는 보통 **불변의 값(Value Object/Enum)** — 그 자체로 생명주기를 갖지 않음. 생명주기는 상태를 담고 있는 Entity 쪽에 있음 |

Kong이 `Consumer` 코어 스키마에 `status`를 넣지 않은 것도 같은 맥락입니다 — **"클라이언트가 존재한다"는 사실(Entity)과 "그 클라이언트의 승인/차단 여부"라는 별도 관심사(State)를 분리**해서, 후자가 필요한 제품(Enterprise Developer Portal)에서만 별도 엔티티로 추가한 것입니다.

---

## 한 줄 결론

> **Kong의 `Consumer`는 상태머신의 "상태 정의"가 아니라, [지난 문서](../cs-fundamentals/entity-concept.md)에서 다룬 의미 그대로 "식별자(`id`)로 동일성이 유지되는 도메인 Entity"입니다.** 실제 Kong 코어 스키마에도 `status` 필드가 없습니다. 상태머신 개념을 대응시키고 싶다면 Consumer 자체가 아니라, **Consumer(혹은 Kong Enterprise의 Developer)가 가질 수 있는 `status` 같은 개별 속성**에 대응시켜야 정확합니다 — Entity는 "무엇이 존재하는가"에 답하고, State는 "그것이 지금 어느 국면인가"에 답합니다.

---

## Sources

- [Consumers — Kong Gateway Docs](https://developer.konghq.com/gateway/entities/consumer/)
- [Kong Gateway entities — Kong Docs](https://developer.konghq.com/gateway/entities/)
- [kong/kong/db/schema/entities/consumers.lua — GitHub](https://github.com/Kong/kong/blob/master/kong/db/schema/entities/consumers.lua)
- [Architecture and Core Components — Kong/kong DeepWiki](https://deepwiki.com/Kong/kong/2-architecture-and-core-components)
- [Plugin System — Kong/kong DeepWiki](https://deepwiki.com/Kong/kong/6-plugin-system)
- [API Portal Management: Unblock and Automate Developer Approvals — Kong Inc.](https://konghq.com/blog/engineering/seamlessly-manage-api-access)

---

## 관련 문서

- [`cs-fundamentals/entity-concept.md`](../cs-fundamentals/entity-concept.md) — Entity 개념의 정의와 Value Object/DTO와의 구분
