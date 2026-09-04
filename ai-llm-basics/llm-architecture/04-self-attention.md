# 4단계 자세히 보기: 셀프 어텐션(Self-Attention) — 누구를 신경 써서 볼지 정하기

## 비유

친구들이 다 같이 둘러앉아 이야기할 때, "먹었다"라는 말을 들으면 우리는 자동으로 "누가? 뭘?"을 생각하며 앞에서 들었던 "고양이는", "밥을" 같은 말을 다시 떠올려요. 문장 속 모든 단어를 똑같이 신경 쓰는 게 아니라, **지금 이해하려는 단어와 관련 있는 다른 단어들을 골라서 더 집중**하는 거예요. 이렇게 "누구를 얼마나 신경 쓸지"를 계산하는 것이 셀프 어텐션입니다.

## 기술적 핵심: 쿼리, 키, 밸류 (Query, Key, Value)

각 단어의 벡터는 학습 가능한 세 개의 다른 "안경"을 통해 세 가지 역할로 재해석됩니다.

- **쿼리(Query)**: "나는 지금 무엇을 찾고 있어?" — 질문하는 역할
- **키(Key)**: "나는 이런 정보를 갖고 있어!" — 광고하는 역할
- **밸류(Value)**: "네가 나를 선택하면, 실제로 줄 정보는 이거야" — 실제 알맹이

예를 들어 "먹었다"라는 단어의 쿼리는 "누가 먹었는지, 뭘 먹었는지 찾고 싶어"라는 질문이고, "고양이는"이라는 단어의 키는 "나는 주어 정보를 갖고 있어!"라고 광고하는 셈이에요. 둘이 잘 맞으면(질문과 광고가 통하면) "먹었다"는 "고양이는"의 밸류(실제 의미 정보)를 많이 가져옵니다.

## 계산 공식: Scaled Dot-Product Attention

```
Attention(Q, K, V) = softmax( Q · Kᵀ / √d_k ) · V
```

1. 모든 단어 쌍에 대해 쿼리와 키를 곱해서(내적) "얼마나 관련 있는지" 점수를 계산해요.
2. 이 점수를 √d_k(키 벡터 차원의 제곱근)로 나눠서 값이 너무 커지지 않게 조절해요.
3. **소프트맥스(Softmax)**로 점수를 "합이 1이 되는 확률"로 바꿔요. (예: 고양이는 70%, 밥을 20%, 나머지 10%)
4. 이 확률만큼 각 단어의 밸류를 섞어서 최종 결과를 만들어요.

## 코절 마스킹(Causal Masking) — "미래를 훔쳐보면 안 돼!"

LLM은 "다음에 올 단어 맞추기" 게임을 하면서 학습해요. 그런데 만약 "먹었다" 뒤에 나올 단어까지 미리 볼 수 있다면, 모델은 생각을 안 하고 그냥 답을 베끼기만 배울 거예요. 그래서 **각 단어는 자기 자신과 그 이전 단어들만 볼 수 있고, 뒤에 나오는 단어는 아예 점수 계산에서 제외(마스킹)**합니다. 마치 시험 볼 때 답안지의 뒷장을 손으로 가리고 앞부분만 보면서 푸는 것과 같아요. 이 규칙 때문에 요즘 LLM들을 **디코더 전용(Decoder-only)** 모델이라고 부릅니다.

## 멀티헤드 어텐션(Multi-Head Attention) — "여러 명이 동시에 다른 관점으로 보기"

한 사람이 한 가지 관점으로만 문장을 보면 놓치는 게 많겠죠. 그래서 모델은 쿼리/키/밸류를 여러 조각(**헤드, Head**)으로 나눠서, 각 헤드가 서로 다른 종류의 관계에 집중하도록 해요.

- 어떤 헤드는 "누가 주어인지"에 집중하고
- 어떤 헤드는 "시제(과거/현재)"에 집중하고
- 어떤 헤드는 "가까운 단어끼리의 관계"에 집중할 수 있어요

이렇게 여러 헤드가 각자 계산한 결과를 나중에 다시 합쳐서(concatenate), 한 가지 관점보다 훨씬 풍부한 이해를 만들어냅니다.

## 요약 그림

```
입력 벡터들 (의미 + 위치 정보 포함)
   ↓ Q, K, V로 각각 투영
Q·Kᵀ/√d_k → 소프트맥스 → 확률 (단, 미래 위치는 마스킹으로 차단)
   ↓ 확률만큼 V를 섞음
"문맥을 반영한 새로운 벡터" 출력  ← 여러 헤드에서 이 과정을 동시에 수행 후 합침
```

어텐션에서 "누구를 신경 쓸지"를 정했다면, 다음은 그 정보를 바탕으로 실제 "생각을 정리"하는 [피드포워드 / MoE](./05-feedforward-moe.md) 단계입니다.

## 참고 자료 (Sources)

- [Understanding and Coding Self-Attention, Multi-Head Attention, Causal-Attention — Sebastian Raschka](https://magazine.sebastianraschka.com/p/understanding-and-coding-self-attention)
- [A Beginner's Guide to Multi-Head Self-Attention in LLMs — Medium](https://medium.com/@adarsh-ai/a-beginners-guide-to-multi-head-self-attention-in-llms-1a4ea8be6fb2)
- [Multi-Head Attention Mechanism — GeeksforGeeks](https://www.geeksforgeeks.org/nlp/multi-head-attention-mechanism/)
- [Trainable causal attention and multi-head attention](https://onepagecode.substack.com/p/trainable-causal-attention-and-multi)
