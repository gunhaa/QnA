---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# Kafka 트레이드오프와 선택 기준

## 쉬운 설명

Kafka는 **아주 긴 컨베이어 벨트를 여러 줄 깔아 둔 공장**이다. 물건을 엄청 많이, 빠르게 실어 나르고 지나간 물건도 한동안 다시 볼 수 있다. 대신 한 줄 안에서만 순서가 지켜지고, 벨트 위의 물건 하나를 콕 집어 찾거나 고치기는 어렵고, 공장을 돌리려면 기술자가 여럿 필요하다.

## 일반 설명

이 문서는 **고르기 전에** 읽는 문서다. 동작 방식은 [개요](./02-overview.md), 고른 뒤 사람이 잘못 쓰는 문제는 [자주 겪는 문제](./04-pitfalls.md), Kafka 자체의 장애는 [장애 대응](./05-failure-modes.md)에서 다룬다.

### 1. 핵심 설계 선택: 얻은 것과 포기한 것

| 설계 선택 | 얻은 것 | 포기한 것 (대가) | 수치·사례 |
|---|---|---|---|
| **추가 전용 로그 + 보존** | 재생, 여러 소비자 독립 소비, 순차 I/O | 단건 수정·삭제·임의 조회 불가. 보존 기간만큼 디스크 | 기본 보존 7일. 삭제는 세그먼트(기본 1 GiB) 단위 |
| **파티션 단위 순서** | 파티션 수만큼 수평 확장 | **토픽 전체 순서 없음.** 파티션 수는 늘릴 수만 있고, 늘리면 키→파티션 매핑이 바뀜 | 컨슈머 그룹 병렬성 상한 = 파티션 수. 흔히 인용되는 상한은 브로커당 약 4,000 파티션 |
| **pull 소비** | 소비자가 자기 속도로, 배치로 가져감. 느린 소비자가 브로커를 막지 않음 | 메시지 없을 때도 폴링. 레코드 단위 라우팅·우선순위 없음 | 롱 폴링으로 빈 요청 낭비를 줄임 |
| **페이지 캐시 의존, fsync 안 함** | 디스크 동기화가 쓰기 경로에 없음 → 높은 처리량 | 내구성을 **복제에 전적으로 의존**. 같은 랙·AZ 동시 전원 장애에 취약 | 2020 Confluent 벤치마크(OMB): 처리량 605 MB/s, 200 MB/s 부하에서 p99 5 ms. **벤더 측정이며 StreamNative가 반박** |
| **리더-팔로워 + ISR** | 과반 합의보다 적은 사본으로 장애 허용(RF=3, min ISR 2 → 1대 장애 견딤) | 설정에 따라 유실 가능(`min.insync.replicas` 기본 1). AZ 간 복제 트래픽 비용 | 클라우드에서는 AZ 간 복제 전송비가 비용의 큰 몫 → 디스크리스(KIP-1150)·WarpStream 등장 배경 |
| **스마트 클라이언트** | 브로커가 단순해져 확장 쉬움 | 파티셔닝·배치·재시도·리밸런스 로직이 클라이언트에. 언어별 클라이언트 품질 차이 | KIP-848로 할당 계산은 브로커로 이동 |
| **JVM + 자체 KRaft** | 외부 의존 없음(4.0+), 메타데이터 확장 | 운영할 프로세스·튜닝 항목이 많음 | 브로커 Java 17 이상 |

한 줄로 줄이면, Kafka는 **처리량·재생·확장성을 위해 단건 접근성·전역 순서·운영 단순함을 포기**했다.

### 2. 대안 비교

| 대안 | 다른 점 | 고르는 경우 | 주의 |
|---|---|---|---|
| **RabbitMQ** | push, Exchange 라우팅, 소비 후 삭제 | 작업 큐, 복잡한 라우팅, 요청-응답, 중소 처리량 | 재생 불가(Streams 플러그인 제외). 2020 Confluent 측정에서 미러링 큐 38 MB/s → [Kafka vs RabbitMQ](../../../inquiry/distributed-systems/0003-kafka-vs-rabbitmq.md) |
| **Kafka 공유 그룹** (4.2+) | Kafka 안에서 레코드 단위 큐 소비 | 이미 Kafka가 있고 파티션 수를 넘는 병렬 작업 처리가 필요 | 순서 보장 없음. 4.4에서야 DLQ 추가 → 성숙도 확인 |
| **Redpanda** | C++ 재구현, Kafka API 호환, 스레드-코어 고정 | 노드 수 줄이기, 낮은 꼬리 지연, JVM 회피 | Community Edition은 BSL(관리형 서비스로 재판매 금지). 일부 기능은 Enterprise 라이선스 |
| **Apache Pulsar** | 브로커(무상태)와 저장소(BookKeeper) 분리, 멀티 테넌시·지역 복제 내장 | 수많은 토픽·테넌트, 저장과 컴퓨트 독립 확장 | 구성 요소가 더 많다. Kafka API와 다름 |
| **WarpStream / AutoMQ** (디스크리스) | 브로커 로컬 디스크 대신 오브젝트 스토리지에 직접 기록 | 로그·관측성처럼 지연을 수백 ms까지 허용하고 AZ 간 전송비를 없애고 싶을 때 | 쓰기 지연 증가. WarpStream은 상용(Confluent), AutoMQ는 Apache 2.0 |
| **Redis Streams** | 인메모리 로그, 컨슈머 그룹 | 작고 짧게 보관하는 스트림, 이미 Redis 운영 중 | 메모리 안에서만 보관 → [Redis 트레이드오프](../../database/0002-redis/03-tradeoffs.md) |
| **DB + Outbox / CDC** | 이벤트를 DB 트랜잭션과 함께 기록 | 서비스 몇 개 사이의 이벤트 전달, 처리량이 작음 | 결국 대규모로 퍼뜨릴 때는 Kafka로 이어지는 경우가 많음 → [Outbox](../../../inquiry/distributed-systems/0005-spring-kafka-consumer-vs-outbox.md) |

### 3. 주요 선택지

#### 3.1 내구성 설정 — 잃어도 되는 범위로 고른다

| 목표 | 토픽·브로커 | 프로듀서 | 결과 |
|---|---|---|---|
| 처리량 최우선, 일부 유실 허용(지표·로그) | RF 2~3, min ISR 1 | `acks=1`, `linger.ms` 크게 | 리더 장애 시 미복제분 유실 |
| **일반 업무 이벤트 (표준)** | **RF 3, `min.insync.replicas=2`**, unclean 선출 끔(기본) | `acks=all`, 멱등(둘 다 3.0+ 기본) | 브로커 1대 장애 무유실·무중단, 2대 장애 시 쓰기 거부 |
| 리전 장애까지 무유실 | 3개 AZ에 레플리카 분산(`broker.rack`) + 리전 간 복제 | 위와 같음 | 리전 간 복제는 비동기 → RPO > 0 ([장애 대응 — DR](./05-failure-modes.md#6-리전-장애와-dr)) |

`acks=all`만으로는 부족하고 `min.insync.replicas`가 짝이어야 하는 이유는 [Kafka 복제 모델](../../../inquiry/distributed-systems/0008-kafka-replication-model-and-control-plane.md)에 있다.

#### 3.2 파티션 수 — 소비 병렬성과 키 분포로 고른다

| 기준 | 계산 |
|---|---|
| 목표 처리량 | max(목표 MB/s ÷ 파티션당 생산 처리량, 목표 MB/s ÷ 파티션당 소비 처리량) |
| 소비 병렬성 | 피크 때 필요한 컨슈머 수 ≥ 파티션 수가 되도록 |
| 키 순서 | 키별 순서가 필요하면 파티션 수를 나중에 바꾸지 않도록 처음부터 여유 있게 (늘리면 매핑이 바뀜) |
| 상한 | 파티션이 많을수록 배치가 잘게 쪼개져 처리량이 떨어지고, 파일 핸들·장애 복구 시간이 늘어남 |

파티션이 많을 때 실제로 무엇이 느려지는지는 [Kafka 파티션과 디스크·병렬성](../../../inquiry/distributed-systems/0007-kafka-partition-disk-and-parallelism.md)에 있다.

#### 3.3 소비 모델 — 순서와 병렬성으로 고른다

| 선택 | 고르는 경우 |
|---|---|
| 컨슈머 그룹 + `group.protocol=consumer` (KIP-848) | 신규 Java 클라이언트. 리밸런스 중단을 줄이고 싶을 때. 클라이언트 측 커스텀 할당자는 쓸 수 없음 |
| 컨슈머 그룹 + classic | 커스텀 할당자, 새 프로토콜 미지원 클라이언트·브로커 |
| 공유 그룹 | 순서 무관 작업 큐, 파티션 수보다 많은 워커 |
| Kafka Streams / Flink | 상태 있는 집계·조인, exactly-once 처리 |

#### 3.4 저장 계층 — 보존 기간으로 고른다

| 보존 | 선택 | 대가 |
|---|---|---|
| 수일 | 로컬 디스크만 | 단순, 가장 빠름 |
| 수주~수년 | **티어드 스토리지**(3.9+ 프로덕션 준비) | 오래된 데이터 읽기가 오브젝트 스토리지 지연·요청 비용. 4.3.2에서 리더 선출 후 크기 기반 보존이 보존 기간 내 데이터를 지우던 버그(KAFKA-20732)가 고쳐졌다 → 패치 버전 확인 |
| 키별 최신 상태만 | `cleanup.policy=compact` | 이력은 사라짐 |
| SQL로 조회 | 토픽 → Iceberg 등 테이블로 물질화 | 파이프라인 추가 → [Kafka를 DB처럼 쓸 수 있나](../../../inquiry/distributed-systems/0006-kafka-as-a-database-offset-lookup.md) |

#### 3.5 운영 형태 — 인력과 비용으로 고른다

| 선택 | 근거 |
|---|---|
| 직접 운영 (Apache Kafka, Strimzi 등) | 라이선스 비용 없음, 완전한 통제. 컨트롤러·브로커·모니터링·업그레이드 인력 필요 |
| Amazon MSK | AWS 안에서 브로커 관리를 위임(4.1 지원). 버전 선택은 AWS 지원 범위 안 |
| Confluent Cloud | 완전 관리형 + Schema Registry·커넥터·Flink. 가장 비쌀 수 있고 IBM 소유 |
| BYOC 디스크리스 (WarpStream 등) | 데이터는 내 계정 버킷, 운영은 벤더. 지연 허용 워크로드 |

### 4. 쓰지 말아야 할 때

| 상황 | 이유 | 대신 |
|---|---|---|
| 초당 수백 건, 서비스 몇 개 | 컨트롤러 3 + 브로커 3 이상의 운영 비용이 이득보다 큼 | RabbitMQ, SQS, DB 큐, Redis Streams |
| 요청-응답, 즉시 응답이 필요한 RPC | 비동기 로그. 응답 상관관계를 직접 구현해야 함 | HTTP/gRPC |
| 키로 단건 조회·수정하는 저장소 | 로그는 offset 순차 접근용 | DB, KV 스토어 |
| 메시지별 지연 전송·우선순위·TTL | 기본 기능이 없음 | RabbitMQ, SQS |
| 토픽 전체의 엄격한 전역 순서 + 높은 처리량 | 전역 순서 = 파티션 1개 = 확장 불가 | 순서 범위를 키 단위로 재설계 |
| 메시지 1건이 수 MB~GB | 기본 최대 약 1 MB, 큰 메시지는 메모리·복제 부담 | 오브젝트 스토리지에 두고 참조만 전송(claim check) |

### 5. 선택 체크리스트

- [ ] 같은 데이터를 **둘 이상의 소비자**가 읽거나, 나중에 **재생**할 필요가 있는가? (없으면 일반 큐가 단순하다)
- [ ] 순서가 필요한 범위가 **키 단위**로 나뉘는가?
- [ ] 피크 처리량과 필요한 컨슈머 수로 파티션 수를 정했는가? 키 분포가 고른가?
- [ ] 잃어도 되는 범위는? → RF·`min.insync.replicas`·`acks` 조합
- [ ] 보존 기간은? 수주 이상이면 티어드 스토리지 또는 테이블 물질화
- [ ] 소비 측 중복 처리(멱등)를 설계했는가? 외부 DB까지 exactly-once가 아님을 알고 있는가?
- [ ] DB 변경과 이벤트 발행을 묶어야 하는가? → Outbox/CDC
- [ ] 리전 장애 대응이 필요한가? → MirrorMaker 2 등과 RPO
- [ ] 직접 운영할 인력이 있는가, MSK·Confluent Cloud·BYOC인가?
- [ ] 라이선스: Apache 2.0이 필요한가, BSL(Redpanda)·상용을 받아들일 수 있는가?

## 관련 문서

- [Kafka의 역사](./01-history.md)
- [Kafka 개요와 기본 사용법](./02-overview.md)
- [Kafka 운영 시 자주 겪는 문제와 해결 방법](./04-pitfalls.md)
- [Kafka 장애 대응과 고가용성](./05-failure-modes.md)
- [고가용성 구성 방식 — replica vs cluster](../../../inquiry/distributed-systems/0009-high-availability-replication-vs-cluster-and-patterns.md)

## 참고 자료

- [Benchmarking Apache Pulsar, Kafka, and RabbitMQ — Confluent Blog](https://www.confluent.io/blog/kafka-fastest-messaging-system/)
- [Perspective on Pulsar's performance compared to Kafka — StreamNative](https://streamnative.io/blog/perspective-on-pulsars-performance-compared-to-kafka)
- [Apache Kafka 4.4 — Broker Configs](https://kafka.apache.org/44/configuration/broker-configs/)
- [Apache Kafka 4.4 — Producer Configs](https://kafka.apache.org/44/configuration/producer-configs/)
- [Consumer Rebalance Protocol — Apache Kafka 4.4 Docs](https://kafka.apache.org/44/operations/consumer-rebalance-protocol/)
- [Apache Kafka 4.2.0 Release Announcement (share groups)](https://kafka.apache.org/blog/2026/02/17/apache-kafka-4.2.0-release-announcement/)
- [Apache Kafka 4.3.2 Release Announcement (tiered storage fixes)](https://kafka.apache.org/blog/2026/10/23/apache-kafka-4.3.2-release-announcement/)
- [Redpanda Licenses and Enterprise Features — Redpanda Docs](https://docs.redpanda.com/current/get-started/licensing/overview/)
- [Redpanda vs Kafka: Architecture, Trade-offs — Conduktor](https://www.conduktor.io/glossary/redpanda-vs-kafka)
- [Confluent Acquires WarpStream — Business Wire](https://www.businesswire.com/news/home/20240909282386/en/Confluent-Acquires-WarpStream-to-Advance-Next-Gen-BYOC-Data-Streaming)
- [automq/automq — GitHub](https://github.com/automq/automq)
- [The Path Forward for Saving Cross-AZ Replication Costs KIPs — Apache Wiki](https://cwiki.apache.org/confluence/display/KAFKA/The+Path+Forward+for+Saving+Cross-AZ+Replication+Costs+KIPs)
- [When to use RabbitMQ or Apache Kafka — CloudAMQP](https://www.cloudamqp.com/blog/when-to-use-rabbitmq-or-apache-kafka.html)
- [Amazon MSK adds support for Apache Kafka version 4.1 — AWS](https://aws.amazon.com/about-aws/whats-new/2025/10/amazon-msk-apache-kafka-version-4-1)
