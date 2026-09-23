# 게임플레이 에이전트: FSM vs LLM 비중, 성능 비교, 일반적 구현 방식

## 쉬운 설명

로봇 청소기를 생각해 보세요.

- **FSM(유한 상태 기계)** 은 "벽에 부딪히면 돌아라, 먼지 있으면 빨아들여라" 같은 **딱 정해진 규칙표**예요. 0.001초 만에 결정하고, 절대 이상한 짓을 안 해요. 대신 처음 보는 상황에선 멍청해요.
- **LLM** 은 청소기에 **말 잘하는 친구**를 태운 거예요. "오늘은 손님 오니까 거실부터 치우자" 같은 판단을 하지만, 생각하는 데 1~2초 걸리고 돈도 들고 가끔 엉뚱한 소리를 해요.

그래서 요즘 게임은 **둘 다** 씁니다. 몸은 FSM(빠르고 안전한 반사신경), 머리는 LLM(가끔 하는 큰 결정과 대사). 비율로 치면 **실행 99% FSM, 결정 1% LLM** 정도예요.

---

## 일반 설명

### 1. 용어 정리 — "게임플레이 에이전트"의 두 갈래

질문의 "게임플레이 에이전트"는 실제로 서로 다른 두 문제를 가리킵니다. 아키텍처 선택이 완전히 달라지므로 먼저 구분해야 합니다.

| 구분 | NPC 에이전트 (Game-side AI) | 플레이어 에이전트 (Agent-plays-game) |
|---|---|---|
| 목적 | 게임 안 캐릭터를 살아있게 | AI가 게임을 직접 플레이/클리어 |
| 제약 | 16ms 프레임 예산, 수백~수천 개체, 결정론 요구 | 지연 허용, 개체 1개, 성능(승률)이 전부 |
| 주류 기법 | FSM / Behavior Tree / GOAP / Utility AI + 선택적 LLM | LLM/VLM + 스킬 라이브러리, 또는 RL |
| 대표 사례 | InZOI Smart Zoi, NVIDIA ACE, Inworld | Voyager, GamingAgent, lmgame-Bench |

아래에서는 둘을 모두 다루되, 실무 비중이 큰 NPC 에이전트를 중심으로 설명합니다.

---

### 2. 고전 기법 스택 — 아직도 지배적인 이유

2026년 현재도 상용 게임 AI의 뼈대는 다음 4가지입니다.

#### 2.1 FSM (Finite State Machine)
상태(Idle, Patrol, Chase, Attack, Flee)와 전이 조건의 집합. 구현이 가장 단순하고 디버깅이 쉽지만, 상태가 N개면 전이가 최대 N²개로 폭발합니다. 현대 상용 게임에서 **단독으로** 쓰이는 경우는 드물고, BT의 리프 노드 내부나 애니메이션 상태 관리(Animation State Machine)에 주로 남아 있습니다.

#### 2.2 Behavior Tree (BT)
FSM의 전이 폭발을 해결한 계층적 구조. `Selector`(우선순위 OR), `Sequence`(AND), `Decorator`(조건/반복), `Leaf`(실제 행동)로 구성되며 매 틱(tick)마다 루트에서 순회합니다.

```
Selector (살아남기 우선)
├── Sequence [HP < 20%?] → [회복약 사용]
├── Sequence [적 발견?]  → [조준] → [사격]
└── [순찰]
```

BT가 표준이 된 이유는 **모듈성(서브트리 재사용)** 과 **반응성(매 틱 재평가)** 입니다. Unreal Engine의 Behavior Tree + Blackboard, Unity의 NodeCanvas/Behavior Designer가 모두 이 모델입니다.

#### 2.3 GOAP (Goal-Oriented Action Planning)
행동마다 전제조건(precondition)과 효과(effect)를 선언하고, 목표 상태로부터 A* 역방향 탐색으로 행동 시퀀스를 생성합니다. F.E.A.R.(2005)가 대표작. "어떻게"를 일일이 짜지 않아도 되지만 탐색 비용이 있고, 디자이너가 결과를 예측하기 어렵습니다.

#### 2.4 Utility AI
각 행동에 대해 컨텍스트 기반 점수(curve/response function)를 계산하고 최고점(또는 가중 랜덤) 행동을 선택합니다. The Sims의 욕구 시스템이 전형. 연속적 우선순위 표현에 강하지만, 커브 튜닝이 예술의 영역입니다.

> **핵심**: 이 네 가지는 모두 **결정론적이고, 마이크로초 단위이며, 비용이 0**입니다. LLM은 이 세 가지 특성을 전부 포기합니다.

---

### 3. LLM을 넣으면 생기는 것과 잃는 것

#### 얻는 것
- **개방형 상호작용**: 사전 작성 대사 트리 없이 임의 입력에 응답
- **모호한 지시 해석**: "저 산 너머에 있는 걸 가져와" 같은 자연어 명령 → 행동 시퀀스
- **창발적 행동/서사**: 설계되지 않은 조합 발생
- **콘텐츠 생산 비용 절감**: 분기 대사를 수작업으로 쓰지 않아도 됨

#### 잃는 것 (실측치)
| 항목 | 수치 |
|---|---|
| 클라우드 LLM 2~3문장 응답 지연 | **0.8~2.5초** (몰입 파괴 임계) |
| NVIDIA ACE 클라우드 왕복 | 200~400ms, NPC 20개 동시에 sub-500ms 목표 |
| 상용 NPC 대화 단가 | 상호작용당 $0.004~$0.01, 실 운영에선 재시도·컨텍스트 증가로 **2~3배** |
| 로컬 7B~13B 추론 | 추론당 $0.00002~$0.00005 |
| FSM/BT 판정 | 마이크로초, $0 |

여기에 **결정론 상실**(같은 입력에 다른 출력 → QA 불가), **안전성 문제**(NPC가 세계관 밖 발언, 프롬프트 인젝션), **상태 일관성 문제**(LLM이 존재하지 않는 아이템을 준다고 말함)가 더해집니다.

마지막 항목이 실무에서 가장 치명적이며, 이것이 아래 "게임이 권위를 갖는다(game remains authoritative)" 원칙으로 이어집니다.

---

### 4. 실제 아키텍처 — 하이브리드 계층 분리

현업의 합의는 명확합니다. **LLM이 목표와 후보 행동을 제안하고, 규칙 기반 컴포넌트가 안전성·타이밍·도메인 규칙(쿨다운 등)을 강제한다.**

#### 4.1 표준 3계층 구조

```
┌─────────────────────────────────────────────┐
│ L3: 숙고 (LLM)          호출 주기: 수 초~분  │
│  - 목표 설정, 장기 계획, 대사 생성           │
│  - 자연어 명령 해석 → 툴 콜                  │
└────────────────┬────────────────────────────┘
                 │ 목표/계획 하달 (Blackboard 기록)
┌────────────────▼────────────────────────────┐
│ L2: 전술 (BT / GOAP / Utility)  주기: 0.1~1s│
│  - 목표를 실행 가능한 행동 시퀀스로 분해     │
│  - 유효성 검증, 쿨다운/자원 제약 강제        │
└────────────────┬────────────────────────────┘
                 │ 행동 지시
┌────────────────▼────────────────────────────┐
│ L1: 반응 (FSM / Steering / A*)  주기: 매 프레임│
│  - 이동, 조준, 회피, 애니메이션 전이         │
│  - 절대 LLM을 거치지 않음                    │
└─────────────────────────────────────────────┘
```

**비중**: 실행 틱 수 기준으로 LLM은 전체의 **0.1~1% 미만**입니다. 체감 품질 기여도는 크지만, 호출 빈도는 극도로 낮게 유지하는 것이 설계 목표입니다.

#### 4.2 Blackboard — 두 세계의 접착제
LLM 출력이 직접 게임 상태를 바꾸는 일은 없어야 합니다. LLM은 Blackboard에 **구조화된 의도**만 씁니다.

```json
{ "goal": "retrieve_artifact", "target_id": "npc_merchant_03",
  "urgency": 0.7, "dialogue_tone": "suspicious" }
```

BT는 이 값을 읽어 자기 규칙으로 실행합니다. 존재하지 않는 `target_id`면 BT가 조용히 기각합니다. 이것이 환각을 게임 상태로부터 격리하는 핵심 장치입니다.

#### 4.3 LOD(Level of Detail) 기반 예산 배분
오픈소스 **openNPC**가 보여주는 실전 패턴입니다. 거리·가시성·중요도로 에이전트를 5개 티어로 나눠 연산을 차등 배분합니다.

| 티어 | 갱신 주기 | 정책 | 메모리 |
|---|---|---|---|
| CRITICAL | 100ms | Full RL | 사용 |
| HIGH | 250ms | Full heuristic | 사용 |
| MEDIUM | 500ms | 단순화 | 미사용 |
| LOW | 1000ms | 랜덤 | 미사용 |
| DORMANT | 정지 | 없음 | 미사용 |

이를 통해 "1000+ 에이전트를 선형 비용 증가 없이" 운용합니다. LLM은 여기서 **플레이어가 직접 말을 거는 NPC 한둘**에만 붙습니다.

#### 4.4 에스컬레이션(계층적 게이팅)
가장 비용 효율적인 패턴은 **평소엔 규칙, 필요할 때만 LLM**입니다.

```
플레이어 입력
  → [분류기] 사전 정의된 인텐트인가?
      Yes → BT 대사 노드 (0ms, $0)         ← 트래픽의 80~90%
      No  → 로컬 SLM (Qwen 0.5B~3B, ~150ms) ← 10~15%
              해결 못함 → 클라우드 LLM (~1s, $$) ← 1~5%
```

`bunnyland-server`의 실험 이슈가 정확히 이 "1-NPC hybrid policy with LLM escalation vs LLM-every-turn baseline" 비교를 다룹니다. InZOI(크래프톤)의 Smart Zoi도 **온디바이스 소형 언어 모델**을 NVIDIA ACE 위에 얹은 형태로, 클라우드 의존을 피한 상용 사례입니다.

#### 4.5 툴 콜 + 권위 있는 게임 상태
`OpenGameAgent`(C#, Unity/Godot/Unreal)의 설계 원칙이 명료합니다.

- 개발자가 게임 소유 툴(`move`, `inspect`, `trade`)을 등록
- 모델은 **요청만** 하고, 게임 코드가 검증 → 올바른 스레드에서 실행 → **권위 있는 영수증(receipt)** 반환
- 바운디드 ReAct 루프: 단순 대화는 툴 없이 1회 응답으로 종료
- 액션 의도를 저널링해 크래시 내성 및 중복 실행 방지

> "The game remains authoritative over every state change." — LLM 통합 시 가장 중요한 한 문장입니다.

#### 4.6 LLM으로 BT를 *생성*하는 방식 (오프라인)
런타임에 LLM을 부르지 않는 우회로도 있습니다. **개발 시점에** LLM이 Behavior Tree나 실행 코드를 생성하고, 런타임은 순수 BT로만 동작시키는 방식입니다. 관련 연구로 *A Study on Training and Developing LLMs for Behavior Tree Generation*, *Game Agent Driven by Free-Form Text Command: Using LLM-based Code Generation and Behavior Branch* 등이 있습니다.

런타임 비용/지연/비결정성이 전부 0이 되므로, 상용 게임에서 가장 현실적인 LLM 활용 경로 중 하나입니다.

---

### 5. "어느 쪽이 성능이 좋은가"

**단일 답은 없습니다. 평가 축이 다릅니다.**

| 평가 축 | 우세 | 비고 |
|---|---|---|
| 초당 결정 처리량 | **FSM/BT 압도** | 마이크로초 vs 초 |
| 예측 가능성·QA 가능성 | **FSM/BT 압도** | 결정론 유무 |
| 개체 수 확장성 | **FSM/BT 압도** | 1000+ vs 수십 |
| 런타임 비용 | **FSM/BT 압도** | $0 vs 상호작용당 $0.004~ |
| 처음 보는 상황 일반화 | **LLM 우세** | 규칙 밖 상황 처리 |
| 자연어 이해/생성 | **LLM 독점** | 대체 불가 |
| 개방형 장기 탐험 | **LLM 우세** | Voyager 참조 |
| 정밀 제어·최적 정책 | **RL 우세** | 좁은 도메인 한정 |

#### 게임을 "플레이하는" 쪽의 실측
- **Voyager**(Minecraft, LLM + 코드 스킬 라이브러리): 이전 SOTA 대비 고유 아이템 **3.3배**, 이동거리 **2.3배**, 테크트리 마일스톤 도달 **최대 15.3배 빠름**. 자동 커리큘럼 + 성장형 스킬 라이브러리 + 자기검증 반복 프롬프팅의 3요소가 핵심입니다.
- **lmgame-Bench**(ICLR 2026): 6개 게임을 Gym 스타일 API로 통합하고 perception/memory/reasoning 모듈을 토글해 능력을 분리 측정. 흥미로운 결과로 **단일 게임에 RL을 수행하면 미학습 게임과 외부 계획 과제로 전이**되는 현상이 보고되었습니다.
- **BT + RL 하이브리드**(AMD Schola): BT의 기호적 구조 + 신경망의 비기호적 학습 결합이 **어느 한쪽 단독보다 적응성·해석가능성·일반화 모두 우수**하다고 보고됩니다.

즉 **순수 LLM은 좁은 도메인의 잘 튜닝된 RL/BT를 이기지 못하고**, 반대로 **정해진 규칙 밖 상황에서는 LLM이 압도**합니다. 조합이 실제 최적해입니다.

---

### 6. 주요 오픈소스

| 프로젝트 | 언어/엔진 | 특징 |
|---|---|---|
| [openNPC](https://github.com/balaraj74/openNPC) | Python | 휴리스틱+PPO/DQN+LOD 5티어, **런타임 LLM 불필요** 설계. 대사/보스 전략에만 로컬 Qwen 0.5B 사용 |
| [OpenGameAgent](https://github.com/EricSun0218/OpenGameAgent) | C# / Unity·Godot·Unreal | 바운디드 ReAct, 게임 소유 툴 콜, 저널링, 27개 프로바이더 모델 디렉터리 |
| [GamingAgent](https://github.com/lmgame-org/GamingAgent) | Python | ICLR 2026. LLM/VLM 게임 에이전트 + 표준 평가 하네스 |
| [Voyager](https://github.com/MineDojo/Voyager) | Python | Minecraft 평생학습 에이전트. 스킬 라이브러리 패턴의 원전 |
| [Interactive-LLM-Powered-NPCs](https://github.com/AkshitIreddy/Interactive-LLM-Powered-NPCs) | Python | 기존 게임에 외부 주입. 벡터 스토어 메모리 + 립싱크(SadTalker) |
| [awesome-LLM-game-agent-papers](https://github.com/git-disl/awesome-LLM-game-agent-papers) | — | ACM CSUR 서베이 기반 논문 모음 |
| py_trees / BehaviorTree.CPP | Python / C++ | 범용 BT 런타임. L2 계층 구현에 적합 |

상용 스택으로는 **NVIDIA ACE**(Audio2Face 얼굴 애니메이션 + Riva STT/TTS — "NPC의 뇌가 아니라 뇌 주변부 마이크로서비스 모음", LLM은 선택)와 **Inworld**(플러그앤플레이 NPC 스튜디오에서 B2B AI 인프라로 포지션 전환)가 있습니다.

---

### 7. 실무 구현 체크리스트

1. **먼저 BT로 전부 만든다.** LLM 없이 동작하는 베이스라인이 있어야 fallback이 성립합니다.
2. **LLM은 대사부터.** 행동 결정에 손대기 전에 대사 생성만 교체하는 것이 리스크가 가장 낮습니다.
3. **Structured Output 강제.** 자유 텍스트가 아니라 JSON 스키마/함수 호출로만 받습니다.
4. **화이트리스트 툴만 노출.** 게임이 모든 상태 변경의 권위를 가집니다.
5. **예산 캡 3중으로.** 입력 토큰 제한, 모델·툴 데드라인, 플레이어당 호출 쿼터.
6. **타임아웃 = BT 폴백.** LLM이 800ms 안에 응답 못 하면 즉시 규칙 기반 행동으로 전환합니다.
7. **온디바이스 SLM 우선 검토.** InZOI 사례처럼 0.5B~3B 로컬 모델이 지연·비용·프라이버시를 동시에 해결하는 경우가 많습니다.
8. **비동기 설계.** LLM 호출이 게임 루프를 블로킹하면 안 됩니다. 결과는 다음 틱 이후 Blackboard로 도착합니다.
9. **캐싱·프리컴퓨팅.** 반복 상황의 응답은 캐시하고, 등장 확률 높은 대사는 사전 생성합니다.
10. **비결정성 QA 전략 수립.** 시드 고정 재현, 골든 응답 스냅샷, LLM-as-judge 회귀 테스트.

---

### 8. 요약

- **비중**: 실행 틱의 99% 이상은 FSM/BT/Utility, LLM은 0.1~1%의 고수준 결정과 대사에 한정.
- **성능**: 처리량·비용·예측가능성은 고전 기법 압승, 일반화·자연어·개방형 탐험은 LLM 압승. 축이 다르므로 "어느 쪽이 낫다"가 아니라 **어디에 배치하느냐**의 문제.
- **일반적 구현**: 3계층(숙고-전술-반응) + Blackboard 격리 + 툴 콜 화이트리스트 + LOD 예산 배분 + 타임아웃 폴백.
- **2026년 현실**: AI NPC는 여전히 **기본 기능이 아니라 사치 기능**이며, 온디바이스 SLM과 오프라인 BT 생성이 비용 문제의 현실적 돌파구입니다.

---

## Sources

- [awesome-LLM-game-agent-papers (ACM CSUR 서베이)](https://github.com/git-disl/awesome-LLM-game-agent-papers)
- [openNPC](https://github.com/balaraj74/openNPC)
- [OpenGameAgent](https://github.com/EricSun0218/OpenGameAgent)
- [GamingAgent (ICLR 2026)](https://github.com/lmgame-org/GamingAgent)
- [Interactive LLM Powered NPCs](https://github.com/AkshitIreddy/Interactive-LLM-Powered-NPCs)
- [Voyager: An Open-Ended Embodied Agent with LLMs](https://voyager.minedojo.org/) / [arXiv 2305.16291](https://arxiv.org/abs/2305.16291) / [GitHub](https://github.com/MineDojo/Voyager)
- [lmgame-Bench: How Good are LLMs at Playing Games? (ICLR 2026)](https://arxiv.org/abs/2505.15146)
- [Orak: A Foundational Benchmark for LLM Agents on Diverse Video Games](https://arxiv.org/pdf/2506.03610)
- [Combining Reinforcement Learning and Behavior Trees for NPCs in Video Games with AMD Schola](https://arxiv.org/pdf/2510.14154)
- [A Study on Training and Developing LLMs for Behavior Tree Generation](https://arxiv.org/pdf/2401.08089)
- [Behavior Trees Enable Structured Programming of Language Model Agents](https://arxiv.org/pdf/2404.07439)
- [Game Agent Driven by Free-Form Text Command: LLM-based Code Generation and Behavior Branch](https://arxiv.org/pdf/2402.07442)
- [Enhancing Game AI Behaviors with Large Language Models and Agentic AI (FSE 2025)](https://dl.acm.org/doi/10.1145/3696630.3728553)
- [RPGAgent (CHI 2026)](https://dl.acm.org/doi/10.1145/3772318.3790326)
- [bunnyland-server #22: hybrid policy with LLM escalation vs LLM-every-turn](https://github.com/thalismind/bunnyland-server/issues/22)
- [AI NPCs and Dialogue in Games: Tools and Reality Check (2026)](https://app.cinevva.com/guides/ai-npcs-dialogue)
- [LLM latency breaking immersion](https://theneuralbase.com/ai-for-gaming/learn/beginner/llm-latency-breaking-immersion/)
- [Cost scaling with players](https://theneuralbase.com/ai-for-gaming/learn/beginner/cost-scaling-with-players/)
- [LLM Inference Cost at Scale — Inworld AI](https://inworld.ai/resources/llm-inference-cost-at-scale)
- [AI NPCs Are Finally Shipping: NVIDIA ACE, Inworld, 2026](https://memedadacoin.com/blog/ai-npcs-nvidia-ace-inworld)
