# MySQL InnoDB의 gap lock, "스냅샷 만들 때" 거는 거 아니에요 — 용어 정리 포함

관련 글: [PostgreSQL은 gap lock 없이 어떻게 감지할까](postgresql-phantom-detection-without-gap-lock.md) · [MySQL/PostgreSQL 락 처리 차이](mysql-postgresql-lock-handling-differences.md)

## 결론부터

**아니다.** gap lock은 스냅샷(사진)을 찍는 시점과는 **완전히 무관**하다. 스냅샷은 "지금 뭐가 보이는지"를 정하는 것이고, gap lock은 "앞으로 남이 여기 못 들어오게 막는 것"이다 — 목적도, 걸리는 시점도, 걸리는 조건도 서로 다른 별개의 장치다.

## 비유로 먼저

교실에 학생들이 줄 서 있다고 하자(인덱스, index).

- **스냅샷**: 트랜잭션 시작할 때 "지금 줄 서 있는 애들 사진" 한 장 찍는 것. 이건 **그냥 사진**이라 아무도 못 막고, 아무도 안 막는다.
- **gap lock**: 선생님(엔진)이 `SELECT ... FOR UPDATE`나 `UPDATE`, `DELETE` 같은 "실제로 뭔가 하려는" 명령을 받으면, 그 조건에 맞는 줄을 **실제로 훑으면서(index scan)** "3번과 4번 학생 사이엔 아무도 못 들어와" 하고 **그 자리에서 팻말을 건다.** 이건 사진 찍기와 아무 상관 없이, **명령을 실행하는 그 순간에** 엔진이 인덱스를 걸어가며 즉석에서 판단해서 거는 것이다.

즉 질문의 "스냅샷 생성 시 쿼리를 보고 판단 후 건다"는 아니고, 정확히는 **"락이 필요한 종류의 쿼리를 실행할 때, 인덱스를 스캔하는 과정에서 그때그때 건다."**

## 언제 걸리는가 (정확한 조건)

InnoDB는 아무 SELECT에나 gap lock을 걸지 않는다.

- **일반(비잠금) `SELECT`**: MVCC 스냅샷만 보고 끝. **record lock도, gap lock도 전혀 안 건다.** (PostgreSQL의 순수 조회와 동일하게 안 막힘)
- **잠금이 필요한 statement**: `SELECT ... FOR UPDATE`, `SELECT ... FOR SHARE`, `UPDATE`, `DELETE`, 그리고 `INSERT` — 이런 것들만 락을 건다.

이런 statement가 실행되면, InnoDB는 인덱스(B+Tree)를 위에서부터 스캔하면서 **실제로 훑고 지나간 인덱스 레코드마다** 락을 건다. 중요한 건: **InnoDB는 WHERE 조건 자체를 기억하지 않고, "어느 인덱스 범위를 스캔했는지"만 기억한다.** 그래서 조건에 안 맞아서 걸러진(filter out) 행이라도, 스캔 과정에서 지나쳤다면 락이 걸린다.

- **유니크 인덱스 + 유니크 조건(예: `WHERE id = 5`)**: 정확히 그 레코드 하나에만 record lock. gap lock은 안 걸린다 (그 자리는 유일하니 "사이"라는 개념이 없음).
- **범위 조건이거나 비유니크 인덱스(예: `WHERE age > 20`, 또는 유니크하지 않은 컬럼)**: 스캔한 범위 전체에 **next-key lock**이 걸린다.

## 용어 정리

- **Record lock (레코드 락)**: 인덱스의 특정 행(레코드) 하나에만 거는 락. "이 행은 내가 쓰는 중"
- **Gap lock (갭 락)**: 실제 행이 아니라, **행과 행 "사이의 빈 공간"** 에 거는 락. 그 자체로는 기존 행을 보호하는 게 아니라, **그 틈에 새로운 행이 `INSERT`되는 것을 막는 용도**다.
- **Next-key lock (넥스트 키 락)**: **record lock + 그 레코드 바로 앞 gap에 대한 gap lock**을 합친 것. "이 행도 내 거고, 이 행 앞의 빈틈에도 아무도 못 들어옴"이 세트로 걸린다. RR에서 팬텀 읽기를 막는 **기본 무기**가 바로 이것이다.
- **Insert intention lock (삽입 의도 락)**: `INSERT`가 실제로 행을 끼워 넣기 **직전에** 거는 특수한 gap lock. "나 여기 끼워 넣을 거야"라는 의사표시인데, 같은 gap 안에서도 **서로 다른 위치**에 끼워 넣으려는 여러 `INSERT`끼리는 굳이 안 막아도 되므로(어차피 겹치지 않으니), 불필요한 대기를 줄이려고 따로 구분해둔 락이다. 다만 그 gap에 이미 next-key lock/gap lock이 걸려 있으면 insert intention lock도 그게 풀릴 때까지 기다린다.

## 정리 한 줄

gap lock/next-key lock은 "스냅샷을 찍을 때" 미리 정해지는 게 아니라, **잠금이 필요한 SQL(SELECT FOR UPDATE/UPDATE/DELETE/INSERT)이 실행되는 그 순간, 엔진이 인덱스를 실제로 훑으면서 지나간 범위에 즉석으로 거는 것**이다. 스냅샷(무엇이 "보이는가")과 gap lock(무엇을 "못 넣게 막는가")은 RR 안에서 같이 동작하지만 서로 다른 층위의 별개 메커니즘이다.

---
### Sources
- [MySQL 8.0 Reference Manual: 17.7.1 InnoDB Locking](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html)
- [MySQL 8.4 Reference Manual: 17.7.4 Phantom Rows / Next-Key Locking](https://dev.mysql.com/doc/refman/8.4/en/innodb-next-key-locking.html)
- [MySQL 8.0 Reference Manual: 17.7.3 Locks Set by Different SQL Statements in InnoDB](https://dev.mysql.com/doc/refman/8.0/en/innodb-locks-set.html)
- [InnoDB Gap Locks (Percona)](https://www.percona.com/blog/innodbs-gap-locks/)
- [A Comprehensive (and Animated) Guide to InnoDB Locking (jahfer.com)](https://jahfer.com/posts/innodb-locks/)
