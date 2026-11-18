# 자기지도학습에서 "정답"은 어떻게 판별하나?

## 쉬운 설명

선생님 없이 혼자 공부하는 방법이에요. 책의 한 단어를 손으로 가려놓고 "이게 뭐였게?"라고 스스로에게 물어봐요. 정답은 이미 알고 있어요 — 자기가 손으로 가리기 전에 원래 있던 글자니까요! 그래서 누가 정답을 알려줄 필요가 없어요.

## 일반 설명

자기지도학습(Self-Supervised Learning, SSL)은 **원본 데이터 자체를 정답(ground truth)으로 재활용**한다는 것이 핵심 원리다. 사람이 라벨을 붙이는 대신, 데이터의 일부를 인위적으로 가리거나 변형한 뒤 "원래 상태로 복원/예측"하게 시키는 **프리텍스트 태스크(pretext task)**를 설계해서 지도학습 형태로 변환한다. 정답 판별 방식은 태스크 유형에 따라 크게 세 갈래로 나뉜다.

### 1. 마스킹 기반 예측 (Masked Prediction)

- **원리**: 입력의 일부를 가리기 전 원본 값이 곧 정답이다. 모델이 맞혀야 하는 것은 "가리기 직전에 그 자리에 있던 실제 값"이므로, 별도 인간 라벨링이 필요 없다.
- **텍스트 (BERT류 MLM)**: 토큰 시퀀스 중 일부를 무작위로 마스킹/치환하고, 모델이 마스킹되기 전 원래 토큰을 맞히도록 학습한다. 예측은 어휘(vocabulary) 전체에 대한 확률 분포이므로 **cross-entropy loss**로 정답 토큰과의 오차를 계산한다.
- **다음 토큰 예측 (GPT류)**: 시퀀스의 다음 토큰이 곧 정답이다. 문장 전체가 이미 존재하므로, 모델 입력에서는 다음 토큰을 가리고 예측한 뒤 실제 다음 토큰과 비교해 cross-entropy로 손실을 계산한다.
- **이미지 (BEiT, MAE류)**: 이미지 패치를 가리고, 가려진 패치의 픽셀 값(또는 discrete visual token)을 복원하도록 학습한다. 픽셀 값처럼 연속값을 예측하는 경우 **L2(MSE) loss**, 이산 토큰을 예측하는 경우 cross-entropy loss를 사용한다.
- 요약하면 "정답 = 가리기 전 원본", "판별 방법 = 예측값과 원본 값의 차이를 손실 함수로 계산"이다.

### 2. 재구성(Reconstruction) 기반

- Denoising Autoencoder, Context Encoder처럼 입력에 노이즈를 추가하거나 일부를 지운 뒤 원본을 복원하게 한다.
- 여기서도 정답은 "노이즈를 넣기 전의 원본 입력"이며, 복원 결과와 원본 사이의 재구성 오차(reconstruction error, 보통 MSE)를 손실로 사용한다.

### 3. 대조 학습 (Contrastive Learning)

- 명시적인 "정답 값"을 맞히는 대신, **관계(같다/다르다)**를 정답으로 삼는 방식이다.
- 같은 원본 데이터를 서로 다르게 증강(augmentation)한 두 버전을 **양성 쌍(positive pair)**으로 정의하고, 서로 다른 원본에서 나온 샘플은 **음성 쌍(negative pair)**으로 정의한다.
- "이 두 개는 같은 원본에서 왔다/아니다"라는 사실 자체는 데이터를 만든 과정(어떤 이미지를 증강했는지)에서 이미 알고 있으므로 정답 판별에 별도 라벨이 필요 없다.
- 학습 목표: anchor와 positive의 임베딩 유사도는 높이고, negative와의 유사도는 낮추는 방향으로 표현(representation)을 학습한다.
- 대표 손실 함수는 **InfoNCE**(Contrastive Predictive Coding에서 제안)이며, 이는 softmax 기반으로 "여러 후보 중 진짜 positive를 골라내는" 분류 문제 형태로 정답 여부를 판별한다.
- 그 외 프리텍스트 태스크 예: 이미지 회전 각도 맞히기(회전시킨 각도 자체가 정답), 직소 퍼즐(패치를 섞기 전 순서가 정답), 색상 복원(흑백 변환 전 원본 컬러가 정답) 등 — 모두 "변형을 가하기 전 상태"가 정답이 된다는 공통 패턴을 따른다.

### 핵심 정리

자기지도학습에서 정답 여부 판별은 사람이 개입하지 않는다. 대신:

1. 데이터에 **변형(마스킹/증강/왜곡/셔플)을 가하기 전 상태**를 정답으로 저장해두고,
2. 모델이 그 변형으로부터 원래 상태(또는 원래 상태와의 관계)를 예측하게 한 뒤,
3. **손실 함수(cross-entropy, MSE, InfoNCE 등)**로 예측값과 저장해둔 정답 사이의 차이를 계산해 학습 신호로 사용한다.

즉 "정답을 미리 알고 있는 상태에서 일부러 문제를 어렵게 만든 뒤(가리기/섞기/증강), 원래 알고 있던 정답과 비교"하는 방식이며, 이 점이 사람이 직접 라벨을 붙이는 지도학습([[ai-llm-basics/deep-learning-training-types-supervised-unsupervised-reinforcement]] 참고)과 근본적으로 다른 지점이다.

---

Sources:
- [Masked Feature Prediction for Self-Supervised Visual Pre-Training (CVPR 2022)](https://openaccess.thecvf.com/content/CVPR2022/papers/Wei_Masked_Feature_Prediction_for_Self-Supervised_Visual_Pre-Training_CVPR_2022_paper.pdf)
- [Self-Supervised Masked Prediction Methods](https://www.emergentmind.com/topics/self-supervised-masked-prediction-methods)
- [Dive into Deep Learning](https://arxiv.org/pdf/2106.11342)
- [대조적 자기 지도 학습 서베이 | alphaXiv](https://www.alphaxiv.org/ko/abs/2011.00362)
- [[딥러닝]Contrastive Learning(대조 학습)이란? - Meaningful AI](https://meaningful96.github.io/deeplearning/contrastivelarning/)
- [Unsupervised Visual Representation Learning Overview: Toward Self-Supervision](https://hoya012.github.io/blog/Self-Supervised-Learning-Overview/)
