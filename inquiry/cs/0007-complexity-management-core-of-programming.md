# "프로그래머의 핵심은 복잡도를 관리하는 것이다"란 무엇인가

## 쉬운 설명

방 안에 장난감이 잔뜩 흩어져 있다고 생각해보세요. 장난감이 많아도 **종류별로 상자에 나눠 담고, 상자마다 이름표를 붙여두면** 나중에 원하는 장난감을 금방 찾을 수 있어요.

반대로 아무렇게나 쌓아두면, 장난감이 늘어날수록 하나 찾는 데 시간이 오래 걸리고, 새 장난감을 어디에 둬야 할지도 헷갈립니다.

프로그래밍도 똑같습니다. **기능(장난감)은 계속 늘어나는데, 그걸 잘 정리(상자·이름표 = 구조·이름)해두지 않으면 나중에 코드를 이해하고 고치는 게 점점 힘들어집니다.** 그래서 좋은 프로그래머의 진짜 실력은 "코드를 빨리 쓰는 것"이 아니라 **"복잡해지는 걸 잘 정리해서 다루는 것"** 에 있습니다.

---

## 일반 설명

### 1. 이 명제의 출처와 핵심 주장

이 명제는 스탠퍼드대 교수이자 Tcl 언어 창시자인 **John Ousterhout**가 저서 *A Philosophy of Software Design*에서 제시한 소프트웨어 설계 철학의 핵심 문장입니다.

> "The greatest limitation in writing software is our ability to understand the systems we are creating... **complexity is the thing that makes software hard to understand or modify.**"

즉, 소프트웨어 개발에서 근본적 병목은 알고리즘 지식이나 타이핑 속도가 아니라 **인간이 시스템을 이해할 수 있는 능력**이며, 그 이해를 가로막는 것이 바로 **복잡도(complexity)** 라는 것입니다. 이 관점에서 프로그래머의 일은 "기능을 동작하게 만드는 것"에서 한 걸음 더 나아가 **복잡도를 계속 낮은 수준으로 유지하는 것**으로 재정의됩니다.

---

### 2. 복잡도란 정확히 무엇인가

Ousterhout는 복잡도를 이렇게 정의합니다.

> **Complexity = anything related to the structure of a software system that makes it hard to understand and modify the system.**

복잡도는 시스템이 "하는 일(기능)"의 양이 아니라, 그 일을 표현한 **구조**가 사람에게 얼마나 이해하기 어려운가에 관한 것입니다. 같은 기능이라도 구조를 어떻게 짜느냐에 따라 복잡도는 크게 달라집니다.

복잡도는 다음 세 가지 **증상(symptom)**으로 관찰됩니다.

| 증상 | 의미 | 예시 |
|---|---|---|
| **변경 증폭 (Change amplification)** | 단순해 보이는 수정 하나가 코드 여러 곳을 건드려야 끝남 | 필드 하나 추가하려고 10개 파일을 고쳐야 함 |
| **인지 부하 (Cognitive load)** | 작업을 완료하려면 개발자가 머릿속에 담아둬야 할 정보의 양 | 함수 하나를 이해하려고 5단계 호출 체인을 다 추적해야 함 |
| **모르는 미지수 (Unknown unknowns)** | 무엇을 수정해야 하는지, 무엇이 영향받는지조차 불분명함 | "이 함수를 고치면 어디가 깨질지 아무도 모름" |

이 중 가장 위험한 것이 **unknown unknowns**입니다. 변경 증폭이나 인지 부하는 힘들어도 "무엇을 해야 하는지"는 알 수 있지만, unknown unknowns는 애초에 무엇을 조심해야 하는지조차 알 수 없기 때문입니다.

★ Insight ─────────────────────────────────────
"복잡도"를 코드 줄 수나 기능 개수로 착각하기 쉽지만, 실제 정의는 **이해·수정의 어려움**입니다. 같은 기능을 하는 1000줄짜리 잘 구조화된 코드가, 200줄이지만 뒤엉킨 코드보다 복잡도가 낮을 수 있습니다.
─────────────────────────────────────────────────

---

### 3. 복잡도의 두 근원: 의존성과 모호성

Ousterhout는 복잡도가 생기는 원인을 두 가지로 압축합니다.

1. **의존성(Dependency)** — 코드 한 부분을 이해하거나 수정하려면 다른 부분도 함께 알아야 하는 관계. 의존성 자체를 완전히 없앨 수는 없지만(소프트웨어는 본질적으로 협력하는 부품들의 집합), **필요 없는 의존성을 제거하고, 남는 의존성은 최대한 단순하고 명시적으로 만드는 것**이 설계의 목표입니다.
2. **모호성(Obscurity)** — 중요한 정보가 코드에서 명확히 드러나지 않는 상태. 이름이 모호한 변수, 문서화되지 않은 암묵적 규칙, 일관성 없는 패턴 등이 원인이며, 앞서 말한 "unknown unknowns"를 직접적으로 만들어냅니다.

이 둘이 서로 얽히면서 복잡도는 **선형이 아니라 누적적으로(점점 가속하며)** 증가하는 경향이 있습니다. 초기에는 사소해 보이는 의존성 하나가, 코드가 커지면서 여러 겹으로 쌓여 나중에는 손댈 수 없는 "레거시"가 됩니다.

---

### 4. 필수적 복잡도 vs 우발적 복잡도

이 개념은 Fred Brooks가 1986년 "No Silver Bullet" 논문에서 제시한 구분과 직결됩니다.

| 구분 | 정의 | 제거 가능 여부 |
|---|---|---|
| **필수적 복잡도 (Essential complexity)** | 해결하려는 **문제 도메인 자체**가 본질적으로 갖는 복잡함 (세금 계산 규칙, 물류 최적화 제약 등) | 근본적으로 제거 불가능 — 다만 시스템 어딘가로 "재배치"는 가능 |
| **우발적 복잡도 (Accidental complexity)** | 문제 해결 과정에서 **도구·언어·설계 미숙·인프라 한계** 때문에 부수적으로 발생한 복잡함 | 원칙적으로 제거·완화 가능 |

Brooks의 유명한 결론은 "은탄환은 없다" — 즉 필수적 복잡도를 마법처럼 없애는 도구는 존재할 수 없으며, 개발 생산성 향상은 대부분 **우발적 복잡도를 줄이는 데서** 온다는 것입니다. 좋은 설계란 필수적 복잡도는 도메인 모델에 정직하게 반영하고, 우발적 복잡도는 최대한 걷어내는 작업입니다.

---

### 5. 복잡도를 관리하는 실전 전략

| 전략 | 핵심 아이디어 |
|---|---|
| **정보 은닉 (Information Hiding, David Parnas)** | 모듈 내부의 결정(구현 세부사항)을 외부에 숨겨, 외부는 "무엇을 하는지"만 알고 "어떻게 하는지"는 몰라도 되게 만듦 |
| **깊은 모듈 (Deep Module)** | 인터페이스는 단순한데 내부 기능은 강력한 모듈을 지향. 반대로 인터페이스가 복잡한데 기능은 단순한 "얕은 모듈(shallow module)"은 복잡도만 늘리고 얻는 게 적음 |
| **전략적 프로그래밍 (Strategic Programming)** | "일단 동작하게만 만들자(전술적 프로그래밍, tactical programming)"는 태도 대신, **매 작업마다 설계를 조금씩 개선하는 것 자체를 목표**로 삼는 태도 |
| **모듈화·추상화·캡슐화** | 시스템을 독립적으로 이해 가능한 단위로 쪼개고, 각 단위가 자신의 책임 범위 안에서만 변경 영향을 받도록 경계를 명확히 함 |
| **일관성(Consistency)** | 같은 종류의 문제는 코드베이스 전체에서 같은 방식으로 해결 — 새로운 패턴을 배우는 인지 부하를 줄임 |

이 전략들의 공통점은 "복잡도를 0으로 만든다"가 아니라 **복잡도가 누적되는 속도를 늦추고, 필요한 곳에만 국소화(localize)한다**는 데 있습니다. Aras 등 현업 엔지니어링 조직들도 "훌륭한 엔지니어링 팀은 복잡도를 없애려 하지 않고, 그것을 다스린다(manage, not eliminate)"는 관점을 강조합니다.

---

### 6. 2026년 시점에서의 재조명 — AI 코드 생성과 복잡도

최근 논의에서 흥미로운 지점은, **생성형 AI가 복잡도를 "제거"하는 것이 아니라 "이동"시킨다**는 관찰입니다. AI가 코드를 빠르게 생성하면서 사람이 직접 타이핑하는 부담(우발적 복잡도의 일부)은 줄었지만, 대신 다음과 같은 새로운 복잡도가 생겨나고 있습니다.

- **리뷰 병목**: AI가 코드를 작성하는 속도가 인간이 검토(review)할 수 있는 속도를 앞질러, "이해하고 책임질 수 있는 코드의 총량"이 병목이 됨
- **모호성 증가 위험**: AI가 생성한 코드는 스타일·패턴이 일관되지 않을 수 있어 오히려 obscurity(모호성)를 늘릴 수 있음
- **비용·인프라 복잡도**: LLM 기반 애플리케이션/에이전트를 운영하는 데 따르는 새로운 종류의 복잡도(비용 최적화, 프롬프트/컨텍스트 관리, 에이전트 간 조율)

즉, "프로그래머의 핵심은 복잡도 관리다"라는 명제는 AI 시대에도 유효할 뿐 아니라, **관리해야 할 복잡도의 종류가 코드 구조에서 "AI가 만든 코드에 대한 이해·검증·거버넌스"로 확장**되고 있다는 게 최근 논의의 방향입니다.

---

### 7. "단순화"와 "추상화" — 정확히는 무엇을 하는가

이 명제를 한 문장으로 요약하면 "좋은 프로그래머는 복잡한 것을 단순화하고, 복잡도 높은 시스템을 잘 추상화한다"가 됩니다. 방향은 정확하지만, **"단순화"와 "추상화"가 작동하는 대상이 서로 다르다**는 점을 구분하면 더 정밀해집니다.

| | 대상 | 실제로 하는 일 |
|---|---|---|
| **단순화(Simplification)** | 우발적 복잡도 | 불필요한 의존성·모호성을 **제거**함 (예: 중복 로직 통합, 불필요한 설정 옵션 삭제) |
| **추상화(Abstraction)** | 필수적 복잡도 | 도메인이 본질적으로 가진 복잡함을 없애지 못하니, **단순한 인터페이스 뒤에 감춰서** 그 복잡함과 마주치는 지점을 최소화함 (예: SQL 옵티마이저가 실행 계획의 복잡함을 `SELECT` 한 줄 뒤에 숨김) |

즉 좋은 프로그래머의 실력은 두 가지가 합쳐진 것입니다.

1. **없앨 수 있는 복잡도는 실제로 없앤다** (단순화) — 여기서 실패하면 그냥 지저분한 코드가 됩니다.
2. **없앨 수 없는 복잡도는 깊은 모듈(deep module)의 단순한 인터페이스 뒤로 격리한다** (추상화) — 여기서 실패하면 "인터페이스는 복잡한데 내부는 단순한" 얕은 모듈(shallow module)이 되어, 오히려 복잡도를 재배치만 하고 줄이지는 못합니다.

바꿔 말하면, 추상화는 복잡도를 "없애는" 것이 아니라 **"그 복잡도를 지금 당장 신경 쓰지 않아도 되는 곳으로 옮기는 것"**에 가깝습니다. 좋은 추상화란 이 이동이 거의 완벽해서, 인터페이스를 쓰는 사람이 내부의 필수적 복잡도를 거의 의식하지 않아도 되는 상태를 말합니다.

#### 실전 예시 — 쿠버네티스는 "분산 시스템 복잡도"를 어떻게 계층별로 감추는가

쿠버네티스는 이 원칙이 시스템 레벨로 확장된 대표적 사례입니다. "여러 대의 서버에 컨테이너를 배치하고, 장애를 감지해 재시작하고, 트래픽을 분산하고, 요청을 라우팅한다"는 일은 분산 시스템 이론상 **필수적 복잡도**(합의 알고리즘, 네트워크 파티션 처리, 스케줄링 최적화 등은 근본적으로 어려운 문제)입니다. 쿠버네티스는 이 복잡도를 **없애지 않고, 서로 다른 관심사를 감추는 여러 겹의 추상화 계층**으로 재배치합니다.

| 계층 | 감추는 필수적 복잡도 | 사용자에게 노출되는 단순한 인터페이스 |
|---|---|---|
| **Node** | 실제 물리/가상 서버의 자원(CPU·메모리·디스크) 관리, kubelet의 컨테이너 런타임 제어 | "스케줄링 가능한 자원 풀 하나" |
| **Pod** | 컨테이너 그룹의 네트워크 네임스페이스 공유, cgroup 격리 | "같이 뜨고 같이 죽는 배포 단위 하나" |
| **Service / kube-proxy** | 파드가 재시작될 때마다 IP가 바뀌는 문제, egress 시의 SNAT 처리([`kubernetes/pod-outbound-egress-traffic-configuration.md`](../kubernetes/pod-outbound-egress-traffic-configuration.md) 참고) | "고정된 가상 IP/DNS 이름 하나" |
| **Ingress / Controller** | L7 라우팅 규칙, TLS 종료, 로드밸런서 프로비저닝 | "호스트/경로별 라우팅 규칙 선언 하나" |
| **kube-scheduler / etcd** | 어느 파드를 어느 노드에 배치할지 결정하는 제약 충족 문제, 클러스터 상태의 분산 합의(Raft) | "선언한 desired state가 알아서 유지됨" |

중요한 것은, 이 계층들이 "하나의 추상화 안에 있는 세부사항 나열"이 아니라 **각자 독립적으로 이해 가능한 별도의 깊은 모듈**이라는 점입니다. Pod를 쓰는 사람은 Node 내부의 kubelet 동작을 몰라도 되고, Ingress를 쓰는 사람은 Service의 kube-proxy 구현(iptables vs IPVS vs eBPF)을 몰라도 됩니다 — 이는 정보 은닉(Information Hiding) 원칙이 계층마다 반복 적용된 결과입니다. 그리고 실제 분산 시스템의 필수적 복잡도(합의, 장애 감지, 네트워크 재작성)는 사라진 게 아니라 **etcd·컨트롤러·CNI 플러그인 내부로 옮겨져** 대부분의 사용자가 마주치지 않을 뿐입니다.

---

### 8. 결론

"프로그래머의 핵심은 복잡도를 관리하는 것이다"는 단순한 격언이 아니라, 소프트웨어 공학이 지난 수십 년간 반복 확인해온 구조적 사실에 가깝습니다.

- 개발의 근본 제약은 **인간의 이해 능력**이다.
- 복잡도는 변경 증폭·인지 부하·unknown unknowns로 나타난다.
- 복잡도의 원인은 **의존성**과 **모호성**이며, 필수적 복잡도(제거 불가)와 우발적 복잡도(제거 가능)로 나뉜다.
- 좋은 프로그래머는 기능을 "동작하게" 만드는 사람이 아니라, **시간이 지나도 이해 가능한 구조를 유지하며** 기능을 추가하는 사람이다.

---

## Sources

- [Managing Complexity: The Primary Concern of Software Engineering — Russ Poldrack](https://russpoldrack.substack.com/p/managing-complexity-the-primary-concern)
- [Great Engineering Teams Don't Reduce Complexity, They Manage It — Aras](https://aras.com/en/blog/managing-complexity-in-software-engineering-aras)
- [The Next Software Engineering Skill Is Not Coding Faster. It Is Managing AI-Generated Complexity — DEV Community](https://dev.to/asgharali/the-next-software-engineering-skill-is-not-coding-faster-it-is-managing-ai-generated-complexity-9pf)
- [The challenge for software engineers in 2026 — and beyond — CIO Dive](https://www.ciodive.com/news/software-development-challenges-2026-CIO/808413/)
- [A Note on Essential Complexity — olano.dev](https://olano.dev/blog/a-note-on-essential-complexity/)
- [Accidental or Essential? Understanding Complexity in Software Design — Ian Duncan](https://www.iankduncan.com/engineering/2025-05-26-when-is-complexity-accidental)
- [The Philosophy of Software Design – with John Ousterhout — Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/the-philosophy-of-software-design)
- [A Philosophy of Software Design (short summary) — System Design Space](https://system-design.space/en/chapter/philosophy-design-book/)

---

## 관련 문서

- [`cs-fundamentals/entity-concept.md`](./entity-concept.md) — 식별자·경계를 통해 도메인 복잡도를 다루는 방법(Entity/Value Object)
- [`software-architecture/`](../software-architecture/) — 복잡도를 다루기 위한 구체적 아키텍처 패턴(DDD, 헥사고날, 클린 아키텍처)
