---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# MySQL 개요와 기본 사용법

## 쉬운 설명

MySQL은 **칸이 딱 정해진 큰 장부(표)** 를 관리하는 사서다. 장부에 적는 규칙(스키마)이 엄격해서 엉뚱한 값은 거절하고, 여러 사람이 동시에 고쳐도 장부가 꼬이지 않게 순서를 정리해 준다. 책갈피(인덱스)를 잘 꽂아 두면 수백만 줄 중에서도 금방 찾는다.

## 일반 설명

### 1. MySQL이란

- 1995년 공개된 **오픈소스 관계형 DB(RDBMS)**. 현재 Oracle 소유. Community Edition은 **GPLv2**, 상용 Enterprise Edition 별도. 역사는 [history.md](./01-history.md) 참고.
- AWS RDS/Aurora MySQL, Google Cloud SQL, Azure Database for MySQL 등 매니지드 서비스로 가장 널리 쓰이는 OLTP DB 중 하나.
- **지금 쓸 버전**: 신규는 **8.4 LTS 또는 9.7 LTS**. 8.0은 2026년 4월 EOL이므로 업그레이드 대상.
  - 8.4부터 `mysql_native_password`가 기본 비활성 → 구형 드라이버 접속 실패 주의.
  - 복제 용어가 master/slave → **source/replica**로 바뀜(`SHOW REPLICA STATUS`).

### 2. MySQL이 해결하는 문제

| 문제 | MySQL의 해법 |
|---|---|
| 데이터를 파일로 관리하면 중복·불일치 | **정규화된 테이블 + 외래 키 + 제약 조건** |
| 여러 사용자가 동시에 수정 | **트랜잭션(ACID)**, MVCC, 행 단위 락 |
| 대량 데이터에서 빠른 검색 | **B+Tree 인덱스** |
| 서버가 죽어도 커밋한 데이터 보존 | redo log(WAL)·doublewrite buffer로 크래시 복구 |
| 읽기 부하 분산, 장애 대비 | binlog 기반 복제 → [장애 대응과 고가용성](./05-failures.md) |

### 3. 아키텍처 핵심

```
[클라이언트] ─▶ 연결 관리(연결당 스레드) ─▶ 파서 ─▶ 옵티마이저 ─▶ 스토리지 엔진 API
                                                              ├─ InnoDB (기본, 트랜잭션)
                                                              └─ MyISAM, Memory 등
```

- **플러그인형 스토리지 엔진**: SQL 처리 계층과 저장 계층이 분리. 사실상 표준은 **InnoDB**(5.5부터 기본).
- **InnoDB 핵심 구성**:

| 구성 요소 | 역할 |
|---|---|
| **클러스터드 인덱스** | 테이블 데이터 자체가 PK 순서의 B+Tree. 보조 인덱스는 PK 값을 가리킨다 → PK는 짧고 순차적인 값(AUTO_INCREMENT, UUIDv7)이 유리 |
| **Buffer Pool** | 16KB 페이지 캐시. `innodb_buffer_pool_size`를 전용 서버 메모리의 50~75%로 |
| **redo log** | 변경을 먼저 순차 기록(WAL) → 크래시 후 재적용 |
| **undo log** | 롤백 + MVCC 옛 버전 제공 |
| **doublewrite buffer** | 페이지 쓰기 도중 전원 차단으로 생기는 "찢어진 페이지" 방지 |
| **binlog** (서버 계층) | 커밋된 변경의 논리 로그 → 복제, 시점 복구(PITR), CDC(Debezium) |

### 4. 트랜잭션과 격리 수준

| 격리 수준 | Dirty Read | Non-repeatable Read | Phantom | MySQL 동작 |
|---|---|---|---|---|
| READ UNCOMMITTED | 발생 | 발생 | 발생 | 거의 안 씀 |
| READ COMMITTED | ✗ | 발생 | 발생 | 문장마다 새 스냅샷, gap lock 거의 없음 |
| **REPEATABLE READ (기본)** | ✗ | ✗ | 일반 SELECT ✗ / 잠금 읽기는 **next-key lock**으로 방지 | 트랜잭션 첫 읽기 시점 스냅샷 |
| SERIALIZABLE | ✗ | ✗ | ✗ | 일반 SELECT도 공유 락 |

- 일반 `SELECT`는 락 없는 **MVCC 스냅샷 읽기**, `SELECT ... FOR UPDATE`·`UPDATE`·`DELETE`는 **현재 값 읽기 + 락**. 같은 트랜잭션 안에서도 두 읽기의 결과가 다를 수 있다.
- 락 세부 동작: [gap/next-key lock 정리](../../../inquiry/database/0003-mysql-gap-lock-next-key-lock-mechanism-and-terms.md), [RR에서 next-key lock이 걸리는 경우](../../../inquiry/database/0016-mysql-rr-next-key-lock-cases.md), [PostgreSQL과 락 처리 차이](../../../inquiry/database/0005-mysql-postgresql-lock-handling-differences.md)

### 5. 바로 써 보기

```bash
docker run -d --name mysql -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=secret -e MYSQL_DATABASE=shop \
  mysql:8.4

docker exec -it mysql mysql -uroot -psecret shop
```

```sql
-- 테이블
CREATE TABLE users (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(255) NOT NULL,
  name       VARCHAR(100) NOT NULL,
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE orders (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NOT NULL,
  status     VARCHAR(20)     NOT NULL,
  amount     DECIMAL(12,2)   NOT NULL,
  created_at DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_orders_user_created (user_id, created_at),   -- 복합 인덱스
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- 조회 + 실행 계획
EXPLAIN ANALYZE
SELECT o.id, o.amount
FROM orders o
WHERE o.user_id = 42 AND o.created_at >= '2026-11-01'
ORDER BY o.created_at DESC
LIMIT 20;

-- 트랜잭션
START TRANSACTION;
SELECT amount FROM accounts WHERE id = 1 FOR UPDATE;   -- 행 잠금
UPDATE accounts SET amount = amount - 100 WHERE id = 1;
UPDATE accounts SET amount = amount + 100 WHERE id = 2;
COMMIT;

-- 있으면 갱신, 없으면 삽입 (upsert)
INSERT INTO users (email, name) VALUES ('a@x.com', 'kim') AS new
ON DUPLICATE KEY UPDATE name = new.name;
```

**문자셋**: 반드시 `utf8mb4`. MySQL의 옛 `utf8`(= `utf8mb3`)은 3바이트까지라 이모지·일부 한자가 깨진다.

### 6. 8.0 이후 자주 쓰는 SQL 기능

```sql
-- CTE + 윈도 함수: 사용자별 최근 주문 1건
WITH ranked AS (
  SELECT o.*, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM orders o
)
SELECT * FROM ranked WHERE rn = 1;

-- JSON 컬럼 + 생성 컬럼 인덱스
ALTER TABLE users ADD COLUMN profile JSON,
  ADD COLUMN city VARCHAR(50) AS (profile->>'$.address.city') STORED,
  ADD INDEX idx_users_city (city);

-- 대기 없이 잠긴 행 건너뛰기 (작업 큐 패턴)
SELECT id FROM jobs WHERE status = 'READY'
ORDER BY id LIMIT 10 FOR UPDATE SKIP LOCKED;
```

### 7. 인덱스 기본 원칙

- 복합 인덱스는 **왼쪽부터** 사용된다(leftmost prefix). `(user_id, created_at)`은 `user_id` 조건 없이 `created_at`만으로는 거의 못 쓴다.
- 순서: **등호 조건 컬럼 → 범위/정렬 컬럼**.
- 조회 컬럼이 모두 인덱스에 있으면 테이블 접근 없이 끝난다(**커버링 인덱스**, EXPLAIN의 `Using index`).
- 인덱스 컬럼에 함수·형변환을 걸면 못 탄다: `WHERE DATE(created_at) = ...` ✗ → `created_at >= ... AND created_at < ...` ✓. (8.0.13+ 함수형 인덱스로 우회 가능)
- 인덱스는 쓰기 비용과 메모리를 늘린다. 안 쓰는 인덱스는 `sys.schema_unused_indexes`로 찾아 정리.

**EXPLAIN 읽는 법 (핵심 컬럼)**

| 컬럼 | 볼 것 |
|---|---|
| `type` | 좋은 순: `const` > `eq_ref` > `ref` > `range` > `index` > **`ALL`(풀스캔)** |
| `key` | 실제 선택된 인덱스 (NULL이면 인덱스 미사용) |
| `rows` | 예상 검사 행 수 |
| `Extra` | `Using index`(커버링) 좋음 / `Using filesort`, `Using temporary` 주의 |

### 8. 사용자와 권한

```sql
CREATE USER 'app'@'10.0.%' IDENTIFIED BY '...';
GRANT SELECT, INSERT, UPDATE, DELETE ON shop.* TO 'app'@'10.0.%';

CREATE ROLE 'readonly';
GRANT SELECT ON shop.* TO 'readonly';
GRANT 'readonly' TO 'analyst'@'%';
SET DEFAULT ROLE 'readonly' TO 'analyst'@'%';
```

- 애플리케이션 계정에는 DDL·`SUPER` 권한을 주지 않는다. 마이그레이션 계정을 따로 둔다.

### 9. 애플리케이션 연결 (Spring Boot)

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/shop?serverTimezone=UTC&characterEncoding=UTF-8
    username: app
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 10
      connection-timeout: 3000      # ms, 풀에서 연결 대기 한도
      max-lifetime: 1700000         # DB wait_timeout보다 짧게
  jpa:
    open-in-view: false
```

### 10. 언제 다른 걸 고려하나

| 상황 | 대안 |
|---|---|
| 복잡한 분석 쿼리·대용량 집계 | ClickHouse 등 컬럼형 DB, 데이터 웨어하우스 |
| 고급 SQL·확장(지리정보, 벡터, 커스텀 타입)이 중요 | PostgreSQL (PostGIS, pgvector) |
| 단일 노드를 넘는 쓰기 확장 | Vitess, TiDB, 애플리케이션 샤딩 |
| 스키마가 자주 바뀌는 문서형 데이터 위주 | MongoDB 등 (단, MySQL JSON으로도 상당 부분 가능) |
| 서브 밀리초 조회·카운터 | Redis를 앞단 캐시로 |

## 관련 문서

- [MySQL의 역사](./01-history.md)
- [MySQL 운영 시 자주 겪는 문제와 해결 방법](./04-pitfalls.md)
- [MySQL 장애 대응과 고가용성](./05-failures.md)
- [PostgreSQL RR의 MVCC vs MySQL](../../../inquiry/database/0007-postgresql-repeatable-read-mvcc-vs-mysql.md)

## 참고 자료

- [MySQL 8.4 Reference Manual — The InnoDB Storage Engine](https://dev.mysql.com/doc/refman/8.4/en/innodb-storage-engine.html)
- [MySQL 8.4 Reference Manual — Transaction Isolation Levels](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)
- [MySQL 8.4 Reference Manual — Optimization and Indexes](https://dev.mysql.com/doc/refman/8.4/en/optimization-indexes.html)
- [MySQL 8.4 Reference Manual — EXPLAIN Output Format](https://dev.mysql.com/doc/refman/8.4/en/explain-output.html)
- [MySQL 9.7 is out and the community wins — Oracle MySQL Blog](https://blogs.oracle.com/mysql/mysql-9-7-is-out-and-the-community-wins)
- [MySQL — endoflife.date](https://endoflife.date/mysql)
