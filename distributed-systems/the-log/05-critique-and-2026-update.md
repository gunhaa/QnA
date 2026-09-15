# 비판적 종합과 2026년 관점 — 13년 뒤 채점표

> [← Part Four](./04-part4-system-building.md) | [개요로 돌아가기](./00-overview.md)

이 문서는 원문에 없는 내용입니다. 2013년 글의 주장을 2026년 9월 현재 시점에서 검증하고, 원문의 논증 구조 자체를 비판적으로 검토합니다.

---

## 쉬운 설명

2013년에 어떤 사람이 **"앞으로는 다들 이렇게 할 거예요"** 하고 예언을 했어요.

13년이 지난 지금 채점해보면 — **큰 방향은 거의 다 맞췄는데, 구체적으로 어떤 회사 제품이 이길지는 많이 틀렸습니다.** 그리고 그때는 몰랐던 새 문제(클라우드 요금!)가 생겨서, 지금은 그 문제를 푸느라 또 다른 발명이 한창입니다.

재미있는 반전도 있어요. 그 사람이 만든 Kafka를 **정작 LinkedIn이 2025년에 다른 걸로 바꾸기 시작했습니다.** 너무 커져버려서요.

---

## 일반 설명

## 1. 흔한 오해 정리 — 이 글에 없는 것들

분석하기 전에 반드시 걸러야 할 오해들입니다. 인터넷의 많은 "The Log 요약"이 다른 글의 내용을 섞어 놓습니다.

| 흔히 이 글의 내용이라 알려진 것 | 실제 출처 |
|---|---|
| **Lambda Architecture 비판 / Kappa Architecture 제안** | ❌ 이 글에 없음. **"Questioning the Lambda Architecture"** (Jay Kreps, O'Reilly Radar, 2014-07) |
| **Unix 철학 / 파이프 비유** | ❌ 이 글에 없음. Martin Kleppmann, *DDIA* 10~11장 및 "Turning the Database Inside-Out"(2015) |
| **이벤트 소싱(Event Sourcing) / CQRS 용어** | ❌ 이 글은 이 용어를 쓰지 않음. Greg Young 계열 DDD 문헌. 개념적으로는 매우 가까움 |
| **exactly-once 처리 의미론** | ❌ 이 글에 없음. Kafka 0.11(2017) 및 Flink 문헌 |
| **event time / watermark / late data** | ❌ 이 글에 없음. Google Dataflow Model 논문(2015) |

**왜 이 구분이 중요한가:** 이 글은 "로그로 데이터를 흐르게 하라"까지 갔고, **그 위에서 정확하게 계산하는 문제는 아직 손대지 않은 상태**의 글입니다. 이 글을 근거로 "스트림 처리면 배치가 필요 없다"고 주장하는 것은 저자가 이 글에서 하지 않은 말입니다.

## 2. Lambda vs Kappa — 이 글의 논리적 후속편

이 글에는 없지만, 이 글의 논증을 끝까지 밀면 필연적으로 도달하는 지점이므로 짚어야 합니다.

### Lambda Architecture (Nathan Marz, 2011~)

```
                  ┌──▶ [배치 레이어]  ──▶ [배치 뷰]  ──┐
   [원본 데이터] ──┤    (Hadoop, 정확)                  ├──▶ [질의]
                  └──▶ [스피드 레이어] ──▶ [실시간 뷰] ──┘
                       (Storm, 빠르지만 근사)
```

동기: 당시 스트림 처리는 at-least-once였고 정확성을 보장하지 못했습니다. 그래서 **"빠르지만 부정확한 경로"와 "느리지만 정확한 경로"를 둘 다 운영**하고 질의 시 합치는 구조입니다.

비용: **같은 비즈니스 로직을 두 번, 서로 다른 프레임워크로 구현·유지**해야 합니다.

### Kappa Architecture (Kreps, 2014)

```
   [로그(Kafka), 충분히 긴 보존] ──▶ [스트림 처리 잡] ──▶ [출력 테이블] ──▶ [질의]
```

재처리 방법: 배치 레이어를 두는 대신,
1. 잡의 새 버전을 **로그의 처음부터** 시작
2. **새로운** 출력 테이블에 기록
3. 따라잡으면 애플리케이션을 새 테이블로 전환
4. 옛 테이블 삭제

**논리적 연결:** 이 절차가 가능한 이유는 전적으로 이 글의 전제 때문입니다 — 로그가 보존되고(Part 2), 재생 가능하며(Part 1의 결정론), 상태는 로그에서 재구성 가능하기(Part 3) 때문입니다. **Kappa는 "The Log"의 따름정리(corollary)입니다.**

### 2026년 판정 — Kappa가 이겼는가?

| 관점 | 평가 |
|---|---|
| **개념적 승리** | ✅ "배치와 스트림을 별도 코드로 두 번 짜지 말라"는 원칙은 완전히 표준이 됨. Flink의 통합 실행 모델, Spark Structured Streaming이 이를 제품 수준에서 실현 |
| **운영적 승리** | ⚠️ 부분적. 순수 Kappa(배치 완전 제거)는 소수. 대량 백필, 복잡한 과거 재계산, 비용 최적화에서 배치가 여전히 유리 |
| **Uber 사례** | Uber는 "production-ready Kappa"를 구현했다고 발표했지만, 실제로는 **하이브리드**(스트림 + 주기적 검증/보정 배치)에 가까움 |
| **비판론** | "The Trouble with Kappa Architecture" 계열 반론 — 수년치 로그를 재생하는 비용, 스트림 엔진의 백필 처리량 한계, 스키마가 바뀐 과거 데이터의 재해석 문제 |

**현실적 결론:** 2026년의 지배적 패턴은 Lambda도 Kappa도 아닌 **"단일 로직, 두 실행 모드"** 입니다 — Flink/Spark에서 같은 코드를 스트림 모드로 상시 실행하고, 백필이 필요하면 배치 모드로 같은 코드를 돌립니다. Lambda의 문제(로직 이중화)는 해결하되, 배치 실행의 효율은 유지하는 절충입니다.

## 3. 항목별 채점표

### ✅ 정확히 적중한 예측

| # | 예측 | 2026년 현실 |
|---|---|---|
| 1 | **로그가 데이터 통합의 중심이 된다** | Kafka가 사실상 업계 표준. 수만 개 조직의 "데이터 백본"이 로그 |
| 2 | **합의 알고리즘은 상품화된 빌딩 블록이 된다** | 아무도 Paxos를 직접 구현하지 않음. etcd/ZooKeeper/KRaft를 가져다 씀 |
| 3 | **로그를 1급으로 모델링한 합의가 표준이 된다** | RAFT가 사실상 표준 합의 알고리즘 |
| 4 | **CDC로 DB 변경을 로그로 흘리는 게 보편화된다** | **Debezium**이 사실상 표준. 거의 모든 데이터 플랫폼의 기본 구성요소 |
| 5 | **스키마를 조직 계약으로 강제해야 한다** | Schema Registry가 필수 구성요소. "data contract" 담론으로 확장 |
| 6 | **배치와 스트림의 개념적 통합** | Flink의 bounded/unbounded 통합 모델, Beam, Spark Structured Streaming |
| 7 | **로컬 상태 + changelog로 내결함성** | Kafka Streams가 문자 그대로 이 구조. RocksDB + changelog 토픽 |
| 8 | **인프라의 unbundling** | K8s(자원), RocksDB(스토리지 엔진), Iceberg(테이블), Arrow(메모리 포맷), Kafka(로그) — 전부 독립 블록화 |
| 9 | **"로그 + 서빙 레이어" 분리 구조** | Pulsar/BookKeeper, Aurora("the log is the database"), Neon, CockroachDB |
| 10 | **오프셋으로 read-your-writes 확보** | 세션/인과 일관성의 표준 기법 |

### ❌ 틀렸거나 빗나간 예측

| # | 예측 | 실제 |
|---|---|---|
| 1 | **Samza가 스트림 처리의 주역** | Flink가 압승. Samza는 사실상 소멸 |
| 2 | **Storm이 계속 중요** | 소멸 |
| 3 | **Mesos/YARN이 자원 관리 표준** | **Kubernetes**가 둘 다 밀어냄. Mesos는 2021년 Apache Attic 이관 |
| 4 | **완전한 unbundling(각 조직이 조립)** | 기술적으로는 해체, 상업적으로는 **재번들링**(Confluent/Databricks/Snowflake) |
| 5 | **uber-system(재통합)은 어려울 것** | Databricks/Snowflake가 상당 부분 실현. 시나리오 2와 3이 동시 진행 |

### ⚠️ 글이 다루지 않아 이후 10년의 난제가 된 것

| 주제 | 왜 어려웠는가 | 해결 시점 |
|---|---|---|
| **exactly-once** | 로그 재생 시 중복 처리 → 집계 오답 | Kafka 0.11 트랜잭션(2017), Flink 2PC 싱크 |
| **event time / watermark** | "언제 일어난 일인가" vs "언제 도착했나" | Dataflow Model(2015) → Flink |
| **late data / 정정** | 3일 늦게 온 데이터를 어떻게 반영하나 | 트리거·누적 모드, retractable stream |
| **다중 파티션 트랜잭션** | 파티션 간 순서 보장 없음 | 부분 해결(Kafka 트랜잭션) |
| **클라우드 비용** | 크로스 AZ 요금, 로컬 SSD 비용 | **현재 진행형** (아래 4절) |
| **멀티 리전 전순서** | 물리적 지연시간 | 사실상 미해결. 비동기 복제로 타협 |

## 4. 2026년의 최전선 — 비용이 아키텍처를 다시 쓰다

이 글이 전혀 예측하지 못한 것이 **클라우드 비용 구조가 설계를 지배하게 된다**는 점입니다.

### 문제

```
  Kafka 전통 구조 (2013 설계, 온프레미스 전제):

    프로듀서 ──▶ [리더 브로커]  로컬 SSD
                     │
                     ├──▶ [팔로워1]  로컬 SSD   ← AZ 간 네트워크 ($$$)
                     └──▶ [팔로워2]  로컬 SSD   ← AZ 간 네트워크 ($$$)

  클라우드에서: 크로스 AZ 트래픽 요금이 전체 TCO의 최대 80%
                로컬 SSD가 S3 대비 10~20배 비쌈
```

온프레미스에서는 네트워크가 공짜였고 디스크는 이미 산 것이었습니다. 클라우드에서는 둘 다 사용량 과금입니다. **13년 전 최적이었던 설계가 지금은 비용 구조상 최악에 가깝습니다.**

### 해법의 진화 — 로그의 재해체

| 세대 | 구조 | 대표 |
|---|---|---|
| **1세대 (2013~)** | 로컬 디스크 + 3중 복제 | 원조 Kafka |
| **2세대 — Tiered Storage (KIP-405)** | 활성 세그먼트는 로컬 디스크, **봉인된 세그먼트만 S3로** 오프로드 | Kafka 3.6+/4.0 GA, Confluent, Pulsar |
| **3세대 — Diskless / Direct-to-S3** | **쓰기 경로부터** 객체 스토리지로 직행. 브로커는 상태 없는 캐시/서빙 노드 | WarpStream, AutoMQ, Aiven Inkless, **KIP-1150** |

**KIP-1150 (Diskless Topics) 현황 (2026년 8월 기준):**
- 2026년 3월 **방향성 KIP으로 승인(accepted)** — 단, 아직 Apache Kafka의 GA 기능이 아님
- 구현을 정의하는 KIP-1163/KIP-1164는 여전히 논의 중
- 현재 유일하게 동작하는 구현은 **Aiven Inkless 포크**
- 비용 절감 주장: TCO 최대 80% 감소

**Tiered Storage와 Diskless의 결정적 차이:**

| | Tiered Storage (KIP-405) | Diskless (KIP-1150) |
|---|---|---|
| 활성 쓰기 경로 | 로컬 디스크 + 복제 | **객체 스토리지 직행** |
| 크로스 AZ 복제 트래픽 | 발생 | **제거** |
| 지연시간 | 낮음 (ms) | 높음 (수백 ms~초) |
| 브로커 상태 | 유상태(리더/파티션 소유) | **무상태** |

> **이 글의 관점에서 본 의미:** Part 4가 "시스템 = 로그 + 서빙 레이어"로 쪼갰다면, diskless는 **로그 레이어 자체를 다시 "내구성 레이어(S3) + 서빙 레이어(무상태 브로커)"로 쪼갠 것**입니다. 저자의 unbundling 논리가 저자의 시스템에 재귀적으로 적용된 셈입니다. 논증의 일관성 면에서는 오히려 이 글의 승리입니다.

### 스트리밍 ↔ 레이크하우스의 경계 소멸

2026년 데이터 스트리밍 시장에서 가장 움직임이 큰 지점은 **"토픽을 테이블로 만드는 것"** 입니다.

| 제품 | 하는 일 |
|---|---|
| **Confluent Tableflow** (2025-03 GA) | Kafka 토픽을 Iceberg(또는 Delta) 테이블로 물질화. 스키마 매핑·타입 변환·파일 크기 조정·컴팩션·카탈로그 등록까지 자동 |
| **StreamNative Ursa** | 디스크리스·리더리스 토픽을 오픈 테이블 포맷으로 직접 저장 |
| **Apache Fluss** | 컬럼 지향 스트리밍 스토리지. 서브초 신선도, 프라이머리 키 테이블, Iceberg/Paimon으로 네이티브 티어링 |
| **Snowflake Datastream / Databricks Zerobus** | 레이크하우스 쪽에서 스트리밍 수집을 흡수 |

**이것이 이 글에 대해 갖는 의미가 큽니다.**

Part 1은 **로그와 테이블이 이중적(dual)** 이라고 말했습니다. Part 3의 압축은 그 이중성을 실용화하려 했지만 이력을 잃는 대가가 있었습니다([03번 문서](./03-part3-stream-processing.md) 6-(e) 참고).

2026년의 답은 **"둘 다 저장한다"** 입니다:

```
                 [Kafka 토픽]  ← 로그 표현 (최근 데이터, 저지연 구독)
                      │
                      │  Tableflow / Ursa / Fluss tiering
                      ▼
                [Iceberg 테이블] ← 테이블 표현 (전체 이력, 대량 스캔·SQL)
                      │
        ┌─────────────┼─────────────┬──────────────┐
        ▼             ▼             ▼              ▼
    [Trino]      [Spark]      [Snowflake]     [DuckDB]
```

**즉 이중성이 "변환"이 아니라 "동시 물질화"로 구현되었습니다.** 같은 데이터가 로그 형태와 테이블 형태로 **동시에** 존재하고, 각각 다른 접근 패턴에 서비스합니다. 저자가 예측하지 못한 형태지만, 그의 이중성 원리의 논리적 귀결입니다.

### 스트림 처리 쪽: Flink 2.0의 분리형 상태

[Part 3에서 지적한](./03-part3-stream-processing.md) 로컬 상태의 운영 비용 문제에 대한 2026년의 답:

**Apache Flink 2.0 (2025-03 릴리스)** 은 **연산과 상태 관리를 분리**했습니다.
- 주 상태 저장소를 원격 분산 파일시스템(DFS)으로 이동, 로컬 디스크는 2차 캐시
- **ForSt** — 통합 파일시스템을 가진 새 상태 저장소. 체크포인트·복구·재구성이 가볍고 빠름
- 효과: **상태 크기 무제한**(외부 스토리지 한계까지), 리소스 사용량 안정, 체크포인트 경량화
- 성능: I/O 무거운 상태 질의에서 1GB 캐시 기준 전통적 로컬 상태 대비 처리량 75~120% 수준 달성

> **패턴이 동일합니다.** Kafka diskless와 Flink 분리형 상태는 **같은 움직임**입니다 — "로컬 디스크에 상태를 붙여두는" 2013년식 설계를 버리고, **내구성은 객체 스토리지에, 컴퓨트는 무상태로** 분리하는 것. 클라우드 경제학이 양쪽 생태계를 같은 방향으로 밀고 있습니다.

## 5. 가장 큰 아이러니 — LinkedIn이 Kafka를 떠나다

**2025년 6월**, LinkedIn은 Kafka를 대체할 두 시스템을 발표했습니다.

### 규모 변화

| 시점 | 규모 |
|---|---|
| **2013** (이 글 작성 시점) | 600억 메시지/일 |
| **2019** | 7조 메시지/일, 100+ 클러스터, 4,000 브로커, 10만 토픽, 700만 파티션 |
| **2025** | **32조 레코드/일, 17PB/일, 150 클러스터, 1만 머신, 40만 토픽** |

2013년 대비 **약 530배** 증가입니다.

### Northguard — 새 로그 스토리지

LinkedIn의 발표 요지: 15년간 Kafka를 써왔지만 자사 규모에서 **확장과 운영이 점점 어려워졌다.**

구체적 문제:
- 클러스터 확장 비용 증가
- Kafka의 **강하게 결합된 아키텍처** — 머신을 추가하면 파티션을 수동으로 리밸런싱해야 함. 느리고 고통스러운 작업

Northguard의 특징:
- **샤딩된 데이터 및 메타데이터** (Kafka는 메타데이터가 단일 컨트롤러에 집중)
- **로그 스트라이핑(log striping)**
- **강한 일관성**
- **자가 균형(self-balancing) 클러스터** ← 수동 리밸런싱 문제의 직접적 해결

### Xinfra — 가상화 pub/sub 레이어

물리적 클러스터 경계를 추상화하는 **가상화 계층**. Kafka ↔ Northguard 간 전환을 투명하게 만듭니다.
- 이미 LinkedIn 애플리케이션의 **90% 이상**이 Xinfra 클라이언트 사용
- 무중단으로 수천 개 토픽(미션 크리티컬 워크로드 포함)을 Kafka → Northguard로 마이그레이션

### 이 사건을 어떻게 읽을 것인가

**표면적으로는** "Kafka의 종말"처럼 보이지만, 정확히 읽으면 그 반대입니다.

1. **로그 추상화는 승리했고, 특정 구현이 교체된 것**입니다. Northguard도 로그 스토리지 시스템입니다. 이 글의 Part 1~4 논증 중 무엇 하나 무효화되지 않았습니다. 오히려 저자가 Part 1에서 예언한 **"로그를 구현과 무관한 상품화된 빌딩 블록으로 다루게 될 것"** 이 그대로 실현된 사례입니다.

2. **Xinfra의 존재 자체가 이 글의 정당화**입니다. 로그가 표준 인터페이스가 되었기 때문에, 그 아래 구현을 무중단으로 갈아끼울 수 있었습니다. 만약 회사가 여전히 O(N²) 점대점 파이프라인이었다면 이런 교체는 불가능했을 것입니다.

3. **Kafka의 진짜 한계는 "결합"이었습니다.** 메타데이터 중앙집중, 브로커-파티션 결합, 수동 리밸런싱 — 전부 Part 4가 말한 "해체"가 **충분히 진행되지 않은** 부분입니다. 저자의 처방을 Kafka 자신에게 덜 적용한 결과인 셈입니다.

4. **32조/일은 극단적 예외입니다.** 세계 대부분의 조직에서 Kafka는 여전히 충분하고도 남습니다. "LinkedIn이 떠났으니 Kafka는 끝"이라는 독해는 틀립니다.

## 6. 글 자체에 대한 구조적 비판

각 Part별 비판은 해당 문서에 있습니다. 여기서는 글 **전체**의 논증 구조에 대한 비판입니다.

### (a) 포지션 페이퍼로서의 편향

저자는 이 글 직후 Confluent를 창업했습니다. 글은 **"당신의 회사에는 중앙 로그가 필요하다"** 는 결론으로 수렴하고, 그 결론이 곧 저자가 팔 제품이었습니다.

편향이 드러나는 지점:
- 중앙 로그 도입의 **운영 비용**(전담 팀, 전문성, 클러스터 운영)을 거의 다루지 않음
- 중앙 로그가 **단일 장애점**이 되는 리스크를 논하지 않음
- "로그가 없으면 O(N²)"라는 대안 제시가 다소 허수아비 — 실무에서는 데이터 웨어하우스를 허브로 쓰는 중간 형태가 흔했음

논증의 질이 높다는 점은 변하지 않지만, **"이 글은 중립적 기술 분석이 아니라 설득문"** 이라는 전제를 갖고 읽어야 합니다.

### (b) 소규모 조직에 대한 과잉 처방

이 글의 문제 설정(N개 시스템 × M개 목적지)은 **LinkedIn 규모의 조직**에서 발생합니다. 시스템이 3~4개인 조직에서 Kafka 클러스터를 도입하는 것은 순수한 복잡도 증가입니다.

2020년대에 "Kafka를 도입했다가 후회했다"는 사례가 많은 이유가 이것입니다. 중앙 로그의 손익분기점은 **시스템 수와 팀 수가 충분히 클 때**에만 넘습니다. 글은 이 조건을 명시하지 않습니다.

> **실무 판단 기준:** 데이터 소스가 5개 미만이고 팀이 한둘이라면 PostgreSQL의 논리 복제 + 몇 개의 스크립트로 충분합니다. 로그 아키텍처는 **조직이 커져서 조정 비용이 기술 비용을 넘어설 때** 도입하는 것입니다.

### (c) "로그가 전부다"의 미학적 과장

글의 설득력 상당 부분이 **"하나의 단순한 추상화가 모든 것을 설명한다"** 는 지적 쾌감에서 옵니다. 하지만 이런 통일 이론적 서술은 항상 예외를 감춥니다.

로그로 설명이 잘 안 되는 것들:
- **읽기 성능** — 로그는 쓰기 경로만 해결. 질의 최적화, 인덱스 설계, 캐시 전략은 별개 문제
- **삭제/GDPR** — "append-only, 불변"은 "잊혀질 권리"와 근본적으로 충돌. 압축 tombstone은 부분적 해법이고, 실무에서는 암호화 키 삭제(crypto-shredding) 같은 우회가 필요
- **트랜잭션 경계** — 여러 엔티티에 걸친 원자적 변경은 로그 하나로 깔끔히 안 됨
- **스키마 진화** — 5년 전 로그를 오늘의 코드로 재생할 수 있는가? 이 글의 "언제든 재생 가능" 약속은 **코드와 스키마가 시간에 따라 변한다**는 현실 앞에서 크게 약해집니다

마지막 항목이 특히 중요합니다. **"로그를 처음부터 재생하면 된다"는 Kappa의 핵심 전제는, 실제로는 "5년 전 포맷의 데이터를 오늘의 잡이 해석할 수 있어야 한다"는 매우 강한 요구**입니다. 이것이 순수 Kappa가 실무에서 드문 진짜 이유입니다.

### (d) 시간 개념의 부재가 낳은 결과

Part 3에서 지적했듯, 글은 "시간 개념을 포함한 처리"라고만 하고 event time/processing time을 구분하지 않았습니다. 그 결과 **"로그의 순서 = 시간 순서"** 라는 암묵적 가정이 글 전체에 깔려 있습니다.

현실에서 이 가정은 깨집니다:
- 모바일 클라이언트가 오프라인 후 3일 뒤 전송
- 여러 파티션에서 온 데이터를 병합할 때 순서가 섞임
- 재처리 시 로그 순서와 원래 사건 시간이 다름

이 간극이 이후 10년간 스트림 처리 연구의 주제가 되었고, 워터마크·트리거·retraction 같은 상당히 복잡한 장치가 필요했습니다. 즉 **이 글의 우아함은 부분적으로 어려운 문제를 아직 만나지 않았기 때문**이기도 합니다.

## 7. 지금 이 글을 읽어야 하는 이유

비판을 늘어놓았지만, 이 글은 2026년에도 읽을 가치가 큽니다.

| 이유 | 설명 |
|---|---|
| **어휘를 만든 글** | "이벤트 백본", "changelog", "로그/테이블 이중성", "unbundling" — 오늘 우리가 데이터 인프라를 논하는 어휘 대부분이 여기서 나왔습니다 |
| **아직도 대부분의 조직이 못 하고 있는 것** | "데이터 욕구 위계"의 진단은 13년 뒤에도 유효합니다. AI/ML 투자를 하면서 기본 데이터 흐름이 없는 조직이 여전히 다수 |
| **설계 원칙의 재사용성** | "상태는 이벤트의 fold다"라는 원리는 Kafka와 무관하게 적용됩니다 — Redux, 이벤트 소싱, Git, CRDT, 블록체인, 심지어 LLM 대화 컨텍스트까지 |
| **논증 구조 자체가 교육적** | 이론(SMR) → 실무 문제(O(N²)) → 시스템 설계(파티셔닝) → 미래 예측으로 층을 쌓는 방식은 기술 문서 작성의 모범 사례 |
| **채점 가능한 예측** | 13년이 지나 검증이 가능해졌기 때문에, "좋은 기술 예측이란 무엇인가"를 배울 수 있습니다 — **패러다임은 맞히고 제품은 틀렸다** |

### 후속 학습 경로

```
  1. The Log (2013)                        ← 지금 읽은 글
         │
         ├──▶ Questioning the Lambda Architecture (2014)   — Kappa
         │
         ├──▶ I ❤️ Logs (책, 2014)                          — 확장판
         │
         ├──▶ Turning the Database Inside-Out (2015)        — Kleppmann, unbundling 심화
         │
         ├──▶ Designing Data-Intensive Applications (2017)  — 10~11장, 교과서적 정리
         │
         ├──▶ The Dataflow Model (Google, 2015)             — 이 글이 빠뜨린 "시간"
         │
         └──▶ Streaming Systems (책, 2018)                   — Dataflow 모델의 해설서
```

---

## 종합 채점

| 층위 | 점수 | 근거 |
|---|---|---|
| **이론 (Part 1)** | **A+** | SMR·합의·이중성에 대한 설명은 지금도 최고 수준. 시간이 지나도 낡지 않음 |
| **데이터 통합 진단 (Part 2)** | **A** | O(N²) 문제, 조직 확장성, 스키마 계약 — 13년 뒤에도 그대로 유효 |
| **스트림 처리 (Part 3)** | **B+** | 방향은 정확했으나 "시간 의미론"과 "정확히 한 번"이라는 두 난제를 놓침 |
| **시스템 설계 예측 (Part 4)** | **B+** | unbundling 방향 적중, 개별 제품 예측은 대부분 실패, 재번들링을 예상 못 함 |
| **비용/경제성** | **D** | 클라우드 비용 구조가 설계를 지배하게 될 것을 전혀 예측 못 함. 현재 이 분야 혁신의 주된 동인 |
| **영향력** | **A+** | 한 산업의 어휘와 설계 표준을 만들었음. 기술 에세이로서 역대급 |

---

## Sources

- [The Log: What every software engineer should know about real-time data's unifying abstraction — Jay Kreps, LinkedIn Engineering](https://www.linkedin.com/blog/engineering/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying)
- [Kappa Architecture is Mainstream Replacing Lambda — Kai Waehner](https://www.kai-waehner.de/blog/2021/09/23/real-time-kappa-architecture-mainstream-replacing-batch-lambda/)
- [Designing a Production-Ready Kappa Architecture for Timely Data Stream Processing — Uber Engineering](https://www.uber.com/us/en/blog/kappa-architecture-data-stream-processing/)
- [The Trouble with Kappa Architecture — Michael Segel](https://www.linkedin.com/pulse/trouble-kappa-architecture-michael-segel)
- [The Evolution of Log Storage in Modern Data Streaming Platforms — StreamNative](https://streamnative.io/blog/the-evolution-of-log-storage-in-modern-data-streaming-platforms)
- [Diskless Kafka: Object Storage, KIP-1150, and Kafka's Future — SoftwareMill](https://softwaremill.com/diskless-kafka-object-storage-kip-1150-and-kafkas-future/)
- [KIP-1150 Diskless Topics: Rethinking Storage and Cloud Costs in Kafka — Factor House](https://factorhouse.io/articles/kip-1150-diskless-topics-explained)
- [The Hitchhiker's guide to Diskless Apache Kafka — Aiven](https://aiven.io/blog/guide-diskless-apache-kafka-kip-1150)
- [Top 7 Diskless Kafka and Object-Storage Streaming Platforms in 2026 — AutoMQ](https://www.automq.com/blog/top-7-diskless-kafka-object-storage-streaming-platforms-2026)
- [How LinkedIn customizes Apache Kafka for 7 trillion messages per day — LinkedIn Engineering](https://www.linkedin.com/blog/engineering/open-source/apache-kafka-trillion-messages)
- [LinkedIn Announces Northguard and Xinfra: Scaling beyond Kafka for Log Storage and Pub/Sub — InfoQ](https://www.infoq.com/news/2025/06/linkedin-northguard-xinfra/)
- [LinkedIn introduces Northguard and Xinfra to replace Kafka for scalable log storage — SiliconANGLE](https://siliconangle.com/2025/06/25/linkedin-introduces-northguard-xinfra-replace-kafka-scalable-log-storage/)
- [Apache Flink 2.0.0: A new Era of Real-Time Data Processing — Apache Flink](https://flink.apache.org/2025/03/24/apache-flink-2.0.0-a-new-era-of-real-time-data-processing/)
- [Disaggregated State Management in Apache Flink 2.0 — VLDB](https://www.vldb.org/pvldb/vol18/p4846-mei.pdf)
- [Apache Fluss Roadmap](https://fluss.apache.org/roadmap/)
- [Data Streaming Landscape Q3 2026 — Kai Waehner](https://www.kai-waehner.de/blog/2026/09/07/data-streaming-landscape-q3-2026-who-controls-your-streams/)
- [The State of Streaming to Apache Iceberg in July 2026 — Alex Merced](https://iceberglakehouse.com/posts/streaming-to-iceberg-july-2026/)
- [Materialize Your Topics with Tableflow — Confluent](https://www.confluent.io/blog/unify-streaming-and-analytical-data-with-confluent-tableflow-and-amazon-sagemaker-lakehouse/)

---

> [← Part Four](./04-part4-system-building.md) | [개요로 돌아가기](./00-overview.md)
