# 연구자들이 가장 많이 연구하는 게임 플레이 AI 에이전트 환경 (2026년 9월 기준)

## 쉬운 설명

**단일 게임으로는 마인크래프트가 압도적 1위**예요. 이유는 단순해요 — 할 일이 무한하고, 게임이 "지금 상황"을 글로 깔끔하게 알려주고, **서두를 필요가 없어서** AI가 천천히 생각해도 됩니다.

그런데 요즘 제일 **뜨거운** 건 **포켓몬**이에요. 작년 NeurIPS에서 정식 대회가 열렸는데 100팀 넘게 몰렸습니다. 턴제라서 생각할 시간이 넉넉하고, 사람이 둔 대전 기록이 수백만 판씩 쌓여 있거든요.

스타크래프트요? 상위권이긴 한데 마인크래프트의 **4분의 1** 수준입니다. 실시간 게임은 AI가 생각할 틈을 안 줘서 연구자들이 잘 안 갑니다.

---

## 일반 설명

### 1. 결론 — 세 층위로 나눠서 봐야 한다

"가장 많이 연구하는 게임"은 기준에 따라 답이 갈립니다.

| 기준 | 1위 | 비고 |
|---|---|---|
| **누적 논문 수 (단일 게임)** | **Minecraft** | 약 60편. 2위 그룹의 3~4배 |
| **누적 논문 수 (장르 전체)** | **Text-Adventure** | 약 135편. 단일 게임이 아니라 환경군 |
| **현재 화력 집중 (2025~2026)** | **Pokémon** | NeurIPS 2025 공식 대회, 100+ 팀 참가 |
| **평가 인프라 주도권** | **멀티게임 벤치마크 스위트** | BALROG / lmgame-Bench / Orak / DSGBench |

가장 실용적인 한 줄 답은 **"Minecraft가 여전히 중심이고, Pokémon이 가장 빠르게 커지고 있으며, 무게추는 단일 게임에서 멀티게임 벤치마크로 옮겨가는 중"** 입니다.

---

### 2. 논문 수로 본 분포

ACM Computing Surveys에 실린 *A Survey on Large Language Model-Based Game Agents* 의 부속 저장소 [awesome-LLM-game-agent-papers](https://github.com/git-disl/awesome-LLM-game-agent-papers)가 사실상 이 분야의 표준 색인입니다. 장르별 분류는 대략 이렇습니다:

| 분류 | 논문 수 | 성격 |
|---|---|---|
| Text-Adventure | ~135 | 장르(환경군). 단일 게임 아님 |
| Multi-Agent | ~78 | 주제 분류 |
| **Minecraft** | **~60** | **단일 게임 최다** |
| Sim-Social | ~56 | 사회 시뮬레이션 |
| Competition | ~51 | 주제 분류 |
| Communication | ~47 | 주제 분류 |
| Memory | ~44 | 주제 분류 |
| Sim-Embodied | ~17 | |
| Cooperation | ~15 | |
| Crafter | ~14 | Minecraft 영감 2D 축소판 |

개별 게임 기준 추정치:

| 게임 | 대략 논문 수 |
|---|---|
| **Minecraft** | **~60** |
| Werewolf / 사회적 추론 게임 | ~15–20 |
| **StarCraft II** | **~12–15** |
| Crafter | ~14 |
| Pokémon (배틀·RPG) | ~8–10 *(급상승 중)* |
| Diplomacy | ~8–10 |

> 카테고리별 수치는 저장소 분류를 요약한 것이라 **근사치**이고, 게임 분류와 주제 분류가 섞여 있어 단순 합산은 의미가 없습니다. 추세 파악용으로만 쓰세요.

---

### 3. 왜 Minecraft가 1위인가 — 여섯 가지 구조적 이유

1. **개방형·무한 과제.** 종료 조건이 없어 **자동 커리큘럼**(난이도를 스스로 올려가며 학습)이 성립합니다. 평생학습(lifelong learning) 연구의 거의 유일한 현실적 무대입니다.
2. **실시간 압박이 약하다.** ⭐ **이게 가장 과소평가된 이유입니다.** 실시간 게임이지만 1초를 더 생각해도 즉사하지 않습니다. LLM 레이턴시가 문제가 안 됩니다.
3. **관측이 구조화되어 있다.** 인벤토리·좌표·블록 상태를 그대로 텍스트로 뽑을 수 있습니다. 비전 파이프라인 없이 바로 시작 가능합니다.
4. **액션이 코드다.** Mineflayer 기반에서 LLM이 **실행 가능한 함수를 직접 작성**할 수 있고, 그게 곧 재사용 가능한 스킬이 됩니다.
5. **Voyager가 표준 패턴을 박아놨다.** 자동 커리큘럼 + 성장형 스킬 라이브러리 + 자기검증 반복 프롬프팅. 후속 연구가 "Voyager 대비 +X%"로 붙기 쉬워 **누적이 가속**됩니다.
6. **도구 스택이 성숙했다.** MineRL, MineDojo에 이어 **MineStudio**(HTTP API로 제어 가능한 Minecraft 시뮬레이터)가 표준 인프라 역할을 합니다.

2026년에도 활발합니다 — **MineExplorer**(MineStudio 기반, MLLM의 개방형 탐험 능력 평가. atomic + multi-hop 과제), **Optimus-3**(범용 멀티모달 Minecraft 에이전트), 멀티에이전트 병렬 계획·행동 연구 등. 평가 대상 모델도 Claude Opus 4.5/4.6, GPT-5.x, Gemini 계열로 최신입니다. **즉 "옛날 벤치마크"가 아니라 현역입니다.**

---

### 4. 2025~2026의 실질적 변화 — Pokémon의 급부상

논문 누적량은 아직 Minecraft에 밀리지만, **커뮤니티 동원력에서는 현재 가장 뜨겁습니다.**

**PokéAgent Challenge** (NeurIPS 2025 공식 competition):

- **100개 이상의 팀**이 두 트랙에 참가.
- **Track 1 — Competitive Battling**: Pokémon Showdown 기반. **불확실성 하의 전략적 추론**. AI 전용 Showdown 서버에서 주최측 베이스라인 및 참가자끼리 랭크 래더 → 토너먼트 진출.
- **Track 2 — Speedrunning**: Pokémon Emerald RPG. **장기 시계열 계획(long-horizon planning)**.
- **데이터 규모**: 350만+ 배틀 데이터셋, 공개된 것 중 최대 규모인 **인간 데모 400만 + 합성 배틀 1800만**.
- **결과**: **범용 LLM << 특화 RL 에이전트 << 엘리트 인간** 순으로 유의미한 격차 확인.
- 대회 종료 후 **라이브 리더보드를 갖춘 living benchmark로 전환**.

**왜 Pokémon인가:**

| 요인 | 의미 |
|---|---|
| **턴제** | LLM 레이턴시가 원천적으로 문제 안 됨 |
| **불완전 정보** | 상대 팀 구성·기술·도구를 모름 → 추론 가치가 큼 |
| **방대한 인간 데이터** | Showdown 리플레이가 수백만 판. 모방학습·오프라인 RL 가능 |
| **객관적 평가** | Elo 래더가 이미 존재 |
| **두 가지 능력을 한 게임에서** | 배틀(전술적 추론) + RPG(장기 계획) |
| **접근성** | 오픈소스 시뮬레이터, 가벼운 실행 비용 |

관련 계보: PokéLLMon(인간 동급 배틀 에이전트), 트랜스포머 기반 오프라인 RL로 인간급 경쟁 달성, PTCG-Bench(포켓몬 카드게임) 등으로 가지가 뻗고 있습니다.

---

### 5. 더 중요한 흐름 — 단일 게임에서 "벤치마크 스위트"로

2024년 이후 경쟁의 무게추가 **"어느 게임을 풀 것인가"에서 "어떤 게임 묶음으로 평가할 것인가"로** 옮겨갔습니다.

| 벤치마크 | 시기 | 구성 | 특징 |
|---|---|---|---|
| **BALROG** | 2024/11 | **NetHack(NLE), MiniHack, Crafter, Baba Is AI, BabyAI, TextWorld** — 6개 RL 환경 | 매우 어려워서 **장기 계획·공간 추론·내비게이션**의 세밀한 진전을 관측 가능 |
| **DSGBench** | 2025/03 (ICASSP 2026) | **StarCraft II, Civilization, Street Fighter III, Werewolf, 군인장기/Diplomacy** 등 6개 전략게임 | 실시간/턴제, 완전/불완전 정보, 단일/멀티에이전트를 교차. **전략계획·실시간결정·환경적응·팀워크·정책안정성** 5축 평가 |
| **lmgame-Bench** | 2025/05 | 플랫포머·퍼즐·내러티브 탐정물 | **Gym 스타일 통합 API** + 경량 perception/memory scaffold. 13개 모델 비교 |
| **Orak** | 2025/06 | **12개 상용 비디오게임, 전 장르** | 기존 벤치마크의 3대 결함을 명시적으로 지적 — ①장르 다양성 부족 ②에이전틱 모듈 연구 부재 ③**파인튜닝 데이터셋 부재**. 전문가 궤적 데이터 제공 |
| GVGAI-LLM / PuzzleJAX | 2025/08 | 절차생성 무한 게임 | 과적합 방지 목적 |

**Orak이 제기한 문제의식이 이 흐름을 요약합니다** — 한 게임을 잘 푸는 건 더 이상 기여로 인정받기 어렵고, **여러 장르에 걸친 일반화 + 에이전트 모듈의 기여도 분해 + 학습 데이터 제공**이 요구됩니다.

---

### 6. 영역별 대표 환경 정리

| 연구 영역 | 주 환경 |
|---|---|
| 개방형 평생학습 / 스킬 라이브러리 | **Minecraft** (Voyager, Optimus-3, MineExplorer) |
| 장기 시계열 계획 + 불완전정보 전술 | **Pokémon** (PokéAgent Challenge) |
| 극한 난이도 장기 계획 | **NetHack** (NLE, BALROG) |
| 실시간 전략(RTS) | **StarCraft II** (TextStarCraft2, SwarmBrain, StarEvolve, SC2Arena) |
| 사회적 추론 / 기만 / 설득 | **Werewolf, Avalon, Diplomacy** |
| 언어 이해·탐험 | **TextWorld, BabyAI** (Text-Adventure 계열) |
| 규칙 추론 / 메타 퍼즐 | **Baba Is AI**, PuzzleJAX |
| 축소판 샌드박스(저비용 반복실험) | **Crafter** |

---

### 7. 브루드워 프로젝트 관점에서의 함의

이 분포가 앞 문서들의 결론을 수치로 확인해줍니다.

1. **StarCraft II조차 소수파입니다.** ~12–15편으로 상위권이긴 하지만 **Minecraft의 1/4 수준**입니다. 그리고 **브루드워는 사실상 0편**입니다. 앞서 "연구자료가 SC2로 다 가버렸다"고 했는데, 더 정확히는 **"SC2로 간 것도 전체로 보면 소수"** 입니다.

2. **실시간 게임 자체가 LLM 에이전트 연구의 비주류입니다.** 상위 환경을 보면 Minecraft(실시간이나 압박 약함), Pokémon(턴제), NetHack(턴제), Text-Adventure(턴제), Werewolf(턴제). **연구 주류는 LLM이 생각할 시간이 있는 환경**입니다. 이게 RTS 연구가 적은 진짜 이유이고, 동시에 **FSM+오케스트레이터 하이브리드가 RTS에서 필수인 이유**이기도 합니다.

3. **양날의 신호입니다.**
   - **기회**: 브루드워는 완전한 미개척지이고, BASIL/SSCAIT라는 객관적 상시 평가 무대까지 있습니다. 대부분의 LLM 게임 에이전트 논문이 "내장 AI 상대 승률"이라는 약한 평가에 머무는 것과 대비됩니다.
   - **위험**: 비어 있는 데는 이유가 있습니다 — 실시간 압박, 언어 래퍼 부재, 32비트 Windows 툴체인. 앞 문서의 관문 3개(신용 할당, 조합 유효성, 입도)를 넘지 못하면 그냥 안 되는 이유를 재확인하는 프로젝트가 됩니다.

4. **학습용이 목적이라면 Minecraft가 여전히 합리적 출발점입니다.** 참고 구현·도구·비교 지표가 전부 갖춰져 있고, 거기서 익힌 **스킬 라이브러리 / 재조립 / 자기검증 패턴이 그대로 브루드워로 이식**됩니다. 앞 문서에서 "Minecraft로 한 사이클 돌고 SC로"라고 한 순서가 이 분포에서도 지지됩니다.

---

## 참고 자료

- [A Survey on Large Language Model-Based Game Agents (ACM CSUR)](https://arxiv.org/pdf/2404.02039) / [awesome-LLM-game-agent-papers (색인 저장소)](https://github.com/git-disl/awesome-LLM-game-agent-papers)
- [The PokéAgent Challenge: Competitive and Long-Context Learning at Scale (arXiv 2603.15563)](https://arxiv.org/abs/2603.15563) / [프로젝트](https://pokeagent.github.io/) / [NeurIPS 2025 competition](https://neurips.cc/virtual/2025/competition/127733)
- [Human-Level Competitive Pokémon via Scalable Offline RL with Transformers](https://arxiv.org/pdf/2504.04395)
- [BALROG: Benchmarking Agentic LLM and VLM Reasoning On Games (arXiv 2411.13543)](https://arxiv.org/pdf/2411.13543) / [문서](https://balrog-ai.github.io/docs/index.html)
- [Orak: A Foundational Benchmark for Training and Evaluating LLM Agents on Diverse Video Games (arXiv 2506.03610)](https://arxiv.org/abs/2506.03610)
- [LMGame-Bench: How Good are LLMs at Playing Games? (arXiv 2505.15146)](https://arxiv.org/html/2505.15146v1)
- [DSGBench: A Diverse Strategic Game Benchmark (arXiv 2503.06047)](https://arxiv.org/abs/2503.06047) / [GitHub](https://github.com/DeciBrain-Group/DSGBench)
- [MineExplorer: Evaluating Open-World Exploration of MLLM Agents in Minecraft](https://arxiv.org/html/2605.30931v4)
- [GVGAI-LLM: Evaluating LLM Agents with Infinite Games](https://arxiv.org/pdf/2508.08501) / [PuzzleJAX](https://arxiv.org/pdf/2508.16821)
- [Voyager: An Open-Ended Embodied Agent with LLMs](https://arxiv.org/abs/2305.16291)
