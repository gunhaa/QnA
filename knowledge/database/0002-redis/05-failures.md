# Redis 장애 대응과 고가용성

## 쉬운 설명

책상 서랍(Redis)이 하나뿐이면 서랍이 고장 났을 때 모두가 창고로 달려가야 한다. 그래서 **똑같이 베껴 둔 서랍(레플리카)** 을 옆에 두고, **감시자(Sentinel)** 가 원래 서랍이 고장 나면 베낀 서랍을 새 주인으로 정한다. 다만 베끼는 데 아주 잠깐 시차가 있어서, 고장 직전에 넣은 물건 몇 개는 없어질 수 있다.

## 일반 설명

### 1. 장애 유형

| 장애 | 영향 | 1차 대응 |
|---|---|---|
| 프로세스 종료(크래시, OOM Killer) | 해당 노드 응답 없음, 영속성 꺼져 있으면 데이터 전부 소실 | 재시작 + RDB/AOF 로드, 또는 레플리카 승격 |
| 노드·AZ 장애 | 마스터라면 쓰기 불가 | Sentinel/Cluster 자동 장애 조치 |
| 네트워크 분리 | **스플릿 브레인** — 옛 마스터와 새 마스터가 동시에 쓰기 수신 | 과반수 합의 + `min-replicas-to-write` |
| 복제 지연·중단 | 장애 조치 시 유실 폭 증가, 레플리카 읽기에 옛 데이터 | 복제 백로그·대역폭 점검 |
| 디스크 문제(AOF 손상, 디스크 풀) | 재시작 실패, `MISCONF` 에러로 쓰기 거부 | `redis-check-aof --fix`, 디스크 확보 |
| 운영 실수(`FLUSHALL`, 잘못된 `DEL` 패턴) | 데이터 일괄 삭제 — **복제되어 레플리카에서도 사라짐** | 백업에서 복원, 위험 명령 차단 |
| Redis 전체 다운 | 캐시 의존 서비스가 DB로 몰려 연쇄 장애 | 클라이언트 폴백·서킷 브레이커 (6장) |

### 2. 영속성: 재시작 후 무엇이 남나

| 설정 | 유실 범위(RPO) | 재시작 시간 | 비고 |
|---|---|---|---|
| 영속성 없음 | 전부 | 즉시 | 순수 캐시 |
| RDB만 (`save 3600 1 300 100 60 10000`) | 마지막 스냅샷 이후 전부 (수 분) | 빠름 (바이너리 로드) | 백업 파일로 쓰기 좋음 |
| AOF `everysec` | 최대 약 1초 | RDB보다 느림 | 기본 권장 |
| AOF `always` | 거의 없음 | 느림 | 쓰기 성능 크게 저하 |
| **RDB + AOF 혼합** | 약 1초 | 빠름 (RDB 프리앰블 + 이후 AOF) | 실무 권장 |

- 7.0+는 **Multi-part AOF**(base 파일 + 증분 파일 + manifest)로 재작성 중 안정성이 개선됐다.
- RDB 저장 실패 시 기본적으로 쓰기를 거부한다(`stop-writes-on-bgsave-error yes`) → `MISCONF` 에러. 디스크·권한·메모리(fork 실패)를 먼저 확인한다.

### 3. 복제 (Replication)

```
[Master] ──비동기 명령 스트림──▶ [Replica 1]
         └────────────────────▶ [Replica 2]
```

- **전체 동기화**: 레플리카가 처음 붙거나 너무 오래 끊겼으면 마스터가 `fork()`로 RDB를 만들어 전송한다. 데이터가 크면 마스터 메모리·CPU·네트워크를 크게 쓴다. `repl-diskless-sync yes`로 디스크를 거치지 않고 소켓으로 바로 보낼 수 있다.
- **부분 동기화(PSYNC)**: 잠깐 끊긴 경우 **복제 백로그**에 남은 부분만 재전송. `repl-backlog-size`(기본 1MB)가 작으면 짧은 단절에도 전체 동기화가 반복된다 → 쓰기량 × 예상 단절 시간 이상으로 키운다.
- 복제는 **비동기**다. 마스터는 클라이언트에 OK를 보낸 뒤 레플리카로 전파한다.
- 레플리카는 기본 읽기 전용(`replica-read-only yes`).

### 4. Sentinel: 단일 샤드 자동 장애 조치

```
   [Sentinel A]   [Sentinel B]   [Sentinel C]     ← 서로 다른 AZ/호스트
         \            |            /
          ▼           ▼           ▼
       [Master] ──▶ [Replica 1] ──▶ [Replica 2]
```

**장애 조치 흐름**
1. 각 Sentinel이 `down-after-milliseconds` 동안 마스터 응답이 없으면 **SDOWN**(주관적 다운).
2. `quorum` 개수 이상이 동의하면 **ODOWN**(객관적 다운).
3. Sentinel들 중 **과반수 투표**로 리더 선출 → 리더가 가장 적합한 레플리카(우선순위 → 복제 오프셋 최신 → run ID)를 승격.
4. 나머지 레플리카를 새 마스터에 붙이고, 클라이언트에 Pub/Sub(`+switch-master`)로 알림.

```conf
# sentinel.conf
sentinel monitor mymaster 10.0.1.10 6379 2      # quorum 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

- Sentinel은 **최소 3개, 홀수, 서로 다른 장애 도메인**에. 2개면 하나가 죽었을 때 과반이 안 돼 장애 조치가 안 된다.
- `quorum`은 "다운 판정"에만 쓰이고, 실제 장애 조치 실행은 **전체 Sentinel의 과반수** 승인이 필요하다.
- 클라이언트는 마스터 주소를 하드코딩하지 않고 Sentinel에 묻는다(`SENTINEL get-master-addr-by-name mymaster`). Lettuce·Jedis·Redisson 모두 Sentinel 모드를 지원한다.

### 5. Cluster: 샤딩 + 자동 장애 조치

```
 슬롯 0~5460        슬롯 5461~10922     슬롯 10923~16383
 [Master A]         [Master B]          [Master C]
     │                  │                   │
 [Replica A']       [Replica B']        [Replica C']
```

- 노드끼리 **gossip**(클러스터 버스, 포트 +10000)으로 상태를 주고받는다.
- `cluster-node-timeout` 동안 응답 없는 노드를 **PFAIL**로 표시 → 마스터 과반이 동의하면 **FAIL** → 그 마스터의 레플리카가 다른 마스터들의 투표를 받아 승격.
- **최소 구성: 마스터 3 + 레플리카 3**. 마스터가 과반을 유지해야 장애 판정·투표가 된다.
- 한 샤드의 마스터와 레플리카가 모두 죽으면 그 슬롯 범위가 사라진다. 기본값(`cluster-require-full-coverage yes`)이면 **클러스터 전체가 쓰기·읽기를 거부**한다. `no`로 바꾸면 살아 있는 슬롯은 계속 서비스(가용성 우선).
- 레플리카가 마스터와 너무 오래 끊겨 있었으면 승격 자격이 없다(`cluster-replica-validity-factor`). 데이터가 오래된 레플리카가 마스터가 되는 걸 막는 장치다.
- 마스터가 레플리카를 잃으면 레플리카가 남는 다른 샤드에서 하나를 가져온다(**replica migration**).
- 계획된 전환은 레플리카에서 `CLUSTER FAILOVER`(데이터 유실 없이 동기화 후 전환).

### 6. 데이터 유실과 스플릿 브레인

**비동기 복제의 유실 창**

```
Client ──SET x 1──▶ Master ──OK──▶ Client
                      │ (전파 전 마스터 사망)
                      ✗
Replica 승격 → x 없음
```

**스플릿 브레인**

```
네트워크 분리
[옛 Master + Client A]   |   [Replica + Sentinel 과반 + Client B]
  계속 쓰기 받음          |    Replica를 새 Master로 승격
→ 분리 해소 후 옛 Master가 레플리카로 강등되며 그동안 받은 쓰기 전부 폐기
```

| 대책 | 효과 | 대가 |
|---|---|---|
| `min-replicas-to-write 1` + `min-replicas-max-lag 10` | 레플리카와 연결이 끊긴 고립 마스터가 **쓰기 거부** → 유실 폭을 최대 lag 초로 제한 | 레플리카가 모두 죽으면 마스터도 쓰기 불가 |
| `WAIT numreplicas timeout` | 이 쓰기가 N개 레플리카에 도달할 때까지 대기 | 지연 증가. 그래도 **강한 일관성 보장은 아님**(장애 조치가 덜 최신 레플리카를 고를 수 있음) |
| `WAITAOF numlocal numreplicas timeout` (7.2+) | 로컬·레플리카 AOF에 fsync됐는지까지 확인 | 지연 더 증가 |
| 원장은 RDBMS에 | Redis 유실을 허용 가능한 파생 데이터로 한정 | 설계 비용 |

정말로 유실이 없어야 하면: AWS **MemoryDB**(다중 AZ 트랜잭션 로그에 커밋 후 응답)나 Redis Enterprise의 강화 옵션 같은 **내구성 있는 Redis 호환 서비스**를 쓰거나, Redis를 원장으로 쓰지 않는다.

### 7. Sentinel vs Cluster 선택

| 기준 | Sentinel | Cluster |
|---|---|---|
| 데이터 크기 | 한 노드 메모리에 들어감 | 한 노드를 넘음 |
| 쓰기 처리량 | 마스터 1대 한계 | 샤드 수만큼 확장 |
| 다중 키 명령·트랜잭션·Lua | 제약 없음 | 같은 슬롯에서만 (해시 태그 필요) |
| DB 번호(`SELECT`) | 사용 가능 | DB 0만 (Valkey 9.0은 멀티 DB 지원) |
| 운영 복잡도 | 낮음 | 높음 (리샤딩, 슬롯 관리) |
| 클라이언트 | Sentinel 지원 클라이언트 | Cluster 지원 클라이언트 (`MOVED`/`ASK` 처리) |

### 8. 클라이언트 측 장애 대응

Redis 자체의 HA만큼 중요한 것이 **애플리케이션이 Redis 장애를 어떻게 견디는가**다.

| 항목 | 권장 |
|---|---|
| 타임아웃 | 연결·명령 타임아웃을 짧게(수십~수백 ms). 기본값(수 초~무제한)이면 Redis 지연이 앱 스레드 고갈로 번진다 |
| 재연결·토폴로지 갱신 | Lettuce: `ClusterTopologyRefreshOptions`의 주기적·적응형 갱신 활성화. 장애 조치 후 옛 마스터에 계속 붙는 문제 방지 |
| 서킷 브레이커 | Redis 실패율이 높으면 일정 시간 Redis 호출을 건너뛰고 DB로 직행(Resilience4j 등) |
| 폴백 | 캐시 미스로 처리하고 DB 조회. 단, **DB가 그 트래픽을 감당할 수 있는지** 부하 테스트로 확인 |
| 캐시 워밍 | 장애 조치·재시작 후 빈 캐시로 인한 stampede 대비 — 핵심 키 미리 적재, 요청 합치기 |
| 멱등성 | 타임아웃 후 재시도하면 `INCR` 같은 명령이 두 번 적용될 수 있다. 재시도 가능한 연산만 재시도 |

### 9. 백업과 재해 복구(DR)

- **백업**: `BGSAVE`로 만든 RDB 파일을 주기적으로 오브젝트 스토리지(S3 등)에 복사. 레플리카에서 떠서 마스터 부하를 피한다.
- **복원 훈련**: RDB를 새 인스턴스에 로드해 키 수·샘플 값을 검증.
- **리전 간 DR**:
  - 자체 구성: 다른 리전에 레플리카(지연·대역폭 고려), 또는 주기적 RDB 전송
  - AWS ElastiCache **Global Datastore**: 리전 간 비동기 복제, 보조 리전 승격
  - Redis Enterprise / Redis Cloud **Active-Active**: CRDT 기반 다중 리전 동시 쓰기
- **RTO/RPO 정리**:

| 구성 | RPO(유실) | RTO(복구 시간) |
|---|---|---|
| 단일 노드 + RDB | 수 분 | 재시작·로드 시간 |
| 단일 노드 + AOF | ~1초 | 재시작·로드 시간 |
| Sentinel / Cluster | 복제 지연만큼 (보통 1초 미만) | 감지 시간 + 승격 (보통 수~수십 초) |
| MemoryDB | 거의 0 | 수 초~수십 초 |

### 10. 매니지드 서비스의 HA

| 서비스 | HA 방식 |
|---|---|
| AWS ElastiCache (Valkey/Redis OSS) | Multi-AZ 자동 장애 조치(클러스터 모드면 자동 활성), `ReplicationLag` 지표로 유실 폭 감시 |
| AWS MemoryDB | 다중 AZ 트랜잭션 로그 → 내구성 있는 기본 저장소로 사용 가능 |
| Google Memorystore | 표준 티어 자동 장애 조치, 클러스터 모드 |
| Azure Cache for Redis / Azure Managed Redis | 존 중복, 지역 복제 |

매니지드여도 **장애 조치 중 수~수십 초의 연결 끊김은 발생**한다. 8장의 클라이언트 대응은 여전히 필요하다.

### 11. 장애 훈련

| 시나리오 | 방법 |
|---|---|
| 마스터 다운 | 마스터 프로세스 종료, 또는 `DEBUG SLEEP 30`으로 응답 정지 흉내 |
| 계획된 전환 | `SENTINEL FAILOVER mymaster`, 레플리카에서 `CLUSTER FAILOVER` |
| 매니지드 | ElastiCache `TestFailover` API |
| 확인할 것 | 앱 에러율·지연이 언제 회복되는지, 유실된 쓰기, DB 부하 급증 여부 |

## 관련 문서

- [Redis의 역사](./history.md)
- [Redis 개요와 기본 사용법](./redis-overview-and-basic-usage.md)
- [Redis 운영 시 자주 겪는 문제와 해결 방법](./redis-common-problems-and-solutions.md)

## 참고 자료

- [Redis Docs — High availability with Redis Sentinel](https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/)
- [Redis Docs — Redis cluster specification](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/)
- [Redis Docs — Replication](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/)
- [Redis Docs — Persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- [Amazon ElastiCache Well-Architected Lens — Reliability Pillar](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/ReliabilityPillar.html)
- [Minimizing downtime with Multi-AZ — Amazon ElastiCache](https://docs.aws.amazon.com/de_de/AmazonElastiCache/latest/dg/multi-az.html)
- [How to Handle Split-Brain Scenarios in Redis — OneUptime](https://oneuptime.com/blog/post/2026-03-31-redis-handle-split-brain-scenarios/view)
- [How to Handle Redis Network Partitions — OneUptime](https://oneuptime.com/blog/post/2026-03-31-redis-how-to-handle-redis-network-partitions/view)
- [Redis Cluster vs Redis Sentinel: When to Use Which — OneUptime](https://oneuptime.com/blog/post/2026-03-31-redis-redis-cluster-vs-redis-sentinel-when-to-use-which/markdown)
- [Network Partitioning and Consistency Trade-offs — Stanza](https://www.stanza.dev/courses/redis-clustering/cross-region-deployments/redis-clustering-network-partitioning)
- [Redis 클러스터 아키텍처와 고가용성 운영 가이드 — youngju.dev](https://www.youngju.dev/blog/database/2026-03-12-redis-cluster-sentinel-high-availability-memory-optimization.en)
