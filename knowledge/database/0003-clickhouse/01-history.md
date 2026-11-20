---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# ClickHouse의 역사

## 쉬운 설명

러시아의 검색 회사 Yandex는 웹사이트 방문 기록을 매일 수십억 건씩 모아 "어제 어느 페이지에 몇 명이 왔나"를 바로 보여 줘야 했다. 기존 DB는 미리 계산해 둔 표만 빨리 보여 줄 수 있었고, 새 질문을 하면 너무 느렸다. 그래서 한 엔지니어가 **원본 기록을 그대로 쌓아 두고 질문이 올 때마다 즉석에서 세는 엔진**을 직접 만들었다. 그게 ClickHouse다. 사내 도구로 쓰다가 공개했고, 나중에는 아예 독립 회사가 됐다.

## 일반 설명

### 1. 등장 배경 (2009~2016)

- **Yandex.Metrica**(Google Analytics와 비슷한 웹 분석 서비스)는 원래 이벤트를 받아 **미리 집계한 결과**만 저장했다. 이 방식은 보고서 종류가 고정되고, 새로운 조건으로 자르면 처음부터 다시 계산해야 했다.
- **Alexey Milovidov**가 2009년부터 "집계하지 않은 원본 이벤트를 저장하고, 질의 시점에 실시간으로 집계"하는 컬럼 지향 엔진을 프로토타입했다.
- 2014년 Metrica 2.0이 ClickHouse 위에서 전면 동작하게 됐다. 이름은 **Click**stream data ware**House**에서 왔다.
- 2016년 6월 Yandex가 **Apache 2.0** 라이선스로 공개했다. 공개 당시 Milovidov의 표현은 "Yandex 안에서만 쓰기엔 너무 좋지 않나"였다.

풀려던 문제를 한 줄로 줄이면 **"미리 집계하지 않고, 원본 수십억 행을 질의 시점에 서브초로 집계하기"** 다. 이 목표가 컬럼 저장·벡터화 실행·스파스 인덱스라는 설계를 정했다 (원리는 [개요](./02-overview.md), 대가는 [트레이드오프](./03-tradeoffs.md)).

### 2. 조직 변천

| 시기 | 사건 |
|---|---|
| 2009~2016 | Yandex 사내 프로젝트 (Metrica 백엔드) |
| 2016.06 | 오픈소스 공개 (Apache 2.0) |
| **2021.09** | Yandex에서 분사해 **ClickHouse, Inc.** 설립. 공동 창업자 Alexey Milovidov(CTO), Yury Izrailevsky, Aaron Katz. Index Ventures·Benchmark 주도로 초기 5,000만 달러 투자 |
| 2022.10 | **ClickHouse Cloud** 퍼블릭 베타 (AWS) |
| 2022.12.06 | ClickHouse Cloud GA (SOC 2 Type II, SLA) |
| 2023.06 | ClickHouse Cloud Google Cloud GA |
| 2023.08 | Cloud 전용 엔진 **SharedMergeTree** 공개 (스토리지·컴퓨트 분리) |
| 2024.07 | **PeerDB** 인수 → Postgres CDC (ClickPipes) |
| 2025.03 | **HyperDX** 인수 → 관측성 스택 **ClickStack**의 UI ([ClickStack이란](../../../inquiry/database/0012-clickstack-overview.md)) |
| 2026.01 | **시리즈 D 4억 달러**(Dragoneer 주도, 기업가치 약 150억 달러), LLM 관측성 오픈소스 **Langfuse** 인수 |
| 2026.01.22 | **ClickHouse Managed Postgres** 발표 (Ubicloud와 협력, 프라이빗 프리뷰) |

방향은 "빠른 OLAP 엔진"에서 **Postgres(트랜잭션) + ClickHouse(분석) + 관측성**을 한 회사가 묶어 파는 데이터 플랫폼으로 넓어지는 중이다.

### 3. 주요 버전 변천

버전은 연·월 기반(CalVer, `YY.M`)이다. 아래는 큰 기능이 들어간 지점만 고른 것이다.

| 버전 | 시기 | 핵심 변화 | 해결하려던 문제 |
|---|---|---|---|
| 초기~21.x | 2016~2021 | MergeTree 계열, `ReplicatedMergeTree`(ZooKeeper 조정), `Distributed` 엔진, `ALTER ... UPDATE/DELETE` **뮤테이션** | 대량 적재·샤딩·복제. 수정·삭제는 파트 전체 재작성이라 무거움 |
| **22.3 LTS** | 2022.03 | **ClickHouse Keeper** 프로덕션 준비 (C++ 구현, Raft, ZooKeeper 프로토콜 호환) | JVM 기반 ZooKeeper 운영 부담 |
| 22.8 LTS | 2022.08 | **경량 DELETE**(`DELETE FROM`) 실험 기능 | 행 삭제 비용 |
| **23.3 LTS** | 2023.03 | 경량 DELETE **프로덕션 준비, 기본 활성** | GDPR 삭제 같은 요구 |
| 24.3 LTS | 2024.03 | **새 쿼리 분석기(analyzer)** 기본 활성 | 오래된 질의 해석기의 JOIN·서브쿼리 한계 |
| **25.3 LTS** | 2025.03 | 새 **JSON 타입** 프로덕션 준비 | 반정형 로그를 컬럼처럼 저장·질의 |
| 25.7 | 2025.07 | **경량 UPDATE**(SQL `UPDATE`, 패치 파트) 도입 | 뮤테이션 대비 최대 1,000배 빠른 갱신(벤더 벤치마크). 2026.11 문서 기준 아직 **베타** |
| 25.12 | 2025.12 | 다중 테이블 **JOIN 순서 재배치**·통계 기반 최적화 기본 활성 | 사람이 작은 테이블을 오른쪽에 두던 수동 튜닝 |
| 26.9 | 2026.09 | 새 분석기 **필수**(`enable_analyzer` 설정 폐지) | 옛 분석기 경로 정리 |

경량 DELETE·UPDATE가 왜 필요했고 어디까지 믿을 수 있는지는 [트레이드오프 — 핵심 설계 선택](./03-tradeoffs.md#1-핵심-설계-선택-얻은-것과-포기한-것)과 [자주 겪는 문제](./04-pitfalls.md)에 있다.

### 4. 릴리스 주기

| 구분 | 규칙 |
|---|---|
| 정기 릴리스 | 대략 **매월** 1개. **최근 3개** 릴리스만 버그·보안 수정 |
| **LTS** | 매년 **3월과 8월**의 릴리스 2개를 LTS로 지정, **1년** 지원 |
| Cloud | ClickHouse Cloud는 자체 일정으로 먼저 올라간다 (OSS와 버전이 다를 수 있음) |

정기 릴리스는 약 3개월이면 지원이 끝나므로, 직접 운영하면 **LTS를 따라가거나 매월 올리거나** 둘 중 하나를 정해야 한다.

### 5. 현재 상태 (2026년 11월)

- **최신 정기 릴리스**: 26.10 (2026.10 출시).
- **지원 중인 LTS**: **26.8**(2027.08까지), 26.3(2027.03까지). 25.8 LTS는 2026.08에 지원 종료.
- **라이선스**: 서버 코어는 여전히 **Apache 2.0**. Redis·Elasticsearch처럼 라이선스를 바꾼 적은 없다. SharedMergeTree 등 Cloud 전용 기능은 오픈소스에 없다.
- **배포 형태**: 셀프 호스팅(OSS), ClickHouse Cloud(AWS·GCP 등), 서드파티 빌드(Altinity Stable Builds 등).
- **임베디드 형태**: 서버 없이 파일을 질의하는 `clickhouse-local`, 파이썬 등에 넣어 쓰는 라이브러리 **chDB**.
- **경쟁 대상**:

| 대상 | 성격 | 라이선스 |
|---|---|---|
| Apache Druid | 실시간 OLAP, 세그먼트 사전 인덱싱 | Apache 2.0 |
| Apache Pinot | 사용자 대상 고QPS 저지연 분석, 업서트 | Apache 2.0 |
| StarRocks | MPP OLAP, 비용 기반 옵티마이저·조인 강점. 2022년 말 ELv2 → Apache 2.0, 2023.02 Linux Foundation 이관 | Apache 2.0 |
| DuckDB | 단일 프로세스 임베디드 분석 | MIT |
| Snowflake·BigQuery | 클라우드 데이터 웨어하우스 | 상용 |
| Elasticsearch·Loki | 로그 검색 ([비교](../../../inquiry/database/0011-clickhouse-vs-timeseries-and-log-db.md)) | — |

각 대안과 언제 무엇을 고르는지는 [트레이드오프 — 대안 비교](./03-tradeoffs.md#2-대안-비교)에 있다.

## 관련 문서

- [ClickHouse 개요와 동작 방식](./02-overview.md)
- [ClickHouse 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [ClickHouse 사용 시 자주 겪는 문제](./04-pitfalls.md)
- [ClickHouse 장애 유형과 복구](./05-failure-modes.md)
- [ClickHouse란 무엇인가](../../../inquiry/database/0009-clickhouse-overview.md)

## 참고 자료

- [ClickHouse — Wikipedia](https://en.wikipedia.org/wiki/ClickHouse)
- [ClickHouse, Inc. (분사 발표) — ClickHouse Blog](https://clickhouse.com/blog/en/2021/clickhouse-inc/)
- [Speedy Column Store ClickHouse Spins Out from Yandex, Raises $50M — BigDATAwire](https://bigdatawire.com/2021/09/24/speedy-column-store-clickhouse-spins-out-from-yandex-raises-50m)
- [ClickHouse Cloud is now Generally Available — ClickHouse Blog](https://clickhouse.com/blog/clickhouse-cloud-generally-available)
- [ClickHouse Cloud Expands Choice With Launch on Google Cloud Platform — Business Wire](https://businesswire.com/news/home/20230620435922/en/ClickHouse-Cloud-Expands-Choice-With-Launch-on-Google-Cloud-Platform)
- [ClickHouse Cloud boosts performance with SharedMergeTree and Lightweight Updates — ClickHouse Blog](https://clickhouse.com/blog/clickhouse-cloud-boosts-performance-with-sharedmergetree-and-lightweight-updates)
- [Real-time database startup ClickHouse acquires PeerDB — TechCrunch](https://techcrunch.com/2024/07/30/real-time-database-startup-clickhouse-acquires-peerdb-to-expand-its-postgres-support)
- [Database maker ClickHouse raises $400M, acquires Langfuse — SiliconANGLE](https://siliconangle.com/2026/01/16/database-maker-clickhouse-raises-400m-acquires-ai-observability-startup-langfuse/)
- [ClickHouse Announces Native Postgres Service — Business Wire](https://www.businesswire.com/news/home/20260122173204/en/ClickHouse-Announces-Native-Postgres-Service-Offering-a-Unified-Data-Stack-for-Real-Time-and-AI-Driven-Applications)
- [ClickHouse Keeper: a ZooKeeper alternative written in C++ — ClickHouse Blog](https://clickhouse.com/blog/clickhouse-keeper-a-zookeeper-alternative-written-in-cpp)
- [ClickHouse Keeper uses Raft — InfoQ](https://www.infoq.com/news/2023/12/clickhouse-keeper-raft/)
- [ClickHouse Release 23.3 (lightweight DELETE GA) — ClickHouse Blog](https://clickhouse.com/blog/clickhouse-release-23-03)
- [ClickHouse Release 24.3 (analyzer) — ClickHouse Blog](https://clickhouse.com/blog/clickhouse-release-24-03)
- [Analyzer — ClickHouse Docs](https://clickhouse.com/docs/operations/analyzer)
- [JSON data type — ClickHouse Docs](https://clickhouse.com/docs/sql-reference/data-types/newjson)
- [UPDATE statement (lightweight updates) — ClickHouse Docs](https://clickhouse.com/docs/sql-reference/statements/update)
- [Minimize and optimize JOINs — ClickHouse Docs](https://clickhouse.com/docs/best-practices/minimize-optimize-joins)
- [ClickHouse release cycles — endoflife.date](https://endoflife.date/clickhouse)
- [ClickHouse/ClickHouse — GitHub](https://github.com/ClickHouse/ClickHouse)
- [StarRocks Is Now Under Apache License 2.0 — StarRocks Blog](https://www.starrocks.io/blog/starrocks-is-now-under-apache-license-2.0)
