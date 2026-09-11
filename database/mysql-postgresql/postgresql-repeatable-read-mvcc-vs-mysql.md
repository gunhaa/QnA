# PostgreSQL을 REPEATABLE READ로 올리면 MVCC를 MySQL이랑 "똑같이" 쓰는 걸까?

관련 글: [MySQL과 PostgreSQL의 락 처리 방식 차이](mysql-postgresql-lock-handling-differences.md)

## 결론부터

- **PostgreSQL 안에서는** `READ COMMITTED` → `REPEATABLE READ`로 올려도 MVCC **메커니즘 자체는 완전히 동일**하다. 달라지는 건 딱 하나, **"스냅샷(사진)을 언제 찍느냐"** 뿐이다.
- **MySQL과 비교하면** 이름은 같은 `REPEATABLE READ`지만 내부적으로 하는 일이 전혀 다르다. PostgreSQL은 "사진 한 장을 계속 보는 것"이고, MySQL은 "사진을 보면서 동시에 자물쇠도 거는 것"이다.

## 비유: 사진 vs 자물쇠

교실에 학생 명단이 있다고 하자.

- **PostgreSQL의 REPEATABLE READ**: 트랜잭션을 시작하는 순간 **명단 사진을 딱 한 장 찍는다.** 그 뒤로 트랜잭션이 끝날 때까지, 몇 번을 다시 봐도 **같은 사진**만 본다. 다른 반에서 학생이 전학을 오든 나가든(다른 트랜잭션이 커밋하든) 내 사진에는 영향이 없다. 이건 `READ COMMITTED`가 "쿼리(문장)마다 사진을 새로 찍는 것"과 딱 하나 다를 뿐, **사진을 보는 방식(가시성 판단, xmin/xmax 비교) 자체는 완전히 동일**하다.
- **MySQL의 REPEATABLE READ**: 사진도 찍지만(일관된 읽기, consistent read), 동시에 "이 범위에는 아무도 새 학생을 못 넣게" **자물쇠(gap lock/next-key lock)** 를 걸어버린다. 즉 남이 실제로 그 범위에 뭔가를 끼워 넣는 행위 자체를 막는다.

## 기술적으로 풀어보면

### PostgreSQL: READ COMMITTED와 REPEATABLE READ는 "스냅샷 범위"만 다르다

- `READ COMMITTED`: **매 SQL 문장(statement)마다** 새 스냅샷을 찍는다. 그래서 트랜잭션 중간에 다른 세션이 커밋하면, 다음 쿼리부터는 바뀐 걸 볼 수 있다.
- `REPEATABLE READ`: **트랜잭션 시작 시점에 딱 한 번** 스냅샷을 찍고, 끝날 때까지 그 스냅샷만 쓴다. 그래서 트랜잭션 도중 남이 아무리 많이 커밋해도, 내가 보는 데이터는 트랜잭션 시작 시점 그대로 고정된다.
- 두 레벨 모두 **행 잠금을 걸지 않고** 순수하게 "이 트랜잭션 번호(XID)보다 먼저 커밋된 버전만 보이게" 하는 가시성 규칙으로 동작한다. 즉 **읽기는 절대 안 막힌다.**
- 대신 같은 행을 두 트랜잭션이 동시에 `UPDATE`하려고 하면, 나중 트랜잭션은 먼저 트랜잭션이 끝날 때까지 대기하다가 — 먼저 트랜잭션이 롤백하면 계속 진행하고, **커밋하면 나(나중 트랜잭션)는 `serialization failure` 에러를 받고 재시도해야 한다** ("first updater wins" 규칙). 이건 락으로 막는 게 아니라 **충돌을 감지하고 에러로 튕겨내는 방식**이다.
- 부작용: `REPEATABLE READ`는 read skew는 막지만 **write skew는 못 막는다** (서로 다른 행을 각자 읽은 스냅샷 기준으로 고쳐서, 합쳐 보면 말이 안 되는 상태가 되는 이상현상). 이걸 완전히 막으려면 `SERIALIZABLE`(SSI, Serializable Snapshot Isolation)까지 올려야 한다.

### MySQL: REPEATABLE READ는 "스냅샷 + 실제 잠금"의 조합

- 일반 `SELECT`(consistent read)는 PostgreSQL처럼 스냅샷을 보므로 안 막힌다.
- 하지만 `SELECT ... FOR UPDATE`, `UPDATE`, `INSERT` 같은 쓰기 계열 동작에는 **gap lock/next-key lock**이 걸려서, 다른 트랜잭션이 그 범위에 새 행을 끼워 넣는 것 자체를 **물리적으로 막는다.**
- 즉 MySQL은 "팬텀 읽기를 막는다"는 목표를 PostgreSQL처럼 스냅샷 고정만으로 하는 게 아니라, **범위를 잠가서 애초에 못 끼어들게** 만든다.
- 그 대가로 인접한 키 범위에 동시에 여러 트랜잭션이 쓰기를 시도하면 **블로킹과 데드락**이 잘 발생한다.

## 그래서 같은 이름, 다른 느낌

| | PostgreSQL RR | MySQL RR |
|---|---|---|
| 팬텀 방지 방법 | 스냅샷 고정 (락 없음) | gap/next-key lock (실제 잠금) |
| 충돌 시 반응 | 대기하다가 **에러**(serialization failure) → 재시도 필요 | 대기(블로킹) 또는 **데드락** |
| write skew | 가능 (SERIALIZABLE 가야 막힘) | next-key lock 덕에 일부 케이스는 애초에 막힘 |
| 읽기가 쓰기를 막는가 | 안 막음 | 안 막음 (consistent read 한정) |

한 줄 요약: **PostgreSQL은 RR로 올려도 MVCC 메커니즘 자체는 READ COMMITTED와 완전히 같고, "스냅샷을 얼마나 오래 들고 있느냐"만 바뀐다. MySQL은 RR이 되는 순간 MVCC 스냅샷 읽기 위에 실제 범위 잠금(gap/next-key lock)이 추가로 켜지므로, 이름은 같아도 내부 동작 방식 자체가 다르다.**

---
### Sources
- [PostgreSQL Documentation: 13.2. Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [Serializable Snapshot Isolation in PostgreSQL with an Example (Medium)](https://medium.com/@kaushikgopu1998/understanding-serializable-snapshot-isolation-in-postgresql-with-an-example-2861eceb587a)
- [Different Isolation levels and anomalies in Postgres (Medium)](https://medium.com/@Sushil_Kumar/different-isolation-levels-and-anomalies-in-postgres-2a284ca25d80)
- [MVCC in PostgreSQL — 4. Snapshots (Postgres Professional)](https://postgrespro.com/blog/pgsql/5967899)
- [PostgreSQL Transaction Isolation Levels Explained (DEV Community)](https://dev.to/philip_mcclarence_2ef9475/postgresql-transaction-isolation-levels-explained-52kj)
- [MySQL 8.0 Reference Manual: 17.3 InnoDB Multi-Versioning](https://dev.mysql.com/doc/refman/8.0/en/innodb-multi-versioning.html)
