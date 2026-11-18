# 컴퓨터 스터디 진행 시나리오

예시 주제로 **"부동소수점 → LLM 양자화"** 를 쓴다. 관련 문서: [부동소수점 (IEEE 754)](../cs-fundamentals/ieee754-floating-point.md), [LLM 양자화와 정보 손실 보완법](../ai-llm-basics/llm-quantization-error-compensation.md).

## 1. 흔한 스터디 유형

| 유형 | 방식 | 맞는 주제 |
|---|---|---|
| 윤독(북클럽) | 책 한 권을 정해 매주 1~2챕터씩 읽고 발표·토론 | CS 교재, 『데이터 중심 애플리케이션 설계』 같은 깊은 책 |
| 주제 발표형 | 매주 돌아가며 각자 고른 주제를 10~30분 발표 | 범위가 넓은 CS 지식(면접 대비 등) |
| 실습/구현형 | 같은 과제를 각자 구현하고 코드 리뷰 | 알고리즘, 미니 프로젝트, 논문 재현 |
| 모각코 + 공유 | 각자 공부하고 블로그 정리 후 주 1회 질의응답 | 개인마다 목표가 다를 때 |

실제로는 **"개인 학습 → 발표 → 토론/실습 → 회고"** 를 섞는 경우가 가장 많다.

## 2. 시나리오: 4주 사이클 스터디

### 2.1 세팅 (0주차, 킥오프)

- **인원**: 5명 (8~12명을 넘으면 토론이 안 되니 분반)
- **주기**: 주 1회 90분, 화요일 저녁 온라인 (Zoom/Discord + 공유 Notion)
- **역할** (매주 로테이션)
  - 진행자: 시간 관리, 질문 유도
  - 발표자 1~2명: 그 주 범위 발표
  - 서기: 질문·결론을 정리해 저장소에 커밋
- **산출물**: GitHub 저장소 하나. 주차별 폴더에 발표 자료, 실습 코드, 회의록
- **규칙**: 결석 2회 → 경고, 과제 미제출 시 다음 주 발표 담당. 규칙은 첫날 합의하고 엄격히 적용한다(느슨하면 3주차에 반토막 나는 게 흔한 패턴).

### 2.2 커리큘럼

| 주차 | 주제 | 실습 과제 |
|---|---|---|
| 1 | IEEE 754 구조: 부호/지수/가수, bias, 특수 값 | float 비트를 직접 찍어 보는 함수 작성 |
| 2 | 반올림·ULP·오차: 0.1+0.2, 결합법칙, Kahan 합산 | 1천만 개 합산을 naive/Kahan/pairwise로 비교 |
| 3 | 딥러닝 포맷과 양자화 기초: BF16, FP8, scale/zero-point, 아웃라이어 | NumPy로 INT8 양자화, per-tensor vs per-group 오차 비교 |
| 4 | 손실 보완: SmoothQuant, GPTQ, AWQ, QAT + **회고** | 실제 모델을 AWQ/GGUF로 양자화해 perplexity 측정 |

### 2.3 한 세션 타임라인 (3주차 예시, 90분)

| 시간 | 내용 |
|---|---|
| 00:00–00:05 | 체크인: 근황 한 줄, 지난주 액션 아이템 확인 |
| 00:05–00:30 | 발표 A: "부동소수점 → 딥러닝 포맷" (BF16이 FP16보다 학습에 유리한 이유) |
| 00:30–00:50 | 발표 B: "양자화 공식과 오차 두 종류" (반올림 vs 클리핑) |
| 00:50–01:15 | 실습 결과 공유: 각자 화면 공유 3~4분씩 |
| 01:15–01:25 | 자유 토론: 미리 모은 질문 처리 |
| 01:25–01:30 | 정리: 다음 주 발표자·과제 확정, 서기가 회의록 커밋 |

### 2.4 실제 진행 장면 (3주차 일부)

> **진행자**: 발표 B 끝났습니다. 질문 있으신 분?
>
> **멤버 C**: 클리핑 범위를 좁히면 반올림 오차가 줄어든다고 했는데, 그럼 최적점은 어떻게 찾아요?
>
> **발표자 B**: 보정 데이터로 MSE나 KL divergence를 최소화하는 지점을 찾아요. 99.99 퍼센타일로 자르는 단순한 방법도 있고요.
>
> **멤버 D**: 그럼 아웃라이어를 잘라 버리면 그 값의 정보는 아예 없어지는 거 아닌가요? LLM은 아웃라이어 채널이 중요하다고 들었는데.
>
> **진행자**: 좋은 질문인데 4주차 범위(SmoothQuant, LLM.int8)랑 겹치네요. **"아웃라이어를 자르지 않고 살리는 방법"** 을 질문 보드에 올려 두고 다음 주 발표자가 답하는 걸로 하죠.
>
> **서기**: 질문 보드에 등록했습니다.

포인트: 답을 모르는 질문을 그 자리에서 억지로 끝내지 않고 **다음 주 발표 범위로 넘기는 것**이 흐름을 지키는 요령이다.

### 2.5 실습 과제 예시

**1주차: float 비트 분해**

```python
import struct

def bits(x: float):
    b = struct.unpack('>I', struct.pack('>f', x))[0]
    s = f'{b:032b}'
    return s[0], s[1:9], s[9:]   # sign, exponent, mantissa

print(bits(0.15625))  # ('0', '01111100', '01000000000000000000000')
print(bits(0.1))      # 가수 부분이 0011 0011... 반복 → 정확히 표현 불가
```

**3주차: 아웃라이어가 양자화 오차를 키우는지 확인**

```python
import numpy as np

rng = np.random.default_rng(0)
w = rng.normal(0, 0.02, 4096).astype(np.float32)
w[0] = 1.0  # 아웃라이어 하나

def q_int8(x):
    s = np.abs(x).max() / 127
    return np.clip(np.round(x / s), -127, 127) * s

def q_group(x, g=128):
    return np.concatenate([q_int8(c) for c in x.reshape(-1, g)])

print('per-tensor MSE:', np.mean((w - q_int8(w)) ** 2))
print('per-group  MSE:', np.mean((w - q_group(w)) ** 2))  # 훨씬 작다
```

토론 거리: "아웃라이어를 지우고 다시 돌리면 per-tensor 오차는 얼마나 줄어드나?", "INT4로 바꾸면?"

### 2.6 회의록 템플릿 (서기 작성)

```markdown
# 3주차 회의록 (2026-11-24)
- 참석: A, B, C, D, E
- 발표: A(딥러닝 포맷), B(양자화 공식)
- 결론
  - BF16은 지수 8비트라 FP32와 범위가 같아 loss scaling이 필요 없다
  - per-group 양자화는 아웃라이어 영향을 그룹 안에 가둔다
- 미해결 질문 → 4주차
  - 아웃라이어를 자르지 않고 살리는 방법 (담당: D)
- 액션 아이템
  - [ ] 4주차 발표: C(SmoothQuant/AWQ), D(GPTQ/QAT)
  - [ ] 실습: Qwen 소형 모델 AWQ 양자화 후 perplexity 비교
```

### 2.7 회고 (4주차 마지막 20분, KPT)

| Keep | Problem | Try |
|---|---|---|
| 실습 코드로 직접 확인하니 이해가 빠름 | 4주차 범위가 너무 넓어 발표가 30분 넘김 | 다음 사이클은 6주로 늘려 손실 보완 기법을 2주로 쪼갬 |
| 질문 보드로 질문을 미루는 방식이 좋았음 | 2명이 과제를 당일에 시작 | 과제 마감을 세션 전날 23시로, PR로 제출 |

회고 끝에 **다음 사이클 주제를 투표로 정한다** (예: "KV 캐시와 PagedAttention", "CPU 캐시와 메모리 계층").

## 3. 운영 팁

- **범위는 작게, 주기는 고정**: 매주 같은 요일·시간. 일정이 흔들리면 스터디가 멈춘다.
- **진행자는 2명**: 한 명이 빠져도 진행되도록(GitLab 핸드북 권장).
- **발표보다 질문이 핵심**: 발표자가 책 내용을 요약만 하면 지루해진다. "왜 이렇게 설계했나", "안 그러면 무슨 일이 생기나"를 발표에 꼭 넣게 한다.
- **기술 주제는 반드시 실습 포함**: 읽기만 하면 2주 뒤 남는 게 없다.
- **산출물을 쌓는다**: 회의록·코드를 저장소에 커밋하면 다음 기수 자료와 포트폴리오가 된다.
- **흔한 실패 패턴**: 범위 과욕(교재 한 권을 4주에) → 과제 밀림 → 결석 → 자연 소멸. 첫 사이클은 4주 정도로 짧게 끝내고 회고 후 연장 여부를 정하는 게 안전하다.

## 참고 자료

- [Running an Effective Book Club at Work (ntietz)](https://ntietz.com/blog/running-software-book-reading-group/)
- [7 Secrets for Scaling a Technical Book Club (Flatiron Labs)](https://medium.com/flatiron-labs/7-secrets-for-scaling-a-technical-book-club-6f15d06db063)
- [GitLab Handbook: Book clubs](https://handbook.gitlab.com/handbook/leadership/book-clubs)
- [How I run book clubs (Phil Eaton)](https://notes.eatonphil.com/2024-05-30-how-i-run-book-clubs.html)
- [How I run a software book club (engineered.at)](https://engineered.at/articles/how-i-run-a-software-book-club)
- [Team Building With Technical Book Clubs (Capital One)](https://www.capitalone.com/tech/culture/team-building-with-technical-book-clubs/)
- [Monthly-CS 회고 (velog)](https://velog.io/@unchaptered_til/Monthly-CS-회고)
- [온라인 모각코 스터디 모집 (인프런)](https://www.inflearn.com/studies/1587009/%EC%98%A8%EB%9D%BC%EC%9D%B8-%EB%AA%A8%EA%B0%81%EC%BD%94-%EC%8A%A4%ED%84%B0%EB%94%94%EC%9B%90-%EB%AA%A8%EC%A7%91%ED%95%A9%EB%8B%88%EB%8B%A4)
- [온라인 저녁반 프로그래밍 학습 스터디 (인프런)](https://www.inflearn.com/studies/1784105/온라인-저녁반-18-00-22-00-프로그래밍-학습-스터디)
