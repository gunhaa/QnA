# LLM(거대 언어 모델) 아키텍처, 레고 블록처럼 이해하기

## 한 줄 비유

LLM은 **레고 블록을 여러 층 쌓아 만든 아주 긴 "다음 조각 맞추기" 기계**예요. 블록마다 하는 일이 정해져 있고, 이 블록들을 수십~수백 번 반복해서 쌓으면 사람처럼 말하는 모델이 됩니다. 이 블록 쌓는 방식을 **트랜스포머(Transformer) 아키텍처**라고 불러요.

---

## 1단계: 글자를 레고 조각 번호로 바꾸기 — 토크나이저 (Tokenizer)

아이가 그림책을 볼 때 글자를 모르면, 그림 하나하나에 번호표를 붙여서 기억하는 것과 같아요.
컴퓨터는 "안녕"이라는 글자를 못 읽으니, 문장을 잘게 쪼개서 **토큰(token)**이라는 조각으로 만들고 각 조각에 번호를 매깁니다. 이 방법을 **BPE(Byte Pair Encoding)**라고 해요.

## 2단계: 번호표를 느낌표(의미)로 바꾸기 — 임베딩 (Embedding)

번호표만 있으면 "1번 블록"이 뭔지 몰라요. 그래서 번호마다 "이 블록은 이런 색깔, 이런 촉감이야"라는 **느낌 벡터**를 붙여줘요. 이게 **토큰 임베딩(Token Embedding)**입니다. 비슷한 뜻을 가진 단어는 비슷한 느낌 벡터를 갖게 돼요. (예: "강아지"와 "고양이"는 "책상"보다 서로 더 비슷한 벡터)

## 3단계: 순서표 붙이기 — 포지셔널 인코딩 (Positional Encoding)

블록을 한꺼번에 와르르 쏟아부으면 순서를 몰라요. 그래서 "너는 1번째 블록, 너는 2번째 블록" 하고 순서 스티커를 붙여줘요. 요즘 모델들은 **RoPE(Rotary Position Embedding)**라는 똑똑한 스티커 방식을 많이 씁니다.

## 4단계: 진짜 두뇌 — 디코더 레이어 반복 쌓기 (Decoder Layers)

여기가 핵심이에요. 아래 두 가지 방을 한 세트로 묶어서, 이 세트를 수십~수백 번 복사-붙여넣기 합니다.

### (a) 주의집중 방 — 셀프 어텐션 (Self-Attention)

친구들과 이야기할 때, 문장 속 어떤 단어를 말할 땐 앞에 나온 어떤 단어를 더 신경 써서 봐야 하는지 알아요. 예를 들어 "고양이는 배가 고파서 밥을 먹었다"에서 "먹었다"를 이해하려면 "고양이"와 "밥"을 더 유심히 봐야 하죠. 이렇게 **어떤 단어를 얼마나 신경 쓸지 계산하는 것**이 어텐션입니다.

여기서 아주 중요한 규칙: 오늘날 대부분의 LLM(ChatGPT, Claude, Llama 등)은 **디코더 전용(Decoder-only)** 방식이에요. 이는 "앞으로 나올 말은 절대 미리 훔쳐보면 안 돼!"라는 규칙(**코절 마스킹, Causal Masking**)을 지킵니다. 답을 미리 보면 그냥 베끼기만 배우니까요.

### (b) 생각 정리 방 — 피드포워드 (Feed-Forward Network, MLP)

어텐션 방에서 "누구를 신경 써서 봐야 하는지" 정했다면, 이 방에서는 "그래서 결론이 뭔지" 혼자 곰곰이 생각을 정리해요.

최근에는 이 생각 정리 방을 **하나의 큰 방** 대신 **여러 개의 전문가 방(Mixture-of-Experts, MoE)**으로 나누고, 질문마다 필요한 전문가 몇 명만 골라서 물어보는 방식도 많이 씁니다. 방을 다 쓰지 않으니 더 빠르고 효율적이에요.

각 방 사이사이에는 **잔차 연결(Residual Connection)**이라는 지름길과, **레이어 정규화(Layer Normalization)**라는 "목소리 크기 맞추기" 장치가 있어서, 블록을 아무리 많이 쌓아도 정보가 흐트러지지 않게 도와줍니다.

## 5단계: 최종 답 뽑기 — 출력층 (Output/Softmax Layer)

모든 방을 다 거치고 나면, "다음에 올 조각은 이거일 확률이 몇 %"라는 표를 만들어요. 이걸 **소프트맥스(Softmax)**로 확률로 바꾼 뒤, 가장 그럴듯한(또는 적당히 랜덤한) 다음 토큰 하나를 뽑습니다. 이 과정을 한 글자씩 반복하면 문장이 완성돼요.

---

## 전체 그림 요약

```
문장 입력
   ↓
[토크나이저] 글자 → 번호 조각
   ↓
[임베딩 + 포지셔널 인코딩] 번호 → 의미 벡터 + 순서표
   ↓
[디코더 레이어 × N번 반복]
   ├─ 셀프 어텐션 (코절 마스킹)
   ├─ 피드포워드 / MoE
   └─ 잔차 연결 + 레이어 정규화
   ↓
[출력층 / Softmax]
   ↓
다음 토큰 예측 → 반복해서 문장 완성
```

---

## 참고 자료 (Sources)

- [Decoder-Only Transformers Explained: The Engine Behind LLMs](https://medium.com/@yash9439/decoder-only-transformers-explained-the-engine-behind-llms-3a3224086afe)
- [Decoder-only model: the architecture every modern LLM uses](https://zeroentropy.dev/concepts/decoder-only-model/)
- [Decoder-Only Transformers: The Workhorse of Generative LLMs](https://cameronrwolfe.substack.com/p/decoder-only-transformers-the-workhorse)
- [Understanding LLMs: A Comprehensive Overview from Training to Inference (arXiv)](https://arxiv.org/pdf/2401.02038)
- [Mixture-of-Experts (MoE) LLMs](https://cameronrwolfe.substack.com/p/moe-llms)
- [How LLMs Work: Tokens, Embeddings, and Transformers](https://medium.com/@iam-abdulmoiz/how-llms-work-tokens-embeddings-and-transformers-a54d0468b42e)
