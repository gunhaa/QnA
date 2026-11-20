---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# Redis 개요와 기본 사용법

## 쉬운 설명

DB는 큰 창고라서 물건을 찾으려면 걸어가야 한다. Redis는 **책상 위 서랍**이다. 자주 쓰는 걸 꺼내 두면 손만 뻗으면 된다. 게다가 서랍 칸마다 모양이 달라서(줄 세우기 칸, 점수순 칸, 중복 없는 칸) 정리까지 대신해 준다. 단, 책상은 작고 정전되면 날아갈 수 있다.

## 일반 설명

### 1. Redis가 해결하는 문제

| 문제 | Redis의 해법 |
|---|---|
| 디스크 DB 조회가 느리고(ms~수십 ms) 같은 데이터를 반복 조회 | 메모리에서 **서브 밀리초** 응답 → 캐시 |
| 서버가 여러 대라 세션·상태를 각 서버 메모리에 둘 수 없음 | **공유 상태 저장소** (세션, 토큰, 장바구니) |
| 카운터·재고처럼 동시 수정 시 경쟁 조건 | `INCR`, `DECRBY` 등 **원자적 명령** (단일 스레드 실행) |
| 랭킹·최근 목록을 DB에서 매번 정렬 | Sorted Set·List 같은 **자료구조를 서버가 유지** |
| 서버 간 메시지 전달, 작업 큐 | Pub/Sub, List(`BLPOP`), **Streams** |
| 호출 횟수 제한, 분산 락 | `INCR`+`EXPIRE`, `SET NX PX` |

### 2. 아키텍처 핵심

- **인메모리**: 모든 데이터가 RAM에 있다. 데이터 크기 ≤ 메모리 크기가 기본 전제.
- **단일 스레드 명령 실행**: 이벤트 루프(epoll) 하나가 명령을 **하나씩 순서대로** 실행한다. 그래서 각 명령은 자연히 원자적이고 락이 필요 없다. 대신 **느린 명령 하나가 전체를 멈춘다.** 6.0부터 네트워크 I/O(소켓 읽기·쓰기)만 멀티스레드로 처리할 수 있다.
- **RESP 프로토콜**: 텍스트 기반 단순 프로토콜(RESP2/RESP3). TCP 6379 포트.
- **영속성**(선택):
  - **RDB**: 특정 시점 스냅샷. `fork()` 후 자식 프로세스가 파일로 덤프. 복구 빠름, 마지막 스냅샷 이후 데이터 유실.
  - **AOF**: 모든 쓰기 명령을 로그로 추가. `appendfsync everysec`(기본, 최대 1초 유실) / `always`(느림) / `no`.
  - **혼합**(`aof-use-rdb-preamble yes`): AOF 재작성 때 앞부분을 RDB 형식으로 써서 로드가 빠르다.
  - 용도별 조합 선택은 [트레이드오프 — 영속성 모드](./03-tradeoffs.md#31-영속성-모드--무엇을-잃어도-되나로-고른다), 재시작 후 유실 범위는 [장애 대응 — 영속성](./05-failure-modes.md#2-영속성-재시작-후-무엇이-남나)에 있다.
- **배포 형태**: 단일 노드 → Replication(읽기 분산) → Sentinel(자동 장애 조치) → Cluster(16384 해시 슬롯으로 샤딩). 선택 기준은 [트레이드오프 — 배포 형태](./03-tradeoffs.md#33-배포-형태--크기와-쓰기량으로-고른다), 장애 시 동작은 [장애 대응과 고가용성](./05-failure-modes.md)에서 다룬다.
- **만료(TTL) 처리**: 접근 시 만료 확인(lazy) + 주기적으로 일부 키 샘플링 삭제(active). 그래서 만료된 키가 메모리에서 바로 사라지지 않을 수 있다.

### 3. 자료구조와 대표 명령

| 타입 | 대표 명령 | 쓰임새 |
|---|---|---|
| String | `SET k v EX 60`, `GET`, `INCR`, `MSET` | 캐시, 카운터, 토큰 |
| Hash | `HSET user:1 name kim age 30`, `HGET`, `HGETALL` | 객체(필드 단위 수정) |
| List | `LPUSH`, `RPOP`, `BLPOP`, `LRANGE` | 최근 목록, 간단한 작업 큐 |
| Set | `SADD`, `SISMEMBER`, `SINTER` | 중복 제거, 태그, 공통 친구 |
| Sorted Set | `ZADD rank 100 kim`, `ZREVRANGE rank 0 9 WITHSCORES` | 랭킹, 우선순위 큐, 시간순 인덱스 |
| Stream | `XADD`, `XREADGROUP`, `XACK` | 컨슈머 그룹이 있는 메시지 큐 |
| Bitmap / HyperLogLog | `SETBIT`, `PFADD`, `PFCOUNT` | 일별 출석, 순방문자 수 근사(12KB 고정) |
| Geo | `GEOADD`, `GEOSEARCH` | 반경 검색 |
| JSON, Vector Set 등 (8.0+) | `JSON.SET`, `VADD`, `VSIM`, `FT.SEARCH` | 문서 저장, 벡터 유사도 검색 |

### 4. 바로 써 보기

```bash
# 실행 (Valkey를 쓰려면 이미지만 valkey/valkey로 바꾸면 된다)
docker run -d --name redis -p 6379:6379 redis:8

docker exec -it redis redis-cli
```

```text
127.0.0.1:6379> SET greeting "hello" EX 30      # 30초 뒤 자동 삭제
OK
127.0.0.1:6379> TTL greeting
(integer) 28
127.0.0.1:6379> INCR page:views
(integer) 1
127.0.0.1:6379> ZADD rank 300 kim 500 lee 100 park
(integer) 3
127.0.0.1:6379> ZREVRANGE rank 0 1 WITHSCORES   # 상위 2명
1) "lee"
2) "500"
3) "kim"
4) "300"
127.0.0.1:6379> SET lock:order:42 node-a NX PX 10000   # 락 획득(없을 때만, 10초)
OK
```

**키 이름 규칙**: `서비스:엔티티:id:필드` 처럼 콜론으로 계층을 나누는 것이 관례다(예: `shop:user:1001:cart`). 모든 캐시 키에는 **TTL을 붙이는 것**이 기본 습관이다.

### 5. 대표 사용 패턴

**Cache-Aside (가장 흔함)**

```text
읽기: GET key → 있으면 반환
            → 없으면 DB 조회 → SET key value EX ttl → 반환
쓰기: DB 갱신 → DEL key   (캐시를 "갱신"하지 않고 "삭제")
```

Spring Boot 예시 (Spring Data Redis + 캐시 추상화):

```java
@Cacheable(cacheNames = "product", key = "#id")
public Product findById(Long id) {
    return productRepository.findById(id).orElseThrow();
}

@CacheEvict(cacheNames = "product", key = "#product.id")
public void update(Product product) {
    productRepository.save(product);
}
```

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
  cache:
    type: redis
    redis:
      time-to-live: 10m
```

**Rate Limit (고정 윈도우)**

```text
INCR rate:api:{userId}:{분}
EXPIRE rate:api:{userId}:{분} 60   # 처음 생성됐을 때만
값 > 100 이면 거절
```

두 명령 사이 원자성이 필요하면 Lua 스크립트(`EVAL`)나 Functions로 묶는다.

### 6. 여러 명령을 묶는 방법

| 방법 | 원자성 | 특징 |
|---|---|---|
| **Pipeline** | ✗ | 여러 명령을 한 번에 보내 **왕복 횟수만 줄임**. 중간에 다른 클라이언트 명령이 끼어들 수 있다 |
| **MULTI / EXEC** | ✓ (실행 중 끼어들기 없음) | 큐에 쌓았다가 한꺼번에 실행. **롤백은 없다** — 중간 명령이 실패해도 나머지는 실행됨. `WATCH`로 낙관적 락(CAS) |
| **Lua `EVAL` / Functions(7.0+)** | ✓ | 서버에서 스크립트 실행. "읽고 조건 검사 후 쓰기"를 한 번에. 스크립트가 길면 서버 전체가 멈춘다 |

```text
-- WATCH를 이용한 낙관적 락: 재고 감소
WATCH stock:42
GET stock:42            → "5"
MULTI
DECR stock:42
EXEC                    → 그 사이 누가 stock:42를 바꿨으면 nil (재시도)
```

```lua
-- Lua: 토큰이 내 것일 때만 락 해제
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
```

### 7. 메시징: Pub/Sub vs List vs Streams

| 방식 | 저장 | 구독자 없을 때 | 재처리·ACK | 용도 |
|---|---|---|---|---|
| Pub/Sub | ✗ (fire-and-forget) | 메시지 버려짐 | ✗ | 실시간 알림, 캐시 무효화 브로드캐스트 |
| List (`LPUSH`/`BRPOP`) | ✓ | 쌓임 | 직접 구현(`LMOVE`로 처리중 리스트) | 단순 작업 큐 |
| **Streams** | ✓ | 쌓임 | 컨슈머 그룹, `XACK`, `XPENDING`, `XCLAIM`/`XAUTOCLAIM` | 신뢰성 있는 작업 큐, 이벤트 로그 |

```text
XADD orders * orderId 42 status PAID
XGROUP CREATE orders billing $ MKSTREAM
XREADGROUP GROUP billing worker-1 COUNT 10 BLOCK 5000 STREAMS orders >
XACK orders billing 1731900000000-0
```

### 8. 클라이언트 라이브러리

| 언어 | 대표 클라이언트 | 비고 |
|---|---|---|
| Java | **Lettuce**(Spring Boot 기본, Netty 비동기·단일 연결 공유), Jedis(동기, 풀 필요), **Redisson**(분산 락·컬렉션 등 고수준 기능) | Valkey GLIDE도 있음 |
| Python | redis-py (`redis.asyncio` 포함) | |
| Node.js | node-redis, ioredis | |
| Go | go-redis | |

모두 Redis와 Valkey에 공통으로 붙는다(RESP 호환).

### 9. 언제 쓰지 말아야 하나

메모리보다 큰 차가운 데이터, 원장 데이터, 임의 질의·조인, 장기 보관 이벤트 로그에는 맞지 않는다. 이유와 대안은 [트레이드오프 — 쓰지 말아야 할 때](./03-tradeoffs.md#4-쓰지-말아야-할-때)에 있다.

## 관련 문서

- [Redis의 역사](./01-history.md)
- [Redis 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [Redis 운영 시 자주 겪는 문제와 해결 방법](./04-pitfalls.md)
- [Redis 장애 대응과 고가용성](./05-failure-modes.md)

## 참고 자료

- [Redis Docs — Transactions](https://redis.io/docs/latest/develop/interact/transactions/)
- [Redis Docs — Streams](https://redis.io/docs/latest/develop/data-types/streams/)
- [Redis Docs — Pipelining](https://redis.io/docs/latest/develop/use/pipelining/)

- [Redis Docs — Data types](https://redis.io/docs/latest/develop/data-types/)
- [Redis Docs — Persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- [Redis Docs — Scale with Redis Cluster](https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/)
- [Announcing Redis 8.6 — Redis Blog](https://redis.io/blog/announcing-redis-86-performance-improvements-streams/)
- [Redis — Wikipedia](https://en.wikipedia.org/wiki/Redis)
