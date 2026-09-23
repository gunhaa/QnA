# 사람 평가자도 기준이 일관되지 않는다 — AI 평가의 근본적 한계

## 쉬운 설명

시험 채점을 여러 선생님한테 맡기면, 선생님마다 점수가 다르게 나올 때가 있어요. "정답은 하나"라고 믿고 싶지만 사실 사람도 서로 의견이 갈려요. 그래서 "사람이 채점하면 확실하다"는 말은 틀렸고, AI 평가가 불완전한 것도 어느 정도는 "원래 정답 자체가 애매해서" 생기는 문제예요.

## 일반 설명

맞습니다. **인간 평가자 간 불일치(inter-annotator disagreement)는 현재 AI 평가 방법론 전반에 깔린 근본적인 한계**입니다. "사람 평가 = 신뢰할 수 있는 정답(ground truth)"이라는 전제 자체가 틀렸다는 증거가 여러 분야에서 나오고 있습니다.

### 1. 문제의 크기: 사람도 꽤 많이 어긋난다

- 텍스트 생성물을 평가하는 사람 평가자들은 약 **20%의 쌍별 불일치(pairwise inconsistency)**를 보임. 다만 대부분은 서열 척도(ordinal scale)에서 한 단계 정도 차이 나는 수준이고, 크게 벌어지는 경우는 드묾.
- 임상 도메인 사례가 특히 극단적: 동일 환자 데이터를 두고 ICU 전문의 11명이 평가했을 때 **Fleiss' κ = 0.383** (겨우 "fair" 수준)에 그침. 흉부 X-ray 판독에서 폐렴 여부를 판단한 임상 평가자들 간에는 **Cohen's κ = 0.085**로 사실상 "거의 일치하지 않음" 수준.
- 이런 불일치는 전문성 부족 때문이 아니라, 평가자 각자의 배경·해석 방식·경험 차이에서 오는 **본질적인 주관성(inherent subjectivity)** 때문.

### 2. "단일 정답(single ground truth)" 가정 자체가 허상

기존 평가 방법론 다수는 "평가 대상에는 하나의 정답이 존재한다"고 전제하지만, 이는 지나친 단순화라는 지적이 많습니다.
- 다수결(majority voting)이나 점수 평균으로 불일치를 "해소"하는 방식은, 만장일치로 라벨링된 항목과 의견이 크게 갈린 항목을 **똑같은 하나의 라벨로 뭉개버리는** 문제가 있음. 즉 "3:2로 겨우 다수결 난 것"과 "5:0 만장일치"가 최종 데이터셋에서는 구분 안 됨.
- 이에 대한 대안으로 **퍼스펙티비스트 모델링(perspectivist modeling)** — 다양한 사람의 관점을 하나의 정답으로 뭉치지 말고 그대로 보존해서 학습·평가에 반영하자는 접근 — 이 최근 연구에서 제안되고 있음.

### 3. 그래서 AI 평가(LLM-as-judge)와 비교하면?

흥미롭게도, 최근 데이터는 "AI 판정자가 사람보다 못하다"는 단순한 결론을 뒤집습니다.
- 프론티어 LLM 판정자(GPT-5.x, Claude Opus 4.7급, 2026년 5월 기준)는 특정 태스크에서 **0.7 이상의 kappa**를 달성 — 이는 역사적으로 사람 평가자 간 합의 수준(NLG 평가 기준 κ ≈ 0.51)을 **오히려 상회**하는 수치.
- 모델은 사람보다 **내적 일관성(internal consistency)**은 높은 경우가 많음 — 같은 입력엔 같은 방식으로 반응하니까. 하지만 그 대가로 **학습 데이터에 내재된 편향이나 보정 오류(calibration error)를 체계적으로 재생산**할 위험이 있음.
- 구조화된(structured) 태스크에서는 모델이 사람 수준 신뢰도에 도달하지만, **미묘하거나 정서적인(nuanced/affective) 판단**에서는 여전히 사람보다 못함.

### 4. 결론 — 이건 "AI 평가만의 한계"가 아니라 "평가라는 행위 자체의 한계"

- 사람 평가를 "정답"으로 놓고 AI 평가(자동 지표, LLM-as-judge)를 거기에 얼마나 가까운지로 채점하는 현재 방법론은,애초에 **비교 대상인 사람 기준 자체가 흔들리는 잣대**라는 근본적 문제를 안고 있음.
- 실무적으로는 이 문제를 완전히 없애기보다 **관리하는 방향**으로 흘러가는 중: inter-rater reliability(예: Cohen's/Fleiss' kappa)를 명시적으로 측정·보고하고, 불일치가 큰 항목은 별도로 표시하거나 재검토하는 방식. 하지만 다수의 평가 연구가 여전히 이 지표를 **아예 보고하지 않거나 해석 없이 나열**하는 데 그쳐, 평균 점수 뒤에 숨은 불일치가 드러나지 않는 경우가 많다는 지적도 있음.
- 실무 최적화 팁으로는 **계층화 샘플링(stratified sampling)**을 활용하면, LLM 판정 결과 중 사람이 검증해야 할 양을 단순 무작위 샘플링 대비 최대 85%까지 줄일 수 있다는 최근(ECIR 2026) 결과도 있음 — 즉 "사람 검증"과 "AI 판정"을 대립시키기보다 서로 보완적으로 배치하는 방향.

요약하면: 질문하신 대로, **인간 기준의 비일관성은 현재 AI 평가 접근법의 실제 한계가 맞습니다.** 다만 이는 "AI 평가가 사람보다 열등하다"는 뜻이 아니라, "사람이든 AI든 완벽한 단일 정답 채점자는 존재하지 않는다"는 더 근본적인 문제로 재해석해야 한다는 것이 최근 연구 흐름입니다.

---

### 출처
- [The Coin Flip Judge? Reliability and Bias in LLM-as-a-Judge Evaluation (arXiv)](https://arxiv.org/pdf/2606.13685)
- [Counting on Consensus: Selecting the Right Inter-annotator Agreement Metric for NLP Annotation and Evaluation (arXiv)](https://arxiv.org/pdf/2603.06865)
- [How to Calibrate Your LLM Judge With Human Annotations (Galileo)](https://galileo.ai/blog/calibrate-llm-judge-human-annotations)
- [Human Evaluation of Large Language Models: A Review and Protocol Selection Framework (MDPI)](https://www.mdpi.com/2673-2688/7/5/174)
- [Expert Evaluation and the Limits of Human Feedback in Mental Health AI Safety Testing (arXiv)](https://arxiv.org/pdf/2601.18061)
- [The impact of inconsistent human annotations on AI driven clinical decision making (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9944930/)
- [Beyond Consensus: Perspectivist Modeling and Evaluation of Annotator Disagreement in NLP (arXiv)](https://arxiv.org/html/2601.09065v2)
- [Dissecting Subjectivity and the "Ground Truth" Illusion in Data Annotation (ResearchGate)](https://www.researchgate.net/publication/400741885_Dissecting_Subjectivity_and_the_Ground_Truth_Illusion_in_Data_Annotation)
