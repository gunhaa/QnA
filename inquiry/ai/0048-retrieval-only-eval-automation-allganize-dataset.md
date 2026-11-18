# LLM 없이 Retrieve만 평가하는 자동화 설계 (Allganize RAG-Evaluation-Dataset-KO 기반)

> 전제: 평가 시점에 LLM API(Claude 등)를 쓸 수 없다. 생성(Generation)은 평가하지 않고 **검색(Retrieve) 결과만** 자동으로 채점한다.

## 쉬운 설명

시험 문제(질문)마다 "정답이 적힌 문장"에 미리 형광펜을 한 번 칠해 둔다. 그 뒤로는 검색기가 가져온 종이에 형광펜 문장이 들어 있는지만 기계가 확인한다. 채점에 선생님(LLM)은 필요 없다.

## 일반 설명

### 1. 핵심 아이디어: "정답셋은 1회 구축, 채점은 결정적(deterministic)"

| 단계 | 빈도 | LLM 필요 | 비고 |
|---|---|---|---|
| 정답 근거(evidence) 라벨링 | **1회** (데이터 추가 시만) | 불필요 (규칙 + 사람 검수) | 300문항이면 사람 검수가 현실적 |
| 검색 실행 + 채점 | **매 실험/매 커밋** | 불필요 | 문자열/페이지 매칭 + IR 지표 |

LLM-judge 대신 **사전에 고정한 근거 텍스트(evidence span)** 와 비교하므로 비용 0, 재현성 100%, CI에 넣기 쉽다.

### 2. 정답 판정 기준: 3단계(느슨 → 엄격)

데이터셋이 주는 gold는 `target_file_name` + `target_page_no` + `target_answer`뿐이고 **청크 단위 정답은 없다.** 따라서 판정 레벨을 3개로 나눠 함께 본다.

| 레벨 | hit 조건 | 의미 |
|---|---|---|
| L1 문서 | 청크의 `file_name == gold_file` | 맞는 문서를 찾았나 |
| L2 페이지 | 청크 페이지 ∩ `gold_pages` ≠ ∅ | 맞는 위치 근처까지 갔나 |
| L3 근거(span) | 청크가 evidence 텍스트를 θ 이상 포함 | **답을 실제로 담은 청크인가** (가장 중요) |

- **청크 ID로 정답을 고정하지 않는다.** 청킹/파서를 바꿀 때마다 정답셋이 무효화되기 때문이다. L1~L3 모두 "메타데이터 + 텍스트" 기반이라 청킹 전략이 바뀌어도 정답셋을 재사용할 수 있다.
- L2는 높은데 L3가 낮으면 → 청크가 너무 크거나 작음, 리랭커 정밀도 부족.
- L1도 낮으면 → 임베딩/하이브리드 검색 자체 문제.

### 3. 정답셋 구축 (LLM 없이)

#### 3-1. 스키마 (JSONL 권장)

```json
{
  "qid": "finance-007",
  "domain": "finance",
  "query": "…question 원문…",
  "gold_file": "xxx.pdf",
  "gold_pages": [12, 13],
  "context_type": "table",
  "answer": "…target_answer…",
  "evidence": ["…PDF 원문에서 잘라낸 근거 문장/표 행…"],
  "review": "auto|human_ok|human_fixed|excluded"
}
```

- `target_page_no`는 범위/복수 값이 섞여 있으므로 **정수 집합으로 정규화**한다.
- `query`는 `question` 원문 그대로 쓴다. 쿼리 재작성(rewrite)을 쓰고 있다면 그건 평가 대상 시스템 내부 단계로 취급한다.

#### 3-2. evidence 자동 후보 추출 → 사람 검수

`target_answer`는 PDF 문장을 그대로 복사한 게 아니라 **답변 문장**이라 정확 일치가 안 된다. 그래서 다음 순서로 후보를 뽑고 사람이 확정한다.

1. **gold 페이지 원문 추출**: 운영 파서와 독립적인 "기준 추출기"(예: PyMuPDF, pdfplumber 텍스트)로 페이지 텍스트를 뽑는다. 운영 파서를 쓰면 파서 오류가 정답셋에 섞인다.
2. **슬라이딩 윈도우 매칭**: 페이지를 문장/1~3문장 윈도우로 자르고, `answer`와의 **문자 bigram 재현율**(또는 형태소 기반 토큰 재현율)이 가장 높은 윈도우를 후보로 선정한다.
   - 한국어는 조사 때문에 공백 토큰 매칭이 약하다 → **문자 n-gram** 또는 Kiwi 같은 형태소 분석기 사용.
   - 숫자·단위·고유명사(금액, 날짜, 조항 번호)는 가중치를 높이면 정확도가 오른다.
3. **(선택) 로컬 Cross-encoder 보조**: `bge-reranker-v2-m3` 같은 리랭커는 생성형 LLM이 아니고 로컬 GPU/CPU로 돌아간다. (query, 윈도우) 점수를 2번 점수와 합쳐 후보 순위를 보정할 수 있다.
4. **사람 검수**: 300문항 × 후보 1~3개를 화면에 띄워 확인/수정/제외만 클릭하는 간단한 검수 UI(또는 스프레드시트)로 처리한다. 수 시간 수준이다.
   - `context_type = image`: 이미지 안의 정보라 텍스트 추출로는 근거가 안 나온다 → 사람이 이미지 내용을 텍스트로 옮겨 evidence로 넣거나, L1/L2로만 채점하고 `l3_excluded` 표시.
   - `context_type = table`: 표의 해당 행/셀 텍스트를 evidence로.

> 참고: 정답셋 라벨링은 1회성 작업이므로, API가 없어도 Claude Code 같은 대화형 도구로 후보 검수를 보조받는 것은 가능하다. 단, **평가 루프 자체에는 LLM이 들어가지 않는다.**

### 4. 채점 함수

```python
def bigrams(s):
    s = "".join(s.split())          # 공백 제거 (한국어 띄어쓰기 편차 흡수)
    return {s[i:i+2] for i in range(len(s) - 1)}

def coverage(evidence, chunk_text):
    e = bigrams(evidence)
    return len(e & bigrams(chunk_text)) / max(len(e), 1)

def grade(chunk, gold, theta=0.8):
    """반환: 2 = 근거 포함, 1 = 같은 페이지, 0 = 무관 (nDCG용 graded relevance)"""
    if chunk.file_name != gold["gold_file"]:
        return 0
    if gold["evidence"] and max(coverage(ev, chunk.text) for ev in gold["evidence"]) >= theta:
        return 2
    if set(chunk.pages) & set(gold["gold_pages"]):
        return 1
    return 0
```

- θ(0.7~0.8)는 검수한 50문항 정도로 **사람 판정과 일치도가 가장 높은 값**으로 보정한다.
- evidence가 청크 경계에 걸려 쪼개질 수 있다 → "top-k 청크들의 합집합 coverage ≥ θ"를 별도 지표(**Context Recall@k**)로 함께 계산하면 청킹 문제를 잡아낼 수 있다.
- **청크 메타데이터에 `file_name`, `pages`(리스트)를 반드시 보존**해야 이 판정이 가능하다. 인제스트 단계 요구사항으로 고정한다.

### 5. 지표

| 지표 | 설명 | 주 용도 |
|---|---|---|
| **Hit@k** (L1/L2/L3 각각) | top-k에 정답이 하나라도 있으면 1 | 가장 직관적인 대표 지표 |
| **MRR@k** | 첫 정답 순위의 역수 평균 | 랭킹 품질 (리랭커 효과) |
| **nDCG@k** | grade 2/1/0 graded relevance | 근거 청크를 페이지 청크보다 위에 놓는지 |
| **Context Recall@k** | top-k 합집합의 evidence coverage | 근거가 여러 청크로 쪼개진 경우 |
| Latency p50/p95 | 검색 응답 시간 | 품질-속도 트레이드오프 |

- k는 실제 LLM에 넣는 컨텍스트 개수 기준으로 잡는다 (예: k = 3, 5, 10). 리랭커가 있으면 1차 검색 k=50~100의 Recall도 따로 본다.
- **반드시 `domain` × `context_type`별로 분리 집계**한다. 평균 하나만 보면 표/이미지 문항 실패가 묻힌다.
- 계산은 직접 구현해도 되지만 [ranx](https://pypi.org/project/ranx/)나 [pytrec_eval](https://github.com/eXascaleInfolab/pytrec_eval)로 qrels/run 형식을 맞추면 지표 정의 오류를 피할 수 있다. ranx는 **실험 간 통계적 유의성 검정(compare)** 도 지원한다.

### 6. 실패 원인 자동 분류 (LLM 없이 가능한 핵심 진단)

L3 miss가 난 문항을 규칙으로 분류하면 "어디를 고쳐야 하는지"가 자동으로 나온다.

```
1) 파싱 실패   : 인덱스 전체에서 gold 문서의 어떤 청크도 evidence coverage ≥ θ 가 아님
                 → 파서(표/OCR/레이아웃) 문제. 검색을 아무리 고쳐도 못 맞춤
2) 청킹 실패   : 단일 청크로는 θ 미달이지만 인접 청크 합치면 θ 이상
                 → 청크 크기/오버랩 문제
3) 검색 실패   : 근거 청크가 존재하지만 1차 검색 top-100에 없음
                 → 임베딩/하이브리드(BM25 가중치)/쿼리 처리 문제
4) 랭킹 실패   : top-100엔 있으나 top-k 밖
                 → 리랭커/스코어 융합 문제
```

이 분포를 `context_type`별로 보면 예컨대 "image 문항 실패의 90%가 파싱 실패" 같은 결론이 바로 나온다.

### 7. 자동화 솔루션 구조

```
[실험 설정 YAML]  parser / chunk_size·overlap / embedding / BM25 가중치 / reranker / top_k
        │  (config hash)
        ▼
[Ingest Runner]   설정별로 격리된 컬렉션/스키마(예: pgvector 테이블·네임스페이스)에 적재
        │         ※ 동일 설정이면 캐시 재사용 (임베딩이 가장 비쌈)
        ▼
[Query Runner]    gold.jsonl의 query → 운영과 같은 검색 API(HTTP) 호출 → top-100 저장
        │         run.jsonl: qid, rank, chunk_id, score, file_name, pages, text
        ▼
[Scorer]          grade() → qrels/run → Hit/MRR/nDCG/Context Recall + 실패 분류
        ▼
[Report]          config hash, git SHA, 데이터셋 버전과 함께 결과 저장
                  baseline 대비 diff + 유의성 검정(paired bootstrap / randomization test)
                  문항별 회귀 목록(이전엔 맞고 지금 틀린 qid)
        ▼
[CI Gate]         L3 Hit@5가 baseline 대비 X%p 이상 하락하면 실패 처리
```

설계 포인트:

- **검색 시스템은 HTTP API로 호출**하면 평가기는 언어 독립적이다. 서비스가 Java/Spring AI여도 평가기는 Python(ranx 활용)으로 두는 구성이 간단하다.
- **run 결과에 청크 텍스트까지 저장**해 두면, θ나 정답셋을 수정했을 때 검색을 다시 돌리지 않고 재채점만 할 수 있다.
- **문항별 diff**가 평균 점수보다 중요하다. 300문항에서 1문항은 약 0.33%p라 평균 변화는 잡음일 수 있다 → 신뢰구간과 회귀 문항 목록을 같이 출력한다.
- **방해 문서(distractor) 추가 옵션**: 58개 문서만으로는 검색이 쉬워 점수가 부풀려진다. 사내 문서를 섞은 "hard" 인덱스를 별도로 두면 실서비스에 가까운 수치가 나온다.

### 8. 데이터셋 보완/대안

- **AutoRAGRetrieval (MTEB / NanoMTEB-Korean)**: 같은 5개 도메인 PDF를 파싱·청킹해 **쿼리당 정답 청크 1개 qrels가 이미 붙어 있는** 검색 데이터셋이다. 청킹이 고정되어 있어 **파서/청킹 평가에는 못 쓰지만, 임베딩 모델·BM25·리랭커만 비교**할 때는 라벨링 없이 바로 쓸 수 있다.
- **사내 데이터 추가**: 같은 스키마(query, file, pages, evidence)로 사내 문서 질문을 수십 개만 추가해도 도메인 적합성이 크게 오른다. 라벨링 절차는 3장과 동일하다.

### 9. 추천 진행 순서

1. 인제스트 시 청크 메타데이터(`file_name`, `pages`) 보존 확인
2. gold.jsonl 생성 (페이지 정규화 + evidence 자동 후보 + 사람 검수)
3. L1/L2만으로 먼저 baseline 측정 (evidence 없이도 즉시 가능)
4. evidence 확정 후 L3, Context Recall, 실패 분류 추가
5. 설정 매트릭스 실험 자동화 → baseline 고정 → CI 회귀 게이트
6. distractor 인덱스, 사내 질문 추가로 난이도 현실화

## Sources

- [allganize/RAG-Evaluation-Dataset-KO (Hugging Face)](https://huggingface.co/datasets/allganize/RAG-Evaluation-Dataset-KO)
- [NanoMTEB-Korean / autorag (AutoRAGRetrieval)](https://hakari-bench-leaderboard.hf.space/docs/benchmark-tasks/NanoMTEB-Korean/autorag)
- [AutoRAG retrieval_gt 개념 (Marker-Inc-Korea)](https://edai.notion.site/Retrieval-Metrics-dde3d9fa1d9547cdb8b31b94060d21e7)
- [AutoRAG Retrieval Token Metrics](https://edai.notion.site/Retrieval-Token-Metrics-c3e2d83358e04510a34b80429ebb543f)
- [ranx (PyPI)](https://pypi.org/project/ranx/0.1.9)
- [pytrec_eval (GitHub)](https://github.com/eXascaleInfolab/pytrec_eval)
- [Weaviate – Retrieval evaluation metrics](https://weaviate.io/blog/retrieval-evaluation-metrics)
