# 한국어 임베딩: KURE vs OpenAI·Google·Claude(Voyage) API, 한국어 파인튜닝이 더 나은가

## 쉬운 설명

임베딩 모델은 "글의 뜻을 숫자로 바꿔 주는 번역기"다. KURE는 **한국어 시험을 집중해서 공부한 학생**이고, OpenAI·Google 모델은 **전 세계 언어를 두루 배운 학생**이다. 한국어 문제만 풀게 하면 집중 공부한 학생이 보통 유리하지만, 두루 배운 학생도 점점 똑똑해져서 **우리 회사 문제로 직접 시험 쳐 봐야** 안다.

## 일반 설명

> 임베딩 모델 선택 일반론은 [한국어 RAG 임베딩 선택](korean-rag-embedding-model-selection-vs-bpe.md) 문서를 참고. 이 문서는 KURE와 상용 API 비교에 집중한다.

### 1. 결론

- **한국어 검색 벤치마크에서는 KURE-v1이 OpenAI `text-embedding-3-large`보다 높게 나온다.** 한국어 특화 파인튜닝은 효과가 있다.
- 다만 **KURE 진영이 운영하는 벤치마크**이고, Gemini·Voyage와의 직접 비교는 이번 검색에서 확인하지 못했다. "한국어 특화가 항상 이긴다"고 일반화하면 안 된다.
- 최종 판단은 **자사 문서·질문으로 직접 평가(PoC)** 해야 한다. 도메인(사내 규정, 기술 문서)에 따라 순위가 바뀐다.

### 2. 후보 모델 정리

| 모델 | 제공 형태 | 특징 |
|---|---|---|
| **KURE-v1** (고려대 NLP&AI Lab) | 오픈 모델(자체 호스팅) | **BGE-M3 기반 한국어 파인튜닝**, 한국어 검색 특화 |
| **BGE-M3** (BAAI) | 오픈 모델 | KURE의 베이스. 다국어, 긴 입력, dense·sparse·multi-vector 지원 |
| multilingual-e5-large | 오픈 모델 | 다국어 범용 기준선 |
| **OpenAI** `text-embedding-3-large/small` | API | 범용 다국어, 차원 축소(Matryoshka) 지원 |
| **Google** `gemini-embedding-001` | API | 3,072차원, 100+ 언어, 출시 당시 MTEB 다국어 1위(검색 자료). 2026-03 **Gemini Embedding 2**(멀티모달: 텍스트·이미지·영상·오디오·문서를 한 벡터 공간에) 출시 |
| **Claude** | **자체 임베딩 모델 없음** | Anthropic 문서가 **Voyage AI**를 권장. `voyage-3-large`(범용·다국어 검색 품질 강조), `voyage-multilingual-2` 등 |

> "Claude 임베딩"은 Anthropic이 직접 제공하지 않으므로, Claude를 LLM으로 쓰더라도 임베딩은 Voyage나 다른 제공사를 쓰는 구성이 된다.

### 3. 성능 비교 (검색된 수치)

KURE 프로젝트의 한국어 검색 벤치마크(8개 태스크: Ko-StrategyQA, AutoRAGRetrieval, MIRACLRetrieval 등, Top-k 1 기준):

| 모델 | Avg Recall | Avg Precision | Avg NDCG | Avg F1 |
|---|---|---|---|---|
| **KURE-v1** | 0.526 | 0.606 | 0.606 | 0.558 |
| OpenAI text-embedding-3-large | 0.449 | 0.517 | 0.517 | 0.476 |

- 약 8~9%p 차이로 KURE-v1이 앞선다(해당 벤치마크 기준).
- 금융 도메인 한국어 임베딩 연구(TWICE, arXiv 2502.07131)도 **언어·도메인 특화 학습이 도메인 특화 과제에서 더 견고**하다는 결론을 낸다.
- Gemini, Voyage, 최신 OpenAI 모델은 이 표에 포함된 값을 확인하지 못했다. 공개 리더보드(MTEB-ko 계열, `ko-embedding-leaderboard`)에서 최신 순위를 직접 확인할 것.

### 4. 왜 한국어 파인튜닝이 유리한가 / 한계는

| 유리한 이유 | 주의점 |
|---|---|
| 한국어 질의-문서 쌍으로 학습해 **교착어·조사·띄어쓰기 변이**에 강함 | 벤치마크가 **학습 데이터와 겹칠 가능성**(오염)과 제작 주체 편향 |
| 같은 크기 베이스 대비 한국어 검색 지표 상승 | 영어/다국어 혼합 문서(영문 기술 문서 섞임)에서는 범용 모델이 나을 수 있음 |
| 무료 오픈 모델, 데이터 외부 반출 없음 | 최신 대형 API 모델은 **빠르게 향상** 중이라 격차가 줄거나 역전될 수 있음 |
| 자체 호스팅이라 비용 예측 쉬움, 도메인 **추가 파인튜닝** 가능 | GPU 서빙·운영 부담, 모델 업데이트 직접 관리 |

핵심 구분: **"한국어 파인튜닝 모델이 낫다"가 아니라, "한국어 파인튜닝의 효과는 실재하지만, 최신 API 모델과의 우열은 데이터에 따라 달라진다"** 가 정확하다.

### 5. 운영 관점 비교

| 항목 | KURE(자체 호스팅) | 상용 API (OpenAI/Google/Voyage) |
|---|---|---|
| 비용 | GPU/서버 비용(고정) | 토큰당 과금(대량 인제스트 시 누적) |
| 데이터 반출 | 없음 | 외부 전송(약관·리전·보존 정책 확인) |
| 운영 | 서빙·스케일링 직접 | 관리형, 즉시 사용 |
| 모델 교체 | 자유, 단 재임베딩 필요 | 제공사가 모델 폐기/변경 가능 |
| 차원 | 1024(BGE-M3 계열) | 모델별 상이(1536/3072 등, 축소 옵션) |
| 도메인 튜닝 | 가능 | 대부분 불가(Voyage는 일부 도메인 모델 제공) |

- 어떤 모델이든 **교체 시 전체 재임베딩**이 필요하다. 모델명·차원을 컬럼에 기록해 두는 설계를 유지한다.
- 차원 수는 벡터 DB 용량·검색 속도에 영향을 준다(pgvector 인덱스 한계 포함).

### 6. 직접 평가하는 방법

1. **평가 세트 구성**: 사내 문서에서 질문 100~200개와 정답 문서/청크를 만든다(사람이 작성하거나 LLM으로 생성 후 검수).
2. **후보 3~5개**: KURE-v1, BGE-M3, OpenAI 3-large, Gemini embedding, voyage-3-large(또는 multilingual).
3. 같은 청킹·같은 벡터 DB 조건에서 **Recall@k, MRR, NDCG@k**를 비교한다.
4. 질문 유형별로 나눠 본다: 키워드형(고유명사·조항 번호), 의미형, 영어 혼합, 긴 질문.
5. 비용(API 요금 vs GPU), 지연 시간, 운영 난이도를 함께 표로 비교한다.
6. 개선 여지: **하이브리드 검색**(dense + BM25/FTS), **리랭커**(예: bge-reranker 계열, 한국어 리랭커)를 얹으면 임베딩 모델 간 격차보다 큰 개선이 나는 경우가 많다.

### 7. 권고

| 상황 | 추천 |
|---|---|
| 사내 문서 중심, 외부 반출 제한, 한국어 위주 | **KURE-v1(또는 BGE-M3) 자체 호스팅** + 하이브리드 검색 + 리랭커 |
| 빠른 도입, 운영 인력 부족, 반출 가능 | OpenAI 3-large/small 또는 Gemini embedding(API) |
| 멀티모달(이미지·PDF 스캔 포함 검색) | Gemini Embedding 2 검토 |
| Claude를 LLM으로 쓰는 스택 | 임베딩은 Voyage 또는 위 후보 중 선택 |
| 확신이 없을 때 | 위 평가 방법으로 2~3개 비교 후 결정 |

### 8. 주의

- 수치는 **KURE 프로젝트 리더보드(자체 운영)** 기준이며 Top-k 1 지표다. 다른 k, 다른 데이터에서는 차이가 달라진다.
- Gemini/Voyage/최신 OpenAI 임베딩 모델과 KURE의 **직접 비교 수치는 확인하지 못했다.** 최신 모델이 계속 나오므로 도입 시점에 리더보드를 재확인한다.
- KURE-v1의 라이선스 조건과 입력 길이 제한은 도입 전에 모델 카드에서 확인한다.

### 출처

- [KURE (nlpai-lab) GitHub](https://github.com/nlpai-lab/KURE)
- [KURE-v1 (Hugging Face)](https://huggingface.co/nlpai-lab/KURE-v1)
- [Embedding Model Selection Guide - Korean Benchmarks](https://www.data-dynamics.io/en/blog/embedding-model-guide)
- [ko-embedding-leaderboard (Korean-MTEB)](https://github.com/OnAnd0n/ko-embedding-leaderboard)
- [TWICE: Low-Resource Domain-Specific Embedding Model, Korea Financial Texts (arXiv)](https://arxiv.org/html/2502.07131v1)
- [MMTEB: Massive Multilingual Text Embedding Benchmark (arXiv)](https://arxiv.org/pdf/2502.13595)
- [Anthropic Embeddings 문서 (Voyage 권장)](https://platform.claude.com/docs/en/build-with-claude/embeddings)
- [Gemini Embedding 논문 리뷰](https://www.themoonlight.io/review/gemini-embedding-generalizable-embeddings-from-gemini)
- [Google Gemini Embedding 2 출시](https://rits.shanghai.nyu.edu/ai/google-launches-gemini-embedding-2-its-first-multimodal-embedding-model/)
- [Best Embedding Models for RAG (2026) (PremAI)](https://www.premai.io/blog/best-embedding-models-for-rag-2026-ranked-by-mteb-score-cost-and-self-hosting/)
