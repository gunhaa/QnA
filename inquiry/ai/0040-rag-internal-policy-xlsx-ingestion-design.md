# 사내 규정 RAG 시범 구축 설계 (Spring AI + JPA + pgvector + xlsx 파서)

## 쉬운 설명

규정집(엑셀)은 **서랍이 칸칸이 나뉜 책장**이야. 우리가 만들 건 ① 책장을 읽어서 쪽지로 옮겨 적는 **필사 담당(파서)**, ② 쪽지를 "뜻으로 찾기"와 "단어로 찾기" 두 방식으로 꺼낼 수 있게 정리해두는 **도서관(Postgres)**, ③ 새 책을 맡기는 **접수 창구(엔드포인트)**야. 필사는 이미 있는 복사기(라이브러리)를 쓰고, "어떤 칸을 한 쪽지로 묶을지"는 우리 규칙으로 직접 정하면 돼.

## 일반 설명

### 1. 결론 요약

| 결정 사항 | 권고 |
|---|---|
| xlsx 파싱 | **라이브러리 사용(Apache POI)** + **매핑/청킹 로직은 직접 구현**. 파일 읽기 자체를 직접 구현하지 않는다 |
| Spring AI `TikaDocumentReader` | xlsx에는 **부적합**(표 구조가 평문으로 뭉개짐). PDF/DOCX 등 비정형 문서용으로 추후 활용 |
| 구조 | `DocumentParser` 인터페이스(전략 패턴) → 포맷별 구현체. 엔드포인트는 포맷에 무관 |
| 저장소 | Spring AI `PgVectorStore` 단독보다 **자체 JPA 엔티티 + 네이티브 쿼리**로 하이브리드 검색 구성, Spring AI는 `EmbeddingModel`/`ChatClient`/Splitter 용도 |
| 한국어 FTS | 기본 `simple`/`english` 설정은 부적합. pg_bigm / PGroonga / mecab-ko / 앱단 형태소 분석 중 **인프라 제약으로 선택** |
| 임베딩 미정 대응 | 모델명·차원을 컬럼에 기록, 재임베딩 가능한 구조로 설계 |

### 2. 전체 파이프라인

Spring AI의 ETL 추상화(`DocumentReader` → `DocumentTransformer` → `DocumentWriter`)와 같은 흐름으로 설계한다.

```
POST /api/v1/documents (multipart)
   │  파일 해시 계산 → 중복/개정 판별 → ingestion job 생성(202 Accepted)
   ▼
[Parser]  xlsx → 구조화 결과(장/조/항/행 단위 Section 목록)
   ▼
[Chunker] 의미 단위로 청킹 + 계층 경로(breadcrumb) 부착
   ▼
[Embedder] EmbeddingModel (임베딩 모델 미정 → 교체 가능)
   ▼
[Writer]  JPA: document / document_chunk (vector + tsvector)
```

### 3. xlsx 파서: 직접 구현 vs 라이브러리

**파일 포맷 해석(OOXML zip/XML 파싱)은 직접 구현하지 않는다.** 공유 문자열, 병합 셀, 날짜 서식, 수식 등 예외가 많아 비용 대비 이득이 없다.

| 후보 | 특징 | 적합성 |
|---|---|---|
| **Apache POI** (`XSSFWorkbook`, 이벤트/SXSSF API) | 가장 범용, 병합 셀·수식·서식·.xls 지원 | **권장.** 규정집은 수천 행 이하라 메모리 이슈가 작다 |
| fastexcel-reader (dhatim) | 스트리밍 리더, 셀 값만 읽음(스타일 버림), POI 대비 빠르고 힙 사용량 적음 | 대용량 전용. 병합 셀 등 서식 정보가 필요하면 부적합 |
| EasyExcel (Alibaba) | 어노테이션 매핑 편리 | 검색 결과상 유지보수 모드 전환 보도가 있어 **신규 채택 비권장** (공식 공지 확인 후 판단) |
| Spring AI `TikaDocumentReader` | 다양한 포맷 텍스트 추출 | xlsx는 행/열 구조가 사라져 규정 청킹 품질 저하 |

**직접 구현해야 하는 부분(= 진짜 파서의 핵심)**

- 시트/헤더 행 식별, 컬럼 → 의미 매핑(예: 조, 항, 내용, 시행일, 비고)
- **병합 셀 처리**: 병합 영역의 값은 좌상단 셀에만 존재 → 하위 행에 전파(forward-fill)
- 계층 복원: 장 > 조 > 항 > 호 경로를 만들어 청크 앞에 붙임 (검색 맥락 보존)
- 빈 행/주석/숨김 행·시트 규칙
- 개정 이력·시행일 메타데이터 추출

> 엑셀 구조에 따라 청킹 전략이 달라진다. **실제 파일의 시트·컬럼·병합 사용 현황**을 먼저 확인하는 것이 가장 중요하다.

**확장 설계**

```java
public interface DocumentParser {
    boolean supports(String contentType, String filename);
    ParsedDocument parse(InputStream in, ParseOptions options);
}
// XlsxPolicyParser (POI, 사내 규정 전용 매핑)
// TikaDocumentParser (PDF/DOCX 등 추후) — Spring AI TikaDocumentReader 래핑
// MarkdownParser, CsvParser ...
```

`ParsedDocument`(제목, 메타데이터, `List<Section>`)라는 **중간 표현**을 두면 포맷이 늘어도 청킹/임베딩/저장 코드는 그대로다.

### 4. 엔드포인트 설계

- `POST /api/v1/documents` (multipart) — 업로드 + 파싱 + 저장 요청. 임베딩 호출이 느리므로 **비동기 처리 후 202 + jobId** 권장
- `GET /api/v1/documents/{id}`, `GET /api/v1/ingestion-jobs/{id}` — 상태 조회
- `PUT /api/v1/documents/{id}` — 개정본 교체(동일 문서 새 버전)
- `DELETE /api/v1/documents/{id}` — 문서와 청크 삭제
- **멱등성**: 파일 SHA-256을 저장해 같은 파일 재업로드 방지
- **재처리**: 원본 파일(또는 파싱 결과)을 보관하면 임베딩 모델 변경 시 재인제스트가 쉽다
- 파라미터: `docType`(policy 등), `effectiveDate`, `parserOptions`(시트명/헤더 행 지정)
- 시범 단계에서도 업로드 용량·확장자·인증 제한은 둘 것 (사내 규정은 접근 권한 이슈가 생길 수 있음 → 메타데이터에 `access_level` 컬럼 고려)

### 5. 데이터 모델 (JPA + pgvector)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  doc_type      TEXT NOT NULL,
  version       INT  NOT NULL DEFAULT 1,
  effective_date DATE,
  content_hash  CHAR(64) NOT NULL UNIQUE,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE document_chunk (
  id            BIGSERIAL PRIMARY KEY,
  document_id   BIGINT REFERENCES document(id) ON DELETE CASCADE,
  chunk_index   INT NOT NULL,
  section_path  TEXT,                  -- 예: 제3장 > 제12조 > ②
  content       TEXT NOT NULL,
  embedding     vector(1536),          -- 차원은 임베딩 모델 확정 후
  embedding_model TEXT NOT NULL,       -- 모델 교체/재임베딩 대비
  tsv           tsvector,              -- FTS (한국어 처리 방식에 따라 생성)
  metadata      JSONB
);

CREATE INDEX ON document_chunk USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON document_chunk USING gin (tsv);
```

**JPA 매핑 시 주의점**

- Hibernate 6.4+는 벡터 타입(`SqlTypes.VECTOR`, `float[]`) 지원 모듈이 있다 (버전별 사용법은 사용 중인 Hibernate 문서로 확인). 어렵다면 임베딩 컬럼만 `JdbcTemplate`/네이티브 쿼리로 다룬다.
- `tsvector`는 JPA 엔티티에서 읽을 일이 거의 없으므로 DB 쪽 **생성 컬럼/트리거**로 채우고 엔티티에는 매핑하지 않는 편이 단순하다.
- 스키마는 `ddl-auto`가 아닌 **Flyway/Liquibase**로 관리 (확장·인덱스는 DDL 자동 생성이 못 한다).
- pgvector의 `vector` 타입 HNSW 인덱스는 **최대 2000차원** 제한이 있다 (그 이상은 `halfvec` 등 고려). 임베딩 모델 선택 시 차원을 확인할 것.

### 6. Spring AI `PgVectorStore`를 쓸까?

- `PgVectorStore`는 JdbcTemplate 기반이며 기본 테이블(`vector_store`: content, metadata, embedding)을 사용한다. **하이브리드(벡터 + FTS) 검색은 공식 문서상 기본 제공되지 않는다** (공식 문서는 벡터 유사도 중심).
- 따라서:
  - **방안 A**: `PgVectorStore`를 그대로 쓰고 같은 테이블에 `tsvector` 컬럼을 추가한 뒤, 하이브리드는 별도 네이티브 쿼리로 구현
  - **방안 B (권장)**: 위 5장의 자체 스키마 + JPA/네이티브 쿼리, Spring AI는 `EmbeddingModel`, `ChatClient`, `TokenTextSplitter`, `DocumentRetriever`(커스텀 구현) 중심으로 사용. 메타데이터 필터·문서 버전·삭제 같은 도메인 요구를 다루기 쉽다
- 시범이라면 A로 빠르게 시작해 B로 이동하는 길도 가능하지만, 스키마 이관 비용을 생각하면 처음부터 B가 낫다.

### 7. 하이브리드 검색과 한국어 FTS

**검색 흐름**: 질의 → (a) 벡터 top-k, (b) FTS top-k → **RRF(Reciprocal Rank Fusion)** 로 병합 → (선택) 리랭커 → LLM 컨텍스트

```sql
-- RRF 개념 예시 (k=60)
WITH v AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> :qvec) AS r
  FROM document_chunk ORDER BY embedding <=> :qvec LIMIT 20),
f AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank_cd(tsv, q) DESC) AS r
  FROM document_chunk, websearch_to_tsquery('simple', :q) q
  WHERE tsv @@ q LIMIT 20)
SELECT COALESCE(v.id, f.id) AS id,
       COALESCE(1.0/(60+v.r),0) + COALESCE(1.0/(60+f.r),0) AS score
FROM v FULL JOIN f ON v.id = f.id
ORDER BY score DESC LIMIT 10;
```

**한국어 FTS 선택지** (Postgres 기본 FTS는 한국어 형태소 분석기가 없다)

| 방식 | 특징 | 비고 |
|---|---|---|
| **pg_bigm** | 2-gram 인덱스로 `LIKE '%..%'` 가속, CJK 대응 | 설치 간단, AWS RDS 지원 사례 있음. 랭킹 기능은 약함 |
| **PGroonga** | Groonga 기반, CJK 전반 지원, 풍부한 쿼리 문법 | 확장 설치 필요, 관리형 DB 지원 여부 확인 |
| **textsearch_ko (mecab-ko)** | 형태소 분석 기반 `tsvector` | 사전·빌드 관리 부담, 셀프 호스팅 전제 |
| **앱단 토크나이징** | Lucene Nori 등으로 형태소 분리 후 공백 구분 텍스트를 `simple` 설정으로 `tsvector` 저장 (질의도 같은 방식으로 분리) | DB 확장 불필요, 이식성 높음. 색인/질의 토크나이저 일치 필요 |

- 규정 문서는 **조항 번호, 고유 용어, 약어**가 중요해 키워드 검색의 이점이 크다 (벡터만으로는 "제12조 2항" 같은 질의에 약함).
- 선택 기준: **운영할 Postgres가 셀프 호스팅인지 관리형(RDS 등)인지**. 관리형이면 허용 확장 목록을 먼저 확인.

### 8. 임베딩 모델 미정 시 대응

- `EmbeddingModel` 추상화(Spring AI)로 호출부를 고정하고, 설정으로 모델 교체
- `embedding_model` 컬럼에 모델명 기록, 차원 변경 시 컬럼/인덱스 재생성 + **전체 재임베딩** 필요 → 원본/청크 텍스트를 항상 보관
- 한국어 규정 문서이므로 **다국어/한국어 성능**, 차원(저장·인덱스 비용), 사내 반출 가능 여부(온프레미스 vs 외부 API)가 선정 기준
- 모델 비교를 위해 소규모 **평가셋(질문 → 정답 조항)** 을 만들어 recall@k로 측정하는 것을 권장

### 9. 단계별 진행 제안

1. 실제 xlsx 구조 분석 → `ParsedDocument` 스키마 확정
2. Flyway로 스키마 생성, `XlsxPolicyParser`(POI) + 단위 테스트(병합 셀 케이스 포함)
3. 업로드 엔드포인트 + 비동기 인제스트 + 임베딩 저장
4. 벡터 검색 → FTS 추가 → RRF 하이브리드
5. 평가셋으로 청킹/임베딩/가중치 튜닝
6. 이후 문서 유형 추가 시 `DocumentParser` 구현체만 확장

### 10. 확인이 필요한 항목

- xlsx의 시트/컬럼 구성, 병합 셀·수식 사용 여부, 규정 개정 이력 표기 방식
- Postgres 운영 형태(관리형/셀프) → FTS 확장 선택에 직결
- Spring Boot / Spring AI 버전 (검색 결과상 Spring AI는 1.1.x 안정 라인과 2.0 마일스톤이 공존 — 사용할 버전의 문서 기준으로 API 확인)
- 접근 권한(부서별 열람 제한) 요구 여부

Sources:
- [Spring AI PGvector 문서](https://docs.spring.io/spring-ai/reference/1.0/api/vectordbs/pgvector.html)
- [Spring AI ETL Pipeline](https://docs.spring.io/spring-ai/reference/api/etl-pipeline.html)
- [Embabel RAG pgvector (tsvector + pg_trgm 하이브리드 예시)](https://github.com/embabel/embabel-rag-pgvector)
- [dhatim/fastexcel](https://github.com/dhatim/fastexcel)
- [Java Excel 라이브러리 비교 (POI/EasyExcel/FastExcel)](https://www.pistack.xyz/posts/2026-08-28-java-excel-libraries-apache-poi-easyexcel-fastexcel-comparison/)
- [AWS RDS pg_bigm 지원](https://aws.amazon.com/about-aws/whats-new/2021/04/amazon-rds-for-postgresql-supports-pg-bigm-extension-for-faster-full-text-search)
- [PGroonga (pigsty)](https://ext.pigsty.io/e/pgroonga_database/)
- [textsearch_ko (mecab-ko)](https://hub.docker.com/r/karoid/postgres-textsearch_ko)
