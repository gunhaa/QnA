# 한국어 RAG: 임베딩 방식 선택, BPE와의 관계, 다중 임베딩 여부

## 쉬운 설명

BPE는 문장을 **레고 조각으로 자르는 가위**고, 임베딩 모델은 그 조각들을 보고 **"이 문장은 이런 뜻이야"라고 지도에 점을 찍어주는 사람**이야. 둘은 비교 대상이 아니라 역할이 달라. 그리고 "뜻으로 찾기(임베딩)"와 "글자로 찾기(전문 검색)"를 같이 쓰는 건 사람을 둘 쓰는 게 아니라 **돋보기와 지도를 같이 쓰는 것**이라 좋은 방법이야. 지도(임베딩 모델)만 여러 장 사는 건 낭비야.

## 일반 설명

### 1. 먼저 바로잡을 개념: BPE는 "임베딩 방식"이 아니다

| 구분 | 무엇인가 | 예시 |
|---|---|---|
| **토크나이저** | 텍스트를 토큰으로 분해하는 규칙 | BPE, WordPiece, SentencePiece(Unigram), 형태소 분석기, n-gram |
| **임베딩 모델** | 토큰들을 읽어 텍스트 전체를 벡터로 바꾸는 신경망 | bge-m3, KURE-v1, multilingual-e5, OpenAI text-embedding-3, Qwen3-Embedding |

- 임베딩 모델은 **자기 학습 때 쓴 토크나이저가 내장**되어 있어 바꿀 수 없다. 예: bge-m3는 XLM-RoBERTa 계열 SentencePiece 어휘(약 25만)를 쓴다. 내가 BPE로 따로 자른 토큰을 넣어도 모델은 이해하지 못한다.
- 따라서 "BPE로 임베딩할까, 다른 방법으로 할까"는 성립하지 않고, 실제 선택지는 두 갈래다.
  1. **밀집 임베딩(dense) 모델 선택** — 의미 검색용
  2. **전문 검색(lexical)용 토큰화 방식 선택** — 키워드 검색용 (여기서 BPE vs 형태소 vs n-gram 비교가 의미를 가짐)
- 토크나이저와 임베딩 테이블의 관계는 기존 정리 [faq-tokenizer-vs-embedding-table.md](../ai-llm-basics/llm-architecture/faq-tokenizer-vs-embedding-table.md) 참고.

### 2. 전문 검색(tsvector)용 토큰화: BPE vs 형태소 vs n-gram

한국어는 교착어라 "규정을/규정이/규정에서"가 모두 다른 어절이다. 어떤 단위로 색인하느냐가 재현율을 좌우한다.

| 방식 | 장점 | 단점 | 한국어 규정 문서 적합성 |
|---|---|---|---|
| **형태소 분석** (Lucene Nori, mecab-ko, Kiwi 등) | 조사/어미 제거 후 어간 매칭 → "규정" 질의가 "규정을/규정에" 모두 히트. 정밀도 높음 | 사전·분석기 관리, 신조어/사내 용어 사전 등록 필요, 색인·질의 분석기 일치 필요 | **가장 좋음** |
| **n-gram** (pg_bigm 등 2-gram) | 사전 불필요, 미등록어/복합어/오타에 강함, 구현 단순 | 노이즈 많음, 인덱스 큼, 랭킹 품질 낮음 | 관리형 DB 제약이 있을 때 차선 |
| **BPE/서브워드를 lexical 색인에 사용** | 사전 불필요, OOV 없음, 언어 무관 | 분할 경계가 형태소와 무관(`규|정을` 식), 어휘 구성에 따라 분할이 달라져 일관성·해석성 낮음, 흔한 조각이 IDF 노이즈를 만듦, 모델 어휘가 바뀌면 색인 재생성 | **비권장** (BM25 용도로는 형태소/n-gram이 일반적) |
| 공백 분리 + `simple` | 가장 단순 | 조사 때문에 재현율 급감 | 부적합 |

- BPE 서브워드를 lexical 색인에 쓰는 것은 기술적으로 가능하지만, 한국어에서 이점이 없다. 서브워드 기반 희소 검색이 필요하면 아래 SPLADE/bge-m3 sparse 같이 **학습된 희소 표현**이 따로 있다.
- 검색 결과에서 한국어 형태소 vs BPE의 lexical 품질을 직접 비교한 자료는 찾지 못했다. 위 평가는 일반 원리 기반이므로 **내 데이터 평가셋으로 검증**할 것.

### 3. 밀집 임베딩 모델 선택

| 후보 | 특징 | 비고 |
|---|---|---|
| **KURE-v1** (고려대) | BGE-M3를 한국어 검색 데이터로 추가 파인튜닝, 1024차원, 8192 토큰, MIT | 자체 한국어 검색 벤치마크에서 평균 recall 0.7385 vs BGE-M3 0.6753, multilingual-e5-large 0.6581 (개발 측 발표 수치) |
| **BGE-M3** | 100+ 언어, 1024차원, 8192 토큰, dense/sparse/multi-vector를 한 모델이 출력 | 범용 강자, 한국어 MTEB에서도 상위권. KURE의 베이스 |
| **multilingual-e5-large** | 비교적 작고 빠름 | 질의/문서에 `query: ` / `passage: ` 접두어 필요 |
| **Qwen3-Embedding** (0.6B~8B) | Apache 2.0, 최대 4096차원(MRL로 축소 가능), 32K 토큰 | 큰 모델은 GPU 비용 큼 |
| **OpenAI text-embedding-3 / Cohere Embed** | API만 호출, 운영 부담 낮음 | **사내 규정 데이터가 외부로 나간다**, 비용·종속성 |

**선택 기준**

1. **데이터 반출 가능 여부** — 사내 규정이면 셀프 호스팅(bge-m3/KURE/Qwen3) 우선 검토
2. **한국어 검색 성능** — 공개 벤치마크는 참고만, 반드시 자체 평가셋(질문 → 정답 조항 30~100쌍)으로 recall@k·MRR 측정
3. **차원** — pgvector `vector` HNSW는 2000차원 이하. 1024차원(bge-m3, KURE)은 여유 있음. 큰 차원은 MRL 축소나 `halfvec` 고려
4. **최대 토큰** — 규정 청크는 짧아 512 토큰 모델로도 충분하지만, 긴 조항을 쓸 때 8192가 유리
5. **서빙 방법** — Spring AI에서 Ollama, ONNX(`TransformersEmbeddingModel`), OpenAI 호환 서버(예: text-embeddings-inference) 중 선택. `EmbeddingModel` 추상화 덕에 호출부는 동일

**시범 단계 권고: KURE-v1 또는 BGE-M3 하나로 시작**, 평가셋으로 둘을 비교한 뒤 결정.

### 4. "여러 가지로 임베딩"은 좋지 않은가?

두 가지를 구분해야 한다.

| 구성 | 평가 |
|---|---|
| **dense 임베딩 + lexical(FTS) 병행** (하이브리드) | **권장.** 서로 보완적이다. 의미 유사 질의는 dense, "제12조 2항"·약어·고유명사는 lexical이 강하다. 같은 청크에 `embedding`(vector)과 `tsv`(tsvector) 두 컬럼만 있으면 된다 |
| **dense 모델을 여러 개** (예: bge-m3 + e5 + OpenAI 동시) | **비권장.** 저장량·HNSW 인덱스·재임베딩 비용이 배가되고, 점수 스케일이 달라 융합 튜닝이 어려운데 성능 이득은 대개 작다 |
| 한 모델의 dense + sparse 동시 출력 (BGE-M3) | 선택 사항. 모델 하나로 두 표현을 얻지만 pgvector에서 sparse는 `sparsevec` 타입(0.7+)으로 따로 저장·질의 로직을 만들어야 해 시범 단계에선 과함 |
| multi-vector(ColBERT 방식) | 정밀하지만 저장량이 토큰 수만큼 늘어 시범 단계에선 불필요 |

**다중 임베딩이 정당화되는 예외**: 모델 교체 이행 기간(신/구 모델 병행 후 컷오버), 또는 규모가 커져 리랭커/ColBERT로 정밀도를 더 올려야 할 때.

### 5. 권고 구성

```
청크 텍스트 = section_path + content   (계층 경로를 함께 임베딩하면 맥락이 살아남음)
   ├─ embedding  vector(1024)  ← 단일 dense 모델 (KURE-v1 / BGE-M3), HNSW cosine
   └─ tsv        tsvector      ← 형태소 분석(앱단 Nori/Kiwi 등) + 'simple', GIN
검색: dense top-k + FTS top-k → RRF 병합 → (필요 시 리랭커)
```

- 질의와 문서는 **반드시 같은 모델**로 임베딩 (모델별 접두어 규칙 준수).
- `embedding_model` 컬럼을 두고 모델 교체 시 전체 재임베딩할 수 있게 원문을 보관.
- 형태소 분석기 선택은 Postgres 운영 형태(관리형/셀프)에 따라 달라진다 → [설계 문서](./rag-internal-policy-xlsx-ingestion-design.md)의 7장 참고.
- 성능이 부족하면 순서대로: ① 청킹/계층 경로 개선 → ② 사내 용어 사전 등록 → ③ RRF 가중치 조정 → ④ 리랭커 추가 → ⑤ 모델 교체. 다중 임베딩은 마지막 수단.

Sources:
- [KURE (nlpai-lab) GitHub](https://github.com/nlpai-lab/KURE)
- [임베딩 모델 선택 가이드 - 한국어 벤치마크](https://www.data-dynamics.io/ko/blog/embedding-model-guide)
- [임베딩 모델 선택과 비교 - Just Read, LLMOps](https://wikidocs.net/338685)
- [BGE-M3 공식 문서](https://bge-model.com/bge/bge_m3.html)
- [What is BGE-M3? (Superlinked)](https://superlinked.com/glossary/what-is-bge-m3.md)
- [Hybrid Search in Production: Why BM25 Still Wins](https://tianpan.co/blog/2026-04-12-hybrid-search-production-bm25-dense-embeddings)
- [Best Ollama Embedding Models 2026](https://www.morphllm.com/ollama-embedding-models)
