# LLM 양자화와 정보 손실 보완법

## 쉬운 설명

키를 잴 때 "172.38cm" 대신 "172cm"라고만 적으면 공책은 덜 쓰지만 조금 틀린다. 양자화는 AI의 수십억 개 숫자를 이렇게 대충 적는 일이다. 그냥 반올림하면 틀린 게 쌓이니까, **중요한 숫자는 더 꼼꼼히 적고, 틀린 만큼 옆 숫자로 메우고, 처음부터 대충 적는 연습을 시키는 것**이 보완법이다.

---

## 일반 설명

### 1. 딥러닝에서 쓰는 수치 포맷

> 부동소수점의 구조(부호/지수/가수, bias, 비정규 수, NaN, 반올림 모드, ULP)는 [부동소수점 (IEEE 754)](../cs-fundamentals/ieee754-floating-point.md)에 따로 정리했다. 여기서는 양자화에 필요한 성질만 짚는다.

부동소수점은 값의 간격이 **지수에 비례해 벌어진다**. 0 근처는 촘촘하고, 큰 수일수록 간격이 넓다(상대 오차가 일정). 정수(INT)는 간격이 균일하다. 이 차이가 양자화 포맷 선택에 직접 영향을 준다.

| 포맷 | 비트 구성 (S/E/M) | 특징 |
|---|---|---|
| FP32 | 1/8/23 | 학습 기준(마스터 가중치, 옵티마이저 상태) |
| FP16 | 1/5/10 | 정밀도는 좋지만 범위가 좁아(최대 65504) 학습 시 오버플로/언더플로 → loss scaling 필요 |
| BF16 | 1/8/7 | FP32와 같은 범위, 정밀도는 낮음. 현재 학습·추론의 사실상 표준 |
| FP8 E4M3 | 1/4/3 | 정밀도 우선 → 가중치·활성화(forward) |
| FP8 E5M2 | 1/5/2 | 범위 우선 → 그래디언트(backward) |
| FP4 E2M1 | 1/2/1 | 표현 가능한 값이 ±{0, 0.5, 1, 1.5, 2, 3, 4, 6} 뿐. 블록 스케일 없이는 못 씀 |
| INT8 / INT4 | 정수 | 균일 간격, 정수 연산기로 빠름 |

> 지수 비트 = 범위, 가수 비트 = 정밀도. 같은 비트 수에서 이 둘을 어떻게 나누느냐가 포맷 설계의 전부다.

### 2. 양자화(Quantization)란

고정밀 값(BF16/FP32)을 저비트 값(INT8/INT4/FP8/FP4)으로 매핑하는 것. 목적은 **메모리 절감**과 **메모리 대역폭 절감**(LLM 디코딩은 메모리 바운드라 가중치가 작아지면 그대로 빨라짐), 저비트 연산기 활용이다.

#### 균일 정수 양자화 공식

```
q = clamp( round(x / s) + z, qmin, qmax )   # 양자화
x̂ = s × (q - z)                              # 역양자화(dequantize)
```

- `s` (scale): 실수 범위를 정수 칸 하나 크기로 나눈 값. 예: 대칭 INT8이면 `s = max|x| / 127`
- `z` (zero-point): 비대칭일 때 0의 위치 이동. 대칭 양자화는 `z = 0`

#### 오차의 두 종류

1. **반올림 오차(rounding error)**: 칸 사이 값을 가장 가까운 칸으로 보내며 생김. 최대 `s/2`.
2. **클리핑 오차(clipping error)**: 범위 밖 값을 `qmin/qmax`로 잘라내며 생김.

둘은 **트레이드오프**다. 범위를 넓게 잡으면(클리핑↓) `s`가 커져 반올림 오차↑, 좁게 잡으면 반대.

#### 왜 LLM에서 손실이 커지나: 아웃라이어

LLM의 활성화에는 특정 채널에서 다른 값보다 수십~수백 배 큰 **아웃라이어(outlier)** 가 체계적으로 등장한다(6.7B 규모 이상에서 뚜렷). `max|x|` 하나가 100이고 나머지가 0.1 수준이면 `s`가 아웃라이어에 맞춰져서, 대부분의 값이 0 근처 한두 칸에 뭉개진다. 이게 "절삭에 의한 정보 손실"의 본체다.

또 비트가 줄수록 손실은 비선형으로 커진다: 8비트는 256칸, 4비트는 16칸, 3비트는 8칸.

#### 양자화 대상

| 표기 | 의미 |
|---|---|
| W4A16 | 가중치만 4비트, 연산은 16비트 (weight-only, 메모리 절감 목적) |
| W8A8 | 가중치·활성화 모두 8비트 (연산 가속 목적) |
| W4A4KV4 | 가중치·활성화·KV 캐시 모두 4비트 (가장 어려움) |

가중치는 분포가 비교적 얌전하지만 활성화는 아웃라이어가 심해서, **활성화 양자화가 훨씬 어렵다.**

---

### 3. 정보 손실 보완 방법

크게 다섯 갈래다: **(1) 스케일을 잘게 쪼개기, (2) 아웃라이어 다루기, (3) 오차를 보정하기, (4) 학습으로 적응시키기, (5) 포맷/비트 배분 바꾸기.**

#### 3.1 세분화된 스케일(Granularity)

스케일 하나가 담당하는 값의 수를 줄이면, 아웃라이어의 영향이 그 그룹 안에만 갇힌다.

| 단위 | 설명 |
|---|---|
| per-tensor | 텐서 전체에 스케일 1개. 가장 거칠다 |
| per-channel | 출력 채널마다 1개. 가중치 양자화의 기본 |
| per-token | 활성화의 토큰(행)마다 1개, 실행 중 동적으로 계산 |
| per-group / block | 64·128개 등 묶음마다 1개. GPTQ/AWQ의 `group_size=128`, GGUF의 K-quant |

**마이크로스케일링(Microscaling)** 은 이를 하드웨어 포맷으로 만든 것이다.

- **MXFP4** (OCP 표준): FP4 값 32개마다 E8M0(2의 거듭제곱) 스케일 1개
- **NVFP4** (NVIDIA Blackwell): FP4 값 16개마다 FP8(E4M3) 스케일 + 텐서 단위 FP32 스케일의 2단계. 블록이 작고 스케일이 정밀해 반올림 오차가 더 작다. 스케일 포함 약 4.5비트/값

대가: 스케일 저장 비용(비트당 오버헤드)과 커널 복잡도.

#### 3.2 아웃라이어 처리

**(a) 분리 처리 – LLM.int8()**
아웃라이어 채널(전체의 ~0.1%)만 FP16으로 따로 계산하고 나머지는 INT8. 정확하지만 분기 때문에 느리다.

**(b) 난이도 이전 – SmoothQuant**
`Y = X·W = (X·diag(s)⁻¹)·(diag(s)·W)` 라는 수학적 등가 변환으로, 활성화의 큰 채널을 `s`로 나눠 줄이고 그만큼 가중치에 곱한다. 활성화 아웃라이어를 "양자화하기 쉬운" 가중치 쪽으로 옮기는 것. `s`는 이전 레이어(LayerNorm 등)에 미리 접어 넣을 수 있어 추론 비용이 없다. W8A8의 표준 기법.

**(c) 회전 – QuaRot, SpinQuant**
직교 행렬 `R` (RRᵀ = I)을 끼워 `Y = (X·R)·(Rᵀ·W)`로 바꾼다. 결과는 같지만, 회전하면 한 채널에 몰려 있던 큰 값이 모든 채널로 고르게 퍼진다(에너지가 분산되어 분포가 가우시안에 가까워짐).
- **QuaRot**: 원소가 ±1/√n인 **Hadamard 행렬**을 사용. 고속 변환(O(n log n))이 가능하고, 일부 회전은 가중치에 오프라인으로 흡수. KV 캐시까지 회전해 W4A4KV4를 가능하게 함
- **SpinQuant**: 회전 행렬을 고정하지 않고 **학습**으로 최적화. LLaMA-3 8B에서 QuaRot 대비 원본과의 격차를 최대 45% 더 줄였다고 보고
- 주의: 2026년 평가 연구에 따르면 INT4에 효과적인 회전 기법이 MXFP4/NVFP4 같은 FP4 블록 포맷에서는 이득이 제한적이다. 블록 스케일이 이미 아웃라이어를 국소화하기 때문으로 해석된다.

#### 3.3 오차 보정 (Post-Training Quantization, PTQ)

재학습 없이, 소량의 **보정 데이터(calibration set, 수백 문장)** 로 오차를 줄인다.

**(a) 클리핑 범위 탐색**
min/max 대신 MSE·KL divergence·퍼센타일(99.99%)로 최적 클리핑 지점을 찾는다. 3.2의 반올림/클리핑 트레이드오프를 직접 최적화.

**(b) GPTQ – 오차를 남은 가중치로 전파**
가중치를 한 열씩 양자화하면서, 생긴 오차를 **아직 양자화하지 않은 열들이 보상하도록** 업데이트한다. 어떤 방향으로 보상할지는 레이어 출력 오차 `‖WX − ŴX‖²`의 2차 근사(Hessian `H = 2XXᵀ`)로 결정한다(Optimal Brain Surgeon 계열). 즉 각 가중치는 손실되지만 **레이어 출력은 거의 보존**된다. "절삭 손실을 이웃에게 떠넘겨 상쇄"하는 대표 기법.

**(c) AWQ – 중요한 가중치 보호**
활성화 크기가 큰 채널에 곱해지는 가중치(~1%)가 출력에 훨씬 중요하다는 관찰. 이 채널의 가중치를 스케일 `s > 1`로 키운 뒤 양자화하면 상대 반올림 오차가 줄어든다(입력은 `1/s`로 나눠 등가 유지). 역전파 없이 스케일만 탐색하므로 빠르고 과적합이 적다.

**(d) 반올림 방향 학습 – AdaRound 등**
무조건 "가장 가까운 값"으로 반올림(round-to-nearest)하는 게 최적이 아니다. 각 가중치를 올릴지 내릴지를 레이어 출력 오차 기준으로 학습한다.

**(e) 오차 피드백 (Error Feedback / Dithering)**
그래디언트 압축·저정밀 학습에서는 이번 스텝의 양자화 오차를 저장해 다음 스텝 값에 더해 준다. **확률적 반올림(stochastic rounding)** 은 반올림 방향을 확률적으로 정해 **기댓값을 원래 값과 같게(unbiased)** 만들어, 누적 편향을 없앤다. FP8/FP4 학습에서 핵심.

#### 3.4 양자화 인식 학습 (QAT, Quantization-Aware Training)

학습(또는 파인튜닝) 중 forward에 **가짜 양자화(fake quantization)** 를 넣어, 모델이 양자화 노이즈에 강한 가중치로 스스로 이동하게 한다.

- `round()`는 미분이 거의 모든 곳에서 0이라 역전파가 안 된다 → **STE(Straight-Through Estimator)** 로 그래디언트를 그대로 통과시킨다
- 스케일 자체도 학습 파라미터로 둘 수 있다(LSQ)
- PTQ보다 정확도가 높고, 특히 4비트 이하에서 차이가 크다. 대신 학습 비용이 든다
- 실례: Google Gemma 3 QAT 체크포인트, Meta LLM-QAT(데이터 없이 모델이 생성한 데이터로 QAT)

**QLoRA**는 변형이다. 베이스 모델을 4비트(NF4)로 얼린 채 위에 LoRA 어댑터(BF16)만 학습해, 양자화 손실을 어댑터가 일부 흡수한다.

#### 3.5 포맷과 비트 배분

**(a) 분포에 맞는 포맷 – NF4, FP 포맷**
신경망 가중치는 대략 정규분포다. 균일 간격 INT4는 0 근처를 낭비한다.
- **NF4 (NormalFloat4)**: 정규분포의 분위수(quantile)에 맞춰 16개 값을 배치 → 각 칸에 같은 수의 값이 들어가 정보 이론적으로 최적에 가까움
- **FP8/FP4**: 0 근처가 촘촘한 부동소수점 특성이 종 모양 분포에 잘 맞음. 그래서 FP8은 대부분 모델에서 정확도 손실이 거의 없고, 2026년 기준 "가장 안전한 기본값"으로 통한다

**(b) 혼합 정밀도(Mixed Precision)**
레이어마다 민감도가 다르다. 임베딩, LM head, 첫·마지막 레이어, 어텐션의 일부는 높은 비트로 두고 나머지만 낮춘다. 민감도는 Hessian 트레이스나 레이어별 양자화 후 perplexity 변화로 측정한다. GGUF의 `Q4_K_M`이 `Q4_K_S`보다 품질이 좋은 이유가 일부 텐서에 더 높은 비트를 주기 때문이다.

**(c) 벡터 양자화 / 코드북 – AQLM, QuIP#**
스칼라 하나씩이 아니라 8개 묶음을 코드북의 벡터 하나로 표현. 2비트 수준에서도 쓸 만한 품질을 낸다(디코딩 비용은 큼).

**(d) 큰 모델을 양자화하는 게 작은 모델 원본보다 낫다**
일반적으로 70B 4비트가 13B 16비트보다 품질이 좋다. 같은 메모리에서 "비트 수 vs 파라미터 수"를 고르는 문제로 보면, 4비트 근처가 효율의 스위트스폿이라는 관찰이 많다.

---

### 4. 실무 선택 가이드 (2026년 기준)

| 상황 | 권장 |
|---|---|
| Hopper/Blackwell GPU, 정확도 최우선 | **FP8 (W8A8)** — 손실 거의 없음, 약 2배 압축 |
| Blackwell, 더 큰 압축 | **NVFP4** — 약 3배 압축, 블록 스케일로 품질 유지. GPTQ 계열 보정과 결합 시 INT4 AWQ 수준 이상 보고 |
| FP4 연산기 없는 GPU, 4비트 | **AWQ 또는 GPTQ (W4A16, group 128)** |
| CPU/맥/로컬 | **GGUF K-quant** (`Q4_K_M`, `Q5_K_M`) |
| 4비트 이하 or 활성화까지 4비트 | **회전(QuaRot/SpinQuant) + GPTQ**, 가능하면 **QAT** |
| 파인튜닝 메모리 절약 | **QLoRA (NF4)** |

### 5. 정리

- 부동소수점은 지수(범위)와 가수(정밀도)의 비트 배분 문제다 ([IEEE 754 상세](../cs-fundamentals/ieee754-floating-point.md)).
- 양자화 손실은 **반올림 오차 + 클리핑 오차**이고, LLM에서는 **아웃라이어**가 이를 폭증시킨다.
- 보완은 ① 스케일을 잘게(per-group, MX/NVFP4) ② 아웃라이어를 분리·이전·회전(LLM.int8, SmoothQuant, QuaRot) ③ 오차를 이웃에게 보상(GPTQ)하거나 중요한 값을 보호(AWQ) ④ 학습으로 적응(QAT, QLoRA) ⑤ 분포에 맞는 포맷과 혼합 정밀도.
- 이 기법들은 서로 조합된다. 예: 회전 → SmoothQuant 스케일 → GPTQ 보정 → per-group 스케일.

## 관련 문서

- [부동소수점 (IEEE 754)](../cs-fundamentals/ieee754-floating-point.md)
- [LLM 추론 VRAM: 가중치 vs 입력 메모리](llm-inference-vram-weights-vs-input-memory.md)
- [KV 캐시 개념](kv-cache/kv-cache-attention-explained.md)

## 참고 자료

- [A Comprehensive Evaluation on Quantization Techniques for LLMs (arXiv 2507.17417)](https://arxiv.org/abs/2507.17417)
- [LLM quantization explained: FP8, NVFP4, AWQ, GPTQ and GGUF (wz-it)](https://wz-it.com/en/knowledge/ki/llm-quantization/)
- [MXFP4 microscaling quantization (Spheron)](https://www.spheron.network/blog/mxfp4-microscaling-quantization-gpu-cloud/)
- [Blackwell dtypes on Qwen3-32B (Jarvislabs)](https://jarvislabs.ai/blog/blackwell-dtypes-qwen3-32b)
- [GGUF vs AWQ vs GPTQ (computingforgeeks)](https://computingforgeeks.com/gguf-vs-awq-vs-gptq/)
- [SpinQuant: LLM Quantization with Learned Rotations (arXiv 2405.16406)](https://export.arxiv.org/abs/2405.16406v4)
- [SmoothRot: Channel-Wise Scaling and Rotation (arXiv 2506.05413)](https://arxiv.org/html/2506.05413v2)
- [QuaRot: Hadamard rotation for outlier-free 4-bit LLM](https://mohakchugh.is-a.dev/blog/quarot-rotation-quantization-hadamard-outlier-free-4bit-llm)
- [AMD ROCm: MXFP4 with rotations + SmoothQuant](https://rocm.blogs.amd.com/software-tools-optimization/mxfp4-online-rotation/README.html)
