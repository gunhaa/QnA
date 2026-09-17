# 컬럼 지향 DB vs 로우 지향 DB — 극적인 성능 차이는 어떤 "방향성"에서 나오는가

## 쉬운 설명

교실에 학생 1,000명의 신상카드가 있다고 해봅시다.

**로우(행) 방식**은 카드 한 장에 한 학생의 모든 정보(이름·나이·키·몸무게·주소…)를 적어서 **1,000장을 쌓아두는 것**입니다. "철수 정보 다 줘"는 카드 한 장만 뽑으면 되니까 엄청 빠릅니다.

**컬럼(열) 방식**은 **"이름만 적은 종이 1장, 나이만 적은 종이 1장, 키만 적은 종이 1장"** 으로 나눠서 보관하는 것입니다. "전교생 평균 키"를 구하려면 **키 종이 한 장만** 꺼내면 됩니다. 이름도 주소도 쳐다볼 필요가 없어요.

여기서 마법이 세 개 더 생깁니다:

1. **덜 읽는다** — 50개 항목 중 1개만 필요하면 진짜로 1개만 읽습니다.
2. **잘 눌린다** — 키 종이에는 숫자만 쭉 있으니 "160, 161, 162…"처럼 비슷한 게 모여서 압축이 훨씬 잘 됩니다. 이름과 주소가 뒤섞인 카드는 그만큼 안 눌립니다.
3. **한 번에 여러 개 센다** — 같은 종류 숫자가 나란히 있으니, 계산기가 **한 번 누를 때 8개씩** 처리할 수 있습니다.

이 세 가지가 **곱해져서** 100배 차이가 납니다. 반대로 "철수 한 명 정보 수정"은 종이 50장을 다 찾아서 고쳐야 하니 컬럼 방식이 훨씬 느립니다.

---

## 일반 설명

### 0. 결론부터 — 성능 차이의 정체

컬럼 지향이 분석 쿼리에서 로우 지향보다 10~100배 빠른 것은 **하나의 뛰어난 최적화 때문이 아니라, 서로 곱해지는 네 개의 독립된 효과 때문**입니다.

```
  최종 성능비 ≈ (읽는 바이트 감소) × (압축률) × (CPU 사이클당 처리량) × (실행 전략 이득)
                    ↑ 컬럼 프루닝        ↑ 동질 데이터    ↑ 벡터화/SIMD/캐시    ↑ late materialization 등
                    5~20배              5~30배          3~10배               1.5~3배
```

각 항이 몇 배씩만 기여해도 곱하면 두 자릿수~세 자릿수가 됩니다. **그리고 이 네 효과의 근원은 전부 하나의 결정에서 파생됩니다 — "같은 컬럼의 값들을 물리적으로 연속 배치한다"** 는 것.

즉 이 질문의 답은 이렇습니다:

> **컬럼 지향은 "데이터 배치 방향을 90도 회전시킨" 단 하나의 결정이고, 나머지 모든 성능 이점은 그 결정이 열어준 파생 효과다.**

반대로 로우 지향이 OLTP에서 이기는 이유도 동일한 논리의 반대편입니다 — **한 레코드의 모든 필드가 물리적으로 붙어 있다**는 결정에서 파생됩니다.

---

### 1. 물리적 저장 구조 — 무엇이 실제로 다른가

#### 저장 모델의 세 가지 분류

학술적으로는 세 모델로 분류합니다.

**(1) NSM (N-ary Storage Model) = 로우 지향**

```
  논리적 테이블
  ┌──────┬──────┬───────┬─────────┐
  │ id   │ name │ age   │ salary  │
  ├──────┼──────┼───────┼─────────┤
  │ 1    │ 철수  │ 30    │ 5000    │
  │ 2    │ 영희  │ 28    │ 5500    │
  │ 3    │ 민수  │ 35    │ 6200    │
  └──────┴──────┴───────┴─────────┘

  디스크 페이지(8KB) 안의 실제 바이트 배열:
  ┌─────────────────────────────────────────────────────────────┐
  │ [1|철수|30|5000] [2|영희|28|5500] [3|민수|35|6200] ...        │
  └─────────────────────────────────────────────────────────────┘
     └─── 한 행이 통째로 연속 ───┘

  대표: PostgreSQL, MySQL/InnoDB, Oracle, SQL Server(기본)
```

**(2) DSM (Decomposition Storage Model) = 순수 컬럼 지향**

```
  id.bin     : [1][2][3]...
  name.bin   : [철수][영희][민수]...
  age.bin    : [30][28][35]...
  salary.bin : [5000][5500][6200]...
     └─ 각 컬럼이 독립 파일/독립 연속 영역 ─┘

  대표: ClickHouse, Vertica, MonetDB, 초기 C-Store
```

**(3) PAX (Partition Attributes Across) = 하이브리드**

```
  파일을 먼저 "행 그룹(row group)"으로 수평 분할하고,
  각 행 그룹 안에서만 컬럼별로 저장.

  ┌─ Row Group 1 (예: 100만 행) ──────────────────┐
  │  [id 컬럼 청크][name 컬럼 청크][age 청크]...    │
  ├─ Row Group 2 ─────────────────────────────────┤
  │  [id 컬럼 청크][name 컬럼 청크][age 청크]...    │
  └───────────────────────────────────────────────┘

  대표: Apache Parquet, ORC, Snowflake, Databricks, BigQuery, DuckDB
```

> **2026년의 실질적 표준은 PAX입니다.** 검색 결과에 따르면 Snowflake, Databricks, BigQuery, DuckDB가 전부 PAX 변형으로 수렴했습니다. 이유는 **순수 DSM의 단점 두 가지를 해소**하기 때문입니다:
> - **튜플 재조립 비용** — 순수 DSM에서 100번째 행 전체를 복원하려면 N개 파일의 100번째 위치를 각각 찾아야 합니다. PAX는 같은 행 그룹 안에 있으므로 지역성이 유지됩니다.
> - **병렬 분할** — 행 그룹 단위로 파일을 쪼개면 워커에 깔끔하게 분배됩니다. DuckDB는 이 구조를 이용해 각 컬럼 청크를 별도 스레드로 디코딩합니다.

#### 핵심 통찰 — "행"과 "열"은 논리 개념이지 물리 개념이 아니다

SQL 테이블은 논리적으로는 2차원 배열입니다. 그런데 **디스크와 메모리는 1차원**입니다. 따라서 2차원을 1차원으로 펴는 순서를 정해야 하고, 그 선택이 전부입니다.

```
  같은 논리 테이블, 다른 직렬화 순서

  row-major:  A1 B1 C1  A2 B2 C2  A3 B3 C3   ← 행 우선
  column-major: A1 A2 A3  B1 B2 B3  C1 C2 C3 ← 열 우선
```

이것은 사실 **NumPy 배열의 C-order vs Fortran-order, 행렬 곱 최적화의 루프 순서 문제와 동일한 문제**입니다. 데이터베이스만의 특수 주제가 아니라 "메모리 접근 패턴과 알고리즘의 접근 순서를 일치시켜라"라는 일반 원리의 한 사례입니다.

---

### 2. 성능 차이의 동인 ① — I/O 축소 (읽는 바이트 자체를 줄인다)

#### (a) 컬럼 프루닝 (Column Pruning / Projection Push-down)

가장 직관적이고 가장 큰 단일 효과입니다.

**예시:** 200개 컬럼, 10억 행짜리 이벤트 테이블. 행 하나가 평균 400바이트 → 총 400GB.

```sql
SELECT country, COUNT(*) FROM events GROUP BY country;
```

| | 읽어야 하는 데이터 |
|---|---|
| **로우 지향** | 페이지 단위로 읽으므로 **400GB 전부**. country 컬럼(2바이트)만 필요한데 나머지 398바이트를 강제로 함께 읽음 |
| **컬럼 지향** | `country.bin`만 = 2바이트 × 10억 = **2GB** (압축 전) |

**200배 차이가 압축·SIMD 이전에 이미 발생합니다.**

> **왜 로우 지향은 이걸 못 하나:** 디스크와 OS의 최소 I/O 단위가 페이지/블록(4~16KB)이기 때문입니다. 한 컬럼만 읽고 싶어도 그 컬럼이 속한 행 전체가 같은 페이지에 있으므로 페이지를 통째로 읽을 수밖에 없습니다. 이건 구현 게으름이 아니라 **물리적 배치의 필연**입니다.

#### (b) 압축률의 구조적 우위

**압축은 엔트로피가 낮을수록(=중복·패턴이 많을수록) 잘 됩니다.**

```
  로우 지향의 한 페이지 안:
  [1|"철수"|30|5000|"2026-01-15"|true|3.14|"서울시 강남구..."] ...
   ↑int ↑string ↑int ↑int  ↑date    ↑bool ↑float ↑string
   → 타입도 값 분포도 제각각. 압축기가 찾을 패턴이 적음.  보통 2~3배

  컬럼 지향의 age.bin:
  [30][28][35][31][29][33][30][28][34]...
   → 전부 같은 타입, 좁은 값 범위, 종종 정렬됨.        보통 10~30배
```

검색 결과 기준 실측: **컬럼 지향은 로우 대비 10~30배 압축이 일상적이고, 5~10배는 흔하게 관측**됩니다.

**컬럼 지향만 쓸 수 있는 인코딩들:**

| 인코딩 | 원리 | 잘 먹히는 데이터 |
|---|---|---|
| **RLE (Run-Length)** | `AAAAABBB` → `A×5, B×3` | 정렬된 컬럼, 카디널리티 낮은 컬럼(성별, 상태코드) |
| **Dictionary** | 문자열 → 작은 정수 ID로 치환 후 사전 별도 저장 | 반복되는 문자열(국가명, URL 도메인, 사용자 에이전트) |
| **Delta** | 값 대신 이전 값과의 차이 저장 | 타임스탬프, 단조 증가 ID |
| **FOR (Frame of Reference)** | 블록 최솟값을 빼고 남은 작은 수만 저장 | 좁은 범위에 몰린 정수 |
| **Bit-packing** | 최댓값이 1000이면 10비트만 사용(32비트 대신) | 범위가 제한된 정수 |
| **Gorilla / XOR** | 연속 부동소수점의 XOR 결과가 대부분 0인 성질 이용 | 센서 값, 메트릭 |

**이 인코딩들은 "같은 종류 값이 연속으로 붙어 있어야" 성립합니다.** 로우 지향에서는 값 사이사이에 다른 타입이 끼어 있어 원천적으로 적용 불가입니다. 즉 **압축률 차이는 튜닝의 문제가 아니라 배치 방향의 필연적 결과**입니다.

> **인코딩 체이닝:** 타임스탬프 컬럼에 `Delta → Bit-packing → LZ4`를 순서대로 걸면 각 단계가 다른 종류의 중복을 제거해 압축률이 곱해집니다. 이 저장소의 [`database/clickhouse/clickhouse-strengths-columnar-and-replica.md`](./clickhouse/clickhouse-strengths-columnar-and-replica.md)에서 ClickHouse의 코덱 체이닝 사례를 다룹니다.

#### (c) 압축 해제 없이 연산하기 (Operating on Compressed Data)

컬럼 지향의 숨은 무기입니다. **일부 연산은 압축을 풀지 않고도 답을 낼 수 있습니다.**

```
  status 컬럼이 RLE로 압축됨:  [("active", 1_200_000), ("deleted", 340), ("active", 87_000)]

  SELECT COUNT(*) FROM t WHERE status = 'active'
  → 압축 해제 없이 런 길이만 더하면 끝: 1,200,000 + 87,000 = 1,287,000
  → 128만 개 값을 하나도 읽지 않았음
```

Dictionary 인코딩에서도 마찬가지입니다 — `WHERE country = 'KR'`는 사전에서 'KR'의 ID를 찾은 뒤 **정수 비교**만 하면 되므로, 문자열 비교를 100% 회피합니다.

#### (d) 존 맵 / 데이터 스키핑 (Zone Map / Min-Max Pruning)

컬럼이 블록 단위로 저장되므로, **블록마다 min/max를 메타데이터로 들고 있기가 쉽습니다.**

```
  price.bin 블록별 메타데이터
  ┌──────────┬──────┬──────┐
  │ 블록      │ min  │ max  │
  ├──────────┼──────┼──────┤
  │ block 0  │ 100  │ 450  │ ← WHERE price > 5000 이면 스킵
  │ block 1  │ 200  │ 890  │ ← 스킵
  │ block 2  │ 4800 │ 9200 │ ← 이것만 읽음
  └──────────┴──────┴──────┘
```

정렬 키와 상관관계가 높은 컬럼이면 프루닝 효율이 극적입니다. Parquet의 row group statistics, ClickHouse의 스파스 인덱스 + 스키핑 인덱스, Snowflake의 마이크로 파티션 메타데이터가 전부 이 원리입니다.

> **로우 지향에도 BRIN 인덱스(PostgreSQL) 같은 유사물이 있지만**, 로우 지향은 블록 안에 모든 컬럼이 섞여 있어 "특정 컬럼 기준 블록 프루닝"의 효과가 훨씬 약합니다.

---

### 3. 성능 차이의 동인 ② — CPU 효율 (읽은 바이트당 처리 속도를 높인다)

I/O를 줄여도 CPU가 못 따라가면 소용없습니다. 여기서 두 번째 배수가 나옵니다.

#### (a) 튜플 단위 실행(Volcano) vs 벡터화 실행

**전통적 로우 지향 실행 모델 = Volcano / Iterator model**

```c
// 의사코드: 연산자마다 next()를 호출, 튜플 1개씩 위로 전달
while ((tuple = child->next()) != NULL) {
    if (evaluate_predicate(tuple))   // 가상 함수 호출
        emit(tuple);
}
```

행 10억 개면 **가상 함수 호출이 연산자 수 × 10억 번** 발생합니다. 실제 계산(정수 비교 1회)보다 **호출 오버헤드가 10~100배** 큽니다.

**벡터화 실행 (Vectorized / Block-at-a-time)**

```c
// 한 번의 호출로 수천 개 값을 배열로 받아 타이트 루프로 처리
Vector* vec = child->next_batch();     // 예: 1024~65536개 값
for (int i = 0; i < vec->size; i++)    // 가상 함수 호출 없음
    result[i] = (vec->data[i] > 5000);
```

- 함수 호출 오버헤드가 **배치 크기만큼 분할 상환**됩니다
- 타이트 루프라 **분기 예측기(branch predictor)** 가 거의 100% 적중
- 컴파일러가 **자동 벡터화(auto-vectorization)** 를 적용할 수 있는 형태

배치 크기는 시스템마다 다릅니다 — 일반적으로 **1,000~4,000개**, ClickHouse는 기본 **65,536개**(`max_block_size`).

#### (b) SIMD — 한 명령으로 여러 값 처리

**같은 타입 값이 연속 배열로 있다**는 성질이 SIMD의 전제 조건입니다.

```
  스칼라:  cmp a[0],5000  cmp a[1],5000  cmp a[2],5000 ... (8 사이클)

  AVX2 (256비트): ymm 레지스터에 int32 8개 적재 → vpcmpgtd 1회 (1 사이클)
  AVX-512:        int32 16개 동시 처리
```

**로우 지향에서 SIMD가 안 되는 이유:** `[id|name|age|salary]` 구조에서 age만 8개 모으려면 400바이트씩 건너뛰며 gather 해야 합니다. gather 명령은 존재하지만 연속 로드보다 **수 배 느리고**, 그 과정에서 캐시 라인을 대량 낭비합니다.

#### (c) CPU 캐시 지역성 — 가장 과소평가된 요인

현대 CPU의 진짜 병목은 디스크가 아니라 **메모리 대역폭(memory wall)** 입니다.

```
  L1 캐시 히트 :   ~1 ns     (4 사이클)
  L2 캐시 히트 :   ~4 ns
  L3 캐시 히트 :  ~15 ns
  DRAM 접근   : ~100 ns     ← 300~400 사이클. 이 동안 CPU는 논다
  NVMe SSD    :  ~50 μs
```

**캐시 라인은 64바이트 단위로 채워집니다.** 여기서 결정적 차이가 납니다:

```
  로우 지향 (행 크기 400바이트), age(4바이트)만 필요:
  ┌────────────────────────────────────────────────┐
  │ 64바이트 캐시 라인 │ ← 이 중 유효한 건 4바이트 (6.25%)
  │ [id|name|age|sal…] │    나머지 60바이트는 캐시 오염
  └────────────────────────────────────────────────┘
  → 캐시 라인 1개당 유효 값 1개. 10억 행 = 10억 번의 캐시 미스

  컬럼 지향, age.bin (4바이트 정수 연속):
  ┌────────────────────────────────────────────────┐
  │ 64바이트 캐시 라인 │ ← 유효한 건 64바이트 (100%)
  │ [30][28][35]…×16개 │    한 번에 16개 값
  └────────────────────────────────────────────────┘
  → 캐시 라인 1개당 유효 값 16개. 캐시 미스 16배 감소
```

**추가로 하드웨어 프리페처(prefetcher)** 가 순차 접근 패턴을 감지해 다음 캐시 라인을 미리 당겨옵니다. 컬럼 스캔은 완벽한 순차 접근이므로 프리페처가 100% 작동합니다. 로우 지향의 스트라이드 접근은 프리페치 효율이 떨어집니다.

> **이것이 "인메모리라면 컬럼 지향이 무의미하다"는 흔한 오해가 틀린 이유입니다.** 데이터가 전부 RAM에 있어도 캐시 효율 차이는 그대로 남습니다. MonetDB가 인메모리 컬럼 스토어로 시작한 것이 그 증거입니다.

---

### 4. 성능 차이의 동인 ③ — 실행 전략 (Abadi 논문의 기여도 분해)

2008년 Daniel Abadi·Samuel Madden·Nabil Hachem의 SIGMOD 논문 **"Column-Stores vs. Row-Stores: How Different Are They Really?"** 는 이 질문을 정면으로 다룬 고전입니다.

이 논문이 던진 질문: *"로우 스토어에 컬럼을 하나씩 테이블로 쪼개 넣으면 컬럼 스토어 성능이 나오는가?"* → **답은 '아니오'.** 저장 방식뿐 아니라 **실행 엔진이 함께 바뀌어야** 합니다.

논문이 분리 측정한 각 기법의 기여도:

| 기법 | 성능 기여 | 내용 |
|---|---|---|
| **압축 (Compression)** | 약 **2배** | 위 2-(b),(c). I/O 감소 + 압축 상태 연산 |
| **Late Materialization** | 약 **3배** | 아래 설명 |
| **Block Iteration** | **5~50%** | 튜플 단위가 아닌 블록 단위 전달 (위 3-(a)) |
| **Invisible Join** | **50~75%** | 팩트-디멘전 조인 시 술어를 옮겨 순서 없는 값 추출을 최소화 |

#### Late Materialization (지연 구체화) — 가장 큰 단일 실행 최적화

**"튜플을 최대한 늦게 조립한다"** 는 전략입니다.

```sql
SELECT name, salary FROM emp WHERE age > 60 AND dept = 'ENG';
```

**Early materialization (조기 조립, 나이브한 방식):**
```
  1. 모든 컬럼을 읽어 행 형태로 조립 (1000만 행 × 400바이트 = 4GB 메모리)
  2. 조립된 행에 조건 적용
  3. 살아남은 1만 행에서 name, salary만 추출
  → 999만 행분의 조립 작업이 전부 헛수고
```

**Late materialization (지연 조립):**
```
  1. age.bin 만 스캔 → 조건 만족 위치 비트맵 생성  [0,0,1,0,1,1,0,...]
  2. dept.bin 만 스캔 → 비트맵 AND 연산
  3. 최종 비트맵에 남은 위치(1만 개)에 대해서만
     name.bin, salary.bin 의 해당 오프셋을 조회
  → 튜플 조립 횟수: 1000만 → 1만 (1000배 감소)
```

논문이 정리한 late materialization의 네 가지 이점:

1. **선택·집계 연산자가 튜플 조립 자체를 불필요하게 만든다** — 충분히 오래 기다리면 아예 조립을 안 해도 될 수 있음
2. **압축 해제를 미룰 수 있다** — 다른 컬럼과 결합하려면 압축을 풀어야 하는데, 결합을 미루면 압축 상태 연산을 더 오래 유지
3. **캐시 성능이 좋아진다** — 캐시 라인이 무관한 인접 속성으로 오염되지 않음
4. 중간 결과의 메모리 사용량이 극적으로 감소

> **위치 비트맵(position list)이 핵심 자료구조입니다.** 컬럼 지향에서는 "N번째 행"이라는 위치가 모든 컬럼에서 동일한 배열 인덱스이므로, 조건 필터 결과를 **비트맵이나 위치 리스트로만 주고받을 수 있습니다.** 로우 지향에서는 이 표현이 자연스럽지 않습니다.

---

### 5. 반대 방향 — 왜 OLTP에서는 로우 지향이 압도하는가

지금까지가 컬럼 지향의 승리 조건이었다면, 정확히 같은 논리가 반대로도 작동합니다.

#### (a) 단일 행 조회 (Point Lookup)

```sql
SELECT * FROM users WHERE id = 12345;
```

| | 필요한 I/O |
|---|---|
| **로우 지향** | B-tree 인덱스 3~4레벨 탐색 → **리프 페이지 1개 읽기** → 그 안에 모든 컬럼이 있음. 총 **4~5회 random I/O** |
| **컬럼 지향** | 50개 컬럼이면 **50개 파일의 12345번째 위치를 각각 찾아 읽어야 함**. 총 **50회 이상 random I/O** |

**10배 이상 느립니다.** 그리고 이건 튜닝으로 못 고칩니다 — 배치 방향의 필연입니다.

#### (b) 단일 행 삽입/수정

```sql
UPDATE users SET last_login = NOW() WHERE id = 12345;
```

| | 동작 |
|---|---|
| **로우 지향** | 해당 페이지 하나를 읽어 in-place 수정(또는 새 버전 행 추가) + WAL 기록. **페이지 1개 dirty** |
| **컬럼 지향** | 이론상 `last_login.bin`의 한 위치만 수정하면 되지만 — **압축 블록 전체를 풀고 다시 압축해야 합니다.** 그리고 대부분의 컬럼 스토어는 파일이 **불변(immutable)** 이라 in-place 수정 자체가 불가 |

컬럼 스토어의 현실적 대응:

- **불변 파트 + 백그라운드 병합** — ClickHouse MergeTree, 사실상 LSM-tree 계열
- **`ALTER TABLE ... UPDATE`는 뮤테이션(mutation)** — 해당 파트 전체를 다시 쓰는 무거운 비동기 작업. ClickHouse는 이를 "일반 UPDATE라고 생각하지 말라"고 문서에 명시합니다
- **삭제 표식(delete marker) / tombstone** — 실제 삭제는 나중에 병합 시 반영

> **핵심:** 컬럼 지향은 **"대량 append + 거의 수정 없음"** 을 전제로 설계되었습니다. 이 저장소의 [`database/clickhouse/clickhouse-append-only-log-reason.md`](./clickhouse/clickhouse-append-only-log-reason.md)가 다루는 "왜 ClickHouse가 append-only 로그에 적합한가"의 근본 이유가 이것입니다. 그리고 이 성질은 [`distributed-systems/the-log/`](../distributed-systems/the-log/00-overview.md)에서 분석한 로그 추상화와 정확히 같은 철학입니다 — **불변 + append-only + 순차 I/O**.

#### (c) 트랜잭션·동시성 제어

| | 로우 지향 | 컬럼 지향 |
|---|---|---|
| **락 단위** | 행 단위 락이 자연스러움 | "행"이 물리적으로 존재하지 않아 행 락이 부자연스러움 |
| **MVCC** | 행 버전 체인(PostgreSQL) / undo 로그(InnoDB) | 파트 단위 버전 관리. 행 단위 MVCC 구현이 훨씬 복잡 |
| **격리 수준** | Serializable까지 성숙 | 많은 컬럼 DB가 제한적 트랜잭션만 지원(ClickHouse는 다중 문장 트랜잭션 미지원) |

> 관련: [`database/mysql-postgresql/`](./mysql-postgresql/)의 락·MVCC 문서들이 로우 지향 DB의 이 영역을 다룹니다.

#### (d) 정리 — 워크로드별 우열

| 워크로드 특성 | 유리한 쪽 | 이유 |
|---|---|---|
| 소수 행 × 전체 컬럼 (`SELECT *  WHERE id=?`) | **로우** | 한 페이지에 다 있음 |
| 전체 행 × 소수 컬럼 (`SUM/GROUP BY`) | **컬럼** | 컬럼 프루닝 + 압축 + SIMD |
| 단건 INSERT/UPDATE/DELETE 고빈도 | **로우** | in-place 수정, 행 락 |
| 대량 벌크 로드 + 조회 전용 | **컬럼** | 순차 append, 압축 |
| 컬럼 수가 적음 (5개 이하) | **로우** (차이 축소) | 프루닝 이득이 작음 |
| 컬럼 수가 많음 (50~수백 개) | **컬럼** (차이 극대) | 프루닝 이득이 선형 증가 |
| 강한 트랜잭션 격리 필요 | **로우** | 성숙한 MVCC/락 |
| 카디널리티 낮은 컬럼 많음 | **컬럼** | dictionary/RLE가 극적으로 먹힘 |

---

### 6. 숫자로 확인하기 — 구체적 시나리오

**설정:** 웹 로그 테이블. 100개 컬럼, 100억 행, 비압축 총 4TB. 서버: NVMe 3GB/s, 16코어 AVX2.

```sql
SELECT status_code, COUNT(*)
FROM access_log
WHERE ts >= '2026-09-01'      -- 전체의 10%
GROUP BY status_code;
```

| 단계 | 로우 지향 | 컬럼 지향 |
|---|---|---|
| **읽어야 할 컬럼** | 전체 100개 | `ts`(8B), `status_code`(2B) 2개 |
| **비압축 크기** | 4TB | 100억 × 10B = 100GB |
| **존 맵 프루닝** | 제한적 (~4TB) | ts 정렬 가정 시 10%만 = 10GB |
| **압축 후 실제 I/O** | ~1.5TB (3배 압축) | ~0.7GB (ts는 delta+bitpack 약 15배, status_code는 dictionary+RLE 약 30배) |
| **디스크 시간** | 1.5TB ÷ 3GB/s ≈ **500초** | 0.7GB ÷ 3GB/s ≈ **0.23초** |
| **CPU 처리** | 튜플 단위, 캐시 미스 다발 | 벡터화+SIMD, 16스레드 |
| **체감 총 시간** | 분 단위 | **1초 미만** |

**약 500~1000배 차이.** 이 예시가 극단적으로 보이지만, "컬럼 수가 많고 / 정렬 키와 필터가 정렬되고 / 카디널리티가 낮은" 조건이 겹치면 실제로 관측되는 수치입니다. 검색 결과에서 인용되는 **"동일 하드웨어에서 분석 쿼리 50~100배"** 는 좀 더 보수적인 평균치입니다.

**반대 시나리오:**

```sql
SELECT * FROM access_log WHERE request_id = 'abc-123';
```

| | 로우 지향 | 컬럼 지향 |
|---|---|---|
| I/O | 인덱스 탐색 4회 + 리프 1회 = **5회** | 100개 컬럼 각각 조회 = **100회 이상** |
| 지연시간 | **~0.5ms** | **~10ms 이상** |

---

### 7. 경계가 흐려지는 2026년 — 수렴의 방향

순수한 "로우 vs 컬럼" 이분법은 현재 상당히 약해졌습니다.

#### (a) PAX로의 수렴

앞서 봤듯 **Snowflake, Databricks, BigQuery, DuckDB가 전부 PAX 변형**을 씁니다. Parquet/ORC도 PAX입니다. 이는 "컬럼 지향의 스캔 이점을 얻되, 튜플 재조립 지역성과 병렬 분할 가능성을 잃지 않는" 절충입니다.

#### (b) 한 엔진 안에 두 저장소 (HTAP)

**HTAP (Hybrid Transactional/Analytical Processing)** 는 **로우 스토어와 컬럼 스토어를 엔진 내부에 동시에 두고, 쿼리를 적절한 쪽으로 라우팅**하는 접근입니다. ETL 복사 단계를 없애는 대신 엔진 복잡도가 올라갑니다.

| 시스템 | 방식 |
|---|---|
| **SQL Server** | Clustered Columnstore Index — 같은 테이블에 행/열 저장 병행 |
| **Oracle** | In-Memory Column Store — 디스크는 행, 메모리에 컬럼 복제본 |
| **TiDB** | TiKV(행, RAFT 로그 기반) + TiFlash(열). RAFT 로그로 컬럼 복제본 동기화 |
| **SingleStore** | 로우스토어(메모리) + 컬럼스토어(디스크) 테이블 타입 선택 |
| **PostgreSQL 확장** | Citus Columnar, `pg_mooncake`, Hydra 등 |

> **TiDB가 구조적으로 흥미롭습니다.** TiFlash(컬럼 복제본)는 TiKV의 **RAFT 로그를 구독해서** 컬럼 형태로 물질화합니다. 이는 [`distributed-systems/the-log/`](../distributed-systems/the-log/00-overview.md)에서 분석한 **"테이블/인덱스는 로그의 투영"** 원리의 교과서적 구현입니다 — 컬럼 스토어가 로그의 또 하나의 projection인 셈입니다.

#### (c) 2026년의 지배적 실무 패턴

검색 결과가 정리하는 현실:

> "The usual 2026 pattern is Postgres or MySQL for the application database and a columnar engine for analytics, keeping recent operational rows in the row store, then batching them into Parquet or DuckDB."

```
  [애플리케이션]
       │ 쓰기/단건 조회
       ▼
  ┌──────────────────┐   CDC (Debezium)   ┌────────────────────┐
  │ PostgreSQL/MySQL │ ─────────────────▶ │ Kafka (로그)        │
  │ (로우 지향, OLTP) │                    └─────────┬──────────┘
  └──────────────────┘                              │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │ ClickHouse / Iceberg+Parquet  │
                                    │ (컬럼 지향, OLAP)              │
                                    └───────────────────────────────┘
                                                    ▲
                                          [BI / 대시보드 / 분석]
```

**즉 "어느 쪽이 이기는가"가 아니라 "둘 다 쓰되 로그로 연결한다"가 표준 답**이 되었습니다. 그리고 그 연결 방식이 바로 이전에 분석한 로그 아키텍처입니다.

#### (d) 포맷의 독립 — Arrow / Parquet

**Apache Arrow**(인메모리 컬럼 포맷)와 **Parquet**(디스크 컬럼 포맷)가 표준화되면서, "컬럼 지향"이 **특정 DB 제품의 속성이 아니라 교환 가능한 데이터 포맷**이 되었습니다. 이제 DuckDB·Polars·pandas(Arrow 백엔드)·Spark·Trino가 같은 Parquet 파일을 각자 읽습니다. 컬럼 지향의 이점이 DB 밖으로 나온 것입니다.

---

### 8. 선택 가이드 — 실무 판단 체크리스트

**컬럼 지향을 고르는 신호:**

- [ ] 쿼리가 `GROUP BY`, `SUM`, `COUNT`, 윈도우 함수 중심
- [ ] 테이블 컬럼 수가 20개 이상인데 쿼리가 쓰는 건 2~5개
- [ ] 한 번에 수백만~수십억 행을 스캔
- [ ] 쓰기가 **벌크 append** 위주 (로그, 이벤트, 메트릭, IoT)
- [ ] `UPDATE`/`DELETE`가 거의 없거나 배치로 처리 가능
- [ ] 저장 비용이 문제 (압축률이 곧 비용)
- [ ] 강한 다중 문장 트랜잭션이 필요 없음

**로우 지향을 고르는 신호:**

- [ ] `WHERE pk = ?` 형태의 단건 조회가 대부분
- [ ] 초당 수천 건의 단건 INSERT/UPDATE
- [ ] `SELECT *` 로 레코드 전체를 가져다 씀
- [ ] 외래 키, 제약 조건, Serializable 격리 필요
- [ ] 테이블 컬럼 수가 적음
- [ ] 애플리케이션의 primary datastore

**둘 다 필요하면** — 대부분의 경우가 여기 해당합니다. OLTP는 로우 지향, 분석은 컬럼 지향으로 두고 **CDC/로그로 단방향 동기화**하는 것이 2026년의 기본형입니다. HTAP 단일 엔진은 운영 단순성이 중요하고 규모가 중간일 때 고려합니다.

---

### 9. 흔한 오해 정리

| 오해 | 실제 |
|---|---|
| "컬럼 지향은 디스크가 느려서 유리한 것. 인메모리면 무의미" | ❌ **CPU 캐시 지역성과 SIMD 이점은 메모리에서도 그대로.** MonetDB는 인메모리 컬럼 스토어 |
| "로우 DB에 컬럼별 테이블을 만들면 같은 효과" | ❌ Abadi 논문이 직접 반증. **실행 엔진(벡터화, late materialization)이 함께 바뀌어야 함** |
| "컬럼 지향은 쓰기가 무조건 느리다" | ⚠️ 절반만 참. **단건 쓰기는 느리지만 벌크 append 처리량은 오히려 더 높음**(순차 I/O + 압축) |
| "컬럼 지향은 조인을 못 한다" | ❌ 가능. 다만 최적 전략이 다름(invisible join, 디멘전 테이블 브로드캐스트). 초대형 팩트-팩트 조인은 여전히 어려움 |
| "압축을 켜면 CPU 때문에 느려진다" | ❌ 대개 반대. **I/O가 병목이므로 압축 해제 CPU 비용보다 읽는 바이트 감소 이득이 훨씬 큼.** LZ4는 GB/s급 해제 속도 |
| "인덱스를 잘 걸면 로우 DB로도 분석 가능" | ⚠️ 커버링 인덱스로 부분적 흉내는 가능하지만, 인덱스 유지 비용이 쓰기를 죽이고 압축·SIMD 이점은 못 얻음 |
| "컬럼 지향 = OLAP 전용" | ⚠️ 경계가 흐려지는 중. HTAP, PAX, Arrow로 범용화 진행 중 |

---

## 한눈에 보는 요약

```
                    ┌─────────────────────────────────────────┐
                    │  단 하나의 결정: 2차원 테이블을 1차원      │
                    │  메모리에 펴는 방향                       │
                    └───────────────┬─────────────────────────┘
                 행 우선 ◀──────────┴──────────▶ 열 우선
                    │                              │
        ┌───────────▼──────────┐      ┌────────────▼─────────────┐
        │  한 레코드가 연속       │      │  한 컬럼이 연속            │
        └───────────┬──────────┘      └────────────┬─────────────┘
                    │                              │
        ┌───────────▼──────────┐      ┌────────────▼─────────────┐
        │ 단건 조회 1회 I/O      │      │ 필요한 컬럼만 읽음(프루닝)  │
        │ in-place 수정 가능     │      │ 동질 데이터 → 고압축        │
        │ 행 락 / MVCC 자연스러움│      │ 연속 배열 → SIMD/캐시      │
        │ 트랜잭션 성숙          │      │ 압축 상태 연산 / 존 맵      │
        └───────────┬──────────┘      │ late materialization     │
                    │                 └────────────┬─────────────┘
                    ▼                              ▼
              OLTP에서 10배+              OLAP에서 50~100배+
```

**한 문장 요약:** 성능 차이는 컬럼 지향이 "더 똑똑한 알고리즘"을 써서가 아니라, **데이터 배치 방향을 바꿔서 (1) 읽을 바이트를 줄이고 (2) 그 바이트를 더 잘 압축하고 (3) 압축된 채로 연산하고 (4) CPU의 캐시·SIMD·프리페처를 100% 활용할 수 있는 조건을 동시에 만들었기 때문**이며, 이 효과들이 더해지지 않고 **곱해지기** 때문에 두 자릿수~세 자릿수 차이가 납니다.

---

## Sources

- [Column-Stores vs. Row-Stores: How Different Are They Really? — Abadi, Madden, Hachem (SIGMOD 2008)](https://www.cs.umd.edu/~abadi/papers/abadi-sigmod08.pdf)
- [An Empirical Evaluation of Columnar Storage Formats — arXiv](https://arxiv.org/pdf/2304.05028)
- [What Is Columnar Storage? Column vs Row Databases Explained — MotherDuck](https://motherduck.com/learn/columnar-storage-guide/)
- [Columnar Database vs Row Database: What to Choose and Why — Estuary](https://estuary.dev/blog/columnar-database-vs-row-database/)
- [Row Storage vs. Columnar Storage in Relational Databases — Couchbase](https://www.couchbase.com/blog/columnar-store-vs-row-store/)
- [Columnar Storage - A Complete Guide — Airbyte](https://airbyte.com/data-engineering-resources/columnar-storage)
- [What Is a Columnar Database? The Complete Guide for 2026 — VeloDB](https://www.velodb.io/glossary/columnar-database)
- [Unifying OLTP and OLAP: HTAP databases, zero-ETL, and best-of-breed architectures — ClickHouse](https://clickhouse.com/resources/engineering/unifying-oltp-and-olap)
- [HTAP — MotherDuck Glossary](https://motherduck.com/glossary/htap/)
- [OLAP Storage Models — Medium](https://medium.com/@random.droid/olap-concept-1-storage-models-how-data-is-laid-out-physically-1ffdcce662b1)

---

## 관련 문서

- [`database/clickhouse/clickhouse-strengths-columnar-and-replica.md`](./clickhouse/clickhouse-strengths-columnar-and-replica.md) — ClickHouse의 코덱 체이닝, 스파스 인덱스, 벡터화 구현 세부
- [`database/clickhouse/clickhouse-append-only-log-reason.md`](./clickhouse/clickhouse-append-only-log-reason.md) — 왜 컬럼 DB가 append-only 로그에 적합한가
- [`database/clickhouse/clickhouse-vs-timeseries-and-log-db.md`](./clickhouse/clickhouse-vs-timeseries-and-log-db.md) — 시계열/로그 특화 DB와의 비교
- [`database/mysql-postgresql/`](./mysql-postgresql/) — 로우 지향 DB의 락·MVCC·격리 수준
- [`distributed-systems/the-log/`](../distributed-systems/the-log/00-overview.md) — "테이블/인덱스는 로그의 투영" 원리. 컬럼 스토어를 로그의 projection으로 보는 관점
