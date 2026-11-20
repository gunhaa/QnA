---
type: knowledge
created: 2026-11-19
author: agent
model: claude-opus-5-5
---

# MySQL 락 개요와 동작 방식

## 쉬운 설명

MySQL(InnoDB)은 **책장의 책(행)이 아니라 색인 카드(인덱스)에 팻말을 붙여서** 잠근다. 카드 한 장에 붙이면 그 행만 잠기고(record lock), 카드 사이 빈칸에 붙이면 **그 자리에 새 카드가 못 끼어든다**(gap lock). 그냥 읽는 사람은 팻말을 보지 않고 **사진(스냅샷)** 을 본다. 그래서 읽기는 막히지 않고, 고치려는 사람끼리만 줄을 선다.

## 일반 설명

> 이 문서는 **어떻게 동작하나**만 다룬다. 왜 이렇게 설계했고 언제 무엇을 고르는지는 [트레이드오프](./03-tradeoffs.md), 잘못 쓰는 패턴은 [흔한 함정](./04-pitfalls.md), 장애는 [장애 유형](./05-failure-modes.md)에 있다.

### 1. 락이 해결하는 문제

| 문제 | 예 | 쓰는 락 |
|---|---|---|
| **갱신 분실**(lost update) | 두 요청이 재고 10을 읽고 각각 9로 씀 | 행 배타 락(X) |
| **팬텀** | 범위를 읽고 판단하는 동안 그 범위에 새 행이 들어옴 | gap / next-key lock |
| **스키마 변경 중 접근** | 트랜잭션이 쓰는 테이블을 `ALTER`가 바꿈 | 메타데이터 락(MDL) |
| **백업 일관성** | 백업 중 DDL로 파일 구조가 바뀜 | 백업 락 |

### 2. 락의 층

```
서버 계층 ─┬─ 전역/백업 락      FLUSH TABLES WITH READ LOCK, LOCK INSTANCE FOR BACKUP
          ├─ 메타데이터 락(MDL)  모든 테이블 접근(DML=공유, DDL=배타)
          └─ 사용자 락           GET_LOCK('name', timeout)
InnoDB ───┬─ 테이블 락          IS / IX(의도 락), AUTO-INC, LOCK TABLES
          └─ 행 락(인덱스 레코드) record / gap / next-key / insert intention
```

- **MDL은 서버 계층**, 행 락은 **InnoDB 계층**이다. 둘은 서로 모르고 따로 대기한다. 그래서 `ALTER TABLE`이 MDL을 기다리며 뒤 쿼리를 막는 문제는 InnoDB 락 뷰(`data_locks`)에 보이지 않는다.
- **의도 락(IS/IX)**: 행에 S/X 락을 걸기 전에 테이블에 "나 이 안의 행을 잠글 거야"라고 표시한다. 행 락끼리는 막지 않고, `LOCK TABLES ... WRITE` 같은 테이블 전체 락과의 충돌만 빠르게 판정하는 용도다.

### 3. 행 락 4종

예: 인덱스 값 `5, 10, 15`가 있을 때.

| 락 | 잠그는 대상 | 구간 표기 | `data_locks.lock_mode` |
|---|---|---|---|
| **record lock** | 인덱스 레코드 하나 | `[10]` | `X,REC_NOT_GAP` |
| **gap lock** | 레코드 **사이** 빈칸 (레코드 자체는 아님) | `(5,10)` | `X,GAP` |
| **next-key lock** | record + **그 앞** gap | `(5,10]` | `X` |
| **insert intention** | INSERT 직전 "이 gap에 넣겠다"는 표시 | — | `X,INSERT_INTENTION` |

- 마지막 레코드 뒤는 가상 레코드 **supremum**(+∞)이 맡는다. `(15, +∞]`가 잠기면 끝에 붙는 INSERT가 모두 막힌다.
- **gap lock끼리는 충돌하지 않는다.** 두 트랜잭션이 같은 gap에 gap lock을 동시에 가질 수 있다. gap lock이 막는 것은 **insert intention lock**(INSERT)뿐이다. 존재하지 않는 행에 `FOR UPDATE`를 건 두 트랜잭션이 둘 다 성공한 뒤 서로의 INSERT를 막아 데드락이 나는 이유다.
- 공유(S)와 배타(X): S끼리는 함께 가질 수 있고, X는 S·X 모두와 충돌한다.

호환성 (기존 락 → 요청 락):

| 요청 \ 보유 | record S | record X | gap(S/X) | next-key X |
|---|---|---|---|---|
| record S | ✓ | ✗ | ✓ | ✗ |
| record X | ✗ | ✗ | ✓ | ✗ |
| gap | ✓ | ✓ | ✓ | ✓ |
| insert intention | ✓ | ✓ | **✗** | **✗** |

### 4. 락은 어디에 걸리나

1. **인덱스 레코드**에 걸린다. 행이 아니다. 테이블에는 항상 클러스터드 인덱스(PK)가 있으니 인덱스가 없으면 PK 전체를 스캔하며 **모든 행**을 잠근다.
2. WHERE 조건이 아니라 **실제로 스캔한 범위**에 걸린다. 조건에서 탈락한 행도 스캔했으면 잠긴다.
3. 보조 인덱스로 찾으면 보조 인덱스에 next-key lock, **클러스터드 인덱스에는 record lock**이 추가된다.
4. **유니크 인덱스 + 모든 키 컬럼 등치 + 행 존재**일 때만 record lock으로 줄어든다. 그 외는 next-key lock이 기본이다.

쿼리 유형별 정확한 범위는 [RR에서 next-key lock이 걸리는 경우](../../../inquiry/database/0016-mysql-rr-next-key-lock-cases.md)에 표로 정리했다.

### 5. 읽기의 두 종류

| | 일관 읽기 (consistent read) | 잠금 읽기 (locking read) |
|---|---|---|
| 문장 | 일반 `SELECT` | `SELECT ... FOR SHARE` / `FOR UPDATE`, `UPDATE`, `DELETE`, `INSERT` |
| 보는 데이터 | MVCC **스냅샷** (undo log로 과거 버전 재구성) | **최신 커밋 버전** |
| 락 | 없음 | S 또는 X + (격리 수준에 따라) gap |
| 막히나 | 안 막힘 | 다른 쓰기와 충돌하면 대기 |

같은 트랜잭션 안에서 일반 `SELECT`와 `SELECT ... FOR UPDATE`가 **서로 다른 값을 볼 수 있다.** 앞은 스냅샷, 뒤는 최신값이다. 스냅샷과 gap lock은 별개의 장치다 → [gap lock은 스냅샷 시점에 걸리지 않는다](../../../inquiry/database/0003-mysql-gap-lock-next-key-lock-mechanism-and-terms.md).

### 6. 격리 수준에 따른 차이

| 격리 수준 | 일반 SELECT | 잠금 문장의 행 락 |
|---|---|---|
| READ COMMITTED | 문장마다 새 스냅샷 | **record lock만**. gap lock은 외래 키·중복 키 검사에서만. 조건에 안 맞는 행의 락은 평가 직후 해제 |
| **REPEATABLE READ (기본)** | 트랜잭션 첫 읽기 스냅샷 | **next-key lock** |
| SERIALIZABLE | (autocommit 꺼짐 시) `FOR SHARE`로 승격 | next-key lock |

자세한 내용은 [next-key lock은 RR에서만 걸리나](../../../inquiry/database/0004-mysql-next-key-lock-scope-and-postgres-visibility-check.md).

### 7. 기다림과 데드락 처리

```
락 요청 ─▶ 충돌 없음 ─▶ 즉시 획득
       └▶ 충돌 ─▶ 대기열에 들어감 (CATS: 많은 트랜잭션을 막고 있는 쪽에 먼저 부여)
                 ├─ 대기 그래프에 사이클 → 데드락 감지 → 작은 트랜잭션을 롤백 (ERROR 1213)
                 └─ innodb_lock_wait_timeout(기본 50초) 초과 → 해당 문장만 롤백 (ERROR 1205)
```

- **데드락**: 감지 즉시 희생자를 고른다. 삽입·수정·삭제한 행 수가 적은 트랜잭션이 희생된다. 희생된 트랜잭션은 **전체 롤백**된다.
- **락 대기 타임아웃**: 기본으로 **문장만** 롤백되고 트랜잭션은 열려 있다. `innodb_rollback_on_timeout=ON`이면 트랜잭션 전체가 롤백된다.
- 락은 **커밋·롤백 때 한꺼번에 풀린다**(2단계 락). 문장이 끝나도 풀리지 않는다.

### 8. 기본 사용법

```sql
-- 비관적 락: 읽고 바로 고칠 행
START TRANSACTION;
SELECT stock FROM product WHERE id = 42 FOR UPDATE;
UPDATE product SET stock = stock - 1 WHERE id = 42;
COMMIT;

-- 기다리지 않기
SELECT * FROM seat WHERE id = 7 FOR UPDATE NOWAIT;        -- 잠겨 있으면 즉시 ERROR 3572

-- 잠긴 행은 건너뛰기 (작업 큐)
SELECT id FROM job WHERE status = 'READY'
ORDER BY id LIMIT 10 FOR UPDATE SKIP LOCKED;

-- 조인 중 특정 테이블만 잠그기
SELECT * FROM orders o JOIN customer c ON ...
WHERE o.id = 1 FOR UPDATE OF o;

-- 이름 붙은 사용자 락 (세션 단위)
SELECT GET_LOCK('daily-batch', 0);   -- 1=획득, 0=실패
SELECT RELEASE_LOCK('daily-batch');
```

### 9. 관측

```sql
-- 현재 보유·대기 중인 행 락
SELECT engine_transaction_id, object_name, index_name, lock_type, lock_mode, lock_status, lock_data
FROM performance_schema.data_locks;

-- 누가 누구를 막고 있나 (blocking_pid를 KILL 대상으로)
SELECT * FROM sys.innodb_lock_waits\G

-- 메타데이터 락 대기
SELECT * FROM sys.schema_table_lock_waits\G

-- 최근 데드락 1건
SHOW ENGINE INNODB STATUS\G   -- LATEST DETECTED DEADLOCK
```

## 관련 문서

- [MySQL 락의 역사](./01-history.md)
- [MySQL 락 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [MySQL 락: 흔한 함정과 해결 방법](./04-pitfalls.md)
- [MySQL 락 장애 유형과 대응](./05-failure-modes.md)
- [MySQL 개요 — 트랜잭션과 격리 수준](../0001-mysql/02-overview.md#4-트랜잭션과-격리-수준)
- [gap lock·next-key lock 용어 정리](../../../inquiry/database/0003-mysql-gap-lock-next-key-lock-mechanism-and-terms.md)
- [next-key lock은 RR에서만 걸리나](../../../inquiry/database/0004-mysql-next-key-lock-scope-and-postgres-visibility-check.md)
- [RR에서 next-key lock이 걸리는 경우](../../../inquiry/database/0016-mysql-rr-next-key-lock-cases.md)
- [Java 락 개요](../../languages/0002-java-lock/02-overview.md)

## 참고 자료

- [MySQL 8.4 Reference Manual — InnoDB Locking](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html)
- [MySQL 8.4 Reference Manual — Locks Set by Different SQL Statements in InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-locks-set.html)
- [MySQL 8.4 Reference Manual — Locking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html)
- [MySQL 8.4 Reference Manual — Deadlock Detection](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlock-detection.html)
- [MySQL Manual — The metadata_locks Table](https://dev.mysql.com/doc/mysql/en/performance-schema-metadata-locks-table.html)
- [MySQL 8.0 Reference Manual — Transaction Scheduling](https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-scheduling.html)
- [A Comprehensive (and Animated) Guide to InnoDB Locking](https://jahfer.com/posts/innodb-locks/)
