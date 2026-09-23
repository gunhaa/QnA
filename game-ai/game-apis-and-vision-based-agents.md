# 게임 API 개방 현황, MMORPG의 한계, 비전(OCR) 기반 접근 — 그리고 API가 열린 게임 목록

> 관련 문서: [FSM vs LLM 비중·성능·구현](./game-agent-fsm-vs-llm-architecture.md) · [라이브러리 언어 선택](./game-ai-library-language-choice.md) · [어떤 게임을 고를까 + FSM 역할](./which-game-to-build-agent-for-and-fsm-role.md)

## 쉬운 설명

게임에 로봇을 붙이는 방법은 세 가지예요.

1. **정문으로 들어가기 (공식 API)** — 게임이 "여기로 들어와서 조종해"라고 문을 열어준 경우. **스타크래프트 1이 바로 이 경우예요!** BWAPI라는 문이 20년 가까이 열려 있어요.
2. **창구에서 서류만 받기 (데이터 API)** — 로스트아크·메이플스토리가 이거예요. "우리 캐릭터 정보는 알려줄게, 근데 조종은 안 돼." 읽기 전용이에요.
3. **창문으로 훔쳐보기 (화면 캡처/OCR)** — 문이 없으면 화면을 사진 찍어서 글자를 읽고 마우스를 움직이는 거예요. **되긴 되는데 느리고, 자주 틀리고, MMORPG에서는 잡히면 계정이 날아가요.**

그러니까 **1번이 되는 게임을 고르는 게 정답**이고, 다행히 잘 아시는 스타1이 1번입니다.

---

## 일반 설명

### 1. 먼저 좋은 소식 — **StarCraft: Brood War는 API가 열려 있습니다**

#### BWAPI (Brood War API)
**[BWAPI](https://bwapi.github.io/)** 는 스타크래프트: 브루드워와 상호작용하는 **무료 오픈소스 C++ 프레임워크**입니다. 학생·연구자·취미 개발자가 게임을 플레이하는 AI 에이전트를 만들 수 있게 해줍니다. 2009년경부터 이어져 온, 이 분야에서 **가장 성숙하고 검증된 API** 중 하나입니다.

**지원 언어:**

| 등급 | 언어 |
|---|---|
| 잘 지원됨 | **C++, Java, Scala, Kotlin, Ruby** |
| 라이브러리는 있으나 덜 검증됨 | Python(PyBrood, TorchCraft), C#, **Rust([rsbwapi](https://github.com/Bytekeeper/rsbwapi))** |

> 앞 문서의 "엔진 언어 강제" 논의가 여기서도 흥미롭게 적용됩니다. BWAPI는 게임 프로세스에 DLL을 주입하는 방식이라 **C++이 1급이지만 Java/Scala/Kotlin도 잘 지원**됩니다. 실제 SSCAIT 대회 봇들이 C++/Java로 나뉘어 있습니다.

#### 생태계가 살아 있습니다
매년 열리는 **3대 StarCraft AI 대회**가 있습니다:
- **SSCAIT** (Student StarCraft AI Tournament) — 상시 래더 + 토너먼트, 트위치 중계
- **AIIDE** (AI and Interactive Digital Entertainment)
- **CIG** (Computational Intelligence in Games)

또한 **Docker 기반 멀티플랫폼 실행 환경**(StarCraft: Brood War in a Docker container)이 논문으로 정리되어 있어 재현 가능한 실험 세팅이 가능합니다. 참고 자료로 [StarCraftAI wiki](https://www.starcraftai.com/wiki/Main_Page)와 [Dave Churchill의 리소스 페이지](https://davechurchill.ca/starcraft/resources/)가 표준 출발점입니다.

#### 단, LLM을 얹으려면 추가 작업이 필요합니다
중요한 함정입니다. **BWAPI 생태계는 전통적 룰 기반/탐색 기반 봇 중심**으로 20년 가까이 축적되어 왔습니다. LLM 에이전트를 붙이려면:

- SC2에는 **[TextStarCraft2](https://github.com/histmeisah/Large-Language-Models-play-StarCraftII/)** 라는 **언어 환경 래퍼가 이미 존재**합니다 (Chain of Summarization 논문 구현체)
- **SC1에는 이에 해당하는 것이 없습니다.** 관측 → 텍스트 직렬화, 액션 어휘 정의를 **직접 설계해야 합니다**

즉 SC1은 "API는 최고 수준으로 열려 있지만, LLM 래퍼는 본인이 만들어야 하는" 상태입니다. 이건 **단점이자 동시에 차별점**이기도 합니다 — 아무도 안 한 걸 하는 셈이니까요.

---

### 2. 로스트아크 / 메이플스토리 — API는 있지만 성격이 다릅니다

#### 2.1 존재는 합니다 (읽기 전용)

**로스트아크 오픈 API** ([개발자 포털](https://developer-lostark.game.onstove.com/)):

| 엔드포인트 | 내용 |
|---|---|
| `NEWS` | 공지·이벤트 |
| `CHARACTERS` | 캐릭터 기본 정보 |
| `ARMORIES` | 장비·각인·보석·스킬 등 상세 스펙 |
| `AUCTIONS` | 경매장 |
| `MARKETS` | 거래소 시세 |
| `GAMECONTENTS` | 도전 어비스·가디언 등 콘텐츠 일정 |

- JWT 인증, **분당 100 요청** 제한 (`X-RateLimit-*` 헤더 제공)
- **완전한 읽기 전용** — 쓰기 연산, 게임 자동화, 조작 기능 일절 없음

**넥슨 오픈 API** ([openapi.nexon.com](https://openapi.nexon.com/)):
2019년의 '넥슨 개발자센터'를 **'넥슨 오픈 API'로 리뉴얼**하면서 대상 게임을 4종에서 **13종으로 확대**했습니다 — 메이플스토리, FC 온라인, 던전앤파이터, 사이퍼즈, 마비노기 영웅전, 메이플스토리M, 바람의나라, 바람의나라: 연, 카트라이더 러쉬플러스, 크레이지 아케이드, 프라시아 전기, 히트2, V4. 메이플스토리는 큐브 확률 정보만 제공하던 데서 **게임 시스템 전반 데이터로 대규모 확대**되었습니다.

역시 **캐릭터/아이템/랭킹 조회 중심의 읽기 전용**입니다.

#### 2.2 이 API로 만들 수 있는 것 / 없는 것

| ✅ 가능 | ❌ 불가능 |
|---|---|
| 스펙 분석기, 각인 계산기 | 캐릭터 조작 |
| 경매장 시세 예측 봇 | 사냥/퀘스트 자동화 |
| 랭킹 추적·성장 분석 | 전투 의사결정 |
| **LLM 기반 "빌드 추천 어시스턴트"** | 게임 플레이 에이전트 |

> 여기서도 **LLM 에이전트를 만들 수는 있습니다** — 다만 "게임을 플레이하는 에이전트"가 아니라 **"게임 데이터를 분석하는 에이전트"** 입니다. 경매장 시세 + 캐릭터 스펙을 읽어 "지금 이 각인을 사는 게 이득인가"를 판단하는 툴 콜 에이전트는 충분히 가치 있고, 약관 문제도 없습니다.

#### 2.3 자동 조작은 **하면 안 됩니다** (기술 문제가 아니라 계정·법률 문제)

**약관:**
- **메이플스토리**: 매크로, 자동 루팅, 로봇 플레이 등 **플레이어의 존재 여부와 무관하게 캐릭터가 자동으로 동작하게 하는 일체의 행위** 금지
- **로스트아크**: "무인 플레이(unattended gameplay)나 게임 수정 등으로 부당한 이점을 얻는 소프트웨어·서비스를 사용하지 말 것"

**안티치트:**

| 게임 | 안티치트 |
|---|---|
| 메이플스토리 | **nProtect GameGuard / XIGNCODE3** |
| 로스트아크 | **Easy Anti-Cheat (EAC)** |

이들은 커널 레벨에서 동작하며 자동화 도구·다중 디바이스 동시 제어를 탐지합니다. 실제로 **MapleStory N에서 24시간 동안 6,503건의 제재**가 집행된 사례가 있습니다.

> **결론**: MMORPG는 "API가 안 열려서 못 한다"가 아니라 **"열려 있는 API는 조작을 지원하지 않고, 조작은 명시적으로 금지되어 있다"** 가 정확한 상황입니다. 우회 시도는 기술적으로 가능해도 **계정 영구 정지 + 약관 위반**이며, 학습 목적으로도 권하지 않습니다.

---

### 3. API가 없으면 OCR/비전으로 가야 하나?

#### 3.1 기술적으로는 성숙했습니다
**Microsoft [OmniParser](https://github.com/microsoft/omniparser) v2** 가 현재 표준입니다.

- UI 스크린샷을 **구조화된 바운딩 박스 + 레이블**로 추출해 **DOM 유사 표현**으로 변환
- 파이프라인: **파인튜닝된 YOLOv8 아이콘 탐지 모델 + 아이콘 설명 모델 + OCR 모듈**
- GPT-4o/o1/o3-mini, DeepSeek R1, Qwen 2.5VL, Claude Sonnet 등과 조합
- Screen Spot Pro 그라운딩 벤치마크에서 **39.5% SOTA**
- 슬로건: **"어떤 LLM이든 컴퓨터 사용 에이전트로 바꾼다"** — 모델은 판단만 하고 OmniParser가 눈을 제공

실행 루프는 CUA(Computer-Using Agent) SDK 패턴입니다: **스크린샷 캡처 → VLM 전송 → 예측 액션 파싱 → 실행 → 반복**.

#### 3.2 그런데 게임에 쓰기엔 대가가 큽니다

| 문제 | 실질 영향 |
|---|---|
| **지연** | 캡처 + VLM 추론 = 회당 **1~5초**. 실시간 게임 불가 |
| **비용** | 이미지 토큰이 텍스트보다 훨씬 비쌈. 매 스텝 스크린샷 = 비용 폭발 |
| **에러 누적** | 그라운딩 정확도 39.5%. 한 번 잘못 클릭하면 상태가 어긋나고 복구 불가 |
| **상태 불가시성** | 화면에 안 보이는 정보(쿨다운 내부값, 인벤토리 뒷면)는 알 수 없음 |
| **약관/안티치트** | 상용 온라인 게임에서는 화면 캡처 + 입력 주입 자체가 탐지·제재 대상 |
| **디버깅 지옥** | "왜 실패했나"가 인식 오류인지 판단 오류인지 구분 불가 |

#### 3.3 판단 기준

> **OCR/비전은 "다른 방법이 전혀 없고, 그 게임이어야만 하는" 경우의 최후 수단입니다.**

게임 에이전트를 **처음 만드는 목적**이라면, 비전 계층의 노이즈가 정작 배우고 싶은 **에이전트 설계(계획, 메모리, FSM 게이팅, 스킬 라이브러리)** 를 전부 가려버립니다. **구조화된 관측을 주는 환경을 고르는 게 압도적으로 낫습니다.**

비전 접근이 정당화되는 경우: 컴퓨터 사용 에이전트 자체가 연구 주제일 때, 또는 `lmgame-Bench`/`GamingAgent`처럼 **여러 게임에 공통 하네스**를 씌워야 할 때.

---

### 4. API가 열린 게임 목록

#### 4.1 S급 — AI 에이전트 전용으로 설계된 환경

| 게임/환경 | API | 언어 | 특징 |
|---|---|---|---|
| **[Screeps](https://docs.screeps.com/)** | 공식 JS 런타임 + [Web API](https://docs.screeps.com/api/) | **JS/TS**, [Rust](https://crates.io/crates/screeps-game-api) | **"코드로만 플레이하는 MMO"**. 게임 자체가 프로그래밍. [MCP 서버](https://lobehub.com/mcp/ralphschuler-screeps-api-mcp)도 존재 |
| **[Minecraft (Mineflayer)](https://github.com/PrismarineJS/mineflayer)** | 프로토콜 클라이언트 | **JS/TS** | 구조화 관측, 참고 구현 풍부 |
| **[Factorio](https://lua-api.factorio.com/latest/)** | 공식 **Lua 모딩 API** | Lua ([TS 타입 정의](https://github.com/GlassBricks/typed-factorio) 있음) | 자동화 게임 자체가 주제. API가 매우 광범위 |
| **[StarCraft: Brood War (BWAPI)](https://bwapi.github.io/)** | 공식 수준 커뮤니티 API | C++/Java/Scala/Kotlin | **대회 생태계 + 20년 축적** |
| **[Dota 2](https://github.com/shikyo13/Dota2AI/blob/main/docs/BOT_API_REFERENCE.md)** | **Valve 공식 봇 스크립팅 API** (7.00~) | Lua 5.1 (샌드박스 VM) | OpenAI Five의 무대 |

#### 4.2 A급 — RL/에이전트 연구 표준 환경

| 환경 | 내용 |
|---|---|
| **[Gymnasium](https://github.com/farama-foundation/gymnasium)** | OpenAI Gym의 **공식 후계**. Farama Foundation 유지보수. 모든 환경의 공통 인터페이스 |
| **[ALE (Arcade Learning Environment)](https://github.com/Farama-Foundation/Arcade-Learning-Environment)** | Atari 2600. `pip install "gymnasium[atari]"` |
| **[Stable-Retro](https://github.com/Farama-Foundation/stable-retro)** | gym-retro 포크. **추가 게임·에뮬레이터·플랫폼** 지원 (SNES, Genesis 등 고전 게임) |
| **[OpenSpiel](https://shimmy.farama.org/environments/open_spiel/)** | **보드·카드 게임 70종 이상**. n인 제로섬/협력/일반합. Shimmy로 PettingZoo 변환 |
| **[CivRealm](https://github.com/bigai-ai/civrealm)** | Freeciv-web 기반 문명류 전략 환경. **텐서 기반 RL(Gymnasium API) + 언어 기반 LLM 에이전트 양쪽 인터페이스 제공** |
| **MineRL / MineDojo** | Minecraft RL. MineDojo는 자연어로 지정된 **1,560개 창작 과제** |
| **Crafter / Craftax** | 2D 생존. Craftax는 **JAX로 GPU 가속** |
| **[GamingAgent / lmgame-Bench](https://github.com/lmgame-org/GamingAgent)** | ICLR 2026. 6개 게임 통합 하네스, perception/memory/reasoning 모듈 토글 |

#### 4.3 B급 — 오픈소스라 직접 붙일 수 있는 것

| 게임 | 접근 |
|---|---|
| **[Pokémon Showdown](https://github.com/smogon/pokemon-showdown)** | 오픈소스 배틀 시뮬레이터. **WebSocket 프로토콜**로 봇 접속. `poke-env`(Python) 래퍼 존재 |
| **NetHack** | 공식 모딩 API는 없지만 **NLE(NetHack Learning Environment)** 가 표준. [BotHack](https://github.com/krajj7/BotHack) 같은 봇 프레임워크도 존재 |
| **Freeciv** | 오픈소스 문명류. [freeciv-python](https://github.com/yashbonde/freeciv-python), CivRealm |
| **TextWorld** | 텍스트 게임 샌드박스. 수작업 + 절차 생성 |
| **Godot/Unity 자작 게임** | **직접 만들면 API 문제가 원천 소멸**. 프로토타입엔 이게 최선일 때도 많음 |

#### 4.4 D급 — 데이터 API만 (조작 불가)

| 게임 | API | 용도 |
|---|---|---|
| 로스트아크 | [Open API](https://developer-lostark.game.onstove.com/) | 캐릭터/경매장/시세 조회 |
| 메이플스토리 외 넥슨 13종 | [NEXON Open API](https://openapi.nexon.com/) | 캐릭터/랭킹/확률 조회 |
| 리그 오브 레전드 | Riot Games API | 전적/매치 데이터 |
| Dota 2 (통계) | Steam Web API, OpenDota | 매치 이력 |

#### 4.5 X급 — 시도하지 말 것
상용 온라인 게임(MMORPG, 경쟁 FPS)의 **화면 캡처 + 입력 주입 자동화**. 커널 안티치트(EAC, nProtect, XIGNCODE3, Vanguard)가 있고, 약관 위반이며, 계정 정지 대상입니다.

---

### 5. 재평가 — 지식 있는 게임이 스타1이라면

앞 문서에서 Minecraft를 권했지만, **"SC1을 잘 안다"는 정보가 들어오면 계산이 바뀝니다.** 가장 큰 단점이었던 **도메인 지식 문제가 해소**되기 때문입니다.

| 축 | Minecraft (Mineflayer) | **StarCraft 1 (BWAPI)** |
|---|---|---|
| API 성숙도 | 높음 | **매우 높음 (20년)** |
| 도메인 지식 | 불필요 | **보유 ✅** |
| 평가 가능성 | 마일스톤 도달 | **승/패 + 대회 래더 ✅** |
| 시간 압박 | 낮음(조절 가능) | **높음 (실시간)** ❌ |
| 보상 밀도 | 촘촘 ✅ | 희소 ❌ |
| LLM 래퍼 | Voyager/Mindcraft/Cairn 존재 ✅ | **직접 만들어야 함** ❌ |
| 언어 | JS/TS ✅ | C++/Java/Scala/Kotlin |
| 차별성 | 사례 많음(레드오션) | **LLM×SC1은 미개척 ✅** |

#### 권장 경로 2가지

**A안 — 안전한 학습 경로 (권장)**
```
1. Minecraft + Mineflayer로 에이전트 구조 습득
   (FSM 게이팅, 스킬 어휘, 재계획 트리거, 비용 상한)
2. 익힌 구조를 BWAPI로 이식
   → 관측 직렬화 + 액션 어휘만 새로 설계
```
에이전트 설계와 도메인을 **동시에 배우지 않는 것**이 핵심입니다. 실패 원인을 분리할 수 있습니다.

**B안 — SC1 직행 (지식을 살리고 싶다면)**
```
1. BWAPI + Java/Kotlin으로 룰 기반 봇 먼저 (LLM 없음)
   → 빌드오더 실행 + 기본 유닛 컨트롤. 대회 봇 소스 참고
2. 매크로 페이즈 FSM 구축
   OPENING → SCOUTING → MID_GAME → ARMY_BUILDUP → ENGAGING
3. 관측 → 텍스트 직렬화 계층 작성
   (TextStarCraft2의 Chain of Summarization을 SC1로 이식)
4. FSM 상태 전이 시점에만 LLM 호출
   → 마이크로는 결정론 코드, 매크로 전략만 LLM
```

B안의 핵심은 **LLM을 실시간 컨트롤에 쓰지 않는 것**입니다. 앞 문서에서 확인했듯 RTS에서 LLM의 강점은 **마이크로가 아니라 매크로**입니다 (AlphaStar는 컨트롤이 압도적이나 전략 선택이 비합리적일 때가 있고, LLM은 일관되게 논리적). 실시간 압박은 **FSM이 흡수**하고 LLM은 페이즈 전이에서만 판단하면, 지연 문제가 구조적으로 해결됩니다.

> 참고: 스타1 지식이 있다면 **B안이 결과물의 차별성이 훨씬 큽니다.** SC1 + LLM 조합은 논문·오픈소스가 거의 없는 영역이고, SSCAIT 래더라는 **객관적 평가 무대**가 이미 존재합니다.

---

### 6. 요약

- **스타1은 API가 열려 있습니다.** [BWAPI](https://bwapi.github.io/) — C++/Java/Scala/Kotlin 지원, SSCAIT/AIIDE/CIG 대회 생태계, Docker 실행 환경. 단 **LLM 언어 래퍼는 직접 만들어야 합니다** (SC2의 TextStarCraft2에 대응하는 것이 SC1에는 없음).
- **로아/메이플도 오픈 API가 있습니다.** 단 **읽기 전용 데이터 조회**(캐릭터/경매장/랭킹)이며 조작은 불가능합니다. 자동 조작은 약관 명시 금지 + 커널 안티치트(EAC, nProtect/XIGNCODE3) + 실제 대량 제재 집행 사례가 있어 시도 대상이 아닙니다. 대신 **"데이터 분석 어시스턴트"** 는 합법적이고 가치 있는 방향입니다.
- **OCR/비전은 최후 수단.** OmniParser v2로 기술은 성숙했지만(그라운딩 SOTA 39.5%), 회당 1~5초 지연 + 이미지 토큰 비용 + 에러 누적 + 디버깅 불가라는 대가가 큽니다. 학습 목적이라면 **비전 노이즈가 정작 배우려는 에이전트 설계를 가려버립니다.**
- **선택지는 충분합니다.** Screeps(코드로만 하는 MMO), Factorio(Lua 모딩 API), Dota 2(Valve 공식 봇 API), Gymnasium 계열(ALE/Stable-Retro/OpenSpiel/CivRealm) 등 **정문이 열린 게임이 많습니다.**
- **추천**: 스타1 지식을 살리려면 **BWAPI + 매크로 페이즈 FSM + 페이즈 전이에서만 LLM 호출**. 구조를 먼저 익히고 싶으면 Minecraft로 한 사이클 돌린 뒤 이식.

---

## Sources

- [BWAPI: The Brood War API](https://bwapi.github.io/) / [GitHub](https://github.com/bwapi/bwapi) / [API 문서](https://bwapi.github.io/bwapi5/index.html)
- [rsbwapi (Rust BWAPI 클라이언트)](https://github.com/Bytekeeper/rsbwapi)
- [SSCAIT — Student StarCraft AI Tournament](https://sscaitournament.com/index.php?action=tutorial)
- [StarCraft AI Competitions, Bots and Tournament Manager Software](https://www.researchgate.net/publication/329202945_StarCraft_AI_Competitions_Bots_and_Tournament_Manager_Software)
- [Multi-platform Version of StarCraft: Brood War in a Docker Container](https://arxiv.org/pdf/1801.02193)
- [StarCraft AI wiki](https://www.starcraftai.com/wiki/Main_Page) / [Dave Churchill — StarCraft AI Resources](https://davechurchill.ca/starcraft/resources/)
- [TextStarCraft2](https://github.com/histmeisah/Large-Language-Models-play-StarCraftII/) / [논문 (NeurIPS 2024)](https://arxiv.org/abs/2312.11865)
- [로스트아크 오픈 API 개발자 포털](https://developer-lostark.game.onstove.com/)
- [NEXON Open API](https://openapi.nexon.com/) / [메이플스토리](https://openapi.nexon.com/ko/game/maplestory/)
- [넥슨 오픈 API 리뉴얼 — 청년일보](https://youthdaily.co.kr/news/article.html?no=141608)
- [MapleStory N bans 6,000+ accounts for botting](https://blockworks.com/news/maplestory-accounts-ban-bots)
- [Microsoft OmniParser](https://github.com/microsoft/omniparser) / [OmniParser V2 — Microsoft Research](https://www.microsoft.com/en-us/research/articles/omniparser-v2-turning-any-llm-into-a-computer-use-agent/) / [논문](https://arxiv.org/pdf/2408.00203)
- [Screeps Documentation](https://docs.screeps.com/) / [API Reference](https://docs.screeps.com/api/) / [node-screeps-api](https://github.com/screepers/node-screeps-api)
- [Factorio Lua API Docs](https://lua-api.factorio.com/latest/) / [typed-factorio](https://github.com/GlassBricks/typed-factorio)
- [Dota 2 Bot API Reference](https://github.com/shikyo13/Dota2AI/blob/main/docs/BOT_API_REFERENCE.md)
- [Gymnasium (Farama Foundation)](https://github.com/farama-foundation/gymnasium)
- [Arcade Learning Environment](https://github.com/Farama-Foundation/Arcade-Learning-Environment)
- [Stable-Retro](https://github.com/Farama-Foundation/stable-retro)
- [OpenSpiel — Shimmy Documentation](https://shimmy.farama.org/environments/open_spiel/)
- [CivRealm](https://github.com/bigai-ai/civrealm)
- [Pokémon Showdown](https://pokemonshowdown.com/)
- [BotHack — NetHack Bot Framework](https://github.com/krajj7/BotHack)
- [Mineflayer](https://github.com/PrismarineJS/mineflayer)
- [GamingAgent / lmgame-Bench](https://github.com/lmgame-org/GamingAgent)
