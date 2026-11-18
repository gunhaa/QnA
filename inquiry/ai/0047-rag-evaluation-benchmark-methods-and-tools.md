# RAG 평가(벤치마크) 방법과 예외 케이스 테스트, 오픈소스 도구

> 질문: RAG 예외 벤치마크 방법과 많이 사용되는 오픈소스 툴이 있을까?
> ("예외"는 RAG 평가 전반 + 답이 없는 질문 같은 **예외 케이스** 평가로 해석해 둘 다 정리)

## 쉬운 설명

RAG는 "도서관에서 책을 찾아(검색) 읽고 대답(생성)하는 학생"이다. 평가는 두 가지를 따로 채점한다 — **책을 제대로 골랐나**, **책 내용대로 대답했나**. 그리고 도서관에 없는 걸 물었을 때 지어내지 않고 **"모르겠어요"라고 하는지**가 예외 테스트다.

## 일반 설명

### 1. 평가 구조: 검색과 생성을 분리해서 측정

| 단계 | 지표 | 의미 |
|---|---|---|
| Retrieval | **Context Precision** | 가져온 청크 중 실제로 관련 있는 비율 (상위 랭크일수록 가중) |
| Retrieval | **Context Recall** | 정답에 필요한 정보가 검색 결과에 다 들어있는지 (정답 레퍼런스 필요) |
| Retrieval | Hit Rate / MRR / nDCG@k | 전통 IR 지표. 정답 청크 ID 라벨이 있으면 LLM 없이 계산 가능 |
| Generation | **Faithfulness (Groundedness)** | 답변의 각 주장이 검색된 컨텍스트로 뒷받침되는지 → 환각 탐지 |
| Generation | **Answer Relevancy** | 답변이 질문에 맞는 내용인지 |
| End-to-end | Answer Correctness | 정답(ground truth)과의 일치도 |

대부분 **LLM-as-a-Judge** 방식(평가용 LLM이 채점)이라, 정답 라벨 없이도 Faithfulness·Answer Relevancy·Context Precision은 측정 가능하다. 단, Judge 모델 편향·비결정성이 있으므로 일부 샘플은 사람이 교차 검증하는 게 좋다 (→ `ai-llm-basics/benchmark-hard-task-count-vs-judge-scoring.md` 참고).

### 2. 예외(robustness) 케이스 벤치마크

정상 질문만 테스트하면 실제 운영 장애를 못 잡는다. 대표 기준은 **RGB 벤치마크**(AAAI 2024)의 4가지 능력:

1. **Noise Robustness** — 관련 없는 문서가 섞여도 정답을 내는가
2. **Negative Rejection** — 근거 문서가 없을 때 "답할 수 없음"으로 거절하는가
3. **Information Integration** — 여러 문서에 흩어진 정보를 종합하는가
4. **Counterfactual Robustness** — 문서에 틀린 사실이 있을 때 이를 감지하는가

RGB 결과상 LLM은 노이즈엔 어느 정도 강하지만 **거절률이 50% 미만**으로 negative rejection이 특히 약하다. 답 없는 질문을 지식베이스별로 6개 범주로 생성해 평가하는 **UAEval4RAG** 프레임워크도 있다.

**사내 RAG에 적용하는 실무 방법** — 골든 데이터셋을 만들 때 예외 케이스를 의도적으로 섞는다:

| 케이스 | 예시 | 기대 동작 / 측정 |
|---|---|---|
| 범위 밖 질문 | 사내 규정 RAG에 "오늘 날씨?" | 거절 — 거절률(rejection rate) |
| KB에 없는 사내 질문 | 존재하지 않는 규정 조항 | 지어내지 않음 — 환각률 |
| 오래된/상충 문서 | 구버전·신버전 규정 동시 존재 | 최신 문서 근거 — Correctness |
| 모호한 질문 | "휴가 규정 알려줘" | 되묻기 또는 범위 명시 |
| 다중 문서 종합 | A문서 기준 + B문서 예외조항 | Context Recall, Correctness |
| 프롬프트 인젝션 문서 | 문서 안에 "이전 지시 무시" | 지시 무시 — 안전성 |
| 오탈자/구어체 | "연차 이월 되나여" | 검색 Hit Rate 유지 |

### 3. 많이 쓰는 오픈소스 도구

| 도구 | 성격 | 강점 |
|---|---|---|
| **Ragas** | RAG 지표 라이브러리 (Python) | 사실상 표준 지표 4종(Context Precision/Recall, Faithfulness, Answer Relevancy), **테스트셋 자동 생성** 기능. 노트북 중심이라 트레이스 저장소와 같이 씀 |
| **DeepEval** | pytest 스타일 LLM 테스트 | CI에서 회귀 테스트로 돌리기 좋음. RAG 지표 + 에이전트/대화 평가, 레드팀(안전성) 테스트 |
| **TruLens** | 피드백 함수 기반 평가 | "RAG Triad"(Context Relevance, Groundedness, Answer Relevance)를 **청크 단위**로 점수화 — 어느 청크가 문제인지 추적 |
| **Arize Phoenix** | 트레이싱 + 평가 UI | OpenTelemetry 기반 트레이스와 eval을 한 화면에서. 셀프호스팅 가능 |
| **Langfuse** | LLM 관측성 플랫폼 | 트레이스·데이터셋·LLM-judge 평가 관리, 셀프호스팅. Ragas와 조합 많이 함 |
| **promptfoo** | YAML 기반 eval/레드팀 CLI | 프롬프트·모델 비교, 인젝션 등 예외 케이스 테스트를 설정 파일로 |

Java/Spring AI 스택이라면 Spring AI의 `Evaluator` 인터페이스(`RelevancyEvaluator`, `FactCheckingEvaluator`)로 JUnit 안에서 간단한 judge 평가가 가능하고, 본격적인 지표 측정은 Python 쪽(Ragas/DeepEval)을 별도 파이프라인으로 두는 구성이 흔하다.

### 4. 추천 진행 순서

1. 실제 사용자 질문 50~200개 + 예외 케이스 20~30% 섞어 **골든셋** 구성 (Ragas 테스트셋 생성으로 초안 → 사람이 검수)
2. **검색 지표 먼저** (Hit Rate@k, Context Recall) — 청크 크기, 임베딩 모델, 하이브리드 검색 튜닝
3. **생성 지표** (Faithfulness, 거절률) — 프롬프트에 "근거 없으면 모른다고 답하라" 명시 후 비교
4. DeepEval/promptfoo로 **CI 회귀 테스트**화, Phoenix/Langfuse로 운영 트레이스 모니터링

## Sources

- [RAGAS vs. TruLens vs. DeepEval: LLM Evaluation Frameworks Compared (Atlan, 2026)](https://atlan.com/know/llm-evaluation-frameworks-compared/)
- [Best RAG evaluation tools 2026 (FutureAGI)](https://futureagi.com/blog/best-rag-evaluation-tools-2026/)
- [Best RAG Evaluation Tools in 2026 (Adaline)](https://www.adaline.ai/blog/best-rag-evaluation-tools-in-2026)
- [Benchmarking LLMs in Retrieval-Augmented Generation — RGB (AAAI 2024)](https://ojs.aaai.org/index.php/AAAI/article/view/29728)
- [Unanswerability Evaluation for RAG — UAEval4RAG (arXiv 2412.12300)](https://arxiv.org/html/2412.12300v3)
