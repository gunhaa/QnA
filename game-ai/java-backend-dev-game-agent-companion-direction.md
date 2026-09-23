# Java 백엔드/인프라 개발자가 게임 에이전트·AI 동료를 만든다면 — 방향 추천

> 관련 문서: [어떤 게임을 고를까 + FSM 역할](./which-game-to-build-agent-for-and-fsm-role.md) · [게임 API 개방 현황](./game-apis-and-vision-based-agents.md) · [라이브러리 언어 선택](./game-ai-library-language-choice.md) · [인간-AI 협동 플레이 지형](./human-ai-coop/human-ai-cooperative-play-landscape.md) · [레이드 AI 동료 선택지](./human-ai-coop/raid-coop-ai-companion-options.md) · [애드온 배포 현실](./human-ai-coop/ai-companion-addon-distribution-reality.md)

## 쉬운 설명

레고 블록으로 뭘 만들지 고민 중이라고 해봐요. 손에 익은 블록은 **자바(Java) 블록**이고, 예전에 오래 가지고 놀아본 장난감은 **스타크래프트**, 요즘은 **친구들이랑 같이 하는 온라인 게임**을 주로 해요.

그러면 답은 이래요.

1. **제일 먼저 만들 것**은 게임이 아니라 **작은 "협동 미션 연습장"을 직접 지어요.** 백엔드 개발자가 제일 잘하는 게 서버·API·상태관리니까, 이걸로 "사람 한 명 + AI 한 명이 같이 깨는 미니 보스전"을 자바로 직접 만드는 거예요. 남의 게임 규칙에 맞출 필요 없이 내가 규칙을 짜니까 제일 빨라요.
2. **두 번째 트랙**은 잘 아는 스타크래프트로 가요. 스타1을 조종하는 BWAPI라는 문이 **자바로도 열려 있어요.** 아는 게임 + 익숙한 언어라 마찰이 거의 없어요.
3. **롤/MMO 경험**은 도타2의 "공식으로 AI랑 사람이 한 팀 하는" 기능으로 살릴 수 있는데, 이건 아직 손이 좀 더 가는 길이라 세 번째 우선순위예요.

---

## 일반 설명

### 1. 프로필 정리부터

| 축 | 내용 | 의미 |
|---|---|---|
| **기술 배경** | Java 백엔드/프론트/인프라 | 서버·API·상태관리·배포에 강함. 그래픽/클라이언트/엔진 경험 없음 |
| **게임 경험** | 싱글플레이 거의 없음, StarCraft는 해봄, 나머지는 MMO·LoL(온라인 팀게임) | 도메인 지식이 RTS와 팀 기반 온라인 게임 쪽에 있음 |
| **목표** | "게임 에이전트" 또는 "AI 동료" — 아직 미확정 | 둘 다 검토 가치 있음, 아래에서 축을 분리 |

이 프로필에서 가장 중요한 신호는 **"싱글플레이를 거의 안 해봤다"** 입니다. [게임 선택 문서](./which-game-to-build-agent-for-and-fsm-role.md)에서 Minecraft를 1순위로 권했던 이유(도메인 지식 불필요, 촘촘한 보상)는 사실 **"이 게임을 잘 모르는 사람"** 을 전제로 한 것이었습니다. 여기서는 전제가 다릅니다 — StarCraft라는 **아는 게임**이 있고, 대신 Minecraft 같은 **모르는 오픈월드 게임에는 흥미도 시간도 없을 가능성**이 큽니다.

### 2. 두 개의 축을 분리한다

질문 자체가 "게임 에이전트 혹은 AI 동료"라고 되어 있는데, 이건 [FSM 문서](./game-agent-fsm-vs-llm-architecture.md)와 [협동 플레이 문서](./human-ai-coop/human-ai-cooperative-play-landscape.md)에서 이미 완전히 다른 문제로 갈라놓은 것입니다.

| | **게임 에이전트** (혼자 플레이) | **AI 동료** (사람과 협동) |
|---|---|---|
| 평가 | 승/패, 마일스톤 | 팀 점수, 인간 파트너 체감 |
| LLM 적합도 | RTS면 마이크로 병목(LLM 불리) | 자연어 지시·의도 추론(LLM 유리) |
| 미해결 난이도 | 스타1은 20년 정체 | **협응은 아직 LLM이 인간 수준 미달** — 좋은 의미로 미해결 |
| 배경 지식 활용 | StarCraft 지식 그대로 사용 | MMO/LoL의 "팀플레이 감각"이 오히려 여기서 살아남 |

**MMO·LoL 경험은 사실 "AI 동료" 쪽 도메인 지식입니다.** 역할 분담, 어그로/포지셔닝, 콜아웃, 타이밍 맞추기 — 이런 감각은 혼자 플레이하는 에이전트보다 **협동 설계**에 훨씬 직접적으로 쓰입니다. 반대로 StarCraft 지식은 순수 "에이전트" 쪽 자산입니다. 즉 **두 게임 경험이 각각 다른 트랙의 재료**로 정확히 나뉩니다 — 억지로 하나를 고를 필요 없이 순서대로 둘 다 시도할 수 있습니다.

### 3. 1순위 추천: 백엔드 강점이 가장 직접 먹히는 "직접 만든 협동 미니게임"

[레이드 AI 동료 문서](./human-ai-coop/raid-coop-ai-companion-options.md) §2~3에서 이미 결론 낸 바 있습니다 — **인간-AI 협응 연구의 표준은 상용 게임에 붙는 게 아니라 직접 헤드리스 환경을 만드는 것**입니다 (Overcooked-AI, Collab-Overcooked, AH2AC2 전부 자체 제작). 그 이유(빨리감기, 결정론적 리셋, 전체 로깅, ablation, ToS 리스크 없음)가 **여기서는 배경 기술과도 정확히 맞아떨어집니다.**

- 그래픽/엔진/클라이언트 경험이 없어도 됩니다 — **헤드리스 서비스 + 얇은 웹 뷰어**면 충분합니다.
- 백엔드 개발자가 매일 하는 일(상태 머신, API 설계, 이벤트 처리, 배포)이 **그대로 구현 작업**이 됩니다.
- MMO/LoL에서 체득한 "역할 상호의존·타이밍 메커닉·콜아웃"을 **본인이 직접 게임 룰로 설계**할 수 있습니다. 남의 게임(와우 등)에 끼워 맞추는 게 아니라 처음부터 그 5요소를 위해 설계하면 됩니다.

**스택 제안 (Java 백엔드 그대로 재사용):**

```
Kotlin/Spring Boot — 헤드리스 게임 서버 (틱 기반, 실시간 아님)
  - REST/WebSocket으로 상태 노출, 시드 고정 리플레이 저장
  - 보스 1종 + 역할 3종 + 메커닉 4~5개면 충분 (2~4주 분량)
AI 동료 레이어 — 아래 중 선택
  - LangChain4j (1.x, 프로덕션 레디, 30+ 벡터스토어, Quarkus/Micronaut 확장)
  - Spring AI 2.0 (2026-06 GA, 20+ 프로바이더, tool calling, MCP 통합)
  - Koog (JetBrains, Kotlin 네이티브 에이전트 프레임워크, 2025년 공개)
  - Embabel (Kotlin, Spring+LangChain4j 기반 오픈소스 에이전트 프레임워크, GOAP 기반 동적 재계획 — Spring 창시자 Rod Johnson 작품)
사람용 뷰어 — 웹(React/HTMX) 또는 간단 콘솔
```

Koog와 Embabel은 둘 다 "JVM에서 순수 자바/스프링 감각으로 에이전트를 짠다"는 방향이라 **엔진 언어 문제 자체가 사라집니다.** 특히 Embabel의 GOAP 기반 재계획 구조는 [FSM 문서](./game-agent-fsm-vs-llm-architecture.md)에서 설명한 L2(전술) 계층과 개념이 거의 동일해서, "AI 동료의 판단 → 전술 검증 → 실행"이라는 계층 구조를 직접 짤 필요 없이 프레임워크가 제공합니다.

### 4. 2순위 추천: 아는 게임을 살리는 StarCraft + BWAPI(Java)

[게임 API 개방 현황 문서](./game-apis-and-vision-based-agents.md) §5의 "B안"이 정확히 이 프로필을 위한 경로입니다. 이번 조사로 확인한 사실을 더하면:

- **[JavaBWAPI](https://github.com/JavaBWAPI/Java-BWAPI-Tutorial)** 튜토리얼이 현재도 유지되고 있고, **[Atlantis](https://github.com/Ravaelles/Atlantis)** 같은 JBWAPI 2.1.0 기반 오픈소스 Java 봇 프레임워크도 활발합니다. C++ 없이 순수 Java로 SSCAIT 래더에 참가하는 경로가 실제로 살아 있습니다.
- 앞서 정리했듯 **BWAPI는 C++이 1급이지만 Java/Scala/Kotlin이 잘 지원**되는 편이라(§3.1), 백엔드 개발자가 새 언어를 배울 필요가 없습니다.

**권장 순서** (기존 B안 재확인):
1. Java/Kotlin + JBWAPI(또는 Atlantis)로 **룰 기반 봇**부터 — 빌드오더 + 기본 컨트롤. LLM 없음.
2. 매크로 페이즈 FSM 구축 (`OPENING → SCOUTING → MID_GAME → ARMY_BUILDUP → ENGAGING`)
3. 위 3절에서 고른 LLM 프레임워크(LangChain4j/Spring AI/Koog)를 **페이즈 전이 시점에만** 호출하는 L3로 얹기 — SC1용 Chain-of-Summarization은 본인이 설계해야 함(SC2의 TextStarCraft2 같은 기성 래퍼가 없음)
4. SSCAIT 래더에 올려 **객관적 평가**(승률)를 얻기

이 트랙의 장점은 **"에이전트 설계"와 "게임 도메인"을 동시에 배우지 않아도 된다**는 것입니다 — 게임은 이미 알고, 배울 건 에이전트 아키텍처뿐입니다. 3절의 협동 프로젝트와 달리 이쪽은 **결과물이 경쟁 래더로 즉시 검증**된다는 차별점이 있습니다.

### 5. 3순위: LoL 감각을 살리는 Dota 2 Bot API — 단, 제약을 알고 시작할 것

이전 문서에서 미확인으로 남겨뒀던 **"Dota 2 Lua 봇 샌드박스에서 외부 네트워크 호출이 가능한가"** 를 이번에 확인했습니다.

- Dota 2의 Lua VM은 **제한된 샌드박스**로, `io` 패키지·`loadlib`가 막혀 있어 **Lua 코드 안에서 직접 HTTP 요청을 보낼 수 없습니다.**
- 다만 일부 봇 프레임워크는 **Lua 밖에 별도 프로세스(모드)를 두고, 그 프로세스가 게임과 외부 웹 서비스 사이를 JSON으로 중계하는 프록시 패턴**을 씁니다. 즉 **직접 호출은 불가하지만 간접 브리지는 가능**하다는 것이 현재까지 확인된 사실입니다. ([ModDota Lua Bots 문서](https://docs.moddota.com/lua_bots/), [Dota2AI 프레임워크](https://github.com/lightbringer/dota2ai) 참고)

즉 Dota 2 Bot API로 LLM 동료를 만들려면 **Lua 봇 ↔ 로컬 프록시 프로세스(Java/Kotlin으로 작성 가능) ↔ LLM API** 3단 구조가 필요합니다. 이건 3절의 "직접 만든 환경"보다 확실히 복잡하고, [Valve 공식 API + 인간과 실제 혼합 팀 구성이 가능하다는 유일한 장점](./human-ai-coop/raid-coop-ai-companion-options.md#13-dota-2-bot-scripting-api--유일하게-공식--인간과-혼합) 하나 때문에 감수할 가치가 있는지는 프로젝트 목표에 달렸습니다. **"LoL 같은 MOBA에서 AI 동료가 실제 사람과 게임하는 걸 보고 싶다"** 는 목표라면 이 트랙이 유일한 정문이지만, 처음 시작하는 프로젝트로는 난도가 있습니다 — 3절을 먼저 돌리고 여유가 생기면 확장하는 편이 낫습니다.

### 6. 정리 — 권장 순서

| 순위 | 프로젝트 | 왜 이 프로필에 맞는가 |
|---|---|---|
| **1** | Kotlin/Spring 헤드리스 협동 미니게임 + LangChain4j/Spring AI/Koog/Embabel | 백엔드 강점이 그대로 구현 작업. MMO/LoL의 팀플레이 감각을 직접 룰로 설계. 그래픽/엔진 불필요 |
| **2** | JBWAPI(Atlantis) + Java/Kotlin — StarCraft 매크로 FSM + LLM 페이즈 게이팅 | 아는 게임 + 아는 언어. SSCAIT 래더로 객관적 평가. 도메인·아키텍처를 동시에 배우지 않아도 됨 |
| **3** (여유 있을 때) | Dota 2 Bot API + Lua↔Java 프록시 | LoL 감각과 가장 가까운 장르(MOBA) + 공식 API + 실제 인간 혼합 팀. 단 3단 구조라 난도 상승 |

1번과 2번은 **기술 스택이 사실상 같습니다**(Kotlin + LangChain4j류 LLM 레이어). 1번에서 익힌 "재계획 트리거, FSM 게이팅, 비용 상한" 패턴을 그대로 2번의 매크로 FSM에 이식할 수 있으므로, 순서대로 진행하면 낭비되는 노력이 거의 없습니다.

---

## Sources

- [JavaBWAPI/Java-BWAPI-Tutorial](https://github.com/JavaBWAPI/Java-BWAPI-Tutorial) / [Wiki](https://github.com/JavaBWAPI/Java-BWAPI-Tutorial/wiki)
- [Atlantis — StarCraft BroodWar AI Java Framework (JBWAPI 2.1.0)](https://github.com/Ravaelles/Atlantis)
- [BWAPI4J — BWAPI wrapper for Java](https://github.com/OpenBW/BWAPI4J)
- [SSCAIT Java 봇 튜토리얼](https://sscaitournament.com/index.php?action=tutorial)
- [ModDota — Lua (Bots) API 문서](https://docs.moddota.com/lua_bots/) / [Lua (Server) 문서](https://docs.moddota.com/lua_server/)
- [dota2ai — Dota2 AI Framework](https://github.com/lightbringer/dota2ai)
- [Kotlin for AI-powered app development — Kotlin 공식 문서](https://kotlinlang.org/docs/kotlin-ai-apps-development-overview.html)
- [The Kotlin AI Stack: Koog, Junie 등 — JetBrains Blog (2025-09)](https://blog.jetbrains.com/kotlin/2025/09/the-kotlin-ai-stack-build-ai-agents-with-koog-code-smarter-with-junie-and-more/)
- [JVM AI Agent Frameworks: Koog vs LangChain4j vs Google ADK](https://medium.com/@shravyaboini/jvm-ai-agent-frameworks-choosing-between-koog-langchain4j-and-google-adk-f4d569bc96d1)
- [Java's AI Awakening: LangChain4j vs Spring AI — 백엔드 개발자 관점](https://medium.com/@krpsanthoshkumar/javas-ai-awakening-a-backend-engineer-s-perspective-on-langchain4j-vs-spring-ai-41800758a71a)
- [Top Gen AI Frameworks for Java in 2026 (Embabel 포함)](https://xavidop.me/genkit/2026-04-16-top-java-genai-frameworks-2026/)
- [Java AI agent frameworks in 2026 — CodeWiz](https://codewiz.info/blog/java-ai-agent-frameworks-2026/)
