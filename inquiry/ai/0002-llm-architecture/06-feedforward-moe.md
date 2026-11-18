# 5단계 자세히 보기: 피드포워드 네트워크(FFN)와 MoE — 혼자 곰곰이 생각 정리하기

## 비유

어텐션 방에서 "누구 말을 더 귀 기울여 들어야 하는지" 정했다면, 이제 조용한 방에 들어가서 "그래서 결론이 뭐지?"를 혼자 곰곰이 생각해요. 이 혼자 생각하는 방이 **피드포워드 네트워크(Feed-Forward Network, FFN)**, 또는 **MLP(Multi-Layer Perceptron)**입니다.

## 기본 구조: 늘렸다가 줄이기

FFN은 보통 이렇게 생겼어요.

```
입력 벡터 (예: 768차원)
   ↓ 첫 번째 선형 변환으로 크게 늘림 (예: 3072차원)
   ↓ 활성화 함수 (비선형 함수, 예: SwiGLU)
   ↓ 두 번째 선형 변환으로 다시 줄임 (768차원)
출력 벡터
```

일부러 벡터를 몇 배로 부풀렸다가 다시 줄이는 이유는, 그 넓어진 공간에서 더 복잡하고 다양한 패턴을 표현할 수 있게 하기 위해서예요. 마치 생각을 정리할 때 일단 머릿속에서 여러 갈래로 넓게 펼쳐봤다가, 결국 하나의 결론으로 압축하는 것과 비슷해요.

이 방은 어텐션과 다르게 **각 단어가 서로 상관없이, 자기 벡터만 갖고 독립적으로 계산**해요 (position-wise). 즉, "누구를 봐야 할지"는 어텐션이 이미 다 섞어놨으니, FFN은 이제 그 결과를 갖고 각자 혼자 생각만 하는 거예요.

## Mixture-of-Experts (MoE) — "전문가 여러 명 중 필요한 사람만 부르기"

문제 하나를 풀 때마다 학교 선생님 100명을 다 모아서 회의를 하면 시간 낭비겠죠? 대신 "이 문제는 수학 선생님 2명한테만 물어보면 충분해"처럼, **필요한 전문가만 골라서 물어보는 방식**이 MoE예요.

### 구조

- 기존의 FFN 방 하나 대신, **여러 개의 전문가(Expert) FFN**을 나란히 준비해둬요. (예: 전문가 8명, 16명, 64명...)
- **라우터(Router)**라는 작은 판단 담당자가 있어서, 각 단어(토큰)마다 "너는 이 전문가 2명한테 물어봐"라고 배정해줘요.
- 선택된 전문가들의 결과만 계산해서 합쳐요. 나머지 전문가들은 이번엔 아예 계산에 참여하지 않아요 (**희소 활성화, Sparse Activation**).

### 라우팅 전략 두 가지

- **토큰 선택(Token-Choice) 라우팅**: 각 토큰이 "나는 이 전문가한테 갈래"하고 스스로 고르는 방식
- **전문가 선택(Expert-Choice) 라우팅**: 반대로 각 전문가가 "나는 이 토큰들을 처리할래"하고 고르는 방식

### 왜 이렇게 하나요?

- 모델 전체의 지식(파라미터 수)은 전문가를 많이 둬서 아주 크게 키울 수 있어요.
- 그런데 실제 계산할 때는 토큰마다 일부 전문가만 쓰니까, 실제 연산 비용(추론 속도/전력)은 상대적으로 적게 들어요.
- 즉, **"똑똑하지만 필요한 부분만 깨어나는"** 모델을 만들 수 있는 트릭이에요.

## 요약 그림 (일반 FFN vs MoE)

```
[일반 Dense FFN]
모든 토큰 → 같은 FFN 하나를 통과 → 출력

[MoE FFN]
모든 토큰 → 라우터가 토큰마다 전문가 2명 선택
   토큰 A → 전문가 3번, 7번만 계산
   토큰 B → 전문가 1번, 5번만 계산
→ 각자 선택된 전문가 결과만 합쳐서 출력
```

어텐션과 FFN(또는 MoE)을 하나의 블록으로 묶어 수십~수백 번 쌓는데, 이때 블록 사이를 안전하게 이어주는 장치가 다음 단계인 [잔차 연결과 정규화](./06-residual-normalization.md)입니다.

## 참고 자료 (Sources)

- [Understanding Mixture of Experts (MoE) Neural Networks — IntuitionLabs](https://intuitionlabs.ai/articles/mixture-of-experts-moe-models)
- [Mixture-of-Experts (MoE) LLMs — Cameron R. Wolfe](https://cameronrwolfe.substack.com/p/moe-llms)
- [Coupling Experts and Routers in Mixture-of-Experts via an Auxiliary Loss (arXiv)](https://arxiv.org/pdf/2512.23447)
- [Layerwise Recurrent Router for Mixture-of-Experts (arXiv)](https://arxiv.org/pdf/2408.06793)
