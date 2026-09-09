# Agent가 tool call을 여러 번 하는 것도 왜 "추론(reasoning)"이라고 부를까?

관련 글: [LLM의 추론은 추가 쿼리인가 새 레이어인가](faq-reasoning-mechanism.md) · [Chain-of-Thought도 강화학습으로 학습되나](faq-cot-reinforcement-learning.md)

## 결론부터

앞선 글(faq-reasoning-mechanism.md)에서 "추론 = 답 내기 전 생각 토큰을 더 생성하는 것, 툴 호출처럼 진짜 추가 쿼리를 날리는 것과는 다르다"고 설명했습니다. 그런데 tool call을 여러 번 반복하는 에이전트 동작도 업계에서는 "추론(agentic reasoning)"이라고 부릅니다. 모순처럼 보이지만, 이유는 **"툴을 여러 번 부르는 행위 자체"가 추론이 아니라, 그 사이사이 "다음에 뭘 할지 생각하는 과정"이 추론이고, 그 생각+행동을 반복하는 전체 사이클을 통틀어 넓은 의미의 "추론"이라고 부르기 때문**입니다.

## 5살 아이에게 설명하면

미로 찾기를 한다고 생각해보세요.
- **한 번에 답하기(추론 없음)**: 미로를 흘끗 보고 "왼쪽!" 하고 바로 찍는 것.
- **혼잣말 추론(chain-of-thought)**: 미로를 보면서 "음... 여기서 왼쪽으로 가면 막힐 것 같고, 오른쪽이 나을 것 같아" 하고 **머릿속으로만** 생각한 다음 "오른쪽!" 하고 답하는 것.
- **에이전트 추론(agentic reasoning)**: 실제로 **오른쪽으로 한 발 걸어보고(tool call = 행동)**, "어? 막혔네" 하고 **눈으로 확인한 다음(observation = 관찰)**, "그럼 이번엔 왼쪽으로 가보자" 하고 **다시 생각(reasoning)**해서 또 한 발 내딛는 것. 이걸 미로를 빠져나갈 때까지 반복해요.

세 번째 경우, "걸음을 옮기는 것(tool call)" 자체는 추론이 아니에요. 하지만 **매 걸음 사이사이 "생각 → 행동 → 관찰 → 다시 생각"을 반복하는 전체 과정**을 사람들은 "이 아이가 추론하면서 미로를 풀고 있다"고 부릅니다.

## 기술적으로: ReAct 패턴

이 용어의 뿌리는 2022년 논문 **ReAct (Reasoning + Acting)**입니다. 이름 그대로 "추론"과 "행동"을 합친 조어입니다.

ReAct 루프는 아래 사이클을 반복합니다.

```
Thought(생각) → Action(도구 호출) → Observation(결과 관찰) → 다시 Thought(생각) → ...
```

핵심은, **Thought 단계에서 모델이 여전히 (앞 글에서 설명한) "생각 토큰"을 생성**한다는 점입니다. 즉:

- Tool call **자체**는 API/함수 실행이지 추론이 아닙니다.
- 하지만 tool call **직전에 "무슨 도구를, 왜, 어떤 인자로 부를지" 결정하는 단계**는 여전히 모델이 토큰을 생성하며 생각하는 진짜 추론입니다.
- 게다가 tool 결과(observation)를 받은 뒤 "이 결과로 봤을 때 다음엔 뭘 해야 하나"를 다시 판단하는 것도 추론입니다.

그래서 "에이전트가 추론한다"는 말은, **한 번의 생각(single-shot CoT)이 아니라, 도구 호출 결과를 계속 반영하며 여러 차례 생각을 갱신하는 과정 전체**를 가리키는 더 넓은 의미로 쓰이는 것입니다.

## Chain-of-Thought 추론 vs 에이전트 추론 비교

| 구분 | Chain-of-Thought (단일 호출 내 추론) | Agentic Reasoning (에이전트 루프) |
|---|---|---|
| 정보 소스 | 모델이 이미 알고 있는 것(파라미터 내 지식)만 사용 | 실제 도구 호출로 **외부의 새 정보**를 얻어가며 생각 |
| 진행 방식 | 한 번의 생성(single-shot)으로 끝 | 생각 → 행동 → 관찰을 여러 턴에 걸쳐 반복 |
| "틀렸다"를 아는 시점 | 모름 (검증 수단이 없음) | 도구 결과(observation)를 보고 그 자리에서 계획을 수정 가능 |
| 실제 쿼리/API 호출 | 없음 (모델 내부에서만 일어남) | 있음 (도구·API마다 실제 왕복 발생) |

## 정리

- Tool call 자체가 "추론"으로 불리는 게 아니라, **tool call들 사이사이 모델이 계속 생각(생각 토큰 생성)하고, 그 결과를 바탕으로 계획을 수정하는 전체 반복 루프**가 "추론"이라 불리는 것입니다.
- 이름의 유래도 명확합니다: **ReAct = Reasoning(추론) + Acting(행동)**. 처음부터 "추론과 행동을 한 사이클 안에 엮는다"는 뜻으로 지어진 용어입니다.
- 그래서 앞 글에서 구분했던 "순수 사고 추론"과 이번 글의 "에이전트 추론"은 상충하는 게 아니라, **후자가 전자를 포함하면서 외부 행동·관찰까지 반복하는 더 넓은 개념**이라고 이해하면 됩니다.

---

### Sources
- [What Is the ReAct Loop? How AI Agents Reason, Act, and Iterate (MindStudio)](https://www.mindstudio.ai/blog/what-is-react-loop-ai-agent-reasoning)
- [ReAct Agent Loop: How Reason-and-Act Agents Actually Work (FutureAGI)](https://futureagi.com/blog/loop-engineering/react-agent-loop/)
- [What Is Agentic Reasoning? (IBM)](https://www.ibm.com/think/topics/agentic-reasoning)
- [Agentic Reasoning: How AI Agents Plan, Act, and Adapt in 2026 (Lyzr)](https://www.lyzr.ai/blog/agentic-reasoning/)
- [Agent Reasoning vs. LLM Reasoning (Medium)](https://medium.com/@doubletaken/agent-reasoning-vs-llm-reasoning-key-differences-real-world-applications-and-cost-analysis-fdac6afe13cb)
