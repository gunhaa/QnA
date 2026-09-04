# 2단계 자세히 보기: 토큰 임베딩(Token Embedding) — 번호표에 "느낌"을 붙이기

## 비유

번호표(토큰 ID)만 있으면 "305번 조각이 뭔지" 몰라요. 마치 옷 가게에서 옷마다 바코드만 붙어있고, 그 옷이 빨간색인지 파란색인지 두꺼운지 얇은지는 안 적혀있는 것과 같아요.

그래서 각 번호마다 "이 조각은 이런 느낌이야"라는 **긴 숫자 리스트(벡터)**를 짝지어줘요. 이 숫자 리스트를 **임베딩 벡터(Embedding Vector)**라고 하고, 비슷한 뜻을 가진 단어일수록 이 숫자 리스트가 서로 비슷해져요. "강아지"와 "고양이"의 리스트는 서로 가깝고, "강아지"와 "자동차"의 리스트는 서로 멀어요.

## 기술적으로 무슨 일이 일어나나요?

- 모델 안에는 **임베딩 테이블(Embedding Table / Lookup Table)**이라는 커다란 표가 있어요. 행(row) 개수는 어휘집 크기(예: 5만 개 토큰)만큼 있고, 각 행은 **임베딩 차원(Embedding Dimension)** 개수만큼의 숫자로 이루어져 있어요.
- 임베딩 차원은 모델마다 다른데, 보통 256, 512, 768, 1024, 2048처럼 정해져 있어요. 차원이 클수록 "더 섬세한 느낌"을 담을 수 있지만, 그만큼 계산량과 메모리가 늘어나요.
- 1단계에서 나온 토큰 번호(예: 305)를 이 표에서 찾아서, 305번째 줄에 있는 숫자 리스트를 그대로 꺼내옵니다. 이게 끝이에요 — **덧셈도 곱셈도 아니고 순수하게 "찾아오기(lookup)"**입니다.

## 왜 "학습 가능한" 표인가요?

처음에는 이 표의 숫자들이 전부 무작위예요. 즉, 처음엔 "강아지"와 "자동차"의 벡터가 우연히 가까울 수도 있어요. 하지만 모델이 엄청나게 많은 문장을 읽으면서 "강아지는 짖는다"와 "고양이는 야옹거린다"처럼 비슷한 문맥에 나오는 단어들의 벡터를 서로 가까워지도록 조금씩 조정해요. 이 과정을 **학습(Training)**이라고 부르고, 학습이 끝나면 이 표 자체가 "단어 뜻 지도"가 됩니다.

## 벡터의 각 숫자는 무엇을 의미하나요?

사람이 "이 숫자는 동물인지 아닌지를 나타내"라고 정해준 게 아니에요. 학습 과정에서 모델이 스스로 "이 방향의 숫자를 크게 하면 예측이 더 잘 맞더라"를 발견하며 각 차원이 어떤 추상적인 언어적 특징(예: 감정, 시제, 품사 느낌 등)을 대략적으로 담당하게 돼요. 사람은 이 숫자 하나하나가 정확히 뭘 뜻하는지 콕 집어 설명하기 어렵습니다 — 이런 "속을 들여다보기 어려운" 특성 때문에 **해석 가능성(Interpretability)** 연구가 따로 있을 정도예요.

## 요약 그림

```
토큰 번호: 305 ("낮은")
   ↓ 임베딩 테이블에서 305번째 줄 찾기
[0.12, -0.44, 0.91, ..., 0.03]  ← 768개의 숫자 (768차원 벡터)
```

문장 전체는 이렇게 "토큰 개수 × 임베딩 차원" 크기의 표(행렬)로 바뀝니다. 하지만 아직 이 벡터에는 "몇 번째 단어인지" 순서 정보가 없어요. 그래서 다음 단계인 [포지셔널 인코딩](./03-positional-encoding.md)이 필요합니다.

## 참고 자료 (Sources)

- [Vector Embeddings in Large Language Models (LLMs) — Medium](https://medium.com/@narendra.squadsync/vector-embeddings-in-large-language-models-llms-3e746f1063f3)
- [Explained: Tokens and Embeddings in LLMs — The Research Nest](https://medium.com/the-research-nest/explained-tokens-and-embeddings-in-llms-69a16ba5db33)
- [LLM Basics: Embedding Spaces - Transformer Token Vectors — LessWrong](https://www.lesswrong.com/posts/pHPmMGEMYefk9jLeh/llm-basics-embedding-spaces-transformer-token-vectors-are)
- [Inside an LLM: Tokens, Embeddings, and Vector Space](https://avishekjana.substack.com/p/inside-an-llm-tokens-embeddings-and)
