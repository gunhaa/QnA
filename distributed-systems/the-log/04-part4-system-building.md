# Part Four: System Building — 상세 분석

> [← Part Three](./03-part3-stream-processing.md) | [다음: 비판과 2026년 관점 →](./05-critique-and-2026-update.md)

원문 해당 절: *System Building / Unbundling? / The place of the log in system architecture / (참고 문헌 목록)*

---

## 쉬운 설명

레고를 생각해봅시다.

예전에는 장난감을 살 때 "완성된 로봇"을 통째로 샀어요. 다른 걸 만들고 싶으면 다른 장난감을 또 사야 했죠.

레고는 다릅니다. **블록 몇 종류만 있으면** 로봇도 만들고 자동차도 만들고 집도 만듭니다.

이 Part는 "데이터베이스도 통째로 된 장난감 말고 **레고 블록처럼 나눠 쓰면 안 될까?**" 하는 이야기입니다. 그리고 그 블록 중에 **가장 중요한 바닥 블록이 로그**라고 말합니다.

---

## 일반 설명

### 0. Part 4의 위치

Part 1(이론) → Part 2(데이터 통합) → Part 3(스트림 처리)를 거쳐, Part 4는 **"그래서 앞으로 시스템은 어떻게 만들어져야 하는가"** 라는 예측/제안입니다. 이 글에서 가장 사변적(speculative)이면서, 동시에 향후 10년의 인프라 업계를 가장 잘 예언한 부분입니다.

### 1. 출발점 — 회사 전체를 하나의 분산 DB로 보기

Part 4의 문을 여는 관점 전환:

> **"So maybe if you squint a bit, you can see the whole of your organization's systems and data flows as a single distributed database. You can view all the individual query-oriented systems (Redis, SOLR, Hive tables, and so on) as just particular indexes on your data."**

```
        ┌─────────────────────────────────────────────────────────┐
        │        "회사 = 하나의 거대한 분산 데이터베이스"            │
        │                                                         │
        │   ┌─────────────────────────────────────────────────┐   │
        │   │   중앙 로그 (Kafka)  ← 이 DB의 "WAL"              │   │
        │   └───────────────────┬─────────────────────────────┘   │
        │                       │                                 │
        │   ┌────────┬──────────┼──────────┬─────────┐            │
        │   ▼        ▼          ▼          ▼         ▼            │
        │ [Redis]  [SOLR]    [Hive]    [Voldemort] [Graph]        │
        │   └────── 이 DB의 "인덱스"들 (각각 다른 질의 패턴에 최적화) │
        └─────────────────────────────────────────────────────────┘
```

**이 관점의 힘:** 각 시스템을 독립적 제품이 아니라 **역할**로 재정의합니다. Redis는 "제품"이 아니라 "저지연 KV 조회 인덱스"이고, SOLR은 "전문 검색 인덱스"이고, Hive 테이블은 "대용량 스캔 인덱스"입니다. 그리고 인덱스는 **언제든 버리고 다시 만들 수 있는 파생물**입니다 — Part 1에서 확립한 원칙이 조직 규모로 확장된 것입니다.

이 재정의가 실무에서 갖는 함의:

| 함의 | 설명 |
|---|---|
| **파생 저장소는 백업하지 않아도 된다** | 로그에서 재생성 가능하므로. 백업해야 할 건 로그뿐 |
| **스키마 변경 = 인덱스 재구축** | 검색 인덱스 매핑을 바꾸고 싶으면 처음부터 다시 색인 |
| **새 기술 도입이 저렴해짐** | 새 DB를 시험해보려면 그냥 로그를 새로 구독하면 됨 |
| **"어느 게 진짜 값인가" 분쟁 종료** | 로그가 원본, 나머지는 전부 파생 |

### 2. Unbundling? — 데이터 인프라의 세 가지 미래

저자는 데이터 인프라의 미래로 세 시나리오를 제시합니다.

#### 시나리오 1: 현상 유지 (status quo)

특화 시스템들이 계속 따로 존재한다. 이 경우 **외부 로그가 통합의 필수 요소**가 된다.

#### 시나리오 2: 재통합 (re-consolidation)

모든 기능을 갖춘 하나의 거대 시스템(uber-system)이 등장해 나머지를 흡수한다. 저자는 **현실적 어려움 때문에 가능성이 낮다**고 봅니다.

> 왜 어려운가: 하나의 저장 엔진이 OLTP 포인트 조회, OLAP 대량 스캔, 전문 검색, 그래프 순회, 벡터 유사도 검색에 **동시에 최적일 수 없기** 때문입니다. 자료구조 수준에서 근본적 트레이드오프가 존재합니다(행 지향 vs 컬럼 지향, B-tree vs LSM-tree, 역색인 vs 인접 리스트 vs HNSW).

#### 시나리오 3: 해체 (unbundling) — 저자가 미는 쪽

> **"Data infrastructure could be unbundled into a collection of services and application-facing system apis."**

저자가 "엔지니어로서 매력적(appealing as an engineer)"이라고 표현하는 방향입니다.

**해체된 인프라의 구성 블록:**

| 역할 | 당시 예시 | 2026년 예시 |
|---|---|---|
| **조정(coordination)** | Zookeeper | etcd, Kafka KRaft, Consul |
| **자원 관리 / 프로세스 가상화** | Mesos, YARN | **Kubernetes** (사실상 유일 승자) |
| **색인(indexing)** | Lucene, LevelDB (임베디드 라이브러리) | Lucene/Tantivy, RocksDB, Apache Arrow/DataFusion |
| **로그** | Kafka, BookKeeper | Kafka, Pulsar/BookKeeper, Redpanda, WarpStream |
| **직렬화 / 스키마** | Avro, Thrift, Protocol Buffers | Avro, Protobuf, **Apache Arrow**(인메모리), Parquet(디스크) |
| **테이블 포맷** | (없음) | **Apache Iceberg**, Delta Lake, Hudi |
| **질의 엔진** | (없음) | Trino, DuckDB, DataFusion, Velox |

> **"If you stack these things in a pile and squint a bit, it starts to look a bit like a lego version of distributed data system engineering."**

즉 **분산 데이터 시스템 엔지니어링의 레고 버전**입니다. 새 데이터 시스템을 만들 때 밑바닥부터 복제·합의·색인·자원관리를 구현하지 않고, 검증된 블록을 조립한다는 비전입니다.

> **2026년 채점 — 상당 부분 적중:**
> - **Kubernetes**가 자원 관리 블록을 완전히 표준화했습니다(Mesos는 사실상 소멸).
> - **RocksDB**가 사실상의 임베디드 스토리지 엔진 표준이 되어 Kafka Streams, Flink, CockroachDB, TiKV, MyRocks 등이 전부 이것을 씁니다.
> - **Apache Iceberg / Arrow / Parquet**은 저자가 예상하지 못했던 층까지 해체를 확장했습니다 — "테이블 포맷"과 "인메모리 포맷"이 독립 블록이 되면서, 이제 Snowflake·Databricks·Trino·DuckDB가 **같은 테이블을 공유**합니다. 이는 저자의 unbundling 비전의 가장 극적인 실현입니다.
> - **반대 방향도 동시에 일어남:** Databricks·Snowflake 같은 통합 플랫폼의 성장은 시나리오 2(재통합)에 가깝습니다. 결국 현실은 **"해체된 블록들 위에 재통합된 제품"** 이라는 이중 구조가 되었습니다 — 블록은 표준화되었지만, 그 블록을 조립하는 일은 여전히 어려워서 상업 벤더가 조립해 파는 형태.

### 3. The place of the log in system architecture — 로그 + 서빙 레이어

Part 4의 기술적 중핵이자, 이 글 전체의 결론입니다.

> **"The system is divided into two logical pieces: the log and the serving layer. The log captures the state changes in sequential order."**

```
                       쓰기(write)
                           │
                           ▼
        ╔══════════════════════════════════════════╗
        ║              로그 (Log)                    ║
        ║  · 상태 변경을 순차적으로 기록               ║
        ║  · 시스템의 진실(system of record)         ║
        ╚══════════════════┬═══════════════════════╝
                           │ 구독
        ┌──────────────┬───┴──────────┬──────────────┐
        ▼              ▼              ▼              ▼
   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │ 서빙노드1 │   │ 서빙노드2 │   │ 서빙노드3 │   │ 외부 구독자│
   │  인덱스   │   │  인덱스   │   │  인덱스   │   │ (다른 시스템)│
   └────┬────┘   └────┬────┘   └────┬────┘   └─────────┘
        │             │             │
        └─────────────┴─────────────┘
                      ▲
                   읽기(query)
```

#### 로그가 흡수하는 책임 여섯 가지

원문이 열거하는 목록:

> - **"Handle data consistency"** (동시 업데이트의 순서를 정해 일관성 보장)
> - **"Provide data replication between nodes"**
> - **"Provide 'commit' semantics"** (쓰기자에게 커밋 의미론 제공)
> - **"Provide the external data subscription feed"**
> - **"Provide the capability to restore failed replicas"**
> - **"Handle rebalancing of data between nodes"**

이 목록을 하나씩 뜯어보면 **분산 데이터 시스템을 만들 때 가장 어려운 것들이 전부 여기 있습니다.**

| 책임 | 로그가 어떻게 해결하는가 | 로그 없이 하면 |
|---|---|---|
| **일관성** | 동시 쓰기에 순서를 부여 → 모든 복제본이 같은 순서로 적용 | 분산 락, 벡터 클록, 충돌 해소 로직 |
| **복제** | 팔로워가 로그를 따라 읽기만 하면 됨 | 노드 간 상태 diff/동기화 프로토콜 |
| **커밋 의미론** | "로그에 기록됨 = 커밋됨". 쿼럼 복제로 내구성 | 2PC, 별도 커밋 프로토콜 |
| **외부 구독 피드** | 이미 로그가 있으니 그냥 외부에 노출 | 별도 CDC/아웃박스 구현 |
| **실패 복제본 복구** | 마지막 오프셋부터 재생 | 전체 스냅샷 전송 + 델타 |
| **리밸런싱** | 새 노드가 로그를 읽어 자기 몫을 인덱싱 | 데이터 이동 조율 프로토콜 |

**따라서 서빙 레이어에 남는 일은:**

- 클라이언트 대면 API
- 질의 처리
- **자기에게 맞는 인덱스 자료구조 선택** ← 시스템마다 달라야 하는 유일한 부분

> This separation allows serving layers to focus on client-facing APIs and indexing strategies — **the parts that should vary per system.**

**이것이 unbundling 논증의 마무리입니다.** 검색엔진, KV 스토어, OLAP 엔진이 서로 다른 것은 **인덱싱 전략과 질의 API뿐**이고, 나머지 어려운 분산 시스템 문제는 전부 공통이므로 **공유 가능한 로그 레이어로 빼낼 수 있다**는 것.

#### 읽기 일관성 — 오프셋을 쿼리에 실어 보내기

> **"The client can get read-your-write semantics from any node by providing the timestamp of a write as part of its query."**

이것이 Part 1의 "복제본 상태 = 오프셋 정수 하나"가 만들어내는 실전 기능입니다.

```
  1) 클라이언트가 쓰기 → 로그가 오프셋 1234 반환
  2) 클라이언트가 읽기 시 "offset >= 1234" 를 함께 전달
  3) 아무 서빙 노드에나 질의 가능:
       - 그 노드가 1234까지 따라잡았으면 → 즉시 응답
       - 아직이면 → 따라잡을 때까지 대기하거나 다른 노드로 재시도
```

**함의:** 쓰기 후 읽기를 위해 **리더로 라우팅할 필요가 없습니다.** 모든 복제본이 읽기를 받을 수 있으므로 읽기 확장성이 선형이면서도, 자기가 쓴 건 반드시 보입니다.

> 이 아이디어는 오늘날 널리 쓰입니다 — MongoDB의 causally consistent session(`afterClusterTime`), CockroachDB/YugabyteDB의 하이브리드 논리 시계, Kafka의 `read_committed` + 오프셋 기반 조율이 모두 같은 계열입니다. 세션 일관성(session consistency) / 인과적 일관성(causal consistency)을 **전역 동기화 없이** 얻는 표준 기법입니다.

#### 이 구조가 실제로 구현된 시스템들 (2026)

이 글은 2013년에 "이렇게 만들자"고 제안했는데, 이후 실제로 그렇게 만들어진 시스템이 많습니다:

| 시스템 | 로그 레이어 | 서빙 레이어 |
|---|---|---|
| **Kafka Streams / ksqlDB** | Kafka 토픽 + changelog 토픽 | RocksDB 로컬 스토어 + interactive queries |
| **Apache Pulsar** | **BookKeeper**(순수 로그 스토리지) | Pulsar 브로커(상태 없음) |
| **CockroachDB / TiDB** | RAFT 로그 (range/region 단위) | SQL 레이어 + KV 스토어 |
| **Materialize / RisingWave** | Kafka/CDC 입력 로그 | 증분 유지 머티리얼라이즈드 뷰 |
| **etcd / Consul** | RAFT 로그 | KV API |
| **Neon / Aurora** | "로그가 곧 데이터베이스"(redo log를 스토리지 레이어로) | 컴퓨트 노드(stateless) |

**Amazon Aurora와 Neon이 특히 흥미롭습니다.** Aurora의 유명한 표어 **"The log is the database"** 는 이 Part의 논증을 RDBMS 내부에 그대로 적용한 것입니다 — 컴퓨트 노드는 redo log만 스토리지 레이어에 보내고, 페이지 물질화는 스토리지가 담당합니다. 즉 "쓰기 = 로그 append, 읽기 = 투영 조회"라는 이 글의 구조가 상용 클라우드 DB의 핵심 설계가 되었습니다.

**Pulsar/BookKeeper도 명시적입니다.** BookKeeper는 "분산 로그 스토리지"만 제공하는 순수 블록이고, Pulsar 브로커는 상태 없는 서빙 레이어입니다. 저자가 참고문헌으로 BookKeeper를 든 것도 우연이 아닙니다.

### 4. 참고 문헌 목록 — 저자가 깔아둔 학습 경로

원문 말미의 "Academic papers, systems, talks, and blogs" 및 "Interesting open source stuff" 목록은 이 글의 숨은 가치입니다. 저자가 어떤 전통 위에서 논증했는지를 드러내기 때문입니다.

#### 학술 문헌

| 문헌 | 저자 | 이 글에서의 역할 |
|---|---|---|
| **상태 기계 복제 서베이** | Fred Schneider (1990) | Part 1 SMR 원리의 출처. *"Implementing Fault-Tolerant Services Using the State Machine Approach: A Tutorial"* |
| **How to Build a Highly Available System Using Consensus** | Butler Lampson | 합의 기반 가용성 설계의 고전 |
| **Paxos 계열** | Leslie Lamport | *The Part-Time Parliament*(1998), *Paxos Made Simple*(2001) |
| **RAFT** | Diego Ongaro, John Ousterhout | Part 1의 "로그를 1급으로 모델링하라"의 실현 |
| **Viewstamped Replication** | Oki & Liskov | Paxos와 독립적으로 발견된 합의 프로토콜 |
| **ZAB** | ZooKeeper 팀 | ZooKeeper Atomic Broadcast |
| **Models and Issues in Data Stream Systems** | Babcock et al. (2002) | Part 3 스트림 처리의 학술적 배경 |

> **읽는 순서 추천:** Schneider(1990)로 SMR 원리를 잡고 → RAFT 논문으로 합의를 이해하고(Paxos보다 훨씬 읽기 쉬움) → Lampson으로 실무 설계 감각을 얻는 순서가 이 글의 Part 1을 가장 잘 소화하는 경로입니다.

#### 오픈소스 시스템

원문이 드는 목록: **Kafka, BookKeeper, Databus, Akka, Samza, Storm, Spark Streaming, Summingbird**

2026년 관점에서의 생사 판정:

| 시스템 | 2013년 역할 | 2026년 상태 |
|---|---|---|
| **Kafka** | 중앙 로그 | ✅ 업계 표준. 사실상 "로그" 카테고리를 정의 |
| **BookKeeper** | 분산 로그 스토리지 | ✅ 생존. Pulsar의 스토리지 레이어로 핵심 역할 |
| **Databus** | LinkedIn CDC | ❌ 사실상 소멸. **Debezium**이 그 자리를 차지 |
| **Akka** | 액터 모델 툴킷 | ⚠️ 생존하나 축소. 2022년 라이선스 변경(BSL)으로 커뮤니티 이탈, Apache Pekko로 포크 |
| **Samza** | LinkedIn 스트림 처리 | ❌ 사실상 소멸. **Flink**에 완패 |
| **Storm** | 실시간 처리 | ❌ 사실상 소멸 |
| **Spark Streaming** | 마이크로배치 스트리밍 | ⚠️ Structured Streaming으로 계승. 생존하나 순수 스트리밍에서는 Flink에 밀림 |
| **Summingbird** | Twitter의 배치/스트림 통합 DSL | ❌ 소멸. 그러나 **아이디어는 Flink/Beam의 통합 모델로 계승** |

> **주목할 점:** 저자가 밀었던 Samza가 실패하고 당시 목록에 없던 **Flink**가 승자가 되었습니다. 하지만 **아이디어는 전부 살아남았습니다** — Flink는 이 글이 말한 모든 것(로그 기반 입출력, 로컬 상태, 상태 스냅샷, 배치/스트림 통합)을 더 잘 구현한 시스템입니다. 이 글이 예측한 건 제품이 아니라 **설계 패러다임**이었고, 그 패러다임은 승리했습니다.

### 5. 글의 마무리

원문은 논증을 마친 뒤 **"I leave you with this message:"** 라는 한 줄과 이미지로 끝납니다. 격식을 갖춘 결론 문단 없이 끝나는 구조로, 15,000 단어의 밀도 높은 논증 뒤에 오는 의도적인 가벼운 마무리입니다.

### 6. Part 4에 대한 비판적 검토

#### (a) Unbundling의 숨은 비용 — 조립은 공짜가 아니다

레고 비유는 매력적이지만, **블록이 표준화되었다고 조립이 쉬워지는 건 아닙니다.** Kafka + Kubernetes + RocksDB + Iceberg + Trino를 조립해 운영하는 것은 Snowflake 계정 하나 만드는 것보다 압도적으로 어렵습니다.

2026년의 현실은 이렇습니다:

```
  저자의 예측:   해체된 블록 → 각 회사가 자기 시스템을 조립

  실제 결과:     해체된 블록 → 벤더가 조립해서 관리형으로 판매
                              → 고객은 다시 "통합 제품"을 구매

                 (Confluent Cloud, Databricks, Snowflake, MSK, ...)
```

즉 **기술적으로는 unbundling이 일어났지만, 상업적으로는 re-bundling이 일어났습니다.** 저자 본인이 창업한 Confluent가 정확히 이 재번들링 비즈니스라는 점은 아이러니합니다.

#### (b) 로그 = 만능이라는 과잉 일반화

"로그가 일관성·복제·커밋·구독·복구·리밸런싱을 전부 처리한다"는 주장은 **단일 파티션 안에서만 온전히 성립합니다.**

로그가 해결하지 못하는 것:
- **다중 파티션 원자성** — 여러 파티션에 걸친 트랜잭션은 여전히 2PC 계열이 필요(Kafka 트랜잭션도 내부적으로 그렇습니다)
- **분산 조인의 재분할** — 서로 다른 키로 파티셔닝된 두 스트림의 조인은 셔플 필요
- **지리적 분산** — 리전 간 전순서 로그는 지연시간 때문에 실질적으로 불가능
- **읽기 성능 자체** — 로그는 쓰기 경로만 해결. 질의 성능은 여전히 서빙 레이어의 인덱스 설계 문제

#### (c) 비용 모델의 부재

이 글은 성능(처리량·지연시간)을 논하지만 **비용**을 거의 논하지 않습니다. 2013년 온프레미스 환경에서는 디스크가 이미 산 것이라 한계비용이 낮았습니다. 클라우드로 오면 계산이 완전히 달라집니다:

- **크로스 AZ 네트워크 요금** — Kafka의 3중 복제는 AZ 간 트래픽을 발생시키고, 이것이 클라우드 Kafka 비용의 **최대 80%** 를 차지합니다
- **로컬 SSD 비용** — 객체 스토리지 대비 10~20배
- **"모든 데이터를 로그에"의 비용** — 저장 비용이 데이터 볼륨에 선형 비례

이 비용 문제가 2020년대에 **diskless / 객체 스토리지 기반 Kafka**(WarpStream, AutoMQ, Aiven Inkless, KIP-1150)를 낳았습니다. 흥미롭게도 이 흐름은 **Part 4의 "로그 + 서빙 레이어" 분리를 한 층 더 밀어붙인 것**입니다 — 이제 로그 레이어 자체가 "객체 스토리지(내구성) + 상태 없는 브로커(서빙)"로 다시 쪼개집니다. 자세한 건 [05번 문서](./05-critique-and-2026-update.md).

#### (d) 세 시나리오의 거짓 삼분법

저자는 status quo / 재통합 / 해체를 배타적 선택지로 제시하지만, 실제로는 **세 가지가 동시에 일어났습니다.** 특화 시스템은 계속 늘었고(status quo — 벡터 DB가 새로 추가됨), 블록은 표준화되었으며(해체 — Iceberg/Arrow/K8s), 동시에 통합 플랫폼이 시장을 지배합니다(재통합 — Databricks/Snowflake). 기술 진화는 단일 방향으로 수렴하지 않습니다.

---

## Part 4 핵심 정리

| 주장 | 근거 | 2026년 채점 |
|---|---|---|
| 회사의 모든 데이터 시스템 = 하나의 분산 DB, 각 시스템 = 인덱스 | 로그가 공통 원본 | ✅ 데이터 플랫폼 설계의 표준 멘탈 모델이 됨 |
| 미래는 해체(unbundling)다 | 레고 블록 비유 | ⚠️ 기술적으로 적중, 상업적으로는 재번들링 |
| Zookeeper/Mesos/Lucene/LevelDB/Kafka가 블록이 된다 | 당시 생태계 관찰 | ✅ 대부분 적중 (Mesos→K8s로 교체) |
| 시스템 = 로그 + 서빙 레이어 | 어려운 문제는 전부 로그가 흡수 | ✅ Pulsar/BookKeeper, Aurora, CockroachDB 등에서 실현 |
| 로그가 일관성·복제·커밋·구독·복구·리밸런싱을 처리 | SMR + 오프셋 | ⚠️ 단일 파티션 내에서만 완전 |
| 오프셋을 질의에 실어 read-your-writes 확보 | 복제본 = 정수 하나 | ✅ 세션/인과 일관성의 표준 기법 |
| Samza/Storm이 스트림 처리의 미래 | 당시 LinkedIn 스택 | ❌ 제품은 틀림, ✅ 패러다임은 맞음(Flink) |

---

> [← Part Three](./03-part3-stream-processing.md) | [다음: 비판적 종합과 2026년 관점 →](./05-critique-and-2026-update.md)
