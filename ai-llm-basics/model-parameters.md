# 모델 파라미터(Parameter)란?

AI는 레고 블록으로 만든 아주 큰 로봇이에요. 그 로봇에는 나사(다이얼)가 수십억 개 달려있어요. 각 나사를 얼마나 조였는지가 로봇이 얼마나 똑똑하게 움직이는지를 정해요.

이 "나사 하나하나"가 바로 **파라미터(Parameter)**예요. AI가 공부(학습)를 하면서 스스로 나사를 조금씩 돌려서 알맞은 값을 찾아요. 신경망(Neural Network)에서는 이 나사를 **가중치(Weight)**와 **편향(Bias)**이라고 불러요.

- 나사가 많을수록(파라미터 수가 많을수록) 보통 더 똑똑한 로봇이 돼요. (예: "70B 모델" = 나사 700억 개)
- 사람이 미리 정해두는 "로봇 크기/색깔" 같은 설정은 **하이퍼파라미터(Hyperparameter)**라고 해서, 파라미터와는 달라요. 이건 학습이 시작되기 전에 사람이 직접 고르는 값이에요.
- 대화창에서 우리가 조절하는 "얼마나 창의적으로 답할지" 같은 옵션은 **생성 파라미터(Sampling Parameter, 예: temperature)**라고 부르는데, 이건 이미 학습이 끝난 로봇을 "어떻게 쓸지" 조절하는 손잡이예요.

**한 줄 정리**
- 파라미터 = 학습하면서 AI가 스스로 조정한 나사(가중치) → 모델의 "실력"을 결정
- 하이퍼파라미터 = 학습 전에 사람이 미리 정해둔 설정
- 생성 파라미터 = 학습 후 답변 스타일을 조절하는 손잡이

**출처**
- [AI 파라미터: 모든 AI 모델을 정의하는 숫자 | Morphic](https://morphic.com/kr/ai-glossary/Parameters)
- [What are ML Model Parameters | Deepchecks](https://deepchecks.com/glossary/model-parameters/)
- [Model Parameters Definition | Encord](https://encord.com/glossary/model-parameters-definition/)
