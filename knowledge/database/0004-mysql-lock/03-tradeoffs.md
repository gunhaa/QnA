---
type: knowledge
created: 2026-11-19
author: agent
model: claude-opus-5-5
---

# MySQL 락 트레이드오프와 선택 기준

## 쉬운 설명

InnoDB는 "**의심스러우면 넓게 잠근다**"를 골랐다. 빈칸까지 잠가서 유령 행(팬텀)이 끼어드는 일은 확실히 막지만, 그 대가로 **아무도 안 쓰는 자리 때문에 줄을 서고 서로 엉키는(데드락)** 일이 늘었다. 무엇을 잠글지 정하는 기준도 조건이 아니라 **실제로 훑은 범위**라서, 색인이 없으면 테이블 전체가 잠긴다.

## 일반 설명

> 동작 원리는 [개요](./02-overview.md), 고른 뒤 실수는 [흔한 함정](./04-pitfalls.md), 장애는 [장애 유형](./05-failure-modes.md). 이 문서는 "왜 이렇게 만들었고, 대가는 무엇이고, 언제 무엇을 고르나"만 다룬다. MySQL 전체의 트레이드오프는 [MySQL 트레이드오프](../0001-mysql/03-tradeoffs.md).

### 1. 핵심 설계 선택: 얻은 것과 포기한 것

| 설계 선택 | 얻은 것 | 포기한 것 |
|---|---|---|
| **락을 행이 아니라 인덱스 레코드에 건다** | 범위(gap)를 표현할 수 있다. 인덱스 구조 그대로 락 위치가 정해져 구현이 단순하다 | 인덱스를 못 타면 **스캔한 모든 행**이 잠긴다. 같은 쿼리도 실행 계획이 바뀌면 락 범위가 바뀐다 |
| **기본 격리 RR + next-key lock** | 잠금 읽기에서 팬텀 방지. statement 기반 복제에서 primary·replica 결과 일치 | 존재하지 않는 범위까지 잠가 **INSERT 대기·데드락 증가** |
| **읽기는 MVCC, 쓰기만 락** | 일반 SELECT는 절대 막히지 않는다 | 같은 트랜잭션에서 스냅샷 값과 최신 값이 다를 수 있다. RR에서 **갱신 분실을 자동 감지하지 않는다**(PostgreSQL RR은 직렬화 오류로 막음) |
| **락 확대(escalation) 없음**, 페이지당 비트맵으로 저장 | 수백만 행을 잠가도 테이블 락으로 커지지 않는다 → 다른 행 작업은 계속된다 | 대량 잠금 시 락 메모리·대기열 스캔 비용이 그대로 남는다 |
| **즉시 데드락 감지 + 작은 쪽 롤백** | 데드락이 타임아웃(50초)까지 가지 않고 즉시 풀린다 | 한 행에 대기자가 수백 명이면 감지 자체가 CPU를 잡아먹는다. 대기 목록 200개 / 락 100만 개를 넘으면 사이클 확인 없이 데드락으로 간주 |
| **타임아웃은 문장만 롤백** | 애플리케이션이 그 문장만 다시 시도할 수 있다 | 오류를 무시하면 **반쯤 실행된 트랜잭션**이 커밋된다 |
| **MDL을 서버 계층에 따로 둠** | DDL이 어떤 엔진에서도 안전하다 | 행 락과 별개라 `data_locks`에 안 보인다. DDL 하나가 MDL 대기열을 막으면 **뒤의 모든 SELECT까지** 줄 선다 |
| **2단계 락**(커밋까지 보유) | 직렬화 가능성의 기본 조건 | 트랜잭션이 길어지면 그만큼 락도 오래 쥔다 |

### 2. 수치로 보는 비용

| 항목 | 수치 | 의미 |
|---|---|---|
| `innodb_lock_wait_timeout` 기본값 | **50초** | 웹 요청 기준으로는 너무 길다. API 타임아웃보다 길면 클라이언트는 포기했는데 DB는 계속 기다린다 |
| `lock_wait_timeout`(MDL) 기본값 | **31,536,000초(1년)** | DDL이 MDL을 사실상 무한히 기다리며 뒤 쿼리를 막는다 → 마이그레이션 세션에서는 짧게 |
| 데드락 감지 한계 | 대기 목록 **200 트랜잭션** / **100만 락** | 이를 넘으면 실제 사이클이 없어도 요청한 트랜잭션을 롤백 |
| 핫 로우 처리량 | 한 행의 갱신은 직렬화. 커밋당 1ms(fsync 포함)면 그 행은 **초당 약 1,000건이 상한** | 재고·카운터 한 행에 트래픽이 몰리면 서버 사양과 무관하게 막힌다 |
| 인덱스 없는 `UPDATE ... WHERE d = ?` | 100만 행 테이블이면 **100만 개 next-key lock** | 한 문장이 테이블 전체 쓰기를 막는다 |

### 3. 대안 비교: 동시 수정 제어 방법

| 방법 | 동작 | 장점 | 단점 | 고를 때 |
|---|---|---|---|---|
| **원자적 UPDATE** `SET stock = stock - 1 WHERE id=? AND stock > 0` | 한 문장이 읽기+쓰기 | 락 보유 시간 최소, 왕복 1회 | 복잡한 판단 로직은 못 넣음 | 카운터·재고 차감. **가장 먼저 검토** |
| **비관적 락** `SELECT ... FOR UPDATE` | 읽을 때 X 락 | 확실함, 코드 직관적 | 락 보유 시간 = 트랜잭션 길이, 데드락 가능 | 충돌이 잦고 읽은 값으로 여러 행을 고칠 때 |
| **낙관적 락** `version` 컬럼 (`UPDATE ... WHERE id=? AND version=?`) | 쓸 때만 확인, 실패하면 재시도 | 락 대기 없음 | 충돌이 잦으면 재시도 폭증 | 충돌 드문 사용자 편집, JPA `@Version` |
| **`NOWAIT`** | 잠겨 있으면 즉시 실패 | 대기 없음, 빠른 실패 | 실패 처리 필요 | 좌석 선점처럼 "이미 누가 잡았으면 바로 알림" |
| **`SKIP LOCKED`** | 잠긴 행 건너뛰기 | 작업자 여러 명이 겹치지 않게 분배 | 결과가 비결정적. 일관된 뷰가 필요하면 부적합 | DB 기반 작업 큐, Outbox 폴링 |
| **`GET_LOCK()`** 이름 락 | 행과 무관한 이름에 세션 락 | 테이블 없이 상호 배제 | **세션 단위**, 장애 조치 시 사라짐, Group Replication에서 노드 간 공유 안 됨 | 단일 primary에서 배치 중복 실행 방지 |
| **READ COMMITTED로 낮추기** | gap lock 대부분 제거 | 데드락·INSERT 대기 크게 감소 | 팬텀 허용, binlog ROW 필수 | 쓰기 경합이 큰 OLTP |
| **분산 락 (Redis·ZooKeeper·etcd)** | DB 밖에서 상호 배제 | DB 부하 분리, 여러 저장소에 걸친 작업 | 정합성은 보장 못 함(fencing 필요) | DB 하나로 묶이지 않는 작업 → [Java 락 — 분산 락](../../java/0002-java-lock/05-failure-modes.md#6-분산-락의-장애-시나리오) |

PostgreSQL과의 모델 차이(범위 잠금 vs SSI·직렬화 오류)는 [MySQL과 PostgreSQL의 락 처리 차이](../../../inquiry/database/0005-mysql-postgresql-lock-handling-differences.md), [PostgreSQL은 gap lock 없이 어떻게 감지하나](../../../inquiry/database/0006-postgresql-phantom-detection-without-gap-lock.md).

### 4. 주요 선택지 (설정)

| 설정 | 기본값 | 선택지 | 기준 |
|---|---|---|---|
| `transaction_isolation` | `REPEATABLE-READ` | `READ-COMMITTED` | 데드락·락 대기가 문제면 RC. 대규모 서비스에서 흔한 선택. 단 `binlog_format=ROW`(8.0 기본) 필수 |
| `innodb_lock_wait_timeout` | 50 | 세션별로 1~10초 | 요청 타임아웃보다 짧게. 배치 세션만 길게 |
| `innodb_rollback_on_timeout` | OFF | ON | 타임아웃 시 트랜잭션 전체 롤백이 안전하면 ON (재시작 필요) |
| `innodb_deadlock_detect` | ON | OFF | 수천 동시 대기가 한 행에 몰려 감지 CPU가 병목일 때만 OFF + 짧은 `innodb_lock_wait_timeout` |
| `innodb_print_all_deadlocks` | OFF | ON | 운영에서는 켜 두는 편이 낫다. `SHOW ENGINE INNODB STATUS`는 마지막 1건만 보여 준다 |
| `innodb_autoinc_lock_mode` | 2 (8.0+) | 1, 0 | 2는 AUTO-INC 테이블 락 없음 → 대량 INSERT 동시성 최고. statement binlog를 쓸 때만 1 |
| `lock_wait_timeout`(MDL) | 1년 | 마이그레이션 세션에서 3~10초 | DDL이 MDL 대기로 서비스를 막지 않게 |

고가용성 구성에서의 락 차이:

| 구성 | 락 범위 | 주의 |
|---|---|---|
| 비동기·반동기 복제 (primary 1) | primary 안에서만 | replica 읽기는 락과 무관. replica에서 `FOR UPDATE`는 의미 없음 |
| Group Replication **single-primary** | primary 안에서만 | 권장 구성 |
| Group Replication **multi-primary** | **노드 간 락 공유 없음**. 커밋 시 인증(certification)으로 충돌 검사 | gap lock을 인증하지 않음, `FOR UPDATE`가 다른 노드를 막지 못함 → [장애 유형](./05-failure-modes.md) |

### 5. 쓰지 말아야 할 때

- **`FOR UPDATE`로 "없으면 INSERT"를 구현하지 말 것.** RR에서 gap lock끼리는 호환되므로 두 트랜잭션이 함께 통과한 뒤 INSERT에서 데드락이 난다. 유니크 키 + `INSERT ... ON DUPLICATE KEY UPDATE`나 `INSERT IGNORE` 후 확인으로 바꾼다.
- **트랜잭션 안에서 외부 호출(HTTP, 메시지 발행, 사용자 입력 대기)이 있으면 비관적 락을 쓰지 말 것.** 락 보유 시간이 외부 지연에 묶인다. 낙관적 락이나 상태 컬럼(예: `PENDING → DONE`)으로 바꾼다.
- **DB 락으로 여러 서비스·여러 DB에 걸친 작업을 직렬화하지 말 것.** 사가(saga)·Outbox·멱등 키로 설계한다.
- **`LOCK TABLES`는 InnoDB에서 거의 쓸 일이 없다.** 행 락과 트랜잭션으로 충분하고, 암묵적 커밋 등 함정이 많다.
- **SERIALIZABLE을 정합성 해결책으로 켜지 말 것.** 모든 SELECT가 공유 next-key lock을 걸어 데드락이 크게 늘어난다. 필요한 문장에만 `FOR SHARE`/`FOR UPDATE`를 쓴다.

### 6. 선택 체크리스트

1. 한 문장(원자적 UPDATE, `ON DUPLICATE KEY UPDATE`)으로 끝낼 수 있나? → 그게 최선
2. 충돌이 드문가? → 낙관적 락(version)
3. 충돌이 잦고 읽은 값으로 판단해야 하나? → `FOR UPDATE`, 트랜잭션은 짧게
4. 기다리지 말고 실패/건너뛰어야 하나? → `NOWAIT` / `SKIP LOCKED`
5. 잠금 쿼리의 WHERE가 **인덱스를 타는가**? `EXPLAIN`으로 확인했나?
6. 여러 행을 잠그면 **항상 같은 순서**(PK 오름차순)인가?
7. 데드락(1213)·타임아웃(1205)을 **재시도**하는 코드가 있나?
8. RR의 gap lock이 꼭 필요한가? 아니면 RC로 내릴 수 있나?
9. DDL 배포 때 `lock_wait_timeout`을 짧게 주는가?

## 관련 문서

- [MySQL 락의 역사](./01-history.md)
- [MySQL 락 개요와 동작 방식](./02-overview.md)
- [MySQL 락: 흔한 함정과 해결 방법](./04-pitfalls.md)
- [MySQL 락 장애 유형과 대응](./05-failure-modes.md)
- [MySQL 트레이드오프](../0001-mysql/03-tradeoffs.md)
- [MySQL과 PostgreSQL의 락 처리 차이](../../../inquiry/database/0005-mysql-postgresql-lock-handling-differences.md)
- [PostgreSQL RR의 MVCC vs MySQL](../../../inquiry/database/0007-postgresql-repeatable-read-mvcc-vs-mysql.md)
- [Java 락 트레이드오프](../../java/0002-java-lock/03-tradeoffs.md)

## 참고 자료

- [MySQL 8.4 Reference Manual — InnoDB Locking](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html)
- [MySQL 8.4 Reference Manual — Deadlock Detection](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlock-detection.html)
- [MySQL 8.4 Reference Manual — Transaction Isolation Levels](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)
- [MySQL 8.4 Reference Manual — Group Replication Limitations](https://dev.mysql.com/doc/refman/8.4/en/group-replication-limitations.html)
- [MySQL 8.0.1: Using SKIP LOCKED and NOWAIT to handle hot rows](https://dev.mysql.com/blog-archive/mysql-8-0-1-using-skip-locked-and-nowait-to-handle-hot-rows/)
- [Bug #49047 InnoDB deadlock detection is CPU intensive with many locks on a single row](https://bugs.mysql.com/bug.php?id=49047)
- [MySQL Concurrency — Working with Lock Conflicts (reading notes)](https://dfhawthorne.github.io/home/reading-notes/mysql-concurrency/Ch08-Working-with-Lock-Conflicts.html)
- [InnoDB Gap Locks — Percona](https://www.percona.com/blog/innodbs-gap-locks/)
