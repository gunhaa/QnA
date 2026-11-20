---
type: knowledge
created: 2026-11-20
author: agent
model: claude-opus-5-5
---

# RAG의 역사

## 쉬운 설명

LLM은 공부를 마친 날까지의 기억으로만 답하는 학생이라, 그 뒤 일이나 우리 회사 규정은 모르고 모르는 것도 아는 척 지어낸다. 그래서 **시험 볼 때 책을 펴 보게** 해 주자는 생각이 RAG다. 처음엔 연구실에서 "위키백과를 찾아보고 답하는 모델"로 시작했고, ChatGPT 이후 "우리 문서로 답하는 챗봇"을 만드는 표준 방법이 됐다. 지금은 "책을 어떻게 잘 찾게 하나"(검색 품질)와 "언제 찾게 하나"(에이전트)가 주된 관심사다.

## 일반 설명

### 1. 등장 배경: 모델 안의 지식만으로는 부족하다

- **매개변수 지식의 한계**: 모델이 학습으로 가중치에 담은 지식(parametric memory)은 학습 시점에서 멈추고(지식 컷오프), 어디서 온 내용인지 근거를 댈 수 없고, 고치려면 다시 학습해야 한다. 그럴듯하지만 틀린 답(환각)도 여기서 나온다.
- **사내·최신 지식**: 회사 규정, 제품 문서, 어제 바뀐 가격처럼 공개 학습 데이터에 없는 지식은 처음부터 모델 안에 없다.
- **앞선 흐름 — 검색 + 독해**: 오픈 도메인 질의응답(QA)에서는 "검색기(retriever)가 문단을 찾고 독해기(reader)가 답을 뽑는" 구조가 이미 있었다. 2017년 DrQA(Facebook)는 위키백과에서 TF-IDF로 문단을 찾고 그 안에서 답의 위치를 골랐다.
- RAG는 이 구조의 **독해기를 생성 모델로 바꾸고**, 외부 문서를 "모델 밖의 기억(non-parametric memory)"으로 다룬 것이다. 지식을 바꾸려면 모델이 아니라 **문서 색인만 바꾸면 된다**.

### 2. 주요 변천

| 시기 | 변화 | 해결하려던 문제 |
|---|---|---|
| 2017 | DrQA — TF-IDF 검색 + 독해 모델 | 위키백과 전체에서 답 찾기 |
| 2020.02 | **REALM** (Google) — 사전 학습 단계부터 검색기를 함께 학습 | 지식을 가중치 대신 검색으로 |
| 2020.04 | **DPR** (Facebook) — 질문·문단을 각각 벡터로 바꾸는 이중 인코더(bi-encoder) 밀집 검색 | 키워드(BM25)가 못 잡는 뜻 단위 검색 |
| 2020.04 | ColBERT — 토큰 단위 벡터를 늦게 비교(late interaction) | 밀집 검색의 정밀도 |
| 2020.05 | **RAG 논문** (Lewis 외, FAIR·UCL·NYU, NeurIPS 2020) — DPR 검색기 + BART 생성기 + 위키백과 색인. **"RAG"라는 이름이 여기서 나왔다** | 추출이 아닌 생성형 답변, 근거 문서 교체로 지식 갱신 |
| 2021.12 | RETRO (DeepMind) — 수조 토큰 규모 데이터베이스를 검색하며 생성 | 모델 크기 대신 검색으로 성능 |
| 2022.10~11 | LangChain(2022.10), GPT Index(→ LlamaIndex, 2022.11) 공개, ChatGPT 출시(2022.11) | LLM 앱을 조립하는 프레임워크 |
| 2023 | "내 문서와 대화하기" 붐 — 문서 분할(chunking) → 임베딩 → 벡터 DB → 프롬프트에 붙이기가 표준 파이프라인이 됨. 벡터 DB 제품과 PostgreSQL pgvector 확산 | 사내 문서 Q&A, 근거 인용 |
| 2023.07 | "Lost in the Middle" (Liu 외) — 긴 문맥 가운데의 정보를 모델이 잘 못 씀 | 많이 넣는다고 잘 쓰는 게 아님을 보임 |
| 2023.10~2024.01 | Self-RAG, CRAG — 모델이 검색할지·검색 결과가 쓸 만한지 스스로 판단 | 쓸모없는 검색 결과가 답을 망침 |
| 2024.01 | "Seven Failure Points" (Barnett 외, CAIN 2024) — 실제 RAG 시스템 3개의 실패 지점 정리 | RAG는 운영하면서만 검증된다 |
| 2024.04~07 | **GraphRAG** (Microsoft) — 문서에서 개체·관계 그래프와 커뮤니티 요약을 만들어 검색. 2024.07 오픈소스 | "전체 문서의 주제는?" 같은 전역 질문 |
| 2024.09 | **Contextual Retrieval** (Anthropic) — 조각마다 문서 맥락 설명을 붙여 임베딩·BM25 색인 | 조각이 문맥을 잃어 검색 실패 |
| 2024.11 | LazyGraphRAG — 색인 비용을 벡터 RAG 수준으로 | GraphRAG의 높은 색인·질의 비용 |
| 2024.11 | OWASP LLM Top 10 2025판에 **LLM08: Vector and Embedding Weaknesses** 신설 | RAG 고유의 보안 위험(권한 누출, 색인 오염) |
| 2024~2025 | 100만 토큰급 문맥 창 모델 확산 → "RAG는 죽었나" 논쟁. 2025.07 Chroma "context rot" 보고 | 문맥에 다 넣으면 되지 않나 |
| 2025~2026 | **에이전틱 RAG** — LLM이 도구 호출로 검색을 여러 번, 질의를 바꿔 가며 수행. 딥 리서치류 제품 | 한 번 검색으로 안 풀리는 다단계 질문 |
| 2026.06 | Spring AI 2.0 GA — `RetrievalAugmentationAdvisor`로 모듈형 RAG(질의 변환 → 검색 → 후처리 → 생성) | Java 진영의 표준 조립 방식 |

### 3. 무엇이 바뀌었나: 세 단계

1. **연구 단계 (2020~2021)**: 검색기와 생성기를 **함께 학습**하는 모델 구조였다. RAG 논문도 검색기 질문 인코더와 생성기를 끝단까지(end-to-end) 미세 조정했다.
2. **파이프라인 단계 (2022~2024)**: LLM이 범용화되자 모델은 그대로 두고 **프롬프트에 검색 결과를 붙이는 구성**이 주류가 됐다. 학습이 없어져 누구나 만들 수 있게 된 대신, 품질이 문서 분할·임베딩 선택·검색 설정에 크게 좌우됐다. 순수 벡터 검색의 한계가 드러나 **BM25 + 벡터 하이브리드 검색과 재순위화(rerank)**가 기본값이 됐다.
3. **에이전트 단계 (2025~)**: 검색이 **LLM이 고르는 도구 중 하나**가 됐다. 한 번 찾고 끝내지 않고, 결과를 보고 질의를 바꿔 다시 찾는다. 코드 탐색 에이전트처럼 벡터 색인 없이 grep·파일 읽기만으로 찾는 방식도 쓰인다.

### 4. 현재 상태 (2026년 11월)

- **제품이 아니라 설계 패턴**이다. 라이선스나 최신 버전은 구성 요소별로 따로 있다.
- 구성 요소 생태계:

  | 층 | 대표 |
  |---|---|
  | 조립 프레임워크 | LangChain, LlamaIndex, Haystack, Spring AI(2.0, 2026.06 GA) |
  | 벡터 저장소 | pgvector(PostgreSQL 확장, 0.8.x), Qdrant, Milvus, Weaviate, Elasticsearch·OpenSearch |
  | 임베딩 모델 | API형(OpenAI, Cohere, Voyage 등)과 오픈 모델(BGE-M3, 한국어 특화 KURE 등) |
  | 재순위화 | 크로스 인코더(Cohere Rerank, BGE reranker 등) |
  | 평가 | RAGAS 등 LLM 판정 기반 도구, 검색 단계 지표(Recall@k, MRR, nDCG) |

- **사실상 표준 구성**: 하이브리드 검색(BM25 + 벡터, RRF로 합치기) → 크로스 인코더 재순위화 → 상위 몇 개를 LLM에 전달. 여기에 질의 재작성과 에이전트식 반복 검색을 더하는 추세다.
- **경쟁·대체 수단**:
  - **긴 문맥(long context)**: 문서가 작고 자주 안 바뀌면 통째로 넣는 쪽이 단순하다. 비용·지연과 context rot 때문에 대규모·자주 바뀌는 지식에는 여전히 검색이 쓰인다 → [트레이드오프](./03-tradeoffs.md).
  - **미세 조정(fine-tuning)**: 말투·형식·전문 용어 습득에는 맞지만, 자주 바뀌는 사실을 넣는 용도로는 RAG가 싸고 근거를 댈 수 있다.
  - **에이전틱 검색**: 색인을 미리 만들지 않고 검색 도구를 반복 호출한다. 정확하지만 질의당 비용·지연이 크다.

## 관련 문서

- [RAG 개요와 동작 방식](./02-overview.md)
- [RAG 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [RAG 운영 시 흔한 함정과 해결 방법](./04-pitfalls.md)
- [RAG 장애 유형과 대응](./05-failure-modes.md)
- [RAG 실습: 백엔드 구조](./06-labs.md)

## 참고 자료

- [Lewis et al., Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks (2020) — arXiv](https://arxiv.org/abs/2005.11401)
- [Barnett et al., Seven Failure Points When Engineering a Retrieval Augmented Generation System (2024) — arXiv](https://arxiv.org/abs/2401.05856)
- [Introducing Contextual Retrieval — Anthropic](https://www.anthropic.com/research/contextual-retrieval)
- [LazyGraphRAG: Setting a new standard for quality and cost — Microsoft Research](https://www.microsoft.com/en-us/research/blog/lazygraphrag/)
- [OWASP Top 10 for LLM Applications 2025 update — IronCore Labs](https://ironcorelabs.com/blog/2025/owasp-llm-top10-2025-update/)
- [Retrieval Augmented Generation — Spring AI Reference](https://docs.spring.io/spring-ai/reference/api/retrieval-augmented-generation.html)
- [Spring AI 2.0.0-RC1 Available Now — Spring Blog](https://spring.io/blog/2026/06/06/spring-ai-2-0-0-RC1-available-now/)
- [pgvector CHANGELOG — PGXN](https://pgxn.org/dist/vector/CHANGELOG.html)
- [Is Agentic RAG worth it? (2026) — arXiv](https://arxiv.org/pdf/2601.07711)
