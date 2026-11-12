# 한국어 RAG 벤치마크 데이터셋과 지표별 목표 점수

> 질문: 한국어 데이터 소스와 RAG 벤치마크용 데이터셋이 존재하는지? 각 지표(솔루션)마다 몇 점은 돼야 한다는 기준이 있는지?

## 쉬운 설명

한국어 시험지는 이미 몇 개 나와 있다 (금융·법률·의료 문서로 만든 시험 등). 하지만 "몇 점 이상이면 합격"이라는 공통 기준은 없다. 시험 문제와 채점 선생님(Judge 모델)이 바뀌면 점수가 달라지기 때문이다. 그래서 공개 시험지로 **모델/도구를 고르고**, 우리 회사 문서로 만든 **자체 시험지로 합격선을 정한다**.

## 일반 설명

### 1. 한국어 RAG(End-to-End) 평가 데이터셋

| 데이터셋 | 구성 | 용도 |
|---|---|---|
| **Allganize RAG-Evaluation-Dataset-KO** (Hugging Face `allganize/RAG-Evaluation-Dataset-KO`) | 금융·공공·의료·법률·커머스 5개 도메인, 도메인별 200~300페이지 PDF + 도메인당 60문항 | 한국어 RAG 전체 파이프라인(파싱→검색→생성) 평가. 실제 기업 문서(PDF, 표 포함) 기반이라 사내 RAG와 가장 유사 |
| **Alli RAG 리더보드** | 위 데이터셋으로 여러 RAG 솔루션/LLM 조합을 정확도로 순위화 | 상용 RAG 솔루션·LLM 비교 참고 |

Allganize 데이터셋은 PDF 원문을 직접 파싱해야 하므로 **파서 성능**(표·이미지 처리)까지 함께 평가된다는 점이 장점이자 주의점이다.

### 2. 한국어 검색(Retrieval) 벤치마크 — 임베딩/리트리버 선택용

MTEB 한국어 subset(및 축약판 NanoMTEB-Korean)에 포함된 주요 태스크:

| 태스크 | 내용 |
|---|---|
| **AutoRAGRetrieval** | 금융·공공·의료·법률·커머스 PDF 파싱 문서 검색 (위 Allganize 도메인과 유사) |
| **Ko-StrategyQA** | 암묵적 추론이 필요한 멀티홉 질문의 근거 문단 검색 (StrategyQA 번역) |
| **MIRACL (ko)** | 한국어 위키백과 기반 문서 검색 |
| **PublicHealthQA** | 의료·공중보건 도메인 |
| **MultiLongDocRetrieval** | 긴 문서 검색 |
| **BelebeleRetrieval** | FLORES-200 기반 다국어 독해 검색 |

주 지표는 **NDCG@10**. 참고로 KURE-v1, KoE5 등 한국어 특화 임베딩 모델 카드에 이 벤치마크 점수가 공개돼 있고, 2026년 기준 상위권 모델(예: sionic-ai comsat-embed-ko-8b-preview)이 9개 subset 평균 NDCG@10 약 **0.79** 수준이다. 임베딩 선택은 `korean-embedding-kure-vs-api-models.md` 참고.

### 3. 데이터 소스(원천 코퍼스·QA)

- **KorQuAD 1.0/2.0** — 위키백과 기반 기계독해 QA. 질문-정답-근거문단이 있어 RAG 골든셋으로 변환하기 쉬움
- **AI Hub** (aihub.or.kr) — 행정문서·법률·의료·금융 등 도메인별 기계독해/QA 데이터 다수 (회원가입·내국인 신청 필요)
- **모두의 말뭉치** (국립국어원) — 대규모 한국어 말뭉치

이들은 "RAG 벤치마크"로 만들어진 건 아니지만, `질문 + 근거문단 + 정답` 구조라 Context Recall·Correctness 평가셋으로 재가공해 많이 쓴다.

### 4. "몇 점은 돼야 한다"는 기준이 있나?

**공식 표준은 없다.** 업계에서 통용되는 경험치는 아래 정도다:

| 지표 | 일반 서비스 | 규제 도메인(금융·의료·법률) | 비고 |
|---|---|---|---|
| **Faithfulness** | ≥ 0.8 | ≥ 0.9 | 환각 직결. 가장 먼저 게이트로 거는 지표 |
| **Context Recall** | ≥ 0.8 권장 | 더 엄격하게 | 누락 비용이 큰 곳일수록 높게. Faithfulness가 높아도 Recall이 낮으면 "부분 정보로 그럴듯하게 답하는" 상태 |
| **Context Precision** | ≥ 0.7 수준 | — | 낮으면 노이즈 청크가 많다는 뜻 → 리랭커 도입 검토 |
| **Answer Relevancy** | ≥ 0.8 수준 | — | |
| **Hit Rate@k / Recall@k** (라벨 있을 때) | @5 기준 0.85~0.9 이상을 많이 목표로 함 | — | 검색 단계 기본 체력 |
| **거절률 (답 없는 질문)** | 높을수록 좋음 | 거의 100% 목표 | 단, 답 있는 질문을 거절하는 **오거절률**도 같이 측정 |

> Faithfulness 0.8/0.9 외의 수치는 "흔히 쓰는 출발점"이지 근거 있는 표준이 아니다.

**절대 점수를 그대로 믿으면 안 되는 이유**

- **Judge 모델 의존**: 같은 답변도 채점 LLM(GPT 계열 vs Claude vs 로컬 모델)에 따라 점수가 달라진다
- **도구별 구현 차이**: Ragas의 Faithfulness와 DeepEval의 Faithfulness는 프롬프트·계산식이 달라 직접 비교 불가
- **데이터셋 난이도**: 멀티홉·표 질문이 많으면 같은 시스템도 점수가 크게 떨어진다
- **한국어 Judge 품질**: 영어 기준 프롬프트로 한국어를 채점하면 claim 분해가 부정확해질 수 있다 → 일부 샘플은 사람이 교차 검증

### 5. 실무 권장 방식

1. **공개 데이터셋은 상대 비교용** — AutoRAGRetrieval/Allganize로 임베딩·파서·LLM 후보 선별
2. **사내 골든셋 100~200문항**(예외 질문 20~30% 포함)을 만들고 사람 평가와 함께 **베이스라인 점수** 측정
3. 베이스라인 + 위 경험치를 참고해 **팀 자체 합격선** 설정 (예: Faithfulness ≥ 0.85, 거절률 ≥ 0.9, 오거절률 ≤ 0.1)
4. Judge 모델·프롬프트를 **고정**하고 CI에서 "이전 대비 하락 여부"를 회귀 체크 — 절대값보다 **추세**가 더 신뢰할 만하다

## Sources

- [올거나이즈, 알리 RAG 리더보드 공개 (CIO Korea)](https://www.cio.com/article/3521951/%EC%98%AC%EA%B1%B0%EB%82%98%EC%9D%B4%EC%A6%88-%EC%95%8C%EB%A6%AC-rag-%EB%A6%AC%EB%8D%94%EB%B3%B4%EB%93%9C-%EA%B3%B5%EA%B0%9C%C2%B7%C2%B7%C2%B7-%EA%B8%88%EC%9C%B5-%EA%B3%B5.html)
- [올거나이즈 알리 RAG 리더보드 공개, 5개 분야 (ITWorld)](https://www.itworld.co.kr/article/3563096/%EC%98%AC%EA%B1%B0%EB%82%98%EC%9D%B4%EC%A6%88-%EC%95%8C%EB%A6%AC-rag-%EB%A6%AC%EB%8D%94%EB%B3%B4%EB%93%9C-%EA%B3%B5%EA%B0%9C-5%EA%B0%9C-%EB%B6%84%EC%95%BC-%ED%95%9C.html)
- [NanoMTEB-Korean 태스크 설명](https://hakari-bench-leaderboard.hf.space/docs/benchmark-tasks/NanoMTEB-Korean)
- [NanoMTEB-Korean / Ko-StrategyQA](https://hakari-bench-leaderboard.hf.space/docs/benchmark-tasks/NanoMTEB-Korean/ko_strategy_qa)
- [sionic-ai/comsat-embed-ko-8b-preview (MTEB Korean 점수)](https://huggingface.co/sionic-ai/comsat-embed-ko-8b-preview)
- [nlpai-lab/KURE-v1](https://huggingface.co/nlpai-lab/KURE-v1)
- [RAG Evaluation: Metrics, Frameworks & Testing 2026 (PremAI)](https://blog.premai.io/rag-evaluation-metrics-frameworks-testing-2026)
- [RAG evaluation metrics (FutureAGI)](https://futureagi.com/blog/rag-evaluation-metrics-2025/)
