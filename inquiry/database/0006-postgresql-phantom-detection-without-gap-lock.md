# PostgreSQL에는 gap lock이 없는데, "사이에 새 행이 끼어드는" 걸 어떻게 감지할까?

관련 글: [PostgreSQL RR에서도 MVCC는 MySQL과 다르다](postgresql-repeatable-read-mvcc-vs-mysql.md) · [MySQL/PostgreSQL 락 처리 차이](mysql-postgresql-lock-handling-differences.md)

## 먼저, 질문자의 이해를 정리하면

> "MySQL/PostgreSQL 차이는 기본 isolation level 차이고, RR에서 스냅샷 만드는 건 둘 다 같고, 핵심 차이는 위험 요소에 락을 걸어서 막느냐 vs 문제 생기면 롤백하느냐다"

**절반은 맞고, 절반은 중요한 조건이 빠졌다.**

- "스냅샷 자체는 둘 다 비슷한 개념"이라는 건 맞다 (다만 저장 구조는 undo log vs 튜플 버전으로 다르다는 건 이전 글 참고).
- "락으로 막느냐 vs 롤백시키느냐"는 프레임은 정확한데, **이게 PostgreSQL에서는 오직 `SERIALIZABLE` 레벨에서만 적용된다.** `REPEATABLE READ`(RR)에서는 락도 안 걸고, 롤백(재시도)도 안 시킨다 — **그냥 조용히 허용해버린다.** 이게 이번 질문의 핵심이다.

## 비유: 사진첩과 몰래카메라

- 반 학생 명단 "사진"을 찍어뒀는데(스냅샷), 내가 안 보는 사이 누가 새 학생을 명단에 몰래 끼워 넣었다(팬텀 삽입). 그런데 **내 사진첩엔 애초에 그 학생이 안 찍혀 있으니** 나는 그걸 볼 수도, "누가 끼어들었다"고 알아챌 수도 없다. 이게 PostgreSQL `REPEATABLE READ`의 실제 모습이다 — **감지를 안 하는 게 아니라, 감지할 "사건"자체가 안 보인다.**
- `SERIALIZABLE`로 올리면 이야기가 달라진다. PostgreSQL이 몰래카메라(**predicate lock**, 실제로는 `SIREAD lock`이라 부름)를 하나 더 설치한다. "나는 이런 조건(WHERE절/인덱스 범위)으로 조회했다"는 **기록만** 남겨두고, 실제로 아무도 막지는 않는다. 그러다가 나중에 그 조건에 걸리는 새 행이 실제로 쓰였다는 게 확인되면, **커밋 시점에** "너희 둘 중 하나는 이 트랜잭션 취소야"라고 한쪽을 `serialization failure` 에러로 되돌린다.

## 기술적으로 정리

### RR: 왜 "감지가 안 되는" 게 정상 동작인가

MySQL의 gap lock은 **물리적인 잠금**이다. "이 범위엔 아무도 못 들어와"라고 실제로 막아서, 삽입 자체가 **일어나지 못하게** 한다.

PostgreSQL의 RR은 그런 잠금이 아예 없다. 대신 순수하게 **MVCC 가시성 규칙**만 쓴다: 내 트랜잭션 스냅샷보다 나중에 커밋된 행은 애초에 "존재하지 않는 것처럼" 보인다. 그래서:
- 단순 조회(순수 phantom read)는 **막을 필요조차 없다.** 새 행이 안 보이니까 자동으로 팬텀이 없다.
- 하지만 **write skew**(각자 다른 행을 자기 스냅샷 기준으로 읽고, 서로 다른 행을 고쳐서 합치면 비즈니스 규칙이 깨지는 상황 — 예: "당직자가 최소 1명 있어야 함"을 두 트랜잭션이 동시에 확인하고 각자 자기 당직만 빼버리는 경우)은 **RR에서 그대로 통과된다.** PostgreSQL 공식 문서와 실무 자료 모두 "RR은 write skew를 막지 못한다"고 명시한다 — 이게 질문자가 걱정한 "gap 사이의 위험"이 실제로 새어나가는 지점이다.
- 단, **같은 행**을 두 트랜잭션이 동시에 `UPDATE`하려는 경우는 예외다. 이건 이미 존재하는 튜플에 대한 충돌이라 PostgreSQL도 감지한다("first updater wins": 먼저 커밋한 쪽이 이기고, 나중 트랜잭션은 대기하다가 에러로 튕겨나간다). 하지만 이건 "아직 존재하지 않는 행이 새로 끼어드는" gap 시나리오와는 다른 얘기다.

### SERIALIZABLE: SIREAD(predicate) lock으로 사후 감지

`SERIALIZABLE`에서만 켜지는 **SSI(Serializable Snapshot Isolation)** 라는 별도 장치가 있다.

- 트랜잭션이 인덱스 범위나 테이블을 스캔하면, 실제로 읽은 행뿐 아니라 **"이 조건이면 읽었을 범위"** 에 대해서도 `SIREAD` 락을 건다. (페이지 단위, 인덱스 범위 단위, 심하면 테이블 전체 단위로 뭉쳐서 관리 — 실제 blocking은 안 함, 순전히 "기록용" 락)
- 다른 트랜잭션이 그 범위에 걸리는 새 행을 쓰면(삽입/수정/삭제), PostgreSQL은 그 SIREAD 락과 충돌(rw-conflict)했다는 걸 **기록**한다.
- 커밋 시점에 이런 충돌 기록들을 모아서 **위험한 의존성 사이클(dangerous structure)** 이 만들어졌는지 확인하고, 사이클이 발견되면 관련 트랜잭션 중 하나를 `serialization failure`로 실패시킨다.
- 즉 MySQL의 gap lock은 "**사전 차단**"(삽입 자체를 못 하게 막음)이고, PostgreSQL SERIALIZABLE의 SIREAD lock은 "**사후 적발**"(삽입은 그냥 진행시키고, 나중에 문제였다는 게 확인되면 둘 중 하나를 취소)이다.

## 정리 — 질문자의 프레임을 정확히 고치면

| | MySQL | PostgreSQL |
|---|---|---|
| 기본 isolation level | REPEATABLE READ | READ COMMITTED |
| RR에서 "사이 끼어들기" 처리 | **gap/next-key lock으로 사전 차단** (RR 자체에 내장) | **처리 안 함** — 그냥 안 보여서 write skew 허용 |
| "위험 요소를 락으로 막느냐 vs 문제 생기면 롤백하느냐" | RR부터 이미 **락으로 막는 쪽** | **RR에는 해당 없음.** `SERIALIZABLE`로 올려야 비로소 "일단 진행시키고, 문제면 롤백(재시도)시키는" 방식이 켜짐 |
| 그 방식의 이름 | gap lock / next-key lock (실제 블로킹) | SIREAD lock / predicate lock (블로킹 없음, 커밋 시점 사후 감지) |

**핵심 교정**: "락으로 막느냐 vs 롤백시키느냐"는 프레임 자체는 훌륭하지만, PostgreSQL에서는 이게 **isolation level에 따라 아예 스위치가 꺼져 있다.** RR에서는 두 방식 다 꺼져 있어서(=아무 보호 없음, write skew 허용), MySQL RR과 이름은 같아도 실제 안전성은 더 약하다. "락도 안 걸고 롤백도 안 시키는" 이 구간을 막으려면 PostgreSQL에서는 `SERIALIZABLE`까지 올려야 하고, 그때 비로소 SIREAD lock이라는, gap lock과는 완전히 다른 방식(사전 차단이 아니라 사후 적발)으로 동일한 문제를 해결한다.

---
### Sources
- [PostgreSQL Documentation: 13.2. Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [Serializable Snapshot Isolation in PostgreSQL (arXiv, Ports & Grittner)](https://arxiv.org/pdf/1208.4179)
- [5.9. Serializable Snapshot Isolation — Hironobu SUZUKI @ InterDB](https://www.interdb.jp/pg/pgsql05/09.html)
- [Serializable — PostgreSQL wiki](https://wiki.postgresql.org/wiki/Serializable)
- [Repeatable Read vs Serializable Isolation Level in Postgres](https://peter.grman.at/postgres-repeatable-read-vs-serializable/)
- [Write Skew Explained: The Anomaly That Requires Serializable Isolation](https://www.abstractalgorithms.dev/write-skew-database-anomaly)
- [Different Isolation levels and anomalies in Postgres (Medium)](https://medium.com/@Sushil_Kumar/different-isolation-levels-and-anomalies-in-postgres-2a284ca25d80)
