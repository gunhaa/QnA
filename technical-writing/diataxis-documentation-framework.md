# Diátaxis 문서화 프레임워크

## 쉬운 설명

요리책을 떠올리면 된다. 처음 요리하는 사람에게 같이 해 보는 **수업**(튜토리얼), 오늘 저녁 김치찌개만 끓이면 되는 사람에게 **레시피**(How-to), 재료별 칼로리·보관법을 찾아보는 **재료 사전**(Reference), 왜 고기를 먼저 볶는지 알려 주는 **요리 이야기**(Explanation). 네 가지를 한 페이지에 섞으면 아무도 만족하지 못하니, 따로 쓰라는 게 Diátaxis다.

## 일반 설명

### 1. 개요

- **Diátaxis**는 기술 문서를 독자의 필요에 따라 **4종류**로 나누는 프레임워크다. 이름은 그리스어 *dia*(가로질러) + *taxis*(배열)에서 왔다.
- 만든 사람은 **Daniele Procida**다. Django 핵심 개발자 출신이고, 지금은 Canonical의 엔지니어링 디렉터다.
- Divio에서 일할 때 정리해 2017년 무렵 컨퍼런스에서 발표했고, 처음에는 **"The Documentation System"(Divio 문서 시스템)**이라는 이름이었다. 이후 Divio의 허락을 받아 독립 프로젝트 Diátaxis로 이름을 바꿨다.
- 채택 사례로 Canonical(Ubuntu), Django, Cloudflare, Gatsby 등이 자주 언급된다. Django는 2차 자료에서 언급된 사례다.

### 2. 4가지 문서 유형

| 유형 | 독자의 상태 | 목적 | 형식 | 비유 |
|---|---|---|---|---|
| **Tutorial (튜토리얼)** | 배우는 중 | 처음 해 보며 **익숙해지기** | 따라 하면 반드시 성공하는 단계별 수업. 설명은 최소 | 요리 수업 |
| **How-to guide (방법 안내)** | 일하는 중 | 특정 **목표 달성** | 이미 아는 사람을 위한 단계 목록. "X를 하려면" | 레시피 |
| **Reference (참조)** | 일하는 중 | 정확한 **사실 확인** | 기계(API·설정·명령)를 그대로 기술. 구조는 대상 구조를 따른다 | 재료 사전 |
| **Explanation (설명)** | 배우는 중 | **이해** — 왜 그런가 | 배경·설계 이유·대안·맥락을 논하는 서술 | 요리 이야기 |

### 3. 나침반(Compass): 2개 축

유형은 **두 질문**의 조합으로 정해진다.

| | **Acquisition (학습 — 공부할 때)** | **Application (적용 — 일할 때)** |
|---|---|---|
| **Action (행동 — 무엇을 하나)** | Tutorial | How-to guide |
| **Cognition (인지 — 무엇을 아나)** | Explanation | Reference |

1. 이 내용은 **행동**을 안내하나, **인지**(앎)를 전하나?
2. 독자가 **배우는 중**인가, **일하는 중**인가?

헷갈리는 쌍이 두 개 있다.
- **Tutorial vs How-to**: 둘 다 단계 목록이다. 하지만 튜토리얼은 **배움이 목적**이라 경로를 저자가 통제한다. How-to는 **일이 목적**이라 독자가 이미 목표를 알고 온다.
- **Reference vs Explanation**: 둘 다 지식이다. 하지만 Reference는 **"무엇"**을 건조하게 기술하고 찾아보는 용도다. Explanation은 **"왜"**를 논하고, 처음부터 읽는 용도다.

### 4. 핵심 원칙

1. **섞지 않는다**: 튜토리얼 중간에 긴 설계 배경을 넣거나 Reference에 사용 예를 길게 넣으면 두 독자 모두 손해다. 필요하면 다른 문서로 **링크**한다.
2. **유형별 문체가 다르다**: 튜토리얼은 "우리는 ~합니다", How-to는 명령형 "~하세요", Reference는 중립 기술, Explanation은 논의체("~때문이다", "반면").
3. **순서를 강제하지 않는다**: 독자가 튜토리얼 → How-to → Reference → Explanation 순으로 읽을 필요는 없다.
4. **조금씩 개선한다**: 전체 개편 대신, 페이지 하나를 골라 "이건 어떤 유형인가?"를 묻고 그 유형답게 고치기를 반복한다. 기존 문서 감사 때도 각 페이지에 유형을 태그하는 방법을 쓴다.

### 5. 문서화의 계보에서 위치

| 시기 | 흐름 | Diátaxis와의 관계 |
|---|---|---|
| 1960년대~ | **Information Mapping** (Robert Horn) — 정보를 유형별(7가지) 짧은 블록으로 나눔 | "유형별로 나눈다"는 발상의 선조 |
| 1990 | **Minimalism** (John Carroll, *The Nurnberg Funnel*) — 길고 통짜인 매뉴얼 대신 짧은 과업 중심 조각 | Tutorial·How-to의 과업 중심성 |
| 2004~2005 | **DITA** (IBM → OASIS 표준) — concept / task / reference 토픽 유형 | 유형 구분이 거의 같다. 다만 DITA는 XML 저작 표준이고, Diátaxis는 가벼운 사고 틀이다 |
| 2013~ | **Write the Docs**·**Docs as Code** — Git·이슈 트래커로 문서 관리 | Diátaxis가 퍼진 커뮤니티 |
| 2017~ | **Diátaxis** | 위 흐름을 독자 필요 2축으로 단순화 |

### 6. 비판·한계

- **Hillel Wayne, "Problems with the 4doc model"**:
  - 이 모델은 **도구**를 문서화하는 데 맞춰져 있다. 프로그래밍 언어나 프레임워크처럼 **순서대로 배워야 하는 대상**에는 잘 맞지 않는다. 4doc은 아무 데나 펼쳐 보는(random-access) 지향이기 때문이다.
  - Django 문서는 명목상 이 모델을 따르지만, Explanation이 Tutorial과 How-to를 합친 분량의 약 3배다. 그리고 그 Explanation 안에서 실제로 "가르친다".
  - **개념 개요(conceptual overview)** 범주가 없다.
- 공식 사이트도 4유형을 엄격한 규칙이 아니라 출발점으로 다룬다. 대상에 따라 혼합형이 필요할 수 있다.

### 7. 이 저장소에 대입해 보면

| Diátaxis 유형 | 이 저장소에서 해당하는 것 |
|---|---|
| Explanation | 대부분의 답변. 특히 역사 → 개요 → 트레이드오프 → 실패 구조 문서 (왜·대가·한계를 논함) |
| Reference | 목록·버전·가격·옵션 같은 사실 지식 답변 (예: 뉴스 API 목록) |
| How-to | "~하는 방법" 답변 (예: systemd 유닛 작성, GitHub Pages 게시 절차) |
| Tutorial | 거의 없음. 질문-답변 아카이브의 성격상 자연스럽다 |

- Wayne이 지적한 **"개념 개요" 빈칸**은 이 저장소의 `overview` 문서가 채우는 자리와 같다. 그리고 역사 → 개요 → 트레이드오프 → 실패 구조는 Explanation 하나를 **더 잘게 나눈 것**으로 볼 수 있다.
- Diátaxis는 한 제품 문서 **안에서** 유형을 나눈다. 주제(제품)가 먼저이고 유형은 그다음이다.

## 관련 문서

- [기술 문서화의 역사](./history.md)
- [역사 → 개요 → 트레이드오프 → 실패 학습 구조의 근거 방법론](../study-methods/history-overview-tradeoff-failure-learning-frameworks.md)

## 참고 자료

- [Diátaxis — map](https://www.diataxis.fr/map/)
- [Diátaxis — The compass](https://diataxis.fr/compass/)
- [Diátaxis — Colophon](https://www.diataxis.fr/colophon/)
- [Diátaxis: a new foundation for Canonical documentation](https://canonical.com/blog/diataxis-a-new-foundation-for-canonical-documentation?format=md)
- [What is Diátaxis and should you be using it? — I'd Rather Be Writing](https://idratherbewriting.com/blog/what-is-diataxis-documentation-framework)
- [The Divio Documentation System (AKA Diátaxis) — Peter Williams](https://newton.cx/~peter/2023/divio-documentation-system)
- [Development of Diátaxis](https://learning.cultofbits.com/docs/solutions/documentation-site/di-taxis-framework/development-of-di-taxis.html)
- [Problems with the 4doc model — Hillel Wayne](https://hillelwayne.com/post/problems-with-the-4doc-model/)
- [Writing better documentation with Diátaxis — SZTE](https://okt.inf.szte.hu/projektmunka/en/background/writing_better_documentation_with_diataxis.html)
- [Diátaxis: The 4 Types of Technical Documentation and Their Use with AI](https://pasqualepillitteri.it/en/news/5528/diataxis-framework-documentation-ai)
- [History of DITA — dita-lang.org](https://dita-lang.org/history)
- [Minimalism (technical communication) — Wikipedia](https://en.wikipedia.org/wiki/Minimalism_(technical_communication))
