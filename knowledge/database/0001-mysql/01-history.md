---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# MySQL의 역사

## 쉬운 설명

1990년대 중반, 웹사이트들은 데이터를 담을 장부가 필요했지만 좋은 장부(Oracle 등)는 너무 비쌌다. 스웨덴 개발자들이 **빠르고 공짜인 장부**를 만들어 나눠 줬고, 인터넷의 거의 모든 사이트가 그걸 썼다. 이후 장부 회사는 Sun, 다시 Oracle에 팔렸고, 원래 만든 사람은 걱정이 돼서 똑같은 장부(MariaDB)를 따로 만들었다.

## 일반 설명

### 1. 등장 배경 (1994~1995)

- 스웨덴의 **Michael "Monty" Widenius**, **David Axmark**, **Allan Larsson**이 1994년 개발을 시작해 1995년 **MySQL AB**를 세우고 첫 버전을 공개했다.
- 기존 사내 도구(mSQL과 자체 ISAM 기반 UNIREG)로는 속도·기능이 부족해 직접 만든 SQL 서버였다. 이름의 "My"는 Monty의 딸 이름, 로고의 돌고래 이름은 Sakila.
- 당시 상용 DB(Oracle, DB2, SQL Server)는 비싸고 무거웠다. MySQL은 **빠른 읽기, 쉬운 설치, 무료(GPL)** 로 웹 초창기의 수요에 정확히 맞았고, **LAMP 스택**(Linux·Apache·MySQL·PHP)의 M이 됐다.
- 초기 MySQL은 트랜잭션·외래 키가 없는 MyISAM 엔진 중심이라 "빠르지만 장난감 DB"라는 평가도 받았다.

### 2. 주요 변천

| 시기 | 버전/사건 | 핵심 변화 | 해결하려던 문제 |
|---|---|---|---|
| 2001 | 3.23 | **InnoDB** 엔진 통합 (Innobase Oy 개발) | 트랜잭션·행 단위 락·크래시 복구 |
| 2003~2004 | 4.0 / 4.1 | 쿼리 캐시, 서브쿼리, UTF-8 | SQL 표준 기능 부족 |
| 2005 | 5.0 | 저장 프로시저, 뷰, 트리거 | 엔터프라이즈 기능 |
| 2005.10 | — | **Oracle이 Innobase 인수** | (MySQL의 핵심 엔진을 경쟁사가 소유하게 됨) |
| 2008 | 5.1 / **Sun이 MySQL AB 인수 ($10억)** | 파티셔닝, 행 기반 복제 | — |
| 2009 | **MariaDB 포크** | Monty가 Oracle의 Sun 인수에 반발해 포크 | 오픈소스 독립성 |
| 2010.01 | **Oracle의 Sun 인수 완료** | MySQL이 Oracle 소유가 됨 | — |
| 2010 | 5.5 | **InnoDB가 기본 엔진**, 반동기 복제 | 데이터 안정성 기본값화 |
| 2013 | 5.6 | **GTID**, 온라인 DDL, 성능 스키마 강화 | 복제 장애 조치, 무중단 스키마 변경 |
| 2015 | 5.7 | JSON 타입, 다중 소스 복제, **Group Replication**(5.7.17, 2016) | 반정형 데이터, 자동 장애 조치 |
| 2018 | **8.0** | 트랜잭션 데이터 딕셔너리, CTE·윈도 함수, 역할(Role), `caching_sha2_password`, 쿼리 캐시 제거, `utf8mb4` 기본 | SQL 기능 격차 해소, 보안 |
| 2018~2023 | 8.0.x | **패치 버전에 신기능을 계속 추가**(InnoDB Cluster, ClusterSet, INSTANT DDL 등) | — 하지만 "패치 업그레이드인데 동작이 바뀐다"는 불만 |
| 2023 | 릴리스 모델 변경 | **LTS / Innovation** 이원화 | 안정성과 신기능 분리 |
| 2024 | **8.4 LTS**, 9.0 Innovation | `mysql_native_password` 기본 비활성, 9.0에 `VECTOR` 타입 | 보안 기본값, AI 워크로드 |
| 2025 | — | MySQL 30주년 | — |
| 2026.04 | **9.7 LTS** | 8.4 이후 첫 LTS. 동시에 **8.0 EOL** | — |
| 2026.07 | **26.7** Innovation | **캘린더 버전(연.월)** 으로 번호 체계 변경 | 버전 의미 명확화 |

### 3. 생태계와 포크

| 제품 | 관계 | 특징 |
|---|---|---|
| **MariaDB** | 2009 포크 | 리눅스 배포판 다수가 기본 MySQL로 채택. 10.x부터 MySQL과 점점 갈라짐(InnoDB도 독자 버전) — 완전 호환으로 보면 안 된다 |
| **Percona Server for MySQL** | 드롭인 대체 | MySQL 호환 + 운영 도구(XtraBackup, PMM, Toolkit) |
| **Amazon Aurora MySQL** | 클라우드 재구현 | 스토리지 계층을 분산 저장소로 분리 |
| **Vitess / PlanetScale** | 샤딩 미들웨어 | YouTube에서 시작, MySQL 수평 확장 |
| **TiDB** | MySQL 프로토콜 호환 분산 DB | NewSQL |

각 대안을 언제 고르나는 [트레이드오프 — 대안 비교](./03-tradeoffs.md#2-대안-비교)에서 다룬다.

### 4. 현재 상태 (2026년 11월)

- 지원 버전: **8.4 LTS**(~2032.04), **9.7 LTS**(~2034.04), 26.x Innovation. 8.0은 2026년 4월 EOL.
- 업그레이드 경로는 LTS를 건너뛸 수 없다: **8.0 → 8.4 → 9.7**.
- 웹 서비스 OLTP DB로 여전히 가장 널리 쓰이는 축이지만, 신규 프로젝트에서는 확장성·SQL 기능 때문에 PostgreSQL을 택하는 비중이 커지고 있다. MySQL은 **복제·운영 생태계의 성숙도**와 매니지드 서비스 선택지가 강점이다.

## 관련 문서

- [MySQL 개요와 기본 사용법](./02-overview.md)
- [MySQL 트레이드오프 — 무엇을 얻고 무엇을 포기했나, 언제 고르나](./03-tradeoffs.md)
- [MySQL 운영 시 자주 겪는 문제와 해결 방법](./04-pitfalls.md)
- [MySQL 장애 대응과 고가용성](./05-failure-modes.md)
- [MySQL과 PostgreSQL의 락 처리 차이](../../../inquiry/database/0005-mysql-postgresql-lock-handling-differences.md)

## 참고 자료

- [MySQL — Wikipedia](https://Www.Wikipedia.org/wiki/MySQL)
- [The history of MySQL AB — Dries Buytaert](https://dri.es/node/1516)
- [MySQL/MariaDB story — MariaDB Foundation (PDF)](https://mariadb.org/wp-content/uploads/2019/11/MySQL-MariaDB-story.pdf)
- [Ghosts of MySQL Past Part 5: The Era of Acquisitions — Stewart Smith](https://www.flamingspork.com/blog/tag/falcon/)
- [Timeline: Important dates for MySQL and the Oracle/Sun merger — KEI](https://www.keionline.org/24872)
- [30 years of MySQL — The Register](https://www.theregister.com/2025/05/06/30_years_mysql/?td=rt-3a)
- [MySQL 9.7 is out and the community wins — Oracle MySQL Blog](https://blogs.oracle.com/mysql/mysql-9-7-is-out-and-the-community-wins)
- [MySQL 9.7 LTS — InfoQ](https://infoq.com/news/2026/05/mysql-97-lts/)
- [MySQL 9.7 다음 버전은 26.7 — youngju.dev](https://www.youngju.dev/blog/2026-07-16-mysql-9-7-lts-calendar-versioning.en)
- [MySQL — endoflife.date](https://endoflife.date/mysql)
