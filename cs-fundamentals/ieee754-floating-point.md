# 부동소수점 (IEEE 754)

## 쉬운 설명

부동소수점은 아주 큰 수와 아주 작은 수를 같은 크기의 칸에 적으려고 "1.23 × 10⁵"처럼 **숫자 부분과 자릿수 부분을 따로 적는 방법**이다. 대신 칸이 정해져 있어서 0.1 같은 수는 딱 맞게 못 적고 아주 조금 틀리게 적힌다.

---

## 일반 설명

### 1. 표현 구조

IEEE 754 이진 부동소수점은 세 필드로 수를 표현한다.

```
값 = (-1)^S × 1.M × 2^(E − bias)      (정규화 수)
```

| 필드 | 역할 |
|---|---|
| Sign (S) | 부호 1비트 |
| Exponent (E) | **범위** 결정. bias를 더한 부호 없는 정수로 저장 (bias = 2^(k−1) − 1) |
| Mantissa / Significand (M) | **정밀도** 결정. 맨 앞의 `1.`은 저장하지 않는 **숨은 비트(hidden bit)** |

#### 표준 포맷

| 포맷 | S/E/M 비트 | bias | 10진 유효 자릿수 | 머신 엡실론 | 최대값 |
|---|---|---|---|---|---|
| binary16 (half, FP16) | 1/5/10 | 15 | ~3.3 | 2⁻¹⁰ ≈ 9.8e-4 | 65504 |
| binary32 (single, FP32) | 1/8/23 | 127 | ~7.2 | 2⁻²³ ≈ 1.19e-7 | ≈ 3.4e38 |
| binary64 (double, FP64) | 1/11/52 | 1023 | ~15.9 | 2⁻⁵² ≈ 2.22e-16 | ≈ 1.8e308 |
| binary128 (quad) | 1/15/112 | 16383 | ~34 | 2⁻¹¹² | ≈ 1.2e4932 |

#### 인코딩 예: 0.15625 (FP32)

```
0.15625 = 0.00101₂ = 1.01₂ × 2⁻³
S = 0
E = −3 + 127 = 124 = 01111100
M = 0100000 00000000 00000000   (숨은 1 제외)
→ 0 01111100 01000000000000000000000 = 0x3E200000
```

### 2. 특수 값

지수 필드가 전부 0이거나 전부 1일 때는 특별한 의미를 갖는다.

| 지수 필드 | 가수 필드 | 의미 |
|---|---|---|
| 전부 0 | 0 | ±0 (부호 있는 0) |
| 전부 0 | ≠0 | **비정규 수(subnormal)**: `0.M × 2^(1−bias)` |
| 1 ~ 최대−1 | 아무 값 | 정규화 수 |
| 전부 1 | 0 | ±∞ |
| 전부 1 | ≠0 | **NaN** (Not a Number) |

- **±0**: `+0 == −0`은 참이지만 `1/+0 = +∞`, `1/−0 = −∞`로 구분된다.
- **NaN**: `0/0`, `∞−∞`, `sqrt(−1)` 등의 결과. **자기 자신과도 같지 않다**(`NaN != NaN`), 그래서 `x != x`로 NaN을 판별한다. 연산에 전파되는 quiet NaN과 예외를 일으키는 signaling NaN이 있다.
- **비정규 수(subnormal, 구 denormal)**: 최소 정규 수와 0 사이를 메워 **점진적 언더플로(gradual underflow)** 를 제공한다. 덕분에 `x − y == 0`이면 `x == y`가 보장된다. 다만 일부 CPU에서 비정규 수 연산이 수십~수백 배 느려서, 성능을 위해 FTZ(Flush-To-Zero)/DAZ(Denormals-Are-Zero) 모드로 0 처리하기도 한다. GPU와 딥러닝 커널도 흔히 이렇게 한다.

### 3. 값의 간격: ULP와 상대 오차

- 같은 지수 구간 안에서는 값이 균일 간격이지만, **지수가 1 올라가면 간격이 2배**가 된다. 이 간격을 **ULP(Unit in the Last Place)** 라 한다.
- 따라서 **절대 오차는 수의 크기에 비례하고, 상대 오차는 거의 일정**하다(최대 ε/2).
- 결과: FP32는 2²⁴ = 16,777,216 까지만 모든 정수를 정확히 표현한다. `16777216f + 1 == 16777216f`. FP64는 2⁵³(JavaScript `Number.MAX_SAFE_INTEGER`의 근거).

### 4. 반올림 (Rounding)

IEEE 754는 덧셈·뺄셈·곱셈·나눗셈·제곱근·FMA를 **정확히 반올림(correctly rounded)** 하도록 요구한다. 즉 무한 정밀도로 계산한 뒤 한 번만 반올림한 결과와 같아야 한다.

| 반올림 모드 | 설명 |
|---|---|
| roundTiesToEven (기본) | 가장 가까운 값, 정확히 중간이면 **가수 끝 비트가 짝수인 쪽**. 통계적으로 편향이 없다 |
| roundTiesToAway | 중간이면 0에서 먼 쪽 (2008판에서 추가, 이진 포맷에선 선택 사항) |
| roundTowardPositive | +∞ 방향 (올림) |
| roundTowardNegative | −∞ 방향 (내림) |
| roundTowardZero | 0 방향 (버림, 절삭) |

방향성 반올림 모드는 **구간 연산(interval arithmetic)** 으로 오차 범위를 엄밀하게 구할 때 쓴다.

### 5. 흔한 함정

#### (a) 10진 소수는 대부분 정확히 표현되지 않는다
`0.1 = 0.0001100110011…₂`(무한 반복)이라 가장 가까운 값으로 저장된다.

```python
>>> 0.1 + 0.2
0.30000000000000004
>>> 0.1 + 0.2 == 0.3
False
```
→ 비교는 `abs(a − b) <= tol` 또는 `math.isclose`로 하고, 돈 계산은 `BigDecimal`/`decimal`이나 정수(원·센트 단위)를 쓴다.

#### (b) 결합법칙이 성립하지 않는다
`(a + b) + c ≠ a + (b + c)`일 수 있다. 예: `(1e20 + −1e20) + 1 = 1`, `1e20 + (−1e20 + 1) = 0`.
→ GPU 병렬 리덕션처럼 **덧셈 순서가 실행마다 바뀌면 결과가 미세하게 달라진다**. 딥러닝 학습·LLM 추론의 비결정성(nondeterminism) 원인 중 하나다. 컴파일러가 `-ffast-math`로 순서를 바꾸면 결과가 달라지는 이유이기도 하다.

#### (c) 파국적 상쇄 (Catastrophic Cancellation)
비슷한 두 수를 빼면 앞자리가 사라지고 이미 오차가 섞인 뒷자리만 남아 상대 오차가 폭증한다.
- 예: 이차방정식 근의 공식에서 `b² ≫ 4ac`일 때 `−b + sqrt(b² − 4ac)`. → 식을 변형해 뺄셈을 피한다.
- 분산을 `E[x²] − E[x]²`로 구하면 위험 → Welford 알고리즘 사용.

#### (d) 큰 수에 작은 수 누적
작은 값을 큰 누적합에 계속 더하면 ULP보다 작은 부분이 매번 버려진다.
- **Kahan 보상 합산(compensated summation)**: 버려진 오차를 별도 변수에 저장해 다음 덧셈에 되돌려 준다.
- **쌍별 합산(pairwise summation)**: 트리 형태로 더해 오차를 O(log n)으로 줄인다(NumPy `sum`).
- 딥러닝에서 FP16/BF16 행렬곱을 해도 **누산기(accumulator)는 FP32**로 두는 이유와 같다.

### 6. FMA (Fused Multiply-Add)

`a × b + c`를 **반올림 한 번**으로 계산한다(곱셈 후 중간 반올림 없음). 2008판에서 표준 연산이 됐다.
- 정확도↑: 중간 반올림 오차가 사라진다. 내적, 다항식 평가(Horner), 오차 없는 변환(`a×b`의 정확한 오차 = `fma(a, b, −a×b)`)에 핵심.
- 속도↑: 한 명령어. GPU Tensor Core 연산의 기본 단위.
- 주의: 같은 코드라도 FMA 사용 여부에 따라 결과가 달라질 수 있다(플랫폼 간 재현성 문제).

### 7. 예외 (Exceptions)

표준은 5가지 예외를 정의하고, 기본 동작은 플래그만 세우고 계속 진행하는 것이다(트랩은 선택).

| 예외 | 예 | 기본 결과 |
|---|---|---|
| Invalid operation | `0/0`, `sqrt(−1)` | NaN |
| Division by zero | `1/0` | ±∞ |
| Overflow | 최대값 초과 | ±∞ |
| Underflow | 최소 정규 수 미만 | 비정규 수 또는 0 |
| Inexact | `1/3` | 반올림된 값 (거의 모든 연산에서 발생) |

### 8. 표준의 역사

| 판 | 주요 내용 |
|---|---|
| IEEE 754-1985 | William Kahan 주도. binary32/64, 비정규 수, NaN/∞, 반올림 모드 정립 |
| IEEE 754-2008 | FMA 표준화, binary16·binary128, 10진 부동소수점(decimal32/64/128), roundTiesToAway 추가 |
| IEEE 754-2019 | 소규모 개정. NaN을 전파하는 `minimum`/`maximum` 연산 추가(기존 `minNum`/`maxNum` 대체 권고), augmented 연산(합/곱의 정확한 오차 반환) 등 |

### 9. 표준 밖의 딥러닝용 포맷

딥러닝은 정밀도보다 범위·메모리·대역폭이 중요해서 IEEE 754에 없는 포맷이 널리 쓰인다.

| 포맷 | S/E/M | 비고 |
|---|---|---|
| BF16 (bfloat16) | 1/8/7 | Google 고안. FP32와 지수가 같아 변환이 단순(상위 16비트 절단) |
| TF32 | 1/8/10 | NVIDIA Tensor Core 내부 연산용 (저장 포맷 아님) |
| FP8 E4M3 / E5M2 | 1/4/3, 1/5/2 | OCP 사양. E4M3는 ∞가 없고 NaN 하나만 둬서 범위를 확보 |
| FP4 E2M1 | 1/2/1 | 블록 스케일(MXFP4, NVFP4)과 함께 사용 |

IEEE에서도 머신러닝용 저비트 산술 포맷을 다루는 P3109 작업 그룹이 표준화를 진행 중이다.

이 포맷들로 모델 가중치를 줄이는 **양자화**와 그 정보 손실을 보완하는 방법은 [LLM 양자화와 정보 손실 보완법](../ai-llm-basics/llm-quantization-error-compensation.md)에서 다룬다.

## 참고 자료

- [IEEE Std 754-2019 (원문 PDF)](https://www-users.cse.umn.edu/~vinals/tspot_files/phys4041/2020/IEEE%20Standard%20754-2019.pdf)
- [IEEE 754-2019 revision (Wikiwand)](https://www.wikiwand.com/en/articles/IEEE_754-2019_revision)
- [IEEE 754 (Wikipedia 미러)](https://encycloreader.org/r/wikipedia.php?q=IEEE_754)
- [Floating-point arithmetic 강의 자료 (P. Zimmermann, LORIA)](https://members.loria.fr/PZimmermann/talks/module1.pdf)
- [ISO/IEC 60559 (IEEE 754와 동일 국제 표준) 미리보기](https://www.vde-verlag.de/iec-normen/preview-pdf/info_isoiec60559{ed2.0}en.pdf)
