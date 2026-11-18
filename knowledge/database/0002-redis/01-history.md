---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# Redis의 역사

## 쉬운 설명

옛날에 한 개발자가 방문자 기록을 매번 창고(디스크 DB)에 넣었다 꺼냈다 하느라 너무 느렸다. 그래서 **책상 위(메모리)에 바로 꺼내 쓰는 작은 서랍장**을 직접 만들었다. 이게 Redis다. 모두가 이 서랍장을 좋아해서 큰 회사들이 공짜로 가져다 팔기 시작하자, 만든 회사가 "공짜로 팔지 마"라고 규칙을 바꿨다. 그러자 사람들이 똑같은 서랍장(Valkey)을 따로 만들었고, Redis는 다시 규칙을 풀었다.

## 일반 설명

### 1. 등장 배경 (2009)

- 이탈리아 개발자 **Salvatore Sanfilippo(antirez)** 가 실시간 웹 분석 서비스 **LLOOGG**를 만들다가 MySQL로는 "최근 N개 페이지뷰를 계속 밀어 넣고 잘라내는" 작업의 쓰기 부하를 감당하기 어렵다는 문제에 부딪혔다.
- 해결책으로 **데이터를 메모리에 두고, 리스트·셋 같은 자료구조를 서버가 직접 제공**하는 서버를 Tcl로 프로토타입한 뒤 C로 다시 썼다.
- 이름은 **RE**mote **DI**ctionary **S**erver. 2009년 BSD 라이선스로 공개됐다.
- 당시 memcached가 "문자열 키-값 캐시"였다면, Redis는 **자료구조 서버(data structure server)** 라는 점이 달랐다. 서버 쪽에서 `LPUSH`, `ZADD` 같은 연산을 원자적으로 처리해 주니, 애플리케이션이 값을 읽고-고치고-쓰는 경쟁 조건을 걱정할 필요가 줄었다.

### 2. 스폰서 변천

| 시기 | 스폰서 | 비고 |
|---|---|---|
| 2010.03 ~ 2013.05 | VMware | antirez 풀타임 고용, Pieter Noordhuis 합류 |
| 2013.05 ~ 2015.06 | Pivotal | VMware 분사 |
| 2015 ~ 2020 | Redis Labs | 전신은 Garantia Data. 2021년 회사명을 **Redis Ltd.** 로 변경 |
| 2020.06 | — | antirez 메인테이너 은퇴, 커뮤니티 코어 팀 체제 |
| 2024.11 | Redis Ltd. | antirez 복귀 (Vector Sets 개발) |

### 3. 주요 버전 변천

| 버전 | 연도 | 핵심 변화 | 해결하려던 문제 |
|---|---|---|---|
| 1.0 | 2009 | String, List, Set, RDB 스냅샷 | 메모리 KV + 자료구조 |
| 1.1~2.0 | 2010 | AOF, Sorted Set, Hash, Pub/Sub | 내구성, 랭킹·객체 저장 |
| 2.6 | 2012 | **Lua 스크립팅**, 밀리초 TTL | 여러 명령을 원자적으로 묶기 |
| 2.8 | 2013 | **Sentinel** 안정화, 부분 재동기화(PSYNC) | 자동 장애 조치(HA) |
| 3.0 | 2015 | **Redis Cluster** | 단일 노드 메모리 한계 → 샤딩 |
| 4.0 | 2017 | **Modules API**, `UNLINK`(비동기 삭제), RDB+AOF 혼합 | 기능 확장, 큰 키 삭제 블로킹 |
| 5.0 | 2018 | **Streams** | Kafka 같은 로그형 메시지 큐 |
| 6.0 | 2020 | **ACL**, TLS, RESP3, **멀티스레드 I/O** | 보안, 네트워크 처리 병목 |
| 7.0 | 2022 | Functions, Sharded Pub/Sub, Multi-part AOF | 스크립트 관리, Cluster에서 Pub/Sub 확장 |
| 7.2 | 2023 | — | **마지막 BSD 라이선스 버전** (2026.02 EOL) |
| 8.0 | 2025.05 | Redis Stack 기능(JSON, Search, TimeSeries, 확률형 자료구조)을 본체에 통합, **Vector Sets**, AGPLv3 추가 | AI/벡터 검색, 라이선스 복귀 |
| 8.2 | 2025.08 | 성능·메모리 개선 | — |
| 8.4 | 2025.11 | `CLUSTER MIGRATION`(원자적 슬롯 이동), `XREADGROUP ... CLAIM` | 리샤딩 안정성 |
| 8.6 | 2026.02 | Streams 멱등성(`XADD ... IDMPAUTO`), `HOTKEYS` 명령, 새 eviction 정책, Hash/ZSet 메모리 절감 | at-most-once 전달, 핫 키 탐지 |

### 4. 라이선스 분쟁과 포크

| 시기 | 사건 |
|---|---|
| 2018 | Redis Labs가 **모듈**(RediSearch 등)에 Commons Clause → 이후 RSAL 적용. 코어는 BSD 유지 |
| **2024.03** | Redis 7.4부터 코어를 **RSALv2 + SSPLv1 듀얼 라이선스**로 변경. 클라우드 사업자가 Redis를 매니지드 서비스로 팔면서 기여는 하지 않는다는 이유 |
| 2024.03 | 반발로 포크 등장: **Valkey**(Linux Foundation, AWS·Google·Oracle·Ericsson 참여, 7.2.4 기반), Redict(LGPL) 등 |
| 2024~ | AWS ElastiCache·MemoryDB, Google Memorystore 등이 Valkey 지원. 다수 리눅스 배포판이 Valkey로 전환 |
| **2025.05** | Redis 8.0부터 **AGPLv3**를 선택지로 추가 → OSI 승인 오픈소스로 복귀 (RSALv2 / SSPLv1 / AGPLv3 중 택1) |

라이선스 변경 후 1년 동안 외부 기여자 대부분이 Valkey 쪽으로 옮겨 갔다는 분석이 있다. Redis가 AGPL로 돌아왔지만 AGPL은 네트워크 서비스에도 소스 공개 의무가 있어, BSD를 원하는 기업은 여전히 Valkey를 고른다.

### 5. 현재 상태 (2026년 11월)

- **Redis**: 8.x 계열(8.6이 최신 메이저 기능 릴리스). "캐시"를 넘어 JSON 문서, 전문 검색, 벡터 검색, 시계열까지 포함한 **멀티 모델 인메모리 DB**로 포지셔닝. 라이선스는 RSALv2/SSPLv1/AGPLv3.
- **Valkey**: 9.0(2025.10, 클러스터 모드 멀티 DB, 원자적 슬롯 이동, Hash 필드 TTL), 9.1. BSD-3. 클라우드 매니지드 서비스의 기본 선택지로 자리잡는 중.
- 둘 다 **RESP 프로토콜과 핵심 명령이 호환**되므로 기존 클라이언트(Jedis, Lettuce, redis-py 등)는 대부분 그대로 쓴다. 다만 8.x 이후 추가된 기능(Vector Sets, 통합 Search 등)과 Valkey 9 고유 기능은 서로 갈라지고 있다.
- 호환 대체 구현으로 **Dragonfly**(멀티스레드), **KeyDB**(멀티스레드 포크), **Garnet**(Microsoft, .NET) 등도 있다.

## 관련 문서

- [Redis 개요와 기본 사용법](./02-overview.md)
- [Redis 운영 시 자주 겪는 문제와 해결 방법](./04-pitfalls.md)
- [Redis 장애 대응과 고가용성](./05-failures.md)

## 참고 자료

- [Redis — Wikipedia](https://en.wikipedia.org/wiki/Redis)
- [Valkey Documentation: History](https://valkey.io/topics/history/)
- [History of Redis: From Side Project to Industry Standard — OneUptime](https://oneuptime.com/blog/post/2026-03-31-redis-history-side-project-to-industry-standard/view)
- [Welcome back to Redis, antirez — Redis Blog](https://redis.io/blog/welcome-back-to-redis-antirez/)
- [Redis, Valkey, and Percona's Ongoing Support of Open Source — Percona](https://www.percona.com/blog/redis-valkey-and-perconas-ongoing-support-of-open-source/)
- [One year ago Redis changed its license – and lost most of its external contributors — DevClass](https://devclass.com/?p=7423)
- [Back to being FOSS, Redis delivers a new, faster version — The Register](https://www.theregister.com/2025/08/14/redis_redux/)
- [Redis returns to open source — Techzine](https://www.techzine.eu/news/infrastructure/131056/redis-returns-to-open-source-after-damaging-community-relationship)
- [Announcing Redis 8.6 — Redis Blog](https://redis.io/blog/announcing-redis-86-performance-improvements-streams/)
- [What's new in Redis 8.4 — Redis Docs](https://redis.io/docs/latest/develop/whats-new/8-4/)
- [Valkey 9.0 Delivers Performance and Resiliency — Linux Foundation](https://www.linuxfoundation.org/press/valkey-9.0-delivers-performance-and-resiliency-for-real-time-workloads)
- [Valkey 9.1 cuts memory use — IT Brief](https://itbrief.co.uk/story/valkey-9-1-cuts-memory-use-boosts-security-tools)
