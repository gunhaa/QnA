---
type: knowledge
created: 2026-11-19
author: agent
model: claude-opus-5-5
---

# MySQL 락의 역사

## 쉬운 설명

처음 MySQL은 장부를 고칠 때 **장부 전체를 잠갔다**(테이블 락). 한 사람이 한 줄만 고쳐도 다른 사람은 모두 기다렸다. 그래서 **한 줄씩만 잠그는 새 장부(InnoDB)** 가 들어왔고, 그 뒤로는 "장부 표지를 바꾸는 동안은 아무도 못 펴게 하기"(메타데이터 락), "잠긴 줄은 건너뛰기"(SKIP LOCKED), "기다리는 사람 순서 똑똑하게 정하기"(CATS)처럼 **기다리는 시간을 줄이는 쪽으로** 발전했다.

## 일반 설명

### 1. 등장 배경 (1995~2001): 테이블 락만 있던 시절

- 초기 MySQL의 기본 엔진 **MyISAM**은 **테이블 단위 락**만 지원했다. 읽기는 공유 락, 쓰기는 테이블 전체 배타 락.
- 웹 초창기의 "읽기 위주, 쓰기 드문" 워크로드에서는 충분했지만, 쓰기가 늘면 한 행만 고쳐도 **테이블 전체가 줄을 서는** 문제가 커졌다. 트랜잭션·크래시 복구도 없었다.
- Heikki Tuuri의 Innobase Oy가 만든 **InnoDB**가 2001년 MySQL 3.23에 통합되면서 **행 단위 락 + MVCC + 트랜잭션**이 들어왔다. 설계는 Oracle 계열 DB를 참고했다 — 읽기는 스냅샷(undo log)으로 락 없이, 쓰기는 **인덱스 레코드에 거는 행 락**으로.
- 풀려던 문제: 쓰기 동시성, 그리고 **statement 기반 복제**에서 primary와 replica가 같은 결과를 내도록 **팬텀을 막는 것**. 이것이 기본 격리 수준이 REPEATABLE READ이고 **next-key lock**이 기본 단위가 된 이유다.

### 2. 주요 변천

| 시기 | 버전 | 변화 | 해결하려던 문제 |
|---|---|---|---|
| 2001 | 3.23 | **InnoDB 통합**: 행 락, gap/next-key lock, 데드락 자동 감지 | 테이블 락의 쓰기 병목 |
| 2008 | 5.1 | **row 기반 binlog** 도입 | statement 복제 때문에 필요했던 gap lock을 READ COMMITTED에서 끌 수 있게 됨 |
| 2010 | **5.5** | InnoDB 기본 엔진. **메타데이터 락(MDL)** 도입 | 트랜잭션이 쓰는 테이블을 DDL이 바꿔 버리는 문제 |
| 2013 | 5.6 | **Online DDL**(`ALGORITHM=INPLACE`, `LOCK=NONE`) | DDL 동안 테이블 전체 쓰기 차단 |
| 2016 | 5.7 | `innodb_deadlock_detect`(감지 끄기 옵션), `sys` 스키마의 `innodb_lock_waits` | 고경합에서 데드락 감지 자체가 CPU를 잡아먹는 문제 |
| 2017 | **8.0.1** | **`NOWAIT` / `SKIP LOCKED`**, **`performance_schema.data_locks`**(`information_schema.innodb_locks` 대체) | 핫 로우 대기, 작업 큐 구현, 락 관측성 |
| 2017 | 8.0.3 | **CATS**(Contention-Aware Transaction Scheduling) 도입 — 고경합 시 많은 트랜잭션을 막고 있는 쪽에 먼저 락을 준다 | FIFO 대기열의 꼬리 지연 |
| 2018 | 8.0 GA | `innodb_autoinc_lock_mode` 기본값 **2(interleaved)**, `LOCK INSTANCE FOR BACKUP` | AUTO-INC 테이블 락 경합, 온라인 백업 중 DDL 차단 |
| 2018~2022 | 8.0.12 / 8.0.29 | `ALGORITHM=INSTANT` 컬럼 추가 → 위치 지정·삭제까지 | 테이블 재작성 없이 스키마 변경 |
| 2019 | 8.0.18 | PK 범위 조건에서 **범위 밖 레코드까지 잠그던 문제 수정** | 불필요한 next-key lock |
| 2020 | 8.0.20 | **FIFO 제거, 락 스케줄링을 CATS로 일원화** | 경합 여부에 따른 이중 경로 |
| 2020 | 8.0.21 | **lock_sys 뮤텍스 샤딩**(전역 뮤텍스 → 테이블·페이지 단위 샤드) | 락 시스템 자체의 내부 경합 |
| 2024 | 8.4 LTS | 락 관련 큰 변화 없이 LTS로 안정화 | — |
| 2026.4 | 9.7 LTS | 순차 버전 체계의 마지막 LTS | — |
| 2026.7 | **26.7** | **달력 버전(YY.M.P)** 도입. 26.7·26.10은 Innovation 릴리스 | 버전 체계 정리 |

### 3. 현재 상태 (2026년 11월)

- **운영 기준 버전**: 8.4 LTS 또는 9.7 LTS. 8.0은 2026년 4월 EOL. 26.x는 Innovation 트랙이라 다음 Innovation이 나오면 지원이 끝난다. 버전 선택은 [MySQL 트레이드오프](../0001-mysql/03-tradeoffs.md#3-주요-선택지).
- **락 모델 자체는 2001년 설계를 그대로 쓴다.** 인덱스 레코드 락 + next-key lock + MVCC + 즉시 데드락 감지. 20년 동안의 변화는 대부분 **관측성(`data_locks`)·스케줄링(CATS)·내부 확장성(샤딩)·DDL 락 축소(Online/Instant DDL)** 쪽이다.
- **라이선스**: Community GPLv2. 포크인 **MariaDB**와 **Percona Server**도 InnoDB 계열 락 모델을 공유한다(MariaDB는 자체 InnoDB 갈래).
- **경쟁 모델**: PostgreSQL은 튜플 버전 + SSI(직렬화 가능 스냅샷 격리)로 범위 잠금 없이 직렬화를 보장한다 → [MySQL과 PostgreSQL의 락 처리 차이](../../../inquiry/database/0005-mysql-postgresql-lock-handling-differences.md).

## 관련 문서

- [MySQL 락 개요와 동작 방식](./02-overview.md)
- [MySQL 락 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [MySQL 락: 자주 겪는 문제와 해결 방법](./04-pitfalls.md)
- [MySQL 락 장애 유형과 대응](./05-failure-modes.md)
- [MySQL의 역사](../0001-mysql/01-history.md)
- [Java 락의 역사](../../languages/0002-java-lock/01-history.md)

## 참고 자료

- [MySQL Reference Manual — Metadata Locking (5.5)](https://dev.mysql.com/doc/refman/5.5/en/metadata-locking.html)
- [MySQL 8.0.1: Using SKIP LOCKED and NOWAIT to handle hot rows](https://dev.mysql.com/blog-archive/mysql-8-0-1-using-skip-locked-and-nowait-to-handle-hot-rows/)
- [Contention-Aware Transaction Scheduling Arriving in InnoDB](https://dev.mysql.com/blog-archive/contention-aware-transaction-scheduling-arriving-in-innodb-to-boost-performance)
- [MySQL 8.0 Reference Manual — Transaction Scheduling](https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-scheduling.html)
- [InnoDB Data Locking – Part 5: Concurrent queues](https://dev.mysql.com/blog-archive/innodb-data-locking-part-5-concurrent-queues/)
- [The MySQL 8.0.21 Maintenance Release is Generally Available](https://dev.mysql.com/blog-archive/the-mysql-8-0-21-maintenance-release-is-generally-available/)
- [WL#9383: Add an option to turn off/on deadlock checker](https://dev.mysql.com/worklog/task/?id=9383)
- [LOCK INSTANCE FOR BACKUP — MySQL Manual](https://dev.mysql.com/doc/mysql/en/lock-instance-for-backup.html)
- [Changes in MySQL 26.7.0](https://dev.mysql.com/doc/relnotes/mysql/26.7/en/news-26-7-0.html)
- [Meet MySQL 26.7: A New Versioning Era Begins — Percona](https://www.percona.com/blog/meet-mysql-26-7-a-new-versioning-era-begins/)
