# 딥러닝(머신러닝) 학습 종류 — 지도/비지도/자기지도/강화학습

## 쉬운 설명

아이에게 공부를 가르치는 방법이 여러 가지 있는 것과 같아요.

- **지도학습**: 선생님이 문제와 정답을 같이 보여주며 가르쳐요.
- **비지도학습**: 정답 없이 사진 더미만 던져주고 "비슷한 것끼리 모아봐"라고 시켜요.
- **자기지도학습**: 문제의 일부를 가려두고 "가려진 부분을 맞혀봐"라고 시켜서, 정답지를 따로 안 만들어도 스스로 문제-정답을 만들게 해요.
- **준지도학습**: 정답 있는 문제 몇 개랑 정답 없는 문제 잔뜩을 섞어서 줘요.
- **강화학습**: 정답을 알려주는 대신 직접 해보게 하고, 잘하면 칭찬(보상)을, 못하면 벌점(패널티)을 줘서 스스로 요령을 터득하게 해요. [[reinforcement-learning/what-is-reinforcement-learning]] 참고.

## 일반 설명

머신러닝/딥러닝의 학습 방식은 "모델이 무엇으로부터, 어떤 신호를 받아 학습하는가"를 기준으로 크게 5가지로 분류된다.

### 1. 지도학습 (Supervised Learning)

- 입력(input)과 정답 레이블(label)이 쌍으로 주어진 데이터셋으로 학습한다.
- 모델은 입력 → 출력을 매핑하는 함수를 근사하도록 손실 함수(loss function)를 최소화한다(예: 분류의 cross-entropy, 회귀의 MSE).
- 이미지 분류, 스팸 탐지, 회귀 예측 등에 쓰이며, 실무에서 가장 널리 쓰이는 방식이다.
- 단점: 레이블링 비용이 크고, 레이블 없는 대량 데이터를 활용하지 못한다.

### 2. 비지도학습 (Unsupervised Learning)

- 레이블 없는 데이터에서 숨겨진 구조·패턴·군집을 스스로 찾아낸다.
- 대표 기법: 군집화(K-means, DBSCAN), 차원 축소(PCA, t-SNE, UMAP), 이상 탐지(anomaly detection), 오토인코더(autoencoder).
- 정답이 정의되어 있지 않으므로 성능 평가가 지도학습보다 애매하다는 특징이 있다.

### 3. 준지도학습 (Semi-Supervised Learning)

- 소량의 레이블 데이터 + 대량의 비레이블 데이터를 함께 사용한다.
- 레이블 데이터로 초기 학습을 하고, 이를 이용해 비레이블 데이터에 가짜 레이블(pseudo-label)을 붙여 학습을 확장하는 방식이 대표적이다.
- 레이블링 비용은 줄이면서 지도학습에 가까운 성능을 노릴 때 사용한다.

### 4. 자기지도학습 (Self-Supervised Learning, SSL)

- 레이블이 없는 데이터 자체에서 "가려진 부분 맞히기(pretext task)"처럼 입력의 일부로 나머지 부분을 예측하게 만들어, 비지도 문제를 지도학습 형태로 자동 변환한다.
- 예: BERT의 마스킹된 토큰 예측(MLM), GPT 계열의 다음 토큰 예측(next-token prediction), 이미지 분야의 contrastive learning(SimCLR, MoCo).
- 현대 LLM/파운데이션 모델([[ai-llm-basics/foundation-model-vs-llm]] 참고)의 사전학습(pre-training)은 대부분 자기지도학습 방식이며, 라벨링 없이 인터넷 규모 데이터를 활용할 수 있다는 점이 핵심 장점이다.
- 이후 지도학습 방식의 파인튜닝(fine-tuning)이나 RLHF 단계가 뒤따르는 경우가 많다.

### 5. 강화학습 (Reinforcement Learning, RL)

- 정답 레이블 대신 **환경(environment)**, **에이전트(agent)**, **행동(action)**, **보상(reward)**, **상태(state)** 개념으로 구성된다.
- 에이전트가 환경과 상호작용하며 시행착오를 통해 누적 보상을 최대화하는 정책(policy)을 학습한다.
- 정답이 즉시 주어지지 않고 지연된 보상(delayed reward)과 순차적 의사결정 문제를 다룬다는 점이 지도학습과 근본적으로 다르다.
- 대표 알고리즘: Q-Learning, DQN(Deep Q-Network, 딥러닝과 결합된 형태), Policy Gradient, PPO(Proximal Policy Optimization), Actor-Critic 계열.
- 활용: 게임 플레이(AlphaGo, 스타크래프트 봇 등 [[game-ai/starcraft]] 참고), 로봇 제어, 그리고 LLM 정렬(alignment) 단계의 RLHF/RLAIF.
- 자세한 개념은 이 저장소의 [[reinforcement-learning/what-is-reinforcement-learning]] 문서에 별도로 정리되어 있다.

### 요약 비교표

| 구분 | 데이터/신호 | 대표 예시 |
|---|---|---|
| 지도학습 | (입력, 정답) 쌍 | 이미지 분류, 회귀 |
| 비지도학습 | 레이블 없음 | 군집화, 차원 축소 |
| 준지도학습 | 소량 레이블 + 대량 무레이블 | 반도체 결함 탐지 등 |
| 자기지도학습 | 데이터 스스로 정답 생성(pretext task) | LLM 사전학습(다음 토큰 예측) |
| 강화학습 | 보상/패널티 신호 | 게임 AI, RLHF, 로봇 제어 |

### 실무 관점

실제로는 한 가지 방식만 단독으로 쓰기보다, 단계별로 조합하는 경우가 많다. 예를 들어 현대 LLM 파이프라인은 **자기지도학습(사전학습) → 지도학습(instruction fine-tuning) → 강화학습(RLHF)** 순으로 여러 학습 방식을 이어붙이는 구조가 일반적이다.

---

Sources:
- [Types of Machine Learning | IBM](https://www.ibm.com/think/topics/machine-learning-types)
- [Types of Machine Learning - GeeksforGeeks](https://www.geeksforgeeks.org/machine-learning/types-of-machine-learning/)
- [Types of Machine Learning: Supervised, Unsupervised and Reinforcement | Pecan AI](https://www.pecan.ai/blog/3-types-of-machine-learning/)
- [Types of Machine Learning: Supervised, Unsupervised and More | DigitalOcean](https://www.digitalocean.com/resources/articles/types-of-machine-learning)
- [지도 학습, 비지도 학습, 강화 학습 - Brunch](https://brunch.co.kr/@aischool/2)
- [딥러닝 기초 - part03. 지도학습/비지도학습/강화학습 - velog](https://velog.io/@rockwellvinca/%EB%94%A5%EB%9F%AC%EB%8B%9D-%EA%B8%B0%EC%B4%88-part03.-%EC%A7%80%EB%8F%84%ED%95%99%EC%8A%B5%EB%B9%84%EC%A7%80%EB%8F%84%ED%95%99%EC%8A%B5-%EA%B0%95%ED%99%94%ED%95%99%EC%8A%B5)
