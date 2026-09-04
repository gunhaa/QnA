# 6단계 자세히 보기: 잔차 연결(Residual Connection)과 정규화(Normalization) — 블록을 아무리 쌓아도 안 무너지게 하기

## 비유

블록을 수십, 수백 층 쌓다 보면 두 가지 문제가 생겨요.

1. 아래층에서 들어온 원래 정보가 위로 올라갈수록 점점 흐려지거나 사라져요. (마치 "말 전하기" 게임을 100명이 하면 마지막엔 원래 말이 완전히 바뀌어버리는 것처럼요.)
2. 층마다 목소리 크기(숫자 크기)가 들쭉날쭉해지면, 위로 갈수록 너무 커지거나 너무 작아져서 계산이 폭주하거나 멈춰버려요.

이 두 문제를 해결하는 장치가 각각 **잔차 연결**과 **정규화**입니다.

## 잔차 연결 (Residual Connection) — "원본을 절대 버리지 않는 지름길"

각 블록(어텐션 방, FFN 방)을 통과시킬 때, **원래 입력을 그대로 옆에 복사해뒀다가, 블록의 결과값에 다시 더해줘요.**

```
출력 = 블록(입력) + 입력   ← 원본을 "지름길"로 그대로 더해줌
```

이렇게 하면 설령 블록이 별로 좋은 계산을 못 했더라도, 최소한 원래 정보는 그대로 다음 층으로 전달돼요. 마치 말 전하기 게임을 하면서 동시에 원래 쪽지도 손에 쥐고 함께 전달하는 것과 같아요. 이 지름길 덕분에 수백 층을 쌓아도 학습이 안정적으로 이루어질 수 있습니다.

## 정규화 (Normalization) — "목소리 크기를 항상 일정하게 맞추기"

숫자들이 층을 지날 때마다 크기가 들쭉날쭉해지지 않도록, 매번 "평균과 크기를 일정한 기준으로 다시 맞춰주는" 작업이에요.

### LayerNorm vs RMSNorm

- **LayerNorm**: 평균을 0으로 맞추고(재중심화), 분산도 일정하게 맞춰서 크기를 조절해요.
- **RMSNorm**: 평균을 맞추는 과정(재중심화)을 생략하고, **크기(제곱평균제곱근, Root Mean Square)만** 일정하게 맞춰요. 계산이 더 간단하고 빨라서 최근 Llama 등 많은 모델이 이 방식을 채택했어요.

### Pre-Norm vs Post-Norm — "정규화를 언제 하느냐"

- **Post-Norm** (예전 방식): 블록 계산 + 잔차를 더한 *다음에* 정규화를 해요. 층이 깊어지면 학습 중 숫자가 폭발(exploding gradient)하는 문제가 잘 생겨요.
- **Pre-Norm** (요즘 표준): 블록에 들어가기 *전에* 먼저 정규화를 해요. 원본이 지나가는 지름길(잔차 연결)이 정규화 없이 그대로 유지되기 때문에, 훨씬 안정적으로 깊게 쌓을 수 있어요.

```
[Post-Norm]  Y = Norm( Attention(X) + X )
[Pre-Norm]   Y = Attention( Norm(X) ) + X   ← 요즘 대세
```

## 요즘 표준 "레시피"

최근 많은 오픈소스 LLM들이 다음 조합을 표준처럼 채택하고 있어요.

> **Pre-Norm + RMSNorm + SwiGLU(활성화 함수) + RoPE(위치 인코딩)**

이 조합은 학습이 안정적이면서도 계산이 효율적이라는 점이 여러 모델(Llama 등)에서 검증되었기 때문에, 사실상 업계 표준 레시피처럼 자리 잡았습니다.

## 요약 그림

```
입력 X
   ↓ 정규화(RMSNorm)
   ↓ 어텐션 블록
   + X (원본을 지름길로 더함, 잔차 연결)
   ↓ 정규화(RMSNorm)
   ↓ FFN/MoE 블록
   + (이전 결과를 지름길로 더함, 잔차 연결)
다음 층으로 전달 → 이 전체 과정을 N번 반복
```

이 반복을 다 마치면, 마지막으로 진짜 "다음 단어가 뭘까"를 확률로 뽑아내는 [출력층과 샘플링](./07-output-sampling.md) 단계로 넘어갑니다.

## 참고 자료 (Sources)

- [Pre-Norm Residual Connections in Transformers — EmergentMind](https://www.emergentmind.com/topics/pre-norm-residual-connections-prenorm)
- [Residual Connections and Normalization in Transformers — RMSNorm, LayerNorm, DyT (Medium)](https://medium.com/@wasowski.jarek/a-decade-of-misplaced-sacred-cows-in-neural-networks-residuals-norms-1a4f85749a0d)
- [Enjoy Your Layer Normalization with the Computational Efficiency of RMSNorm (arXiv)](https://arxiv.org/pdf/2605.14521)
- [HybridNorm: Towards Stable and Efficient Transformer Training via Hybrid Normalization (arXiv)](https://arxiv.org/pdf/2503.04598)
