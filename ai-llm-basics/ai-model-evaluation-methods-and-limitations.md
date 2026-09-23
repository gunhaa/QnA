# AI 모델 평가 방법: 현재 가장 많이 쓰는 방식과 한계

## 쉬운 설명

AI를 평가하는 건 학생 시험 채점이랑 비슷해요. 예전엔 "객관식 문제집(벤치마크)"으로 점수를 매겼는데, 요즘 똑똑한 AI들은 그 문제집을 거의 다 맞혀버려서(포화) 변별력이 없어졌어요. 그래서 요즘은 "선생님 역할을 또 다른 AI에게 맡기는" 방법(LLM-as-judge)을 많이 쓰는데, 이 선생님 AI도 편견(길게 쓰면 잘 썼다고 착각, 자기랑 비슷한 스타일 편애)이 있어서 완벽하지 않아요. 그래서 결국 사람이 직접 채점에 끼어드는 과정이 아직 필요해요.

## 일반 설명

### 1. 현재 가장 많이 쓰이는 평가 방법

**① 정적 벤치마크 (Static Benchmarks)**
객관식/정답형 문제 세트로 모델을 채점하는 전통적 방식.
- **지식/추론**: MMLU, MMLU-Pro, GPQA-Diamond, HellaSwag, WinoGrande
- **코딩**: HumanEval, SWE-bench(Verified)
- **최신 고난도**: Humanity's Last Exam (HLE) — 인간 전문가도 어려운 초고난도 문제
- 채점이 자동화되어 저렴하고 재현 가능하다는 장점이 있음.

**② LLM-as-a-Judge**
GPT-4급 모델이 다른 모델의 응답을 대신 채점하게 하는 방식. 자유 형식 답변(요약, 대화, 코드 리뷰 등)처럼 정답이 하나로 정해지지 않는 태스크에서 특히 많이 쓰임. RewardBench, JudgeBench 같은 "판정자 자체를 평가하는" 벤치마크도 등장.
- 최근 흐름은 하나의 총점(holistic score)보다 **루브릭(rubric) 기반**으로 세부 기준별 채점을 하는 방향으로 이동 중 (2026년 서베이 기준).

**③ 사람 평가 (Human Evaluation / Preference Data)**
Chatbot Arena처럼 사람이 두 모델의 답변 중 더 나은 것을 직접 고르는 방식. 신뢰도는 높지만 비용이 크고 확장이 어려움.

**④ 참조 기반 자동 지표 (Reference-based Metrics)**
BLEU, ROUGE, BERTScore 등 정답 텍스트와의 유사도를 계산하는 전통적 NLP 지표. 여전히 요약·번역 등 일부 태스크의 보조 지표로 쓰임.

### 2. 각 방법의 한계

**정적 벤치마크의 한계**
- **포화(Saturation)**: MMLU·HumanEval은 2024년, HellaSwag·WinoGrande는 2023년에 이미 포화. GPQA-Diamond도 SOTA 78.4%로 상위권 모델 간 격차가 71~78%에 불과해 18~24개월 내 포화 예상. 최상위권에서는 점수 차이가 통계적으로 무의미해짐.
- **데이터 오염(Contamination)**: 벤치마크 문제(또는 유사 내용)가 학습 데이터에 이미 포함되어 점수가 부풀려지는 문제. SWE-bench Verified조차 일부 문제에서 프론티어 모델들이 정답 패치를 거의 그대로 재현한 사례가 OpenAI 감사에서 확인됨.
- **실제 성능과의 괴리**: 벤치마크 점수와 실제 배포 환경 성능 사이에 큰 갭이 존재. 엔터프라이즈 에이전트 시스템의 경우 벤치마크와 실사용 사이 약 37%p 격차, 비슷한 정확도라도 비용이 최대 50배 차이 나는 사례도 보고됨.

**LLM-as-a-Judge의 한계**
- **포지션 편향(Position Bias)**: 동일한 두 답변의 제시 순서만 바꿔도 GPT-4의 선호도가 10%p 이상 흔들림.
- **장문 편향(Verbosity Bias)**: 내용과 무관하게 답변이 길수록 더 높은 점수를 받는 경향.
- **자기 선호(Self-preference)**: 판정자 모델과 같은 계열(family)의 모델 답변을 더 후하게 평가.
- **장문 출력 평가의 취약성**: 기존 벤치마크는 대부분 짧은 답변 위주라, 문서 단위의 긴 출력물에 대한 판정자 신뢰도는 상대적으로 검증이 덜 됨.
- **프롬프트 민감도**: "이 답변이 좋은가요?" 같은 모호한 지시문은 신뢰할 수 없는 점수를 만듦. 채점 기준(루브릭)을 명확히 설계해야 함.

**사람 평가의 한계**
- **고무도장 효과(Rubber-stamp Effect)**: 사람에게 "이 AI 답변이 말이 되는지" 검증하게 하면, 답이 명백히 틀렸어도 AI의 판단에 동조해버리는 경향이 관찰됨. 즉 사람이 개입해도 편향에서 완전히 자유롭지 않음.
- 확장성 문제: Chatbot Arena류의 대규모 사람 선호 데이터 수집은 비용·시간이 많이 듦.

### 3. 종합: 2026년 현재의 방향성

한 가지 방법만으로는 신뢰할 수 있는 평가가 불가능하다는 공감대가 형성되어 있음. 그 결과:
- 정적 벤치마크는 참고용 하한선 정도로만 취급 (포화·오염 문제 때문).
- LLM-as-judge + 루브릭 기반 세부 채점을 조합해 해석 가능성을 높이는 방향으로 발전.
- 완전 자동화된 평가는 아직 시기상조이며, 사람의 판단(human-in-the-loop)이 여전히 필수 요소로 남아 있음.
- 벤치마크 문항 자체를 표준화해 공개하고(item-level data release), 오염 여부를 감사하는 방법론도 논의되고 있음.

---

### 출처
- [LLM Evaluation in 2026 (Medium)](https://medium.com/@nairmilind3/llm-evaluation-in-2026-e631a78c67dc)
- [LLM-as-a-Judge in 2026: Top evaluation techniques (DeepEval)](https://deepeval.com/blog/llm-as-a-judge)
- [From Generation to Judgment: Opportunities and Challenges of LLM-as-a-judge (arXiv)](https://arxiv.org/pdf/2411.16594)
- [Benchmarking LLM-as-a-Judge for Long-Form Output Evaluation (arXiv)](https://arxiv.org/pdf/2606.01629)
- [Do Before You Judge: Self-Reference as a Pathway to Better LLM Evaluation (arXiv)](https://arxiv.org/pdf/2509.19880)
- [LLM benchmarks in 2026: What they prove and what your business actually needs (LXT)](https://www.lxt.ai/blog/llm-benchmarks/)
- [AI Benchmarks 2026: Top Evaluations and Their Limits (Kili Technology)](https://kili-technology.com/blog/ai-benchmarks-guide-the-top-evaluations-in-2026-and-why-theyre-not-enough)
- [When AI Benchmarks Plateau: A Systematic Study of Benchmark Saturation (arXiv)](https://arxiv.org/pdf/2602.16763)
- [The Benchmark Ceiling: Human Judgment, Evaluation Scarcity, and the Political Economy of AI Capability Measurement (arXiv)](https://arxiv.org/pdf/2607.01254)
- [What Is a Contaminated LLM? Detection, Famous Cases, 2026 Guide (llm-stats.com)](https://llm-stats.com/blog/research/what-is-a-contaminated-llm)
- [AI Evaluation Should Require Standardized Item-Level Data Releases (arXiv)](https://arxiv.org/pdf/2604.03244)
