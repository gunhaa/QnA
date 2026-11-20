---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# ClickHouse 장애 유형과 복구

## 쉬운 설명

ClickHouse 클러스터에서 가장 약한 고리는 데이터 서버가 아니라 **서버들이 "누가 무엇을 받았나"를 적어 두는 공용 장부(Keeper)** 다. 데이터 서버 하나가 죽으면 옆 서버가 대신 답하고, 돌아오면 빠진 조각을 받아 간다. 하지만 장부가 멈추면 모든 서버가 새 데이터를 받지 못하고 읽기만 하게 된다. 그리고 누군가 실수로 테이블을 지우면 그 지시도 모든 복사본에 똑같이 전달되므로, 복사본이 아니라 **따로 떼어 둔 백업**만이 구해 준다.

## 일반 설명

원인이 **ClickHouse 쪽**(노드·Keeper·디스크·네트워크)인 장애와 복구를 다룬다. 사람이 잘못 써서 생기는 문제는 [자주 겪는 문제](./04-pitfalls.md)에 있다.

### 1. 장애 유형

| 장애 | 영향 | 1차 대응 |
|---|---|---|
| 노드 크래시·재시작 | 그 노드 질의 실패. 디스크에 다 쓰지 못한 INSERT는 실패로 응답 | 재시작. 레플리카가 있으면 다른 노드로 우회 |
| 레플리카 1대 장기 다운 | 남은 레플리카가 서비스. 복귀 시 누락 파트 복제 | 복제 큐 따라잡기 확인 |
| 샤드의 모든 레플리카 다운 | `Distributed` 질의 실패 또는 부분 결과 | 노드 복구. 부분 결과를 허용할지 결정 |
| **Keeper 쿼럼 상실** | 복제 테이블 **INSERT·DDL 불가(읽기 전용)**, SELECT는 계속 | Keeper 노드 복구 |
| Keeper 메타데이터 손실 | 복제 테이블이 읽기 전용으로 고착 | `SYSTEM RESTORE REPLICA` |
| 데이터 디스크 가득 참 | INSERT·병합 실패, 테이블 읽기 전용 전환 가능 | 공간 확보, TTL·파티션 삭제 |
| 병합 적체 | 파트 증가 → INSERT 지연·거부 | 원인(작은 INSERT, 디스크 I/O) 제거 |
| 메모리 한도 초과 | 질의 실패(`MEMORY_LIMIT_EXCEEDED`), 최악은 OS OOM Killer로 프로세스 종료 | 질의·서버 메모리 한도 설정 |
| 운영 실수(`DROP`, 잘못된 `DELETE`) | **모든 레플리카에 복제되어** 함께 사라짐 | 백업에서 복원 |

### 2. 단일 노드: 크래시 후 무엇이 남나

- 파트는 **불변**이고 완성된 뒤에야 활성으로 등록된다. 쓰던 도중 죽은 파트는 활성 집합에 들어가지 않으므로, 기존 데이터가 반쯤 덮어써지는 일은 구조적으로 없다.
- 응답을 받지 못한 INSERT는 실패로 보고 **재시도**한다. 복제 테이블은 INSERT 블록 해시로 중복을 걸러 같은 블록 재시도가 안전하다(`insert_deduplicate`). 비복제 `MergeTree`는 재시도 시 중복이 생길 수 있으니 앱에서 멱등 키를 둔다.
- 손상 파트가 발견되면 서버는 그 파트를 `detached` 디렉터리로 떼어 내고 시작한다. 복제 테이블이면 다른 레플리카에서 다시 받아 온다.
- `async_insert`의 `wait_for_async_insert=0`이나 `Distributed` 백그라운드 전송처럼 **디스크 기록 전 승인하는 경로**는 크래시 시 유실될 수 있다 ([자주 겪는 문제 — 비동기 경로](./04-pitfalls.md#9-비동기-경로의-내구성을-오해한다)).

### 3. 복제와 Keeper

```
          ┌──────── ClickHouse Keeper (Raft, 3대 또는 5대) ────────┐
          │  /tables/{shard}/events: 파트 목록, 복제 로그, 블록 해시  │
          └───────────▲──────────────────────────▲─────────────────┘
                      │ 메타데이터 기록/구독        │
   INSERT ──▶ [Replica A] ──── 파트 다운로드 ────▶ [Replica B]
```

- INSERT를 받은 레플리카가 파트를 쓰고 Keeper의 복제 로그에 기록한다. 다른 레플리카는 로그를 보고 **파트를 직접 내려받는다**(`system.replication_queue`).
- 리더 없는 다중 마스터라 어느 레플리카에 써도 된다. 레플리카 간 순서·중복은 Keeper가 정한다.
- Keeper는 Raft 합의를 쓰므로 **과반수**가 살아 있어야 동작한다. 3대는 1대, 5대는 2대 장애까지 견딘다 (세부는 [ClickHouse의 강점 — 복제 관점](../../../inquiry/database/0010-clickhouse-strengths-columnar-and-replica.md)).
- **스플릿 브레인**: Keeper 소수 쪽에 남은 ClickHouse 노드는 메타데이터를 기록할 수 없으니 복제 테이블에 쓰지 못한다. 그래서 양쪽이 서로 다른 파트 목록을 확정하는 상황은 막힌다. 대가는 분리 동안 **쓰기 불가**다.

#### 3.1 레플리카 장애와 복귀

| 단계 | 일어나는 일 | 확인 |
|---|---|---|
| 장애 중 | 남은 레플리카가 읽기·쓰기 처리. 기본 비동기 복제라 **죽은 레플리카만 받았던 최근 파트**는 그 노드가 돌아올 때까지 다른 곳에 없다 | — |
| 복귀 | Keeper 로그와 비교해 누락 파트를 다른 레플리카에서 다운로드 | `system.replicas`의 `absolute_delay`, `queue_size` |
| 디스크까지 잃음 | 빈 노드로 같은 레플리카 경로에 다시 붙이면 전체를 다시 복제 | 네트워크·디스크 대역폭 계획 |

승인된 INSERT가 레플리카 1대 손실로 사라지는 것을 막으려면 `insert_quorum=2`(또는 `auto`)로 과반 레플리카 기록 후 응답하게 한다. 쓰기 지연이 늘어나는 대가는 [트레이드오프](./03-tradeoffs.md#1-핵심-설계-선택-얻은-것과-포기한-것)에 있다.

#### 3.2 Keeper 쿼럼 상실

- **증상**: 복제 테이블 INSERT가 `TABLE_IS_READ_ONLY`(코드 242)나 Keeper 예외로 실패. `system.replicas`에서 `is_readonly = 1`. SELECT는 로컬 데이터로 계속 동작한다.
- **흔한 원인**: Keeper 노드 다운, **Keeper 데이터 디렉터리 디스크 풀**(스냅샷 생성 실패), 네트워크 분리, ClickHouse 서버와 Keeper를 같은 디스크에 두어 함께 고갈.
- **복구 순서**:
  1. 죽은 Keeper 노드를 정상 재시작해 과반수를 회복한다.
  2. 과반 노드를 영구히 잃었을 때만 강제 복구(force recovery)로 남은 노드에서 새 쿼럼을 만든다. 최후 수단이다.
  3. Keeper가 정상이 되면 `SYSTEM RESTART REPLICA db.table`로 세션을 다시 잡는다.
- **하지 말 것**: 오래된 Keeper 스냅샷으로 되돌리기. 디스크의 실제 파트와 메타데이터가 어긋나 상황이 더 나빠진다.

#### 3.3 Keeper 메타데이터 손실

- Keeper 데이터를 통째로 잃었거나 경로가 지워진 경우, 레플리카는 메타데이터를 찾지 못해 읽기 전용으로 남는다. `SYSTEM RESTART REPLICA`는 세션만 다시 잡을 뿐 해결하지 못한다.
- **`SYSTEM RESTORE REPLICA db.table`**: 읽기 전용 테이블에서만 실행되며, **로컬 디스크의 파트로 Keeper 메타데이터를 재구성**한다. 데이터를 네트워크로 다시 받지 않는다. Keeper가 먼저 정상이어야 한다.
- 버전에 따라 동작 세부가 다르다는 보고가 있으므로, 실행 전 해당 버전 문서와 스테이징에서 확인한다.

### 4. 샤드와 Distributed 테이블

- `Distributed` 질의는 샤드마다 레플리카 하나를 골라 보낸다. 레플리카가 죽으면 다른 레플리카로 넘어간다.
- 한 샤드의 **모든 레플리카**가 죽으면 질의가 실패한다. `skip_unavailable_shards=1`이면 그 샤드를 빼고 **부분 결과**를 돌려준다. 대시보드에서는 편하지만 과금·정산 집계에는 쓰면 안 된다.
- 백그라운드 INSERT 모드에서는 받은 노드의 디스크에 샤드별 대기 파일이 쌓인다. 목적 샤드가 오래 죽어 있으면 대기량이 커지고, 한도를 넘으면 INSERT가 실패한다. 손상된 배치 파일은 `broken` 하위 디렉터리로 격리되며 그 안의 데이터는 유실된 것으로 본다.
- 샤드를 추가해도 **기존 데이터는 자동 재분배되지 않는다.** 새 데이터만 가중치에 따라 들어간다.

### 5. 자원 고갈

| 자원 | 증상 | 대응 |
|---|---|---|
| 데이터 디스크 | INSERT·병합 실패, 읽기 전용 전환 | 병합은 일시적으로 원본+결과 공간이 필요하므로 여유 공간을 넉넉히. TTL로 오래된 파티션 삭제·S3 계층 이동 |
| 병합 스레드·I/O | 파트 수 증가 → INSERT 지연 → `Too many parts` | `system.merges`로 진행 확인. 근본 원인은 대개 작은 INSERT ([자주 겪는 문제 1](./04-pitfalls.md#1-작은-insert를-자주-보낸다)) |
| 메모리 | `MEMORY_LIMIT_EXCEEDED`로 질의 실패, 서버 전체 OOM | 질의별 `max_memory_usage`, 서버 전체 `max_server_memory_usage`로 OS OOM Killer 전에 ClickHouse가 거절하게 함. 큰 JOIN·GROUP BY는 디스크 스필 설정 |
| 뮤테이션 고착 | `system.mutations`에 실패 반복, 이후 병합 지연 | `latest_fail_reason` 확인 후 `KILL MUTATION` |

### 6. 백업과 재해 복구

공식 문서의 표현대로 복제는 하드웨어 장애를 막지만 **사람의 실수는 막지 못한다.** `DROP TABLE`, 잘못된 `DELETE`, 소프트웨어 버그는 모든 레플리카에 똑같이 적용된다.

| 수단 | 범위 | 비고 |
|---|---|---|
| `BACKUP ... TO S3(...)` / `Disk(...)` / `File(...)` / `AzureBlobStorage(...)` | 테이블·DB 단위 | SQL 명령. `ON CLUSTER`로 클러스터 전체 |
| 증분 백업 (`SETTINGS base_backup = ...`) | 마지막 백업 이후 변경분 | 복원 시 기반 백업 체인이 모두 있어야 함 |
| `RESTORE ... FROM ...` | 테이블·DB 단위 | `users.xml` 같은 설정 파일 기반 계정은 백업 대상이 아님 (SQL로 만든 접근 제어만 포함) |
| 서드파티 `clickhouse-backup`(Altinity) | 파트 하드링크 기반 | 셀프 호스팅에서 널리 쓰임 |
| Keeper 스냅샷 | Keeper 앙상블 자체 | **데이터 백업이 아니다.** 테이블 복구는 데이터 백업 + `SYSTEM RESTORE REPLICA` |
| 원본 재적재 | Kafka·오브젝트 스토리지에 원본이 남아 있을 때 | 분석 사본이라면 가장 단순한 DR. 원본 보존 기간이 곧 RPO |

**재해 복구 수준별 구성**

| 목표 | 구성 |
|---|---|
| 노드 1대 장애 무중단 | 샤드당 레플리카 2 이상 + Keeper 3대(서로 다른 호스트·AZ) |
| AZ 1개 장애 무중단 | 레플리카와 Keeper를 3개 AZ에 분산 |
| 실수·버그 복구 | 정기 전체 + 증분 백업을 다른 계정·버킷에, 복원 리허설 |
| 리전 장애 | 다른 리전 버킷으로 백업, 또는 원본 스트림을 두 리전에 적재 |

### 7. ClickHouse Cloud(SharedMergeTree)에서 달라지는 점

- 데이터는 오브젝트 스토리지(S3·GCS 등)에 **한 벌**만 있고 컴퓨트 노드는 상태가 없다. 노드를 잃어도 데이터 복제본을 다시 받을 필요가 없고, 메타데이터는 Keeper에서 공유한다.
- 레플리카 간 데이터 다운로드가 없으니 위 3.1의 "복귀 후 따라잡기" 문제가 크게 줄어든다. 대신 오브젝트 스토리지 지연은 노드의 로컬 캐시로 숨긴다.
- 운영 실수(`DROP`, 잘못된 `DELETE`)는 여전히 공유 데이터에 그대로 적용되므로 백업이 필요하다는 점은 같다.

### 8. 모니터링 지표

| 항목 | 확인 위치 |
|---|---|
| 파티션별 활성 파트 수 | `system.parts` (`active`) |
| 레플리카 상태·지연 | `system.replicas` — `is_readonly`, `absolute_delay`, `queue_size` |
| 복제 대기 작업과 실패 사유 | `system.replication_queue` — `last_exception`, `num_tries` |
| 병합 진행 | `system.merges` |
| 뮤테이션 적체 | `system.mutations` (`is_done = 0`) |
| 느린 질의·읽은 행 수·메모리 | `system.query_log` |
| 서버 지표 | `system.metrics`, `system.events`, `system.asynchronous_metrics` (Prometheus 엔드포인트로 노출 가능) |
| Keeper 상태 | 4글자 명령 `mntr`, `ruok` |

## 관련 문서

- [ClickHouse의 역사](./01-history.md)
- [ClickHouse 개요와 동작 방식](./02-overview.md)
- [ClickHouse 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [ClickHouse 사용 시 자주 겪는 문제](./04-pitfalls.md)
- [ClickHouse의 강점 — 컬럼 지향과 복제](../../../inquiry/database/0010-clickhouse-strengths-columnar-and-replica.md)
- [고가용성 구성 방식 — replica vs cluster](../../../inquiry/distributed-systems/0009-high-availability-replication-vs-cluster-and-patterns.md)

## 참고 자료

- [Replicated table engines — ClickHouse Docs](https://clickhouse.com/docs/engines/table-engines/mergetree-family/replication)
- [Backup and restore — ClickHouse Docs](https://clickhouse.com/docs/operations/backup)
- [Recovering from a corrupt Keeper snapshot — ClickHouse Knowledge Base](https://clickhouse.com/docs/knowledgebase/recovering-from-corrupt-keeper-snapshot)
- [ClickHouse Keeper: a ZooKeeper alternative written in C++ — ClickHouse Blog](https://clickhouse.com/blog/clickhouse-keeper-a-zookeeper-alternative-written-in-cpp)
- [A New Way to Restore ClickHouse After ZooKeeper Metadata Is Lost — Altinity](https://altinity.com/blog/a-new-way-to-restore-clickhouse-after-zookeeper-metadata-is-lost)
- [ClickHouse Replication problems — Altinity Knowledge Base](https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-check-replication-ddl-queue/)
- [Recovering from Complete ZooKeeper/Keeper Metadata Loss — Pulse](https://pulse.support/kb/clickhouse-complete-zookeeper-metadata-loss-recovery)
- [How to Recover ClickHouse Keeper from Quorum Loss — OneUptime](https://oneuptime.com/blog/post/2026-03-31-clickhouse-keeper-quorum-recovery/view)
- [How to Fix 'Table is in readonly mode' in ClickHouse — OneUptime](https://oneuptime.com/blog/post/2026-03-31-clickhouse-how-to-fix-table-is-in-readonly-mode-in-clickhouse/view)
- [Distributed table engine — ClickHouse Docs](https://clickhouse.com/docs/reference/engines/table-engines/special/distributed)
- [ClickHouse Distributed broken batch files — Pulse](https://pulse.support/kb/clickhouse-error-distributed-broken-batch-files)
- [SharedMergeTree — ClickHouse Docs](https://clickhouse.com/docs/cloud/reference/shared-merge-tree)
- [No more disks: stateless compute in ClickHouse Cloud — ClickHouse Blog](https://clickhouse.com/blog/clickhouse-cloud-stateless-compute)
