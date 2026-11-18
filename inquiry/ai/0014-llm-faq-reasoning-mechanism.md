# LLM의 "추론(reasoning)"은 어떤 동작인가? — 추가 쿼리인가, 새 레이어인가?

관련 글: [Agent의 tool call도 추론이라 부르는 이유](faq-agentic-reasoning-tool-call.md) · [Chain-of-Thought도 강화학습으로 학습되나](faq-cot-reinforcement-learning.md)

## 결론부터

**둘 다 아닙니다.** LLM의 추론(reasoning, 예: OpenAI의 "reasoning token", Claude의 "extended thinking")은
- ❌ 다른 서버/API에 **추가로 쿼리를 보내는 것**도 아니고
- ❌ 신경망에 **새로운 레이어(layer)를 붙이는 것**도 아니고
- ✅ **똑같은 모델이, 최종 답을 내놓기 전에 "혼잣말 토큰"을 스스로 더 많이 생성**하는 것입니다.

## 5살 아이에게 설명하면

시험 문제를 풀 때를 생각해보세요.
- **추론이 없는 답변** = 문제를 보자마자 바로 정답만 적는 것. ("3번!")
- **추론이 있는 답변** = 시험지 여백에 "음... 이건 이 공식을 쓰고, 여기서 이 숫자를 빼면..." 하고 **낙서(scratchpad)**를 먼저 쓴 다음, 그걸 보면서 정답을 적는 것.

여기서 중요한 건, 낙서를 하는 것도 **같은 나(뇌, 모델)**가 하는 거지, 짝꿍한테 물어보러 가는 게 아니고(추가 쿼리 X), 갑자기 머리가 하나 더 생기는 것도 아니라는(새 레이어 X) 점이에요. 그냥 **생각하는 시간(=토큰 수)을 늘린 것**뿐이에요.

## 조금 더 기술적으로

### 1. 아키텍처(신경망 구조) 관점: 레이어는 그대로다
- Transformer 디코더 구조(어텐션, FFN 등)는 **추론 모델이든 아니든 동일**합니다. OpenAI o1도 "레이어를 추가"해서 똑똑해진 게 아니라, **테스트 타임 컴퓨트(test-time compute)**, 즉 답을 내기 전에 처리하는 토큰 수를 늘려서 성능을 올렸습니다.
- o1-preview는 평균 약 5,300개의 "히든 추론 토큰(hidden reasoning token)"을 생성한 반면, 일반 GPT-4o는 약 540개 정도만 생성했다는 비교 데이터가 있습니다. 차이는 구조가 아니라 **생성하는 토큰의 양**입니다.

### 2. 동작 방식: 자기회귀(autoregressive) 생성의 연장
LLM은 원래 토큰을 하나씩 예측하면서, **직전까지 생성한 토큰들을 다시 입력에 포함시켜** 다음 토큰을 예측합니다(self-attention). 추론 모델은 이 과정에서
1. 먼저 "생각 토큰(reasoning/thinking token)"들을 쭉 생성하고,
2. 그 생각 토큰들을 **자기 자신의 컨텍스트(context)에 다시 넣은 채로** 최종 답변 토큰을 생성합니다.

즉, "추론"은 별도 시스템 호출이 아니라 **같은 모델·같은 forward pass 메커니즘을, 답하기 전 단계에서 한 번 더(여러 번) 돌리는 것** — 흔히 "test-time compute를 더 쓴다"고 표현합니다.

### 3. "추가 쿼리"와 헷갈리기 쉬운 이유
API를 사용할 때 "reasoning effort"나 "thinking budget" 같은 파라미터를 설정하면 응답 시간이 늘고 토큰 사용량(및 과금)이 늘어나기 때문에, 마치 "내부적으로 여러 번 API를 호출하는 것 아닌가?" 하고 느끼기 쉽습니다. 하지만 이건 **하나의 생성(generation) 세션 안에서 토큰 수가 늘어난 것**이지, 별도의 API 요청이 여러 번 나가는 게 아닙니다.

이것과는 구분해야 할 개념이 있습니다:
- **에이전트(agent)/툴 사용(tool use)/멀티에이전트 패턴**: 이건 진짜로 **추가 쿼리**를 날리는 경우입니다. 모델이 검색 툴을 호출하고, 그 결과를 받아 다시 모델에 넣고, 다시 호출하는 식으로 **실제 여러 번의 API 왕복**이 발생합니다. reasoning과는 별개의 메커니즘입니다.
- **학습(training) 단계의 강화학습(RL)**: o1, R1 계열 모델은 "좋은 추론 과정을 생성했을 때 보상을 주는" 강화학습으로 **학습**되어서, 추론 토큰을 더 잘/길게 생성하도록 훈련된 것입니다. 이건 모델을 만들 때(훈련 시점) 일어나는 일이고, 우리가 질문할 때(추론/inference 시점)는 그냥 학습된 대로 토큰을 더 많이 생성하는 것뿐입니다.

## 요약

| 오해 | 실제 |
|---|---|
| 추론 = 다른 서버에 추가 쿼리 | ❌ 아님. 하나의 생성 세션 안에서 일어남 |
| 추론 = 신경망에 새 레이어 추가 | ❌ 아님. Transformer 구조는 동일 |
| 추론 = 답 내기 전 더 많은 토큰(생각 과정)을 생성 | ✅ 맞음 (test-time compute 증가) |
| 에이전트의 툴 호출 = 추론과 동일한 것 | ❌ 별개 개념. 툴 호출은 실제 추가 API 왕복이 발생함 |

---

### Sources
- [Under the Hood of OpenAI o1: Architectural Innovations in Reasoning-Based AI (Medium)](https://medium.com/@codenze/under-the-hood-of-openai-o1-architectural-innovations-in-reasoning-based-ai-97c90ace525f)
- [LLM Reasoning 2026: o3, GPT-5, Claude Thinking, R1 (FutureAGI)](https://futureagi.com/blog/llm-reasoning-2025/)
- [Chain-of-Thought Mechanism in LLMs (Emergent Mind)](https://www.emergentmind.com/topics/chain-of-thought-mechanism)
- [Not All LLM Reasoning is Visible in the Chain-of-Thought (arXiv)](https://arxiv.org/html/2607.22925v1)
