# PPO(Proximal Policy Optimization)의 보상 책정 방식 — 파라미터와 예시 (feat. AlphaStar)

## 쉬운 설명

PPO는 "너무 크게 한 번에 바꾸지 말고, 조금씩만 고쳐가며 연습하자"는 규칙을 가진 훈련 코치예요. 잘한 행동엔 칭찬 점수(보상)를 주고 못한 행동엔 낮은 점수를 주는데, 어제보다 갑자기 확 달라진 방식으로 플레이하면 "그건 너무 급격한 변화니까 조금만 반영할게"라고 브레이크를 걸어요. 스타크래프트를 학습한 AI(딥마인드의 알파스타)도 기본적으로 "이겼다/졌다"라는 단순한 점수와, "프로게이머들의 빌드오더를 얼마나 잘 따라했는가"라는 보조 점수 두 가지를 합쳐서 보상으로 썼어요.

## 일반 설명

### 1. PPO의 목적 함수 구조

PPO는 정책(policy) 자체를 업데이트하는 정책 경사(policy gradient) 계열 알고리즘이다. "보상을 어떻게 책정하는가"는 두 층위로 나눠 봐야 한다.

1. **환경이 주는 원시 보상(reward) 설계** — 게임/태스크에서 정의하는 값 (승패, 점수, 자원량 등)
2. **PPO 학습 목적 함수 안에서 그 보상을 어떻게 정책 업데이트 신호로 변환하는가**

PPO의 핵심 목적 함수(clipped surrogate objective)는 다음과 같다.

```
L_CLIP(θ) = E_t [ min( r_t(θ) · A_t , clip(r_t(θ), 1-ε, 1+ε) · A_t ) ]

r_t(θ) = π_θ(a_t|s_t) / π_θ_old(a_t|s_t)   # 새 정책과 기존 정책의 확률 비율
A_t                                         # 어드밴티지(advantage) 추정치
```

실제 학습에서는 여기에 가치 함수 손실과 엔트로피 보너스를 더한 전체 손실을 최적화한다.

```
L_TOTAL = L_CLIP(θ) - c1 · L_VF(θ) + c2 · S[π_θ](s_t)

L_VF  : 가치 함수(critic) 예측과 실제 리턴 사이의 MSE 손실
S     : 정책의 엔트로피(탐험 유지를 위한 보너스)
c1, c2: 각 항의 가중치 계수
```

### 2. 핵심 파라미터

| 파라미터 | 의미 | 일반적인 값 예시 |
|---|---|---|
| **ε (clip range)** | 새 정책이 기존 정책 대비 벗어날 수 있는 최대 비율. 확률비 r_t를 [1-ε, 1+ε] 범위로 잘라(clip) 한 번에 정책이 급변하지 않게 막는다 | 0.1 ~ 0.2 |
| **γ (discount factor)** | 미래 보상을 현재 가치로 얼마나 할인할지 | 0.99 |
| **λ (GAE lambda)** | Generalized Advantage Estimation에서 편향-분산 트레이드오프 조절 | 0.95 |
| **c1 (value loss coefficient)** | 가치 함수 손실의 가중치 | 0.5 |
| **c2 (entropy coefficient)** | 탐험을 유도하는 엔트로피 보너스 가중치 | 0.01 |
| **학습률(learning rate)** | 파라미터 업데이트 보폭 | 2.5e-4 ~ 3e-4 |
| **에폭 수(epochs per update)** | 같은 배치 데이터를 몇 번 재사용해 업데이트할지 | 3 ~ 10 |
| **배치/미니배치 크기** | 한 번 업데이트에 쓰는 경험(trajectory) 수 | 환경마다 상이, 대규모 학습은 수만~수십만 스텝 |

### 3. 어드밴티지(Advantage)와 보상의 관계 — 숫자 예시

PPO는 "받은 보상 자체"보다 **"기대했던 것보다 얼마나 더 좋았는가(advantage)"**를 학습 신호로 쓴다.

- 가치 함수(critic)가 어떤 상태 s의 기대 리턴을 V(s) = 5.0 으로 추정했다고 하자.
- 에이전트가 행동 a를 취해 실제로 리턴 R = 8.0을 받았다면, 어드밴티지 A = R - V(s) = 3.0 (기대보다 좋았음 → 이 행동의 확률을 높이는 방향으로 업데이트).
- 반대로 R = 2.0이었다면 A = -3.0 (기대보다 나빴음 → 확률을 낮추는 방향).
- 확률비 r_t(θ) = 1.3 (새 정책이 이 행동을 30% 더 선호), ε = 0.2라면 clip(1.3, 0.8, 1.2) = 1.2로 잘린다.
  - unclipped: 1.3 × 3.0 = 3.9
  - clipped: 1.2 × 3.0 = 3.6
  - PPO는 min(3.9, 3.6) = 3.6을 사용 → 한 번에 확률을 30%까지 밀어붙이지 못하게 제한.

이 clip 메커니즘이 "보상 책정"이라기보다 "보상 신호를 정책에 반영하는 속도를 제한하는 안전장치"에 해당한다.

### 4. "스타AI(알파스타)"의 실제 보상 설계

주의할 점: DeepMind의 **AlphaStar**는 순수 바닐라 PPO가 아니라, PPO와 같은 계열의 액터-크리틱(actor-critic) 정책 경사 구조에 **V-trace**(오프폴리시 보정)와 **UPGO**(Upgoing Policy Update, 기대치보다 나은 행동만 강하게 학습)를 결합한 변형 알고리즘을 사용했다. 다만 클리핑을 통한 신뢰영역(trust region) 유지라는 PPO의 핵심 아이디어는 공유한다.

보상 자체는 두 갈래로 설계됐다.

1. **승패 보상(win/loss reward)**: 게임이 끝났을 때 승리 +1, 패배 -1, 무승부/진행 중 0 — 매우 희소(sparse)한 보상이다.
2. **의사 보상(pseudo-reward, z-statistics 기반)**: 인간 프로게이머 리플레이에서 뽑은 전략 통계치 `z`(빌드 오더 시퀀스, 유닛/업그레이드/효과 사용 통계)를 목표로 주고,
   - 에이전트가 실제로 수행한 빌드 오더와 목표 빌드 오더 사이의 **편집 거리(edit distance)**,
   - 유닛/업그레이드/효과 누적 통계 사이의 **해밍 거리(Hamming distance)**
   
   를 음의 보상(패널티)으로 환산해 "인간 전략을 참고하되 그대로 베끼지는 않는" 탐험을 유도했다. 이 의사 보상은 TD(λ)로 계산된 별도의 가치 함수(baseline)와 함께 사용된다.
3. 이 두 보상을 League Training(메인 에이전트·익스플로이터·리그 익스플로이터 등 여러 유형의 상대와 자가대국)과 결합해, 특정 전략에 치우치지 않고 다양한 상대에 강건한 정책을 학습시켰다.

즉 "커비스 킬 수, 자원 채취량"처럼 세세한 항목별 보상을 준 것이 아니라, **승패라는 극히 희소한 최종 보상 + 인간 전략과의 유사도라는 보조 보상**, 이 두 가지를 결합한 것이 핵심이다. 자세한 학습 난이도·재현 비용은 이 저장소의 [reinforcement-learning/starcraft/](./starcraft/) 하위 문서들을 참고.

---

Sources:
- [Proximal policy optimization - Wikipedia](https://en.wikipedia.org/wiki/Proximal_policy_optimization)
- [Guide To Proximal Policy Optimization | Medium](https://medium.com/@jose.tamkin24/guide-to-proximal-policy-optimization-61cdb690afd4)
- [Proximal Policy Optimization (PPO) - GeeksforGeeks](https://www.geeksforgeeks.org/machine-learning/a-brief-introduction-to-proximal-policy-optimization/)
- [Proximal Policy Optimization with PyTorch and Gymnasium | DataCamp](https://www.datacamp.com/tutorial/proximal-policy-optimization)
- [Grandmaster level in StarCraft II using multi-agent reinforcement learning | Nature](https://www.nature.com/articles/s41586-019-1724-z)
- [Deciphering AlphaStar on StarCraft II | The Gradient](https://cyk1337.github.io/notes/2019/07/21/RL/DRL/Decipher-AlphaStar-on-StarCraft-II/)
- [An Introduction of mini-AlphaStar](https://arxiv.org/pdf/2104.06890)
