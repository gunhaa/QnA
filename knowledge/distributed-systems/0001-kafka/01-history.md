---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# Kafka의 역사

## 쉬운 설명

LinkedIn에는 데이터를 주고받는 시스템이 너무 많아서, 시스템마다 서로 전용 배관을 하나씩 깔다 보니 배관이 거미줄처럼 엉켰다. 그래서 **모든 데이터를 한 줄로 길게 적어 두는 공용 공책**을 하나 만들고, 필요한 시스템은 그 공책을 각자 읽어 가게 했다. 이 공용 공책이 Kafka다.

## 일반 설명

### 1. 등장 배경 (2010~2011)

- **문제**: LinkedIn은 사용자 활동 이벤트(페이지뷰, 클릭, 검색)와 운영 지표를 DB·검색·추천·Hadoop 등 여러 시스템에 보내야 했다. 시스템 N개가 서로 직접 연결하면 파이프라인이 최대 N×(N−1)개로 늘어나고, 각각 포맷·장애 처리가 달랐다.
- 기존 메시지 큐(ActiveMQ 등)는 메시지를 소비하면 지우는 구조라 **Hadoop 같은 배치 소비자와 실시간 소비자가 같은 데이터를 각자 속도로 읽는** 요구에 맞지 않았고, 대량 처리량도 부족했다.
- **해법**: 모든 이벤트를 **순서가 있는 추가 전용 로그(append-only log)** 에 쓰고, 소비자는 자기가 어디까지 읽었는지(offset)만 기억하게 했다. 데이터는 소비 여부와 무관하게 보존 기간 동안 남는다.
- 만든 사람: **Jay Kreps, Neha Narkhede, Jun Rao**. 이름은 Kreps가 "쓰기에 최적화된 시스템"이라는 이유로 작가 프란츠 카프카에서 따왔다.
- 로그를 데이터 통합의 중심에 두는 생각과 Kafka 내부 구조의 관계는 [Kafka 개요](./02-overview.md)에서 다룬다.

### 2. 오픈소스와 회사

| 시기 | 사건 |
|---|---|
| 2011 초 | LinkedIn이 오픈소스로 공개 (Apache License 2.0) |
| 2011 | Apache 인큐베이터 진입 |
| **2012.10.23** | Apache 최상위 프로젝트(TLP)로 졸업 |
| 2014 | 세 창시자가 LinkedIn을 나와 **Confluent** 설립 |
| 2019 | LinkedIn 사내 Kafka가 **하루 7조 건**, 클러스터 100개 이상, 브로커 4,000대 이상, 파티션 700만 개 규모라고 공개 |
| 2024.09 | Confluent가 **WarpStream**(오브젝트 스토리지 기반 Kafka 호환, BYOC) 인수 |
| **2026.03.17** | **IBM이 Confluent 인수 완료** (주당 31달러, 기업가치 약 110억 달러) |

Apache Kafka 자체는 ASF 프로젝트이고 라이선스는 처음부터 **Apache 2.0**으로 바뀐 적이 없다. Confluent Platform·Cloud의 상용 기능(Schema Registry 일부, Cluster Linking 등)은 별개다.

### 3. 주요 버전 변천

| 버전 | 시기 | 핵심 변화 | 해결하려던 문제 |
|---|---|---|---|
| 0.7 이전 | 2011~2012 | 단일 브로커 저장, 복제 없음 | 대량 로그 수집 |
| **0.8** | 2013.11 | **클러스터 내 복제**(리더-팔로워, ISR) | 브로커 장애 시 데이터 유실 |
| 0.9 | 2015 | **Kafka Connect**, 새 Java 컨슈머 | 외부 시스템 연동 표준화 |
| 0.10 | 2016 | **Kafka Streams** | 별도 클러스터 없는 스트림 처리 |
| **0.11** | 2017 | 멱등 프로듀서, **트랜잭션** → exactly-once 처리 | 재시도 중복, 처리-커밋 원자성 |
| 1.0 | 2017.11.28 | 첫 1.x 메이저 | 안정성 선언 |
| 2.4 | 2019 | **MirrorMaker 2**(Connect 기반 클러스터 간 복제) | 리전 간 복제·DR |
| 2.8 | 2021 | **KRaft** 얼리 액세스 (KIP-500) | ZooKeeper 의존 제거 |
| 3.0 | 2021.09 | 프로듀서 기본값 `acks=all`, `enable.idempotence=true` | 기본 설정의 유실·중복 위험 |
| 3.3 | 2022 | KRaft **신규 클러스터용 프로덕션 준비** | — |
| **3.9** | 2024.11 | **티어드 스토리지 프로덕션 준비**(KIP-405), 동적 KRaft 쿼럼(KIP-853). **ZooKeeper 모드를 지원하는 마지막 릴리스**이자 4.0으로 가는 브리지 | 디스크 비용, 컨트롤러 증감 |
| **4.0** | 2025.03.18 | **ZooKeeper 완전 제거(KRaft 전용)**, 새 컨슈머 리밸런스 프로토콜 **KIP-848 GA**, 공유 그룹(KIP-932) 얼리 액세스, 메시지 포맷 v0·v1 제거, 브로커 Java 17·클라이언트 Java 11 | 메타데이터 확장성, 리밸런스 중단 |
| 4.1 | 2025.09 | 공유 그룹 프리뷰, Streams 리밸런스 프로토콜(KIP-1071) 얼리 액세스, 신규 클러스터 **ELR(KIP-966) 기본 활성** | 마지막 레플리카 문제 |
| **4.2** | 2026.02.17 | **공유 그룹(Queues for Kafka) 프로덕션 준비**, Streams 리밸런스 프로토콜 GA(기능 제한) | 큐 방식 소비 |
| 4.3 | 2026.05.22 | 브로커·로그 디렉터리 cordon(KIP-1066), 티어드 오프셋부터 팔로워 시작(KIP-1023), classic 프로토콜 사용 시 전환 권고 로그 | 운영 편의 |
| **4.4** | 2026.10.22 | 공유 그룹 DLQ(KIP-1191), 티어드 스토리지 지연 업로드(KIP-1241), Streams 트랜잭셔널 상태 저장소(KIP-892), `broker.id` 지원 중단 예고 | 큐 실패 처리, 원격 저장 비용 |

### 4. ZooKeeper에서 KRaft로

| 단계 | 내용 |
|---|---|
| ZooKeeper 시절 (~3.x) | 메타데이터(토픽, 파티션 리더, ACL)를 외부 ZooKeeper 앙상블에 저장. 컨트롤러 브로커 1대가 ZooKeeper를 통해 상태 전파. 별도 시스템 운영 부담과 파티션 수 상한이 문제 |
| KIP-500 (2.8 얼리 액세스) | 컨트롤러들이 Raft로 **`__cluster_metadata` 로그**를 직접 복제 |
| 3.3 | 신규 클러스터 프로덕션 준비 |
| 3.9 | 마지막 ZooKeeper 지원. 기존 클러스터는 3.9에서 ZooKeeper → KRaft 마이그레이션 후 4.0으로 올라간다 |
| 4.0 | ZooKeeper 모드 제거 |

KRaft 컨트롤러 쿼럼의 구조는 [개요 — 컨트롤 플레인](./02-overview.md#6-컨트롤-플레인-kraft)과 [Kafka 복제 모델과 컨트롤 플레인](../../../inquiry/distributed-systems/0008-kafka-replication-model-and-control-plane.md)에 있다.

### 5. 현재 상태 (2026년 11월)

- **최신 버전**: 4.4.0(2026.10.22). 패치 라인은 4.3.2(2026.10.23), 4.2.2(2026.09.29). 3.x는 3.9.2(2026.02)가 마지막 패치.
- **라이선스**: Apache 2.0.
- **진행 중인 큰 흐름**
  - **디스크리스 토픽(KIP-1150)**: 브로커 로컬 디스크·복제 대신 오브젝트 스토리지에 직접 쓰는 토픽. 2026.03 KIP 승인, 세부 구현은 KIP-1163·1164로 나뉘어 진행 중이며 **2026년 11월 기준 정식 릴리스에는 없다.**
  - **새 리밸런스 프로토콜 기본값화**: 4.x에서 클라이언트 기본값은 아직 `group.protocol=classic`이다. 4.3부터 classic을 쓰면 전환 권고 로그를 남기고, `group.coordinator.rebalance.protocols` 설정은 5.0 제거 예정으로 지원 중단됐다.
- **Kafka 프로토콜 호환 경쟁·대체 구현**

| 제품 | 형태 | 라이선스 |
|---|---|---|
| Confluent Platform / Cloud | Kafka 기반 상용 배포판·매니지드 (IBM 소유) | 상용 + Confluent Community License |
| Amazon MSK | AWS 매니지드 Kafka (4.1 지원) | 매니지드 |
| **Redpanda** | C++ 재구현, ZooKeeper·JVM 없음 | Community Edition은 BSL(4년 뒤 Apache 2.0 전환), Enterprise는 RCL |
| **WarpStream** | 상태 없는 에이전트 + 오브젝트 스토리지, BYOC | 상용 (Confluent 소유) |
| **AutoMQ** | Kafka 포크, 저장소를 S3로 교체 | Apache 2.0 |
| **Apache Pulsar** | 다른 프로토콜. 브로커와 저장소(BookKeeper) 분리 | Apache 2.0. 최신 LTS 5.0(2026.10) |

각 대안을 언제 고르는지는 [트레이드오프 — 대안 비교](./03-tradeoffs.md#2-대안-비교)에 있다.

## 관련 문서

- [Kafka 개요와 기본 사용법](./02-overview.md)
- [Kafka 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [Kafka 운영 시 자주 겪는 문제와 해결 방법](./04-pitfalls.md)
- [Kafka 장애 대응과 고가용성](./05-failures.md)
- [Kafka(카프카)가 뭐예요?](../../../inquiry/distributed-systems/0002-kafka-overview.md)

## 참고 자료

- [Apache Kafka — Wikipedia](https://en.wikipedia.org/wiki/Apache_Kafka)
- [Apache Kafka Downloads (릴리스 날짜)](https://kafka.apache.org/community/downloads/)
- [Changes in Kafka 0.8 — Apache Wiki](https://cwiki.apache.org/confluence/spaces/KAFKA/pages/30749496/Changes+in+Kafka+0.8)
- [How LinkedIn customizes Apache Kafka for 7 trillion messages per day — LinkedIn Engineering](https://engineering.linkedin.com/blog/2019/apache-kafka-trillion-messages)
- [What's New in Apache Kafka 2.8 (KIP-500 early access) — Confluent](https://www.confluent.io/blog/kafka-2-8-0-features-and-improvements-with-early-access-to-kip-500/)
- [Apache Kafka 3.3 — KRaft production ready — Confluent](https://www.confluent.io/blog/apache-kafka-3-3-0-new-features-and-updates/)
- [Apache Kafka 3.9.0 Release Announcement](https://kafka.apache.org/blog/2024/11/06/apache-kafka-3.9.0-release-announcement/)
- [Apache Kafka 4.0.0 Release Announcement](https://kafka.apache.org/blog/2025/03/18/apache-kafka-4.0.0-release-announcement/)
- [Apache Kafka 4.1.0 Release Announcement](https://kafka.apache.org/blog/2025/09/04/apache-kafka-4.1.0-release-announcement/)
- [Apache Kafka 4.2.0 Release Announcement](https://kafka.apache.org/blog/2026/02/17/apache-kafka-4.2.0-release-announcement/)
- [Apache Kafka 4.3.0 Release Announcement](https://kafka.apache.org/blog/2026/05/22/apache-kafka-4.3.0-release-announcement/)
- [Apache Kafka 4.4.0 Release Announcement](https://kafka.apache.org/blog/2026/10/22/apache-kafka-4.4.0-release-announcement/)
- [Eligible Leader Replicas — Apache Kafka 4.3 Docs](https://kafka.apache.org/43/operations/eligible-leader-replicas/)
- [KIP-1150 accepted and the road ahead — Aiven](https://aiven.io/blog/kip-1150-accepted-and-the-road-ahead)
- [Kafka "Diskless" – Proposals, Status & Insights — Instaclustr](https://www.instaclustr.com/support/documentation/announcements/apache-kafka/kafka-diskless-proposals-status-insights/)
- [Confluent Acquires WarpStream — Business Wire](https://www.businesswire.com/news/home/20240909282386/en/Confluent-Acquires-WarpStream-to-Advance-Next-Gen-BYOC-Data-Streaming)
- [IBM Completes Acquisition of Confluent — PR Newswire](https://tools.prnewswire.com/en-us/live/20823/release/20260317EN11741)
- [Redpanda Licenses and Enterprise Features — Redpanda Docs](https://docs.redpanda.com/current/get-started/licensing/overview/)
- [automq/automq — GitHub](https://github.com/automq/automq)
- [Apache Pulsar — endoflife.date](https://endoflife.date/pulsar)
- [Amazon MSK adds support for Apache Kafka version 4.1 — AWS](https://aws.amazon.com/about-aws/whats-new/2025/10/amazon-msk-apache-kafka-version-4-1)
