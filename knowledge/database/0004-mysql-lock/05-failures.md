---
type: knowledge
created: 2026-11-19
author: agent
model: claude-opus-5-5
---

# MySQL 락 장애 유형과 대응

## 쉬운 설명

팻말(락)은 **서버 머릿속(메모리)** 에만 있다. 서버가 쓰러지면 팻말 대부분이 사라지고, 다른 서버로 바꿔 타면(장애 조치) **새 서버에는 팻말이 하나도 없다.** 반대로 너무 많은 사람이 한 자리에 몰리면 **누가 누구를 기다리는지 세는 일** 자체가 서버를 멈추게 한다. 락이 깨지는 곳은 이 세 군데다: 몰릴 때, 쓰러질 때, 여러 대로 나눌 때.

## 일반 설명

> 원인이 **MySQL·인프라 쪽**인 상황을 다룬다. 사람이 잘못 쓰는 패턴은 [자주 겪는 문제](./04-pitfalls.md). 서버·복제 장애 전반과 백업/DR은 [MySQL 장애 대응과 고가용성](../0001-mysql/05-failures.md).

### 1. 락 관련 장애 유형

| 유형 | 증상 | 메커니즘 |
|---|---|---|
| **락 대기 연쇄** | 응답 지연 → 커넥션 풀 고갈 → 전체 장애 | 트랜잭션 하나가 락을 쥔 채 멈춤 → 뒤 요청이 `innodb_lock_wait_timeout`까지 대기 → 대기 중인 커넥션이 쌓임 |
| **MDL 대기 연쇄** | 특정 테이블의 SELECT까지 전부 `Waiting for table metadata lock` | DDL이 배타 MDL 대기 → 뒤 요청이 모두 DDL 뒤에 줄 섬. `data_locks`에는 안 보임 |
| **데드락 폭주** | `Innodb_deadlocks` 급증, 1213 오류 다발 | 트래픽 증가로 같은 gap·행에 대한 경합이 임계점을 넘음. 재시도가 다시 경합을 만든다 |
| **핫 로우 + 데드락 감지 과부하** | CPU 100%, 처리량 급락 | 한 행에 대기자가 수백~수천 → 락 요청마다 대기 그래프 탐색. 대기 목록 200개를 넘으면 사이클이 없어도 **데드락으로 간주해 롤백** |
| **큰 트랜잭션 KILL 후에도 안 풀림** | `KILL` 했는데 락이 계속 유지 | KILL은 **롤백**을 시작할 뿐. 롤백은 실행한 시간만큼(또는 더) 걸리고 그동안 락 유지 |
| **긴 트랜잭션** | 락 대기 + `History list length` 증가 → 읽기까지 느려짐 | 락과 MVCC 스냅샷을 동시에 붙잡음 → [MySQL 자주 겪는 문제 — 긴 트랜잭션](../0001-mysql/04-pitfalls.md#3-긴-트랜잭션과-history-list) |

### 2. 크래시와 재시작

- **InnoDB 락은 메모리에만 있다.** redo log는 데이터 변경을 기록할 뿐 락 테이블을 기록하지 않는다.
- 재시작 시 커밋되지 않은 트랜잭션은 **백그라운드에서 롤백**된다. 서버는 그 전에 접속을 받기 시작하므로, 큰 트랜잭션이 롤백되는 동안 그 행을 건드리는 쓰기가 기다릴 수 있다.
- **XA PREPARED 트랜잭션은 크래시를 넘어 살아남는다.**
  - 수정한 행의 record lock과 **MDL**은 복구 후에도 유지된다. gap lock과 읽기 락은 사라진다.
  - 그래서 재시작 뒤 같은 행을 건드리는 작업이 **영원히** 대기하거나, 원래 막혀야 할 INSERT가 통과할 수 있다.
  - 대응: `XA RECOVER`로 목록을 보고, 트랜잭션 관리자의 결정에 따라 `XA COMMIT 'xid'` / `XA ROLLBACK 'xid'`로 정리한다. `SHOW ENGINE INNODB STATUS`에 `ACTIVE (PREPARED)`로 보인다.

### 3. 장애 조치(failover)

| 상황 | 결과 | 대응 |
|---|---|---|
| primary 장애 → replica 승격 | **락은 복제되지 않는다.** 새 primary에는 아무 락도 없다 | 진행 중이던 트랜잭션은 모두 실패로 처리하고 재시도. 재시도는 멱등해야 한다 |
| `GET_LOCK` 이름 락으로 배치 중복 방지 | 장애 조치 순간 락이 사라짐 → 두 번째 배치가 새 primary에서 락을 얻음. 원래 배치가 아직 살아 있으면 **동시 실행** | 이름 락은 "효율용"으로만. 정합성은 상태 컬럼·유니크 제약·fencing token으로 |
| 반동기 복제의 커밋 대기 중 장애 | 커밋 성공 여부를 클라이언트가 모름 | 멱등 키로 재시도 결과 확인 |

### 4. 복제에서의 락

- **replica의 applier도 락을 건다.** replica에서 사용자가 `FOR UPDATE`나 긴 트랜잭션을 실행하면 applier가 그 행에서 기다리고 **복제 지연**이 생긴다. replica는 읽기 전용(`super_read_only=ON`)으로 두고 잠금 읽기를 하지 않는다.
- **멀티스레드 applier**(`replica_parallel_workers`)에서는 작업자끼리 락 대기·데드락이 날 수 있다. `replica_transaction_retries`(기본 10) 만큼 자동 재시도하고, 그래도 실패하면 SQL 스레드가 멈춘다(`Replica_SQL_Running: No`).
- `replica_preserve_commit_order=ON`(8.0.27+ 기본)이면 커밋 순서를 지키느라 작업자가 서로 기다리는데, 이 대기와 행 락 대기가 엇갈리면 InnoDB가 감지해 한쪽을 재시도시킨다.

### 5. Group Replication multi-primary

| 한계 | 결과 |
|---|---|
| **락이 노드 간에 공유되지 않는다** | 노드 A의 `FOR UPDATE`가 노드 B의 같은 행 수정을 막지 못한다. 둘 다 진행하다가 커밋 시 인증(certification)에서 한쪽이 실패 |
| **인증이 gap lock을 고려하지 않는다** | gap lock 정보는 InnoDB 밖으로 나가지 않는다 → RR의 팬텀 방지가 노드를 넘어서는 보장되지 않는다 |
| `SELECT ... FOR UPDATE`가 데드락을 낼 수 있다 | 매뉴얼에 명시된 제약. 잠금이 다른 노드에 전달되지 않아 기대한 상호 배제가 이뤄지지 않는다 |

대응: **single-primary 모드**를 기본으로 쓴다. multi-primary가 꼭 필요하면 `group_replication_enforce_update_everywhere_checks=ON`, 같은 행을 쓰는 작업을 한 노드로 라우팅, 커밋 실패를 재시도.

### 6. 탐지

| 지표 | 경보 기준 예 |
|---|---|
| `Innodb_row_lock_current_waits` | 평소 대비 급증 |
| `Innodb_row_lock_time_avg` | 수백 ms 이상 |
| `Innodb_deadlocks` (증가율) | 분당 수십 건 이상 |
| `information_schema.innodb_trx`에서 `trx_started`가 N초 이상 | 30초~수 분 |
| `performance_schema.metadata_locks`의 `PENDING` | 1건 이상 수 초 지속 |
| `Threads_running` | 코어 수의 수 배 이상 → 대기 연쇄 신호 |

### 7. 장애 대응 런북

1. **막는 쪽 찾기**: `SELECT * FROM sys.innodb_lock_waits\G` (행 락) / `SELECT * FROM sys.schema_table_lock_waits\G` (MDL)
2. **막는 쪽 크기 확인**: `SELECT trx_id, trx_started, trx_rows_modified, trx_mysql_thread_id FROM information_schema.innodb_trx ORDER BY trx_started;`
   - `trx_rows_modified`가 크면 KILL 후 롤백이 오래 걸린다. 롤백 시간과 기다리는 시간을 비교한다.
3. **차단**: 신규 유입부터 멈춘다(기능 플래그, 해당 배치 중단, 진행 중인 DDL 취소).
4. **KILL**: `KILL <blocking_pid>;` (MDL이면 DDL 세션 또는 그 앞의 긴 트랜잭션)
5. **XA 확인**: 재시작 후라면 `XA RECOVER`.
6. **사후**: 에러 로그의 데드락 기록, slow log, `events_statements_history`로 원인 쿼리 확인 → [자주 겪는 문제](./04-pitfalls.md)의 패턴과 대조.

## 관련 문서

- [MySQL 락의 역사](./01-history.md)
- [MySQL 락 개요와 동작 방식](./02-overview.md)
- [MySQL 락 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [MySQL 락: 자주 겪는 문제와 해결 방법](./04-pitfalls.md)
- [MySQL 장애 대응과 고가용성](../0001-mysql/05-failures.md)
- [Java 락 장애 대응과 다중 인스턴스 환경](../../languages/0002-java-lock/05-failures.md)
- [고가용성: 복제 vs 클러스터](../../../inquiry/distributed-systems/0009-high-availability-replication-vs-cluster-and-patterns.md)

## 참고 자료

- [MySQL 8.4 Reference Manual — Deadlock Detection](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlock-detection.html)
- [MySQL 8.0 Reference Manual — Deadlock Detection (200 transactions / 1,000,000 locks)](https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlock-detection.html)
- [Bug #49047 InnoDB deadlock detection is CPU intensive with many locks on a single row](https://bugs.mysql.com/bug.php?id=49047)
- [Bug #57978 PREPARED transactions forget locks on server restart](https://bugs.mysql.com/bug.php?id=57978)
- [How to Deal with XA Transactions Recovery — Percona](https://www.percona.com/blog/how-to-deal-with-xa-transactions-recovery/)
- [MySQL XA Transactions — Percona](https://www.percona.com/blog/mysql-xa-transactions/)
- [MySQL 9.7 Reference Manual — Group Replication Limitations](https://dev.mysql.com/doc/refman/9.7/en/group-replication-limitations.html)
- [MySQL 8.4 Reference Manual — Replication Replica Options](https://dev.mysql.com/doc/refman/8.4/en/replication-options-replica.html)
- [Severalnines — How to Fix a Lock Wait Timeout Exceeded Error in MySQL](https://severalnines.com/?p=11158)
