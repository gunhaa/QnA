---
type: knowledge
created: 2026-11-19
author: agent
model: claude-opus-5-5
---

# MySQL 락: 흔한 함정과 해결 방법

## 쉬운 설명

사람들이 MySQL 락에서 실수하는 방식은 대개 넷이다. **색인 없이 찾아서** 책장 전체에 팻말을 붙이고, **팻말을 붙인 채 전화 통화(외부 호출)를 하러** 나가고, 두 사람이 **서로 반대쪽 끝부터** 팻말을 붙여 엉키고, 엉켜서 쫓겨났는데(데드락 오류) **다시 줄을 서지 않는다**(재시도 없음).

## 일반 설명

> 원인이 **사용자(애플리케이션·운영자)** 인 문제만 다룬다. MySQL 자체의 장애는 [장애 유형](./05-failure-modes.md). MySQL 전반의 운영 문제는 [MySQL 흔한 함정](../0001-mysql/04-pitfalls.md).

### 1. 락 범위를 키우는 실수

| 실수 | 결과 | 해결 |
|---|---|---|
| 잠금 문장의 WHERE 컬럼에 **인덱스 없음** | PK 풀스캔 → 모든 행 + supremum에 next-key lock = 사실상 테이블 락 | 조건 컬럼 인덱스. `EXPLAIN`에서 `type: ALL`이면 위험 |
| 인덱스 컬럼을 **가공**(`WHERE DATE(created_at) = ?`)하거나 **타입 불일치**(문자열 컬럼에 숫자) | 인덱스를 못 타서 위와 같음 | 컬럼은 그대로, 상수 쪽을 가공 |
| 비유니크 인덱스로 등치 잠금 | 찾은 값 앞뒤 gap까지 잠김 | 가능하면 PK/유니크 키로 잠근다 |
| 범위 조건 `FOR UPDATE`에 `LIMIT` 없음 | 범위 끝 + supremum까지 잠겨 끝쪽 INSERT 전부 대기 | 범위를 좁히거나 `LIMIT`, 또는 RC |
| **대량 `UPDATE`/`DELETE` 한 방** | 수백만 행 락 + undo 폭증 + 복제 지연 | PK 범위로 **1천~1만 행씩 나눠 커밋** |
| `INSERT INTO t SELECT ... FROM s` (RR) | 원본 `s`의 읽은 행에 S next-key lock → `s`에 쓰는 작업이 막힘 | RC로 실행하거나 `SELECT`를 먼저 읽어 애플리케이션에서 넣기 |

쿼리별 락 범위 표: [RR에서 next-key lock이 걸리는 경우](../../../inquiry/database/0016-mysql-rr-next-key-lock-cases.md).

### 2. 락을 오래 쥐는 실수

| 실수 | 결과 | 해결 |
|---|---|---|
| `@Transactional` 메서드 안에서 **HTTP 호출·메시지 발행·파일 업로드** | 외부 지연만큼 락 보유 → 대기 연쇄, 커넥션 풀 고갈 | 외부 호출은 트랜잭션 밖으로. 결과 반영만 짧은 트랜잭션으로 |
| 콘솔에서 `START TRANSACTION` 후 방치, `autocommit=0` 세션 | 락과 MVCC 스냅샷이 계속 유지 | 클라이언트 autocommit 확인. `information_schema.innodb_trx`에서 `trx_started`가 오래된 것 감시 |
| 트랜잭션 맨 앞에서 `FOR UPDATE` 후 계산 | 계산 시간만큼 락 보유 | 읽기·계산은 먼저, 잠그고 쓰는 구간은 맨 끝에 짧게 |
| JPA에서 `findById` 후 엔티티 수정 → 커밋 때 UPDATE | 락은 짧지만 **갱신 분실** 가능 | `@Version`(낙관적) 또는 `@Lock(PESSIMISTIC_WRITE)` |

### 3. 데드락을 만드는 패턴

| 패턴 | 왜 데드락이 나나 | 해결 |
|---|---|---|
| **반대 순서로 잠금** (A: 1→2, B: 2→1) | 고전적 순환 대기 | 항상 PK 오름차순으로. 여러 행은 `WHERE id IN (...) ORDER BY id FOR UPDATE` 한 번에 |
| **없는 행에 `FOR UPDATE` 후 INSERT** | 두 트랜잭션이 같은 gap lock을 함께 얻음(gap끼리 호환) → 서로의 insert intention을 막음 | `INSERT ... ON DUPLICATE KEY UPDATE`, 유니크 키 충돌로 처리, 또는 RC |
| **같은 유니크 키로 동시 INSERT** 후 한쪽 롤백 | 중복 키 오류가 난 쪽이 S lock을 잡고 대기 → 3개 이상이면 S↔X 순환 | 중복이 예상되면 `INSERT IGNORE` / `ON DUPLICATE KEY UPDATE` |
| 보조 인덱스 순서와 PK 순서가 다른 두 UPDATE | 보조 인덱스 → PK로 잠그는 순서가 서로 엇갈림 | 잠금 대상을 먼저 PK로 조회해 PK 순으로 잠금 |
| 부모·자식 테이블을 서로 다른 순서로 수정 (외래 키) | FK 검사가 부모 행에 S lock | 항상 부모 → 자식 순서로 |

데드락 분석: `SHOW ENGINE INNODB STATUS\G`의 `LATEST DETECTED DEADLOCK`에서 두 트랜잭션의 `HOLDS THE LOCK(S)` / `WAITING FOR THIS LOCK`을 비교한다. 운영에서는 `innodb_print_all_deadlocks=ON`으로 에러 로그에 모두 남긴다.

### 4. 오류를 잘못 다루는 실수

| 실수 | 결과 | 해결 |
|---|---|---|
| **데드락(1213)을 재시도하지 않음** | 정상 상황인데 사용자 오류로 노출 | 트랜잭션 **전체**를 백오프와 함께 재시도(2~3회). Spring은 `DeadlockLoserDataAccessException` |
| **락 대기 타임아웃(1205) 후 커밋** | 기본값에서는 그 문장만 롤백됨 → 앞 문장만 반영된 **반쪽 트랜잭션**이 커밋 | 1205를 받으면 명시적으로 `ROLLBACK`. 또는 `innodb_rollback_on_timeout=ON` |
| 재시도 대상이 멱등하지 않음 | 재시도로 중복 처리 | 멱등 키, 상태 전이 조건(`WHERE status = 'PENDING'`) |
| `innodb_lock_wait_timeout`을 기본 50초로 방치 | 클라이언트는 이미 타임아웃인데 DB는 계속 대기, 커넥션 점유 | 웹 요청 세션은 수 초로 (`SET SESSION innodb_lock_wait_timeout = 5`) |

### 5. 오해

| 오해 | 실제 |
|---|---|
| "autocommit 상태에서 `SELECT ... FOR UPDATE`로 잠가 두면 된다" | 문장이 끝나면 바로 커밋 → **락이 즉시 풀린다.** 반드시 트랜잭션 안에서 |
| "일반 SELECT로 읽은 값은 최신이다" | RR에서는 **트랜잭션 첫 읽기 시점 스냅샷**이다. 판단에 쓸 값은 잠금 읽기로 |
| "RR이니 갱신 분실은 없다" | MySQL RR은 갱신 분실을 감지하지 않는다. 읽고-계산하고-쓰기는 `FOR UPDATE`나 원자적 UPDATE로 |
| "gap lock은 스냅샷 때 걸린다" | 잠금 문장이 **인덱스를 스캔할 때** 건다 → [용어 정리](../../../inquiry/database/0003-mysql-gap-lock-next-key-lock-mechanism-and-terms.md) |
| "READ COMMITTED면 gap lock이 전혀 없다" | 외래 키·중복 키 검사에는 RC에서도 쓴다 → [RR에서만 걸리나](../../../inquiry/database/0004-mysql-next-key-lock-scope-and-postgres-visibility-check.md) |
| "`GET_LOCK`은 커넥션 풀에서 반납하면 풀린다" | 풀은 세션을 닫지 않는다 → **`RELEASE_LOCK`을 안 부르면 락이 남는다**. 다른 요청이 같은 커넥션을 받아 락을 "가진 채" 동작 |
| "replica에서 `FOR UPDATE`로 잠그면 primary도 막힌다" | 락은 그 서버에서만 유효. replica의 잠금은 복제 적용(applier)만 막는다 |

### 6. 메타데이터 락(MDL) 실수

- **증상**: 배포 중 `ALTER TABLE`을 실행했더니 그 테이블의 모든 쿼리가 `Waiting for table metadata lock` 상태로 쌓이고 커넥션 풀이 고갈된다.
- **원인**: 앞에 그 테이블을 건드린 **열린 트랜잭션**(유휴 상태여도) 하나가 공유 MDL을 쥐고 있다. DDL은 배타 MDL을 기다리고, **뒤에 오는 SELECT는 대기 중인 DDL 뒤에 줄을 선다.**
- **해결**:
  - 마이그레이션 세션에서 `SET SESSION lock_wait_timeout = 5;` → 실패하면 재시도
  - 실행 전 `information_schema.innodb_trx`·`sys.schema_table_lock_waits`로 긴 트랜잭션 확인
  - `ALGORITHM=INSTANT`/`INPLACE`가 되는지 먼저 확인. 안 되면 gh-ost·pt-online-schema-change
- `ALGORITHM=INSTANT`도 **시작과 끝에 잠깐 배타 MDL**이 필요하다. "락이 없다"가 아니라 "짧다"이다.

### 7. 핫 로우 (한 행에 쓰기 집중)

- 증상: 재고·좋아요 수·잔액처럼 한 행에 쓰기가 몰리면 `Innodb_row_lock_waits`가 급증하고 처리량이 행 하나의 직렬 처리 속도에 묶인다.
- 해결:
  - 원자적 UPDATE로 락 보유 시간 최소화
  - **카운터 샤딩**: 행 N개로 나눠 랜덤 행을 증가시키고 읽을 때 `SUM`
  - Redis 등에서 모아 두었다가 주기적으로 반영(정확도와 맞바꿈)
  - 좌석·쿠폰처럼 "선점"이면 `NOWAIT`/`SKIP LOCKED`로 대기 대신 즉시 다른 후보로

### 8. 진단 순서

1. 지금 누가 막고 있나: `SELECT * FROM sys.innodb_lock_waits\G` → `blocking_pid`, `sql_kill_blocking_connection`
2. 막는 쪽이 무엇을 하나: `performance_schema.events_statements_history`에서 `blocking_pid`의 최근 SQL
3. MDL 대기인가: `SELECT * FROM sys.schema_table_lock_waits\G`
4. 어떤 락인가: `performance_schema.data_locks`의 `lock_mode`, `lock_data`
5. 데드락 이력: 에러 로그(`innodb_print_all_deadlocks`)
6. 추세: `Innodb_row_lock_waits`, `Innodb_row_lock_time_avg`, `Innodb_deadlocks`

## 관련 문서

- [MySQL 락의 역사](./01-history.md)
- [MySQL 락 개요와 동작 방식](./02-overview.md)
- [MySQL 락 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [MySQL 락 장애 유형과 대응](./05-failure-modes.md)
- [MySQL 흔한 함정](../0001-mysql/04-pitfalls.md)
- [RR에서 next-key lock이 걸리는 경우](../../../inquiry/database/0016-mysql-rr-next-key-lock-cases.md)
- [Java 락: 흔한 함정 — Spring·JPA와 섞일 때](../../languages/0002-java-lock/04-pitfalls.md#6-springjpa와-섞일-때)

## 참고 자료

- [MySQL 8.4 Reference Manual — How to Minimize and Handle Deadlocks](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlocks-handling.html)
- [MySQL 8.4 Reference Manual — Locks Set by Different SQL Statements in InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-locks-set.html)
- [MySQL 8.4 Reference Manual — Metadata Locking](https://dev.mysql.com/doc/refman/8.4/en/metadata-locking.html)
- [MySQL 8.4 Reference Manual — Locking Functions (GET_LOCK)](https://dev.mysql.com/doc/refman/8.4/en/locking-functions.html)
- [MySQL 8.4 Reference Manual — Online DDL Operations](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-operations.html)
- [MySQL Concurrency — Working with Lock Conflicts (reading notes)](https://dfhawthorne.github.io/home/reading-notes/mysql-concurrency/Ch08-Working-with-Lock-Conflicts.html)
- [MySQL Locks: What Data Engineers Need to Know — Airbyte](https://airbyte.com/data-engineering-resources/mysql-locks)
