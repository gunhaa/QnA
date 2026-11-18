---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# MySQL 트레이드오프 — 무엇을 얻고 무엇을 포기했나, 언제 고르나

## 쉬운 설명

MySQL은 **누구나 금방 몰 수 있는 튼튼한 소형 트럭**이다. 짐을 빨리 싣고 내리는 일(단순한 읽기·쓰기)과 고장 났을 때 정비소(운영 도구·매니지드 서비스)를 찾기 쉬운 것을 택했고, 대신 짐칸을 마음대로 개조하는 기능(확장·고급 SQL)과 트럭 여러 대를 한 대처럼 묶는 능력(쓰기 수평 확장)은 기본으로 주지 않는다.

## 일반 설명

> 동작 원리(InnoDB 구조, 격리 수준 표, 기본 SQL)는 [MySQL 개요와 기본 사용법](./02-overview.md), 고른 뒤 겪는 문제는 [자주 겪는 문제](./04-pitfalls.md)와 [장애 대응과 고가용성](./05-failures.md)에서 다룬다. 이 문서는 **왜 그렇게 만들었고 대가는 무엇인가, 언제 고르나**만 다룬다.

### 1. 핵심 설계 선택: 얻은 것과 포기한 것

| 설계 선택 | 얻은 것 | 포기한 것(대가) |
|---|---|---|
| **플러그인형 스토리지 엔진** (SQL 계층 ↔ 엔진 분리) | MyISAM → InnoDB 교체를 서버 재작성 없이 해냄. MyRocks(LSM, 쓰기·압축 유리) 같은 엔진 선택지 | 트랜잭션·락·통계가 서버/엔진 두 층에 나뉨 → **binlog(서버)와 redo log(InnoDB) 두 로그를 2PC로 맞춰야** 해서 커밋당 fsync가 늘어난다(`sync_binlog=1` + `innodb_flush_log_at_trx_commit=1`). 엔진 간 기능 불일치(MyISAM은 트랜잭션 없음) |
| **PK 클러스터드 인덱스** (테이블 = PK 순 B+Tree) | PK 조회·PK 범위 스캔이 한 번에 끝남. 보조 인덱스가 **물리 위치가 아니라 PK 값**을 가리켜, 인덱스 안 걸린 컬럼을 UPDATE하면 보조 인덱스를 안 고친다 | 보조 인덱스 조회는 **보조 → PK 두 번 탐색**("clustered index penalty"). PK가 길면 모든 보조 인덱스가 커지고, 랜덤 PK(UUIDv4)는 페이지 분할을 부른다 |
| **undo log 기반 MVCC** (제자리 갱신 + 옛 버전은 undo에) | 테이블에 죽은 행이 쌓이지 않아 PostgreSQL식 VACUUM 튜닝이 거의 필요 없음 | 긴 트랜잭션이 undo 정리(purge)를 막아 **History list가 불어나고** 읽기가 느려진다 → [04 §3](./04-pitfalls.md#3-긴-트랜잭션과-history-list) |
| **기본 격리 수준 REPEATABLE READ + gap/next-key lock** | 잠금 읽기에서도 팬텀 방지, 옛 statement 기반 복제와의 일관성 | 존재하지 않는 범위까지 잠가 **데드락·락 대기가 늘어난다**. 그래서 많은 대규모 서비스가 READ COMMITTED로 내린다(§3) |
| **연결당 스레드** (thread-per-connection) | 구현 단순, 연결 수가 적을 땐 지연이 가장 낮음. PostgreSQL의 연결당 프로세스보다 연결 1개가 가볍다 | 동시 연결 수백~수천에서 컨텍스트 스위칭으로 처리량 하락(Oracle 벤치마크: 약 512 연결부터 TPS 감소). 스레드 풀은 **Enterprise 또는 Percona/MariaDB**에만 있다 → 커뮤니티판은 앱 풀·ProxySQL로 연결 수를 묶어야 한다 |
| **binlog 기반 논리 복제** (기본 비동기) | replica 추가가 쉽고, 버전이 다른 노드·CDC(Debezium)·PITR이 같은 binlog를 공유 | 기본 비동기라 장애 조치 시 **유실 가능**, replica 적용이 source보다 느리면 지연. 무손실을 원하면 반동기·Group Replication으로 지연 시간을 대가로 낸다 |
| **단순함 우선** (기능보다 쉬운 운영) | 설치·튜닝 변수가 적고, 경험자·도구(XtraBackup, gh-ost, Orchestrator)·매니지드 선택지가 가장 많다 | PostgreSQL 대비 확장 생태계(PostGIS, pgvector급), 부분 인덱스, 트랜잭션 DDL, 풍부한 타입·인덱스 종류(GIN/GiST/BRIN)가 없거나 약하다. 9.0의 `VECTOR` 타입도 커뮤니티판엔 벡터 인덱스가 없다 |

**사례 — Uber(2016)**: Uber는 PostgreSQL에서 MySQL로 옮기며 "PostgreSQL은 인덱스가 걸린 행을 고치면 모든 인덱스에 새 튜플을 쓰고 그것이 WAL·복제로 증폭된다"는 쓰기 증폭을 이유로 들었다. InnoDB는 보조 인덱스가 PK를 가리켜 이 비용이 작다. 반론(Markus Winand 등)은 그 대가가 바로 보조 인덱스 조회 시의 이중 탐색이고, PostgreSQL은 HOT 업데이트·fillfactor로 상당 부분 완화한다는 것이다. **쓰기 많은 넓은 테이블 vs 보조 인덱스 위주 읽기** 중 무엇이 많은지가 갈림길이다.

### 2. 대안 비교

| 대안 | MySQL 대비 얻는 것 | 잃는 것 / 주의 | 고를 때 |
|---|---|---|---|
| **PostgreSQL** | 확장(PostGIS·pgvector·TimescaleDB), 부분·표현식·GIN 인덱스, 트랜잭션 DDL, 엄격한 SQL. 2025 Stack Overflow 설문 사용률(전체 응답자) 약 56% vs MySQL 약 40% | VACUUM·bloat 관리, 연결당 프로세스라 PgBouncer 거의 필수, 기본 격리 수준이 READ COMMITTED이고 RR 의미가 MySQL과 다름 | 복잡한 쿼리·다양한 데이터 타입·확장이 중요할 때 |
| **MariaDB** | 커뮤니티판에 스레드 풀·Galera·시스템 버전 테이블 포함 | 10.x 이후 **호환이 갈라짐**: GTID 형식이 달라 MySQL ↔ MariaDB 복제가 제한적, JSON은 바이너리 타입이 아니라 `LONGTEXT` 별칭, 8.0+ 기능 일부 없음 | 리눅스 배포판 기본·Galera 멀티 마스터가 필요할 때. "MySQL 드롭인"으로 가정하면 안 된다 |
| **Aurora MySQL** | 스토리지를 3 AZ·6벌 분산 볼륨으로 분리 → 최대 128 TiB, replica 최대 15대가 같은 볼륨 공유(AWS 문서: 복제 지연 보통 100ms보다 훨씬 짧음). 장애 조치 동작은 [05 §6](./05-failures.md#6-매니지드-서비스의-ha) | AWS 종속, 엔진 버전이 커뮤니티보다 늦게 따라옴, 비용 구조 복잡(Standard는 I/O 요청당 과금, I/O-Optimized는 I/O 무료 대신 인스턴스·스토리지 단가 인상 — AWS 안내 기준 I/O가 Aurora 비용의 25%를 넘으면 유리, 실제 손익분기는 워크로드마다 다름) | AWS에서 운영 부담을 줄이고 읽기 확장이 필요할 때 |
| **Vitess / PlanetScale** | MySQL 앞단 샤딩 미들웨어(YouTube 출신). 쓰기 수평 확장, 온라인 리샤딩, 실제 MySQL 엔진 사용 | 샤드 키 설계 필요, 교차 샤드 조인·트랜잭션·외래 키 제약(외래 키는 단일 샤드 범위에서부터 지원) | 단일 primary 쓰기 한계를 넘었고 MySQL 운영 경험을 살리고 싶을 때 |
| **TiDB** | MySQL 프로토콜 호환 분산 SQL(Raft, TiKV). 샤드 키 없이 노드 추가로 확장, HTAP(TiFlash) | 컴포넌트가 많아 운영 복잡(PD·TiKV·TiDB), 단건 지연은 단일 MySQL보다 높음, 일부 MySQL 기능·동작 차이 | 수십 TB 이상·쓰기 확장이 필요한데 애플리케이션 샤딩은 피하고 싶을 때 |

PostgreSQL과의 락·MVCC 차이는 [MySQL과 PostgreSQL의 락 처리 차이](../../../inquiry/database/0005-mysql-postgresql-lock-handling-differences.md), [PostgreSQL RR의 MVCC vs MySQL](../../../inquiry/database/0007-postgresql-repeatable-read-mvcc-vs-mysql.md)에서 자세히 다룬다.

### 3. 주요 선택지

**격리 수준**

| 선택 | 얻는 것 | 대가 | 맞는 경우 |
|---|---|---|---|
| REPEATABLE READ (기본) | 트랜잭션 전체 스냅샷, 잠금 읽기 팬텀 방지 | gap/next-key lock으로 데드락·INSERT 대기 증가 | 기본값을 바꿀 근거가 없을 때, 정합성이 락 범위로 보장돼야 할 때 |
| READ COMMITTED | gap lock 대부분 사라짐(외래 키·중복 키 검사 제외), 락 경합 감소 | 같은 트랜잭션에서 값이 바뀔 수 있음. **binlog를 ROW로** 써야 함 | 쓰기 경합이 큰 OLTP. PostgreSQL·Oracle 기본값과 같아 이식에 유리 |

락이 실제로 어디에 걸리는지: [RR에서 next-key lock이 걸리는 경우](../../../inquiry/database/0016-mysql-rr-next-key-lock-cases.md), [gap lock 용어 정리](../../../inquiry/database/0003-mysql-gap-lock-next-key-lock-mechanism-and-terms.md).

**binlog 형식**

| 형식 | 장점 | 단점 | 판단 |
|---|---|---|---|
| **ROW** (8.x 기본) | 결정적, CDC·RC 격리와 호환 | 대량 UPDATE 시 binlog 크기 폭증(100만 행 UPDATE = 100만 행 이미지) → `binlog_row_image=MINIMAL`로 완화 | 기본으로 쓴다 |
| STATEMENT | binlog 작음 | `NOW()`·`LIMIT` 없는 순서 등 비결정 문장이 replica에서 다르게 실행 | 쓰지 않는다 |
| MIXED | 둘의 절충 | 어떤 문장이 어떻게 기록될지 예측 어려움 | 레거시 호환용 |

`binlog_format` 변수 자체가 8.0.34부터 deprecated이며, 장기적으로 ROW만 남을 예정이다.

**복제·고가용성 모드** (동작 방식·구성 절차·장애 조치는 [05 §3 복제 방식](./05-failures.md#3-복제-방식), [05 §5 고가용성 구성 선택지](./05-failures.md#5-고가용성-구성-선택지))

| 모드 | 커밋 지연 비용 | 유실(RPO) | 제약 |
|---|---|---|---|
| 비동기 | 없음 | 지연만큼 유실 가능 | 장애 조치 도구 별도 |
| 반동기(AFTER_SYNC) | 커밋마다 replica ACK 1 RTT (같은 AZ 수백 µs, AZ 간 ~1ms) | 거의 0 | ACK 타임아웃 시 **비동기로 강등** → 그 순간부터 RPO가 비동기와 같아진다 |
| Group Replication / InnoDB Cluster | 과반 합의 1 RTT + 충돌 인증 | 과반 생존 시 0 | 최대 **9대**, 트랜잭션 크기 기본 한도 150,000,000바이트(~143MiB) 초과 시 롤백, 모든 테이블 PK 필수, 멀티 primary는 충돌 시 롤백되므로 단일 primary 권장 |
| InnoDB ClusterSet | 리전 내는 위와 같음 | 리전 간은 비동기 | DR 전용 |

**릴리스 트랙**

| 트랙 | 특징 | 고를 때 |
|---|---|---|
| **LTS** (8.4, 9.7) | 패치에 버그·보안 수정만, 동작 변화 최소 | 운영 DB 기본값 |
| **Innovation** (26.x, 분기마다) | 신기능 먼저, 다음 Innovation이 나오면 지원 종료 | 신기능 검증·개발 환경. 운영에 쓰면 분기마다 업그레이드를 감수 |

버전별 지원 종료일과 업그레이드 경로(LTS는 건너뛸 수 없음)는 [역사 — 현재 상태](./01-history.md#4-현재-상태-2026년-11월).

**자체 운영 vs 매니지드**

| 선택 | 얻는 것 | 포기하는 것 |
|---|---|---|
| 자체 운영(VM·베어메탈·K8s Operator) | 모든 설정·플러그인·버전 통제, 장기적으로 저렴 | HA·백업·업그레이드·모니터링을 직접 |
| RDS for MySQL | 백업·패치·Multi-AZ 자동 | `SUPER` 권한 없음, 일부 플러그인 불가, 버전 선택 제한 |
| Aurora MySQL / Cloud SQL / Azure | 위 + 스토리지 자동 확장, 빠른 장애 조치 | 벤더 종속, I/O·replica 비용, 이관 시 재작업 |

### 4. 쓰지 말아야 할 때

| 상황 | 이유 | 대안 |
|---|---|---|
| 수억 행 집계·대시보드가 주 업무 | 행 지향 + 단일 스레드 쿼리 실행이라 집계가 느리다(가속 엔진 HeatWave는 Oracle이 운영하는 클라우드 서비스(OCI·AWS·Azure)로만 제공되고 커뮤니티판엔 없다) | ClickHouse 등 컬럼형 DB, 웨어하우스 |
| 지리정보·전문 검색·벡터 검색이 핵심 | 공간·FULLTEXT 기능이 PostGIS·전용 엔진보다 약함, 커뮤니티판 벡터 인덱스 없음 | PostgreSQL(+PostGIS·pgvector), Elasticsearch/OpenSearch |
| 단일 primary 쓰기 한계를 처음부터 넘을 게 확실 | MySQL 자체는 쓰기 수평 확장 기능이 없음 | Vitess, TiDB, 분산 SQL |
| 복잡한 SQL·트랜잭션 DDL·풍부한 제약(부분 유니크, EXCLUDE)에 의존 | 미지원 | PostgreSQL |
| 수천 개 동시 연결을 직접 받아야 함(서버리스 함수 등) | 커뮤니티판엔 스레드 풀 없음 | 프록시(RDS Proxy·ProxySQL) 필수, 또는 HTTP 기반 서버리스 DB |
| 스키마 없는 문서 위주, 필드가 계속 바뀜 | JSON 컬럼 가능하지만 인덱스는 생성 컬럼 경유 | MongoDB 등 |

### 5. 선택 체크리스트

- [ ] 워크로드가 **짧은 OLTP**(PK·보조 인덱스 조회, 단건 쓰기)가 대부분인가? → MySQL의 강점
- [ ] 팀에 MySQL 운영 경험·도구(XtraBackup, gh-ost, PMM)가 있나, 아니면 PostgreSQL 경험이 더 많나?
- [ ] PostGIS·pgvector·부분 인덱스·트랜잭션 DDL 같은 PostgreSQL 전용 기능이 **필수**인가? → 예면 PostgreSQL
- [ ] 예상 쓰기량이 단일 primary(대형 인스턴스 기준 수만 TPS 수준)를 3년 안에 넘는가? → 넘으면 Vitess/TiDB를 처음부터 검토
- [ ] RPO 0이 필요한가? → 반동기 또는 InnoDB Cluster(3대 이상), 그 커밋 지연을 감수할 수 있나
- [ ] 쓰기 경합이 큰가? → READ COMMITTED + ROW binlog를 검토
- [ ] 동시 연결 수가 수백을 넘나? → 커넥션 풀·프록시 설계
- [ ] 버전 트랙은 LTS(8.4 또는 9.7)로 정했나? 8.0 사용 중이면 EOL(2026.04) 이후 업그레이드 계획이 있나
- [ ] 매니지드라면 `SUPER` 없음·플러그인 제한·I/O 과금 구조가 문제없나?
- [ ] MariaDB를 "MySQL 호환"으로 섞어 쓸 계획이 있나? → GTID·JSON 차이 확인

## 관련 문서

- [MySQL의 역사](./01-history.md)
- [MySQL 개요와 기본 사용법](./02-overview.md)
- [MySQL 운영 시 자주 겪는 문제와 해결 방법](./04-pitfalls.md)
- [MySQL 장애 대응과 고가용성](./05-failures.md)
- [MySQL과 PostgreSQL은 락(Lock)을 다루는 방식이 다르다](../../../inquiry/database/0005-mysql-postgresql-lock-handling-differences.md)
- [PostgreSQL을 REPEATABLE READ로 올리면 MVCC를 MySQL이랑 "똑같이" 쓰는 걸까?](../../../inquiry/database/0007-postgresql-repeatable-read-mvcc-vs-mysql.md)
- [MySQL RR에서 next-key lock은 어떤 경우에 걸리나](../../../inquiry/database/0016-mysql-rr-next-key-lock-cases.md)
- [MySQL InnoDB의 gap lock, 용어 정리](../../../inquiry/database/0003-mysql-gap-lock-next-key-lock-mechanism-and-terms.md)

## 참고 자료

- [Uber Engineering Switched from Postgres to MySQL — InfoQ](https://www.infoq.com/news/2016/08/Uber-Engineering-Postgres-MySQL)
- [On Uber's Choice of Databases — Markus Winand](https://use-the-index-luke.com/blog/2016-07-29/on-ubers-choice-of-databases)
- [Uber's Move Away from PostgreSQL — EDB](https://enterprisedb.com/blog/ubers-move-away-postgresql)
- [The New MySQL Thread Pool — Oracle MySQL Blog](https://blogs.oracle.com/mysql/post/the-new-mysql-thread-pool)
- [Thread pool — Percona Server 9.7](https://docs.percona.com/percona-server/9.7/threadpool.html)
- [Group Replication Limitations — MySQL Reference Manual](https://dev.mysql.com/doc/refman/9.6/en/group-replication-limitations.html)
- [Replication Formats — MySQL 8.0 Reference Manual](https://dev.mysql.com/doc/refman/8.0/en/replication-formats.html)
- [Configuring RDS for MySQL binary logging — AWS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQL.BinaryFormat.html)
- [Amazon Aurora storage and reliability — AWS](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.StorageReliability.html)
- [Replication with Amazon Aurora — AWS](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Replication.html)
- [Amazon Aurora pricing — AWS](https://aws.amazon.com/rds/aurora/pricing/)
- [Aurora I/O-Optimized — AWS News Blog](https://aws.amazon.com/blogs/aws/new-amazon-aurora-i-o-optimized-cluster-configuration-with-up-to-40-cost-savings-for-i-o-intensive-applications)
- [Incompatibilities Between MariaDB 10.6 and MySQL 8.0 — MariaDB](https://www.mariadb.com/docs/release-notes/compatibility-and-differences/incompatibilities-and-feature-differences-between-mariadb-10-6-and-mysql-8)
- [Challenges of supporting foreign key constraints — PlanetScale](https://planetscale.com/blog/challenges-of-supporting-foreign-key-constraints)
- [PlanetScale MySQL compatibility](https://planetscale.com/docs/vitess/mysql-compatibility.md)
- [MySQL vs TiDB — OneUptime](https://oneuptime.com/blog/post/2026-03-31-mysql-vs-tidb-mysql-compatible-distributed-db/markdown)
- [PostgreSQL: everyone uses Postgres but why — Pulse (Stack Overflow 2025 수치)](https://pulse.support/blog/postgresql-everyone-uses-postgres-but-why)
- [Stack Overflow 2025: PostgreSQL — Vonng](https://blog.vonng.com/en/pg/so2025-pg/)
- [HeatWave User Guide — Supported Cloud Platforms](https://dev.mysql.com/doc/heatwave/en/mys-hw-supported-cloud-platforms.html)
- [MySQL — endoflife.date](https://endoflife.date/mysql)
