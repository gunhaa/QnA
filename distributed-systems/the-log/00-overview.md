# The Log (Jay Kreps, 2013) 챕터별 상세 분석 — 개요와 읽는 법

> 원문: [The Log: What every software engineer should know about real-time data's unifying abstraction](https://www.linkedin.com/blog/engineering/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying) — Jay Kreps, LinkedIn Engineering, 2013-12-16

---

## 쉬운 설명

교실에서 선생님이 칠판에 **"오늘 있었던 일"을 순서대로 한 줄씩만 적는다**고 해봅시다. 지우지 않고, 중간에 끼워넣지 않고, 맨 아래에만 계속 붙입니다.

그러면 결석했던 친구도 그 칠판을 처음부터 읽으면 교실이 지금 어떤 상태인지 **똑같이** 알 수 있어요. 한 명은 그걸 읽고 그림일기를 그리고, 다른 한 명은 그걸 읽고 출석부를 만들고, 또 다른 한 명은 통계표를 만듭니다. 각자 만드는 건 달라도 **원본은 칠판 하나**입니다.

이 글은 "데이터베이스든, 검색엔진이든, 캐시든, 분석 시스템이든 전부 저 칠판 하나에서 파생된 그림일기일 뿐"이라고 말하는 글입니다. 그 칠판의 이름이 **로그(log)** 이고, 그걸 실제로 구현한 물건이 **Kafka** 입니다.

---

## 일반 설명

### 이 문서 묶음의 구성

원문은 약 15,000 단어 분량의 단일 포스트지만 내부적으로 4개 Part로 나뉘어 있습니다. 각 Part는 사실상 독립된 논문에 가깝고 다루는 층위가 완전히 다릅니다. 그래서 Part 단위로 파일을 분리했습니다.

| 파일 | 대응 원문 | 다루는 층위 | 핵심 질문 |
|---|---|---|---|
| [`01-part1-what-is-a-log.md`](./01-part1-what-is-a-log.md) | Part One: What Is a Log? | **이론** — 분산 시스템 원론 | 로그란 무엇이고 왜 복제·합의(consensus)의 근본 자료구조인가 |
| [`02-part2-data-integration.md`](./02-part2-data-integration.md) | Part Two: Data Integration | **조직/데이터 아키텍처** | 왜 사내 데이터 파이프라인은 항상 O(N²) 스파게티가 되는가, 로그가 어떻게 이를 O(N)으로 바꾸는가 |
| [`03-part3-stream-processing.md`](./03-part3-stream-processing.md) | Part Three: Logs & Real-time Stream Processing | **처리 모델** | 배치와 스트림은 왜 다른 패러다임이 아닌가, 상태 있는(stateful) 스트림 처리는 어떻게 장애를 견디는가 |
| [`04-part4-system-building.md`](./04-part4-system-building.md) | Part Four: System Building | **시스템 설계 철학** | 미래의 분산 DB는 통합될 것인가 해체(unbundle)될 것인가, 로그는 그 안에서 어디에 놓이는가 |
| [`05-critique-and-2026-update.md`](./05-critique-and-2026-update.md) | (원문 밖) | **비판 + 2026년 현재** | 13년 뒤 무엇이 맞았고 무엇이 틀렸는가, 지금 이 사상은 어디까지 왔는가 |

### 이 글의 위상

Jay Kreps는 이 글을 쓸 당시 LinkedIn의 Principal Staff Engineer였고, Kafka·Samza·Voldemort의 주 저자였습니다. 이 글 직후인 2014년 LinkedIn을 나와 **Confluent**를 창업했고, 같은 해 이 글을 확장해 O'Reilly에서 짧은 책 **"I ❤️ Logs"**를 냈습니다.

즉 이 글은 단순한 기술 블로그가 아니라 **한 회사(Confluent)와 한 산업(이벤트 스트리밍)의 창업 선언문(manifesto)** 성격을 갖습니다. 분석할 때 이 점을 계속 염두에 둬야 합니다 — 논증이 대단히 설득력 있지만, 동시에 **포지션 토크(position paper)** 이기도 합니다.

### 글 전체를 관통하는 단 하나의 논증

이 글은 사실상 하나의 주장을 네 층위에서 반복합니다.

> **"상태(state)는 1급 개념이 아니다. 상태는 변경 이벤트 열(log)의 폴딩 결과(fold)일 뿐이다."**

```
state_now = fold(apply, initial_state, log[0..n])
```

이 한 줄이 각 Part에서 어떻게 변형되는지 보면 글의 구조가 명확해집니다.

| Part | 같은 논증의 변형 |
|---|---|
| Part 1 | DB의 테이블/인덱스 = WAL의 투영(projection). 복제본 = 같은 로그를 같은 순서로 먹인 결정론적 상태 기계 |
| Part 2 | 사내 모든 데이터 시스템(검색/OLAP/캐시/DW) = 중앙 로그의 투영 |
| Part 3 | 스트림 처리 잡의 로컬 상태 = 그 상태의 changelog 로그의 투영 |
| Part 4 | 분산 DB 자체 = 로그(쓰기 경로) + 서빙 레이어(읽기 경로)로 분해 가능 |

여기서 반복적으로 등장하는 핵심 개념이 **테이블/로그 이중성(table-log duality)** 입니다. 테이블은 로그에 대해 "키별 최신값"으로 접은 것이고, 로그는 테이블의 변경 이력을 펼친 것입니다. 이 둘은 정보량에서 동등하지 않습니다 — **로그가 더 많은 정보를 가집니다**(과거의 모든 버전을 복원 가능). 이것이 글 전체에서 로그를 "system of record"로 두자는 주장의 근거입니다.

### 읽기 전 알아둬야 할 용어

| 용어 | 뜻 | 원문에서의 역할 |
|---|---|---|
| **Log** | append-only, 전순서(totally-ordered) 레코드 열. 각 엔트리에 단조증가 시퀀스 번호(offset) 부여 | 글 전체의 유일한 원시 자료구조 |
| **WAL (Write-Ahead Log)** | DB가 실제 페이지를 수정하기 전에 변경 의도를 먼저 기록하는 로그. redo log, commit log, journal 등으로도 불림 | 로그 개념의 역사적 기원 |
| **State Machine Replication (SMR)** | 동일한 결정론적 프로세스에 동일한 입력을 동일한 순서로 주면 동일한 상태가 된다는 원리 | Part 1의 이론적 중핵 |
| **Physical logging / Logical logging** | 변경된 행의 실제 바이트를 기록 vs. 변경을 일으킨 논리적 명령(SQL)을 기록 | 복제 방식 분류축 |
| **Primary-backup / Active-active(state machine model)** | 리더가 처리 후 결과를 로그로 흘림 vs. 요청 자체를 로그에 넣고 모든 복제본이 각자 처리 | Part 1 변형 분류 |
| **CDC (Change Data Capture)** | DB의 변경 로그를 뽑아 외부로 흘리는 기법 | Part 2의 실전 구현 수단 (LinkedIn의 Databus, 오늘날의 Debezium) |
| **Log compaction** | 시간/용량 기반 삭제 대신, **키별 최신 레코드만 남기고** 구버전을 제거하는 보존 정책 | Part 3의 결론. "무한 보존"을 유한 용량에서 가능하게 만드는 트릭 |
| **Table-log duality** | 테이블 ↔ changelog 상호 변환 가능성 | Part 1에 등장해 Part 3·4에서 기술적으로 회수됨 |
| **Unbundling** | 모놀리식 DB를 로그/색인/조정/자원관리 등 독립 컴포넌트로 분해하는 것 | Part 4의 최종 비전 |

### 핵심 수치와 사실 (원문 시점 = 2013년)

- LinkedIn의 Kafka: **하루 600억 건 이상의 고유 메시지 쓰기(60 billion unique message writes per day)**
- 당시 LinkedIn 스택: Databus(Oracle CDC), Voldemort(KV), Espresso(document store), Search, Social Graph, Hadoop
- Kreps의 2008년 Hadoop 프로젝트 회고: "데이터 옮기는 데 몇 주, 나머지는 알고리즘"이라 예상했지만 실제로는 **데이터 파이프라인 작업이 프로젝트 전체를 잡아먹음**

> 2026년 현재 LinkedIn 수치와 비교하면 규모 감각이 잡힙니다: 2019년 **7조 메시지/일**, 2025년 기준 **32조 레코드/일, 17PB/일, 150개 클러스터, 40만 토픽**. 자세한 건 [`05-critique-and-2026-update.md`](./05-critique-and-2026-update.md) 참고.

### 이 글이 낳은 후속 문헌 (혼동 주의)

이 글과 자주 혼동되는 **별개의 글들**이 있습니다. 분석 시 반드시 구분해야 합니다.

| 문헌 | 시점 | 내용 | 이 글과의 관계 |
|---|---|---|---|
| **The Log** (본 분석 대상) | 2013-12 | 로그 = 통합 추상화 | — |
| **Questioning the Lambda Architecture** | 2014-07 (O'Reilly Radar) | Lambda Architecture 비판, **Kappa Architecture 제안** | ⚠️ **"The Log"에는 Lambda/Kappa 논의가 없습니다.** 흔한 오해 |
| **I ❤️ Logs** (책) | 2014 | 본 글의 확장판 단행본 | 동일 저자의 확장 |
| **Turning the Database Inside-Out** (Martin Kleppmann) | 2015 | Part 4의 unbundling을 더 밀어붙인 강연 | 사상적 후계 |
| **Designing Data-Intensive Applications** 11장 | 2017 | 로그 기반 메시징·CDC·이벤트 소싱의 교과서화 | 사상적 후계 |

---

## 각 Part별 한 줄 요약

1. **Part 1** — 로그는 DB 내부(WAL)와 분산 시스템(SMR, Paxos/RAFT) 양쪽에서 이미 존재했고, 둘은 같은 것이다. 합의(consensus) 문제는 "단일 값 결정"이 아니라 "결정들의 로그"로 모델링하는 게 자연스럽다.
2. **Part 2** — 조직의 데이터 문제는 고급 알고리즘 부족이 아니라 **기초적인 데이터 흐름의 부재**다(데이터 욕구 5단계설). N개 시스템을 점대점으로 잇는 O(N²) 파이프라인을 **중앙 로그 하나 + N개 구독**으로 바꿔라. ETL의 T(변환)를 생산자·스트림·소비자로 분해하라.
3. **Part 3** — 배치 vs 스트림은 패러다임 차이가 아니라 **데이터 수집 주기의 차이**일 뿐이다. 스트림 처리 잡은 로컬 상태를 가질 수 있고, 그 상태의 changelog를 로그로 내보내면 장애 복구가 된다. 보존 한계는 **log compaction**으로 푼다.
4. **Part 4** — 회사의 모든 데이터 시스템을 **하나의 거대한 분산 DB의 인덱스들**로 보라. 미래는 (a)현상 유지 (b)재통합 (c)해체(unbundling) 셋 중 하나이며, 저자는 (c)에 건다. 시스템을 **로그 + 서빙 레이어**로 쪼개면 로그가 일관성·복제·커밋·구독·복구·리밸런싱을 전부 흡수한다.

---

## 다음 문서

→ [Part One: What Is a Log?](./01-part1-what-is-a-log.md)
