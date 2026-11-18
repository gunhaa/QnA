---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# Kafka 개요와 기본 사용법

## 쉬운 설명

Kafka는 **번호가 매겨진 칸에 기록을 차례로 적어 나가는 두루마리 여러 개**다. 쓰는 사람은 두루마리 끝에 붙이기만 하고, 읽는 사람은 각자 "나는 몇 번 칸까지 읽었다"는 책갈피만 들고 다닌다. 두루마리는 여러 서버에 복사해 두고, 읽은 뒤에도 정해진 기간 동안 지우지 않는다.

## 일반 설명

### 1. 무엇을 해결하나

| 문제 | Kafka의 답 |
|---|---|
| 시스템 N개 사이의 점대점 연동이 폭증 | 모든 생산자는 Kafka에 쓰고, 모든 소비자는 Kafka에서 읽는다 (허브) |
| 생산 속도와 소비 속도가 다름 | 디스크 로그가 버퍼 역할. 소비자는 자기 속도로 당겨 간다(pull) |
| 같은 데이터를 여러 목적(실시간·배치·검색 색인)으로 소비 | 소비해도 지우지 않음. 소비자 그룹마다 독립된 offset |
| 장애 후 재처리·새 소비자 추가 | offset을 되돌려 **재생(replay)** |
| 초당 수백만 건 처리 | 순차 쓰기, 배치·압축, 페이지 캐시, zero-copy 전송 |

### 2. 구성 요소

| 요소 | 역할 |
|---|---|
| **브로커** | 파티션 로그를 저장하고 클라이언트 요청을 처리하는 서버 |
| **컨트롤러** | KRaft 쿼럼(보통 3 또는 5대). 메타데이터 관리, 파티션 리더 선출 |
| **토픽** | 같은 종류 이벤트의 논리적 이름 |
| **파티션** | 토픽을 나눈 단위. **순서 보장·병렬성·복제의 단위** |
| **레코드** | 키, 값, 타임스탬프, 헤더. 파티션 안에서 **offset**(단조 증가 번호)을 받는다 |
| **프로듀서** | 레코드를 파티션 리더에 쓴다 |
| **컨슈머 / 컨슈머 그룹** | 그룹 안에서 파티션을 나눠 맡아 읽는다. 진행 위치를 `__consumer_offsets`에 커밋 |
| **공유 그룹** (4.2+) | 파티션을 독점하지 않고 레코드 단위로 나눠 받는 큐 방식 소비 |
| Connect / Streams | 외부 시스템 연동 프레임워크 / 라이브러리 형태의 스트림 처리 |

### 3. 저장 구조

```
토픽 orders (파티션 3, 복제 계수 3)
  orders-0/  ← 브로커 디스크의 디렉터리 하나
    00000000000000000000.log        세그먼트(기본 1 GiB): 레코드 배치를 순서대로 추가
    00000000000000000000.index      offset → 파일 위치 (희소 인덱스)
    00000000000000000000.timeindex  타임스탬프 → offset
    00000000000004817362.log        활성 세그먼트 (쓰기는 여기에만)
```

- 쓰기는 **활성 세그먼트 끝에 추가**만 한다. 수정·중간 삭제가 없다.
- 오래된 데이터는 **세그먼트 단위로** 지운다.
  - `cleanup.policy=delete`: 보존 기간(기본 `log.retention.hours=168`, 7일) 또는 크기 초과 시 삭제
  - `cleanup.policy=compact`: 키마다 **마지막 값만 남긴다** (상태 스냅샷, 변경 로그용)
- Kafka는 기본적으로 `fsync`를 하지 않고 OS 페이지 캐시에 맡긴다. 내구성은 **복제**로 확보한다.
- **티어드 스토리지**(3.9+): 오래된 세그먼트를 S3 같은 원격 저장소로 옮기고 로컬에는 최근 데이터만 둔다.

파티션이 디스크에서 실제로 어떻게 생겼고 쓰기 경로에서 무슨 일이 일어나는지는 [Kafka 파티션과 디스크·병렬성](../../../inquiry/distributed-systems/0007-kafka-partition-disk-and-parallelism.md), offset 조회와 희소 인덱스는 [Kafka를 DB처럼 쓸 수 있나](../../../inquiry/distributed-systems/0006-kafka-as-a-database-offset-lookup.md)에 자세히 있다.

### 4. 쓰기 경로 (프로듀서)

1. **파티션 선택**: 키가 있으면 `hash(key) % 파티션 수` → **같은 키는 같은 파티션 = 순서 보장**. 키가 없으면 sticky 파티셔너가 한 파티션에 배치를 채운 뒤 넘어간다.
2. **배치**: 파티션별로 `batch.size`(기본 16 KiB)가 차거나 `linger.ms`(4.0부터 기본 5 ms)가 지나면 전송. 압축도 배치 단위.
3. **리더에 기록**: 리더가 로그에 추가하고, 팔로워들이 리더에서 **당겨 와(fetch)** 복제한다.
4. **응답**: `acks`에 따라 응답 시점이 다르다. 기본 `acks=all` = 현재 ISR 전원이 받은 뒤.
5. **재시도와 중복 방지**: 기본 `enable.idempotence=true` → 브로커가 (프로듀서 ID, 시퀀스)로 재시도 중복을 버린다.

### 5. 복제 요약

| 개념 | 뜻 |
|---|---|
| 복제 계수(RF) | 파티션 사본 수. 운영 표준은 3 |
| 리더 / 팔로워 | 쓰기는 리더만 받는다. 팔로워는 리더에서 pull해 자기 디스크에 쓴다 |
| **ISR** | 리더를 `replica.lag.time.max.ms`(기본 30초) 안에 따라잡은 레플리카 집합 |
| **High Watermark** | ISR 전원이 가진 offset. 컨슈머는 여기까지만 읽는다 → "읽었는데 사라진" 레코드 방지 |
| `min.insync.replicas` | `acks=all` 쓰기에 필요한 최소 ISR 수. **브로커 기본값 1** |
| 리더 에포크 | 리더가 바뀔 때마다 증가. 옛 리더의 쓰기·잘못된 로그 절단을 막는다 |
| Fetch from follower (KIP-392) | 같은 랙(AZ)의 팔로워에서 읽어 AZ 간 전송비를 줄임 |

리더-팔로워 동작, HW 계산, `acks`와 `min.insync.replicas`의 상호작용은 [Kafka 복제 모델과 컨트롤 플레인](../../../inquiry/distributed-systems/0008-kafka-replication-model-and-control-plane.md)에 자세히 있다. 설정 조합의 선택은 [트레이드오프 — 내구성 설정](./03-tradeoffs.md#31-내구성-설정--잃어도-되는-범위로-고른다)에 있다.

### 6. 컨트롤 플레인 (KRaft)

- 컨트롤러 3대 또는 5대가 Raft로 **`__cluster_metadata`(단일 파티션 로그)** 를 복제한다. 그중 1대가 active.
- 토픽 생성, 파티션 재할당, ACL, 리더 변경이 모두 이 로그의 레코드다. 브로커는 이 로그를 구독해 메타데이터 캐시를 갱신한다.
- 배포 형태: 컨트롤러와 브로커를 **다른 노드로 분리**(운영 권장)하거나, 한 프로세스가 두 역할을 겸하는 combined 모드(소규모·개발).
- 4.0부터 ZooKeeper는 없다. 3.9부터 컨트롤러를 실행 중에 추가·제거할 수 있다(동적 쿼럼, KIP-853).

### 7. 읽기 경로 (컨슈머)

- 컨슈머는 `poll()`로 브로커에 fetch 요청을 보내는 **롱 폴링** 방식이다. 브로커가 밀어 주지 않는다 → [Kafka 소비 방식](../../../inquiry/distributed-systems/0001-kafka-consumer-mechanism.md).
- **컨슈머 그룹**: 한 파티션은 그룹 안에서 **컨슈머 1개만** 맡는다. 컨슈머 수 > 파티션 수면 남는 컨슈머는 논다.
- 그룹 구성이 바뀌면 **리밸런스**로 파티션을 다시 나눈다.

| 프로토콜 | 설정 | 동작 |
|---|---|---|
| **classic** (4.x 클라이언트 기본) | `group.protocol=classic` | 그룹 리더 컨슈머가 클라이언트 측에서 할당 계산. 기본 eager 방식은 전원이 파티션을 내려놓고 다시 받음 (cooperative 할당자로 완화 가능) |
| **consumer** (KIP-848, 4.0 GA) | `group.protocol=consumer` | **브로커의 그룹 코디네이터가 할당 계산**(기본 uniform 할당자). 바뀌는 파티션만 점진적으로 이동, 그룹 전체 정지 없음. 클라이언트 측 커스텀 할당자는 무시됨 |

- **offset 커밋**: 기본 `enable.auto.commit=true`(5초마다). 처리 완료 후 수동 커밋하면 at-least-once.
- **새 그룹의 시작 위치**: `auto.offset.reset` 기본 `latest` → 그룹이 생기기 전 데이터는 안 읽는다.

### 8. 공유 그룹 (Queues for Kafka, KIP-932)

| | 컨슈머 그룹 | 공유 그룹 |
|---|---|---|
| 할당 단위 | 파티션 (독점) | 레코드 (여러 컨슈머가 한 파티션을 함께 소비) |
| 병렬성 상한 | 파티션 수 | 파티션 수와 무관 |
| 확인 | offset 커밋 | 레코드별 accept / release / reject, 획득 잠금 타임아웃 |
| 순서 | 파티션 내 보장 | 보장 안 함 |
| 상태 | 4.0 얼리 액세스 → 4.1 프리뷰 → **4.2 프로덕션 준비** → 4.4 DLQ 추가 | |

작업 큐처럼 "순서보다 처리량, 실패 레코드만 다시"가 필요할 때 쓴다. RabbitMQ와의 비교는 [트레이드오프 — 대안 비교](./03-tradeoffs.md#2-대안-비교).

### 9. 전달 보장

| 보장 | 구성 |
|---|---|
| at-most-once | 처리 전에 offset 커밋 |
| **at-least-once** (실무 기본) | 처리 후 커밋 + 멱등 프로듀서. 소비 측은 멱등 처리 필요 |
| exactly-once | **Kafka → Kafka** 구간에서 트랜잭션(`transactional.id`) + 컨슈머 `isolation.level=read_committed`(기본은 `read_uncommitted`). Streams는 `processing.guarantee=exactly_once_v2` |

외부 DB에 쓰는 소비자까지 exactly-once가 되지는 않는다. 이 오해는 [자주 겪는 문제 — 전달 보장](./04-pitfalls.md#4-전달-보장과-중복)에서 다룬다. DB 변경과 이벤트 발행을 묶는 방법은 [Spring Kafka Consumer vs Transactional Outbox](../../../inquiry/distributed-systems/0005-spring-kafka-consumer-vs-outbox.md).

### 10. 기본 사용법

```bash
# 토픽 생성 (파티션 6, 복제 3, 최소 ISR 2)
kafka-topics.sh --bootstrap-server b1:9092 --create --topic orders \
  --partitions 6 --replication-factor 3 --config min.insync.replicas=2

# 쓰기 / 읽기
kafka-console-producer.sh --bootstrap-server b1:9092 --topic orders \
  --property parse.key=true --property key.separator=:
kafka-console-consumer.sh --bootstrap-server b1:9092 --topic orders \
  --group order-svc --from-beginning

# 그룹 지연(lag) 확인
kafka-consumer-groups.sh --bootstrap-server b1:9092 --describe --group order-svc
```

```java
// 프로듀서: 키 = 주문 ID → 같은 주문의 이벤트는 순서 보장
producer.send(new ProducerRecord<>("orders", orderId, json), (meta, ex) -> {
    if (ex != null) log.error("send failed", ex);   // delivery.timeout.ms(기본 2분) 뒤 실패
});

// 컨슈머: 처리 후 수동 커밋 (at-least-once)
props.put("group.protocol", "consumer");          // KIP-848
props.put("enable.auto.commit", "false");
consumer.subscribe(List.of("orders"));
while (running) {
    for (var r : consumer.poll(Duration.ofMillis(500))) handle(r);
    consumer.commitSync();
}
```

### 11. 대표 사용 예

| 용도 | 예 |
|---|---|
| 이벤트 기반 마이크로서비스 | 주문 생성 → 결제·재고·알림이 각자 구독 |
| 로그·지표·트레이스 수집 | 에이전트/OTel Collector → Kafka → 저장소 ([OTel Collector와 Kafka](../../../inquiry/distributed-systems/0004-otel-collector-kafka-push-pull.md)) |
| CDC | Debezium(Connect)으로 DB binlog/WAL을 토픽으로 |
| 스트림 처리 | Kafka Streams, Flink로 집계·조인 |
| 데이터 레이크 적재 | 토픽 → Iceberg/S3 |

## 관련 문서

- [Kafka의 역사](./01-history.md)
- [Kafka 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [Kafka 운영 시 자주 겪는 문제와 해결 방법](./04-pitfalls.md)
- [Kafka 장애 대응과 고가용성](./05-failures.md)
- [Kafka(카프카)가 뭐예요?](../../../inquiry/distributed-systems/0002-kafka-overview.md)

## 참고 자료

- [Apache Kafka Documentation — Design](https://kafka.apache.org/documentation/#design)
- [Apache Kafka 4.4 — Broker Configs](https://kafka.apache.org/44/configuration/broker-configs/)
- [Apache Kafka 4.4 — Producer Configs](https://kafka.apache.org/44/configuration/producer-configs/)
- [Apache Kafka 4.4 — Consumer Configs](https://kafka.apache.org/44/configuration/consumer-configs/)
- [Consumer Rebalance Protocol — Apache Kafka 4.4 Docs](https://kafka.apache.org/44/operations/consumer-rebalance-protocol/)
- [KIP-848: The Next Generation of the Consumer Rebalance Protocol — Confluent Blog](https://www.confluent.io/blog/kip-848-consumer-rebalance-protocol/)
- [Optimize consumer rebalancing on Amazon MSK with next-generation protocol — AWS Big Data Blog](https://aws.amazon.com/blogs/big-data/optimize-consumer-rebalancing-on-amazon-msk-with-next-generation-protocol/)
- [Apache Kafka 4.2.0 Release Announcement (share groups)](https://kafka.apache.org/blog/2026/02/17/apache-kafka-4.2.0-release-announcement/)
- [Apache Kafka 4.4.0 Release Announcement](https://kafka.apache.org/blog/2026/10/22/apache-kafka-4.4.0-release-announcement/)
- [Apache Kafka 3.9.0 Release Announcement (tiered storage, KIP-853)](https://kafka.apache.org/blog/2024/11/06/apache-kafka-3.9.0-release-announcement/)
- [Rebalance listeners (classic vs consumer protocol) — Spring for Apache Kafka](https://docs.spring.io/spring-kafka/reference/4.0/kafka/receiving-messages/rebalance-listeners.html)
