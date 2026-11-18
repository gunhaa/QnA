# "어려운 문제 여러 개 풀게 하고 맞춘 개수로 채점" — 이게 현재 AI 평가 방식 맞나?

## 쉬운 설명

절반은 맞아요. 코딩·수학처럼 "정답이 명확한" 시험은 진짜로 어려운 문제 500개 중 몇 개를 풀었는지 세서 점수를 매겨요(예: SWE-bench). 근데 글쓰기나 대화처럼 "정답이 하나가 아닌" 시험은 개수를 세는 게 아니라 또 다른 AI 선생님(또는 사람)이 답안을 읽고 "얼마나 잘 썼는지" 채점해요. 그러니까 "문제 풀이 개수 세기"와 "품질 채점하기", 두 가지 방식이 같이 쓰이는 거예요.

## 일반 설명

질문하신 요약은 **정답이 명확히 검증 가능한(verifiable) 태스크형 벤치마크**에는 정확히 들어맞지만, 그게 현재 평가 방식의 전부는 아닙니다. 크게 두 갈래로 나눠서 봐야 합니다.

### 1. "어려운 태스크 세트 + 통과 개수" 방식 — 맞는 설명

이건 **정답을 자동/규칙으로 채점할 수 있는(rule-based, verifiable)** 벤치마크에서 실제로 쓰이는 방식입니다.

- **SWE-bench**: GitHub의 실제 이슈를 모델이 패치(코드 수정)로 해결하게 하고, 그 저장소의 테스트 스위트를 돌려서 **전부 통과하는지**를 봄. 지표는 `% Resolved` — 전체 문제 중 몇 개를 해결했는지의 비율. `SWE-bench Verified`는 사람이 "풀 수 있고 모호하지 않다"고 검증한 500개 문제로 curated된 하위 집합.
- **GAIA**: 웹 탐색·도구 사용·추론이 필요한 실세계형 질문 모음. 역시 정답 일치 여부로 채점.
- **HLE(Humanity's Last Exam)**: 인간 전문가도 어려운 초고난도 문제 모음. 최상위 모델도 ~35%대 정답률에 그침(전문가는 ~90%).
- 채점 지표는 보통 **성공률(success rate) / resolve rate**, 여러 번 시도를 허용하면 **pass@k**(k번 시도 중 한 번이라도 맞히면 성공으로 침) 방식을 씀.

이런 벤치마크가 "일부러 어려운 문제"를 계속 만드는 이유는 지난 대화에서 다룬 **포화(saturation)** 문제 때문입니다 — 쉬운 문제 세트는 모델들이 다 맞혀버려서(예: MMLU, HumanEval은 이미 포화) 변별력을 잃으니, 계속 더 어려운 문제로 갱신해야 순위가 의미 있게 나옵니다.

### 2. "품질을 채점" 방식 — 개수 세기가 아닌 별도 축

반면 **정답이 하나로 정해지지 않는 태스크**(에세이, 요약, 대화, 코드 리뷰의 스타일/설명력 등)는 "맞았다/틀렸다"를 셀 수가 없습니다. 여기서는:

- **LLM-as-a-judge**: 별도의 AI가 답변을 읽고 점수(1~10점 등)나 우열을 매김 (예: MT-Bench). 이건 "통과 개수"가 아니라 **품질 스코어의 평균**임.
- **사람 페어와이즈 비교**: Chatbot Arena처럼 두 모델 답변 중 사람이 더 나은 쪽을 고르는 방식. 역시 "개수 세기"가 아니라 **상대적 선호 비율(win rate)**로 집계.

이 갈래에서는 규칙 기반 채점(rule-based)은 성공률을 **과소평가**하고, LLM 판정자는 반대로 **과대평가**하는 경향이 있다는 점도 알려져 있어 — 지난 답변에서 다룬 장문 편향·자기 선호 편향과 이어지는 문제입니다.

### 3. 정리

| 태스크 유형 | 채점 방식 | 예시 |
|---|---|---|
| 정답이 명확 (코드가 테스트를 통과하나, 수학 답이 맞나) | 어려운 문제 세트 → 통과/정답 개수·비율(pass@k, resolve rate) | SWE-bench, GAIA, HLE, MMLU |
| 정답이 불명확 (글쓰기, 대화, 설명 품질) | 개수가 아니라 채점자(AI 또는 사람)의 품질 점수·선호 비율 | MT-Bench, Chatbot Arena, 각종 LLM-judge 벤치마크 |

즉 "어려운 태스크를 만들어서 수행 개수로 벤치마크"하는 건 **검증 가능한(verifiable) 태스크형 평가의 정확한 요약**이고, 이건 현재 에이전틱 AI·코딩 모델 평가에서 특히 주류입니다. 다만 오픈엔디드 태스크에는 "개수"가 아니라 "채점자의 판단"이 개입하는 별도 방식이 병행되고 있고, 그 채점자 판단에는 지난번 다룬 인간/LLM 판정자의 일관성 문제가 그대로 따라옵니다.

---

### 출처
- [Agentic AI Benchmarks Guide: What They Are, How They Work, and Why They Aren't Enough (Kili Technology)](https://kili-technology.com/blog/agentic-ai-benchmarks-guide-what-they-are-how-they-work)
- [AI Agent Benchmarking Infrastructure: Run SWE-bench, GAIA, Terminal-Bench, OSWorld (Spheron)](https://www.spheron.network/blog/ai-agent-benchmarking-gpu-cloud-swebench-gaia/)
- [From Question Answering to Task Completion: A Survey on Agent System and Harness Design (arXiv)](https://arxiv.org/pdf/2606.20683)
- [PACE: A Proxy for Agentic Capability Evaluation (arXiv)](https://arxiv.org/pdf/2607.02032)
- [30 LLM evaluation benchmarks and how they work (Evidently AI)](https://www.evidentlyai.com/llm-guide/llm-benchmarks)
- [LLM Evaluation Metrics: The Ultimate LLM Evaluation Guide (Confident AI)](https://www.confident-ai.com/blog/llm-evaluation-metrics-everything-you-need-for-llm-evaluation)
- [AgentRewardBench: Evaluating Automatic Evaluations of Web Agent Trajectories (arXiv)](https://arxiv.org/pdf/2504.08942)
