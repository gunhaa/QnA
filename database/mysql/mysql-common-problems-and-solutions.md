# MySQL 운영 시 자주 겪는 문제와 해결 방법

## 쉬운 설명

장부(MySQL)가 느려지는 이유는 대개 셋이다. ① 책갈피(인덱스) 없이 장부를 처음부터 끝까지 넘긴다. ② 누가 장부를 펼친 채 자리를 비워(긴 트랜잭션) 다른 사람이 못 쓴다. ③ 창구(연결)가 꽉 차서 손님이 줄을 선다. 대부분은 "어디서 막혔는지 먼저 보고" 책갈피를 꽂거나 일을 잘게 나누면 풀린다.

## 일반 설명

> 서버·복제 장애, 데이터 유실, 백업/복구는 [MySQL 장애 대응과 고가용성](./mysql-failure-and-high-availability.md)에서 다룬다.

### 1. 느린 쿼리

| 원인 | 증상 (EXPLAIN) | 해결 |
|---|---|---|
| 인덱스 없음 | `type: ALL`, `rows` 수백만 | 조건·정렬 컬럼에 복합 인덱스 (등호 → 범위 순) |
| 인덱스 컬럼 가공 | `WHERE DATE(col)=`, `col + 1 =`, 문자열 컬럼에 숫자 비교(암묵 형변환) | 컬럼은 그대로 두고 상수 쪽을 가공. 타입 일치 |
| 앞 와일드카드 | `LIKE '%abc'` | FULLTEXT(ngram parser), 외부 검색엔진 |
| 정렬·그룹에 인덱스 미사용 | `Using filesort`, `Using temporary` | 정렬 컬럼을 인덱스 뒤쪽에 포함 |
| 깊은 OFFSET | `LIMIT 20 OFFSET 1000000` → 100만 행 읽고 버림 | **커서(keyset) 페이지네이션**: `WHERE id < :lastId ORDER BY id DESC LIMIT 20` |
| N+1 (ORM) | 같은 쿼리 수백 번 | fetch join, `IN` 일괄 조회, batch size |
| `SELECT *` | 커버링 인덱스 못 탐, 네트워크 낭비 | 필요한 컬럼만 |
| `OR` 조건, 서로 다른 컬럼 | 인덱스 하나만 쓰거나 풀스캔 | `UNION ALL`로 분리, 또는 index merge 확인 |
| 통계 오래됨 → 잘못된 실행 계획 | 같은 쿼리가 갑자기 느려짐 | `ANALYZE TABLE`, 히스토그램(`ANALYZE TABLE ... UPDATE HISTOGRAM ON col`), 최후엔 옵티마이저 힌트 |

**진단 도구**
- slow query log: `slow_query_log=ON`, `long_query_time=1`(초) → `pt-query-digest`로 집계
- `EXPLAIN ANALYZE`(8.0.18+): 실제 실행 시간·행 수
- `performance_schema` / `sys.statements_with_full_table_scans`, `sys.statement_analysis`

### 2. 락 대기와 데드락

| 문제 | 원인 | 해결 |
|---|---|---|
| `Lock wait timeout exceeded` | 다른 트랜잭션이 행 락을 오래 보유 | 트랜잭션을 짧게. 트랜잭션 안에서 외부 API 호출·사용자 입력 대기 금지 |
| **Deadlock found** | 두 트랜잭션이 **반대 순서로** 행을 잠금, 또는 RR의 gap lock 충돌 | ① 항상 같은 순서(예: PK 오름차순)로 잠금 ② 인덱스를 타게 해 잠금 범위 축소 ③ 데드락은 정상 상황으로 보고 **애플리케이션에서 재시도** |
| 인덱스 없는 `UPDATE ... WHERE` | 조건 컬럼에 인덱스가 없으면 **스캔한 모든 행**을 잠금 | 조건 컬럼 인덱스 |
| RR에서 존재하지 않는 행 `SELECT ... FOR UPDATE` 후 `INSERT` | 두 트랜잭션이 같은 gap lock 보유 → 서로의 INSERT 대기 → 데드락 | `INSERT ... ON DUPLICATE KEY UPDATE`, 유니크 키 충돌 처리, 또는 READ COMMITTED |
| 대량 `UPDATE/DELETE` 한 방 | 수백만 행 락 + undo 폭증 + 복제 지연 | **청크로 나눠** 1천~1만 행씩 커밋 |
| 재고·포인트 동시 차감 | 읽고-계산하고-쓰기 사이 경쟁 | `UPDATE ... SET stock = stock - 1 WHERE id = ? AND stock > 0` 한 문장으로, 또는 `FOR UPDATE`, 버전 컬럼 낙관적 락 |

진단: `SHOW ENGINE INNODB STATUS\G`의 `LATEST DETECTED DEADLOCK`, `performance_schema.data_locks` / `data_lock_waits`, `sys.innodb_lock_waits`. 모든 데드락을 로그로 남기려면 `innodb_print_all_deadlocks=ON`.

gap/next-key lock이 언제 걸리는지는 [RR에서 next-key lock이 걸리는 경우](../mysql-postgresql/mysql-rr-next-key-lock-cases.md)에 쿼리 유형별로 정리돼 있다.

### 3. 긴 트랜잭션과 History List

- 열린 채 방치된 트랜잭션(커밋 안 한 콘솔 세션, 트랜잭션 안에서 오래 도는 배치)은 그 시점 이후의 **undo log를 지우지 못하게** 한다.
- 결과: `History list length` 증가 → 모든 읽기가 옛 버전을 거슬러 올라가며 느려짐, undo 테이블스페이스 비대화.
- 탐지: `SELECT * FROM information_schema.innodb_trx ORDER BY trx_started;`
- 해결: 커넥션 풀의 autocommit 확인, 트랜잭션 타임아웃, 장시간 분석 쿼리는 replica로.

### 4. 연결 문제

| 증상 | 원인 | 해결 |
|---|---|---|
| `Too many connections` | 앱 인스턴스 × 풀 크기 > `max_connections` | 전체 연결 예산을 계산해 풀 크기 배분(관리·모니터링·장애 조치 여유분 남김). 오토스케일 시 인스턴스 수 증가도 고려 |
| 커넥션 누수 | 반환 안 된 연결이 `Sleep` 상태로 쌓임 | HikariCP `leakDetectionThreshold`, `wait_timeout` 적정값 |
| 풀이 크면 더 빠를 거라는 오해 | 연결이 많을수록 컨텍스트 스위칭·락 경합 증가 | 풀은 작게 (HikariCP 권장: 대략 `코어 수 × 2 + 디스크 수` 수준에서 시작해 측정) |
| `Communications link failure` 간헐 발생 | DB·방화벽·LB가 유휴 연결을 먼저 끊음 | HikariCP `maxLifetime`을 `wait_timeout`·네트워크 장비 유휴 타임아웃보다 짧게, `keepaliveTime` |
| 8.4 업그레이드 후 접속 실패 | `mysql_native_password` 기본 비활성 | 드라이버 업데이트 후 `caching_sha2_password` 사용 |

모니터링: `Threads_connected` / `max_connections` 비율 80%대에서 경보, `Threads_running`(실제 일하는 스레드) 급증 여부.

### 5. 스키마 변경 (DDL)

- 큰 테이블 `ALTER TABLE`이 메타데이터 락(MDL)을 기다리며 **뒤따르는 모든 쿼리를 막는** 사고가 흔하다. 앞에 긴 트랜잭션이 하나만 있어도 발생.
- 해결:
  - `ALGORITHM=INSTANT`(8.0.29+ 컬럼 추가·삭제 대부분) / `INPLACE` 가능 여부 먼저 확인
  - `lock_wait_timeout`을 짧게 두고 실패하면 재시도
  - 온라인 스키마 변경 도구: **gh-ost**, **pt-online-schema-change**
  - 마이그레이션 도구(Flyway/Liquibase)로 변경 이력 관리

### 6. 데이터 타입·문자셋 함정

| 함정 | 해결 |
|---|---|
| `utf8`(=utf8mb3)로 이모지 저장 실패 | `utf8mb4` + `utf8mb4_0900_ai_ci` |
| 정렬·비교 시 대소문자·악센트 무시(`_ai_ci`)로 유니크 충돌 | 구분이 필요한 컬럼은 `utf8mb4_bin` 또는 `_as_cs` collation |
| 랜덤 UUID PK → 클러스터드 인덱스 페이지 분할, 삽입 느림 | `BIGINT AUTO_INCREMENT` 또는 시간 순 UUIDv7을 `BINARY(16)`로 |
| 금액에 `FLOAT`/`DOUBLE` | `DECIMAL` |
| `TIMESTAMP` 2038년 한계·세션 타임존 변환 | `DATETIME` + 애플리케이션에서 UTC 고정 |
| `sql_mode` 느슨하게 → 잘린 값이 경고만 내고 저장 | `STRICT_TRANS_TABLES` 유지 (8.x 기본) |

### 7. 디스크·메모리

- `innodb_buffer_pool_size`가 작으면 디스크 I/O 폭증. Buffer Pool 적중률(`Innodb_buffer_pool_reads` / `read_requests`)을 본다.
- binlog가 디스크를 채움 → `binlog_expire_logs_seconds` 설정(기본 30일).
- 대량 삭제 후에도 파일 크기가 안 줄어듦 → InnoDB는 공간을 재사용만 함. 줄이려면 `OPTIMIZE TABLE`(= 테이블 재작성, 온라인 도구 권장).
- 임시 테이블이 디스크로 넘침(`Created_tmp_disk_tables` 증가) → 쿼리 개선이 먼저, 그다음 `tmp_table_size`.

### 8. 보안

- `root` 원격 접속 금지, 애플리케이션별 최소 권한 계정, 3306 포트 외부 비공개.
- SQL 인젝션: 문자열 이어 붙이기 대신 **PreparedStatement/바인딩 파라미터**. MyBatis는 `${}` 대신 `#{}`.
- TLS 연결(`require_secure_transport=ON`).
- 8.0은 EOL 이후 보안 패치가 없다 → **8.4 또는 9.7 LTS로 업그레이드**.

### 9. 모니터링 체크리스트

| 지표 | 확인 |
|---|---|
| QPS·느린 쿼리 수 | `Questions`, `Slow_queries`, slow log |
| 연결 | `Threads_connected`, `Threads_running`, `Aborted_connects` |
| 락 | `Innodb_row_lock_waits`, `Innodb_row_lock_time`, 데드락 로그 |
| Buffer Pool | 적중률, `Innodb_buffer_pool_pages_dirty` |
| undo | `History list length` |
| 복제 | → [장애 대응과 고가용성](./mysql-failure-and-high-availability.md) |

수집은 `mysqld_exporter` + Prometheus/Grafana, Percona Monitoring and Management(PMM), 클라우드라면 RDS Performance Insights / CloudWatch Database Insights 등.

## 관련 문서

- [MySQL의 역사](./history.md)
- [MySQL 개요와 기본 사용법](./mysql-overview-and-basic-usage.md)
- [MySQL 장애 대응과 고가용성](./mysql-failure-and-high-availability.md)
- [MySQL/PostgreSQL 락 처리 차이](../mysql-postgresql/mysql-postgresql-lock-handling-differences.md)

## 참고 자료

- [Troubleshooting Common MySQL Performance Issues — Percona](https://www.percona.com/blog/troubleshooting-common-mysql-performance-issues/)
- [MySQL Monitoring: The Complete 2026 Guide — Guance](https://www.guance.com/learn/articles/mysql-monitoring-guide)
- [MySQL Locks: What Data Engineers Need to Know — Airbyte](https://airbyte.com/data-engineering-resources/mysql-locks)
- [MySQL zombie connections on a read replica](https://kaungmyathan.netlify.app/blog/mysql-zombie-connections-read-replica)
- [MySQL 8.4 Reference Manual — Deadlocks in InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlocks.html)
- [MySQL 8.4 Reference Manual — Online DDL Operations](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-operations.html)
- [HikariCP — About Pool Sizing](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)
