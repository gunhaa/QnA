# pg_bigm이란? 일반 LIKE 검색과의 차이

## 쉬운 설명

책에서 "연차"라는 글자가 들어간 쪽을 찾는다고 해봐. 일반 `LIKE`는 **책을 첫 쪽부터 끝까지 다 넘겨보는 것**이고, pg_bigm은 **"두 글자 짝꿍 색인"을 미리 만들어둔 것**이라 "연차"가 적힌 쪽만 바로 펼쳐. 대신 이 색인은 글자가 있는지만 알려줄 뿐, 어떤 쪽이 더 중요한지(순위)는 몰라.

## 일반 설명

### 1. pg_bigm 개요

- PostgreSQL 확장(extension). **2-gram(bigram) GIN 인덱스**로 `LIKE '%키워드%'` 검색을 가속한다.
- 문자열을 연속 2글자 단위로 쪼개 색인한다. 예: `ABC` → ` A`, `AB`, `BC`, `C `. 한국어 `연차휴가` → `연차`, `차휴`, `휴가`.
- 한국어·일본어·중국어처럼 공백으로 단어가 나뉘지 않는 언어(비알파벳 언어)를 위해 만들어졌다 (일본에서 개발, 일본어 검색이 출발점).
- 라이선스는 PostgreSQL 라이선스(BSD 계열).

### 2. 일반 LIKE와의 차이

| 항목 | 일반 `LIKE '%x%'` | pg_bigm + `LIKE` |
|---|---|---|
| 중간 일치(`%x%`) 인덱스 사용 | **불가** (B-tree는 접두사 `x%`만 가능, 그것도 `text_pattern_ops`/C collation 조건) → 전체 테이블 스캔 | **가능** (GIN 역색인으로 후보 행만 조회) |
| 쿼리 문법 | `LIKE` | **동일** (쿼리 수정 없이 인덱스만 추가) |
| 결과 정확도 | 정확 | 정확 (인덱스로 후보를 좁힌 뒤 **recheck**로 거짓 양성 제거) |
| 데이터 증가 시 | 선형으로 느려짐 | 후보 수에 비례 |
| 쓰기 비용 | 없음 | GIN 갱신 비용, 인덱스 크기 큼 |

**동작 흐름**

```
질의 '%연차휴가%'
  → 비교어를 bigram으로 분해: 연차, 차휴, 휴가
  → GIN에서 세 bigram을 모두 포함하는 행 후보 조회
  → recheck: 후보 행에 실제 LIKE 적용 (순서/인접 보장)
  → 결과
```

### 3. 사용법

```sql
CREATE EXTENSION pg_bigm;

CREATE INDEX idx_chunk_content_bigm
  ON document_chunk USING gin (content gin_bigm_ops);

-- 기존 LIKE 그대로 사용
SELECT id, content FROM document_chunk WHERE content LIKE '%연차휴가%';

-- 사용자 입력은 likequery()로 변환 (%, _, \ 이스케이프 + 양옆 % 부착)
SELECT id, content FROM document_chunk WHERE content LIKE likequery(:keyword);
```

- `likequery(text)`: 검색어를 안전한 LIKE 패턴으로 변환한다. 사용자 입력을 그대로 `LIKE`에 넣으면 `%`·`_`가 와일드카드로 해석되므로 쓰는 것이 좋다.
- 유사도 검색: `bigm_similarity(a, b)`(0~1)와 `=%` 연산자, 임계값 `pg_bigm.similarity_limit`(기본 0.3).
- 보조 함수: `show_bigm(text)`(bigram 목록 확인), `pg_gin_pending_stats()`.
- 설정: `pg_bigm.enable_recheck`(기본 on), `pg_bigm.gin_key_limit`(검색에 쓸 최대 bigram 수).

### 4. 장점

- **짧은 키워드(1~2글자)도 빠르다.** pg_trgm(3-gram)은 3글자 미만에서 느리다. 한국어는 "연차", "휴가", "급여"처럼 2글자 단어가 많아 유리하다.
- 형태소 사전이 필요 없다 → 신조어, 사내 약어, 복합어, 오타에도 대응.
- 기존 `LIKE` 쿼리를 그대로 가속 → JPA 네이티브 쿼리/Specification에서 쉽게 사용.
- 관리형 DB 지원 사례가 있다 (AWS RDS for PostgreSQL 등. 사용할 환경에서 **허용 확장 목록과 PG 버전을 직접 확인**할 것).

### 5. 한계 (RAG에서 특히 중요)

| 한계 | 설명 |
|---|---|
| **랭킹 없음** | 일치 여부만 판단. BM25처럼 중요도 점수를 주지 않는다. RRF 병합에는 `bigm_similarity()` 등으로 정렬 기준을 직접 만들어야 한다 |
| **형태소 이해 없음** | 조사/어미 처리 없이 부분 문자열 일치만 본다. "연차를"을 검색하면 "연차가"는 안 나온다. 검색어에서 어간(명사)만 뽑아 넣어야 한다 |
| **자연어 질문에 약함** | RAG 질의는 "연차를 이월할 수 있나요?" 같은 문장이다. 이 전체를 `LIKE`로 쓰면 거의 안 맞는다 → **질의에서 핵심 키워드 추출**(형태소 분석 또는 LLM)이 필요하고, 결국 질의 쪽 형태소 분석이 다시 필요해진다 |
| 노이즈 | 부분 문자열이라 의도 밖 일치가 생긴다 (예: "규정"이 "비규정적"에도 일치) |
| 대소문자 구분 | `ILIKE`는 가속되지 않는다 (필요하면 `lower()` 함수 인덱스로 우회) |
| 인덱스 크기·쓰기 비용 | bigram이 위치마다 생겨 GIN이 커지고, 대량 적재 시 갱신이 느리다 (`fastupdate`/pending list 영향) |
| 컬럼 크기 제한 | 색인 컬럼 최대 약 102MB. 청크 단위 저장이면 문제 없음 |
| 플래너 판단 | 키워드가 너무 흔하거나 너무 짧으면 순차 스캔을 택할 수 있다 → `EXPLAIN`으로 확인 |

### 6. pg_trgm / tsvector와 비교

| 항목 | pg_bigm | pg_trgm | 기본 FTS(tsvector) |
|---|---|---|---|
| 단위 | 2-gram | 3-gram | 사전 기반 lexeme |
| 지원 연산자 | `LIKE`(+유사도 `=%`) | `LIKE`, `ILIKE`, 정규식, 유사도 | `@@` |
| 인덱스 | GIN | GIN, GiST | GIN, GiST |
| 1~2글자 검색 | 빠름 | 느림 | 토큰 단위라 무관 |
| 한국어 | 부분 문자열 일치(형태소 없음) | 한글 3-gram은 효율 낮음 | **기본 설정은 한국어 형태소 없음** → 별도 분석기 필요 |
| 랭킹 | 없음(유사도로 대체) | 유사도 | `ts_rank` 등 |

### 7. RAG 프로젝트에서의 위치

- pg_bigm은 **정확한 키워드/조항번호/고유명사 매칭 후보를 싸게 뽑는 장치**로 적합하다. 예: "제12조", "연차휴가", 약어.
- 단, 랭킹이 없고 자연어 질의에 약해서 **단독 FTS로는 BM25급 품질이 나오지 않는다.** 하이브리드에서는 dense 벡터 검색이 의미를 담당하고 pg_bigm이 키워드 보강을 맡는 구성이 현실적이다.
- 품질이 더 필요하면 형태소 분석(앱단 Nori/Kiwi로 `tsvector` 생성)을 추가하거나 교체한다. 앞선 [설계 문서](../rag-implementation/rag-internal-policy-xlsx-ingestion-design.md) 7장과 [임베딩 선택 문서](../rag-implementation/korean-rag-embedding-model-selection-vs-bpe.md) 참고.
- 도입 판단 순서: ① 운영 DB가 pg_bigm을 허용하는지 확인 → ② 시범 데이터로 `EXPLAIN`·recall 측정 → ③ 키워드 추출 방식(질의 전처리) 결정.

Sources:
- [pg_bigm 공식 문서(GitHub, REL1_2_STABLE)](https://github.com/pgbigm/pg_bigm/blob/REL1_2_STABLE/docs/pg_bigm_en.md)
- [pg_bigm (Nile docs)](https://thenile.dev/docs/extensions/pg_bigm)
- [pg_bigm (Pigsty)](https://pigsty.io/ext/e/pg_bigm/)
- [comparison of pg_bigm and pg_trgm (pgbigm-hackers)](https://osdn.net/projects/pgbigm/lists/archive/hackers/2015-August/000296.html)
- [AWS RDS for PostgreSQL pg_bigm 지원](https://aws.amazon.com/about-aws/whats-new/2021/04/amazon-rds-for-postgresql-supports-pg-bigm-extension-for-faster-full-text-search)
