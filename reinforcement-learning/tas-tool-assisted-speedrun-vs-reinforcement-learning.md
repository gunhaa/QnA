# 싱글플레이 TAS 봇도 지금까지 얘기한 RL 방식인가

> 관련 문서: [작은 전장 자가대국 + 판단 RL](./starcraft-micro-scenario-self-play-judgment-rl.md) · [마이크로 시나리오 RL 난이도](./starcraft-scenario-micro-rl-feasibility.md) · [RL이란 무엇인가](./what-is-reinforcement-learning.md)

## 쉬운 설명

**아니요, 다릅니다.** TAS는 "시험문제를 미리 다 받아보고, 한 글자도 안 틀리게 정답을 외워 쓰는 것"에 가까워요. 되감기(세이브스테이트)라는 치트키로 **딱 그 한 번의 실행**에 완벽하게 맞는 입력 순서를 찾아내는 거예요. 그래서 게임 시작 조건이 아주 조금만 달라져도(예: 난수 시드가 다르면) 그 입력 순서는 그대로 무너집니다.

반면 우리가 지금까지 얘기한 RL은 "문제 유형을 익혀서, **처음 보는 문제**도 풀 수 있게 훈련시키는 것"이에요. 그래서 지난 답변에서 "매번 유닛 위치를 랜덤하게 바꿔야 한다"고 강조했던 거예요 — 안 그러면 정책이 TAS처럼 **"이 판 하나만을 위한 암기"** 로 변질되기 때문입니다.

---

## 일반 설명

### 1. TAS가 실제로 뭘 하는 물건인가

**[Tool-Assisted Speedrun(TAS)](https://en.wikipedia.org/wiki/Tool-assisted_speedrun)** 는 에뮬레이터의 도구(세이브스테이트/되감기, 프레임 단위 재생, 메모리 읽기, 매크로·스크립트)를 이용해 **프레임 단위로 완벽하게 정밀한 입력을 기록**한 뒤, 그 입력 시퀀스를 재생하는 것입니다. 목표는 "이론상 완벽한 플레이"(최단 경로, 최적화된 클리어)를 만드는 것이고, 제작 과정은 대개 사람이 **한 구간을 수백~수천 번 되감고 시도해서 가장 좋은 결과를 손으로 고르고 이어붙이는** 작업입니다.

### 2. TAS vs 지금까지 얘기한 RL — 근본적으로 다른 문제

| | **TAS** | **RL (이 대화에서 다뤄온 방식)** |
|---|---|---|
| 산출물 | **하나의 고정된 입력 시퀀스** (레코딩 파일) | **재사용 가능한 정책 함수** `π(행동\|상태)` — 신경망 |
| 목표 | **그 한 번의 특정 실행**을 최적화 (하나의 RNG 시드, 하나의 경로) | **다양한 상황에 일반화**되는 행동을 학습 |
| 되감기(세이브스테이트) 활용 | **최종 산출물 자체가 되감기 편집의 결과물** — 되감기 없이는 존재할 수 없음 | 학습 *과정*에서는 병렬 환경·재시도를 쓰지만, **최종 정책은 되감기 없이 실시간으로 반응**해야 함 |
| 환경 조건이 바뀌면 | **깨짐.** 프레임 하나, 난수 시드 하나만 달라져도 그 입력열은 더 이상 최적이 아님 — 심하면 그냥 실패함 | **정책이 계속 동작**해야 하는 게 설계 목표. 처음 보는 배치에서도 그럴듯하게 반응 |
| 알고리즘 | 대개 **사람의 반복 시행착오** + 부분적 자동화(RNG 조작 계산, 메모리 워칭) | **경사 기반 정책 학습**(PPO 등) 또는 진화 알고리즘 |
| 학습(learning) 여부 | **없음.** 입력열을 "찾아낼" 뿐, 신경망이나 파라미터가 갱신되며 배우는 과정이 아님 | **있음.** 파라미터가 경험을 통해 갱신됨 |

**가장 결정적인 차이는 "일반화 여부"** 입니다. RL 정책은 훈련에 없던 상황에도 그럴듯하게 반응해야 성공이고, TAS는 정확히 그 반대 — **하나의 정확한 상황에 완벽히 맞아떨어지는 것**이 목표입니다.

### 3. 이게 지난 답변과 정확히 연결되는 지점

[마이크로 시나리오 RL 문서](./starcraft-scenario-micro-rl-feasibility.md) §4에서 이미 이 문제를 다른 말로 경고했습니다.

> "초기 상태(유닛 위치·수·체력)를 매 에피소드 랜덤화하지 않으면, 에이전트가 관측이 아니라 **타임스텝만 보고 정답 시퀀스를 외우는 개방루프(open-loop) 정책**을 학습한다."

**이 "개방루프 정책"이 바로 TAS와 같은 실패 양상입니다.** 랜덤화 없이 항상 똑같은 시작 조건으로만 훈련시키면, 정책망은 "이 상황에서 무엇을 해야 유리한가"를 배우는 대신 "몇 번째 스텝에는 이 버튼을 누른다"는 **암기된 시퀀스**로 수렴해버립니다. 원조 SMAC 벤치마크가 이 문제로 비판받아(관측을 무시하고 타임스텝만 봐도 상당한 승률이 나옴) SMACv2로 개정된 사례가 정확히 이 함정입니다. 지난 답변에서 강조한 초기 상태 랜덤화·보상 설계는 결국 **"학습된 정책이 TAS로 퇴행하지 않도록 막는 장치"** 라고 요약할 수 있습니다.

### 4. 회색지대 — 겉보기에 TAS와 닮은 AI/진화 알고리즘 사례

완전히 별개는 아닌 사례들도 있어서 짚어둡니다.

- **[MarI/O](https://hackaday.com/2015/06/14/neural-networks-and-mario/)**(SethBling, 2015) — BizHawk 에뮬레이터 위에서 **NEAT(NeuroEvolution of Augmenting Topologies)** 진화 알고리즘으로 신경망을 훈련시켜 슈퍼마리오 월드 한 구간을 클리어하게 만든 사례입니다. 세대를 거듭하며 신경망 구조 자체를 진화시켰고, 34세대 만에 죽지 않고 클리어했습니다. 이건 **TAS가 아니라 진화 전략(evolutionary RL)** 입니다 — 결과물이 하나의 입력열이 아니라 **재사용 가능한(비록 좁은 범위지만) 신경망 정책**이기 때문입니다. TAS 커뮤니티 근처에서 화제가 됐지만 정의상 TAS와는 다른 계열입니다.
- **Tom Murphy VII의 "learnfun & playfun"** — 사람의 플레이를 관찰해 목적함수(스코어 추정치)를 추출한 뒤, 그 목적함수를 최대화하도록 **상태공간을 탐색(exhaustive search + 되감기)** 해 입력열을 찾는 방식입니다. 신경망 파라미터를 경사 학습하는 게 아니라 **탐색 알고리즘**이라, 넓게 보면 TAS 제작 과정의 자동화에 더 가깝습니다.
- **"봇이 도운" 플레이 vs 사람이 프레임을 직접 고르는 전통적 TAS** — 자동 탐색·유전 알고리즘이 개입한 결과물은 TAS 커뮤니티 안에서도 전통적인 "사람이 프레임 단위로 정밀 조작한 결과물"과는 종종 구분해서 다뤄집니다(제작 방식이 다르므로).

즉 **"신경망이 게임을 플레이하는 것처럼 보이는 에뮬레이터 기반 프로젝트"** 라도, 산출물이 하나의 고정 입력열이면 TAS이고, 재사용 가능한 정책(신경망 파라미터)이면 RL/진화 전략입니다. 겉모습(에뮬레이터, 세이브스테이트, 자동화)이 비슷해서 헷갈리기 쉬운 지점입니다.

### 5. "레트로 게임을 RL로 학습시키기"는 TAS가 아니라 진짜 이 계열이다

싱글플레이 레트로 게임에 지금까지 논의해온 방식(신경망 정책 + PPO 등)을 적용하고 싶다면, 그건 TAS가 아니라 [게임 API 개방 현황 문서](../game-ai/game-apis-and-vision-based-agents.md) §4.2에서 이미 소개한 **[Stable-Retro](https://github.com/Farama-Foundation/stable-retro)**(gym-retro 포크, SNES/Genesis 등 지원)나 **[Arcade Learning Environment(ALE)](https://github.com/Farama-Foundation/Arcade-Learning-Environment)**(Atari) 같은 환경입니다. 이쪽은 에뮬레이터를 **Gymnasium 표준 인터페이스**로 감싸서, 매 에피소드 환경을 리셋하고(필요시 초기 상태를 다양화하고) 신경망 정책이 관측→행동을 반복하며 학습하는, **지금까지 다뤄온 것과 완전히 동일한 RL 파이프라인**입니다.

### 6. 정리

- **TAS는 학습(learning)이 아닙니다.** 하나의 고정 실행에 대한 최적 입력열을 (대개 사람이) 되감기를 이용해 찾아내는 작업이고, 산출물도 신경망이 아니라 레코딩 파일입니다.
- **TAS와 RL이 닮아 보이는 이유는 도구(에뮬레이터, 되감기, 자동화)가 겹쳐서**이지, 목표나 산출물이 같아서가 아닙니다.
- **가장 실질적인 연결고리는 "실패 모드"입니다.** RL 훈련에서 초기 상태 랜덤화를 빠뜨리면, 학습된 정책이 사실상 TAS의 열화판(그 훈련 조건 하나에만 맞는 암기된 시퀀스)으로 퇴행합니다. 지난 답변에서 강조한 랜덤화·zero-sum 보상 설계는 정확히 이걸 막기 위한 장치였습니다.
- MarI/O나 learnfun/playfun처럼 **에뮬레이터+자동화를 쓰는 "AI가 게임하는" 프로젝트**도 있지만, 이들은 TAS라기보다 **진화 전략/탐색 알고리즘**이며, 진짜 지금까지 논의한 RL과 동일 계열은 **Stable-Retro/ALE로 감싼 레트로 게임 학습**입니다.

---

## Sources

- [Tool-assisted speedrun — Wikipedia](https://en.wikipedia.org/wiki/Tool-assisted_speedrun)
- [TASVideos — WelcomeToTASVideos](https://tasvideos.org/WelcomeToTASVideos)
- [TASBot — Wikipedia](https://en.wikipedia.org/wiki/TASBot)
- [Neural Networks And MarI/O — Hackaday](https://hackaday.com/2015/06/14/neural-networks-and-mario/)
- [Tom Murphy VII — Wikipedia](https://en.wikipedia.org/wiki/Tom_Murphy_VII)
- [Stable-Retro (Farama Foundation)](https://github.com/Farama-Foundation/stable-retro)
- [Arcade Learning Environment](https://github.com/Farama-Foundation/Arcade-Learning-Environment)
- 관련 문서: [마이크로 시나리오 RL 난이도](./starcraft-scenario-micro-rl-feasibility.md) §4(초기 상태 랜덤화), [작은 전장 자가대국 + 판단 RL](./starcraft-micro-scenario-self-play-judgment-rl.md), [게임 API 개방 현황](../game-ai/game-apis-and-vision-based-agents.md)
