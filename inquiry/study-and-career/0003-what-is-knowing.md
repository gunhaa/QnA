# "안다(knowing)"는 건 무엇인가 — 철학(인식론)과 컴퓨터과학의 정의

관련 글: [맞는 대답·행동을 하면 "아는" 걸까?](does-right-answer-mean-knowing.md)

## 쉬운 설명

"안다"는 **우연히 맞힌 게 아니라, 맞을 만한 이유가 있어서 맞는 것**이다. 동전 던지기로 정답을 맞혔다고 "안다"고 하지 않는다. 철학은 이 "맞을 만한 이유"가 정확히 무엇인지 2,000년 넘게 따지고 있다. 컴퓨터과학은 이를 피해 가면서 **"내가 가진 정보로 다른 가능성을 모두 지울 수 있으면 안다"** 처럼 계산할 수 있는 정의를 만들어 쓴다.

## 일반 설명

### 1. 철학: 인식론(epistemology)

#### 1-1. "안다"의 세 종류

| 종류 | 예 | 비고 |
|---|---|---|
| **명제적 지식** (knowing-that, propositional knowledge) | "지구가 둥글다는 걸 안다" | 인식론 논쟁 대부분의 대상 |
| **방법적 지식** (knowing-how, 절차적 지식) | "자전거 탈 줄 안다" | Ryle(1949): 명제로 바꿀 수 없는 능력이라는 주장 |
| **친숙지** (knowledge by acquaintance) | "서울을 안다", "그 사람을 안다" | Russell: 직접 경험해서 아는 것 |

이하 내용은 명제적 지식 기준이다.

#### 1-2. 고전적 정의: JTB (Justified True Belief)

플라톤 『테아이테토스』에서 유래한 **삼원 분석(tripartite analysis)**. S가 p를 안다 ⇔

1. **p가 참이다** (truth) — 거짓은 알 수 없다. 이를 지식의 **사실성(factivity)** 이라고 한다.
2. **S가 p를 믿는다** (belief)
3. **S의 믿음이 정당화되어 있다** (justification) — 근거가 있다.

세 조건이 각각 **필요**하고 함께 **충분**하다는 것이 전통적인 견해였다.

#### 1-3. 게티어 문제(Gettier problem, 1963)

Edmund Gettier가 3쪽짜리 논문으로 **JTB가 충분하지 않다**는 반례를 제시했다.

> 멈춘 시계를 보고 "지금 3시"라고 믿었는데, 마침 실제로 3시였다.
> 참이고, 믿었고, 시계를 봤으니 정당화도 됐다. 그런데 이걸 "안다"고 할 수 있나?

핵심은 **인식적 운(epistemic luck)** 이다. 정당화와 진리가 **우연히** 맞물렸을 뿐이다. 이후 인식론의 상당 부분은 "네 번째 조건"을 찾는 작업이 되었다.

#### 1-4. 게티어 이후의 주요 입장

| 입장 | 핵심 주장 | 대표 |
|---|---|---|
| 거짓 전제 배제 (no false lemmas) | 정당화 과정에 거짓 전제가 끼면 지식이 아니다 | Clark |
| 인과론 (causal theory) | 믿음이 사실에 의해 **인과적으로** 생겨야 한다 | Goldman(1967) |
| **신빙론 (reliabilism)** | 정당화 대신 **믿음을 만든 과정이 신뢰할 만한지**를 본다. 신뢰할 만한 과정이 만든 참인 믿음이 지식이다 | Goldman(1979) |
| 민감성/추적 (sensitivity, tracking) | p가 거짓이었다면 S는 p를 믿지 않았을 것이다 | Nozick(1981) |
| 안전성 (safety) | 비슷한 상황에서 S가 p를 믿었다면 p는 쉽게 거짓이 되지 않았을 것이다 | Sosa, Williamson |
| **덕 인식론 (virtue epistemology)** | 운이 아니라 **인지적 능력(덕)** 덕분에 참에 도달한 것이 지식이다 | Sosa, Zagzebski |
| **지식 우선 (knowledge-first)** | 지식은 분해할 수 없는 기본 개념이다. "사실을 함축하는 가장 일반적인 정신 상태"이며, 오히려 믿음·정당화를 지식으로 설명해야 한다 | Williamson(2000) |

정당화 근거가 반드시 **주체가 의식적으로 접근할 수 있는 것**이어야 하는지를 두고도 입장이 갈린다.

- **내재주의(internalism)**: 그래야 한다.
- **외재주의(externalism)**: 그럴 필요 없다. 신빙론이 대표적이다.

현재 합의된 단일 정의는 없다. 다만 **"참 + 믿음 + 운이 아닌 연결"** 이 필요하다는 직관은 대체로 공유된다.

### 2. 컴퓨터과학: 계산 가능한 "앎"의 정의

#### 2-1. 인식 논리 (epistemic logic) — 가능 세계 의미론

Hintikka(1962)가 체계화했고, Kripke 의미론을 쓴다.

- 에이전트 i가 **"지금 가능하다고 여기는 세계들(possible worlds)"** 의 집합을 둔다.
- **K_i φ (i가 φ를 안다) ⇔ i가 가능하다고 여기는 모든 세계에서 φ가 참이다.**
- 즉 "안다" = **"다른 가능성을 모두 배제할 수 있다."**

표준 공리계 **S5**:

| 공리 | 식 | 의미 |
|---|---|---|
| K (분배) | K(φ→ψ) ∧ Kφ → Kψ | 아는 것의 논리적 귀결도 안다 |
| T (사실성) | Kφ → φ | 아는 것은 참이다 (JTB의 truth 조건과 같다) |
| 4 (양의 내성) | Kφ → KKφ | 알면, 안다는 것도 안다 |
| 5 (음의 내성) | ¬Kφ → K¬Kφ | 모르면, 모른다는 것도 안다 |

- **믿음(belief)** 은 보통 T 대신 D(일관성)를 쓰는 **KD45**로 모델링한다. 믿음은 틀릴 수 있기 때문이다.
- 한계는 **논리적 전지(logical omniscience)** 문제다. 공리 K 때문에 공리에서 따라 나오는 정리를 전부 "안다"고 처리된다. 실제 에이전트(사람, 프로그램)는 그렇지 않으므로 awareness logic, algorithmic knowledge 같은 대안이 제안되었다. 5번 공리가 너무 강하다며 **S4**를 지지하는 견해도 있다.

#### 2-2. 분산 시스템에서의 "앎"

Halpern & Moses(1990) "Knowledge and Common Knowledge in a Distributed Environment", Fagin·Halpern·Moses·Vardi 『Reasoning About Knowledge』(1995).

- **프로세스 i가 φ를 안다 ⇔ i의 로컬 상태(local state)가 같은 모든 실행 지점에서 φ가 참이다.**
  - 철학의 정당화나 믿음 개념을 쓰지 않는다. **관측 가능한 정보로 구별할 수 없는 상황들**만으로 정의한다.
- 지식의 단계:
  - **분산 지식(distributed knowledge)**: 모두의 정보를 합치면 알 수 있다.
  - **모두가 안다(E φ)**
  - **공통 지식(common knowledge, C φ)**: 모두가 알고, 모두가 안다는 걸 모두가 알고, … 이것이 무한히 반복된다.
- 중요한 결과: **메시지 전달이 보장되지 않는 시스템에서는 공통 지식을 달성할 수 없다.** 두 장군 문제(coordinated attack)가 불가능한 이유를 "앎"의 언어로 증명한 것이다. 합의(Byzantine agreement)·커밋 프로토콜 분석에 쓰인다.

#### 2-3. AI 지식 표현 (Knowledge Representation)

- **Newell(1982) "The Knowledge Level"**: 지식이란 **에이전트의 행동을 합리성 원리로 예측할 수 있게 해 주는, 에이전트에게 귀속시키는 무언가**다. 내부 구현(심볼, 신경망)과 무관하게 **행동 수준에서 정의**한다는 점에서 기능주의적이다.
- 실무에서 지식은 **기호 + 추론 규칙**으로 표현한다. 지식 베이스(KB), 온톨로지, 시맨틱 네트워크, 프레임, 기술 논리(Description Logic, OWL의 기반)가 여기에 속한다. 이 관점에서 "안다" = **KB에서 도출(entail)할 수 있다.**
- **DIKW 피라미드**(Ackoff 1989, 데이터 → 정보 → 지식 → 지혜): 경영·정보학에서 쓰는 위계 모델이다. 엄밀한 정의라기보다는 비유에 가깝다는 비판이 많다.

#### 2-4. LLM은 "아는가"? (최근 논쟁)

- **정의에 따라 답이 갈린다.** Fierro et al.(2024, "Defining Knowledge: Bridging Epistemology and LLMs")은 JTB, 신빙론, 덕 인식론, 지식 우선 등 다섯 가지 철학적 정의를 LLM에 적용했다. 정의마다 "GPT-4가 지구가 둥글다는 걸 아는가"의 답이 달라짐을 보였다.
- **믿음이 있는가**: Herrmann & Levinstein(2025, *Minds and Machines*)은 내부 활성값(probing)과 행동을 함께 보고, LLM 안에 **믿음 표상(belief representation)** 이 있는지 판정하는 네 가지 기준을 제안했다.
- **암묵지(tacit knowledge)**: Budding(2025, *Philosophy of Science*)은 일부 LLM이 암묵적 지식 구조의 조건을 충족한다는 예비적 증거가 있다고 본다.
- **회의론**: LLM의 출력은 텍스트 패턴에만 근거(grounding)하고 참·거짓을 스스로 반성하지 않으므로 믿음 자체가 없다는 입장이다.
- 인식론 개념에 대응시켜 볼 수 있다.
  - **환각(hallucination)**은 정당화도 진리도 없는 출력이다.
  - **우연히 맞은 답**은 게티어 사례와 비슷하다.
  - **보정(calibration)**, 즉 확신도와 정답률이 일치하는지는 신빙론의 "신뢰할 만한 과정"에 대응한다.

### 3. 한눈에 비교

| 관점 | "S가 p를 안다"의 정의 | 무엇을 따지나 |
|---|---|---|
| 고전 철학 (JTB) | p가 참 + S가 믿음 + 정당화됨 | 근거 |
| 게티어 이후 철학 | JTB + 운이 아님 (신빙성·안전성·덕 등) | 참과 믿음의 **연결 방식** |
| 지식 우선 (Williamson) | 분해 불가능한 기본 정신 상태 | — |
| 인식 논리 | S가 가능하다고 여기는 모든 세계에서 p가 참 | **배제할 수 있는 가능성** |
| 분산 시스템 | 로컬 상태가 같은 모든 실행에서 p가 참 | **관측 가능한 정보** |
| AI 지식 표현 | KB에서 p를 도출할 수 있음 / 행동을 합리적으로 설명함 (Newell) | **추론 가능성·행동** |
| LLM 논쟁 | 위 정의 중 무엇을 택하느냐에 달림 | 내부 표상 + 행동 + 신뢰성 |

**공통점**: 모든 정의가 **사실성(아는 것은 참이다, Kφ → φ)** 만큼은 공유한다. 차이는 **"참인 믿음"과 "그냥 맞힌 것"을 무엇으로 구분하느냐**에 있다.

- 철학은 이를 근거, 과정, 능력으로 구분하려 한다.
- 컴퓨터과학은 정보로 **다른 가능성을 지울 수 있는가**로 구분한다.

## 참고

- [SEP — The Analysis of Knowledge](https://plato.stanford.edu/archives/fall2012/entries/knowledge-analysis)
- [SEP — Epistemology](https://plato.stanford.edu/archives/spr2018/entries/epistemology/)
- [SEP — Reliabilist Epistemology](https://plato.stanford.edu/entries/reliabilism)
- [SEP — Virtue Epistemology](https://plato.stanford.edu/archives/spr2005/entries/epistemology-virtue/)
- [Halpern & Moses — A Guide to the Modal Logics of Knowledge and Belief](https://typeset.io/pdf/a-guide-to-the-modal-logics-of-knowledge-and-belief-rq7wph8n5h.pdf)
- [Fagin, Halpern, Moses, Vardi — Reasoning About Knowledge (1995)](https://courses.cs.umbc.edu/471/papers/reasoning_about_knowledge.pdf)
- [Imperial College — Epistemic Logic lecture notes](https://www.doc.ic.ac.uk/~mjs/teaching/ModalTemporal499/Epistemic_499_v0809_2up.pdf)
- [Fierro et al. — Defining Knowledge: Bridging Epistemology and Large Language Models (arXiv 2410.02499)](https://arxiv.org/html/2410.02499v1)
- [Budding — What Do Large Language Models Know? (Philosophy of Science, 2025)](https://resolve.cambridge.org/core/journals/philosophy-of-science/article/what-do-large-language-models-know-tacit-knowledge-as-a-potential-causalexplanatory-structure/9475F1504081116099098C37D6F57611)
- [Herrmann & Levinstein — Standards for Belief Representations in LLMs](https://philarchive.org/archive/HERSFB-2)
- [Psychology Today — What Do LLMs Really Know?](https://psychologytoday.com/gb/blog/the-digital-self/202409/what-do-llms-really-know)
