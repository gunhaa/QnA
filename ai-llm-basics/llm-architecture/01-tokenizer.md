# 1단계 자세히 보기: 토크나이저(Tokenizer) — 글자를 레고 번호표로 자르기

## 비유

엄마가 아이에게 긴 문장을 읽어줄 때, 아이는 아직 글자를 몰라서 문장을 통째로 이해 못 해요. 대신 "레고 조각 도감"을 하나 가지고 있어서, 문장에 나오는 작은 조각들을 도감에서 찾아 번호를 하나씩 붙여요. 이 "도감에서 조각 찾아 번호 붙이기"가 바로 토크나이저가 하는 일이에요.

중요한 건, 조각이 항상 "단어" 하나가 아니라는 점이에요. 어떨 땐 "나", "는" 처럼 짧게 자르고, 어떨 땐 "먹었" 처럼 애매하게 잘릴 수도 있어요. 마치 레고를 낱개 블록이 아니라 "이미 조립된 작은 덩어리" 단위로 세는 것과 비슷해요.

## 기술적으로 어떻게 자르나요? — BPE (Byte Pair Encoding)

1. **초기화**: 처음엔 문장을 글자(또는 바이트) 단위로 쪼갭니다. "낮은"이라는 단어는 "낮", "은"처럼요.
2. **빈도 분석**: 텍스트 전체에서 어떤 두 조각이 붙어서 자주 나오는지 세어봅니다.
3. **병합(Merge)**: 가장 자주 붙어 나오는 조각 쌍을 하나로 합쳐서 새로운 조각(토큰)을 만듭니다.
4. **반복**: 이 병합을 원하는 **어휘 크기(Vocabulary Size)**에 도달할 때까지 계속 반복합니다.

이렇게 만들어진 "자주 붙어 다니는 조각 사전"을 **어휘집(Vocabulary)**이라고 부르고, 그 사전에 있는 각 조각을 **토큰(Token)**이라고 불러요. GPT, RoBERTa, BART 같은 모델들이 이 방식(또는 변형)을 씁니다.

## 왜 단어 단위로 자르지 않나요?

- 단어 단위로만 자르면, 사전에 없는 새 단어(예: 신조어, 오타, 외국어)가 나왔을 때 "모르는 단어"로 처리해버려야 해요. 레고 도감에 없는 모양이 나오면 통째로 포기하는 셈이죠.
- 반면 BPE처럼 잘게 쪼개서 조합하면, 사전에 없는 단어도 "이미 아는 작은 조각들의 조합"으로 어떻게든 표현할 수 있어요. 이걸 **서브워드(Subword)** 방식이라고 해요.

## 어휘 크기(Vocabulary Size)와 트레이드오프

- 어휘집을 작게 만들면(병합을 적게 하면) → 조각이 더 잘게 쪼개져서 문장 하나가 더 많은 토큰으로 표현돼요. (레고 조각이 더 작아서 개수가 많아짐)
- 어휘집을 크게 만들면(병합을 많이 하면) → 조각이 더 크고 자주 쓰는 단위가 돼서 문장이 더 적은 토큰으로 표현돼요. 하지만 사전 자체가 커져서 메모리를 더 씁니다.

## 요약 그림

```
"낮은 산" (원문)
   ↓ 글자 단위로 쪼갬
[낮, 은, " ", 산]
   ↓ 자주 붙는 조각끼리 병합 (BPE 학습 결과 적용)
[낮은, " ", 산]
   ↓ 어휘집에서 번호 찾기
[1024, 7, 305]   ← 이 숫자들이 다음 단계인 임베딩으로 넘어감
```

다음 단계인 [토큰 임베딩](./02-token-embedding.md)에서는, 이 번호들이 어떻게 "의미를 가진 벡터"로 바뀌는지 다룹니다.

## 참고 자료 (Sources)

- [Byte-Pair Encoding (BPE) in NLP - GeeksforGeeks](https://www.geeksforgeeks.org/nlp/byte-pair-encoding-bpe-in-nlp/)
- [Byte-Pair Encoding tokenization · Hugging Face](https://huggingface.co/learn/llm-course/en/chapter6/5)
- [Implementing A Byte Pair Encoding (BPE) Tokenizer From Scratch — Sebastian Raschka](https://sebastianraschka.com/blog/2025/bpe-from-scratch.html)
- [Byte-Pair Encoding For Beginners | Towards Data Science](https://towardsdatascience.com/byte-pair-encoding-for-beginners-708d4472c0c7/)
