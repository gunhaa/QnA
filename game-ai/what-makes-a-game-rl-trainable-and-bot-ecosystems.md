# 게임에 RL이 가능하려면 — API가 조건인가, 그리고 봇 생태계가 있는 게임 / 없는 게임

> 조사 기준일: 2026-09-21. API가 열린 게임의 **목록**은 [게임 API 개방 현황과 비전 기반 접근](./game-apis-and-vision-based-agents.md)에 이미 정리되어 있으므로, 여기서는 **"왜 어떤 게임에만 봇 생태계가 생기는가"**라는 구조적 조건에 집중한다.

## 쉬운 설명

봇을 학습시키려면 게임을 **수백만 판** 돌려야 해요. 그러려면 게임이 "빨리감기"가 되고, 여러 판을 동시에 돌릴 수 있고, 사람이 지켜보지 않아도 알아서 돌아가야 합니다. API는 그중 **말을 거는 창구**일 뿐이에요. 진짜 조건은 **"게임을 빨리, 많이, 혼자 돌릴 수 있느냐"**입니다.

그래서 요즘 인기 온라인 게임(롤, 발로란트 같은)엔 봇 생태계가 없어요. API가 없어서가 아니라, **빨리감기가 안 되고(서버가 실시간으로만 돌고)** 무엇보다 **회사가 커널 단계에서 막고 있기** 때문입니다.

## 일반 설명

### 1. "API가 공개돼서 가능했다"는 절반만 맞다

먼저 사실관계 정정 하나. **BWAPI는 블리자드 공식 API가 아니다.** 1.16.1 실행 파일에 DLL을 주입해 게임 내부 구조를 읽고 명령을 넣는 **커뮤니티 제작 라이브러리**이고, 블리자드가 20년 가까이 **묵인**해 온 것에 가깝다. 리마스터에는 적용되지 않는다 — 누군가 Pluto를 리마스터에 억지로 이식해 래더에 올린 사건이 벌어진 구조적 이유가 바로 이것이다.

RL 학습이 성립하려면 API 말고도 아래 조건이 **동시에** 필요하다.

| 조건 | 왜 필요한가 | BW의 상태 |
|---|---|---|
| ① **프로그래밍 인터페이스** | 관측·행동을 구조화된 데이터로 주고받아야 함. 픽셀보다 수십 배 효율적 | BWAPI ✅ |
| ② **실시간보다 빠른 실행(배속)** | 수백만 판을 실시간으로 돌리면 수십 년 | 속도 무제한 ✅ |
| ③ **헤드리스 + 병렬 실행** | 수십~수천 인스턴스를 동시에 | 프로세스 단위로 가능 (무겁지만) ✅ |
| ④ **무인 자동 리셋/복구** | 크래시·타임아웃을 자동 처리해야 며칠씩 돌아감 | 직접 구축 필요 ⚠️ |
| ⑤ **오프라인 실행 (서버 비의존)** | 남의 서버를 수백만 판 두드릴 수는 없음 | 로컬 실행 ✅ |
| ⑥ **약관·안티치트 허용** | 기술적으로 가능해도 막히면 끝 | 1.16.1은 사실상 방치 ✅ / 리마스터는 ❌ |

②③⑤가 진짜 핵심이다. **API가 있어도 실시간 1배속으로만 돌아가는 온라인 게임은 RL 학습이 사실상 불가능하다.** 거꾸로 API가 없어도 에뮬레이터로 배속·병렬이 되면 학습은 가능하다(예: 고전 게임 에뮬레이터, 슈퍼스매시브라더스 멜리).

비전(화면 캡처) 기반 접근은 ①을 우회하지만 ②를 못 우회한다. 추론에 회당 1~5초가 걸려 실시간조차 버거우므로, **플레이는 몰라도 학습에는 못 쓴다.**

### 2. 봇 생태계가 실제로 형성된 게임들

"라이브러리가 존재한다" 수준이 아니라 **대회·래더·랭킹이 돌아가는** 곳만 추렸다.

| 게임 | 인터페이스 | 성격 | 생태계 |
|---|---|---|---|
| **StarCraft: Brood War** | BWAPI (커뮤니티, DLL 주입) | RTS, 불완전정보 | SSCAIT, BASIL, AIIDE, CoG — 20년 누적. Pluto 등장 무대 |
| **StarCraft II** | Blizzard **공식** SC2 API / PySC2 | RTS | [AI Arena](https://aiarena.net/) 24시간 래더, AlphaStar의 무대 |
| **Rocket League** | **RLBot**(오프라인 봇 프레임워크) + **RLGym**(Gym 스타일 RL 환경, Bakkesmod 플러그인) | 물리 기반 실시간 | 가장 활발한 커뮤니티 RL 씬. 대표 봇 **Nexto**가 1v1/2v2/3v3에서 그랜드챔피언1(상위 0.12~0.95%)급 |
| **Dota 2** | Valve **공식 봇 스크립팅 API** (Lua, 7.00~) | MOBA | OpenAI Five의 무대. 다만 공식 API는 스크립트 봇용이라 RL 학습엔 별도 인프라 필요 |
| **Minecraft** | Mineflayer(프로토콜), MineRL, Malmo | 오픈월드 | LLM 에이전트 연구 단일 게임 최다(Voyager 등) |
| **Factorio** | **공식 Lua 모딩 API** | 자동화 | 모딩 문화가 곧 API. 최근 LLM 에이전트 벤치마크로도 사용 |
| **Screeps** | 공식 JS 런타임 | MMO | **"코드로만 플레이하는" 게임**. 봇이 곧 플레이어 |
| **Pokémon Showdown** | poke-env (오픈소스 시뮬레이터) | 턴제 | 리플레이 수백만 판 공개 + Elo 래더. 2025~26 연구 급증 |
| **Super Smash Bros. Melee** | **libmelee** + Slippi (에뮬레이터/리플레이) | 격투 | 익명 리플레이 약 10만 판 공개 → 모방학습 + RL 파인튜닝 파이프라인 |
| **보드/카드게임** | OpenSpiel, 각종 엔진 | 턴제 | 체스·바둑(KataGo)·포커(Pluribus)·Hanabi |
| **프로그래밍 게임** | 게임 자체가 API | — | Battlecode, Halite, Robocode, CodinGame — 애초에 봇 대전용으로 설계 |

여기서 공통 패턴이 보인다. 봇 생태계는 다음 중 **여러 개가 겹칠 때** 생긴다.

1. **오프라인/프라이빗 매치가 가능**하다 (RLBot은 애초에 오프라인 전용 프레임워크다)
2. **모딩 문화 또는 오픈소스 시뮬레이터**가 있다 (Factorio, Showdown, Slippi)
3. **결정론적·경량 시뮬레이션**이라 배속이 잘 나온다
4. **게임이 오래됐거나 경쟁 무결성 압박이 낮다** (BW 1.16.1)
5. **퍼블리셔가 묵인하거나 공식 지원**한다 (Valve, Blizzard의 SC2 API, Sony의 GT Sophy)
6. **공개 리플레이 데이터**가 쌓여 있다 (모방학습 부트스트랩이 가능해짐)

### 3. "유저는 많은데 봇은 없는" 게임 — 빈틈이 아니라 차단이다

질문의 후반부가 가장 중요한 지점이다. **유저가 많은 게임에 봇 생태계가 없는 것은 아무도 시도하지 않아서가 아니라, 구조적으로 막혀 있기 때문이다.**

| 차단 요인 | 내용 | 해당 게임 |
|---|---|---|
| **커널 레벨 안티치트** | Riot Vanguard, Easy Anti-Cheat, Ricochet 등이 드라이버 단계에서 메모리 접근·입력 주입을 차단. 2026년 5월 Riot은 DMA 카드 대응까지 강화 | LoL, 발로란트, 포트나이트, Apex, CS2 |
| **서버 권위 + 오프라인 모드 부재** | 게임 상태가 서버에만 있어 로컬 배속·병렬 실행이 원천 불가 | 대부분의 온라인 경쟁 게임 |
| **약관/법적 제재** | 자동화 자체가 제재 사유. 2026년 OSRS는 RuneMate·DreamBot·TriBot 등 주요 봇 클라이언트를 셧다운시키고 수백만 계정 정지 | OSRS, 대부분의 MMO |
| **경쟁 무결성 압박** | e스포츠 종목일수록 퍼블리셔가 어떤 형태의 자동화도 허용하지 않음 | 모든 주요 e스포츠 |
| **실시간 1배속 고정** | 설령 접근이 허용돼도 학습용 데이터 수집 속도가 실시간에 묶여 RL이 성립 불가 | 온라인 전용 게임 전반 |

즉 **"유저 많음 + 봇 없음 = 기회"가 아니라, 대개 "유저 많음 = 지켜야 할 게 많음 = 차단"**이다. 국내 게임도 마찬가지로 nProtect GameGuard, XIGNCODE3, EAC가 걸려 있다.

반대로 **빈틈이 실제로 열리는 경우**는 네 가지다.

1. **구작 / 서비스 종료작** — 안티치트가 사실상 방치되고, 클라이언트가 로컬에서 완결된다. BW 1.16.1이 정확히 이 경우다.
2. **싱글플레이·오프라인 모드가 있는 게임** — Rocket League의 RLBot이 "오프라인 전용"으로 선을 그어 존속하는 방식.
3. **퍼블리셔가 직접 판을 깔아주는 경우** — Blizzard의 SC2 API, Valve의 Dota 봇 API, Sony의 GT Sophy(그란 투리스모 공식 협업), DeepMind의 SIMA 계열.
4. **턴제 + 오픈소스 시뮬레이터** — 실시간 제약이 없고 시뮬레이터를 마음껏 복제할 수 있다. Pokémon Showdown이 2025~26년에 연구 대상으로 급부상한 이유.

**새로 뛰어든다면 현실적인 후보**는 다음과 같다: 오픈소스 시뮬레이터가 있는 턴제 게임(카드·전략), 모딩 API가 열린 싱글플레이 게임(Factorio류), 리플레이가 공개된 격투·레이싱 게임(Slippi류), 그리고 애초에 코딩이 게임인 플랫폼(Screeps, Battlecode). 유저 수보다 **"배속·병렬·오프라인이 되는가"**를 먼저 보는 것이 맞다.

### 4. Pluto 사건이 처음이 아니다 — Rocket League의 Nexto 전례

구조가 소름 끼칠 만큼 똑같다.

| | Nexto (Rocket League, 2022) | Pluto (Brood War, 2026) |
|---|---|---|
| 정체 | RLGym으로 학습된 커뮤니티 RL 봇, GC1급 | 자가대국 RL 봇, 최상위 |
| 사건 | 제3자가 개조해 **랭크 온라인**에 투입 → 하루 만에 다이아→그랜드챔피언 | 제3자가 **리마스터 래더**에 이식 + 맵핵 → 글로벌 5위 |
| 커뮤니티 대응 | 일반화된 봇 탐지기 개발, 개발자 측 "악용 방지 조치" | PurpleWave 저자가 리플레이 16만 건 기반 탐지기를 블리자드에 제안 |
| 퍼블리셔 | Psyonix: 무관용 정지 + **"이 급의 봇은 더 이상 공개 배포하지 말 것"**을 RLGym에 요청 | 블리자드 반응 미확인. 저자는 공개 시범경기 중단 |

교훈은 분명하다. **오프라인 대회용 봇이 인간 최상위 수준에 도달하는 순간, 그 가중치는 곧바로 온라인 치트로 전용된다.** 그래서 이 분야의 공개 방식은 점점 "가중치 공개"에서 "제한된 대전 플랫폼 제공"(SCHNAIL, RLBot의 오프라인 전용 정책) 쪽으로 이동하고 있다. 봇 생태계의 수명은 기술력이 아니라 **배포 설계**가 결정한다.

### 5. 정리

- **API는 필요조건이지 충분조건이 아니다.** 진짜 관문은 배속·병렬·오프라인 실행이다.
- BWAPI는 공식 API가 아니라 **묵인된 커뮤니티 인젝션 라이브러리**이며, 리마스터에는 적용되지 않는다. Pluto 사건은 이 경계가 뚫린 사건이다.
- 봇 생태계가 살아 있는 곳은 대부분 **구작·오프라인 가능·모딩 친화·퍼블리셔 묵인** 조건이 겹친 게임이다.
- **유저는 많은데 봇이 없는 게임은 기회가 아니라 차단된 영역**인 경우가 압도적이다. 커널 안티치트와 서버 권위 구조가 이유다.
- 새 판을 열고 싶다면 유저 수가 아니라 **"실시간보다 빠르게, 혼자서, 많이 돌릴 수 있는가"**를 기준으로 게임을 고르는 것이 맞다.

## 참고 자료

- [BWAPI](https://bwapi.github.io/) · [tscmoo/pluto](https://github.com/tscmoo/pluto)
- [RLBot](https://rlbot.org/) · [RLGym](https://rlgym.org/) · [Necto/Nexto 저장소](https://github.com/Rolv-Arild/Necto)
- [Rocket League AI 치트 사건 — PC Gamer](https://www.pcgamer.com/uh-oh-people-are-now-using-a-machine-learning-bot-to-cheat-in-rocket-league/) · [Psyonix 대응 — NME](https://www.nme.com/news/gaming-news/rocket-league-developer-is-investigating-solutions-to-ai-cheats-in-ranked-matches-3378889) · [Kotaku 분석](https://kotaku.com/rocket-league-machine-learning-cheating-nexto-bot-1849980593)
- [SC2 AI Arena](https://aiarena.net/)
- [libmelee (Smash Melee)](https://github.com/altf4/libmelee) · [Mineflayer](https://github.com/PrismarineJS/mineflayer) · [Factorio Lua API](https://lua-api.factorio.com/latest/) · [Screeps](https://docs.screeps.com/)
- [Riot Vanguard — Wikipedia](https://en.wikipedia.org/wiki/Riot_Vanguard) · [커널 레벨 안티치트 개요](https://en.wikipedia.org/wiki/Kernel-level_anti-cheat) · [Vanguard vs Ricochet 2026](https://gamemodifier.com/blog/kernel-anticheat-explained-vanguard-ricochet)
- [OSRS 봇 클라이언트 셧다운 (2026)](https://bottinghub.com/osrs-bot-crackdown-2026/)
- 관련 문서: [게임 API 개방 현황·비전 기반 접근](./game-apis-and-vision-based-agents.md), [연구가 많은 게임 환경 정리](./most-researched-game-ai-agent-environments.md), [Pluto 래더 사건](./starcraft/pluto-rl-bot-ladder-incident.md), [RTS RL 학습 비용·난이도](../reinforcement-learning/starcraft-rl-bot-training-cost-and-difficulty.md)
