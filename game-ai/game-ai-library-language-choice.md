# 게임 AI 라이브러리의 언어 선택 — C++/C#이 주류인 이유와 JS/TS·Java/Kotlin 선택지

> 관련 문서: [게임플레이 에이전트: FSM vs LLM 비중, 성능 비교, 일반적 구현 방식](./game-agent-fsm-vs-llm-architecture.md)

## 쉬운 설명

레고로 로봇을 만든다고 해봐요.

- **로봇 몸통(게임 엔진)** 은 이미 정해진 부품으로만 만들 수 있어요. Unity로 만들면 C#, Unreal로 만들면 C++. **선택의 여지가 거의 없어요.** 몸통이 그 언어로 되어 있으니까요.
- **로봇이 쓰는 스마트폰(LLM 부분)** 은 달라요. 이건 몸통에서 떼어내서 옆에 따로 둘 수 있으니, **아무 언어나 써도 돼요.** Python이든 TypeScript든 Java든.

그래서 답은: **몸은 엔진 언어를 따라가고, 머리는 자유롭게 고른다.**

---

## 일반 설명

### 1. 결론 요약

| 계층 | 언어 | 선택 가능? |
|---|---|---|
| **L1 반응**(FSM, Steering, A*) | 엔진 언어 강제 — C++ / C# / GDScript | ❌ 사실상 없음 |
| **L2 전술**(BT, GOAP, Utility) | 엔진 언어 강제 (같은 프로세스여야 함) | ❌ 거의 없음 |
| **L3 숙고**(LLM, 계획, 대사) | **무엇이든** — Python / TS / Java / Kotlin / Go / C# | ✅ **완전 자유** |
| **연구/실험 프로토타이핑** | Python 압도적 | ✅ 사실상 Python |

즉 "JS/TS, Java/Kotlin 선택지가 있느냐"에 대한 답은 **L3 계층에서는 예, L1/L2에서는 아니오**입니다.

---

### 2. 왜 L1/L2는 엔진 언어에 묶이는가

#### 2.1 프레임 예산이라는 하드 제약
60fps = 프레임당 **16.6ms**. 여기에 렌더링·물리·네트워크가 다 들어갑니다. AI에 할당되는 건 보통 **1~3ms**이고, 그 안에서 수백 개 에이전트가 틱을 돌아야 합니다.

- 에이전트 500개 × 3ms = 에이전트당 **6μs**
- 이 수준에서는 GC 스톱-더-월드 한 번(수 ms)이 프레임을 통째로 날립니다
- 프로세스 경계를 넘는 IPC(최소 수십 μs~ms)는 아예 논외

#### 2.2 엔진 바인딩 비용
BT의 리프 노드는 결국 `transform.position`, `NavMeshAgent.SetDestination()`, `Animator.SetTrigger()` 같은 **엔진 API를 직접 호출**합니다. 이걸 다른 언어에서 하려면 FFI/바인딩 계층을 거쳐야 하고, 틱마다 수천 번 호출되는 경로에서 마샬링 비용이 누적됩니다.

#### 2.3 결과: 엔진이 언어를 결정한다

| 엔진 | AI 로직 언어 | 내장 AI 도구 |
|---|---|---|
| **Unreal Engine** | C++ (+ Blueprint 비주얼 스크립팅) | Behavior Tree + Blackboard, EQS, NavMesh 내장 |
| **Unity** | C# | NavMesh 내장, BT는 외부 패키지(Behavior Designer, NodeCanvas) |
| **Godot** | GDScript / C# / C++(GDExtension) | NavigationServer 내장, BT는 애드온(LimboAI 등) |
| **libGDX** | **Java / Kotlin** | **gdx-ai**(Steering, Formation, Pathfinding, BT, FSM) |
| **Bevy** | Rust | ECS 기반, `big-brain`(Utility AI) 등 크레이트 |
| **Phaser / Three.js** | **JS / TS** | 외부 BT 라이브러리 조합 |
| **Defold** | Lua | `def-behavior-tree` 등 |

> 핵심: **"어떤 언어를 쓸까"가 아니라 "어떤 엔진을 쓸까"가 먼저 결정되고, 언어는 거기서 따라옵니다.**

---

### 3. 언어별 게임 AI 라이브러리 지형

#### 3.1 C++ — 성능 최상위, AAA 표준
- **[BehaviorTree.CPP](https://github.com/BehaviorTree/BehaviorTree.CPP)** — 사실상 이 분야의 레퍼런스. **비동기 Action을 일급 시민으로** 취급해 논블로킹 반응형 행동을 만들 수 있고, 여러 Action 동시 실행을 지원합니다. Groot2 시각화 에디터, XML 직렬화, 로깅·프로파일링 내장. ROS 진영에서도 표준으로 쓰여 전투 검증이 두텁습니다.
- **Unreal 내장 BT** — 엔진과 완전 통합(Blackboard, EQS, Perception 시스템). 별도 라이브러리 불필요.
- **behaviac** (텐센트) — BT + FSM + HTN을 모두 지원하는 프레임워크. C++/C# 둘 다 제공.

#### 3.2 C# — Unity 생태계 + .NET 서버
- Unity용 상용/무료 BT 에디터: **Behavior Designer**, **NodeCanvas**, **Unity Behavior**(공식, 2024~)
- .NET/Godot용 모듈형 BT 프레임워크들이 활발
- **[OpenGameAgent](https://github.com/EricSun0218/OpenGameAgent)** — C# 런타임으로 Unity/Godot/Unreal/서버 모두 커버. 게임 서버에 붙이는 LLM 에이전트 런타임을 C#으로 통일하려는 시도
- C#의 강점: **게임 클라이언트와 게임 서버의 언어를 통일**할 수 있음. GC는 있지만 `struct`/`Span<T>`/오브젝트 풀링으로 회피 가능

#### 3.3 Java / Kotlin — **선택지는 있고, 서버 쪽에서 특히 강함**

**게임 클라이언트 쪽:**
- **[gdx-ai](https://github.com/libgdx/gdx-ai)** — libGDX 기반(또는 독립 사용 가능)의 순수 Java AI 프레임워크. **Steering Behaviors, Formation Motion, Pathfinding(A*/IDA*), Behavior Trees, Finite State Machines**를 모두 제공하고 Apache 2 라이선스입니다. `BehaviorTreeLibrary`로 외부 `.tree` 파일에서 트리를 로드하고 명명된 서브트리를 재사용할 수 있으며, `LoadBalancingScheduler`로 틱 부하를 분산합니다. **KTX**로 Kotlin에서 쓰기도 좋습니다.
- 현실적 위치: 인디·2D·모바일 범위에서는 충분하지만, **AAA 3D 게임 클라이언트에서 Java/Kotlin은 사실상 쓰이지 않습니다**(GC 지터, 엔진 생태계 부재).
- 예외적으로 **Minecraft(Java Edition) 모드** 생태계는 Java/Kotlin이 유일한 선택지이며, 여기서 NPC AI를 만드는 사례가 많습니다.

**서버/에이전트 쪽 — 여기가 Java/Kotlin의 진짜 영역:**
2026년 기준 Java LLM 생태계는 **9개 프레임워크, 3개 프로토콜 표준, Java/Kotlin/Scala 전부 일급 지원**으로 성숙했습니다.

| 프레임워크 | 상태 | 적합 대상 |
|---|---|---|
| **Spring AI** | 2.0 GA (2026-06). 자기교정 structured output, 조합 가능한 tool calling, MCP 완전 통합, 20+ 프로바이더, RAG/메모리용 Advisors API | Spring Boot 팀 |
| **LangChain4j** | 1.x 프로덕션 레디. 30+ 벡터 스토어, `AiServices` 추상화, Quarkus/Micronaut 네이티브 확장. 2026년 방향은 멀티스텝 툴·계획 루프·MCP 심화 | 비-Spring / 폴리글랏 팀 |
| **Google ADK (Java)** | 프로덕션 등급 도달 | GCP 중심 팀 |

즉 **게임 서버가 이미 Kotlin/Spring이라면, L3 LLM 에이전트를 같은 스택에서 구현하는 것이 완전히 합리적**입니다. 기존 인증·세션·DB·관측성 인프라를 그대로 재사용할 수 있다는 게 결정적 이점입니다.

#### 3.4 JavaScript / TypeScript — **웹 게임 + LLM 에이전트 양쪽에서 강함**

**BT 라이브러리:**
| 라이브러리 | 특징 |
|---|---|
| **[Mistreevous](https://github.com/nikkorn/mistreevous)** | TS 기반 경량. Node·브라우저 모두. **JSON 또는 MDSL(전용 DSL)** 로 트리 정의 |
| **[Behavior3.js](https://github.com/behavior3/behavior3js)** | **다중 에이전트 제어에 최적화 — 트리 인스턴스 1개로 수백 에이전트 처리**. JSON 직렬화로 여러 언어/툴 간 공유 |
| **[BehaviorTree.js](https://www.npmjs.com/package/behaviortree)** | CommonJS 환경 지원, 성숙 |
| **Blueshell** | TS. action/conditional/composite/decorator 노드 풀세트 |
| **[ts-behavior-tree](https://github.com/robinxb/ts-behavior-tree)** | Fluent-Behaviour-Tree(C#) 포팅. **~5KB, 의존성 0** |

Behavior3.js의 "트리 1개 + 에이전트별 blackboard" 패턴은 메모리 관점에서 중요합니다. 트리는 **상태 없는 정책**이고 상태는 blackboard에 두는 설계로, 언어를 불문하고 권장되는 구조입니다.

**LLM 에이전트 프레임워크:**
- **Mastra** — TS 팀이 하나의 통합 스택(지속성 워크플로 + 메모리 + evals + 트레이싱)을 원할 때 1순위
- **Vercel AI SDK** — 스트리밍/UI가 강점, 에이전트 프리미티브도 갖췄으나 지속성 워크플로 엔진은 아직 없음
- 선택 기준: **에이전트 제품을 만든다 → Mastra / 웹 제품에 에이전트 기능을 더한다 → AI SDK**

**현실적 위치**: 브라우저 게임(Phaser, Three.js, PlayCanvas)에서는 JS/TS가 유일한 선택지입니다. 네이티브 게임의 L1/L2에는 부적합하지만, **L3 LLM 사이드카로는 1급 선택지**입니다.

#### 3.5 Python — 연구·프로토타이핑 독점
- **py_trees** — 동적 세계의 **contingency handling(예외 상황 처리)** 에 초점. ROS 진영 표준
- **[openNPC](https://github.com/balaraj74/openNPC)** — 휴리스틱 + PPO/DQN + LOD 5티어를 하나의 Python 파이프라인으로
- **[Voyager](https://github.com/MineDojo/Voyager)**, **[GamingAgent](https://github.com/lmgame-org/GamingAgent)** — 게임 플레이 에이전트 연구는 거의 전부 Python
- LLM 에이전트: **LangGraph**(제어·생태계 깊이 1위), **PydanticAI**(v1.0 이후 API 안정성 약속, "GenAI에 적용된 FastAPI 감각", 타입 안전 + 자동 출력 검증), **OpenAI Agents SDK**
- 게임 **런타임**에는 부적합(GIL, 속도). 학습·실험·오프라인 도구용

#### 3.6 Rust — 부상 중
- BehaviorTree.CPP의 Rust 구현체 존재
- Bevy 생태계: `big-brain`(Utility AI), `bevy_behave` 등
- **GC 없는 예측 가능한 성능**이 게임 AI와 잘 맞지만, 생태계·인력 풀이 아직 얇습니다

---

### 4. LLM 계층은 왜 언어가 자유로운가 — 사이드카 패턴

L3는 **초 단위로 호출되고, 네트워크 왕복이 이미 전제**되어 있습니다. 그래서 프로세스를 분리해도 상대적 오버헤드가 무시할 수준입니다.

```
┌──────────────────────────┐        ┌───────────────────────────┐
│  게임 프로세스            │        │  LLM 에이전트 서비스       │
│  (C++ / C# / GDScript)   │        │  (Python / TS / Kotlin /  │
│                          │ HTTP·  │   Go / C# — 자유 선택)     │
│  L1 FSM  ─ 매 프레임      │ gRPC·  │                           │
│  L2 BT   ─ 0.1~1s        │◄─SSE──►│  프롬프트 조립             │
│  Blackboard              │  비동기 │  툴 콜 / ReAct 루프        │
│                          │        │  메모리·벡터 검색          │
│  ↑ 모든 상태 변경의 권위  │        │  모델 라우팅·폴백          │
└──────────────────────────┘        └───────────────────────────┘
```

**배치 3가지 (OpenGameAgent 기준):**
1. **인-엔진(in-process)** — Unity/Godot에 직접 임베드. 싱글플레이 BYOK나 로컬 모델에 가장 단순. 언어가 엔진에 묶임
2. **게임 서버 동거** — 게임 규칙·영속성과 같은 런타임에서 실행. 서버 언어를 따라감
3. **별도 서비스** — Unreal은 에디터가 C++이라 .NET 플러그인을 in-process로 못 올리므로, **localhost TCP 포트를 열고 사이드카 프로세스를 띄워 IPC를 중계**하는 방식을 씁니다. 이 형태가 **언어 자유도가 가장 높습니다.**

Unreal의 사이드카 사례가 보여주듯, 언어가 안 맞으면 **프로세스를 분리하는 게 표준 해법**입니다.

---

### 5. 상황별 권장 스택

| 상황 | L1/L2 | L3 (LLM) | 근거 |
|---|---|---|---|
| Unity 상용 게임 | C# + Behavior Designer | C# 서버 또는 Python 사이드카 | 클라/서버 언어 통일 vs 생태계 |
| Unreal AAA | C++ 내장 BT | 별도 서비스(아무 언어) | 엔진 BT가 이미 최강, LLM은 분리 필수 |
| 웹/브라우저 게임 | TS + Mistreevous / Behavior3.js | TS + Mastra 또는 Vercel AI SDK | **언어 완전 통일** — 가장 깔끔 |
| **기존 백엔드가 Kotlin/Spring** | 엔진 언어 | **Kotlin + Spring AI 2.0** | 인증·세션·DB·관측성 인프라 재사용 |
| libGDX / Minecraft 모드 | **Java/Kotlin + gdx-ai** | LangChain4j | Java가 유일하거나 최적 |
| 연구·논문·프로토타입 | Python + py_trees | Python + LangGraph/PydanticAI | 생태계 독점 |
| 로봇틱스 겸용 | C++ + BehaviorTree.CPP | Python | ROS 표준 |

---

### 6. 질문에 대한 직접 답변

> **"일반적으로 라이브러리 언어는 어떤 걸 사용함?"**

게임 **런타임** 기준 압도적 주류는 **C++(Unreal/AAA)와 C#(Unity)** 입니다. 연구·에이전트 실험 영역은 **Python**이 독점합니다. 이 셋이 전체의 90% 이상입니다.

> **"JS/TS, Java/Kotlin 등의 선택지도 있는지?"**

**있습니다. 단 영역을 나눠서 봐야 합니다.**

- **JS/TS**: 브라우저 게임에서는 유일하자 충분한 선택지(Mistreevous, Behavior3.js). LLM 에이전트 계층에서는 Mastra/Vercel AI SDK로 **1급 선택지**. 웹 게임이라면 **프론트-AI-백엔드 전부 TS로 통일**하는 게 현실적으로 가장 마찰이 적습니다.
- **Java/Kotlin**: 게임 클라이언트 AI에는 `gdx-ai`라는 **완성도 높은 선택지가 실제로 존재**하지만, 시장 점유는 인디/2D/모바일과 Minecraft 모드에 한정됩니다. 반면 **서버 사이드 LLM 에이전트에서는 Spring AI 2.0 / LangChain4j 1.x가 2026년 기준 완전한 프로덕션 등급**이므로, 백엔드가 이미 JVM이라면 굳이 Python으로 갈 이유가 없습니다.

> **실무 판단 기준 한 줄**: L1/L2는 **엔진이 정한다**. L3는 **기존 백엔드 스택이 정한다**. 억지로 통일하지 말고, 성능 경계에서 프로세스를 끊어라.

---

## Sources

- [BehaviorTree.CPP](https://github.com/BehaviorTree/BehaviorTree.CPP)
- [gdx-ai (libGDX AI Framework)](https://github.com/libgdx/gdx-ai) / [Behavior Trees Wiki](https://github.com/libgdx/gdx-ai/wiki/Behavior-Trees)
- [Mistreevous](https://github.com/nikkorn/mistreevous)
- [Behavior3.js](https://github.com/behavior3/behavior3js)
- [BehaviorTree.js (npm)](https://www.npmjs.com/package/behaviortree)
- [ts-behavior-tree](https://github.com/robinxb/ts-behavior-tree)
- [OpenGameAgent](https://github.com/EricSun0218/OpenGameAgent)
- [openNPC](https://github.com/balaraj74/openNPC)
- [Voyager](https://github.com/MineDojo/Voyager) / [GamingAgent](https://github.com/lmgame-org/GamingAgent)
- [Behavior trees for AI: How they work — Game Developer](https://www.gamedeveloper.com/programming/behavior-trees-for-ai-how-they-work)
- [C++ behavior trees library design — lisyarus blog](https://lisyarus.github.io/blog/posts/behavior-trees.html)
- [Choosing a Java LLM Integration Strategy in 2026: Spring AI 1.1 vs LangChain4j vs Direct API Calls](https://www.javacodegeeks.com/2026/03/choosing-a-java-llm-integration-strategy-in-2026-spring-ai-1-1-vs-langchain4j-vs-direct-api-calls.html)
- [Java AI agent frameworks in 2026: a practical comparison — CodeWiz](https://codewiz.info/blog/java-ai-agent-frameworks-2026/)
- [Top Gen AI Frameworks for Java in 2026](https://xavidop.me/genkit/2026-04-16-top-java-genai-frameworks-2026/)
- [Choosing an agent framework: LangChain vs LangGraph vs CrewAI vs PydanticAI vs Mastra vs Vercel AI SDK — Speakeasy](https://www.speakeasy.com/blog/ai-agent-framework-comparison)
- [AI Agent Frameworks Compared: Which Ones Ship?](https://www.channel.tel/blog/ai-agent-frameworks-compared-2026-what-ships)
- [Game Engine & 3D Development MCP Servers — Unity, Unreal, Godot, Roblox, Phaser](https://dev.to/grove_chatforest/game-engine-3d-development-mcp-servers-unity-unreal-godot-roblox-phaser-and-more-4kk3)
- [Running Local LLMs in Game Engines — Godot + Ollama](https://dev.to/ykbmck/running-local-llms-in-game-engines-heres-my-journey-with-godot-ollama-4hhd)
