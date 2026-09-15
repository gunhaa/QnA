# Part Three: Logs & Real-time Stream Processing — 상세 분석

> [← Part Two](./02-part2-data-integration.md) | [다음: Part Four →](./04-part4-system-building.md)

원문 해당 절: *Logs & Real-time Stream Processing / Data flow graphs / Stateful Real-Time Processing / Log Compaction*

---

## 쉬운 설명

식당에 주문이 들어오는 걸 생각해봅시다.

**배치 처리**는 "하루 종일 주문서를 모아뒀다가 밤 12시에 한꺼번에 요리하기"입니다. **스트림 처리**는 "주문서가 들어오는 대로 바로바로 요리하기"입니다.

이 Part가 하는 말은 이겁니다 — **둘은 다른 요리법이 아니다.** 하루 치를 모아서 하는 건 그냥 "창문 크기가 하루짜리인 스트림 처리"일 뿐이에요. 주문이 계속 들어오면 계속 요리하는 게 자연스럽고, 주문이 하루에 한 번 몰려오면 하루에 한 번 요리하는 게 자연스러울 뿐입니다.

그리고 요리사가 "지금까지 몇 그릇 나갔지?" 같은 걸 기억해야 하면, **그걸 수첩(로그)에 적어두면 됩니다.** 요리사가 쓰러져도 다른 사람이 수첩을 읽고 이어서 하면 되니까요.

---

## 일반 설명

### 0. Part 3의 위치

Part 2가 "로그로 데이터를 **옮기는**" 문제였다면, Part 3는 "로그 위에서 데이터를 **계산하는**" 문제입니다. 그리고 Part 2의 아키텍처가 자연스럽게 Part 3를 낳는다는 게 논증의 골자입니다 — 일단 모든 데이터가 로그로 흐르면, 그 위에서 계산하는 건 "로그를 읽어 로그를 쓰는 프로세스"일 뿐이기 때문입니다.

### 1. 스트림 처리란 무엇인가 — 저자의 정의

2013년 당시 "스트림 처리"는 정의가 매우 흐릿한 용어였습니다(CEP, complex event processing, real-time analytics 등이 난립). 저자는 대단히 넓고 단순한 정의를 제시합니다:

> stream processing is **"infrastructure for continuous data processing. I think the computational model can be as general as MapReduce or other distributed processing frameworks, but with the ability to produce low-latency results."**

그리고 더 본질적인 정의:

> **"it is just processing which includes a notion of time in the underlying data being processed and does not require a static snapshot of the data so it can produce output at a user-controlled frequency instead of waiting for the 'end' of the data set to be reached."**

이 두 번째 정의를 분해하면 세 개의 조건이 나옵니다:

| 조건 | 의미 | 배치와의 대비 |
|---|---|---|
| **데이터 자체에 시간 개념이 포함됨** | 레코드가 "언제 일어난 일인지"를 담음 | 배치는 데이터셋을 무시간적 집합으로 취급 |
| **정적 스냅샷을 요구하지 않음** | 입력이 계속 자라도 처리 가능 | 배치는 "입력이 고정됨"을 전제 |
| **출력 빈도를 사용자가 정함** | 원할 때 중간 결과를 낼 수 있음 | 배치는 "데이터의 끝"에 도달해야 출력 |

> **중요한 독해:** 이 정의에서 **"낮은 지연시간"은 부산물이지 본질이 아닙니다.** 본질은 "데이터의 끝을 기다리지 않는다"입니다. 이 구분은 2026년의 표준 프레임(Flink의 bounded/unbounded stream 모델, Google Dataflow 모델)과 정확히 일치합니다 — 스트림 처리는 "빠른 처리"가 아니라 **"무한 데이터(unbounded data)에 대한 처리"** 라는 것.

### 2. 배치와 스트림은 다른 패러다임이 아니다

Part 3에서 가장 자주 인용되는 주장:

> **"Data which is collected in batch is naturally processed in batch. When data is collected continuously, it is naturally processed continuously."**

그리고 결정타:

> **"Production 'batch' processing jobs that run daily are often effectively mimicking a kind of continuous computation with a window size of one day."**

**논증의 구조:**

```
  통념:  배치 처리 ≠ 스트림 처리   (다른 패러다임, 다른 도구, 다른 팀)

  저자:  배치 처리 = 윈도우 크기가 1일인 스트림 처리
         ─────────────────────────────────────────
         차이의 원인은 "처리 방식"이 아니라
         "데이터 수집 방식"이었다.

         옛날: 데이터가 배치로 도착 (야간 파일 덤프)  → 배치로 처리하는 게 자연스러움
         지금: 데이터가 연속으로 도착 (이벤트 스트림)  → 연속으로 처리하는 게 자연스러움
```

즉 **배치 처리는 데이터 수집이 배치였던 시대의 잔재**라는 주장입니다. 데이터가 이미 연속으로 흐르고 있는데 인위적으로 하루씩 모아서 처리하는 건, 원래 없던 지연을 스스로 만들어 넣는 것입니다.

> **2026년 평가 — 절반만 맞았다:**
> - **맞은 부분:** Flink 같은 현대 엔진은 실제로 배치를 "유한한 스트림"의 특수 사례로 취급합니다(Flink의 통합 배치/스트림 실행). Spark도 Structured Streaming에서 같은 방향으로 갔습니다. 개념적 통합은 저자의 예측대로 일어났습니다.
> - **덜 맞은 부분:** 운영 현실에서 배치는 사라지지 않았습니다. 대규모 과거 데이터 재처리, 복잡한 다중 조인, 비용 최적화(스팟 인스턴스로 야간 대량 처리)에서는 배치가 여전히 압도적으로 저렴하고 단순합니다. 자세한 건 [05번 문서](./05-critique-and-2026-update.md)의 Lambda/Kappa 논쟁 참고.

### 3. Data Flow Graphs — 로그로 연결된 처리 그래프

#### 스트림 처리기의 최소 정의

> **"A stream processor need not have a fancy framework at all: it can be any process or set of processes that read and write from logs."**

이 문장이 중요한 이유: 저자는 스트림 처리를 **특정 프레임워크에 묶인 것으로 정의하지 않습니다.** "로그를 읽고 로그를 쓰는 프로세스"면 전부 스트림 처리기입니다. 파이썬 스크립트도, Storm 토폴로지도, Samza 잡도 같은 범주입니다.

> "Both Storm and Samza are built in this fashion and can use Kafka or other similar systems as their log."

이 설계 철학은 이후 **Kafka Streams**(2016)에서 극단까지 갑니다 — 별도 클러스터 없이 그냥 라이브러리로, 일반 Java 애플리케이션 안에서 동작합니다. 프레임워크가 아니라 라이브러리라는 선택은 이 문장의 직계 후손입니다.

#### 잡들이 만드는 그래프

```
  [원시 이벤트 로그]        [DB changelog]
        │                        │
        ▼                        │
  ┌───────────┐                  │
  │  잡 A      │  필터/정제        │
  │ (정규화)   │                  │
  └─────┬─────┘                  │
        ▼                        │
  [정제된 로그] ◀─────────────────┘
        │              (조인)
        ├──────────────┬──────────────┐
        ▼              ▼              ▼
  ┌───────────┐  ┌──────────┐  ┌──────────┐
  │  잡 B      │  │  잡 C     │  │  잡 D     │
  │ (세션화)   │  │ (집계)    │  │ (이상탐지) │
  └─────┬─────┘  └────┬─────┘  └────┬─────┘
        ▼             ▼             ▼
  [세션 로그]    [집계 로그]    [알림 로그]
        │             │             │
        ▼             ▼             ▼
   [추천 시스템]   [대시보드]    [온콜 알림]
```

> **"using a centralized log in this fashion, you can view all the organization's data capture, transformation, and flow as just a series of logs and processes that write to them."**

**핵심 설계 원칙: 잡과 잡 사이의 인터페이스가 로그다.**

이것이 왜 강력한가:

| 성질 | 이유 |
|---|---|
| **중간 결과가 1급 시민** | 잡 B의 출력은 그냥 또 하나의 로그 → 누구나 구독 가능. 파이프라인 내부가 아닌 **공용 자산** |
| **잡 단위 독립 배포/장애** | 잡 C가 죽어도 잡 B, D는 정상. 로그가 버퍼 역할 |
| **디버깅 가능성** | 어느 단계의 출력이든 그냥 로그를 읽어보면 됨. 블랙박스가 없음 |
| **재처리 지점 선택** | 잡 C만 다시 돌리고 싶으면 그 입력 로그를 되감으면 됨 |
| **팀 경계와 일치** | 각 잡을 다른 팀이 소유해도 계약(로그 스키마)만 지키면 됨 |

> **Unix 파이프와의 대조 (원문에는 없는, 이해를 돕기 위한 비교):** Unix 파이프 `a | b | c`에서 중간 결과는 **휘발**되고 소비자는 하나뿐입니다. 로그 기반 그래프에서 중간 결과는 **영속**하고 소비자가 여러 개일 수 있습니다. 즉 "내구성 있는 다중 구독 파이프"입니다. 이 차이가 재처리·디버깅·재사용을 가능하게 합니다. (참고: 이 Unix 비유는 원문에 등장하지 않습니다. 이후 Martin Kleppmann이 *Designing Data-Intensive Applications* 10~11장에서 명시적으로 전개한 논의입니다.)

### 4. Stateful Real-Time Processing — 이 Part의 기술적 핵심

무상태(stateless) 처리(필터, 맵)는 쉽습니다. 어려운 건 **상태를 가진 처리**입니다 — 조인, 윈도우 집계, 중복 제거, 세션화.

#### 문제 정의

"지난 1시간 동안 사용자별 클릭 수"를 계산하려면 사용자별 카운터를 어딘가에 들고 있어야 합니다. 선택지는 둘입니다:

| 방식 | 장점 | 단점 |
|---|---|---|
| **원격 상태** — 외부 DB(Redis, Cassandra)에 저장 | 장애 시 상태 보존, 공유 가능 | **레코드마다 네트워크 왕복** → 처리량 붕괴. 외부 DB가 병목·SPOF |
| **로컬 상태** — 프로세스에 붙은 로컬 스토어 | 네트워크 없음 → 수십만 TPS 가능 | 프로세스가 죽으면 상태 소실 |

저자의 답은 **로컬 상태 + changelog** 입니다.

#### 로컬 상태

> **"A stream processor can keep it's state in a local 'table' or 'index'—a bdb, leveldb, or even something more unusual such as a Lucene or fastbit index."**

여기 열거된 선택지가 의미심장합니다:

- **bdb / leveldb** — 임베디드 KV 스토어 (오늘날 Kafka Streams는 **RocksDB** 사용, LevelDB의 포크)
- **Lucene** — 전문 검색 인덱스. 즉 로컬 상태가 KV일 필요가 없음
- **fastbit** — 비트맵 인덱스. 분석용 질의에 최적

**요점:** 로컬 상태는 **처리에 맞는 자료구조를 자유롭게 고를 수 있습니다.** Part 1의 "테이블/인덱스는 로그의 투영"이라는 원칙이 여기서 회수됩니다 — 스트림 처리기의 로컬 스토어는 그냥 또 하나의 투영입니다.

#### changelog를 통한 장애 복구

> **"It can journal out a changelog for this local index it keeps to allow it to restore its state in the event of a crash and restart."**

```
  입력 로그
     │
     ▼
  ┌────────────────────────────────────┐
  │  스트림 처리 잡 (태스크 인스턴스)      │
  │                                    │
  │    ┌──────────────────┐            │
  │    │  로컬 상태 스토어   │            │
  │    │   (RocksDB 등)    │            │
  │    └────────┬─────────┘            │
  │             │ 모든 변경을 기록        │
  └─────────────┼──────────────────────┘
                ▼
        [상태 changelog 로그]  ◀── compaction 적용된 Kafka 토픽
                │
                │ 크래시 후 재시작 시
                ▼
        로컬 스토어를 처음부터 재생하여 복원
```

**이것이 이 글 전체에서 가장 우아한 회수(payoff)입니다.**

Part 1에서 "테이블은 로그의 투영이고, 로그로부터 언제든 테이블을 복원할 수 있다"고 했습니다. 여기서 그 원리가 **장애 복구 메커니즘으로 직접 구현**됩니다. 로컬 상태는 테이블이고, changelog는 그 로그이고, 복구는 replay입니다. 새로운 메커니즘을 하나도 도입하지 않고 Part 1의 원리만으로 fault tolerance를 얻었습니다.

> **실제 구현:** Kafka Streams가 정확히 이 구조입니다. 각 상태 저장소(state store)마다 `<app-id>-<store-name>-changelog` 라는 내부 토픽이 자동 생성되고, log compaction이 적용됩니다. 태스크가 다른 노드로 옮겨가면 그 노드가 changelog를 읽어 RocksDB를 재구축합니다. Flink는 조금 다른 길(주기적 분산 스냅샷 = Chandy-Lamport 기반 체크포인트를 객체 스토리지에 저장)을 택했는데, 두 접근의 차이는 [05번 문서](./05-critique-and-2026-update.md)에서 다룹니다.

#### 스트림-테이블 조인 — 이중성의 실전 활용

> **"When combined with the logs coming out of databases for data integration purposes, the power of the log/table duality becomes clear. A change log may be extracted from a database and indexed in different forms by various stream processors to join against event streams."**

구체적 시나리오:

```
  [클릭 이벤트 스트림]          [사용자 테이블 CDC changelog]
   user_id, page, ts            user_id, 국가, 가입일, 등급
        │                              │
        │                              ▼
        │                     ┌──────────────────┐
        │                     │  로컬 상태 스토어   │  ← changelog를 재생해
        │                     │  user_id → 프로필  │     로컬 테이블로 물질화
        │                     └────────┬─────────┘
        │                              │
        └──────────► 조인 ◀────────────┘
                     │
                     ▼
        [보강된 클릭 이벤트]
        user_id, page, ts, 국가, 등급
```

**왜 이게 대단한가:** 전통적 방식이라면 클릭 이벤트마다 사용자 DB에 쿼리를 날려야 합니다 — 초당 수십만 클릭이면 DB가 죽습니다. 로그 기반 방식에서는 사용자 DB의 changelog를 **미리 로컬로 복제해두고** 메모리/로컬 디스크에서 조회합니다. 네트워크 왕복이 0입니다.

추가 이점:

- **시점 정확성(temporal correctness)** — 원격 DB를 조회하면 "지금 시점의 프로필"이 붙지만, changelog 재생을 쓰면 "이벤트 발생 시점의 프로필"을 붙일 수 있습니다. 재처리 시 과거와 동일한 결과가 나옵니다(**결정론 유지** — Part 1의 요구사항).
- **소스 DB 보호** — 분석 트래픽이 운영 DB에 전혀 닿지 않습니다.

> **Kafka Streams / Flink 대응:** Kafka Streams의 `KStream.join(KTable)`, Flink SQL의 Temporal Table Join이 정확히 이 패턴입니다. 특히 Flink의 "temporal join"은 위에서 말한 시점 정확성을 명시적으로 표현하는 문법입니다.

### 5. Log Compaction — 무한 보존 문제의 해법

여기까지의 모든 논증은 한 가지 전제에 의존합니다: **로그가 충분히 오래 보존된다.** 그런데 무한 보존은 무한 저장 비용입니다. 이 절이 그 문제를 풉니다.

#### 데이터 종류에 따른 두 가지 보존 정책

> **"For event data, Kafka supports just retaining a window of data. Usually, this is configured to a few days, but the window can be defined in terms of time or space."**

**(1) 이벤트 데이터 → 시간/용량 기반 보존 (time/size retention)**

클릭 이벤트 같은 것은 각 레코드가 독립적 사실이고 "최신값"이라는 개념이 없습니다. 오래된 것은 그냥 버립니다. Kafka의 `retention.ms`, `retention.bytes`.

**(2) 키 있는 데이터 → 압축(compaction)**

> **"Instead of simply throwing away the old log, we remove obsolete records—i.e. records whose primary key has a more recent update. By doing this, we still guarantee that the log contains a complete backup of the source system."**

```
압축 전:
  offset: 0      1      2      3      4      5      6      7
         K1=a   K2=b   K1=c   K3=d   K2=e   K1=f   K4=g   K3=h
                       ────          ────          ────
                 (K1의 구버전)  (K2의 구버전)  (K3의 구버전)

압축 후:
  offset: 4      5      6      7
         K2=e   K1=f   K4=g   K3=h
         ↑ 오프셋은 보존됨 (순서와 위치는 유지, 구멍이 생길 뿐)

  ⇒ 모든 키의 "최신값"이 반드시 존재함이 보장됨
  ⇒ 로그의 크기가 데이터 이력이 아니라 **고유 키 개수**에 비례
```

**압축이 제공하는 보장이 핵심입니다:**

> "we still guarantee that the log contains a complete backup of the source system"

즉 압축된 로그는 **소스 시스템의 완전한 백업과 동등**합니다. 이 로그를 처음부터 끝까지 읽으면 소스 테이블의 현재 상태 전체가 재구성됩니다.

#### 압축이 없으면 무너지는 것들

압축은 사소한 최적화가 아니라 **Part 2와 Part 3 전체를 성립시키는 전제**입니다.

| 기능 | 압축이 없으면 |
|---|---|
| 새 소비자가 로그 처음부터 읽어 상태 부트스트랩 | 보존 기간이 짧으면 초기 상태를 만들 수 없음 → 별도 덤프/스냅샷 경로 필요 |
| 스트림 처리 잡의 상태 복구 | changelog가 잘리면 상태를 복원할 수 없음 |
| CDC로 DB를 완전 복제 | 초기 전체 스냅샷 없이는 복제본을 만들 수 없음 |
| "로그가 system of record" 주장 | 로그가 원본이 될 수 없음(불완전하므로) |

**따라서:** Part 3의 압축 절은 사실 Part 2와 Part 4의 논증을 뒷받침하기 위해 여기 놓인 것입니다. "중앙 로그가 진짜 원본"이라는 대담한 주장을 유한한 디스크 위에서 실현 가능하게 만드는 마지막 퍼즐 조각입니다.

> **구현 상 유의점 (2026 기준):**
> - Kafka의 log compaction은 0.8.1(2014)부터 정식 제공. `cleanup.policy=compact`
> - **삭제(tombstone)**: 키에 대해 `null` 값을 쓰면 해당 키가 삭제됨을 의미. tombstone 자체도 `delete.retention.ms` 후 제거되므로, 그보다 오래 오프라인이었던 소비자는 삭제를 놓칠 수 있음
> - 압축은 **즉시가 아니라 백그라운드**로 동작하므로 "중복 키가 일시적으로 존재할 수 있음". 소비자는 멱등(idempotent)해야 함
> - 압축은 **키가 반드시 있어야** 동작. 키 없는 레코드는 압축 대상이 아님
> - `cleanup.policy=compact,delete` 조합으로 "압축하되 아주 오래된 건 삭제"도 가능

### 6. Part 3에 대한 비판적 검토

#### (a) "배치 = 윈도우 1일짜리 스트림"의 한계

개념적으로는 옳지만, **실행 특성이 다릅니다.**

| | 배치 실행 | 스트림 실행 |
|---|---|---|
| 스케줄링 | 잡 시작 시 리소스 확보, 종료 시 반납 | 24×7 상주 |
| 셔플/정렬 | 전체 데이터를 알고 있어 전역 정렬·해시 조인 가능 | 증분적으로만 가능 |
| 실패 처리 | 잡 재실행 | 체크포인트 복구 + 재생 |
| 비용 | 스팟 인스턴스, 완료 후 0원 | 항상 켜져 있음 |
| 백필(backfill) | 자연스러움 | 재생 처리량이 병목 |

대량 과거 데이터를 다시 돌려야 할 때 스트림 엔진은 **"실시간 처리량의 N배로 따라잡기"** 를 해야 하는데, 이는 클러스터를 일시적으로 크게 키워야 함을 뜻합니다. 배치는 애초에 그렇게 설계되어 있습니다. 이 실무적 비대칭을 글은 다루지 않습니다.

#### (b) 시간의 의미론 — 글에 빠진 가장 큰 주제

저자는 "스트림 처리는 데이터에 시간 개념을 포함한다"고 정의했지만, **어떤 시간인지**는 다루지 않습니다. 이후 10년간 스트림 처리의 핵심 난제가 정확히 이것이었습니다:

- **event time** (사건이 실제 일어난 시각) vs. **processing time** (처리기가 본 시각)
- **늦게 도착한 데이터(late arrival)** — 모바일 기기가 오프라인이었다가 3일 뒤 전송하면?
- **워터마크(watermark)** — "이제 이 시각 이전 데이터는 더 안 올 것"이라는 추정을 어떻게 하는가
- **트리거(trigger)와 누적 모드** — 불완전한 중간 결과를 언제 내보내고 어떻게 정정하는가

이 문제군은 Google의 **Dataflow Model 논문(2015)** 과 Flink에서 체계화되었습니다. 즉 이 글은 "스트림 처리를 해야 한다"까지는 갔지만 "스트림 처리가 실제로 왜 어려운지"는 아직 몰랐던 시점의 글입니다.

#### (c) 정확히 한 번(exactly-once)의 부재

글은 처리 의미론(delivery semantics)을 거의 논의하지 않습니다. 하지만 "changelog로 상태를 복구한다"는 메커니즘은 **복구 시 중복 처리**를 유발할 수 있고, 카운터 같은 집계에서는 이것이 곧 오답입니다. Kafka의 트랜잭션·멱등 프로듀서(0.11, 2017), Flink의 2단계 커밋 싱크는 이 글 이후 4년이 걸려 나왔습니다. 2013년 시점에서 스트림 처리는 대체로 "at-least-once"였고, 그래서 Lambda Architecture처럼 "배치로 다시 계산해 정정하는" 구조가 필요했던 것입니다.

#### (d) 로컬 상태의 운영 비용

로컬 상태 + changelog는 성능상 훌륭하지만 운영상 비쌉니다:

- **리밸런싱 시 상태 이동** — 태스크가 다른 노드로 가면 changelog 전체를 재생해야 함. 상태가 수백 GB면 복구에 수십 분
- **스케일 아웃의 비대칭성** — 파티션 수가 상한이므로 무한 확장 불가
- **스토리지 결합** — 컴퓨트 노드에 디스크가 붙어 있어야 함 → 클라우드 네이티브(stateless compute) 원칙과 충돌

Kafka Streams의 standby replica, Flink의 증분 체크포인트/RocksDB state backend, 그리고 2020년대의 **분리형 상태(disaggregated state, Flink 2.0의 ForSt)** 는 전부 이 비용을 줄이려는 시도입니다.

#### (e) 압축이 지우는 것 — Part 1과의 긴장

앞서 지적했듯, log compaction은 **"모든 과거 버전을 복원할 수 있다"는 Part 1의 이중성의 가장 강력한 속성을 포기**합니다. 압축 후에는 키별 최신값만 남으므로 "3개월 전 이 사용자의 등급은 무엇이었나"에 답할 수 없습니다.

즉 이 글은 두 가지를 동시에 약속하지만 실제로는 양자택일입니다:

- **완전한 이력 보존** (이벤트 소싱, 감사, 시점 복원) → 압축 불가, 비용 무한 증가
- **효율적인 현재 상태 복원** (부트스트랩, 상태 복구) → 압축 필요, 이력 소실

실무에서는 보통 둘 다 운영합니다 — 압축 토픽(현재 상태용) + 장기 보존 아카이브(S3/데이터 레이크). 즉 **"로그 하나면 된다"는 이 글의 미학적 주장은 현실에서 "로그 + 레이크" 두 계층으로 분화**했습니다. 이 분화가 2020년대의 lakehouse / streaming lakehouse 논의로 이어집니다([05번 문서](./05-critique-and-2026-update.md)).

---

## Part 3 핵심 정리

| 주장 | 근거 | 2026년 실현 형태 |
|---|---|---|
| 스트림 처리 = 시간 개념을 포함하고 정적 스냅샷을 요구하지 않는 처리 | 정의 | Flink/Beam의 unbounded stream 모델 |
| 배치는 윈도우가 1일인 연속 처리 | 수집 주기가 처리 방식을 결정 | Flink의 통합 배치/스트림, Spark Structured Streaming |
| 스트림 처리기는 프레임워크일 필요 없음 — 로그를 읽고 쓰는 프로세스면 됨 | Storm/Samza가 그렇게 만들어짐 | **Kafka Streams**(라이브러리 모델) |
| 조직의 데이터 흐름 전체 = 로그와 잡의 그래프 | 잡 간 인터페이스가 로그 | 스트리밍 데이터 파이프라인, dbt-for-streaming 류 |
| 로컬 상태 + changelog로 상태 있는 처리의 내결함성 확보 | Part 1의 로그/테이블 이중성 | Kafka Streams changelog 토픽, RocksDB state store |
| CDC changelog를 로컬 물질화해 이벤트 스트림과 조인 | 로그/테이블 이중성 | `KStream.join(KTable)`, Flink Temporal Join |
| log compaction으로 무한 보존을 유한 용량에 실현 | 키별 최신값만 유지 | `cleanup.policy=compact`, 모든 상태 복구의 기반 |

---

> [← Part Two](./02-part2-data-integration.md) | [다음: Part Four — System Building →](./04-part4-system-building.md)
