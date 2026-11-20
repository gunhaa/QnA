---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# Kafka 장애 대응과 고가용성

## 쉬운 설명

Kafka는 같은 기록을 서버 세 대에 나눠 들고 있어서 한 대가 쓰러지면 다른 서버가 바로 그 기록의 담당이 된다. 장애가 나는 곳은 **"아직 다 베껴 적지 못한 마지막 몇 줄"** 과 **"누가 담당인지 정하는 위원회(컨트롤러)가 과반을 잃을 때"**, 그리고 **사람이 지운 것을 모든 사본이 똑같이 지울 때**다.

## 일반 설명

이 문서는 **Kafka 자체의 장애**를 다룬다. 사람이 설정·사용을 잘못한 문제는 [흔한 함정](./04-pitfalls.md)에 있다. 리더·팔로워·ISR·HW 개념은 [개요 — 복제 요약](./02-overview.md#5-복제-요약)과 [Kafka 복제 모델](../../../inquiry/distributed-systems/0008-kafka-replication-model-and-control-plane.md)에 있다.

### 1. 장애 유형 한눈에 보기

| 장애 | 자동 복구 | 데이터 유실 | 가용성 영향 |
|---|---|---|---|
| 브로커 1대 다운 (RF 3, min ISR 2) | ✓ 컨트롤러가 ISR에서 새 리더 선출 | 없음 (`acks=all`) | 해당 파티션 리더 전환 동안 짧은 쓰기·읽기 재시도 |
| 브로커 2대 다운 (RF 3, min ISR 2) | 리더는 선출되지만 ISR 1 | 없음 | **`acks=all` 쓰기 거부**(`NotEnoughReplicas`), 읽기는 가능 |
| 파티션의 모든 ISR 다운 | ✗ (기본 unclean 선출 끔) | 없음 | 파티션 **오프라인** — 대기 또는 unclean 선출 |
| unclean 리더 선출 강제 | ✓ ISR 밖 레플리카가 리더 | **있음** — 뒤처진 만큼 | 즉시 복구 |
| 컨트롤러 1대 다운 (쿼럼 3) | ✓ 다른 컨트롤러가 active | 없음 | 메타데이터 변경 잠깐 지연 |
| 컨트롤러 과반 다운 | ✗ | 없음 | 기존 리더로 읽기·쓰기는 계속되지만 **리더 선출·ISR 변경·토픽 생성 등 메타데이터 변경 불가** → 추가 브로커 장애 시 복구 불가 |
| 디스크 1개 고장 (JBOD) | ✓ 그 디렉터리의 파티션만 다른 브로커로 리더 이전 | 없음 (복제본 존재 시) | 해당 파티션만 |
| AZ 1개 다운 (3 AZ, 랙 인지 배치) | ✓ | 없음 | 위 "브로커 1대"와 같음 |
| 리전 다운 | ✗ (클러스터는 보통 리전 안) | 리전 간 복제 지연만큼 | DR 절차 필요 |
| 운영 실수 (토픽 삭제, 보존 단축) | ✗ | **있음** — 모든 레플리카가 같이 지움 | 백업·미러에서 복원 |

### 2. 브로커 장애와 리더 선출

1. 브로커가 컨트롤러에 하트비트를 못 보내면 컨트롤러가 펜싱(fence)하고, 그 브로커가 리더였던 파티션마다 **ISR 안에서** 새 리더를 고른다.
2. 리더 에포크가 증가하고, 클라이언트는 메타데이터를 갱신해 새 리더로 재시도한다(프로듀서는 `delivery.timeout.ms` 기본 2분 안에서 재시도).
3. 팔로워는 새 리더의 에포크 기준으로 자기 로그 끝을 맞춘다. HW를 넘지 않은(커밋 안 된) 레코드는 잘려 나갈 수 있지만, 그 레코드는 `acks=all` 성공 응답을 받지 못한 것이다.
4. 죽었던 브로커가 돌아오면 팔로워로 따라잡아 ISR에 복귀하고, 이후 선호 리더(preferred leader) 재선출로 리더 분포가 원래대로 돌아간다.

**복구 시간을 늘리는 요인**: 그 브로커가 리더였던 파티션 수, 비정상 종료 후 로그 복구(세그먼트·인덱스 검사), 따라잡아야 할 데이터 양. 브로커 하나에 파티션이 많을수록 장애 영향 범위와 복구 시간이 커진다.

### 3. 마지막 레플리카 문제와 unclean 선출

| 상황 | 기본 동작 | 선택지 |
|---|---|---|
| ISR이 리더 1대로 줄어든 뒤 그 리더도 죽음 | 파티션 오프라인. ISR 멤버가 돌아올 때까지 대기 | ① 대기 (일관성) ② `unclean.leader.election.enable=true`로 뒤처진 레플리카를 리더로 (가용성, **유실**) |
| ISR 멤버가 비정상 종료로 로그 끝 일부를 잃음 | 클래식 ISR에서는 그 레플리카가 리더가 되면 커밋된 데이터가 사라질 수 있음 | **ELR(KIP-966)**: `min.insync.replicas` 이상 복제된 데이터를 가진 것이 확실한 레플리카만 리더 후보로 유지. **4.1부터 신규 클러스터 기본 활성** |

- ELR을 켜면 브로커 수준 `min.insync.replicas` 설정이 클러스터 수준으로 옮겨지므로 업그레이드 노트를 확인한다.
- unclean 선출은 CAP에서 가용성 쪽으로 넘어가는 스위치다 → [Kafka 복제 모델 — CAP](../../../inquiry/distributed-systems/0008-kafka-replication-model-and-control-plane.md).

### 4. 컨트롤러(KRaft) 장애

| 쿼럼 크기 | 견디는 컨트롤러 장애 |
|---|---|
| 3 | 1대 |
| 5 | 2대 |

- 컨트롤러는 Raft 과반으로 메타데이터 로그를 커밋한다. 과반을 잃으면 **새 리더 선출이 불가능**하다. 데이터 경로는 당장 돌아가지만 그 상태에서 브로커가 하나 더 죽으면 그 파티션들은 복구되지 않는다 → 컨트롤러 과반 상실은 즉시 대응 대상이다.
- 컨트롤러를 브로커와 같은 노드에 두는 combined 모드는 브로커 장애가 컨트롤러 장애로 번진다. 운영은 분리 모드, 컨트롤러는 **서로 다른 AZ**에.
- 컨트롤러 교체: 3.9+ 동적 쿼럼(KIP-853)이면 실행 중에 추가·제거한다. 정적 쿼럼(`controller.quorum.voters`)을 동적으로 전환하는 것은 3.9에서 지원되지 않았다.
- 상태 확인: `kafka-metadata-quorum.sh describe --status`(리더, 에포크, 고정 지연).

### 5. 네트워크 분리

| 상황 | 동작 |
|---|---|
| 리더 브로커가 컨트롤러와 끊김 | 컨트롤러가 그 브로커를 펜싱하고 다른 ISR을 리더로 선출. 옛 리더는 팔로워들이 더 이상 fetch하지 않아 `acks=all` 쓰기를 커밋할 수 없다 → **스플릿 브레인으로 양쪽에 커밋되지 않음** |
| 옛 리더가 `acks=1` 쓰기를 받음 | 리더 전환 후 그 쓰기는 잘려 **유실** (클라이언트는 성공 응답을 받았음) |
| 팔로워가 리더와 끊김 | `replica.lag.time.max.ms`(30초) 뒤 ISR에서 제외. ISR < min ISR이면 쓰기 거부 |
| 컨트롤러 소수 쪽 고립 | 과반 쪽이 새 active 컨트롤러 선출. 소수 쪽은 메타데이터를 커밋할 수 없음 |

`acks=all` + `min.insync.replicas≥2`가 분리 상황에서 유실을 막는 실제 장치다.

### 6. 리전 장애와 DR

Kafka 클러스터는 지연 때문에 보통 리전 안(여러 AZ)에 두고, 리전 장애는 **다른 리전 클러스터로의 비동기 복제**로 대응한다.

| 방식 | 동작 | 주의 |
|---|---|---|
| **MirrorMaker 2** (2.4+, Apache) | Connect 기반. 토픽·설정·ACL·컨슈머 offset을 원격 클러스터로 복제 | offset이 클러스터마다 다르다 → offset sync 토픽으로 **변환**해야 하고 정확하지 않을 수 있음. 장애 조치 때 일부 재처리 각오 |
| Confluent Cluster Linking, MSK Replicator 등 | 벤더 기능 | 라이선스·매니지드 종속 |
| 클러스터 미러링 (KIP-1279, 제안) | 브로커가 원본 클러스터에서 직접 fetch, **offset 그대로 보존** | 2026년 11월 기준 릴리스 포함 여부 미확인 — 제안 단계로 보고 의존하지 않는다 |
| 리전 3개에 걸친 단일 클러스터 (stretch) | 동기 복제로 RPO 0 | 리전 간 지연이 쓰기 지연에 직접 더해짐. 리전 2개면 과반을 못 만든다 |

| 전략 | RPO | RTO |
|---|---|---|
| 단일 리전 3 AZ | AZ 장애 0 / 리전 장애 = 전부 | AZ: 초~분 / 리전: 재구축 |
| + MM2 액티브-패시브 | 복제 지연(보통 초 단위) | 분 단위 (클라이언트 전환·offset 변환) |
| + MM2 액티브-액티브 | 복제 지연 | 낮음. 대신 토픽 이름 접두사·순환 복제 방지 설계 필요 |

DR 일반 전략(Pilot Light, Warm Standby 등)은 [고가용성 구성 방식](../../../inquiry/distributed-systems/0009-high-availability-replication-vs-cluster-and-patterns.md)에 있다.

### 7. 데이터 유실 시나리오 정리

| 원인 | 유실 범위 | 막는 법 |
|---|---|---|
| `acks=0/1` + 리더 장애 | 미복제 레코드 | `acks=all` |
| `min.insync.replicas=1` + ISR 축소 후 리더 장애 | 리더만 가진 레코드 | min ISR 2 |
| unclean 선출 | 새 리더가 뒤처진 만큼 | 끔(기본), ELR |
| 같은 랙·AZ 동시 전원 장애 (fsync 안 함) | 페이지 캐시에만 있던 레코드 | 랙 인지 배치, 필요하면 토픽 `flush.messages` (처리량 대가) |
| 보존 기간 경과 | 소비 못 한 레코드 | lag 알림 |
| 소프트웨어 결함 | 버그별 | 패치 추적. 예: 4.3.2가 리더 선출 후 크기 기반 보존이 로컬·원격 계층에서 보존 기간 내 데이터를 지우던 문제(KAFKA-20732)와 브로커 재시작 시 타임 인덱스 절단으로 시간 기반 보존이 데이터를 지우던 문제(KAFKA-20979)를 수정 |
| 운영 실수 (토픽 삭제) | 토픽 전체 | 삭제 권한 ACL 분리, `delete.topic.enable` 정책, 원격 미러를 백업 겸용 |

### 8. 백업과 복구

- Kafka에는 DB 같은 스냅샷·PITR 기능이 **없다.** 복제는 실수를 그대로 복제한다.
- 실무 방법
  - **다른 클러스터로 미러**(MM2) — 삭제 이벤트까지 따라오지 않도록 토픽 단위 설정 확인
  - **오브젝트 스토리지로 싱크**(S3 Sink Connector 등) 후 필요 시 다시 생산 — offset은 바뀐다
  - 티어드 스토리지는 **백업이 아니다**: 원격 세그먼트도 토픽 삭제·보존 정책을 따른다
- 원본이 DB이고 Kafka가 파생 로그라면(Outbox/CDC), 재발행이 가장 확실한 복구 경로다.
- 컨트롤러 메타데이터는 `__cluster_metadata` 스냅샷으로 관리된다. 컨트롤러 전원 상실에 대비해 디스크 보존과 재구성 절차를 문서화한다.

### 9. 운영 점검 항목

| 지표·확인 | 정상 | 이상 시 |
|---|---|---|
| `ActiveControllerCount` (클러스터 합) | 정확히 1 | 0 → 쿼럼 과반 상실 확인 |
| `OfflinePartitionsCount` | 0 | ISR 전멸 파티션. 브로커 복구 또는 unclean 판단 |
| `UnderMinIsrPartitionCount` | 0 | 해당 파티션 `acks=all` 쓰기 거부 중 |
| `UnderReplicatedPartitions` | 0 | 브로커 장애·디스크·네트워크 지연 |
| 컨슈머 lag (시간 기준) | 보존 기간보다 충분히 작음 | 컨슈머 증설, 처리 병목 확인 |
| MM2 복제 지연 | 목표 RPO 이내 | 대역폭·커넥터 태스크 수 |

## 관련 문서

- [Kafka의 역사](./01-history.md)
- [Kafka 개요와 기본 사용법](./02-overview.md)
- [Kafka 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [Kafka 운영 시 흔한 함정과 해결 방법](./04-pitfalls.md)
- [Redis 장애 대응과 고가용성](../../database/0002-redis/05-failure-modes.md)

## 참고 자료

- [Apache Kafka Documentation — Replication](https://kafka.apache.org/documentation/#replication)
- [Eligible Leader Replicas — Apache Kafka 4.3 Docs](https://kafka.apache.org/43/operations/eligible-leader-replicas/)
- [KIP-966: Eligible Leader Replicas — Apache Wiki](https://cwiki.apache.org/confluence/spaces/KAFKA/pages/263426970/KIP-966+Eligible+Leader+Replicas)
- [Kafka KIP-966 - Fixing the Last Replica Standing issue — Jack Vanlightly](https://jack-vanlightly.com/blog/2023/8/17/kafka-kip-966-fixing-the-last-replica-standing-issue)
- [Eligible Leader Replicas (ELR) in Kafka 4.1 — SoftwareMill](https://softwaremill.com/eligible-leader-replicas-elr-in-kafka-4-1-what-you-need-to-know/)
- [Apache Kafka 3.9.0 Release Announcement (KIP-853)](https://kafka.apache.org/blog/2024/11/06/apache-kafka-3.9.0-release-announcement/)
- [Apache Kafka 4.3.2 Release Announcement (data loss fixes)](https://kafka.apache.org/blog/2026/10/23/apache-kafka-4.3.2-release-announcement/)
- [Apache Kafka 4.4 — Broker Configs](https://kafka.apache.org/44/configuration/broker-configs/)
- [Data liberation: Apache Kafka native cluster mirroring (KIP-1279) — Red Hat Developer](https://developers.redhat.com/articles/2026/09/22/data-liberation-apache-kafka-native-cluster-mirroring)
- [Disaster recovery options in the cloud — AWS Whitepaper](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud)
