# 7단계 자세히 보기: 출력층과 샘플링 — 다음 조각을 진짜로 골라내기

## 비유

지금까지의 모든 방을 다 거치고 나면, 모델은 "다음에 올 조각으로 후보가 이만큼 있는데, 각각 이 정도 그럴듯해"라는 **점수표**를 만들어요. 하지만 아직 점수표일 뿐이고, 실제로 "이거 하나를 고르자!"고 결정하는 마지막 단계가 남아있어요. 이게 출력층과 샘플링이 하는 일입니다.

## 로짓(Logits) — 아직 정리 안 된 원점수

마지막 블록을 통과한 벡터를 어휘집 크기만큼(예: 5만 개) 늘리는 선형 변환을 거치면, 각 토큰마다 하나씩 숫자가 나와요. 이 원점수를 **로짓(Logits)**이라고 불러요. 로짓은 양수도 음수도 될 수 있고, 아직 "확률"이 아니에요 — 그냥 "이 조각이 얼마나 그럴듯한지"를 나타내는 상대적인 점수일 뿐이에요.

## 소프트맥스(Softmax) — 점수를 확률로 바꾸기

```
확률(i번 토큰) = exp(로짓_i) / Σ exp(로짓_j)  (모든 j에 대해 합산)
```

이 계산을 거치면 모든 후보 토큰의 확률을 합치면 정확히 1(100%)이 되는 표가 만들어져요. 예를 들어 "고양이는 밥을 ___" 다음에 "먹었다"가 70%, "쏟았다"가 15%, "좋아한다"가 10%, 나머지가 5% 이런 식으로요.

## 온도(Temperature) — "확신을 세게 할지 약하게 할지"

소프트맥스에 넣기 전에 로짓을 온도값으로 나눠줘요.

- **온도 = 1**: 원래 확률 그대로 사용
- **온도 < 1** (예: 0.3): 가장 그럴듯한 후보에 확률이 더 몰려요 → 더 "확신에 찬", 예측 가능한 답변
- **온도 > 1** (예: 1.5): 확률이 더 평평해져요 → 약한 후보에게도 기회를 줘서 더 "창의적이고 다양한" 답변

마치 물감을 섞을 때 진하게(온도 낮음) 할지, 여러 색을 고르게 섞을지(온도 높음) 정하는 것과 비슷해요.

## Top-k, Top-p (Nucleus), Min-p — "말도 안 되는 후보는 아예 제외하기"

확률이 아무리 낮아도 이론상 모든 토큰이 뽑힐 가능성이 있어요. 그래서 터무니없는 후보를 미리 걸러내는 방법들이 있습니다.

- **Top-k 샘플링**: 확률이 가장 높은 k개 후보만 남기고 나머지는 아예 제외한 뒤, 남은 것들끼리 확률을 다시 계산(재정규화)해서 그중 하나를 뽑아요.
- **Top-p (Nucleus) 샘플링**: 개수를 고정하는 대신, "누적 확률이 p(예: 90%)에 도달할 때까지"만 후보를 남겨요. 확신이 강한 상황에서는 후보가 적어지고, 애매한 상황에서는 후보가 자연스럽게 늘어나요.
- **Min-p 샘플링**: 가장 높은 확률의 일정 비율보다 낮은 후보는 제외하는, 비교적 최근에 나온 방식이에요.

## 전체 생성(디코딩) 파이프라인

```
로짓(Logits)
   ↓ 온도로 나누기 (Temperature scaling)
   ↓ Top-k 또는 Top-p로 후보 걸러내기
   ↓ 남은 후보 확률 재계산 (재정규화)
   ↓ 확률에 따라 토큰 하나 샘플링
"먹었다" 라는 토큰 하나 선택!
```

## 왜 매번 가장 높은 확률(1등)만 안 고르나요?

가장 확률 높은 토큰만 계속 고르는 방식(**그리디 디코딩, Greedy Decoding**)은 답이 단조롭고 뻔해지기 쉬워요. 반대로 적당한 무작위성(샘플링)을 섞으면, 문법적으로 말이 되면서도 더 자연스럽고 다양한 문장을 만들 수 있어요. 다만 온도나 후보 범위를 너무 크게 하면 문장이 이상해질 수도 있어서, 이 값들을 잘 조절하는 게 중요합니다.

## 반복해서 문장 완성하기

이렇게 토큰 하나를 뽑으면, 그 토큰을 다시 문장 맨 뒤에 붙이고 **1단계(토크나이저)부터 7단계(샘플링)까지 전체 과정을 처음부터 다시** 돌려요. 이 과정을 문장이 끝날 때까지(또는 "그만" 토큰이 나올 때까지) 한 글자씩, 한 조각씩 반복하는 것이 바로 LLM이 문장을 "생성"하는 방식입니다.

## 참고 자료 (Sources)

- [How do temperature, top-k, and top-p sampling differ? — Sebastian Raschka](https://sebastianraschka.com/faq/docs/temperature-topk-topp-sampling.html)
- [How LLMs Choose Their Words: Logits, Softmax and Sampling — MachineLearningMastery](https://machinelearningmastery.com/how-llms-choose-their-words-a-practical-walk-through-of-logits-softmax-and-sampling/)
- [How Temperature, Top-K, Top-P, and Min-P Control LLM Output — Ken Muse](https://www.kenmuse.com/blog/how-temp-topk-topp-minp-control-llm-output/)
- [LLM Sampling Parameters Explained: Intuition to Math — Let's Data Science](https://letsdatascience.com/blog/llm-sampling-temperature-top-k-top-p-and-min-p-explained)
