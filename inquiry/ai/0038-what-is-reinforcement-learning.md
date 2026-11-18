# RL(강화학습)이란 무엇인가

> 조사 기준일: 2026-09-21

## 쉬운 설명

강아지한테 "앉아"를 가르칠 때, 말로 설명하지 않죠. 잘하면 간식을 주고, 아니면 안 주고. 강아지는 **간식을 최대한 많이 받는 방법**을 스스로 알아냅니다. 강화학습이 딱 이겁니다. 정답을 알려주는 게 아니라 **점수(보상)만 주고**, 기계가 "어떻게 해야 점수가 올라가지?"를 수없이 시도하면서 스스로 찾아내게 하는 것.

어려운 점은 하나예요. 스타크래프트에서 **이겼다/졌다는 30분 뒤에야** 알 수 있는데, 30분 동안 내린 수천 번의 판단 중 *어느 것* 때문에 이겼는지를 알아내야 합니다.

## 일반 설명

### 1. 세 가지 학습 패러다임 속에서의 위치

| 구분 | 데이터 | 학습 신호 | 예시 |
|---|---|---|---|
| 지도학습 (supervised) | (입력, 정답) 쌍 | 정답과의 오차 | 이미지 분류, 다음 토큰 예측 |
| 비지도학습 (unsupervised) | 입력만 | 데이터 구조 자체 | 클러스터링, 오토인코더 |
| **강화학습 (RL)** | 환경과의 상호작용 | **보상(scalar reward)** | 게임 플레이, 로봇 제어, LLM 정렬 |

RL의 결정적 차이는 세 가지다.

1. **정답이 없다.** "이 상황에서 이 수가 최선"이라는 라벨이 없고, 오직 결과 점수만 있다.
2. **데이터를 스스로 만든다.** 행동이 다음 상태를 바꾸므로 학습 데이터 분포가 정책에 의존한다(i.i.d. 가정 붕괴).
3. **보상이 지연된다.** 지금의 행동이 한참 뒤의 결과를 결정한다.

### 2. 형식화: 마르코프 결정 과정(MDP)

RL 문제는 보통 MDP 튜플 `(S, A, P, R, γ)`로 정의한다.

| 기호 | 이름 | 의미 |
|---|---|---|
| `S` | 상태(state) | 환경의 현재 상황. 스타라면 유닛·자원·건물·정찰 정보 |
| `A` | 행동(action) | 에이전트가 할 수 있는 선택. 유닛 이동, 건물 건설 |
| `P(s'\|s,a)` | 전이 확률 | 행동 후 다음 상태가 될 확률 (환경의 동역학) |
| `R(s,a)` | 보상 함수 | 그 행동에 주어지는 점수 |
| `γ` | 할인율(discount) | 0~1. 먼 미래 보상을 얼마나 중시할지 |

여기에 학습 대상이 얹힌다.

- **정책(policy) `π(a|s)`**: 상태를 받아 행동(의 확률분포)을 내놓는 함수. 신경망으로 구현하면 이것이 곧 "모델".
- **가치 함수(value function) `V^π(s)`**: 이 상태에서 시작해 정책 π를 따를 때 기대되는 누적 보상. "지금 유리한가?"
- **행동가치 `Q^π(s,a)`**: 이 상태에서 *이 행동*을 했을 때의 기대 누적 보상.
- **어드밴티지 `A(s,a) = Q(s,a) − V(s)`**: "평균보다 이 행동이 얼마나 더 나았나". 정책 업데이트의 실제 신호.

목표는 기대 할인 누적 보상 `E[Σ γ^t r_t]`를 최대화하는 정책 `π*`를 찾는 것이고, 이론적 토대는 **벨만 방정식**(현재 가치 = 즉시 보상 + 할인된 다음 상태 가치)이다.

> **부분 관측(POMDP)**: 스타크래프트처럼 전장의 안개가 있으면 에이전트는 상태 `s`를 전부 못 본다. 관측 `o`만 받으므로 과거 이력을 기억하는 구조(RNN/LSTM, 트랜스포머, 혹은 믿음 상태)가 필요하다. Pluto가 맵핵 켜진 환경에서 오히려 혼란스러워하는 이유가 여기 있다 — **학습한 관측 분포와 달라지기 때문**이다.

### 3. RL의 4대 난제

**① 신용 할당(credit assignment)**
30분짜리 게임에서 마지막에 +1(승) 하나만 받는다면, 그 보상을 수천 개의 중간 행동에 어떻게 분배할 것인가. 해법이 **시간차 학습(TD learning)** — 최종 보상을 벨만 방정식을 따라 뒤로 전파(bootstrapping)하고 수많은 시도로 평균낸다. GAE(Generalized Advantage Estimation) 같은 기법이 편향-분산 균형을 잡는다.

**② 탐험 vs 활용(exploration vs exploitation)**
아는 최선의 수를 계속 쓰면 국소 최적에 갇히고, 새로운 수만 시도하면 수렴하지 않는다. ε-greedy, softmax 샘플링, 엔트로피 보너스, 내재적 동기(curiosity) 등으로 조절한다.

**③ 희소 보상(sparse reward)**
"이기면 +1"만으로는 초기 학습이 거의 진행되지 않는다. 대응책은 보상 설계(reward shaping), 커리큘럼 학습, 자가대국으로 난이도를 자동 조절하기 등.

**④ 표본 비효율(sample inefficiency)**
RL은 수백만~수십억 스텝의 경험을 먹는다. 그래서 **빠른 시뮬레이터가 필수**다. 스타크래프트·바둑·물리 시뮬레이션처럼 수천 배속으로 병렬 실행 가능한 환경에서 RL이 먼저 성공한 이유다. 현실 로봇처럼 시뮬레이터가 비싸면 sim-to-real, 모델 기반 RL, 오프라인 RL로 우회한다.

여기에 실무적 함정이 하나 더 있다. **보상 해킹(reward hacking)** — 설계자가 의도한 목표가 아니라 보상 함수의 허점을 최적화하는 현상. 보상 함수가 곧 목적함수이므로, 잘못 쓰면 잘못된 것을 정확히 달성한다.

### 4. 알고리즘 계통도

| 계통 | 대표 알고리즘 | 핵심 아이디어 |
|---|---|---|
| **가치 기반(value-based)** | Q-learning, **DQN**, Rainbow | Q 함수를 학습하고 가장 Q가 큰 행동 선택. 이산 행동에 적합 |
| **정책 경사(policy gradient)** | REINFORCE, A2C/A3C, TRPO, **PPO** | 정책을 직접 미분해 보상이 커지는 방향으로 파라미터 갱신 |
| **액터-크리틱(actor-critic)** | A2C, **PPO**, SAC, DDPG | 정책(actor) + 가치추정(critic)을 함께 학습해 분산 감소 |
| **모델 기반(model-based)** | MuZero, Dreamer | 환경의 동역학 모델을 학습해 머릿속에서 시뮬레이션 |
| **탐색 결합(search-augmented)** | AlphaZero, MuZero | 신경망 + MCTS 트리 탐색을 결합 |

실무 기본값은 오랫동안 **PPO**였다. 정책 갱신 폭을 클리핑으로 제한해 "한 번에 너무 많이 변해서 망가지는" 현상을 막는 안정적 알고리즘이다.

### 5. 자가대국(self-play) — Pluto와 AlphaZero가 쓰는 방식

상대가 필요한 게임에서, 상대를 **자기 자신의 복사본**으로 두는 방식이다.

- 실력이 오르면 상대 실력도 같이 오르므로 **난이도가 자동으로 커리큘럼을 형성**한다. 사람 데이터 없이 0에서 시작할 수 있는 이유.
- AlphaZero는 자가대국 단계(MCTS로 게임 생성)와 최적화 단계(policy head는 MCTS 분포를, value head는 최종 승패를 예측하도록 학습)를 번갈아 돌린다.
- 위험은 **비정상성(non-stationarity)과 전략 사이클**이다. 가위바위보처럼 A→B→C→A로 순환하며 특정 스타일에만 강한 에이전트가 되기 쉽다. AlphaStar는 이를 **리그(league) 학습**(메인 에이전트 + 익스플로이터 + 과거 버전 풀)으로 완화했다.
- Pluto가 특이한 지점은, AlphaStar와 달리 **사람 리플레이 지도학습 부트스트랩 없이 순수 self-play만으로** 브루드워를 익혔다고 주장한다는 것이다. 무업 마린메딕 같은 비정통 빌드가 나오는 것도 사람 기보를 모방하지 않은 정책의 전형적 특징이다.

### 6. LLM에서의 RL (2026년 현황)

사전학습(다음 토큰 예측)은 "그럴듯한 텍스트"를 최적화할 뿐, "좋은 답"을 직접 최적화하지 않는다. 그 간극을 메우는 게 RL 단계다. 현재 흐름은 다음과 같다.

| 방식 | 보상의 출처 | 특징 |
|---|---|---|
| **RLHF** | 사람 선호 데이터로 학습한 **보상 모델** | PPO로 최적화. 주관적 품질(도움됨, 안전성)에 적합하나 파이프라인이 무겁다 |
| **DPO** | 선호 쌍(좋음/나쁨)에서 직접 | 보상 모델·롤아웃 없이 분류 손실처럼 학습. 간단하고 저렴 |
| **RLVR** | **자동 검증 가능한 정답** (수학 채점, 코드 실행, 테스트 통과) | 보상이 객관적이라 해킹이 어렵고 대규모 확장이 쉽다. 추론 모델의 핵심 |
| **GRPO** | 같은 프롬프트에 대한 **그룹 내 상대 비교** | critic(가치 모델) 제거 → 메모리·연산 절감. 그룹 내 보상 정규화로 어드밴티지 추정 |
| **Agentic RL** | 도구 호출·멀티턴 과제의 최종 성공 여부 | 긴 호흡의 에이전트 행동에 신용 할당. 2026년의 최전선 |

2026년 기준 지배적 패러다임은 **RLVR**이며, 추론 능력을 끌어올린 모델들(DeepSeek-R1 계열, GPT-5, extended thinking을 쓰는 Claude, o 시리즈, Gemini Thinking 등)이 이 계열이다. 검증 가능한 도메인(수학·코딩)에서 시작해, 검증이 어려운 도메인으로 확장하는 것이 현재의 연구 과제다.

### 7. 언제 RL을 쓰고, 언제 쓰지 않는가

**쓸 만한 조건**
- 정답 라벨은 없지만 **결과의 좋고 나쁨은 측정 가능**하다
- 결정이 **순차적**이고, 지금의 선택이 미래 상황을 바꾼다
- **싸고 빠른 시뮬레이터**나 자동 검증기가 있다

**피해야 할 조건**
- 지도학습으로 풀리는 단발성 예측 문제 (RL은 훨씬 비싸고 불안정하다)
- 보상을 정직하게 정의하기 어려운 문제 (보상 해킹으로 귀결된다)
- 실패 비용이 큰 실환경에서 탐험해야 하는 경우

### 8. 용어 빠른 정리

| 용어 | 뜻 |
|---|---|
| agent / environment | 학습 주체 / 그와 상호작용하는 세계 |
| episode / trajectory | 시작부터 종료까지의 한 판 / 그 (상태, 행동, 보상) 시퀀스 |
| on-policy / off-policy | 현재 정책으로 모은 데이터만 사용 / 과거·타 정책 데이터도 재사용 |
| replay buffer | 과거 경험을 저장해 재학습에 쓰는 버퍼 (off-policy의 핵심) |
| rollout | 정책을 굴려 경험을 수집하는 것 |
| reward shaping | 학습을 돕기 위해 중간 보상을 추가 설계하는 것 |
| KL penalty | 원래 모델에서 너무 멀어지지 않게 거는 제약 (LLM RL에서 필수) |

## 참고 자료

- [Reasoning RL in 2026: GRPO, DPO, RLVR, Agentic PO & Beyond — Turing Post](https://www.turingpost.com/p/reasoning-rl-in-2026)
- [State of Reinforcement Learning 2025: RLVR, GRPO, RLHF — Turing Post](https://www.turingpost.com/p/stateofrl2025)
- [Reinforcement Learning (RL) Guide — Unsloth Docs](https://unsloth.ai/docs/get-started/reinforcement-learning-rl-guide)
- [A brief introduction to reinforcement learning — UBC](https://www.cs.ubc.ca/~murphyk/Bayes/pomdp.html)
- [Markov Decision Process (MDP) in Reinforcement Learning — GeeksforGeeks](https://www.geeksforgeeks.org/machine-learning/what-is-markov-decision-process-mdp-and-its-relevance-to-reinforcement-learning/)
- [AlphaZero Chess: how it works — Towards Data Science](https://towardsdatascience.com/alphazero-chess-how-it-works-what-sets-it-apart-and-what-it-can-tell-us-4ab3d2d08867/)
- [Reinforcement Learning in Strategy-Based and Atari Games: A Review of DeepMind's Innovations (arXiv)](https://arxiv.org/pdf/2502.10303)
- [An Introduction to the Basics of Reinforcement Learning — OPIG](https://www.blopig.com/blog/2025/12/an-introduction-to-the-basics-of-reinforcement-learning/)
- 관련 문서: [Pluto — 브루드워 자가대국 RL 봇](../game-ai/starcraft/pluto-rl-bot-ladder-incident.md), [신경망에 게임 학습시키기](./train-neural-network-to-play-games-methods-and-specs.md)
