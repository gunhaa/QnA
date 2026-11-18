---
type: inquiry
created: 2026-11-17
author: agent
model: claude-opus-5-5
---

# MySQL RR에서 next-key lock은 어떤 경우에 걸리나 — 쿼리 유형별 정리

관련 글: [gap/next-key lock이 걸리는 시점과 용어](./0003-mysql-gap-lock-next-key-lock-mechanism-and-terms.md) · [next-key lock은 RR에서만?](./0004-mysql-next-key-lock-scope-and-postgres-visibility-check.md) · [MySQL/PostgreSQL 락 처리 차이](./0005-mysql-postgresql-lock-handling-differences.md)

## 쉬운 설명

경비원은 기본적으로 **"학생 한 명 + 그 앞 빈자리"를 한 묶음(next-key lock)** 으로 막는다. 이름표(유니크 키)로 딱 한 명을 정확히 찾았을 때만 **그 학생만** 막고, 없는 학생을 찾았을 때는 **빈자리만** 막는다. 나머지(범위 검색, 이름표 아닌 걸로 검색, 인덱스 없이 검색)는 전부 묶음으로 막는다.

## 일반 설명

### 대전제

- RR에서 **잠금 읽기**(`SELECT ... FOR UPDATE / FOR SHARE`), `UPDATE`, `DELETE`의 기본 락 단위는 **next-key lock** = record lock + 그 레코드 **앞쪽** gap lock, 구간으로 쓰면 `(이전 값, 현재 값]`.
- 락은 WHERE 조건이 아니라 **실제로 스캔한 인덱스 레코드**에 걸린다. 필터에서 탈락한 행도 스캔했으면 잠긴다.
- 일반 `SELECT`(consistent read)는 MVCC 스냅샷만 보고 **락을 걸지 않는다.**
- next-key lock에서 **"예외적으로 축소"되는 경우**가 두 가지 있다고 보면 이해가 쉽다:
  1. 유니크 인덱스 등치 조회로 행을 찾음 → **record lock으로 축소**
  2. 등치 조회에서 오른쪽으로 스캔하다 조건에 안 맞는 첫 레코드에 닿음 → 그 레코드는 **gap lock으로 축소**

### 케이스별 정리

예시 테이블: `t(id PK, c 비유니크 인덱스, d 인덱스 없음)`, 값은 `id/c = 0, 5, 10, 15, 20`.

| # | 쿼리 | 걸리는 락 | next-key? |
|---|---|---|---|
| 1 | `WHERE id = 10` (PK/유니크, **존재**) | `id=10` **record lock**만 | ✗ (축소) |
| 2 | `WHERE id = 7` (PK/유니크, **없음**) | `(5,10)` **gap lock** | ✗ (gap만) |
| 3 | `WHERE id >= 10 AND id < 11` (PK 범위) | `id=10` record lock + `(10,15)` gap (8.0.18+ 기준) | 일부 |
| 4 | `WHERE id > 10 AND id <= 15` (PK 범위) | `(10,15]` next-key. 8.0.18 이전엔 `(15,20]`까지 더 잠그는 문제 있었음 | **✓** |
| 5 | `WHERE c = 10` (**비유니크** 등치, 존재) | `c`: `(5,10]` next-key + `(10,15)` gap / PK: `id=10` record lock | **✓** |
| 6 | `WHERE c = 7` (비유니크 등치, 없음) | `c`: `(5,10)` gap lock | ✗ (gap만) |
| 7 | `WHERE c >= 10 AND c < 11` (비유니크 범위) | `c`: `(5,10]`, `(10,15]` next-key — 비유니크는 축소 없음 | **✓** |
| 8 | `WHERE d = 10` (**인덱스 없음**) | PK 풀스캔 → **모든 레코드 next-key + supremum** = 사실상 테이블 전체 잠금 | **✓** |
| 9 | 유니크 키지만 **복합 유니크의 일부 컬럼만** 등치 | "유니크 검색"이 아니므로 범위 취급 → next-key | **✓** |

포인트:

- **유니크 + 모든 키 컬럼 등치 + 행 존재** 이 조합일 때만 next-key가 안 걸린다. 하나라도 빠지면(범위, 비유니크, 일부 컬럼, 인덱스 없음) next-key가 기본이다.
- 보조 인덱스로 찾은 경우, 클러스터드 인덱스(PK) 쪽에는 **record lock만** 추가된다(gap 없음).
- 범위의 끝을 넘어서는 레코드가 없으면 마지막 구간은 **supremum**(가상의 +∞ 레코드)의 next-key `(마지막 값, +∞]`가 잠긴다 → 끝 쪽 INSERT가 전부 막힌다.
- `ORDER BY ... DESC`로 역방향 스캔하면 잠기는 gap 방향도 달라진다. `LIMIT`은 스캔을 일찍 멈추게 해 잠금 범위를 줄인다.

### 쓰기 문장에서 생기는 next-key lock

| 상황 | 락 |
|---|---|
| 일반 `INSERT` | 삽입 레코드에 record lock. 그 전에 **insert intention lock**(gap 락의 일종)으로 대상 gap을 확인 — 다른 트랜잭션의 gap/next-key lock과 충돌하면 대기 |
| `INSERT` 중 **duplicate-key 에러** | 중복 레코드에 **S lock**. 보조 유니크 인덱스 중복은 S **next-key lock** (데드락 단골 원인) |
| `INSERT ... ON DUPLICATE KEY UPDATE` 충돌 | PK 중복 → X record lock, **유니크 보조키 중복 → X next-key lock** |
| `REPLACE` 충돌 | 중복 행에 X **next-key lock** |
| `INSERT INTO t SELECT ... FROM s` / `CREATE TABLE ... SELECT` | RR에서 원본 `s`의 읽은 행에 **S next-key lock** (binlog 재현성 보장 목적) |
| 외래키 체크 | 부모 행 확인용 S record lock (RC에서도 유지) |

### 확인 방법

추측보다 직접 보는 게 정확하다(마이너 버전마다 세부가 바뀌었다).

```sql
SELECT index_name, lock_type, lock_mode, lock_data
FROM performance_schema.data_locks;
```

- `lock_mode = X` → next-key lock
- `X,REC_NOT_GAP` → record lock만
- `X,GAP` → gap lock만
- `X,INSERT_INTENTION` → insert intention lock
- `lock_data = supremum pseudo-record` → +∞ 구간

### 정리

RR에서 next-key lock은 **"기본값"** 이고, 질문은 사실 **"언제 안 걸리나"** 로 뒤집어 보는 게 쉽다.

- 안 걸림(record lock으로 축소): 유니크 인덱스 + 전 컬럼 등치 + 행 존재
- gap lock으로 축소: 등치 조회의 오른쪽 경계, 또는 찾는 값이 없을 때
- 그 외(범위 조건, 비유니크 인덱스, 인덱스 미사용, 유니크 보조키 중복 INSERT/REPLACE/ODKU, INSERT...SELECT의 원본) → **next-key lock**

## 관련 문서

- [MySQL 개요와 기본 사용법 — 트랜잭션과 격리 수준](../../knowledge/database/0001-mysql/02-overview.md#4-트랜잭션과-격리-수준)
- [MySQL 트레이드오프 — 무엇을 얻고 무엇을 포기했나, 언제 고르나](../../knowledge/database/0001-mysql/03-tradeoffs.md)

## 참고

- [MySQL 8.0 Reference Manual — Locks Set by Different SQL Statements in InnoDB](https://dev.mysql.com/doc/refman/8.0/en/innodb-locks-set.html)
- [MySQL 8.4 Reference Manual — Locks Set by Different SQL Statements in InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-locks-set.html)
- [Artful Software — 8.0.18 PK 범위 잠금 수정 관련 논의](https://artfulsoftware.com/infotree/tip_id-2009-r-1.html)
- [Understanding InnoDB Row Locks: Rules, Types, and Examples](https://besthub.dev/articles/understanding-innodb-row-locks-rules-types-and-real-world-examples-7a444c31d07f)
