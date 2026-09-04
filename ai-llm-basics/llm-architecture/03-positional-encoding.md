# 3단계 자세히 보기: 포지셔널 인코딩(Positional Encoding) — 순서표 붙이기

## 비유

레고 블록을 한 상자에 와르르 쏟아부으면, 어떤 블록이 몇 번째로 놓여야 하는지 알 수 없어요. "나는 밥을 먹었다"와 "밥은 나를 먹었다"는 완전히 다른 뜻인데, 안에 들어있는 블록(단어)은 똑같아요. 순서가 바뀌면 뜻이 완전히 달라지니까, 각 블록에 "너는 1번째, 너는 2번째" 하는 **순서 스티커**를 붙여줘야 해요. 이게 포지셔널 인코딩이 하는 일이에요.

## 왜 트랜스포머에는 순서 스티커가 따로 필요한가요?

옛날 방식(RNN 같은 순환 신경망)은 단어를 한 개씩 순서대로 읽어서 자연스럽게 순서를 알았어요. 하지만 트랜스포머는 **모든 단어를 한꺼번에 동시에** 처리해요 (그래야 빠르니까요). 동시에 처리하면 속도는 빠른데, 대신 "이게 몇 번째 단어인지"를 스스로는 전혀 모릅니다. 그래서 순서 정보를 사람이 억지로 끼워 넣어줘야 해요.

## 대표적인 두 가지 방식

### (1) RoPE (Rotary Position Embedding) — "회전시켜서 순서를 새기기"

RoPE는 각 단어의 벡터(정확히는 어텐션 계산에 쓰이는 쿼리/키 벡터)를 **위치에 비례하는 각도만큼 빙글빙글 회전**시켜요. 시계 바늘을 위치마다 조금씩 더 돌리는 것과 비슷해요. 이렇게 하면, 두 단어 사이의 "상대적인 거리"가 자연스럽게 계산에 녹아들어요.

- 장점: 오늘날 Llama, Qwen 등 대부분의 최신 LLM이 이 방식을 표준으로 채택하고 있어요.
- 단점: 학습할 때 본 문장보다 훨씬 긴 문장을 넣으면(길이 외삽, length extrapolation) 성능이 떨어지는 경향이 있어요.

### (2) ALiBi (Attention with Linear Biases) — "멀수록 벌점 주기"

ALiBi는 벡터 자체를 건드리지 않아요. 대신 어텐션 계산 마지막에 "쿼리와 키가 멀리 떨어져 있을수록 점수에서 벌점(-)을 빼는" 방식이에요. 가까운 단어는 벌점이 적고, 먼 단어는 벌점이 커요.

- 장점: 학습 때보다 훨씬 긴 문장이 들어와도(길이 외삽) 상대적으로 성능이 덜 떨어져요.
- 이 때문에 RoPE와 ALiBi를 섞어 쓰는 연구도 최근 나오고 있어요 (RoPE의 표현력 + ALiBi의 긴 문장 대응력).

## 요약 비교표

| 구분 | RoPE | ALiBi |
|---|---|---|
| 방식 | 벡터를 위치만큼 회전 | 어텐션 점수에 거리 벌점 추가 |
| 채택 모델 | Llama, Qwen 등 대부분의 최신 모델 | 일부 모델, 긴 문맥 특화 |
| 긴 문장 대응(외삽) | 상대적으로 약함 | 상대적으로 강함 |

## 요약 그림

```
임베딩 벡터: [0.12, -0.44, ...] (몇 번째 단어인지 모름)
   ↓ 위치 정보 주입 (RoPE: 회전 / ALiBi: 어텐션 시 거리 벌점)
"이 벡터는 3번째 단어의 벡터야" 라는 정보가 녹아든 상태
```

이제 벡터에 "의미"와 "순서"가 모두 담겼습니다. 다음은 진짜 두뇌 역할을 하는 [셀프 어텐션](./04-self-attention.md) 단계입니다.

## 참고 자료 (Sources)

- [RoPE vs ALiBi Positional Encoding — MetricGate](https://metricgate.com/blogs/rope-vs-alibi-positional-encoding/)
- [Beyond Attention: How Advanced Positional Embedding Methods Improve upon the Original Approach — TDS Archive](https://medium.com/data-science/beyond-attention-how-advanced-positional-embedding-methods-improve-upon-the-original-transformers-90380b74d324)
- [Selective Rotary Position Embedding (arXiv)](https://arxiv.org/pdf/2511.17388)
- [The What, Why, and How of Context Length Extension Techniques in LLMs — Survey (arXiv)](https://arxiv.org/pdf/2401.07872)
