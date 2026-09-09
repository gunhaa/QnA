# Chain-of-Thought(CoT)도 강화학습으로 학습되는 거야?

관련 글: [LLM의 추론은 추가 쿼리인가 새 레이어인가](faq-reasoning-mechanism.md) · [Agent의 tool call도 추론이라 부르는 이유](faq-agentic-reasoning-tool-call.md)

## 결론부터

**"Chain-of-Thought"라는 말이 가리키는 게 둘 중 뭐냐에 따라 답이 다릅니다.**

1. **원조 CoT (2022년, "Let's think step by step" 프롬프팅 기법)** → ❌ 강화학습 필요 없음. 그냥 **프롬프트에 예시나 문구를 넣는 것**뿐이라, 이미 학습이 끝난 모델에 즉석에서 적용하는 기법입니다.
2. **요즘 "추론 모델(reasoning model)"이 내놓는 CoT (o1, DeepSeek-R1, Claude extended thinking 등)** → ✅ 맞습니다. 이 모델들은 **강화학습(RL)으로 "스스로 길게 생각하는 습관"을 모델 안에 새겨 넣은 것**입니다.

즉, "CoT"는 원래 **프롬프트 트릭**이었는데, 요즘은 그 습관 자체를 **모델 학습 단계에 넣어버린** 버전이 따로 있는 것입니다.

## 5살 아이에게 설명하면

- **프롬프팅으로서의 CoT** = 선생님이 "천천히, 하나씩 순서대로 생각해서 풀어봐!"라고 **매번 말해줘야** 아이가 천천히 푸는 것. 아이(모델) 자체는 안 바뀌었고, 그냥 **그때그때 알려준 것**뿐이에요.
- **RL로 학습된 추론 모델** = 아이가 문제를 풀 때마다 "천천히 풀면 칭찬(보상)받는다"는 걸 **오랫동안 훈련받아서**, 이제는 누가 시키지 않아도 **스스로 알아서** 천천히, 꼼꼼하게 생각하는 버릇이 몸에 밴 것. 아이 자체(모델의 가중치)가 바뀐 거예요.

## 조금 더 기술적으로

### 원조 CoT: 프롬프트 엔지니어링(prompt engineering)
2022년 Wei et al. 논문에서 제안된 CoT는, 모델을 재학습시키지 않고 **입력(프롬프트)에 "단계별로 생각한 예시"를 몇 개 넣어주거나**("few-shot"), 그냥 "단계별로 생각해봐(Let's think step by step)"라는 한 문장만 추가해도("zero-shot") 충분히 큰 모델에서 정답률이 올라간다는 **관찰**이었습니다. **모델 가중치는 전혀 바뀌지 않습니다.** 프롬프트만 바뀝니다.

### 요즘 추론 모델: RL로 "내재화(internalize)"
OpenAI o1, DeepSeek-R1 같은 모델들은 다릅니다. 이 모델들은
- 문제를 풀게 시키고,
- **최종 답이 맞았는지** + (경우에 따라) **추론 과정 자체의 품질**을 보상(reward)으로 주고,
- 이 보상을 최대화하도록 **모델 가중치 자체를 강화학습으로 업데이트**합니다.

DeepSeek-R1은 특히 사람이 미리 만든 "정답 추론 예시" 없이, **순수 RL(GRPO 알고리즘)만으로** 모델이 스스로 "먼저 검산해보기", "여러 방법 시도해보기" 같은 긴 추론 행동을 **자발적으로 습득**했다고 보고했습니다. 이런 걸 "emergent"(스스로 나타난) 행동이라 부릅니다.

그 결과, 이런 추론 모델은 프롬프트에 "단계별로 생각해봐"라고 안 써줘도, **기본적으로 항상 길게 생각한 뒤 답합니다.** CoT 하는 습관이 프롬프트가 아니라 **모델 자체에 학습되어 들어간 것**이기 때문입니다.

## 비교 정리

| 구분 | 원조 CoT (프롬프팅) | RL 기반 추론 모델의 CoT |
|---|---|---|
| 무엇이 바뀌나 | 입력(prompt)만 바뀜 | 모델 가중치(weights) 자체가 바뀜 |
| 학습 필요 여부 | 불필요 (기존 모델에 즉시 적용) | 필요 (RL 후처리/post-training 단계) |
| "천천히 생각해"를 매번 알려줘야 하나 | 예 (안 써주면 안 함) | 아니오 (기본 동작으로 내재화됨) |
| 대표 예 | GPT-3에 "step by step" 프롬프트 넣기 | OpenAI o1, DeepSeek-R1, Claude extended thinking |
| 관련 알고리즘 | 없음 (순수 프롬프트 설계) | RLHF, GRPO 등 강화학습 기법 |

## 정리

- "CoT가 강화학습으로 학습되냐"는 질문에는 **"어떤 CoT를 말하느냐에 달렸다"**가 정확한 답입니다.
- 프롬프트에 "단계별로 생각해봐"라고 써주는 고전적 CoT는 학습이 필요 없는 **순수 프롬프팅 기법**입니다.
- 반면 요즘 "reasoning model"이라 불리는 o1·R1 계열은, 그 CoT 습관을 **강화학습으로 모델 가중치에 내재화**시킨 것이라 프롬프트 없이도 알아서 길게 생각합니다.

---

### Sources
- [DeepSeek-R1 incentivizes reasoning in LLMs through reinforcement learning (Nature)](https://www.nature.com/articles/s41586-025-09422-z)
- [Reinforcement Learning Meets Chain-of-Thought (Unite.AI)](https://www.unite.ai/reinforcement-learning-meets-chain-of-thought-transforming-llms-into-autonomous-reasoning-agents/)
- [What is Chain of Thought (CoT) Prompting? (NVIDIA Glossary)](https://www.nvidia.com/en-us/glossary/cot-prompting/)
- [Chain of Thought (CoT): Prompting and LLM Reasoning Explained (AltexSoft)](https://www.altexsoft.com/blog/chain-of-thought-prompting/)
- [deepseek-ai/DeepSeek-R1 (Hugging Face)](https://huggingface.co/deepseek-ai/DeepSeek-R1)
