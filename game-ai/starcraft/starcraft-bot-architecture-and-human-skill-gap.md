# 스타크래프트 AI 대회 상위 봇은 정말 LLM 없이 만들어졌나, 그리고 프로와의 기력 차이

## 쉬운 설명

대회에서 이기는 봇들은 **정말로 LLM을 안 씁니다.** 대신 "이럴 땐 이렇게 해"라는 규칙을 사람이 **수만 줄씩 손으로 써넣은** 거예요. FSM 하나만 있는 건 아니고, 빌드 짜는 머리 + 싸움 시뮬레이터 + 정찰 추리 + 이전 판 기록 보고 전략 고르는 통계 계산기가 전부 붙어 있는 **큰 기계**입니다.

기력은? **동네에서 좀 하는 형** 정도예요. 프로가 붙으면 20분 안에 4판을 다 이겨버립니다. 손은 봇이 1분에 19,000번 움직이는데도 집니다. 왜냐면 **상대가 뭘 하려는지 못 알아채고**, 한 번 진 방법에 **다음 판에도 똑같이** 지거든요.

---

## 일반 설명

### 1. 결론부터: LLM은 안 쓴다. 그런데 "FSM만"도 아니다

**BWAPI 대회(AIIDE / SSCAIT / IEEE CoG) 상위권 봇 중 LLM을 쓰는 봇은 하나도 없습니다.** 딥러닝조차 우승 지분이 없습니다. 그러나 "FSM만"이라는 표현은 정확하지 않습니다. 실제 상위 봇은 **여러 알고리즘 계층이 쌓인 하이브리드**입니다.

#### 1.1 상위 봇의 실제 구성 요소

| 계층 | 쓰이는 기법 | 실제 사례 |
|---|---|---|
| 전략 선택 (매판) | **multi-armed bandit (UCB1)** — 상대별 승률 기록으로 빌드 선택 | **BananaBrain**: 매치업당 10여 개 빌드를 두고 과거 전적 기반 UCB1로 선택 |
| 상대 전략 추론 | 직접 관측 + **소거법(process of elimination)** + 베이지안 | **PurpleWave**: 관측/소거로 적 전략을 판정하고 상대별 경향을 게임 간 누적 |
| 빌드 오더 계획 | **HTN (Hierarchical Task Network)** / 빌드오더 탐색 | PurpleWave의 매크로는 단순 HTN — "Probe 생산" 같은 말단 태스크가 "포화까지 Probe 연속 생산"의 하위로 엄격히 우선순위 정렬됨 |
| 교전 판단 | **전투 시뮬레이터** (SparCraft, FAP) — 붙으면 이기는지 수십 ms 안에 시뮬 | 거의 모든 상위 봇 공통 |
| 부대 이동 | **influence map / potential field**, 지형 그래프(BWEM/BWTA) | 공통 |
| 유닛 단위 행동 | **FSM / behavior tree** | 여기서만 FSM이 등장 |
| 게임 간 학습 | **파일로 상대 모델 영속화** (대회는 상대별 다전제라 라운드마다 누적) | 대회 규칙이 read/write 디렉터리를 보장 |

즉 FSM은 **맨 아래 실행 계층**일 뿐이고, 그 위에 **탐색(search) + 얕은 통계 학습(bandit/베이지안) + 도메인 하드코딩**이 올라가 있습니다. 앞 문서에서 정리한 "FSM이 실시간 압박을 흡수하고 상위 계층이 판단한다"는 구조가 **대회 봇에서 이미 표준**이라고 보면 됩니다. 다만 그 상위 계층이 LLM이 아니라 사람이 짠 규칙과 탐색일 뿐입니다.

#### 1.2 "구식 AI가 이겼다" — AIIDE 2018이라는 결정적 사례

2018년 AIIDE 대회는 이 질문의 교과서적 답입니다.

- **우승: SAIDA** (삼성 리서치, 한국). **완전 룰 기반.** 상대 전략에 따라 특정 전략을 취하도록 **손으로 하드코딩**. 같은 팀이 강화학습 버전도 개발 중이었으나 대회에 맞추지 못함.
- **2위: CherryPi** (Facebook AI Research) — 현대 머신러닝 기법 사용.
- **3위: 중국 연구팀** — 역시 ML 기반. 기존 코드를 활용해 6주 만에 제작.

MIT Technology Review가 이 결과를 *"An old-fashioned AI has won a StarCraft shootout"* 이라는 제목으로 다뤘습니다. 딥러닝이 절정이던 시기에도 **브루드워에서는 손코딩이 ML을 이겼다**는 겁니다.

이후로도 상위권은 **PurpleWave**(Scala, HTN + 상대 모델링, AIIDE 2024 2위·2025 3위, SSCAIT 2018-19/2019-20 우승), **Stardust**(C++, 프로토스), **BananaBrain**, **Steamhammer**, **McRave** 등 **전부 사람이 짠 봇**입니다.

#### 1.3 왜 LLM을 안 쓰나 — 세 가지 구조적 이유

**(1) 레이턴시.** 브루드워는 대회 기준 초당 약 24프레임, 프레임당 ~42ms 안에 결정이 나와야 하고, 프레임당 시간 초과가 누적되면 실격입니다. LLM 왕복은 아무리 빨라도 수백 ms~수 초입니다. **실시간 루프에 LLM을 넣는 건 규칙상 불가능**합니다.

**(2) 병목이 "언어적 추론"이 아니다.** 앞 문서에서 확인했듯 RTS에서 LLM의 강점은 **매크로(전략 선택)** 이지 **마이크로**가 아닙니다. 그런데 대회 봇들의 실제 패배 원인은 대부분 교전 판단·유닛 컨트롤·정찰 정보 해석 같은 **저수준 실행**입니다. LLM이 잘하는 부분과 병목이 어긋나 있습니다.

**(3) 평가 무대가 봇 vs 봇이다.** 대회는 상대별 다전제입니다. 여기서 이기는 핵심은 "상대 봇의 고정 패턴을 파악해 카운터를 고정"하는 것이고, 이건 **bandit + 상대별 전적 파일**로 충분합니다. 언어 추론이 줄 이득이 작습니다.

#### 1.4 딥러닝/LLM은 어디까지 왔나 (SC1이 아니라 SC2 쪽)

- **AlphaStar (SC2)**: 2019년 7월부터 유럽 1v1 래더에 익명 참가해 8월 말 **그랜드마스터, 상위 0.2%** 도달. 다만 시야를 인게임 카메라로 제한하고 APM을 5초당 600 / 15초당 400 / 60초당 300으로 묶은 버전입니다. **DeepMind 규모의 TPU 리그 학습**이 필요했고, **브루드워에는 이 규모의 시도가 없었습니다.**
- **LLM 에이전트 (SC2)**: TextStarCraft2의 Chain of Summarization이 **내장 AI Harder(Lv5)** 격파, 2025년의 Hierarchical Expert Prompt 계열이 **Elite(Lv7)** 를 처음으로 격파. 이건 인간 기준으로 **아마추어 중급** 수준입니다.
- **LLM × 브루드워(BWAPI)**: 사실상 연구·오픈소스가 없습니다. SC2에는 TextStarCraft2·LLM-PySC2·SwarmBrain·SC2Arena 같은 언어 환경이 쌓였지만, **SC1에는 대응물이 없습니다.** 앞 문서에서 "차별성이 크다"고 한 이유가 이것입니다.

---

### 2. 프로와의 기력 차이

#### 2.1 유일한 공식 대결: 2017 세종대 — 송병구 4:0

세계 최초로 프로게이머와 AI가 공개 대결한 이벤트(2017년, 서울 세종대)입니다.

- 상대 봇 4개: **CherryPi**(Facebook AI Research), 호주·노르웨이·한국 봇.
- 결과: **송병구(Stork) 4전 4승. 총 소요 27분 미만.**
- 봇들은 인간이 못 하는 짓을 했습니다. 노르웨이 봇은 **분당 19,000 액션(APM)** 을 기록했습니다. 프로도 수백 APM을 못 넘깁니다.
- 그럼에도 완패했습니다. 관전평은 "Stork는 쉽게 이겼다 — 우월한 **의사결정**과 강한 **마이크로**". 봇의 패인은 손 속도가 아니라 **전략 판단**이었습니다.

#### 2.2 아마추어 기준으로 본 봇의 실제 위치

| 상대 | 봇의 성적 |
|---|---|
| ICCup **D 랭크** | 봇이 이김 |
| ICCup **C 랭크** | 일부 봇(Tscmoo, krasi0 등)이 **가끔** 이김 |
| 같은 상대와 **다전제** | **거의 항상 봇이 짐** — 인간이 1~2판만 겪으면 봇의 작은 실수를 찾아내 계속 착취 |
| 프로 (A+/S급) | 승률 사실상 0 |

이걸 체감으로 옮기면 **"배틀넷에서 좀 한다는 아마추어" 정도**입니다. 프로와는 **여러 티어 차이**로, 체스로 치면 프로가 GM이면 봇은 클럽 플레이어 수준입니다.

#### 2.3 봇 vs 인간 상시 래더(SCHNAIL)가 보여주는 것

**SCHNAIL**(StarCraft Human 'N' AI League)은 인간과 봇이 같은 Elo 풀에서 겨루는 상시 래더입니다. 봇·인간 모두 1500에서 시작(K=32).

- 1500은 사실상 **봇의 상단**에 해당하고, **대부분의 봇 레이팅은 1500 아래**에 깔립니다.
- **가장 강한 인간 유저들은 "자기가 지는 봇"이 아예 없습니다.**
- 관전 분석: 봇이 이길 때의 승인은 보통 **매크로(자원 운영)** 이고, 지는 원인은 **적 병력의 의도를 예측하지 못하는 것**. 인간은 **적응력과 수비 회복력**에서 앞섭니다.

#### 2.4 차이의 성격 — 봇은 왜 손이 빠른데 지는가

봇이 인간보다 **명백히 우위인 것**:
- APM·동시 조작 (멀티태스킹 상한이 없음)
- 자원/인구 관리의 기계적 정확성
- 교전 시뮬레이션 기반의 즉각적 손익 계산

봇이 **구조적으로 밀리는 것**:
1. **정찰 정보 해석** — 본 것을 "상대가 무엇을 하려는가"로 번역하지 못함. Jay Scott이 지적한 "적 병력 의도를 못 읽는 것이 치명적 약점".
2. **다전제 적응** — 인간은 1판만 보면 패턴을 읽고 착취하지만, 봇의 적응은 bandit 통계 수준이라 느리고 거칠다.
3. **전략 다양성** — 빌드가 10여 개로 고정. 프로는 사실상 무한.
4. **미세한 예외 상황** — 하드코딩된 규칙 밖의 상황(이상한 지형, 예상 못 한 드랍, 심리전)에서 붕괴.
5. **glass ceiling** — 커뮤니티 관측으로 봇 대 봇 Elo는 2500~2600 부근, 인간 상대로는 C급 언저리에서 정체. 매크로·마이크로 개선을 더 넣어도 **상대 인간 대비 상대 강도는 미미하게만 오릅니다.** 병목이 실행이 아니라 **판단**이기 때문입니다.

#### 2.5 전체 지형도

```
[브루드워]
프로 (S/A+)  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
고수 (A~B)   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓
상위 아마(C+)▓▓▓▓▓▓▓▓▓▓
최상위 봇    ▓▓▓▓▓▓▓        ← PurpleWave / Stardust (C- ~ D+)
일반 봇      ▓▓▓▓

[스타2]
프로 top     ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
AlphaStar    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   ← GM 상위 0.2% (은퇴, 지금은 안 돌아감)
LLM 에이전트 ▓▓▓▓▓▓▓              ← 내장 Elite AI 격파 = 아마 중급
```

**핵심 비대칭**: 브루드워에서 인간을 위협할 만한 것(AlphaStar급 딥RL)은 **아무도 만들지 않았고**, 만들어진 것(룰 기반 봇)은 **판단 계층에서 천장에 막혀 있습니다.**

---

### 3. 이게 우리 프로젝트에 주는 의미

1. **"LLM 없이 FSM만"이라는 인상은 절반만 맞습니다.** 상위 봇은 이미 FSM 위에 탐색·통계 학습·상대 모델링을 올린 하이브리드입니다. **LLM을 붙인다는 건 이 스택에 완전히 새 계층을 얹는 것**이지, 없던 지능을 처음 넣는 게 아닙니다.
2. **LLM이 들어갈 자리는 정확히 봇들이 못 하는 곳입니다.** 정찰 정보 해석 → 상대 의도 추론 → 전략 전환. 이건 현재 봇의 **1번 약점**이고, LLM의 **1번 강점**입니다. 반대로 마이크로·교전 판단에 LLM을 넣으면 레이턴시로 자멸합니다.
3. **목표 기력을 현실적으로 잡으세요.** 프로 격파는 DeepMind 규모 문제입니다. 현실적 목표는 **"SSCAIT/BASIL 래더에서 기존 룰 기반 봇을 상대로 유의미한 승률"**, 또는 더 흥미롭게 **"다전제에서 인간에게 착취당하지 않는 봇"** 입니다. 후자는 기존 봇의 고질병이라 LLM이 실제로 기여할 수 있는 지점입니다.
4. **비교 기준선이 이미 존재합니다.** PurpleWave·Stardust의 소스가 공개돼 있어, 같은 봇의 전략 계층만 LLM으로 바꿔 A/B를 돌리는 **깨끗한 실험 설계**가 가능합니다.

---

## 참고 자료

- [Humans Are Still Better Than AI at StarCraft—for Now (MIT Technology Review, 2017)](https://www.technologyreview.com/2017/11/01/241763/humans-are-still-better-than-ai-at-starcraftfor-now/) — 세종대 송병구 4:0
- [human-bot games with Stork (Starcraft AI blog)](http://satirist.org/ai/starcraft/blog/archives/406-human-bot-games-with-Stork.html)
- [An old-fashioned AI has won a Starcraft shootout (MIT Technology Review, 2018)](https://www.technologyreview.com/2018/11/16/139045/an-old-fashioned-ai-has-won-a-starcraft-shootout/) — SAIDA 룰 기반 우승
- [PurpleWave (GitHub)](https://github.com/dgant/PurpleWave) / [Liquipedia](https://liquipedia.net/starcraft/PurpleWave)
- [BananaBrain (Liquipedia)](https://liquipedia.net/starcraft/BananaBrain) — UCB1 빌드 선택
- [Stardust (GitHub)](https://github.com/bmnielsen/Stardust)
- [SSCAIT 공식 스코어](https://sscaitournament.com/index.php?action=scores) / [Liquipedia SSCAIT](https://liquipedia.net/starcraft/SSCAIT)
- [AIIDE StarCraft AI Competition (Liquipedia)](https://liquipedia.net/starcraft/Artificial_Intelligence_and_Interactive_Digital_Entertainment_StarCraft_AI_Competition)
- [StarCraft AI Competitions, Bots and Tournament Manager Software (논문)](https://www.researchgate.net/publication/329202945_StarCraft_AI_Competitions_Bots_and_Tournament_Manager_Software) — ICCup D/C급 평가
- [more notes on SCHNAIL (Starcraft AI blog)](http://satirist.org/ai/starcraft/blog/archives/1077-more-notes-on-SCHNAIL.html) / [SCHNAIL 소개](https://makingcomputerdothings.com/starcraft-human-n-ai-league-ranked-play-has-arrived/)
- [AlphaStar (Wikipedia)](https://en.wikipedia.org/wiki/AlphaStar_(software)) — GM 상위 0.2%, APM/카메라 제약
- [Large Language Models Play StarCraft II: Chain of Summarization (NeurIPS 2024)](https://arxiv.org/pdf/2312.11865) / [LLM-PySC2](https://arxiv.org/html/2411.05348) / [SC2Arena & StarEvolve (2025)](https://arxiv.org/pdf/2508.10428)
