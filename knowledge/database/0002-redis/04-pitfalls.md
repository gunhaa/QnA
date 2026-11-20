---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# Redis 운영 시 흔한 함정과 해결 방법

## 쉬운 설명

책상 서랍(Redis)은 빠르지만 세 가지를 조심해야 한다. ① 서랍이 비는 순간 모두가 한꺼번에 창고(DB)로 달려가면 창고 문이 부서진다. ② 서랍은 한 사람(단일 스레드)이 관리해서, 누가 서랍 전체를 뒤지라고 하면 다른 사람은 다 기다린다. ③ 서랍이 꽉 차거나 정전되면 내용물이 사라질 수 있다.

## 일반 설명

### 1. 캐시 3대 장애 패턴

| 문제 | 상황 | 해결 |
|---|---|---|
| **Cache Stampede** (Thundering Herd, Dog-pile) | 인기 키 하나가 만료된 순간 수천 요청이 동시에 DB로 몰림 | ① 재계산을 **한 요청만** 하도록 락(`SET lock NX PX`) 또는 single-flight ② 만료 전에 미리 갱신(확률적 조기 만료 / 백그라운드 리프레시) ③ 만료된 값을 잠시 그대로 내주며 뒤에서 갱신(stale-while-revalidate) |
| **Cache Avalanche** | 많은 키가 **같은 시각에** 만료되거나 Redis 자체가 죽어 DB로 트래픽 폭주 | ① TTL에 **랜덤 지터** 추가(`600 ± 60초`) ② Redis HA(Sentinel/Cluster) ③ 앱 로컬 캐시(Caffeine) 2단 구성 ④ DB 앞 서킷 브레이커·동시성 제한 |
| **Cache Penetration** | **DB에도 없는 키**를 계속 조회(공격·버그) → 캐시가 항상 미스 | ① "없음"도 짧은 TTL로 캐시(null caching) ② **Bloom Filter**(`BF.EXISTS`, 8.0 기본 포함)로 존재 여부 선검사 ③ 입력값 검증 |

### 2. 단일 스레드 블로킹

명령이 하나씩 실행되므로 **O(N) 명령 하나가 모든 클라이언트를 멈춘다.**

| 원인 | 해결 |
|---|---|
| `KEYS *` | 운영 금지. `SCAN 0 MATCH user:* COUNT 100` 커서 순회. `rename-command KEYS ""` 또는 ACL로 차단 |
| `HGETALL`/`SMEMBERS`/`LRANGE 0 -1` on 큰 컬렉션 | `HSCAN`/`SSCAN`, 범위 제한 |
| 큰 키 `DEL` | `UNLINK`(백그라운드 해제), `lazyfree-lazy-*` 옵션 |
| 오래 도는 Lua 스크립트 | 스크립트는 짧게. `busy-reply-threshold`(구 `lua-time-limit`) 확인 |
| `FLUSHALL` | `FLUSHALL ASYNC` |

진단: `SLOWLOG GET 10`, `LATENCY DOCTOR`, `INFO commandstats`.

### 3. Big Key / Hot Key

| 문제 | 증상 | 해결 |
|---|---|---|
| **Big Key** (수 MB 문자열, 수백만 원소 컬렉션) | 네트워크 대역 점유, 삭제·직렬화 시 지연, Cluster에서 한 노드만 메모리 과다 | 키를 쪼개기(`cart:{uid}:0..N`), 압축, 원소 수 제한. 탐지: `redis-cli --bigkeys`, `--memkeys`, `MEMORY USAGE key` |
| **Hot Key** (한 키에 트래픽 집중) | Cluster에서도 그 키를 가진 **한 노드만** 과부하 | ① 앱 로컬 캐시로 흡수 ② 키 복제(`hot:1..N` 중 랜덤 조회) ③ 레플리카 읽기 분산. 탐지: `redis-cli --hotkeys`(LFU 정책 필요), 8.6+ `HOTKEYS` 명령 |

### 4. 메모리 부족과 Eviction

- `maxmemory`를 반드시 설정한다. 미설정이면 OS 메모리를 다 쓰고 OOM Killer에 죽을 수 있다.
- 캐시로 쓰면서 `maxmemory-policy`를 기본값 `noeviction`으로 둠 → 메모리가 차는 순간 `OOM command not allowed` **쓰기 에러**. 캐시라면 `allkeys-lru`/`allkeys-lfu`로 바꾼다.
- `volatile-*`인데 대부분의 키에 TTL이 없음 → 축출할 키가 없어 `noeviction`처럼 쓰기 에러가 난다.
- 정책별 차이와 고르는 기준은 [트레이드오프 — 축출 정책](./03-tradeoffs.md#32-축출-정책--데이터의-성격으로-고른다)에 있다.

- **fork 메모리 함정**: RDB 저장·AOF 재작성 때 `fork()` + Copy-on-Write로 쓰기가 많으면 메모리가 최대 2배 가까이 필요해진다. → `maxmemory`를 물리 메모리의 60~70% 정도로 두고, Linux `vm.overcommit_memory=1`, Transparent Huge Pages 비활성화.
- **메모리 단편화**: `INFO memory`의 `mem_fragmentation_ratio`가 1.5 이상이면 `activedefrag yes`.

### 5. 데이터 유실·장애 조치

노드 장애, 비동기 복제로 인한 쓰기 유실, 스플릿 브레인, 영속성 설정, 백업은 [Redis 장애 대응과 고가용성](./05-failure-modes.md)에서 다룬다.

### 6. 캐시와 DB 불일치

- **"DB 갱신 → 캐시 삭제"** 순서가 기본(캐시를 덮어쓰지 않는다). 두 요청이 엇갈려 옛 값이 다시 캐시에 들어가는 경쟁이 남으므로 **TTL을 항상 걸어** 최종적으로 수렴하게 한다.
- 더 엄격하게: 삭제를 한 번 더 지연 실행(delayed double delete), 또는 DB 변경 이벤트(CDC — Debezium 등)로 캐시 무효화.
- 트랜잭션 커밋 전에 캐시를 지우면 커밋 전 옛 값이 다시 캐시될 수 있다 → **커밋 후**(`@TransactionalEventListener(AFTER_COMMIT)`) 삭제.

### 7. 분산 락의 함정

```text
획득: SET lock:res <랜덤토큰> NX PX 30000
해제: 토큰이 내 것일 때만 DEL  (Lua로 GET+DEL을 원자적으로)
```

| 함정 | 해결 |
|---|---|
| `SETNX` 후 `EXPIRE` 사이에 죽어 락이 영원히 남음 | `SET ... NX PX` 한 명령으로 |
| 남의 락을 지움(내 작업이 TTL보다 오래 걸림) | 랜덤 토큰 비교 후 삭제, 락 연장(watchdog — Redisson) |
| GC 정지·장애 조치로 두 클라이언트가 동시에 락 보유 | Redis 락은 **효율용(중복 작업 방지)** 으로만. 정합성이 중요하면 **fencing token**을 DB에서 검사하거나 DB 락/ZooKeeper/etcd 사용. (Redlock의 안전성은 Martin Kleppmann vs antirez 논쟁으로 유명) |

Java에서는 Redisson의 `RLock`이 토큰·연장·재진입을 처리해 준다. GC 정지·네트워크 분리·락 저장소 장애 같은 분산 락 장애 시나리오와 fencing token 설계는 [Java 락 — 분산 락의 장애 시나리오](../../languages/0002-java-lock/05-failure-modes.md#6-분산-락의-장애-시나리오)에서 자세히 다룬다. Redis 락 자체의 동작·선택 기준·함정·장애 유형은 [Redis 락 세트](../0005-redis-lock/02-overview.md)에 정리했다.

### 8. Cluster 특유의 문제

| 문제 | 해결 |
|---|---|
| `CROSSSLOT` 에러: `MGET a b`, 트랜잭션, Lua가 다른 슬롯 키를 건드림 | **해시 태그** `{user:1}:profile`, `{user:1}:cart` — `{}` 안만 해싱해 같은 슬롯에 배치 |
| 클라이언트가 `MOVED`/`ASK` 리다이렉트를 처리 못 함 | Cluster 지원 클라이언트(Lettuce, Jedis Cluster, Redisson) 사용, 토폴로지 갱신 옵션 켜기 |
| 리샤딩 중 지연·에러 | 8.4+ / Valkey 9 의 **원자적 슬롯 이동** 활용 |
| Cluster는 DB 0만 지원 | 키 접두사로 구분 (Valkey 9.0은 클러스터 멀티 DB 지원) |

### 9. 연결·클라이언트 문제

- 요청마다 연결 생성 → 커넥션 풀(Lettuce는 기본 단일 연결 멀티플렉싱, Jedis는 풀 필수).
- 타임아웃 미설정 → Redis가 느려지면 앱 스레드가 전부 묶임. 타임아웃·서킷 브레이커·DB 폴백 설정은 [장애 대응 — 클라이언트 측 장애 대응](./05-failure-modes.md#7-클라이언트-측-장애-대응)에 있다.
- 왕복이 많음 → **파이프라이닝**, `MGET`/`MSET`으로 묶기.
- `maxclients` 초과, `client-output-buffer-limit`(Pub/Sub 느린 구독자) 끊김 → `INFO clients`, `CLIENT LIST` 모니터링.

### 10. 보안

- 인터넷에 6379 포트를 인증 없이 열어 두면 몇 시간 안에 침입당해 **크립토마이너 설치·데이터 삭제** 사례가 반복돼 왔다.
- `protected-mode yes`, `bind`로 내부망만, **ACL 사용자별 권한**(6.0+), `requirepass`, TLS, 위험 명령(`FLUSHALL`, `CONFIG`, `KEYS`, `DEBUG`) 차단.
- 클라우드 매니지드(ElastiCache/MemoryDB, Memorystore, Azure Cache)는 VPC 내부 접근 + 인증을 기본 구성으로.

### 11. 모니터링 체크리스트

| 지표 | 확인 명령 / 항목 |
|---|---|
| 메모리 사용량·단편화 | `INFO memory` — `used_memory`, `mem_fragmentation_ratio` |
| 축출·만료 | `INFO stats` — `evicted_keys`, `expired_keys` |
| 캐시 적중률 | `keyspace_hits / (hits + misses)` |
| 지연 | `LATENCY LATEST`, `SLOWLOG`, `redis-cli --latency` |
| 복제 지연 | `INFO replication` — `master_repl_offset` 차이 |
| 연결 수 | `INFO clients` — `connected_clients`, `blocked_clients` |
| 영속성 | `INFO persistence` — `rdb_last_bgsave_status`, `aof_last_write_status` |

수집은 `redis_exporter` + Prometheus/Grafana 조합이 일반적이다.

## 관련 문서

- [Redis의 역사](./01-history.md)
- [Redis 개요와 기본 사용법](./02-overview.md)
- [Redis 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [Redis 장애 대응과 고가용성](./05-failure-modes.md)
- [Redis 락 사용 시 흔한 함정과 해결 방법](../0005-redis-lock/04-pitfalls.md)
- [Java 락 장애 대응과 다중 인스턴스 환경 (분산 락)](../../languages/0002-java-lock/05-failure-modes.md)
- [Vault로 API 키 verify 이관 검토 (Redis 캐시 계층 비교)](../../../inquiry/security/0003-vault-apikey-split-verify-review.md)

## 참고 자료

- [Redis Docs — Key eviction](https://redis.io/docs/latest/develop/reference/eviction/)
- [Redis Docs — Diagnosing latency issues](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/)
- [Redis Docs — Distributed Locks with Redis](https://redis.io/docs/latest/develop/use/patterns/distributed-locks/)
- [Redis Docs — Security](https://redis.io/docs/latest/operate/oss_and_stack/management/security/)
- [Martin Kleppmann — How to do distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
- [Announcing Redis 8.6 (HOTKEYS, new eviction policies) — Redis Blog](https://redis.io/blog/announcing-redis-86-performance-improvements-streams/)
- [What's new in Redis 8.4 (CLUSTER MIGRATION) — Redis Docs](https://redis.io/docs/latest/develop/whats-new/8-4/)
- [Valkey 9.0 atomic slot migration — InfoQ](https://www.infoq.com/news/2025/11/valkey-9-atomic-migration)
