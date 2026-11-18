# 게임 플레이 에이전트: 어떤 게임을 고를까 (StarCraft vs Minecraft), 그리고 이 구조에서 FSM의 역할

> 관련 문서: [FSM vs LLM 비중·성능·구현](./game-agent-fsm-vs-llm-architecture.md) · [라이브러리 언어 선택](./game-ai-library-language-choice.md)

## 쉬운 설명

**게임 선택**은 이렇게 생각하면 돼요.

- **스타크래프트**는 **체스 대회에 나가는 것**과 비슷해요. 규칙은 명확한데, 1초에 수십 번 손을 움직여야 하고 상대가 계속 공격해와요. 잘 만들어도 "이겼다/졌다" 하나만 나와서 뭘 잘못했는지 알기 어려워요.
- **마인크래프트**는 **레고 방에 혼자 들어가는 것**과 비슷해요. 아무도 안 쫓아오고, 시간을 들여 천천히 생각해도 되고, "나무 캤다 → 곡괭이 만들었다 → 철 캤다"처럼 **작은 성공이 계속 보여요.**

처음 만든다면 **레고 방(마인크래프트)** 이 훨씬 나아요.

**FSM은요?** 게임 밖에서 조종하는 로봇이라도, **"배고프면 먹어라, 맞으면 도망가라"** 같은 건 AI한테 물어볼 시간이 없어요. 몬스터가 때리는데 1초 동안 "음... 생각 중"이면 죽거든요. 그래서 **FSM은 여전히 필요한데, NPC를 움직이는 게 아니라 내 로봇의 반사신경 역할**을 해요.

---

## 일반 설명

### 1. 질문 정리

두 개의 질문이 섞여 있고, 사실 서로 연결되어 있습니다.

1. **어떤 게임을 고를 것인가** — StarCraft II vs Minecraft vs 그 외
2. **이 구조(게임 외부에서 플레이하는 에이전트)에서 FSM은 어디에 있는가** — 엔진 언어가 강제되지 않는데도 FSM이 필요한가

먼저 짚을 것: **질문의 전제가 맞습니다.** 앞 문서의 "엔진이 언어를 정한다"는 **NPC 에이전트(게임 안쪽)** 얘기였습니다. 지금 만들려는 건 **플레이어 에이전트(게임 바깥쪽)** 이고, 이건 별도 프로세스에서 네트워크 프로토콜이나 API로 게임을 조작합니다. **C++은 전혀 강제되지 않고, Python과 JS/TS가 오히려 주류입니다.**

---

### 2. 게임 선택 — 평가 축부터

에이전트 난이도를 결정하는 건 "게임이 재밌느냐"가 아니라 아래 6개입니다.

| 축 | 의미 | 쉬울수록 유리 |
|---|---|---|
| **관측 공간** | 상태를 어떻게 받는가 | 구조화된 JSON > 텍스트 > 픽셀 |
| **행동 공간** | 무엇을 할 수 있는가 | 이산·소수 > 연속·조합폭발 |
| **시간 압박** | 생각할 시간이 있는가 | 턴제 > 일시정지 가능 > 실시간 |
| **보상 밀도** | 진전이 자주 보이는가 | 촘촘함 > 희소함 |
| **API 성숙도** | 붙이기 쉬운가 | 활발히 유지보수 > 방치 |
| **사전 지식** | 도메인을 알아야 하는가 | 상식으로 커버 > 메타 지식 필수 |

---

### 3. StarCraft II 분석

#### 생태계
- **PySC2** — DeepMind × Blizzard의 SC2 Learning Environment. RL 연구용 Gym 인터페이스. 다만 **2022년 이후 사실상 유지보수가 정체**되어 있습니다.
- **python-sc2** (BurnySc2 포크) — 커뮤니티 유지 봇 API 클라이언트. 실제 봇 래더 참가자들이 쓰는 쪽.
- **[TextStarCraft2](https://github.com/histmeisah/Large-Language-Models-play-StarCraftII/)** — LLM이 플레이할 수 있게 **순수 언어 환경으로 감싼** 것. NeurIPS 2024 논문의 구현체.

#### LLM 관점 성과
TextStarCraft2 논문의 **Chain of Summarization(CoS)** 이 핵심 기법입니다. 컴퓨터 캐시 계층과 RL의 frame-skipping에서 착안해, **단일 프레임 요약**(원시 관측 → 압축)과 **다중 프레임 요약**(게임 흐름 분석 → 명령 추천 → 전략 결정)으로 나눕니다. 결과적으로 LLM 에이전트가 **내장 AI Harder(Lv5)** 를 격파했습니다(전체 10단계 중, Lv10은 CheatInsane).

흥미로운 비교: **AlphaStar는 마이크로 컨트롤이 압도적이지만 전략 선택이 비합리적일 때가 있고, LLM 에이전트는 일관되게 논리적인 의사결정**(위협 선제 예측, 전략적 계획)을 보인다는 것입니다. 즉 RTS에서 LLM의 강점은 **마이크로가 아니라 매크로**입니다.

#### 장단점

| ✅ 장점 | ❌ 단점 |
|---|---|
| 승/패가 명확한 평가 지표 | **실시간 — LLM 1초 지연이 치명적** |
| 전략 추론 연구로 어필 좋음 | 액션 공간이 조합 폭발(유닛 × 위치 × 타이밍) |
| 논문·선행연구 풍부 | **SC2 도메인 지식 필수** — 빌드오더·상성·타이밍을 모르면 평가 불가 |
| 매크로 전략이 LLM 강점 영역 | 보상 희소 — 20분 게임 끝에 신호 1개 |
| | 게임 클라이언트 설치·맵·리플레이 인프라 무거움 |
| | PySC2 유지보수 정체 |

> **"내가 잘 모름"이라는 조건에서 SC2는 특히 불리합니다.** 에이전트가 잘하는지 못하는지를 **본인이 판단할 수 없으면** 개발 루프가 성립하지 않습니다.

---

### 4. Minecraft 분석

#### 생태계 (계층별)

| 계층 | 프로젝트 | 언어 | 성격 |
|---|---|---|---|
| **프로토콜 제어** | **[Mineflayer](https://github.com/PrismarineJS/mineflayer)** | **JS/TS (Node)** | Java Edition 프로토콜 클라이언트. 가장 활발 |
| RL 환경 | MineRL / MineDojo | Python | 픽셀 관측 + RL. **MineDojo는 자연어로 지정된 1,560개 창작 과제** 제공 |
| LLM 에이전트 | [Voyager](https://github.com/MineDojo/Voyager) | Python | 연구 벤치마크(제품 아님). 스킬 라이브러리 패턴의 원전 |
| LLM 에이전트 | **[Mindcraft](https://github.com/kolbytn/mindcraft)** | **JS** | Mineflayer 기반 **실사용 가능한** 오픈소스 프레임워크 |
| LLM 에이전트 | **[Cairn](https://github.com/VasilisDragon/cairn)** | **JS (Node 22+)** | "신뢰성 우선" — LLM 플래너 + 결정론적 안전 기반 |

Mineflayer가 중요한 이유: **"나무 캐기", "가장 가까운 돌 찾기" 같은 기초 행동을 API로 제공**해서, 연구자가 반복적 액션 디테일이 아니라 **고수준 의사결정에 집중**할 수 있게 해줍니다. 이게 진입 장벽을 결정적으로 낮춥니다.

Voyager는 "GPT-4가 자기 스킬 라이브러리를 직접 작성하게 하면 뭐가 가능한가"를 보인 **연구 벤치마크이지 제품이 아닙니다.** 실제로 뭔가 만들려면 **Mindcraft나 Cairn 쪽이 출발점으로 적합**합니다.

#### 장단점

| ✅ 장점 | ❌ 단점 |
|---|---|
| **보상이 촘촘함** — 나무→곡괭이→철→다이아 테크트리가 자연스러운 커리큘럼 | 평가 기준이 모호(개방형이라 "이겼다"가 없음) |
| **시간 압박 낮음** — 평화 모드/난이도 조절로 LLM 지연 흡수 | 장시간 실행 시 컨텍스트 관리가 어려움 |
| **행동 공간이 이산적·의미론적** (`mineBlock('oak_log')`) | 3D 공간 추론은 LLM 약점 |
| **상식으로 커버** — 도메인 지식 거의 불필요 | 서버 환경 구성 필요 |
| **JS/TS 생태계** — 언어 선택 자유 | |
| 관측을 구조화된 JSON으로 직접 수신(픽셀 파싱 불필요) | |
| Voyager/Mindcraft/Cairn 등 **참고 구현이 풍부** | |

---

### 5. 제3의 선택지들

| 환경 | 특징 | 적합한 경우 |
|---|---|---|
| **Crafter / Craftax** | 2D 생존 게임. 심층 탐험 + 장기 추론 벤치마크. Craftax는 JAX로 GPU 가속 | 빠른 반복 실험, 논문 지향 |
| **NetHack / MiniHack** | 턴제, 텍스트 관측, 극악 난이도 | 순수 추론 능력 측정 |
| **TextWorld** | 텍스트 기반 게임 샌드박스. 수작업 + 절차 생성 게임 제공 | LLM에 가장 자연스러운 형태 |
| **Pokémon** (PokeAgent Challenge) | 경쟁 배틀 + 개방형 RPG 양면 | 대전 전략 관심 시 |
| **[GamingAgent](https://github.com/lmgame-org/GamingAgent) / lmgame-Bench** | ICLR 2026. 6개 게임을 Gym 스타일 API로 통합, perception/memory/reasoning 모듈 토글 가능 | **평가 하네스를 직접 안 짜고 싶을 때** |
| **DSGBench** | 전략 게임 다종 벤치마크 | 비교 평가 지향 |

특히 **lmgame-Bench는 모듈을 토글해 능력을 분리 측정**하도록 설계되어 있어, "우리 에이전트의 어느 부분이 병목인가"를 알아내기 좋습니다.

---

### 6. 권장: **Minecraft + Mineflayer**

"고전 게임 중에 고르되 SC2는 잘 모른다"는 조건에서는 명확합니다.

**이유 5가지:**
1. **평가 루프가 돈다** — 20분 게임 후 승패 1비트가 아니라, "곡괭이를 만들었나"가 몇 분 안에 확인됩니다. 개발 중 피드백이 나오는 게 가장 중요합니다.
2. **도메인 지식 불필요** — 나무 → 판자 → 곡괭이는 상식으로 검증 가능합니다. SC2의 "지금 이 시점에 저글링 6마리가 맞나?"는 본인이 판단 못 합니다.
3. **실시간 압박이 조절 가능** — 평화 모드로 시작하면 LLM의 1~2초 지연이 문제가 안 됩니다. SC2는 이 옵션이 없습니다.
4. **언어 자유 + 활발한 생태계** — Mineflayer(JS)는 프로토콜 레벨 클라이언트라 Java/C++이 전혀 필요 없습니다.
5. **참고 구현 3종** — Voyager(개념), Mindcraft(프레임워크), Cairn(신뢰성 패턴). 바닥부터 짤 필요가 없습니다.

**스택 제안** (앞 문서의 언어 논의와 연결):
- **JS/TS** — Mineflayer 네이티브. Mindcraft/Cairn 코드를 그대로 참고 가능. **가장 마찰 적음**
- **Python** — Mineflayer를 JS 사이드카로 띄우고 IPC, 또는 MineDojo 사용. LLM 생태계(LangGraph/PydanticAI)가 두터움
- **Kotlin/Spring AI** — 기존 백엔드가 JVM이면 L3를 여기에. Mineflayer는 별도 프로세스

> SC2는 **Minecraft로 한 사이클 돌려본 다음** 2차 프로젝트로 가는 게 순서상 맞습니다. TextStarCraft2가 이미 언어 환경을 깔아뒀으니 그때 붙이면 됩니다.

---

### 7. 이 구조에서 FSM은 어디에 있는가

#### 7.1 전제 확인: 맞습니다, C++은 강제되지 않습니다
게임 플레이 에이전트는 **게임 밖 별도 프로세스**입니다. 엔진 API를 직접 부르는 게 아니라 **네트워크 프로토콜(Mineflayer)이나 공개 API(SC2 API)** 로 조작합니다. 프레임당 μs 예산도, GC 지터 문제도 여기엔 없습니다. 그래서 언어는 자유입니다.

#### 7.2 그런데 FSM은 **여전히 필요합니다** — 역할이 바뀔 뿐

이게 핵심입니다. **NPC 에이전트에서 FSM의 존재 이유는 "성능"이었지만, 플레이어 에이전트에서 FSM의 존재 이유는 "신뢰성과 비용"입니다.**

LLM은 여전히 다음을 할 수 없습니다:
- 크리퍼가 터지기 0.5초 전에 반응
- 체력이 3 남았을 때 즉시 회복
- 낙하 중 판단
- 매 틱 호출 (비용이 무한대로 발산)

#### 7.3 레퍼런스 구현: Cairn의 3층 방어

[Cairn](https://github.com/VasilisDragon/cairn)이 이 문제를 정확히 다룹니다. 스택은 **Node.js 22+ / Mineflayer / DeepSeek(OpenAI 호환 클라이언트)**, 순수 JavaScript(ES modules)입니다.

```
┌─────────────────────────────────────────────────────┐
│ LLM = 조언자(Advisor), 플래너 전용                   │
│  · FROZEN 스킬 어휘에서만 JSON 호출을 생성           │
│  · 생존과 실행에 직접 개입 불가                      │
└──────────────────────┬──────────────────────────────┘
                       │ 계획 제출
┌──────────────────────▼──────────────────────────────┐
│ ② Plan Activation Guard                             │
│  · 실행기가 보기 전에 **새로 뜬 월드 스냅샷**으로     │
│    모든 전략을 재검증                                │
└──────────────────────┬──────────────────────────────┘
                       │ 검증 통과
┌──────────────────────▼──────────────────────────────┐
│ ③ Skill Executor                                    │
│  · 결정론적 큐에서 검증된 액션을 한 번에 하나씩       │
│  · preempt / resume 지원 태스크 큐                   │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│ ① Reactive Loop ← **하드코딩 FSM, LLM 없음, 매 틱**  │
│  · 하드 인터럽트 우선권                              │
│  · 먹기 / 도주 / 위험 회피 / 긴급 로그아웃            │
│  · 위 세 층을 **전부 선점(preempt)**                 │
└─────────────────────────────────────────────────────┘
```

번호가 역순인 게 의도적입니다 — **①이 가장 먼저 돌고 가장 높은 우선권**을 갖습니다. LLM이 아무리 멋진 계획을 세워도, 생존 FSM이 "지금 도망쳐"라고 하면 그게 이깁니다.

**LLM 호출 게이팅 3중 장치:**
1. **Frozen vocabulary** — `src/skills/schema.js`의 고정 스킬 스키마로 출력 검증. 스키마 밖 행동은 애초에 표현 불가
2. **비용 상한** — `MCBOT_ADVISOR_COST_USD_MAX`, 기본 **세션당 $2.00**
3. **실행 직전 재검증** — 모든 계획을 새 월드 스냅샷 대비 재확인

#### 7.4 FSM이 담당하는 4가지 역할

| 역할 | 내용 | 없으면 생기는 일 |
|---|---|---|
| **① 생존 반사** | 체력/배고픔/위험 감지 → 즉시 행동 | LLM 응답 기다리다 사망 |
| **② LLM 호출 게이팅** | "현재 상태가 재계획이 필요한가?" 판정 | 매 틱 호출 → 비용 폭발 |
| **③ 에이전트 라이프사이클** | `IDLE → PLANNING → EXECUTING → VERIFYING → REPLANNING` | 계획 중복 실행, 좀비 태스크 |
| **④ 컨텍스트 관리** | 상태별로 프롬프트에 넣을 정보 범위 결정 | 컨텍스트 폭발, 비용 증가 |

②번이 특히 중요합니다. 실무에서 가장 흔한 실패는 "성능이 안 나온다"가 아니라 **"하루 만에 API 비용이 수십 달러 나왔다"** 입니다. 재계획 트리거를 FSM으로 명시적으로 정의해야 합니다.

```js
// 재계획 트리거를 FSM 전이 조건으로 명시
const shouldReplan = (state, world) =>
  state === 'EXECUTING' && (
    world.taskFailed ||                    // 실패
    world.taskCompleted ||                 // 완료
    world.threatLevel > THRESHOLD ||       // 위협
    world.ticksSinceLastPlan > 6000        // 5분 타임아웃
  );
// 그 외에는 LLM을 부르지 않는다
```

#### 7.5 계층은 그대로, 언어만 자유로워진다

앞 문서의 3계층이 여기서도 유지됩니다. **바뀌는 건 "어디에 사느냐"이지 "있느냐"가 아닙니다.**

| 계층 | NPC 에이전트 (게임 안) | 플레이어 에이전트 (게임 밖) |
|---|---|---|
| L3 숙고 | LLM 사이드카 | LLM 플래너 — **동일** |
| L2 전술 | BT/GOAP, 엔진 내부 | 스킬 실행기 + 태스크 큐 |
| L1 반응 | FSM, 엔진 내부, 매 프레임 | **FSM, 에이전트 프로세스, 매 틱** |
| 언어 제약 | 엔진이 강제 | **없음** |
| FSM 존재 이유 | 프레임 예산(μs) | **신뢰성 + API 비용** |

#### 7.6 StarCraft의 경우 FSM은 무엇이 되는가
참고로, SC2를 택했다면 FSM은 **매크로 게임 페이즈 머신**이 됩니다.

```
OPENING(빌드오더 실행) → SCOUTING → MID_GAME(확장/테크)
  → ARMY_BUILDUP → ENGAGING → (승리 시 PUSH / 패배 시 DEFENDING)
```

각 상태에서 LLM은 **"다음 페이즈로 갈까, 전략을 바꿀까"** 만 판단하고, 페이즈 내부의 실제 명령(일꾼 생산, 건물 배치, 유닛 컨트롤)은 결정론적 코드가 처리합니다. Chain of Summarization의 프레임 요약이 여기서 **상태 전이 시점에만 LLM을 부르는** 게이팅 역할을 겸합니다.

---

### 8. 시작 로드맵 (Minecraft 기준)

| 단계 | 목표 | 검증 |
|---|---|---|
| **0** | Mineflayer로 봇 접속, 이동·채굴 수동 호출 | 나무 1개 캐기 |
| **1** | **LLM 없이** 하드코딩 FSM만으로 생존 봇 | 밤에 안 죽고 버티기 |
| **2** | 스킬 어휘 정의 (`mineBlock`, `craftItem`, `goTo` …) + JSON 스키마 | 스키마 검증 통과율 100% |
| **3** | LLM 플래너 추가 — FSM이 `PLANNING` 상태일 때만 호출 | 나무→곡괭이 자동 달성 |
| **4** | 재계획 트리거 + 비용 상한 | 세션당 비용 측정·상한 작동 |
| **5** | 스킬 라이브러리 성장(Voyager 패턴) — 성공한 계획을 재사용 가능 코드로 저장 | 철 곡괭이 도달 |
| **6** | 평가 하네스 — 테크트리 마일스톤 도달 시간 측정 | Voyager 지표와 비교 |

**1단계를 건너뛰지 마세요.** LLM 없이 돌아가는 베이스라인이 있어야 폴백이 성립하고, "LLM이 실제로 기여한 게 뭔가"를 측정할 수 있습니다.

---

### 9. 요약

- **게임 선택: Minecraft + Mineflayer.** 보상 밀도, 시간 압박, 도메인 지식, API 성숙도, 참고 구현 5개 축 모두에서 SC2보다 유리합니다. 특히 **"내가 잘 모른다"는 조건에서 SC2는 평가 루프가 성립하지 않습니다.**
- **언어: 전제가 맞습니다.** 게임 외부 프로세스라 C++ 강제 없음. **JS/TS가 Mineflayer 네이티브라 마찰이 가장 적고**, Python은 LLM 생태계가 두텁습니다.
- **FSM: 사라지지 않고 역할이 바뀝니다.** 성능 때문이 아니라 **신뢰성(생존 반사)과 비용(LLM 호출 게이팅)** 때문에 필요합니다. Cairn처럼 **하드코딩 FSM이 매 틱 돌며 LLM 계획을 하드 인터럽트**하는 구조가 검증된 패턴입니다.
- **핵심 원칙 재확인**: LLM은 **조언자(Advisor)** 일 뿐, 고정 어휘로만 말하고, 실행 직전 재검증을 거치며, 생존 판단에는 개입하지 못합니다.

---

## Sources

- [TextStarCraft2 — Large Language Models Play StarCraft II (NeurIPS 2024)](https://arxiv.org/abs/2312.11865) / [GitHub](https://github.com/histmeisah/Large-Language-Models-play-StarCraftII/)
- [PySC2 — StarCraft II Learning Environment](https://github.com/google-deepmind/pysc2)
- [python-sc2 (BurnySc2)](https://github.com/BurnySc2/python-sc2)
- [Mineflayer](https://github.com/PrismarineJS/mineflayer) / [문서](https://prismarinejs.github.io/mineflayer/)
- [Cairn — Reliability-first AI Minecraft agent](https://github.com/VasilisDragon/cairn)
- [Mindcraft — Minecraft AI with LLMs + Mineflayer](https://github.com/kolbytn/mindcraft)
- [Voyager: An Open-Ended Embodied Agent with LLMs](https://voyager.minedojo.org/) / [GitHub](https://github.com/MineDojo/Voyager)
- [Emergent AI NPCs: Beyond Altera, Voyager, and Mindcraft](https://voxel-mind.com/blog/emergent-ai-npcs-altera-voyager-mindcraft-and-what-comes-next)
- [GamingAgent / lmgame-Bench (ICLR 2026)](https://github.com/lmgame-org/GamingAgent) / [arXiv](https://arxiv.org/abs/2505.15146)
- [MCU: An Evaluation Framework for Open-Ended Game Agents](https://arxiv.org/pdf/2310.08367)
- [DSGBench: A Diverse Strategic Game Benchmark](https://arxiv.org/pdf/2503.06047)
- [The Landscape of Agentic Reinforcement Learning for LLMs: A Survey](https://arxiv.org/pdf/2509.02547)
- [Society of Mind Meets Real-Time Strategy: A Hierarchical Multi-Agent Framework](https://arxiv.org/pdf/2508.06042)
