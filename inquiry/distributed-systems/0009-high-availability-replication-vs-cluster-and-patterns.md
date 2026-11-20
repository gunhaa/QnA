---
type: inquiry
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# 고가용성: Replica와 Cluster는 무엇을 정의하나, 그리고 다른 방법들

## 쉬운 설명

- **Replica(복제)** 는 "**같은 공책을 한 권 더 베껴 두는 것**"이다. 원본을 잃어도 내용은 남는다. 하지만 베껴 두기만 해서는 누가 대신 수업에 들고 갈지 정해지지 않는다.
- **Cluster(클러스터)** 는 "**여러 학생이 한 팀이 되어, 팀장이 빠지면 누가 대신할지까지 정해 둔 것**"이다. 보통 그 팀은 공책 복사본(복제)도 나눠 들고 있다.

그러니 둘은 같은 층위의 선택지가 아니다. **복제는 "데이터를 여러 벌 두는 방법"**, **클러스터는 "여러 노드를 하나의 시스템처럼 묶어 운영하는 방법"** 이고, 클러스터 안에 복제가 들어 있는 경우가 많다.

## 일반 설명

### 1. 두 용어의 정확한 뜻

| | Replication (복제) | Cluster (클러스터) |
|---|---|---|
| 정의 | 같은 데이터를 **여러 노드에 복사해 유지**하는 메커니즘 | 여러 노드를 **하나의 서비스처럼** 동작하도록 묶은 구성 |
| 답하는 질문 | "데이터가 몇 벌, 어디에, 얼마나 최신으로 있나?" | "누가 요청을 받고, 누가 장애를 판정하고, 누가 대신하나?" |
| 핵심 요소 | 리더/팔로워 구조, 동기·비동기, 복제 지연 | **멤버십**, 장애 감지, 리더 선출·장애 조치, 요청 라우팅, (선택) 샤딩 |
| 자체로 HA인가 | **아니다.** 복사본만 있을 뿐 자동 전환은 별도 | 장애 조치를 포함하도록 설계되면 HA |
| 주 목적 | 내구성(데이터 보존), 읽기 분산 | 가용성(서비스 지속), 확장 |

즉 고가용성은 보통 다음 **네 가지 요소의 조합**으로 이뤄진다.

```
① 중복(Redundancy)       데이터·프로세스를 여러 벌 → 복제, 공유 스토리지, 상태 없는 다중 인스턴스
② 장애 감지(Detection)    누가 죽었나 → 헬스 체크, 하트비트, gossip
③ 장애 조치(Failover)     누가 대신하나 → 수동, 외부 관리자, 내장 합의(Raft/Paxos)
④ 라우팅(Routing)         클라이언트를 새 주인에게 → VIP, DNS, 프록시, 스마트 클라이언트
```

"Replica 구성"은 대개 ①만 갖춘 상태, "Cluster 구성"은 ①~④를 한 제품이 묶어 제공하는 상태를 가리키는 경우가 많다.

### 2. 제품마다 이름이 뜻하는 것이 다르다

같은 단어가 제품마다 다른 범위를 뜻해서 헷갈린다.

| 제품의 용어 | 실제로 하는 일 | 샤딩 | 자동 장애 조치 |
|---|---|---|---|
| Redis **Replication** | 마스터 → 레플리카 비동기 복제 | ✗ | ✗ (Sentinel 필요) |
| Redis **Sentinel** | 복제 + 외부 감시자가 장애 조치 | ✗ | ✓ |
| Redis **Cluster** | **샤딩(16384 슬롯) + 샤드별 복제 + 내장 장애 조치** | ✓ | ✓ |
| MySQL **Replication** | binlog 비동기/반동기 복제 | ✗ | ✗ (Orchestrator 등 필요) |
| MySQL **InnoDB Cluster** | Group Replication(합의) + Router | **✗** | ✓ |
| MongoDB **Replica Set** | 복제 + 내장 선출(Raft 계열) — 이름은 replica지만 사실상 HA 클러스터 | ✗ | ✓ |
| MongoDB **Sharded Cluster** | Replica Set 여러 개를 샤드로 | ✓ | ✓ |
| Kafka | 파티션별 복제(ISR) + 컨트롤러(KRaft) | ✓ (파티션) | ✓ |
| Kubernetes **Cluster** | 컨테이너를 돌리는 노드 묶음 (데이터 복제와 무관) | — | 파드 재스케줄링 |

→ **"cluster = 샤딩"도, "replica = HA"도 아니다.** 문서를 볼 때 위 네 요소 중 무엇을 제공하는지로 판단한다.

### 3. 복제의 세부 방식

**리더 구조**

| 방식 | 쓰기 받는 노드 | 예 | 특징 |
|---|---|---|---|
| **단일 리더** (primary-replica) | 1개 | MySQL, PostgreSQL, Redis | 단순, 충돌 없음. 리더 장애 시 전환 필요 |
| **다중 리더** (multi-primary) | 여러 개 | Galera, MySQL GR multi-primary, Redis Enterprise Active-Active(CRDT), DynamoDB Global Tables | 지역별 쓰기 가능. **충돌 해결**이 핵심 난제 |
| **리더 없음** (leaderless, Dynamo 방식) | 아무 노드 | Cassandra, ScyllaDB, DynamoDB 내부 | N벌 중 W개 쓰기·R개 읽기 성공이면 OK. `R + W > N`이면 최신 값 겹침 보장 |

**동기화 강도**

| 방식 | 커밋 응답 시점 | 장애 시 유실 | 지연 |
|---|---|---|---|
| 비동기 | 리더 로컬 기록 직후 | 가능 | 최소 |
| 반동기 | 최소 1개 복제본이 **받은** 뒤 | 거의 없음 | 왕복 1회 |
| 동기 | 모든(또는 지정된) 복제본이 **적용한** 뒤 | 없음 | 가장 느린 노드에 묶임 |
| **합의 기반**(Raft/Paxos) | **과반수**가 기록한 뒤 | 과반 생존 시 없음 | 왕복 1회, 소수 노드 지연에 덜 민감 |

### 4. 장애 조치를 "누가" 하나

| 방식 | 예 | 장점 | 위험 |
|---|---|---|---|
| 수동 | 운영자가 승격 명령 | 오판 없음 | 복구 시간이 사람에게 달림 |
| **외부 관리자** | Redis Sentinel, MySQL Orchestrator, PostgreSQL **Patroni**(etcd 사용), Pacemaker | 기존 복제에 HA를 덧붙임 | 관리자 자체도 HA 필요 (3대 이상) |
| **내장 합의** | Raft: etcd, Consul, CockroachDB, TiDB, Kafka KRaft, MongoDB / Paxos 계열: MySQL Group Replication | 감지·선출·복제가 한 프로토콜 | 과반을 잃으면 쓰기 중단 (일관성 우선) |
| 매니지드 | RDS/Aurora, ElastiCache, Cloud SQL | 운영 부담 없음 | 동작 세부를 통제 못 함 |

**스플릿 브레인을 막는 장치**
- **쿼럼(quorum)**: 전체의 과반을 확보한 쪽만 리더가 될 수 있다 → 노드 수는 **3·5 같은 홀수**.
- **펜싱(fencing)**: 옛 리더를 확실히 차단 — 전원 차단(STONITH), 스토리지 접근 차단, 단조 증가 **에포크/텀/펜싱 토큰**으로 옛 리더의 쓰기 거부.
- 고립된 리더의 자발적 쓰기 중단: Redis `min-replicas-to-write`, MySQL GR의 소수 파티션 쓰기 거부.

### 5. 복제·클러스터 외의 고가용성 방법

| 방법 | 원리 | 예 | 언제 |
|---|---|---|---|
| **공유 스토리지 Active-Passive** | 데이터는 공유 디스크 한 벌, 서버만 2대. 장애 시 대기 서버가 디스크를 마운트해 기동 | Pacemaker/Corosync + SAN, Windows Server Failover Cluster | 복제가 어려운 레거시. 스토리지가 단일 장애점 |
| **공유 디스크 Active-Active** | 여러 인스턴스가 같은 디스크를 동시에 사용, 캐시 일관성 프로토콜 | Oracle RAC | 고가 상용 |
| **블록 수준 동기 복제** | DB가 아니라 **디스크 블록**을 다른 위치로 동기 복제 | DRBD, RDS Multi-AZ 인스턴스(스탠바이로 스토리지 동기 복제) | DB 수정 없이 내구성 확보 |
| **분산 쿼럼 스토리지** | 컴퓨트와 스토리지 분리, 스토리지가 여러 벌·쿼럼 쓰기 | Aurora(3 AZ에 6벌, 쓰기 4/6·읽기 3/6), Neon, AlloyDB | 컴퓨트 장애 시 빠른 전환, 스토리지 자가 복구 |
| **이레이저 코딩** | 데이터를 조각 + 패리티로 나눠 분산, 일부 조각 손실 시 복원 | S3, Ceph, HDFS EC | 복제보다 적은 저장 공간으로 내구성 |
| **상태 없는 다중 인스턴스** | 앱 서버를 N+1대 두고 LB가 헬스 체크로 제외 | 웹/API 서버, k8s Deployment | 애플리케이션 계층의 기본 |
| **자가 치유(재시작)** | 죽은 프로세스를 감독자가 재시작·재배치 | systemd `Restart=`, k8s liveness·재스케줄링, Erlang supervisor | 일시적 장애 흡수 (상태는 외부에) |
| **로그 전송 / 스탠바이** | WAL·binlog를 주기적으로 보내 대기 서버에 재생 | PostgreSQL warm standby, 리전 간 비동기 복제 | DR, 비용 절감 |
| **백업·복원** | 스냅샷 + 로그로 재구축 | 일일 백업 + PITR | 가장 싸고 가장 느림. 운영 실수 복구에는 필수 |
| **셀 기반 아키텍처** | 시스템을 독립된 셀로 쪼개 장애 반경(blast radius) 제한 | AWS 내부 서비스, 대형 SaaS | 대규모, 부분 장애 격리 |
| **복원력 패턴** | 타임아웃, 재시도, 서킷 브레이커, 벌크헤드, 폴백 | Resilience4j, 서비스 메시 | 의존성 장애가 전파되지 않게 (HA를 보완) |

### 6. 범위별로 보기: 노드 → AZ → 리전

| 범위 | 대표 방법 |
|---|---|
| 프로세스·노드 | 재시작, 복제 + 자동 장애 조치 |
| 가용 영역(AZ) | 복제본·쿼럼 멤버를 **AZ에 분산** (Multi-AZ) |
| 리전 (DR) | AWS가 정리한 4단계 전략 ↓ |

| DR 전략 | 대기 리전 상태 | RTO/RPO | 비용 |
|---|---|---|---|
| Backup & Restore | 백업만 | 시간 단위 | 최저 |
| Pilot Light | 데이터 복제 + 핵심 자원만 꺼진 채 준비 | 수십 분 | 낮음 |
| Warm Standby | 축소된 전체 환경이 **실행 중** | 분 단위 | 중간 |
| Multi-site Active/Active | 여러 리전이 **동시에 서비스** | 거의 0 | 최고, 운영 복잡도 최고 |

### 7. 선택할 때의 질문

1. **얼마나 잃어도 되나 (RPO)?** 0이면 동기·반동기·합의 기반. 수 초 허용이면 비동기.
2. **얼마나 빨리 돌아와야 하나 (RTO)?** 초 단위면 자동 장애 조치, 시간 단위면 백업 복원도 가능.
3. **분리 상황에서 일관성과 가용성 중 무엇을 택하나?** 쓰기를 멈추더라도 정확해야 하면 쿼럼(CP), 계속 받아야 하면 다중 리더·리더 없음(AP) + 충돌 해결.
4. **한 노드에 데이터가 들어가나?** 안 들어가면 샤딩이 필요 → 이건 HA가 아니라 **확장** 문제이고, 샤드마다 다시 HA가 필요하다.
5. **운영 실수(삭제)는?** 어떤 복제·클러스터도 실수를 그대로 복제한다 → 백업·PITR은 별도로 반드시.

## 관련 문서

- [Redis 장애 대응과 고가용성 (Replication·Sentinel·Cluster)](../../knowledge/database/0002-redis/05-failure-modes.md)
- [MySQL 장애 대응과 고가용성 (반동기·InnoDB Cluster·ClusterSet)](../../knowledge/database/0001-mysql/05-failure-modes.md)
- [Java 애플리케이션 장애 대응과 고가용성 (상태 없는 다중 인스턴스)](../../knowledge/languages/0001-java/05-failure-modes.md)
- [Java 락 장애 대응과 다중 인스턴스 환경 (펜싱 토큰)](../../knowledge/languages/0002-java-lock/05-failure-modes.md)
- [Kafka 장애 대응과 고가용성 (ISR·KRaft·MirrorMaker 2)](../../knowledge/distributed-systems/0001-kafka/05-failure-modes.md)

## 참고 자료

- [High Availability: Concepts and Theory — freeCodeCamp](https://www.freecodecamp.org/news/high-availability-concepts-and-theory/)
- [Patterns to achieve database High Availability — Canonical/Ubuntu](https://ubuntu.com/blog/database-high-availability)
- [Availability patterns — System Design Primer](https://www.mintlify.com/donnemartin/system-design-primer/topics/availability-patterns)
- [Active-Active vs Active-Passive Clusters — ServerMania](https://blog.servermania.com/active-active-vs-active-passive-clusters)
- [Active-active vs active-passive — Aerospike](https://academy.aerospike.com/blog/active-active-vs-active-passive)
- [Pacemaker cluster concepts — Lisenet](https://www.lisenet.com/?p=4318)
- [Disaster recovery options in the cloud — AWS Whitepaper](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud)
- [REL13-BP02 Use defined recovery strategies — AWS Well-Architected](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_disaster_recovery.html)
- [Disaster Recovery (DR) Architecture on AWS, Part I — AWS Architecture Blog](https://aws.amazon.com/blogs/architecture/disaster-recovery-dr-architecture-on-aws-part-i-strategies-for-recovery-in-the-cloud)
- [Amazon Aurora: Design Considerations for High Throughput Cloud-Native Relational Databases (SIGMOD 2017)](https://www.amazon.science/publications/amazon-aurora-design-considerations-for-high-throughput-cloud-native-relational-databases)
- [Designing Data-Intensive Applications, Ch. 5 Replication — Martin Kleppmann](https://dataintensive.net/)
