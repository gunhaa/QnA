# AI가 RAG DB(벡터 데이터베이스)를 쓰면 아키텍처가 어떻게 바뀔까?

## 5살 아이에게 설명하듯이

AI(인공지능)는 원래 "머릿속에 외운 것"만 가지고 대답하는 친구예요. 학교에서 배운 것(**학습 데이터, training data**)까지만 알고, 그 이후에 생긴 새로운 일이나 우리 집 냉장고 안에 뭐가 있는지는 몰라요.

그런데 이 친구 옆에 **아주 잘 정리된 도서관 사서**를 한 명 붙여주면 어떨까요? 질문을 받으면, AI가 바로 대답하지 않고 먼저 사서(**벡터 데이터베이스, Vector DB**)에게 "이 질문이랑 비슷한 내용의 책 좀 찾아줘!"라고 부탁해요. 사서는 책 내용을 미리 "냄새 지도"(**임베딩, Embedding** — 문장의 의미를 숫자 벡터로 바꾼 것)로 정리해뒀다가, 질문의 냄새와 가장 비슷한 책 몇 페이지를 쏙 뽑아줘요. AI는 그 페이지를 읽고 나서야 대답을 만들어요.

이렇게 "찾아보고(**Retrieval**) → 답을 만드는(**Generation**)" 방식을 합쳐서 **RAG(Retrieval-Augmented Generation, 검색 증강 생성)**라고 불러요.

## 도입 전 vs 도입 후, 아키텍처 뭐가 달라지나

### 도입 전 (LLM 단독 구조)
```
사용자 질문 → LLM(대형 언어 모델) → 답변
```
- AI는 오직 학습 당시 외운 지식(파라미터)에만 의존
- 최신 정보나 회사 내부 문서는 알 수 없음 → **환각(Hallucination)** 위험 큼
- 새 지식을 넣으려면 모델을 다시 학습(**Fine-tuning**)해야 하는데, 비용·시간이 큼

### 도입 후 (RAG 구조)
```
사용자 질문
  → 질문 임베딩 변환 (Embedding Model)
  → 벡터 DB에서 유사 문서 검색 (Retriever)
  → (선택) 재정렬 (Re-ranker)
  → 검색된 문서 + 원 질문을 LLM에 함께 입력 (Context Injection / Prompting)
  → LLM이 근거 기반 답변 생성 (Generation)
  → 답변 (+출처 표시 가능)
```

새로 생기는 컴포넌트들:
- **문서 처리 파이프라인(Ingestion Pipeline)**: 원본 문서를 잘게 쪼개고(**Chunking**), 메타데이터(출처, 날짜, 권한 등)를 붙임
- **임베딩 모델**: 텍스트를 벡터(숫자 배열)로 변환
- **벡터 데이터베이스**: Pinecone, Weaviate, Qdrant, Turbopuffer 등 — 벡터를 저장하고 유사도 검색(**Similarity Search**, 보통 코사인 유사도)을 빠르게 수행
- **리트리버(Retriever)**: 질문과 가장 가까운 벡터(문서 조각)를 상위 K개 찾아옴
- **재정렬기(Re-ranker)**: (선택) 찾아온 후보들을 한 번 더 정밀하게 순위 매김
- **오케스트레이션 레이어**: 검색 결과를 프롬프트에 끼워 넣어 LLM에 전달하는 로직 (LangChain, LlamaIndex 같은 프레임워크가 주로 담당)

## 왜 이렇게 바뀌는가 (핵심 이득)

1. **지식 최신화가 쉬워짐**: 모델을 재학습할 필요 없이, 벡터 DB에 새 문서만 추가하면 됨
2. **환각 감소**: 근거 문서를 함께 주니 "지어내는" 답변이 줄어듦
3. **출처 추적 가능**: 어떤 문서에서 답을 가져왔는지 표시 가능 (신뢰성↑)
4. **도메인 특화 대응**: 회사 내부 문서, 개인 데이터 등 모델이 원래 모르는 영역도 다룰 수 있음

## 트레이드오프 (같이 알아둘 점)

- 시스템이 "모델 하나"에서 "**여러 컴포넌트가 연결된 파이프라인**"으로 복잡해짐 (장애 지점 증가)
- 검색 품질이 나쁘면 답변 품질도 같이 나빠짐 ("쓰레기가 들어가면 쓰레기가 나온다")
- 청킹(Chunking) 전략, 임베딩 모델 선택, 벡터 DB 인덱싱 방식에 따라 성능 차이가 큼
- 데이터 접근 권한(민감정보) 관리가 새로운 보안 고려사항으로 추가됨

## 한 줄 요약

RAG DB를 도입하면 AI 아키텍처는 "혼자 외워서 답하는 구조"에서 "필요할 때마다 최신 자료를 찾아서 근거 있게 답하는 구조"로 바뀝니다.

---

## 출처
- [Retrieval-augmented generation - Wikipedia](https://en.wikipedia.org/wiki/Retrieval-augmented_generation)
- [Best vector databases for RAG in 2026 - Braintrust](https://www.braintrust.dev/articles/best-vector-databases-for-rag-2026)
- [Vector Databases for RAG - IBM](https://www.ibm.com/think/topics/rag-vector-database)
- [RAG in 2026: A Practical Blueprint for Retrieval-Augmented Generation - DEV Community](https://dev.to/suraj_khaitan_f893c243958/-rag-in-2026-a-practical-blueprint-for-retrieval-augmented-generation-16pp)
- [The Ultimate Guide to Vector DB and RAG Pipeline - LearnOpenCV](https://learnopencv.com/vector-db-and-rag-pipeline-for-document-rag/)
