---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# MySQL 장애 대응과 고가용성

## 쉬운 설명

장부(MySQL)를 한 권만 두면 불이 났을 때 끝이다. 그래서 **원본 장부에 적을 때마다 복사본에도 똑같이 적게(복제)** 하고, 원본이 타면 복사본을 새 원본으로 쓴다(장애 조치). 복사본에 적는 게 원본보다 살짝 늦으면 그 사이 적은 건 잃을 수 있으니, 중요한 장부는 "복사본에도 적었다는 확인을 받고 나서" 완료라고 말한다(반동기·그룹 복제). 누가 실수로 페이지를 찢으면 복사본도 같이 찢기니 **따로 사진(백업)** 을 찍어 둔다.

## 일반 설명

### 1. 장애 유형

| 장애 | 영향 | 대응 |
|---|---|---|
| mysqld 크래시·OS 재부팅 | 일시 중단 | **크래시 복구**(redo 재적용) 후 자동 재기동 |
| 디스크·호스트 영구 손상 | 해당 노드 데이터 상실 | replica 승격, 백업 복원 |
| **source(primary) 장애** | 쓰기 불가 | 자동/수동 장애 조치 |
| 네트워크 분리 | 스플릿 브레인(두 primary) 위험 | 과반수 기반 클러스터, fencing |
| 복제 지연·중단 | replica 읽기에 옛 데이터, 장애 조치 시 유실 증가 | 병렬 복제, 원인 수정 후 재구축 |
| 운영 실수(`DROP TABLE`, 조건 빠진 `DELETE`) | **복제되어 replica도 같이 삭제** | 백업 + binlog로 **시점 복구(PITR)**, 지연 복제 |
| AZ·리전 장애 | 전체 중단 | Multi-AZ, ClusterSet, 리전 간 복제 |

### 2. 단일 서버의 내구성: 크래시 후 무엇이 남나

커밋 응답 후 서버가 죽어도 데이터가 남으려면 redo log와 binlog가 디스크까지 fsync돼야 한다.

| 설정 | 의미 | 권장 |
|---|---|---|
| `innodb_flush_log_at_trx_commit=1` | 커밋마다 redo log fsync | **1** (기본). 2/0은 OS/서버 크래시 시 최대 ~1초 유실 |
| `sync_binlog=1` | 커밋마다 binlog fsync | **1** (기본). 아니면 binlog와 데이터가 어긋나 복제·PITR을 신뢰할 수 없게 됨 |
| `innodb_doublewrite=ON` | 찢어진 페이지 방지 | 기본 ON 유지 |

이 "**double 1**" 설정이 기본값이며, 성능 때문에 끄는 경우 유실 범위를 받아들인 것이다.

### 3. 복제 방식

```
[Source] ─ binlog ─▶ (IO 스레드) relay log ─▶ (SQL/applier 스레드) [Replica]
```

| 방식 | 커밋 응답 시점 | 장애 조치 시 유실 |
|---|---|---|
| **비동기** (기본) | source 커밋 즉시 | 아직 전송 안 된 트랜잭션 유실 가능 |
| **반동기(semi-sync)** | 최소 N개 replica가 **relay log에 받았다고 ACK** 한 뒤 | `rpl_semi_sync_source_wait_point=AFTER_SYNC`(기본, "lossless")면 ACK 받은 것만 클라이언트에 보이므로 유실 거의 없음. 단, ACK 타임아웃(`rpl_semi_sync_source_timeout`, 기본 10초) 시 **비동기로 자동 강등** |
| **Group Replication** | 그룹 **과반수가 합의(Paxos 계열)** 한 뒤 | 과반이 살아 있으면 유실 없음 |

공통 필수 설정:
- **GTID** (`gtid_mode=ON`, `enforce_gtid_consistency=ON`): 트랜잭션마다 전역 ID → 장애 조치 때 "어디까지 받았나"를 파일·위치 계산 없이 판단.
- `binlog_format=ROW`(8.x 기본), 모든 테이블에 **PK** — PK 없으면 행 기반 복제가 replica에서 풀스캔을 반복해 지연 폭발.
- replica는 `super_read_only=ON`: 실수로 replica에 쓰는 것을 막아 데이터 불일치 예방.

### 4. 복제 지연과 복제 중단

| 문제 | 원인 | 해결 |
|---|---|---|
| `Seconds_Behind_Source` 증가 | 대량 트랜잭션, replica 성능 부족, 적용 직렬화 | **병렬 복제**(`replica_parallel_workers`, 8.0.27+ 기본 4, `replica_preserve_commit_order=ON`), 대량 작업 청크 분할, PK 없는 테이블 제거 |
| 지연 측정이 부정확 | `Seconds_Behind_Source`는 SQL 스레드 기준이라 IO 지연을 못 봄 | heartbeat 테이블(pt-heartbeat) 또는 `performance_schema.replication_applier_status_by_worker` 타임스탬프 |
| 방금 쓴 데이터가 replica에서 안 보임 | 비동기 지연 | 쓰기 직후 조회는 source로 라우팅, 또는 `WAIT_FOR_EXECUTED_GTID_SET(gtid, timeout)` |
| `Replica_SQL_Running: No` | 중복 키·누락 행 등 데이터 불일치 | 원인 확인 후 수정. 무작정 skip(빈 트랜잭션 주입) 금지 — 불일치가 쌓인다. 불확실하면 replica **재구축**(Clone 플러그인으로 빠르게) |
| 불일치 의심 | 과거 skip, replica 직접 쓰기 | `pt-table-checksum` / `pt-table-sync`로 검증 |

### 5. 고가용성 구성 선택지

구성별 커밋 지연 비용·제약과 언제 고르나는 [트레이드오프 — 주요 선택지](./03-tradeoffs.md#3-주요-선택지)에서 다룬다. 여기서는 장애 조치 동작만 정리한다.

| 구성 | 장애 조치 | 유실 | 특징 |
|---|---|---|---|
| 비동기 복제 + 수동 전환 | 사람이 | 가능 | 가장 단순. 작은 서비스 |
| **InnoDB ReplicaSet** | 수동(MySQL Shell 명령 한 줄) | 가능 | 비동기 복제를 Shell·Router로 관리 |
| **InnoDB Cluster** | **자동** | 과반 생존 시 없음 | Group Replication(3대 이상, 단일 primary 권장) + **MySQL Router**(연결 자동 재라우팅) + MySQL Shell(AdminAPI) |
| **InnoDB ClusterSet** (8.0.27+) | 리전 간 계획 전환 / 비상 승격 | 리전 간은 비동기 → 비상 시 유실 가능 | 주 InnoDB Cluster + 다른 리전의 복제 클러스터. **DR용**, 리전 안의 HA는 각 Cluster가 담당 |
| Orchestrator + 반동기 + ProxySQL | 자동 | 반동기면 거의 없음 | GitHub·Percona에서 널리 쓰던 조합. 2026년 ProxySQL이 Orchestrator 유지보수를 넘겨받음 |
| MHA | 자동 | 가능 | 레거시. 신규 비추천 |
| Galera (Percona XtraDB Cluster, MariaDB Galera) | 자동 | 없음(동기 인증) | 멀티 마스터 쓰기 가능하나 충돌·대형 트랜잭션에 약함 |

**InnoDB Cluster 구성 예 (MySQL Shell)**

```js
// mysqlsh
dba.configureInstance('admin@db1:3306')        // db2, db3도 동일
var c = dba.createCluster('prod')               // db1에서
c.addInstance('admin@db2:3306', {recoveryMethod: 'clone'})
c.addInstance('admin@db3:3306', {recoveryMethod: 'clone'})
c.status()
```

```bash
mysqlrouter --bootstrap admin@db1:3306 --directory /opt/router
# 앱은 Router로 접속: 6446(읽기·쓰기 → primary), 6447(읽기 전용 → secondary)
```

- 노드는 **3대 이상 홀수**, 서로 다른 AZ에. 2대면 하나가 죽었을 때 과반이 안 돼 쓰기가 멈춘다.
- 과반을 잃은 소수 쪽 노드는 쓰기를 거부해 스플릿 브레인을 막는다.

### 6. 매니지드 서비스의 HA

| 서비스 | 방식 | 장애 조치 시간(공식 문서 기준 대략) |
|---|---|---|
| RDS for MySQL **Multi-AZ 인스턴스** | 다른 AZ에 동기 스탠바이(읽기 불가), DNS 전환 | 보통 1~2분 |
| RDS **Multi-AZ DB 클러스터** | writer 1 + 읽기 가능한 reader 2 (반동기) | 보통 수십 초 이내 |
| **Aurora MySQL** | 3개 AZ에 6벌 복제되는 공유 스토리지, 레플리카 승격 | 보통 30초 안팎 |
| Aurora Global Database | 리전 간 스토리지 복제 | 리전 장애 시 보조 리전 승격 |
| Cloud SQL / Azure Database for MySQL | 리전 내 HA 스탠바이 | 수십 초~분 |

매니지드여도 장애 조치 중 연결은 끊긴다 → 7장 클라이언트 대응 필요. Aurora·RDS는 **RDS Proxy**로 연결을 유지해 체감 중단을 줄일 수 있다.

### 7. 애플리케이션 측 장애 대응

| 항목 | 권장 |
|---|---|
| 접속 주소 | 서버 IP 하드코딩 금지. Router/ProxySQL/클러스터 엔드포인트 사용 |
| DNS 캐시 | JVM `networkaddress.cache.ttl`을 짧게(예: 5~30초). 기본값이 길면 장애 조치 후에도 옛 서버로 접속 |
| 커넥션 풀 | `maxLifetime`으로 연결을 주기적으로 교체, `connectionTimeout` 짧게 |
| 재시도 | 연결 실패·데드락·장애 조치 중 에러는 재시도. 단 **멱등한 작업만**, 백오프 포함 |
| 읽기/쓰기 분리 | 쓰기 직후 읽기는 primary로 (복제 지연) |
| 장애 시 기능 축소 | 읽기 전용 모드, 캐시 응답으로 버티기 |

### 8. 백업과 시점 복구(PITR)

복제는 **실수까지 복제**하므로 백업을 대신하지 못한다.

| 방식 | 도구 | 특징 |
|---|---|---|
| 논리 백업 | `mysqldump`, **MySQL Shell `util.dumpInstance()` / `loadDump()`**, mydumper | 이식성 좋음, 버전 업그레이드·이관에 유리. 대용량은 느림 |
| 물리 백업 | **Percona XtraBackup**, MySQL Enterprise Backup | 빠름, 운영 중 핫 백업. 같은 메이저 버전으로 복원 |
| 스냅샷 | EBS/디스크 스냅샷, RDS 자동 백업 | 간편. 일관성 위해 flush 또는 매니지드 기능 사용 |
| Clone 플러그인 | `CLONE INSTANCE FROM ...` | 백업보다는 replica 신규 구축용 |

**PITR 절차 (예: 14:03에 실수로 `DELETE`)**

```bash
# 1) 직전 전체 백업 복원 (예: 새벽 03:00 백업)
# 2) 백업 시점 이후 binlog를 사고 직전까지 재생
mysqlbinlog --start-position=<백업 시점 위치> \
            --stop-datetime="2026-11-18 14:02:59" \
            binlog.000123 binlog.000124 | mysql -uroot -p
# GTID 환경이면 --exclude-gtids 로 사고 트랜잭션만 건너뛸 수도 있다
```

- binlog 보관 기간(`binlog_expire_logs_seconds`)은 **백업 주기보다 길게**.
- **지연 복제**(`SOURCE_DELAY=3600`) replica를 하나 두면 1시간 내 실수는 그 replica에서 바로 꺼내 올 수 있다.
- 백업은 **정기 복원 훈련**으로 검증해야 백업이다.

### 9. RTO/RPO 정리

| 구성 | RPO(유실) | RTO(복구 시간) |
|---|---|---|
| 단일 서버 + 일일 백업 | 최대 하루 (binlog 있으면 PITR로 축소) | 복원 시간(수십 분~수 시간) |
| 비동기 복제 + 수동 전환 | 복제 지연만큼 | 사람이 대응하는 시간 |
| 반동기 + 자동 장애 조치 | 거의 0 | 수십 초~수 분 |
| InnoDB Cluster | 0 (과반 생존 시) | 수 초~수십 초 |
| ClusterSet / 리전 간 복제 | 리전 간 지연만큼 | 승격 절차 시간 |

### 10. 장애 훈련

| 시나리오 | 방법 |
|---|---|
| primary 다운 | `kill -9 mysqld`, 호스트 정지 |
| 계획된 전환 | InnoDB Cluster `c.setPrimaryInstance('db2:3306')`, RDS "장애 조치와 함께 재부팅" |
| 복제 중단 | replica에서 고의 충돌 후 재구축 절차 연습 |
| PITR | 스테이징에 백업 + binlog로 특정 시각 복원 |
| 확인할 것 | 앱 에러율 회복 시간, 유실된 트랜잭션, 연결 재수립 시간, 알람 동작 |

## 관련 문서

- [MySQL의 역사](./01-history.md)
- [MySQL 개요와 기본 사용법](./02-overview.md)
- [MySQL 트레이드오프 — 무엇을 얻고 무엇을 포기했나, 언제 고르나](./03-tradeoffs.md)
- [MySQL 운영 시 흔한 함정과 해결 방법](./04-pitfalls.md)
- [고가용성: Replica와 Cluster는 무엇을 정의하나, 그리고 다른 방법들](../../../inquiry/distributed-systems/0009-high-availability-replication-vs-cluster-and-patterns.md)

## 참고 자료

- [MySQL 8.4 Reference Manual — Replication](https://dev.mysql.com/doc/refman/8.4/en/replication.html)
- [MySQL 8.4 Reference Manual — Semisynchronous Replication](https://dev.mysql.com/doc/refman/8.4/en/replication-semisync.html)
- [MySQL Shell — InnoDB Cluster](https://dev.mysql.com/doc/mysql-shell/8.4/en/mysql-innodb-cluster.html)
- [MySQL Shell — InnoDB ClusterSet](https://dev.mysql.com/doc/mysql-shell/8.4/en/innodb-clusterset.html)
- [MySQL Reference Manual — Asynchronous connection failover](https://dev.mysql.com/doc/refman/26.7/en/replication-asynchronous-connection-failover.html)
- [What Is MySQL InnoDB ClusterSet — OneUptime](https://oneuptime.com/blog/post/2026-03-31-mysql-innodb-clusterset/markdown)
- [How to Handle Failover in MySQL InnoDB Cluster — OneUptime](https://oneuptime.com/blog/post/2026-03-31-mysql-how-to-handle-failover-in-mysql-innodb-cluster/markdown)
- [How to Use MySQL InnoDB ReplicaSet — OneUptime](https://oneuptime.com/blog/post/2026-03-31-mysql-innodb-replicaset/markdown)
- [How to Troubleshoot MySQL Replication Lag — OneUptime](https://oneuptime.com/blog/post/2026-03-31-mysql-replication-lag-troubleshoot/markdown)
- [How to Fix Replication Lag in MySQL — OneUptime](https://oneuptime.com/blog/post/2026-03-31-mysql-how-to-fix-replication-lag-in-mysql/markdown)
- [Orchestrator's Next Chapter — Percona](https://www.percona.com/blog/orchestrators-next-chapter-what-it-means-for-percona-customers/)
- [Miguel Araújo on the Operational Layer of MySQL HA — ODBMS](https://www.odbms.org/2026/08/from-replication-to-resilience-miguel-araujo-on-building-the-operational-layer-of-mysql-high-availability/)
- [Amazon RDS Multi-AZ deployments](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html)
- [Percona XtraBackup Documentation](https://docs.percona.com/percona-xtrabackup/)
