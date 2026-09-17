# Kafka를 사실상 DB처럼 쓸 수 있나 — "offset 조회만", "순서만" 필요한 경우

## 쉬운 설명

Kafka는 **"들어온 순서대로 번호표를 붙여서 한 줄로 쌓아두는 창고"** 입니다. 1번, 2번, 3번… 이렇게요.

**"1,234번 물건 가져와"** 는 됩니다. 창고에 대략적인 위치 표지판이 있어서 금방 찾아요.

그런데 문제가 하나 있어요. **"1,234번"이라는 번호를 애초에 어디서 알았을까요?**

물건을 넣을 때만 번호를 알려줍니다. 나중에 "철수가 맡긴 물건 찾아줘" 하면 — 창고에는 **이름으로 찾는 목록이 없습니다.** 번호를 적어둔 수첩이 따로 있어야 해요. 그런데 그 수첩이 이미 **데이터베이스**입니다.

그래서 답은 이렇습니다: **"처음부터 끝까지 순서대로 읽기"는 Kafka가 세상에서 제일 잘하는 일이고, "번호 하나 집어서 읽기"도 되긴 되지만, 그 번호를 알아낼 방법이 Kafka 안에는 없습니다.**

---

## 일반 설명

### 0. 결론 먼저

**조건부로 YES입니다.** 다만 "offset 조회만 필요하다"는 전제가 실무에서 성립하는 경우가 생각보다 드뭅니다.

| 질문 | 답 |
|---|---|
| Kafka가 데이터를 영구 보존할 수 있나? | ✅ 예 (tiered storage로 사실상 무한 보존) |
| offset으로 특정 레코드를 찾아 읽을 수 있나? | ✅ 예. 내부에 sparse index가 있어 실제로 빠름 |
| 순서 보장이 되나? | ✅ **파티션 내부에서는** 완벽한 전순서 |
| 그럼 DB로 써도 되나? | ⚠️ **"어떻게 그 offset을 알아냈는가"에 전부 달려 있음** |

**핵심 함정:** offset은 **쓰기를 한 뒤에야 알 수 있는 값**이고, Kafka는 **"이 조건에 맞는 레코드의 offset이 뭐냐"에 답할 방법이 없습니다.** 즉 offset을 알려면 offset을 어딘가에 저장해둬야 하는데, 그 저장소가 이미 데이터베이스입니다.

---

### 1. 먼저 — Kafka는 이미 DB의 상당 부분을 갖고 있다

"Kafka는 메시지 큐일 뿐"이라는 인식은 틀렸습니다. [이전에 분석한 The Log](../distributed-systems/the-log/00-overview.md)의 논지대로, Kafka는 처음부터 **"DB의 WAL을 밖으로 꺼낸 물건"** 으로 설계됐습니다.

| DB 속성 | Kafka의 제공 여부 |
|---|---|
| **내구성(Durability)** | ✅ 디스크 영속화 + `acks=all` + `min.insync.replicas` |
| **복제(Replication)** | ✅ 파티션 단위 leader/follower, ISR |
| **원자성(Atomicity)** | ✅ 트랜잭션 API (다중 파티션 원자적 쓰기, 0.11+) |
| **격리(Isolation)** | ⚠️ 부분적 — `read_committed`로 미커밋 레코드 숨김. 그러나 일반적 격리 수준은 없음 |
| **순서 보장** | ✅ 파티션 내 전순서 |
| **스키마 강제** | ⚠️ 브로커가 아닌 Schema Registry가 클라이언트 측에서 강제 |
| **무한 보존** | ✅ Tiered Storage (KIP-405, Kafka 3.9 GA) |
| **키 기반 최신값 유지** | ✅ Log compaction |
| **랜덤 읽기** | ⚠️ offset 기준으로만. 키/조건 기준 불가 |
| **보조 인덱스** | ❌ 없음 |
| **질의 언어** | ❌ 없음 (ksqlDB는 별도 레이어) |
| **수정/삭제** | ❌ 개별 레코드 단위로 불가 |

Jay Kreps는 2017년 **"It's Okay to Store Data in Apache Kafka"** 라는 글로 이를 공식화했고, Martin Kleppmann도 Kafka를 "점점 데이터베이스에 가까워지고 있다"고 평했습니다. 두 사람 모두 "Kafka를 저장소로 쓰는 것 자체는 정당하다"는 쪽입니다.

**다만 이들이 말하는 "DB로 쓴다"는 뜻은 대개 "system of record로 삼는다"이지, "애플리케이션의 조회 백엔드로 쓴다"가 아닙니다.** 이 구분이 이 질문의 전부입니다.

---

### 2. "offset 조회"는 실제로 어떻게 동작하나 — 내부 구조

먼저 **기술적으로는 정말 된다**는 것부터 확인해야 합니다. Kafka의 offset 조회는 전체 스캔이 아닙니다.

#### 파티션의 물리적 구조

```
  /kafka-logs/my-topic-0/
  ├── 00000000000000000000.log        ← 세그먼트 (기본 1GB)
  ├── 00000000000000000000.index      ← offset → 파일 내 바이트 위치 (sparse)
  ├── 00000000000000000000.timeindex  ← timestamp → offset (sparse)
  ├── 00000000000001048576.log        ← 다음 세그먼트 (파일명 = base offset)
  ├── 00000000000001048576.index
  └── 00000000000001048576.timeindex
```

#### offset 1,234,567 조회 시 실제 동작

```
  ① 세그먼트 선택
     파일명이 base offset이므로, 파일명 목록에 대해 이진 탐색
     → 00000000000001048576.log 선택            O(log S), S = 세그먼트 수

  ② .index 에서 이진 탐색
     .index 는 "약 4KB 로그 바이트마다 1개" 엔트리를 가진 sparse index
     (log.index.interval.bytes 기본값 4096)
     → 1,234,567 이하의 가장 큰 엔트리를 찾음
     → 예: (offset 1,234,500 → byte position 87,340,032)   O(log N)

  ③ .log 파일을 해당 바이트 위치로 seek 후 전방 선형 스캔
     → 최대 ~4KB만 스캔하면 목표 offset 도달      O(1) 사실상 상수
```

**즉 offset 조회는 O(log n) + 상수 시간 선형 스캔입니다.** B-tree 인덱스 탐색과 복잡도가 비슷합니다. "Kafka는 순차 읽기만 된다"는 것은 오해입니다.

> **sparse index의 트레이드오프:** 1,000만 개 메시지가 든 세그먼트의 인덱스 엔트리는 약 1만 개 수준입니다. 인덱스가 작아 **전부 페이지 캐시에 상주**할 수 있고, 이것이 Kafka가 메모리를 적게 쓰면서도 빠른 이유입니다. `log.index.interval.bytes`를 줄이면 조회가 빨라지지만 인덱스 파일이 커집니다. 이 구조는 [`database/clickhouse/`](../database/clickhouse/clickhouse-strengths-columnar-and-replica.md)의 ClickHouse 스파스 인덱스와 동일한 설계 철학입니다.

#### "offset 조회"의 세 가지 서로 다른 의미

질문을 정확히 나눠야 합니다.

| 의미 | Kafka 지원 | 평가 |
|---|---|---|
| **(1) 순차 재생** — offset N부터 끝까지 읽기 | ✅ 네이티브 | **Kafka가 세상에서 가장 잘하는 일.** 순차 I/O + 제로카피 + 배칭 |
| **(2) 시간 기준 탐색** — "2026-09-01 00:00 이후" | ✅ `offsetsForTimes()` + `.timeindex` | 잘 작동. 로그 분석·재처리에 유용 |
| **(3) 단건 랜덤 조회** — offset N 하나만 | ⚠️ 기술적으로 가능 | **여기가 함정 구간** |

질문하신 "offset 조회만 필요하다면"이 (1)이나 (2)를 뜻한다면 **문제없이 DB처럼 쓸 수 있습니다.** (3)을 뜻한다면 아래 함정들을 봐야 합니다.

---

### 3. 단건 offset 조회를 DB처럼 쓸 때의 함정 7가지

#### 함정 ① — 그 offset을 어디서 알아냈는가 (가장 근본적)

```
  RDB:    SELECT * FROM orders WHERE order_id = 'A-123';
          → 조건으로 찾는다. 사전 지식 불필요.

  Kafka:  consumer.seek(partition, 1234567);
          → 1234567 을 이미 알고 있어야 한다.
             이 숫자를 어디서 얻었나?
```

offset을 얻는 경로는 세 가지뿐입니다:

1. **쓰기 직후 `RecordMetadata`에서** — 그럼 그걸 어딘가 저장해야 함 → **그 저장소가 DB**
2. **순차 소비 중에** — 그럼 애초에 랜덤 조회가 아님
3. **timestamp 기반 탐색** — 시간 범위 질의에만 유효

**따라서 "Kafka를 offset 조회용 DB로 쓴다"는 구상은 거의 항상 "offset을 저장할 별도 인덱스"를 필요로 합니다.** 이건 Kafka를 DB로 쓰는 게 아니라, **Kafka를 blob 저장소로 쓰고 진짜 DB는 따로 두는 것**입니다.

> 예외적으로 성립하는 경우: **다른 이벤트 안에 offset이 참조로 들어 있는 구조**. 예를 들어 "주문 확정 이벤트"가 "주문 생성 이벤트의 offset"을 필드로 갖고 있으면, 그 offset으로 원본을 찾아갈 수 있습니다. 이건 실제로 쓰이는 패턴입니다.

#### 함정 ② — offset은 연속이 아니다

**offset N이 존재한다는 보장이 없습니다.** 다음 경우에 구멍이 생깁니다:

| 원인 | 설명 |
|---|---|
| **트랜잭션 마커** | EOS(exactly-once) 사용 시 커밋/어보트 마커가 offset을 소비. 실제 레코드 없이 offset만 증가 |
| **어보트된 트랜잭션** | `read_committed` 소비자에게는 보이지 않지만 offset은 점유 |
| **Log compaction** | 같은 키의 최신값만 남으므로 중간 offset들이 사라짐 |
| **Retention 만료** | 오래된 세그먼트가 통째로 삭제됨 → 그 offset 범위는 영구 소실 |

```
  offset:  100  101  102  103  104  105
           rec  rec  [TX] rec  ---  rec
                     마커      compact됨
  → seek(102) 하면 트랜잭션 마커, seek(104) 하면 그 다음 레코드가 반환됨
```

**DB의 PK는 "없으면 not found"지만, Kafka의 offset은 "없으면 그 다음 것"이 나옵니다.** 이것만으로도 PK 대용으로 쓰기엔 위험합니다.

#### 함정 ③ — offset은 클러스터를 벗어나면 무효

offset은 **물리적 위치 식별자**이지 논리적 ID가 아닙니다.

- **MirrorMaker2로 DR 클러스터에 복제하면 offset이 달라집니다.** MM2는 offset translation을 제공하지만, 검색 결과대로 **"모든 레코드에 대해 매핑을 저장하는 건 비용이 너무 커서 sparse OffsetSync 기반이고, 따라서 부정확(imprecise)"** 합니다.
- 토픽을 재생성하면 offset이 0부터 다시 시작합니다.
- 클러스터 마이그레이션(예: Kafka → Northguard, 또는 diskless 전환) 시 외부에 저장해둔 offset이 전부 깨집니다.

**즉 offset을 외부 시스템의 외래 키로 쓰면, 재해 복구나 마이그레이션 시점에 데이터 참조가 전부 끊어집니다.** 이건 복구 불가능한 수준의 장애가 될 수 있습니다.

> WarpStream 같은 벤더가 "offset gap 없는 복제"를 별도 기능으로 광고하는 것 자체가, 이 문제가 실재한다는 증거입니다.

#### 함정 ④ — 단건 읽기 비용이 DB보다 훨씬 비싸다

기술적으로 O(log n)이어도, **API 레이어의 오버헤드가 큽니다.**

```
  RDB 단건 조회:
    이미 열린 커넥션 풀 → SQL 전송 → 인덱스 탐색 → 행 1개 반환
    ≈ 0.2~1 ms

  Kafka 단건 조회:
    consumer 인스턴스 생성/할당 (수백 ms, 재사용해도 assign 비용)
    → assign(partition) → seek(offset) → poll()
    → 브로커가 fetch.min.bytes 단위로 배치 반환 (1개만 원해도 배치가 옴)
    → 역직렬화
    ≈ 5~50 ms, 그리고 배치 전체가 네트워크를 탐
```

특히 **consumer는 스레드 세이프하지 않고 재사용 관리가 까다로워서**, "HTTP 요청마다 Kafka에서 레코드 하나 조회" 같은 패턴은 커넥션/인스턴스 관리가 지옥이 됩니다.

#### 함정 ⑤ — 랜덤 읽기가 Kafka의 성능 모델을 파괴한다

Kafka가 빠른 이유는 **거의 모든 읽기가 "tail read"(최근 데이터)라서 페이지 캐시에서 나가기 때문**입니다.

```
  정상 Kafka 워크로드:
  ┌──────────────────────────── 파티션 로그 ─────────────────┐
  │ 오래된 데이터 (디스크) ................ 최근 (페이지 캐시) │
  └──────────────────────────────────────────▲───────────────┘
                                   대부분의 소비자가 여기서 읽음
                                   → 디스크 I/O 거의 0, 제로카피 100%

  랜덤 조회 워크로드:
  ┌──────────────────────────── 파티션 로그 ─────────────────┐
  │   ▲      ▲         ▲      ▲       ▲        ▲       ▲     │
  └───┴──────┴─────────┴──────┴───────┴────────┴───────┴─────┘
      흩어진 위치 → 페이지 캐시 미스 폭증
      → 디스크 랜덤 I/O, 캐시 오염으로 정상 소비자까지 느려짐
```

**즉 랜덤 조회는 자기만 느린 게 아니라 같은 브로커의 다른 컨슈머까지 끌고 내려갑니다.** 이건 단순한 성능 저하가 아니라 **격리 실패**입니다.

#### 함정 ⑥ — Tiered Storage를 켜면 콜드 데이터 조회가 급격히 나빠진다

"무한 보존"을 위해 Tiered Storage(KIP-405)를 쓰면, 오래된 데이터는 S3에 있습니다.

- 콜드 데이터 조회 = **S3 GET 요청** → 지연시간이 ms에서 수백 ms로
- **API 요청 과금** (1,000 GET당 과금) + **egress 요금** 발생 → 랜덤 조회가 잦으면 비용이 예측 불가능해짐
- **구현 상 제약:** 검색 결과에 따르면 **브로커는 하나의 FetchRequest에서 오직 한 파티션에 대해서만 remote fetch를 수행**합니다. 50개 파티션의 과거 데이터를 요청하면 **1개 파티션 분량만 응답되고 나머지 49개는 빈 응답**입니다. 랜덤 조회 워크로드에서는 치명적입니다.

#### 함정 ⑦ — 수정과 삭제

- 개별 레코드 `UPDATE`/`DELETE` 불가
- Log compaction의 tombstone(`null` 값)으로 "키 삭제"는 가능하지만, **`delete.retention.ms` 이후 tombstone 자체가 제거**되므로 그보다 오래 오프라인이던 소비자는 삭제를 놓칩니다
- **GDPR "잊혀질 권리"와 구조적으로 충돌** — append-only + 불변이 설계 전제이기 때문. 실무 우회책은 crypto-shredding(사용자별 암호화 키를 삭제해 데이터를 복호화 불가로 만듦)

---

### 4. "순서만 필요한 경우"에 대한 별도 검토

질문의 두 번째 조건입니다. 여기엔 **명시적으로 짚어야 할 제약**이 있습니다.

#### Kafka의 순서 보장은 파티션 단위입니다

```
  Topic: orders
  ┌─ Partition 0 ─────┐   ┌─ Partition 1 ─────┐   ┌─ Partition 2 ─────┐
  │ 0 │ 1 │ 2 │ 3 │   │   │ 0 │ 1 │ 2 │       │   │ 0 │ 1 │ 2 │ 3 │ 4 │
  └───────────────────┘   └───────────────────┘   └───────────────────┘
       전순서 ✅                전순서 ✅                전순서 ✅

              파티션 간 순서 ❌ (전역 순서 없음)
```

**전역(global) 전순서가 필요하면 파티션을 1개로 만들어야 합니다.** 그 대가는:

| 항목 | 단일 파티션의 제약 |
|---|---|
| **처리량** | 브로커 1대가 담당 → 수평 확장 불가. 대략 수만~수십만 msg/s가 천장 |
| **소비 병렬성** | 컨슈머 그룹 내 **활성 컨슈머 1개**만 가능 (KIP-932 share group 예외 있으나 순서 포기) |
| **장애 영향** | 해당 브로커 장애 시 리더 재선출까지 토픽 전체 정지 |
| **리밸런싱** | 파티션 수를 나중에 늘리면 키-파티션 매핑이 깨짐. **파티션 수는 줄일 수 없음** |

> **실무 판단:** "전역 순서가 정말 필요한가"를 먼저 의심해야 합니다. 대부분의 경우 필요한 건 **엔티티 단위 순서**(같은 주문의 이벤트끼리 순서, 같은 사용자의 이벤트끼리 순서)이고, 그건 **파티션 키를 엔티티 ID로 잡으면** 확장성을 유지하면서 얻을 수 있습니다. 진짜 전역 순서가 필요한 경우는 글로벌 시퀀스 번호 발급, 단일 원장(ledger) 정도입니다.

#### 순서 + 내구성만 필요하다면 → 이건 Kafka의 정확한 sweet spot입니다

이 조건에 딱 맞는 실제 용례:

| 용례 | 설명 |
|---|---|
| **이벤트 소싱 스토어** | 애그리게이트의 이벤트를 순서대로 저장. 상태는 replay로 복원 |
| **감사 로그 / WORM** | 규제 대응. 불변 + 순서 + 장기 보존이 요구사항 그 자체 |
| **커밋 로그 / 원장(ledger)** | 금융 거래 기록, 블록체인 유사 구조 |
| **Outbox** | 트랜잭션 경계 안에서 발행된 이벤트의 순서 보장 전달 |
| **CDC 파이프라인** | DB changelog의 순서 보존 전달 |
| **재처리용 원본** | 새 모델/새 스키마로 과거 전체를 다시 계산 |

이 목록의 공통점: **"쓰고, 순서대로 다시 읽는다"** 이지 **"찾는다"** 가 아닙니다.

---

### 5. 성능 비교 — 숫자로 보기

같은 "레코드 1건 가져오기" 작업:

| 저장소 | 조회 방식 | 지연시간 | 초당 처리 가능 | 비고 |
|---|---|---|---|---|
| **Redis** | `GET key` | ~0.1 ms | 10만+ | 메모리 |
| **PostgreSQL** | PK 인덱스 | ~0.3~1 ms | 1만+ | 버퍼 캐시 히트 시 |
| **Kafka (hot, 페이지 캐시)** | `seek` + `poll` | ~5~20 ms | 수백~수천 | consumer 재사용 전제 |
| **Kafka (cold, 로컬 디스크)** | `seek` + `poll` | ~20~100 ms | 수십~수백 | 페이지 캐시 미스 |
| **Kafka (tiered, S3)** | `seek` + remote fetch | ~200 ms~수 초 | 수십 | + GET 요청 과금 |

반대로 **순차 대량 읽기**에서는 완전히 뒤집힙니다:

| 저장소 | 1억 건 순차 읽기 |
|---|---|
| **Kafka** | 제로카피 + 순차 I/O + 배칭 → **수십 초~수 분** |
| **PostgreSQL** | 풀 스캔, MVCC 가시성 검사, 튜플 디코딩 → **훨씬 느림** |

**즉 Kafka와 RDB는 "누가 빠른가"가 아니라 "어떤 접근 패턴에 최적화되었는가"가 정반대입니다.** [직전 문서에서 다룬 로우/컬럼 지향의 대비](../database/columnar-vs-row-oriented-db.md)와 정확히 같은 구조의 트레이드오프입니다.

---

### 6. 그래서 어떻게 하는가 — 실전 패턴 4가지

#### 패턴 A — Kafka = 원본, 조회는 파생 저장소 (정석)

```
        쓰기
         │
         ▼
  ┌──────────────┐
  │    Kafka      │  ← system of record. 순서·내구성·재생 담당
  │  (원본 로그)   │
  └──────┬───────┘
         │ 구독
    ┌────┴────┬──────────┬───────────┐
    ▼         ▼          ▼           ▼
 [Postgres] [Redis] [Elasticsearch] [ClickHouse]
  단건조회   캐시      검색            분석
```

**이것이 [The Log의 핵심 주장](../distributed-systems/the-log/00-overview.md) 그 자체입니다** — "테이블/인덱스는 로그의 투영(projection)". Kafka를 DB로 쓰려 하지 말고, **Kafka를 진실의 원본으로 두고 조회용 투영을 따로 만드는 것**이 저자가 설계한 의도입니다.

#### 패턴 B — Kafka 안에서 조회 가능하게 만들기

| 방법 | 설명 |
|---|---|
| **Kafka Streams + Interactive Queries** | 상태 저장소(RocksDB)를 애플리케이션 안에 두고 REST로 노출. 키 기반 조회 가능 |
| **ksqlDB Pull Query** | SQL로 머티리얼라이즈드 뷰를 조회. Confluent가 "ksqlDB가 있으면 Kafka는 DB다"라고 주장하는 근거 |
| **GlobalKTable** | 작은 참조 데이터를 모든 인스턴스에 전체 복제해 로컬 조회 |

이 방법들의 본질은 **"Kafka 옆에 인덱스를 자동으로 만들어주는 레이어"** 입니다. 결국 인덱스는 만들어야 한다는 점은 변하지 않고, 다만 그 관리를 프레임워크가 해줍니다.

#### 패턴 C — 외부 offset 인덱스 (질문의 구상에 가장 가까운 형태)

```
  [인덱스 테이블 — Postgres/Redis]        [Kafka — 실제 데이터]
  ┌───────────┬─────────────────┐
  │ order_id  │ topic/part/off  │  ──────▶  seek + poll
  ├───────────┼─────────────────┤
  │ A-123     │ orders/2/847291 │
  │ A-124     │ orders/0/912833 │
  └───────────┴─────────────────┘
```

**장점:** 큰 페이로드를 Kafka에 두고 인덱스만 작게 유지 → 저장 비용 절감
**단점:** 함정 ③(offset 이식성) 직격. DR 전환 시 인덱스 전체 무효화
**평가:** 가능은 하지만, 이럴 거면 보통 **S3 + 오브젝트 키**를 쓰는 게 낫습니다. S3 키는 클러스터 마이그레이션에 영향받지 않습니다.

#### 패턴 D — 2026년의 답: 토픽을 테이블로 물질화

[The Log 분석 05번 문서](../distributed-systems/the-log/05-critique-and-2026-update.md)에서 다룬 흐름입니다.

| 제품 | 동작 |
|---|---|
| **Confluent Tableflow** (2025-03 GA) | Kafka 토픽을 Iceberg/Delta 테이블로 자동 물질화. 스키마 매핑·컴팩션·카탈로그 등록까지 |
| **StreamNative Ursa** | 토픽을 오픈 테이블 포맷으로 직접 저장 |
| **Apache Fluss** | 컬럼 지향 스트리밍 스토리지. 서브초 신선도 + PK 테이블 + Iceberg 티어링 |

```
  [Kafka 토픽]  ← 순서·저지연 구독 (로그 표현)
       │
       ▼ 자동 물질화
  [Iceberg 테이블] ← SQL 조회·집계·조인 (테이블 표현)
       │
   Trino / Spark / DuckDB / Snowflake
```

**이것이 "Kafka를 DB처럼 쓰고 싶다"에 대한 2026년의 정식 답변입니다.** Kafka를 억지로 DB로 만드는 게 아니라, **같은 데이터를 로그 표현과 테이블 표현으로 동시에 물질화**하는 것. [Part 1의 로그/테이블 이중성](../distributed-systems/the-log/01-part1-what-is-a-log.md)이 제품으로 구현된 형태입니다.

---

### 7. 판단 체크리스트

**Kafka만으로 충분한 경우 (전부 ✅면 추가 DB 불필요):**

- [ ] 접근 패턴이 **순차 재생** 또는 **시간 범위 조회**뿐이다
- [ ] "특정 레코드를 조건으로 찾기"가 요구사항에 없다
- [ ] 개별 레코드 수정·삭제가 필요 없다
- [ ] 순서 보장 범위가 **엔티티 단위**로 충분하다 (전역 순서 불필요)
- [ ] 소비자 수가 예측 가능하고, 랜덤 조회 트래픽이 없다
- [ ] 개인정보 삭제 요구가 없거나 crypto-shredding으로 대응 가능
- [ ] offset을 외부 시스템의 영구 참조로 쓰지 않는다

**추가 저장소가 반드시 필요한 신호:**

- [ ] `WHERE` 조건으로 찾아야 한다
- [ ] 사용자 요청 경로에서 단건 조회를 한다(API 백엔드)
- [ ] 집계·조인·정렬이 필요하다
- [ ] p99 지연시간 10ms 이하가 요구된다
- [ ] 레코드 수정이 발생한다
- [ ] 여러 클러스터·리전 간 참조 무결성이 필요하다

---

### 8. 흔한 오해 정리

| 오해 | 실제 |
|---|---|
| "Kafka는 순차 읽기만 되고 랜덤 액세스가 안 된다" | ❌ sparse index로 O(log n) 랜덤 액세스 가능. 다만 **비싸고 캐시를 오염시킴** |
| "offset은 영구 불변 ID다" | ❌ 클러스터·토픽 재생성·미러링 시 달라짐. 트랜잭션 마커/compaction으로 구멍도 생김 |
| "retention을 무한으로 하면 DB와 같다" | ⚠️ 보존은 해결되지만 **조회 능력은 그대로 없음** |
| "Kafka는 트랜잭션이 없다" | ❌ 0.11부터 다중 파티션 원자적 쓰기 지원. 다만 DB의 격리 수준과는 다른 개념 |
| "Kafka에 데이터를 오래 두는 건 안티패턴" | ❌ Kreps가 직접 반박("It's Okay to Store Data in Apache Kafka"). Tiered Storage로 비용도 해결 |
| "순서 보장되니까 글로벌 시퀀스로 쓸 수 있다" | ⚠️ 파티션 1개로 제한해야 하고, 그러면 확장성을 포기 |
| "ksqlDB 쓰면 Kafka가 DB다" | ⚠️ Confluent의 마케팅 포지션. 조회는 되지만 **별도 머티리얼라이즈드 뷰를 유지하는 것**이지 Kafka 자체의 능력은 아님 |

---

## 한 줄 결론

> **"순서대로 쓰고 순서대로 읽는다"면 Kafka는 이미 훌륭한 DB입니다.** 실제로 이벤트 소싱·감사 로그·원장에는 Kafka가 RDB보다 나은 선택입니다.
>
> **하지만 "찾는다"가 들어오는 순간 Kafka는 DB가 아닙니다.** offset을 알아내는 수단이 Kafka 안에 없기 때문이고, 그 수단을 만드는 순간 이미 다른 DB를 도입한 것이기 때문입니다.
>
> 정답은 **Kafka를 DB로 바꾸는 것이 아니라, Kafka를 원본으로 두고 조회용 투영을 따로 만드는 것** — 즉 The Log가 처음부터 주장한 구조입니다.

---

## Sources

- [Can Apache Kafka Replace a Database? — Kai Waehner](https://www.kai-waehner.de/blog/2020/03/12/can-apache-kafka-replace-database-acid-storage-transactions-sql-nosql-data-lake/)
- [Is Kafka a Database? With ksqlDB - Most Definitely — Confluent](https://www.confluent.io/blog/is-kafka-a-database-with-ksqldb/)
- [Kafka As A Database? Yes Or No – A Summary Of Both Sides — David Xiang](https://davidxiang.com/2021/01/10/kafka-as-a-database/)
- [Kafka, Samza and the Unix Philosophy of Distributed Data — Martin Kleppmann](https://martin.kleppmann.com/papers/kafka-debull15.pdf)
- [Kafka Internals: Segments, Segment Size & Indexes — Conduktor](https://www.conduktor.io/kafka/kafka-topics-internals-segments-and-indexes)
- [Deep dive — how Kafka stores logs on disk (segments, rolling, indexes, retention, compaction)](https://medium.com/@anil.goyal0057/deep-dive-how-kafka-stores-logs-on-disk-segments-rolling-indexes-retention-compaction-b41500d2d057)
- [Kafka Replication Without the (Offset) Gaps — WarpStream](https://www.warpstream.com/blog/kafka-replication-without-the-offset-gaps)
- [Kafka MirrorMaker 2: Offset Replication vs. Translation Explained for Disaster Recovery — Lenses.io](https://lenses.io/blog/2025/10/kafka-replication-mirrormaker2-complexity/)
- [KIP-405: Kafka Tiered Storage — Apache Kafka](https://cwiki.apache.org/confluence/spaces/KAFKA/pages/97554472/KIP-405+Kafka+Tiered+Storage)
- [Kafka Tiered Storage in depth: How Reads and Deletes Flow (Prefetching, Caching) — Aiven](https://aiven.io/blog/kafka-tiered-storage-in-depth-how-reads-and-deletes-flow)
- [KIP-405: kafka 🤝 SSDs (Tiered Storage) — 2 Minute Streaming](https://blog.2minutestreaming.com/p/apache-kafka-kip-405-tiered-storage)
- [Confluent Announces Infinite Retention for Apache Kafka in Confluent Cloud](https://www.businesswire.com/news/home/20200701005237/en/Confluent-Announces-Infinite-Retention-for-Apache-Kafka-in-Confluent-Cloud)

---

## 관련 문서

- [`distributed-systems/the-log/`](../distributed-systems/the-log/00-overview.md) — "테이블은 로그의 투영" 원리. 이 질문의 사상적 배경
- [`distributed-systems/the-log/03-part3-stream-processing.md`](../distributed-systems/the-log/03-part3-stream-processing.md) — log compaction, 로컬 상태 + changelog
- [`distributed-systems/the-log/05-critique-and-2026-update.md`](../distributed-systems/the-log/05-critique-and-2026-update.md) — Tableflow/Fluss 등 토픽-테이블 물질화
- [`kafka/kafka-vs-rabbitmq.md`](./kafka-vs-rabbitmq.md) — "큐 vs 로그"의 차이
- [`kafka/spring-kafka-consumer-vs-outbox.md`](./spring-kafka-consumer-vs-outbox.md) — Outbox 패턴
- [`database/columnar-vs-row-oriented-db.md`](../database/columnar-vs-row-oriented-db.md) — 접근 패턴에 따른 저장 구조 최적화의 일반 원리
