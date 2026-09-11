# MySQL next-key lock은 RR에서만? / PostgreSQL은 "스냅샷이 틀렸다"를 어떻게 판별할까

관련 글: [gap/next-key lock이 걸리는 시점과 용어](mysql-gap-lock-next-key-lock-mechanism-and-terms.md) · [postgres는 gap lock 없이 어떻게 감지할까](postgresql-phantom-detection-without-gap-lock.md)

## 1. MySQL next-key lock, RR에서만 걸리나?

**RR이 기본값이지만, RR에서만 걸리는 건 아니다.** isolation level별로 정리하면:

| Isolation level | 일반 SELECT | 잠금 필요한 statement (`FOR UPDATE`, `UPDATE`, `DELETE`, `INSERT`) |
|---|---|---|
| READ UNCOMMITTED | 잠금 없음 | record lock만 (gap lock 없음, next-key lock도 없음) |
| **READ COMMITTED** | 잠금 없음 | **gap lock을 껐다** — record lock만 걸고 next-key lock은 안 씀 |
| **REPEATABLE READ (기본값)** | 잠금 없음 | **next-key lock**(record + gap)을 씀 — 팬텀 방지의 핵심 |
| SERIALIZABLE | 없음 대신 **암묵적으로 잠금 읽기로 승격**(`SELECT`가 사실상 `SELECT ... FOR SHARE`처럼 동작) | next-key lock |

핵심은 이거다:

- **RC로 낮추면 gap lock 자체를 꺼버린다.** "검색/인덱스 스캔"에 대해서는 gap lock을 안 쓰고, 지나친 인덱스 레코드에 record lock만 건다. 그래서 RC에서는 MySQL도 **팬텀 읽기를 그냥 허용**한다(공식 문서에 명시).
  - 단, 완전히 안 쓰는 건 아니고 **외래키 제약 체크(foreign-key constraint checking)** 와 **유니크 키 중복 체크(duplicate-key checking)** 두 가지 목적에는 RC에서도 gap lock을 쓴다. (자식 테이블에 참조당하는 부모 행이 삭제되지 못하게, 혹은 동시에 같은 유니크 키가 두 번 들어가지 못하게 막아야 하니까.)
- **SERIALIZABLE로 올리면 오히려 next-key lock 적용 범위가 더 넓어진다.** 일반 `SELECT`까지 `FOR SHARE`처럼 취급해서 공유 락을 걸어버리기 때문에(autocommit이 꺼져 있을 때 기준), 사실상 읽기조차 차단 대상이 된다.

즉 "next-key lock = RR 전용"이 아니라, **"RR이 next-key lock을 켜는 기본 레벨이고, RC는 끄고, SERIALIZABLE은 더 세게 켠다"** 가 정확한 표현이다.

## 2. PostgreSQL은 "이 스냅샷으로 본 게 틀렸다(안 맞다)"를 어떻게 판별하나

이건 PostgreSQL의 **가시성 규칙(visibility rule)** 자체가 답이다. "틀렸다고 나중에 알아채는" 게 아니라, **매번 행을 하나 읽을 때마다 그 자리에서 계산해서 판별한다.**

### 스냅샷은 숫자 3개(+목록)로 이루어진 값이다

트랜잭션이 시작될 때 만드는 스냅샷은 대략 `xmin : xmax : xip_list` 형태다.

- **xmin**: 스냅샷을 찍는 순간 "아직 끝나지 않은(진행 중인) 트랜잭션" 중 가장 오래된 번호. 이보다 작은 번호(xid)는 전부 이미 끝난 트랜잭션이라고 간주한다.
- **xmax**: 스냅샷 시점에 "아직 시작도 안 한" 트랜잭션 번호의 시작점. 이 번호 이상은 전부 안 보인다(미래).
- **xip_list**: xmin과 xmax **사이에** 있으면서, 스냅샷 시점에 **아직 진행 중이던(커밋 안 된)** 트랜잭션 번호들의 목록.

### 행(튜플) 하나가 "보이는지" 판별하는 법

모든 행에는 `xmin`(그 버전을 만든/INSERT한 트랜잭션 번호), `xmax`(그 버전을 지운/UPDATE로 대체한 트랜잭션 번호, 없으면 0)가 숨은 컬럼으로 박혀 있다. 어떤 트랜잭션이 스냅샷을 들고 행을 읽을 때, 이렇게 계산한다:

1. **이 행을 만든 트랜잭션(`xmin`)이 보이는가?** → `xmin`이 커밋됐고, 스냅샷의 `xmax`보다 작고, `xip_list`에도 없어야 함 (=스냅샷 찍을 때 이미 확정적으로 끝난 트랜잭션이어야 함)
2. **이 행을 지운 트랜잭션(`xmax`)이 안 보이는가?** → `xmax`가 아예 없거나(0), 있어도 그 트랜잭션이 스냅샷 시점에 아직 진행 중이었거나 롤백됐어야 함 (=지운 게 아직 "확정"되지 않았어야 함)

**1번과 2번이 둘 다 참이어야만** 그 행 버전이 "이 스냅샷에서 보이는 진짜"로 판별된다. 이게 바로 "스냅샷이 맞다/틀렸다"를 가르는 계산이다 — 어떤 별도의 검증 절차가 있는 게 아니라, **행 하나하나를 읽을 때마다 이 부등식/목록 비교를 즉시 수행**하는 것뿐이다.

### 이게 앞서 얘기한 것들과 어떻게 연결되나

- `READ COMMITTED`는 **문장마다** 새 스냅샷(새 xmin/xmax/xip_list)을 찍고, `REPEATABLE READ`는 **트랜잭션 시작 시 한 번** 찍어서 끝까지 재사용한다 — 그래서 "스냅샷 만드는 시점"만 다르다고 했던 게 바로 이 숫자 3개짜리 세트를 언제 새로 찍느냐의 차이다.
- 같은 행을 두 트랜잭션이 동시에 `UPDATE`하려는 "first updater wins" 상황도, 결국 내가 고치려는 행의 최신 버전의 `xmax`(혹은 잠금 상태)를 보고 "어, 이 행 이미 남이 손대고 있네/손댔네"를 판별하는 것 — 같은 가시성 계산의 연장선이다.
- 반면 `SERIALIZABLE`의 SIREAD 락(이전 답변 참고)은 이 가시성 계산과는 **별개의 추가 장치**다. 가시성 계산만으론 "존재하지 않던 행이 새로 생겨서 논리적으로 문제가 되는 경우"(write skew)까지는 못 잡기 때문에, 별도로 "나는 이런 조건으로 읽었다"는 기록을 남겨서 커밋 시점에 추가로 검사하는 것이다.

---
### Sources
- [MySQL 8.0 Reference Manual: 17.7.1 InnoDB Locking](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html)
- [MySQL 8.4 Reference Manual: 17.7.2.1 Transaction Isolation Levels](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)
- [InnoDB Gap Locks (Percona)](https://www.percona.com/blog/innodbs-gap-locks/)
- [How to Use SERIALIZABLE Isolation Level in MySQL](https://oneuptime.com/blog/post/2026-03-31-mysql-serializable-isolation-level/view)
- [Introduction to Snapshots and Tuple Visibility in PostgreSQL](https://jnidzwetzki.github.io/2024/04/03/postgres-and-snapshots.html)
- [MVCC in PostgreSQL — 4. Snapshots (Postgres Professional)](https://postgrespro.com/blog/pgsql/5967899)
- [Every UPDATE Leaves a Ghost: MVCC, Bloat, and VACUUM in PostgreSQL (PlanetScale)](https://planetscale.com/blog/postgresql-mvcc)
