# Part One: What Is a Log? — 상세 분석

> [← 개요로](./00-overview.md) | [다음: Part Two →](./02-part2-data-integration.md)

원문 해당 절: *What Is a Log? / Logs in databases / Logs in distributed systems / Changelog 101: Tables and Events are Dual / What's next*

---

## 쉬운 설명

**"용돈 기입장"** 하나만 생각하면 됩니다.

기입장에는 "5월 1일 +10000원", "5월 2일 -3000원" 이렇게 **일어난 일만 순서대로** 적습니다. 지금 잔액이 얼마인지는 따로 안 적어도 됩니다 — 처음부터 다 더하면 나오니까요.

그런데 반대는 안 됩니다. 잔액 "7000원"만 보고는 어제 뭘 샀는지 알 수 없어요. 그래서 **기입장이 잔액보다 더 똑똑합니다.**

친구한테 내 기입장을 그대로 베껴주면, 친구도 나와 똑같은 잔액을 계산해냅니다. 컴퓨터 여러 대를 똑같은 상태로 맞추는 방법이 정확히 이것입니다.

---

## 일반 설명

### 1. 로그의 정의 — 가장 단순한 저장 추상화

원문의 출발점 문장:

> "A log is perhaps the simplest possible storage abstraction. It is an append-only, totally-ordered sequence of records ordered by time."

여기서 세 단어가 전부 필수입니다.

- **append-only**: 끝에만 추가. 중간 수정·삭제 없음 → 동시성 제어가 극단적으로 단순해짐(경쟁 지점이 tail 한 곳뿐)
- **totally-ordered**: 전순서. 임의의 두 레코드에 대해 어느 쪽이 앞인지 항상 결정됨 → 결정론적 재생(replay)이 가능해지는 근거
- **ordered by time**: 여기서 "time"은 벽시계(wall clock)가 아니라 **논리 시계(logical clock)**

마지막 항목이 가장 중요합니다. 원문은 이 점을 명시합니다 — 각 엔트리에 붙는 시퀀스 번호가 **타임스탬프 역할을 하되 물리 시계와 분리(decoupled from physical clocks)** 되어 있고, 이것이 분산 시스템에서 결정적으로 유용합니다.

```
offset:   0      1      2      3      4      5   →  (append here)
        ┌────┬──────┬──────┬──────┬──────┬──────┐
        │ r0 │  r1  │  r2  │  r3  │  r4  │  r5  │ ← 읽기는 왼쪽→오른쪽
        └────┴──────┴──────┴──────┴──────┴──────┘
        older ─────────────────────────────→ newer
```

> **왜 물리 시계와의 분리가 중요한가:** 분산 환경에서 벽시계는 NTP 드리프트, 윤초, VM 일시정지 때문에 신뢰할 수 없습니다(Google Spanner가 TrueTime이라는 GPS/원자시계 하드웨어를 동원한 이유). 로그 오프셋은 **"어떤 시각이었는가"가 아니라 "몇 번째 사건인가"만 말하므로** 시계 정확도에 전혀 의존하지 않습니다. 이후 Part 1 전체의 복제 논증이 성립하는 이유가 여기 있습니다.

원문은 로그가 특별한 물건이 아님을 강조합니다:

> "A log is not all that different from a file or a table. A file is an array of bytes, a table is an array of records, and a log is really just a kind of table or file where the records are sorted by time."

### 2. 반드시 구분해야 할 것 — 애플리케이션 로그 vs. 데이터 로그

이 글에서 가장 흔한 독해 실패 지점입니다. 원문은 명시적으로 선을 긋습니다:

> "The application log is a degenerative form of the log concept I am describing. The biggest difference is that text logs are meant to be primarily for humans to read and the 'journal' or 'data logs' I'm describing are built for programmatic access."

| 구분 | 애플리케이션 로그 (syslog, log4j) | 데이터 로그 / 저널 (이 글의 주제) |
|---|---|---|
| 소비자 | 사람 | 프로그램 |
| 형식 | 비정형 텍스트 | 정형 레코드 (Avro, Protobuf 등) |
| 순서 보장 | 느슨함, 종종 유실 허용 | 전순서, 내구성 필수 |
| 목적 | 디버깅·감사 | **상태 재구성의 원본(system of record)** |
| 대표 도구 | Fluentd, Loki, ELK | Kafka, BookKeeper, WAL |

저자는 애플리케이션 로그를 "퇴화형(degenerative form)"이라고 부릅니다. 같은 뿌리에서 나왔지만 "기계가 다시 읽고 상태를 재구성한다"는 핵심 기능을 잃어버린 형태라는 뜻입니다.

> 이 저장소 내 관련 문서: 애플리케이션 로그 쪽 관심사는 [`observability/`](../../observability/) 폴더(Fluentd, OTel Collector 등)에 있습니다. 이 글의 "로그"와는 다른 대상입니다.

### 3. Logs in Databases — 로그의 역사적 기원

원문의 설명:

> "The usage in databases has to do with keeping in sync the variety of data structures and indexes in the presence of crashes."

DB는 원자성(atomicity)과 내구성(durability)을 위해 **실제 데이터 구조를 건드리기 전에 변경 의도를 먼저 로그에 쓴다** — 이것이 Write-Ahead Logging입니다. 1970년대 System R까지 거슬러 올라가고, 이후 ARIES(1992) 알고리즘으로 정식화됩니다.

여기서 이 글의 결정적 재해석이 나옵니다:

> "The log is the record of what happened, and each table or index is a projection of this history into some useful data structure or index."

**뒤집힌 관점입니다.** 보통 우리는 "테이블이 진짜 데이터고, 로그는 크래시 복구를 위한 보조 장치"라고 생각합니다. 저자는 이를 정확히 반대로 뒤집습니다.

```
전통적 관점:            이 글의 관점:

  [테이블] ← 진실         [로그] ← 진실 (history of what happened)
     │                      │
     ↓ (보조)               ├──→ [테이블]      (projection)
  [WAL]                     ├──→ [B-tree 인덱스] (projection)
                            ├──→ [전문검색 인덱스] (projection)
                            └──→ [머티리얼라이즈드 뷰] (projection)
```

이 재해석이 왜 강력한가: **projection은 여러 개여도 되고, 언제든 버리고 다시 만들 수 있으며, 새로운 종류를 나중에 추가할 수 있습니다.** 로그만 온전하면 됩니다. 이 아이디어가 Part 2(다양한 데이터 시스템으로의 파생), Part 3(스트림 처리의 로컬 상태), Part 4(unbundling)에서 그대로 재사용됩니다.

그리고 복제로의 도약:

> "It turns out that the sequence of changes that happened on the database is exactly what is needed to keep a remote replica database in sync."

원래 크래시 복구용으로 만든 로그가, 손대지 않고 그대로 **복제 프로토콜**이 된다는 관찰입니다. 실제로 MySQL binlog, PostgreSQL WAL streaming replication, Oracle redo log 기반 Data Guard가 전부 이 구조입니다.

> **기술적 정밀화:** MySQL은 사실 두 개의 로그를 씁니다 — InnoDB의 redo log(물리적, 크래시 복구용)와 서버 레벨 binlog(논리적/행 기반, 복제·CDC용). 이 이중 구조 때문에 두 로그 간 정합성을 맞추는 XA 2PC(`sync_binlog`, `innodb_flush_log_at_trx_commit`) 문제가 생깁니다. PostgreSQL은 WAL 하나로 크래시 복구·물리 복제·논리 복제(logical decoding)를 모두 처리해 구조가 더 단순합니다. 원문이 "로그는 하나면 된다"고 말할 때의 이상형에 가까운 쪽은 PostgreSQL입니다.

### 4. Logs in Distributed Systems — 상태 기계 복제 원리

원문:

> "The two problems a log solves—ordering changes and distributing data—are even more important in distributed data systems."

그리고 이 글 전체에서 가장 중요한 한 문장:

> **"If two identical, deterministic processes begin in the same state and get the same inputs in the same order, they will produce the same output and end in the same state."**

이것이 **State Machine Replication (SMR)** 원리입니다. Fred Schneider의 1990년 튜토리얼 논문에서 정식화된 것으로, 원문도 이를 참고문헌으로 듭니다.

원리 자체는 거의 동어반복처럼 들릴 만큼 자명하지만, 함의가 큽니다:

> "You can reduce the problem of making multiple machines all do the same thing to the problem of implementing a distributed consistent log to feed these processes input."

즉 **"N대의 머신을 일치시키는 문제" → "일관된 분산 로그를 만드는 문제"** 로의 환원입니다. 문제를 하나로 압축한 것이고, 그 하나(로그)만 잘 만들면 나머지는 공짜라는 주장입니다.

#### 결정론(determinism)의 전제 조건 — 실무에서 가장 잘 깨지는 부분

원문은 결정론적 처리가 "타이밍에 의존하지 않고 외부 입력이 결과에 영향을 주지 않아야 한다"는 조건을 명시합니다. 실무에서 이 전제를 깨는 대표적 요소들:

| 비결정성 원인 | 예시 | 회피법 |
|---|---|---|
| 현재 시각 | `NOW()`, `CURRENT_TIMESTAMP` | 리더가 시각을 결정해 로그 레코드에 **값으로** 실어 보냄 |
| 난수 | `RAND()`, UUID 생성 | 시드 또는 생성된 값 자체를 로그에 기록 |
| 외부 호출 | 외부 API 조회, 환율 조회 | 응답을 로그에 기록(효과적으로 logical→physical 전환) |
| 자동 증가 | `AUTO_INCREMENT` | 부여된 값을 로그에 기록 |
| 해시/이터레이션 순서 | Go map 순회, 해시셋 순서 | 정렬 강제 |
| 부동소수점 재결합 | 병렬 합산 순서 차이 | 결합 순서 고정 |

> **왜 이게 핵심인가:** MySQL이 statement-based replication(SBR, 논리적)에서 row-based replication(RBR, 물리적)으로 기본값을 옮긴 이유가 정확히 이 표입니다. `UPDATE t SET x = RAND()` 같은 문장은 복제본마다 다른 결과를 냅니다. 이 글의 "물리적 vs 논리적 로깅" 분류는 이 실전 함정을 이론적으로 설명해줍니다.

#### 로그 오프셋 = 복제본 상태의 완전한 요약

원문:

> "you can describe each replica by a single number, the timestamp for the maximum log entry it has processed."

이 문장은 실무적으로 엄청나게 중요합니다. **복제본의 전체 상태(수 TB일 수 있음)를 정수 하나로 요약**할 수 있다는 뜻이기 때문입니다.

이로부터 따라 나오는 실전 기능들:

- **복제 지연(replication lag) 측정** = `leader_offset - replica_offset` (Kafka의 consumer lag이 정확히 이것)
- **read-your-writes 일관성** = 쓰기 후 받은 오프셋을 읽기 질의에 동봉 → 그 오프셋 이상 따라잡은 노드만 응답 (Part 4에서 재등장)
- **복제본 비교** = 두 복제본이 같은 오프셋이면 같은 상태임이 보장됨 → 체크섬 비교 불필요
- **정확한 재시작 지점** = 죽었다 살아난 노드는 마지막 오프셋+1부터 이어받으면 됨

### 5. 로깅 방식의 분류 — 두 개의 독립된 축

원문은 서로 다른 분야의 두 가지 분류 체계를 소개합니다. **이 둘은 직교하는 별개의 축이며, 혼동하기 쉽습니다.**

#### 축 A. 무엇을 기록하는가 (DB 문헌)

| 방식 | 기록 대상 | 장점 | 단점 |
|---|---|---|---|
| **Physical logging** | 변경된 행의 실제 내용(before/after image) | 결정론 보장, 재생 빠름 | 로그 크기 큼, 이종 시스템 간 이식 어려움 |
| **Logical logging** | 변경을 유발한 명령(SQL insert/update/delete) | 로그 크기 작음, 사람이 읽기 쉬움 | 비결정성 위험, 재생 비용이 원래 실행 비용과 동일 |

#### 축 B. 무엇을 복제하는가 (분산 시스템 문헌)

| 모델 | 동작 | 비고 |
|---|---|---|
| **State machine model (active-active)** | **들어오는 요청 자체**를 로그에 기록 → 모든 복제본이 각자 동일하게 처리 | 처리 비용이 N배. 비결정성에 취약 |
| **Primary-backup model** | 리더를 선출해 도착 순서대로 처리 → **처리 결과(상태 변경)** 를 로그로 복제본에 전달 | 처리 비용 1배. 리더 장애 시 재선출 필요. 실무 주류 |

> **두 축의 관계:** active-active는 논리적 로깅과, primary-backup은 물리적 로깅과 자연스럽게 짝을 이루지만 강제되지는 않습니다. 실무 매핑 예:
> - MySQL SBR ≈ 논리적 + (준)active-active → 비결정성 문제로 퇴조
> - MySQL RBR / PostgreSQL 물리 복제 ≈ 물리적 + primary-backup → 현재 주류
> - Redis AOF ≈ 논리적 (명령 기록)
> - Kafka 파티션 복제 ≈ 물리적 + primary-backup (leader/follower, ISR)
> - etcd/Consul (RAFT) ≈ 논리적 + active-active (모든 노드가 같은 명령 로그를 각자 적용)

원문의 산술 서비스 예시가 이 차이를 보여줍니다 — 값 하나를 두고 덧셈과 곱셈을 수행하는 서비스에서, **"덧셈과 곱셈의 순서를 바꾸면 결과가 달라진다"**(`(x+3)*2 ≠ x*2+3`). 그래서 active-active 모델에서는 **모든 복제본이 반드시 동일한 순서로 요청을 봐야** 하고, 그 순서를 강제하는 물건이 바로 로그입니다.

### 6. Logs and Consensus — 합의 문제의 재정의

이 글에서 학술적으로 가장 날카로운 주장이 여기 있습니다.

> "The distributed log can be seen as the data structure which models the problem of consensus."

Paxos, ZAB(ZooKeeper Atomic Broadcast), RAFT, Viewstamped Replication — 이 모든 합의 알고리즘 계열이 결국 **복제된 로그를 유지하는 문제**를 풀고 있다는 관찰입니다.

그리고 이어지는 비판:

> "the consensus problem is a bit too simple. Computer systems rarely need to decide a single value, they almost always handle a sequence of requests."

교과서적 Paxos는 "단일 값에 대한 합의(single-decree Paxos)"를 다룹니다. 하지만 실제 시스템이 필요한 건 단일 값이 아니라 **결정들의 열(sequence of decisions)** 입니다. 그래서 실무에서는 Multi-Paxos로 확장해야 하는데, Lamport의 원 논문은 이 확장을 거의 다루지 않았고 이것이 "Paxos는 이해하기 어렵다"는 악명의 상당 부분을 차지합니다.

> **RAFT의 설계 의도와 정확히 일치:** Diego Ongaro와 John Ousterhout의 RAFT 논문(2014, "In Search of an Understandable Consensus Algorithm")은 **처음부터 "복제 로그(replicated log)"를 1급 개념으로 놓고** 알고리즘을 설계했습니다. 리더 선출 / 로그 복제 / 안전성의 세 부분으로 분해한 것이 Paxos보다 이해하기 쉬운 이유입니다. 이 글의 "레지스터가 아니라 로그를 모델링하라"는 주장은 RAFT가 실제로 택한 길입니다.

저자의 전망:

> future focus will likely treat "the log as a commoditized building block irrespective of its implementation."

즉 **"합의 알고리즘은 구현 디테일이 되고, 로그라는 인터페이스만 남을 것"** 이라는 예측입니다. Part 4의 unbundling 논증을 여기서 미리 깔아두는 셈입니다.

> **2026년 시점 평가:** 이 예측은 상당히 적중했습니다. 오늘날 애플리케이션 개발자가 Paxos/RAFT를 직접 구현하는 일은 거의 없습니다. etcd(RAFT), ZooKeeper(ZAB), Kafka KRaft(RAFT 변형), Consul(RAFT) 같은 "로그/조정 서비스"를 가져다 쓸 뿐입니다. 특히 Kafka는 2022년 KRaft 모드로 **ZooKeeper 의존을 제거하고 자체 RAFT 기반 메타데이터 로그**로 대체했는데, 이는 "메타데이터조차 로그다"라는 이 글의 논리를 Kafka 자신에게 적용한 사례입니다. 자세한 건 [05번 문서](./05-critique-and-2026-update.md) 참고.

### 7. Changelog 101 — 테이블과 이벤트의 이중성

Part 1의 결론이자, 나머지 세 Part 전체의 기술적 토대입니다.

> "There is a fascinating duality between a log of changes and a table."

원문의 은유는 은행 계좌입니다.

```
     changelog (로그)                    table (현재 상태)
  ┌─────────────────────┐            ┌──────────────┐
  │ +100  입금           │            │ 계좌  │ 잔액 │
  │ -30   출금           │  ──fold──▶ ├──────┼──────┤
  │ +50   입금           │            │ A    │ 120  │
  └─────────────────────┘            └──────────────┘
           ▲                                 │
           └──────── 변경 발생 시 ◀───────────┘
```

- **로그 → 테이블**: 로그를 순서대로 적용(replay)하면 키별 최신 상태가 나옴
- **테이블 → 로그**: 테이블에 발생하는 업데이트를 캡처하면 changelog가 나옴 (= CDC)

그리고 결정적 비대칭:

> **"The magic of the log is that if it is a complete log of changes, it holds not only the contents of the final version of the table, but also allows recreating all other versions that might have existed."**

**로그와 테이블은 대칭이 아닙니다.** 로그 ⊃ 테이블입니다. 로그는 "현재 상태"뿐 아니라 "존재했던 모든 과거 상태"를 담습니다. 테이블은 정보를 잃는 손실 압축(lossy)입니다.

이 비대칭이 이 글 전체의 정책적 주장("로그를 system of record로 삼아라")을 정당화합니다. 테이블을 원본으로 삼으면 되돌릴 수 없지만, 로그를 원본으로 삼으면 언제든 새 형태의 테이블/인덱스를 다시 만들 수 있습니다.

#### 버전 관리 시스템 비유

원문이 드는 두 번째 비유가 대단히 직관적입니다:

> "A version control system usually models the sequence of patches, which is in effect a log. You interact directly with a checked out 'snapshot' of the current code which is analogous to the table."

| Git | 로그 개념 |
|---|---|
| 커밋 열(patch sequence) | 로그 |
| 워킹 디렉터리 / 체크아웃된 스냅샷 | 테이블 |
| `git pull` (패치만 받아 적용) | 로그 기반 복제 |
| `git checkout <sha>` | 특정 오프셋 시점의 상태 복원 |
| `git clone` | 전체 로그 재생으로 복제본 부트스트랩 |

> "when you update, you pull down just the patches and apply them to your current snapshot."

Git이 전체 파일이 아니라 패치만 전송하는 것과, 복제본이 전체 DB 덤프가 아니라 WAL만 받는 것은 **완전히 동일한 최적화**입니다.

#### 이중성이 실제 제품에 구현된 형태 (2026 기준)

| 시스템 | 로그 측 | 테이블 측 | 전환 메커니즘 |
|---|---|---|---|
| Kafka Streams | `KStream` | `KTable` | `toTable()` / `toStream()` |
| Apache Flink | Changelog stream | Dynamic Table | Table API ↔ DataStream 변환 |
| Debezium | CDC 이벤트 토픽 | 원본 DB 테이블 | logical decoding / binlog 파싱 |
| Materialize / RisingWave | 입력 스트림 | 증분 유지 머티리얼라이즈드 뷰 | 증분 뷰 유지(IVM) |
| Apache Iceberg + Kafka | 토픽 | Iceberg 테이블 | Tableflow / connector |
| 이벤트 소싱(CQRS) | Event store | Read model / projection | 프로젝터 |

### 8. Part 1에 대한 비판적 검토

이 Part의 논증은 매우 단단하지만, 실무 적용 시 반드시 인지해야 할 한계들이 있습니다.

#### (a) 전순서(total order)는 확장성의 근본 제약

Part 1의 모든 마법은 "전순서"에서 나옵니다. 그런데 **전순서는 본질적으로 직렬화 지점(serialization point)을 요구**합니다 — 누군가는 "이게 3번, 저게 4번"이라고 결정해야 하고, 그 결정은 한 곳에서만 일어날 수 있습니다.

이것이 Part 2에서 Kafka가 **파티셔닝**을 도입하며 "파티션 내부는 전순서, 파티션 간에는 순서 없음"이라는 타협을 하는 이유입니다. 즉 **Part 1의 이론적 순수성은 Part 2에서 즉시 포기됩니다.** 원문은 이를 솔직히 인정하지만, 순서 보장 범위가 파티션 키 설계에 종속된다는 실무 고통(예: 여러 테이블에 걸친 트랜잭션의 순서 보장 불가)은 깊게 다루지 않습니다.

#### (b) 전순서가 정말 필요한가 — 부분 순서로 충분한 경우

분산 시스템 연구의 상당 부분은 반대 방향을 봅니다: **인과적 순서(causal order)만 지키고 동시(concurrent) 이벤트는 순서를 강제하지 않는** 접근입니다. CRDT, 인과적 일관성(causal consistency), Dynamo 계열의 벡터 클록이 여기 속합니다. 이 접근은 전순서를 포기하는 대신 **가용성과 지역성(멀티 리전 쓰기)** 을 얻습니다.

이 글은 전순서를 자명한 선으로 두고 출발하기 때문에, "그럼 멀티 리전에서 로그의 전순서는 어떻게 하나"라는 질문에 답을 주지 않습니다. 실제로 이것은 2026년에도 미해결에 가까운 영역입니다(Kafka의 MirrorMaker2/Cluster Linking은 비동기 복제이며 전역 전순서를 주지 않습니다).

#### (c) 결정론 가정의 취약성

앞의 표에서 봤듯 실제 시스템에서 완전한 결정론을 유지하는 건 상당한 규율을 요구합니다. SMR 원리는 수학적으로는 자명하지만, **"동일한 결정론적 프로세스"라는 전제 자체가 운영 중 소프트웨어 버전 업그레이드만으로도 깨집니다.** 롤링 업그레이드 중 v1과 v2 복제본이 같은 로그를 다르게 해석하면 상태가 갈립니다. 이 문제(스키마/로직 진화)는 Part 2의 Avro 논의에서 부분적으로만 다뤄집니다.

#### (d) 이중성의 대가 — 무한 보존 비용

"로그가 테이블보다 정보량이 많다"는 건 **로그가 테이블보다 크다**는 뜻이기도 합니다. 완전한 changelog를 영구 보존하려면 저장 비용이 단조 증가합니다. 이 문제는 Part 3의 **log compaction**에서 해결되지만, compaction은 "키별 최신값"만 남기므로 **과거 버전 복원 능력을 포기**합니다. 즉 Part 1이 자랑한 "모든 과거 버전 복원 가능"이라는 이중성의 가장 강력한 속성은, 실무에서 비용 때문에 대부분 반납됩니다. 이 긴장은 글 안에서 명시적으로 조율되지 않습니다.

---

## Part 1 핵심 정리

| 주장 | 근거 | 실무 귀결 |
|---|---|---|
| 로그는 append-only 전순서 레코드 열 | 정의 | tail 한 곳만 경쟁 → 단순·고성능 |
| 로그의 순서 번호는 논리 시계 | 벽시계 불신 | 시계 동기화 없이 일관성 확보 |
| 테이블/인덱스는 로그의 투영 | DB의 WAL 구조 | 파생 저장소는 언제든 재생성 가능 |
| 크래시 복구용 로그가 그대로 복제 로그 | 변경 열의 동일성 | binlog/WAL 기반 복제, CDC의 근거 |
| N대 일치 문제 = 일관된 로그 구현 문제 | SMR 원리 | 문제를 하나로 환원 |
| 복제본 상태 = 오프셋 정수 하나 | 결정론 + 전순서 | lag 측정, read-your-writes, 재시작 |
| 합의 알고리즘은 로그 유지 문제다 | Paxos/ZAB/RAFT/VR의 공통 구조 | RAFT의 설계 방향과 일치 |
| 로그 ⊃ 테이블 (비대칭) | 완전한 changelog는 모든 과거 버전 보유 | 로그를 system of record로 |

---

> [← 개요로](./00-overview.md) | [다음: Part Two — Data Integration →](./02-part2-data-integration.md)
