# MySQL과 PostgreSQL은 락(Lock)을 다루는 방식이 다르다 — 장단점과 isolation level 이름이 같아도 동작이 다른 이유

## 비유로 먼저 이해하기

도서관에 책이 한 권 있다고 생각해보자.

- **MySQL(InnoDB)**: 책은 딱 한 권만 있다. 누가 빌려서 내용을 고치면, "원래 이랬어요"라는 **메모(undo log)** 를 남겨두고 책 자체를 바로 고쳐 쓴다. 다른 사람이 예전 내용을 봐야 하면 그 메모를 보고 되돌려서 보여준다. 그리고 "이 페이지는 지금 누가 쓰고 있어요"라는 **팻말(lock)** 을 걸어서 다른 사람이 동시에 못 고치게 막는다.
- **PostgreSQL**: 누가 책 내용을 고치면 원래 책은 그대로 두고 **새 복사본(row version, tuple)** 을 하나 더 만든다. 그래서 읽는 사람은 자기가 보던 복사본을 계속 보면 되고, 쓰는 사람은 새 복사본에 쓰면 된다 — 서로 마주칠 일이 적다. 다 쓴 옛날 복사본은 나중에 **청소부(VACUUM)** 가 와서 치운다.

기술 용어로 말하면 둘 다 **MVCC(Multi-Version Concurrency Control, 다중 버전 동시성 제어)** 를 쓰지만, MySQL은 "한 권 + 되돌리기 메모" 방식이고 PostgreSQL은 "매번 새 복사본" 방식이다.

## 구조 차이 (기술적으로)

| | MySQL (InnoDB) | PostgreSQL |
|---|---|---|
| 옛날 버전 저장 위치 | 별도 공간인 **undo log**에 저장, 필요할 때 되돌려서(reconstruct) 재구성 | 테이블(heap) 안에 **새 튜플**로 그대로 저장 (`xmin`/`xmax` 트랜잭션 ID로 버전 구분) |
| 락 방식 | 실제 row lock + **gap lock / next-key lock**(범위 잠금) 사용 | 잠금보다는 **스냅샷 비교**로 버전 가시성 판단. 읽기는 원칙적으로 안 막힘 |
| 정리(cleanup) | 백그라운드 **purge 스레드**가 더는 필요 없는 undo log를 자동 정리 | **VACUUM**이 죽은 튜플(dead tuple)을 정리. 안 하면 **bloat(디스크 부풀음)** 발생 |
| 기본 isolation level | REPEATABLE READ | READ COMMITTED |

## 장단점

**MySQL(InnoDB) 방식**
- 장점: 정리해야 할 "여러 버전"이 테이블에 안 쌓이므로 bloat/VACUUM 걱정이 없다. 락 기반이라 "누가 지금 이 데이터를 쓰고 있다"는 상태가 명확하다.
- 단점: `REPEATABLE READ`에서 팬텀 읽기(phantom read)를 막으려고 **gap lock/next-key lock**을 쓰는데, 이게 범위에 걸쳐 잠기다 보니 동시에 여러 트랜잭션이 인접한 키 범위에 쓰기를 하면 **불필요한 블로킹과 데드락**이 잘 생긴다.

**PostgreSQL 방식**
- 장점: 읽기가 쓰기를 막지 않고, 쓰기가 읽기를 막지 않는다(reader never blocks writer, writer never blocks reader). 그래서 읽기/쓰기가 섞인 워크로드에서 동시성이 좋다.
- 단점: 수정될 때마다 새 복사본이 쌓이므로 **VACUUM이 못 따라가면 bloat**로 성능이 떨어진다. 또한 `REPEATABLE READ`/`SERIALIZABLE`에서 충돌이 나면 조용히 기다리게 하는 대신 **serialization failure 에러**를 던져서, 애플리케이션이 트랜잭션을 재시도하도록 만들어야 한다(락으로 안 막고 "너 다시 해"라고 돌려보내는 셈).

## Isolation level 이름은 같은데 동작이 다른 이유

SQL 표준상 이름(`READ COMMITTED`, `REPEATABLE READ`, `SERIALIZABLE`)은 같아도, **그 이름을 구현하는 내부 메커니즘이 다르므로 실제 동작(막는 범위, 막는 방식)이 다르다.**

- MySQL의 `REPEATABLE READ`는 **next-key locking**(락 기반)으로 팬텀 읽기를 막는다. 즉 "이 범위에 새로 끼워 넣지 마" 하고 실제로 잠근다.
- PostgreSQL의 `REPEATABLE READ`는 **스냅샷 격리(Snapshot Isolation)** 기반이라, 트랜잭션 시작 시점의 스냅샷만 보게 해서 자연스럽게 팬텀 읽기를 막는다. 범위를 잠그지 않고도 막히기 때문에 SQL 표준이 요구하는 것보다 더 강한 보장을 준다고 알려져 있다.
- 그래서 같은 `REPEATABLE READ`라도, MySQL은 "락 충돌로 대기/데드락"이 날 수 있고, PostgreSQL은 "락 충돌 없이 진행되다가 커밋 시점에 serialization failure 에러"가 날 수 있다 — **막는 시점과 막는 방식 자체가 다르다.**

## 요약

- MySQL: 락(잠금) 중심, 한 버전 + undo log로 과거 복원, gap/next-key lock으로 범위까지 막음 → 예측 가능하지만 범위 잠금 때문에 블로킹/데드락 위험.
- PostgreSQL: 버전(복사본) 중심, 스냅샷으로 가시성 판단, 읽기/쓰기 상호 비차단 → 동시성은 좋지만 VACUUM 관리와 serialization 에러 재시도 로직이 필요.
- 같은 이름의 isolation level이라도 "락으로 막느냐 vs 스냅샷으로 막느냐"가 달라서 실제 체감 동작(블로킹 여부, 에러 발생 시점)은 다르다.

---
### Sources
- [MVCC in InnoDB and PostgreSQL are totally different (Hacker News)](https://news.ycombinator.com/item?id=6683490)
- [Comparing Data Stores for PostgreSQL - MVCC vs InnoDB (Severalnines)](https://severalnines.com/blog/comparing-data-stores-postgresql-mvcc-vs-innodb)
- [PostgreSQL MVCC vs MySQL: Key/Next-Key Locking, How Transaction Isolation Affects Concurrency (DEV Community)](https://dev.to/deko39/postgresql-mvcc-vs-mysql-key-next-locking-how-transaction-isolation-affects-concurrency-3a37)
- [Understanding of Bloat and VACUUM in PostgreSQL (Percona)](https://www.percona.com/blog/basic-understanding-bloat-vacuum-postgresql-mvcc/)
- [Well-known Databases Use Different Approaches for MVCC (EnterpriseDB)](https://www.enterprisedb.com/blog/well-known-databases-use-different-approaches-mvcc)
- [MySQL 8.0 Reference Manual: 17.3 InnoDB Multi-Versioning](https://dev.mysql.com/doc/refman/8.0/en/innodb-multi-versioning.html)
- [PostgreSQL Documentation: 13.2. Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [Isolation Repeatable Read in PostgreSQL versus MySQL](https://postgresql.verite.pro/blog/2020/02/14/isolation-repeatable-read-postgresql-mysql.html)
