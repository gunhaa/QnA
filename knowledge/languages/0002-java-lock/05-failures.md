---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# Java 락 장애 대응과 다중 인스턴스 환경

## 쉬운 설명

두 사람이 서로 상대 방 열쇠를 쥐고 "네가 먼저 열어"라며 기다리면 영원히 못 나온다(데드락). JVM은 이걸 **알아챌 수는 있어도 풀어 주지는 못한다** — 결국 건물(프로세스)을 다시 열어야 한다. 그리고 건물이 여러 채(서버 여러 대)가 되면 **한 건물의 열쇠는 옆 건물 문을 못 잠근다.** 그때는 모두가 함께 보는 **공용 열쇠함(DB, Redis, ZooKeeper)** 이 필요하다.

## 일반 설명

### 1. 락 관련 장애 유형

| 장애 | 증상 | 원인 |
|---|---|---|
| **데드락** | 일부 요청이 영원히 응답 없음, 스레드가 BLOCKED/WAITING 고정 | 두 스레드가 서로의 락을 **반대 순서**로 기다림 |
| 라이브락 | CPU는 쓰는데 진척 없음 | 서로 양보·재시도를 반복 (같은 간격의 tryLock 재시도) |
| 기아 | 특정 스레드만 계속 못 들어감 | 비공정 락에서 끼어들기 반복, 쓰기 락이 읽기 락에 밀림 |
| **락 보유자 정지** | 락을 쥔 스레드가 느린 I/O·무한 대기 → 대기자 누적 | 락 안에서 타임아웃 없는 네트워크 호출 |
| 락 경합 붕괴(lock convoy) | 부하가 늘수록 처리량이 오히려 떨어짐 | 전역 락 하나에 수백 스레드 몰림 |
| **스레드 풀 기아 데드락** | 락은 없는데 멈춤 | 고정 크기 풀의 작업이 **같은 풀에 제출한 하위 작업**을 기다림 |
| 가상 스레드 캐리어 고갈 | 앱 전체 정지 | JDK 21~23의 `synchronized` 고정, 네이티브 호출 중 블로킹 |
| 연쇄 대기 | 스레드 풀 전체 고갈 → 헬스체크까지 실패 | 위 장애들이 요청 스레드를 하나씩 잠식 |

### 2. 탐지

**스레드 덤프** (`jcmd <pid> Thread.print`) — JVM이 모니터·`ReentrantLock` 데드락을 스스로 찾아 표시한다.

```text
Found one Java-level deadlock:
=============================
"worker-1":
  waiting to lock monitor 0x... (object 0x..., a com.example.Account),
  which is held by "worker-2"
"worker-2":
  waiting for ownable synchronizer 0x..., (a java.util.concurrent.locks.ReentrantLock$NonfairSync),
  which is held by "worker-1"
```

**코드로 상시 감시** — 헬스 체크·메트릭에 연결

```java
ThreadMXBean mx = ManagementFactory.getThreadMXBean();
long[] ids = mx.findDeadlockedThreads();   // synchronized + ReentrantLock 등 소유자 있는 락
if (ids != null) {
    for (ThreadInfo ti : mx.getThreadInfo(ids, true, true)) {
        log.error("DEADLOCK: {}", ti);
    }
    // liveness 실패로 보고 → 재시작 유도
}
```

탐지되지 않는 것: `Semaphore`, `CountDownLatch`, `StampedLock`처럼 **소유자 개념이 없는** 동기화, 스레드 풀 기아 데드락, 가상 스레드 일부 상황. 이런 건 덤프에서 **같은 스택에 계속 머무는 스레드**를 여러 번 비교해 찾는다.

| 도구 | 보는 것 |
|---|---|
| 스레드 덤프 3회(5~10초 간격) | 고정된 스택, `BLOCKED`/`WAITING (parking)` 원인 객체 |
| JFR `jdk.JavaMonitorEnter`, `jdk.ThreadPark`, `jdk.VirtualThreadPinned` | 어디서 얼마나 오래 기다렸나 |
| JDK 21+ `jcmd <pid> Thread.dump_to_file -format=json` | 가상 스레드까지 포함한 덤프 |
| 메트릭 | `jvm.threads.states{state=blocked}` 급증 |

### 3. 복구: JVM은 데드락을 풀어 주지 않는다

- 락을 쥔 스레드를 강제로 죽이는 수단이 없다(`Thread.stop()`은 JDK 20부터 `UnsupportedOperationException`).
- **현실적인 복구 = 증거(덤프) 수집 후 인스턴스 재시작.** 그래서 [다중 인스턴스 + liveness 프로브](../0001-java/05-failures.md)가 전제다.
- 재시작은 증상 완화일 뿐이다. 덤프로 락 순서를 찾아 코드를 고쳐야 한다.

### 4. 예방 설계

| 기법 | 내용 |
|---|---|
| **락 순서 고정** | 여러 락이 필요하면 항상 같은 순서(예: ID 오름차순)로 획득 |
| **`tryLock(timeout)`** + 백오프·지터 | 못 얻으면 쥔 락을 모두 놓고 랜덤 지연 후 재시도 (라이브락 방지) |
| `lockInterruptibly()` | 취소·종료 시 대기를 끊을 수 있게 |
| **열린 호출(open call)** | 락을 쥔 채 외부 메서드·콜백·I/O를 호출하지 않는다 |
| 모든 I/O에 타임아웃 | 락 보유자 정지 방지 |
| 하위 작업은 별도 풀 / 가상 스레드 | 스레드 풀 기아 데드락 방지 |
| 락 대신 메시지·불변 객체 | 단일 스레드 소유(액터·큐), copy-on-write |

```java
// 두 계좌 이체: ID 순서로 락 획득 → 데드락 불가
void transfer(Account a, Account b, long amount) {
    Account first  = a.id() < b.id() ? a : b;
    Account second = a.id() < b.id() ? b : a;
    synchronized (first) {
        synchronized (second) {
            a.withdraw(amount);
            b.deposit(amount);
        }
    }
}
```

### 5. 다중 인스턴스: JVM 락의 한계

```
[App #1] synchronized ─┐
                       ├─▶ 같은 DB 행을 동시에 수정 → JVM 락은 서로를 모름
[App #2] synchronized ─┘
```

JVM 락의 범위는 **한 프로세스**다. 서버를 2대 이상 띄우는 순간(가용성을 위해 거의 항상) 다른 수단이 필요하다.

| 방법 | 구현 | 장점 | 주의 |
|---|---|---|---|
| **원자적 UPDATE / 유니크 제약** | `UPDATE ... SET qty = qty - 1 WHERE qty > 0`, UNIQUE 키 | 가장 단순·정확 | 표현 가능한 경우에 한정 |
| **비관적 락** | `SELECT ... FOR UPDATE` (`@Lock(PESSIMISTIC_WRITE)`) | DB가 정합성 보장 | 트랜잭션 길면 대기·데드락 → [MySQL 락 문제](../../database/0001-mysql/04-pitfalls.md) |
| **낙관적 락** | `@Version` 컬럼 + 충돌 시 재시도 | 경합 적을 때 빠름 | 경합 많으면 재시도 폭증 |
| DB 이름 락 | MySQL `GET_LOCK()`, PostgreSQL advisory lock | 행이 없는 자원도 보호 | 커넥션에 묶임, 풀과 함께 쓸 때 주의 |
| **Redis 분산 락** | Redisson `RLock`(watchdog 자동 연장), `SET NX PX` + 토큰 | 빠름, 구현 쉬움 | 장애 조치 시 락 유실 가능 → [Redis 분산 락 함정](../../database/0002-redis/04-pitfalls.md) |
| ZooKeeper / etcd | Curator `InterProcessMutex`, etcd lease | 합의 기반, 세션 만료로 자동 해제 | 별도 클러스터 운영 |
| 스케줄러 중복 실행 방지 | **ShedLock** (`@SchedulerLock`, DB/Redis 백엔드) | `@Scheduled`가 모든 인스턴스에서 도는 문제 해결 | 작업 시간 > `lockAtMostFor`면 중복 |
| 리더 선출 | Spring Integration Leader, k8s Lease | 한 인스턴스만 특정 역할 | — |

### 6. 분산 락의 장애 시나리오

| 시나리오 | 결과 | 대책 |
|---|---|---|
| 락 보유 인스턴스가 죽음 | 락이 영원히 남음 | **TTL/lease**로 자동 만료 |
| 작업이 TTL보다 오래 걸림 | 만료 후 다른 인스턴스도 획득 → **동시 실행** | 자동 연장(Redisson watchdog), 넉넉한 TTL, 작업 분할 |
| **긴 GC 정지·프로세스 정지** | 정지 동안 lease 만료 → 깨어난 옛 보유자가 락이 있다고 믿고 쓰기 | **fencing token**: 락마다 단조 증가 번호 발급, 저장소가 더 작은 번호의 쓰기를 거부 |
| Redis 마스터 장애 조치 | 비동기 복제로 락 키 유실 → 두 보유자 | 정확성이 중요하면 DB·합의 기반(ZooKeeper/etcd) 사용 → [Redis 장애와 HA](../../database/0002-redis/05-failures.md) |
| 네트워크 분리 | 보유자는 락이 있다고 믿지만 lease는 만료 | fencing token, 세션 만료 감지 시 작업 중단 |
| 락 저장소(Redis/ZK) 전체 장애 | 아무도 락을 못 얻음 | 실패 시 정책 결정: 작업 중단(안전) vs 락 없이 진행(가용성) |

**원칙**: 분산 락은 **"같은 일을 두 번 하지 않게 하는 효율 장치"** 로 쓰고, **정확성은 DB 제약·트랜잭션·멱등성·fencing token**으로 보장한다. 락이 깨져도 데이터가 망가지지 않는 설계가 목표다.

```java
// 멱등성 + 유니크 제약: 락이 뚫려도 중복 처리 방지
@Transactional
public void handle(PaymentEvent e) {
    try {
        processedRepo.save(new Processed(e.eventId()));   // event_id UNIQUE
    } catch (DataIntegrityViolationException dup) {
        return;                                           // 이미 처리됨
    }
    paymentService.apply(e);
}
```

### 7. 장애 대응 런북

| 단계 | 할 일 |
|---|---|
| 1. 감지 | 응답 지연·BLOCKED 스레드 급증·데드락 탐지 알람 |
| 2. 증거 수집 | 스레드 덤프 3회, JFR 덤프(`jcmd <pid> JFR.dump`) |
| 3. 격리·복구 | 해당 인스턴스 트래픽 제외 → 재시작. 분산 락이면 락 저장소에서 고아 락 확인·정리 |
| 4. 분석 | 덤프에서 락 소유·대기 관계, 락 획득 순서, 락 안의 I/O 찾기 |
| 5. 재발 방지 | 락 순서 고정, 타임아웃, 락 범위 축소, DB 제약으로 정확성 보강, 데드락 탐지 메트릭 추가 |

## 관련 문서

- [Java 락의 역사](./01-history.md)
- [Java 락 개요와 기본 사용법](./02-overview.md)
- [Java 락: 자주 겪는 문제와 해결 방법](./04-pitfalls.md)
- [Java 애플리케이션 장애 대응과 고가용성](../0001-java/05-failures.md)
- [Redis 운영 시 자주 겪는 문제 — 분산 락의 함정](../../database/0002-redis/04-pitfalls.md)
- [MySQL 장애 대응과 고가용성](../../database/0001-mysql/05-failures.md)

## 참고 자료

- [ThreadMXBean.findDeadlockedThreads — Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/java.management/java/lang/management/ThreadMXBean.html#findDeadlockedThreads())
- [Java Troubleshooting Guide — Troubleshoot Hung Processes and Deadlocks — Oracle](https://docs.oracle.com/en/java/javase/25/troubleshoot/)
- [JEP 444: Virtual Threads (thread dumps)](https://openjdk.org/jeps/444)
- [Martin Kleppmann — How to do distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
- [Redisson — Distributed locks and synchronizers](https://redisson.pro/docs/data-and-services/locks-and-synchronizers/)
- [ShedLock](https://github.com/lukas-krecan/ShedLock)
- [Apache Curator — Recipes: Shared Reentrant Lock](https://curator.apache.org/docs/recipes-shared-reentrant-lock)
- [Spring Data JPA — Locking](https://docs.spring.io/spring-data/jpa/reference/jpa/locking.html)
