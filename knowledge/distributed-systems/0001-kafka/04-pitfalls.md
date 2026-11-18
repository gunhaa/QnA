---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# Kafka 운영 시 자주 겪는 문제와 해결 방법

## 쉬운 설명

사람들이 Kafka에서 자주 하는 실수는 대개 **기본값을 믿는 것**이다. "다 같이 받았다고 하면 안전하겠지"라고 했는데 받은 사람이 한 명뿐이었고, "알아서 표시해 두겠지" 했는데 일을 끝내기 전에 표시가 먼저 됐고, "칸을 많이 나누면 빠르겠지" 했는데 오히려 느려진다.

## 일반 설명

이 문서는 **사람이 잘못 써서** 생기는 문제를 다룬다. 브로커·컨트롤러·네트워크가 깨지는 상황은 [장애 대응](./05-failures.md)에 있다.

### 1. 기본값 함정

| 설정 | 기본값 | 함정 | 권장 |
|---|---|---|---|
| `min.insync.replicas` (브로커·토픽) | **1** | `acks=all`이어도 ISR이 리더 1대로 줄면 1대만 받고 성공 → 그 리더가 죽으면 유실 | RF 3이면 **2** |
| `default.replication.factor` | **1** | 자동 생성 토픽이 복제 없이 만들어짐 | 3 |
| `auto.create.topics.enable` | **true** | 오타 토픽이 RF 1, 파티션 기본값으로 조용히 생김 | 운영에서 false, 토픽은 코드·IaC로 생성 |
| `auto.offset.reset` | `latest` | 새 그룹이 배포 전 쌓인 메시지를 건너뜀 | 첫 배포는 `earliest` 여부를 명시적으로 결정 |
| `enable.auto.commit` | true (5초) | 처리 전에 커밋되어 크래시 시 유실, 또는 처리 후 커밋 전 크래시로 중복 | 처리 후 수동 커밋 |
| `offsets.retention.minutes` | 10080 (7일) | 그룹이 7일 넘게 멈춰 있으면 커밋 offset이 사라지고 `auto.offset.reset`으로 다시 시작 | 장기 정지 그룹은 재시작 전 offset 확인 |
| `group.protocol` (클라이언트) | `classic` | 4.0 브로커로 올려도 클라이언트가 새 리밸런스 프로토콜을 쓰지 않음 | `consumer`로 명시 (커스텀 할당자 확인) |
| `message.max.bytes` | 약 1 MB | 큰 메시지 전송 실패. 프로듀서·브로커·토픽·컨슈머 설정을 따로따로 올려야 함 | 크게 올리기보다 claim check |

`acks`와 `min.insync.replicas`가 왜 짝이어야 하는지는 [Kafka 복제 모델](../../../inquiry/distributed-systems/0008-kafka-replication-model-and-control-plane.md)에 자세히 있다.

### 2. 파티션 설계 실수

| 실수 | 증상 | 해결 |
|---|---|---|
| "많을수록 빠르다"며 파티션 과다 | 파티션당 배치가 작아져 요청 수 증가·압축률 하락, 리더 선출·리밸런스가 느려짐 | 처리량·컨슈머 수로 계산 ([트레이드오프 — 파티션 수](./03-tradeoffs.md#32-파티션-수--소비-병렬성과-키-분포로-고른다)) |
| 운영 중 파티션 증설 | 같은 키가 다른 파티션으로 가서 **키 순서가 깨짐** | 처음부터 여유 있게. 꼭 늘려야 하면 새 토픽으로 이전 |
| 키 쏠림(hot key) | 한 파티션만 지연(lag) 증가, 그 컨슈머만 바쁨 | 키 설계 변경(복합 키), 쏠린 키 분리 |
| 키 없이 보내면서 순서 기대 | sticky 파티셔너가 파티션을 옮겨 다님 → 순서 없음 | 순서가 필요한 단위를 키로 |
| 컨슈머 수 > 파티션 수 | 남는 컨슈머는 놀기만 함 | 파티션 증설 또는 공유 그룹 |

파티션이 디스크와 병렬성에 실제로 미치는 영향은 [Kafka 파티션과 디스크·병렬성](../../../inquiry/distributed-systems/0007-kafka-partition-disk-and-parallelism.md).

### 3. 컨슈머 실수

| 실수 | 증상 | 해결 |
|---|---|---|
| `poll()` 사이 처리가 `max.poll.interval.ms`(기본 5분)를 넘음 | 컨슈머가 그룹에서 쫓겨나고 리밸런스 → 다른 컨슈머가 같은 레코드를 다시 처리 → 반복되는 **리밸런스 폭풍** | `max.poll.records`(기본 500)를 줄이거나 처리 시간 단축, 오래 걸리는 작업은 별도 워커로 |
| `poll()` 루프에서 동기 외부 호출 | 지연 증가, 위와 같은 연쇄 | 배치 처리·비동기화, 타임아웃 |
| 처리 실패 레코드에서 무한 재시도 | 그 파티션 전체가 멈춤(poison pill) | 재시도 횟수 제한 후 DLQ 토픽. 공유 그룹은 4.4 DLQ |
| 역직렬화 실패를 예외로 던짐 | 같은 offset에서 계속 실패 | 에러 핸들러로 건너뛰고 기록(Spring `ErrorHandlingDeserializer` 등) |
| 컨테이너 롤링 배포마다 리밸런스 | classic eager에서 전원 정지 | `group.protocol=consumer`, classic이면 cooperative 할당자 + static membership(`group.instance.id`) |
| 지연(lag)을 보지 않음 | 보존 기간이 지나 **읽기 전에 데이터가 삭제** | 그룹 lag과 보존 시간 대비 lag 시간을 알림. 4.3 KIP-1257로 파티션별 보존 사용률 지표 |

Spring Kafka의 폴링 루프 동작은 [Spring Kafka Consumer vs Outbox](../../../inquiry/distributed-systems/0005-spring-kafka-consumer-vs-outbox.md), 롱 폴링 자체는 [Kafka 소비 방식](../../../inquiry/distributed-systems/0001-kafka-consumer-mechanism.md).

### 4. 전달 보장과 중복

| 오해 | 실제 | 대응 |
|---|---|---|
| "Kafka는 exactly-once다" | 트랜잭션은 **Kafka 안(읽기-처리-쓰기)** 에서만 원자적. 외부 DB 쓰기·HTTP 호출은 범위 밖 | 소비 측 **멱등 처리**(이벤트 ID 유니크 키, upsert) |
| "멱등 프로듀서면 중복 없음" | 프로듀서 **재시도 중복**만 막는다. 앱이 같은 이벤트를 두 번 `send()`하면 두 건 | 비즈니스 키로 중복 제거 |
| 트랜잭션 프로듀서 쓰는데 컨슈머 기본값 | 기본 `isolation.level=read_uncommitted` → 중단된 트랜잭션 레코드도 읽음 | `read_committed` |
| DB 커밋 후 `send()` | 둘 중 하나만 성공하는 **이중 쓰기 문제** | Transactional Outbox / CDC → [Outbox](../../../inquiry/distributed-systems/0005-spring-kafka-consumer-vs-outbox.md) |
| `send()` 반환 = 전송 완료 | 비동기. 콜백·Future를 안 보면 실패를 모름 | 콜백에서 실패 로깅·처리, 종료 시 `flush()` |

### 5. Kafka를 DB처럼 쓰기

- offset으로 단건 조회, 키로 검색, 레코드 수정을 기대하면 성능·정합성 문제가 생긴다. offset은 연속이 아니고(compaction, 트랜잭션 마커) 클러스터를 옮기면 바뀐다.
- 정석은 **Kafka를 원본 로그로, 조회는 파생 저장소(DB·검색·테이블 포맷)** 로 두는 것이다 → [Kafka를 DB처럼 쓸 수 있나](../../../inquiry/distributed-systems/0006-kafka-as-a-database-offset-lookup.md).

### 6. 운영 설정 실수

| 실수 | 결과 | 해결 |
|---|---|---|
| 레플리카를 랙·AZ 고려 없이 배치 | AZ 하나가 죽으면 파티션의 모든 사본이 함께 사라질 수 있음 | `broker.rack` 설정 → 랙 인지 배치 |
| 브로커 디스크 여유 없이 보존 기간 설정 | 디스크 가득 → 브로커 정지 | 보존 = 유입량 × 기간 × RF + 여유 30% 이상 |
| 보존 시간을 줄이는 변경을 바로 적용 | 아직 안 읽은 데이터가 즉시 삭제 대상 | lag 확인 후 적용 |
| JVM 힙을 크게 | Kafka는 페이지 캐시가 핵심 → 힙이 크면 캐시가 줄어 디스크 읽기 증가 | 힙은 작게(수 GB), 나머지 메모리는 OS에 |
| 롤링 재시작을 서두름 | 앞 브로커의 레플리카가 ISR에 복귀하기 전에 다음 브로커를 내림 → min ISR 미달로 쓰기 거부 | `UnderReplicatedPartitions`가 0이 된 뒤 다음 노드 |
| 3.x ZooKeeper 클러스터를 4.0으로 바로 업그레이드 | 4.0은 ZooKeeper 모드가 없음 | 3.9에서 KRaft 마이그레이션 먼저 |
| 오래된 클라이언트 방치 | 4.0은 2.1 미만 클라이언트의 프로토콜 버전을 제거(KIP-896) | 업그레이드 전 클라이언트 버전 조사 |
| 보안 없이 운영 | 누구나 토픽 생성·삭제·읽기 | TLS/SASL + ACL, 토픽 삭제 권한 분리 |

### 7. 진단 도구

| 확인할 것 | 도구 |
|---|---|
| 그룹 lag, 할당 상태 | `kafka-consumer-groups.sh --describe` |
| 복제 부족 파티션 | `kafka-topics.sh --describe --under-replicated-partitions`, `--under-min-isr-partitions` |
| 컨트롤러 쿼럼 상태 | `kafka-metadata-quorum.sh describe --status` |
| 세그먼트 내용 | `kafka-dump-log.sh` |
| 핵심 JMX 지표 | `UnderReplicatedPartitions`, `UnderMinIsrPartitionCount`, `OfflinePartitionsCount`, `ActiveControllerCount`, 요청 지연, 컨슈머 `records-lag-max` |

## 관련 문서

- [Kafka의 역사](./01-history.md)
- [Kafka 개요와 기본 사용법](./02-overview.md)
- [Kafka 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [Kafka 장애 대응과 고가용성](./05-failures.md)

## 참고 자료

- [Apache Kafka 4.4 — Broker Configs](https://kafka.apache.org/44/configuration/broker-configs/)
- [Apache Kafka 4.4 — Consumer Configs](https://kafka.apache.org/44/configuration/consumer-configs/)
- [Apache Kafka 4.4 — Producer Configs](https://kafka.apache.org/44/configuration/producer-configs/)
- [Consumer Rebalance Protocol — Apache Kafka 4.4 Docs](https://kafka.apache.org/44/operations/consumer-rebalance-protocol/)
- [Apache Kafka 4.0.0 Release Announcement (KIP-896 등)](https://kafka.apache.org/blog/2025/03/18/apache-kafka-4.0.0-release-announcement/)
- [Apache Kafka 4.3.0 Release Announcement (KIP-1257)](https://kafka.apache.org/blog/2026/05/22/apache-kafka-4.3.0-release-announcement/)
- [Apache Kafka 4.4.0 Release Announcement (share group DLQ)](https://kafka.apache.org/blog/2026/10/22/apache-kafka-4.4.0-release-announcement/)
- [Kafka Consumer Rebalancing: Assignors & KIP-848 — Conduktor](https://www.conduktor.io/glossary/kafka-consumer-rebalancing)
- [Kafka Consumer Poll & Timeout Settings — Conduktor](https://www.conduktor.io/kafka/kafka-consumer-important-settings-poll-and-internal-threads-behavior)
- [Transactional Outbox: Database-Kafka Consistency — Conduktor](https://www.conduktor.io/blog/transactional-outbox-pattern-database-kafka)
