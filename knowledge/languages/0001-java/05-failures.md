---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# Java 애플리케이션 장애 대응과 고가용성

## 쉬운 설명

JVM이 한 번 크게 탈이 나면(메모리 바닥, 스레드 다 막힘) **스스로 낫기 어렵다.** 그래서 전략은 두 가지다. ① 쓰러지기 직전의 상태를 **사진(덤프)으로 남기고 빨리 다시 일어나게** 한다. ② 같은 일을 하는 **동료(인스턴스)를 여러 명** 두어, 한 명이 쓰러져도 손님은 다른 동료에게 간다.

## 일반 설명

### 1. 장애 유형

| 장애 | 증상 | 대표 원인 |
|---|---|---|
| `OutOfMemoryError: Java heap space` | 요청 실패, GC만 계속 돎 | 메모리 누수, 큰 결과 로딩, 힙 과소 |
| `OutOfMemoryError: GC overhead limit exceeded` | CPU 100%인데 처리 없음 | 힙이 거의 찬 상태에서 GC 반복(GC thrashing) |
| `OutOfMemoryError: Metaspace` | 클래스 로딩 실패 | 동적 프록시·클래스 생성 누수, 재배포 반복 |
| `OutOfMemoryError: Direct buffer memory` | Netty 등 I/O 실패 | 다이렉트 버퍼 해제 지연·누수 |
| `OutOfMemoryError: unable to create native thread` | 새 스레드 생성 실패 | 스레드 무한 생성, OS 프로세스 한도 |
| 컨테이너 **OOMKilled (exit 137)** | 로그 없이 사라짐 | 힙 + 비힙 > 컨테이너 limit |
| `StackOverflowError` | 해당 요청 실패 | 무한 재귀, 순환 참조 직렬화(toString/JSON) |
| 긴 GC 정지 | 타임아웃·헬스체크 실패 | 큰 힙 + 부적절한 GC, 높은 할당률 |
| 스레드 고갈·교착 | 프로세스는 살아 있는데 응답 없음 | 느린 외부 호출, 풀 크기 부족, 데드락 → [락 장애 문서](../0002-java-lock/05-failures.md) |
| JVM 네이티브 크래시 | `hs_err_pid*.log` 남기고 종료 | JNI·네이티브 라이브러리 버그, JVM 버그 |
| 파일 디스크립터 고갈 | `Too many open files` | 소켓·파일 close 누락 |

### 2. 장애 순간을 남기는 JVM 옵션

```bash
java \
  -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/dumps \
  -XX:+ExitOnOutOfMemoryError \
  -Xlog:gc*:file=/logs/gc.log:time,uptime:filecount=5,filesize=20m \
  -XX:StartFlightRecording=disk=true,maxage=1h,dumponexit=true,filename=/dumps/app.jfr \
  -XX:ErrorFile=/logs/hs_err_pid%p.log \
  -XX:MaxRAMPercentage=75 \
  -jar app.jar
```

| 옵션 | 이유 |
|---|---|
| `HeapDumpOnOutOfMemoryError` | 원인 분석용 힙 덤프 (덤프 경로는 영구 볼륨으로) |
| **`ExitOnOutOfMemoryError`** | OOM 후 JVM은 일관성이 깨진 "좀비" 상태가 되기 쉽다 → **즉시 종료하고 오케스트레이터가 재시작**하게 |
| GC 로그 | 정지 시간·빈도 사후 분석 |
| JFR 상시 기록 | 장애 직전 1시간의 스레드·락·할당·I/O 이벤트 |

**응답 없음(행)일 때 수집 순서**
1. 스레드 덤프 3회, 5~10초 간격: `jcmd <pid> Thread.print > td1.txt` — 같은 스택에 계속 머무는 스레드가 범인.
2. `jcmd <pid> GC.heap_info`, GC 로그 확인 — GC thrashing인지 판단.
3. 필요하면 힙 덤프: `jcmd <pid> GC.heap_dump /dumps/heap.hprof` (힙 크기만큼 디스크·시간 필요, 그동안 정지).
4. 그다음 재시작. **재시작이 먼저면 증거가 사라진다** — 자동화 스크립트로 덤프 후 재시작.

### 3. 기본 전략: 빨리 죽고 빨리 살아나기

- JVM 내부에서 OOM·데드락을 "치료"하는 건 대부분 불가능하다. 스레드를 강제로 죽이는 `Thread.stop()`도 JDK 20부터 동작하지 않는다.
- 따라서 **상태를 프로세스 밖에 두고(stateless), 인스턴스를 여러 개 두고, 아픈 인스턴스는 교체**하는 것이 Java 서비스 HA의 기본이다.

### 4. 다중 인스턴스 구성

```
            ┌─▶ [App #1] ─┐
[LB/Ingress]┼─▶ [App #2] ─┼─▶ [DB] [Redis] [Kafka]
            └─▶ [App #3] ─┘
```

| 원칙 | 구현 |
|---|---|
| **무상태** | 세션은 Redis(Spring Session)·JWT, 파일은 S3 등 외부 저장소 |
| 최소 2~3개, 다른 AZ에 분산 | k8s `topologySpreadConstraints`, PodDisruptionBudget |
| 인스턴스 하나 잃어도 버티는 용량 | N+1 여유, HPA |
| 인스턴스 간 공유 자원 경쟁 | JVM 락은 **프로세스 안에서만** 유효 → DB·Redis 분산 락, ShedLock ([락 HA 문서](../0002-java-lock/05-failures.md)) |

### 5. 헬스 체크 (Kubernetes + Spring Boot Actuator)

| 프로브 | 의미 | 실패 시 | 주의 |
|---|---|---|---|
| **startup** | 기동 완료했나 | 기다림 | 느린 JVM 시작 동안 liveness가 죽이지 않게 |
| **liveness** | 프로세스가 회복 불가 상태인가 | **재시작** | DB 장애를 liveness에 넣으면 **전 인스턴스가 동시에 재시작**되는 연쇄 장애 |
| **readiness** | 지금 트래픽을 받아도 되나 | LB에서 제외 | 외부 의존성·워밍업 상태는 여기에 |

```yaml
management:
  endpoint:
    health:
      probes:
        enabled: true          # /actuator/health/liveness, /readiness
  health:
    livenessstate:
      enabled: true
    readinessstate:
      enabled: true
```

### 6. 무중단 배포와 Graceful Shutdown

```yaml
server:
  shutdown: graceful
spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

순서: SIGTERM → readiness를 내려 새 요청 차단 → 처리 중 요청 완료 대기 → 스레드 풀·커넥션 정리 → 종료.

- k8s에서는 `preStop`에 몇 초 sleep을 둬 LB·엔드포인트 갱신이 반영될 시간을 준다.
- `terminationGracePeriodSeconds` > 애플리케이션 종료 타임아웃.
- 롤링 배포: `maxUnavailable: 0`, `maxSurge: 1`로 용량을 유지.
- 메시지 컨슈머(Kafka 등)는 종료 시 처리 중 메시지 커밋·리밸런스까지 마무리.

### 7. 의존성 장애에 대한 복원력

한 인스턴스의 장애보다 흔한 것은 **느려진 외부 의존성이 스레드를 묶어 전체가 멈추는** 경우다.

| 패턴 | 구현 | 목적 |
|---|---|---|
| **타임아웃** | HTTP·DB·Redis 모든 호출에 연결/읽기 타임아웃 | 무한 대기 방지 (기본값이 무제한인 클라이언트가 많다) |
| 재시도 + 백오프 + 지터 | Resilience4j Retry, Spring Retry | 일시 장애 흡수. **멱등 작업만** |
| **서킷 브레이커** | Resilience4j CircuitBreaker | 죽은 의존성 호출을 빨리 실패시켜 자원 보호 |
| **벌크헤드** | 의존성별 스레드 풀·세마포어 분리 | 한 의존성 지연이 전체 스레드를 잠식하지 않게 |
| 폴백·기능 축소 | 캐시된 응답, 기본값 | 부분 장애 시 핵심 기능 유지 |
| 부하 차단 | 레이트 리밋, 큐 길이 제한 | 과부하에서 전부 실패하는 대신 일부만 거절 |

가상 스레드를 쓰면 스레드 고갈은 줄지만, 대신 **DB 커넥션 풀·외부 API 한도가 새 병목**이 된다. 세마포어로 동시 호출 수를 제한한다.

### 8. 관측과 알람

| 지표 | 경보 예 |
|---|---|
| 힙 사용률(GC 후), GC 정지 시간·빈도 | GC 후에도 힙 80% 이상 지속, 정지 p99 급증 |
| 스레드 수·상태(BLOCKED, WAITING) | BLOCKED 급증 |
| 요청 지연 p99, 에러율 | SLO 위반 |
| 커넥션 풀 대기 (Hikari `pending`) | 대기 > 0 지속 |
| 컨테이너 재시작 횟수, OOMKilled | 재시작 발생 |

Micrometer + Prometheus/Grafana, OpenTelemetry로 수집하고, JFR은 장애 사후 분석용으로 상시 기록.

### 9. 장애 훈련

| 시나리오 | 방법 | 확인 |
|---|---|---|
| 인스턴스 강제 종료 | `kubectl delete pod`, `kill -9` | 에러 없이 다른 인스턴스로 넘어가는지 |
| OOM 유도 | 테스트 환경에서 작은 힙 + 부하 | 덤프가 남고 자동 재시작되는지 |
| 의존성 지연 | Toxiproxy, Chaos Mesh로 DB/HTTP 지연 주입 | 타임아웃·서킷 브레이커가 동작하는지, 스레드 고갈이 없는지 |
| 배포 중 요청 | 부하 걸고 롤링 배포 | 5xx 없이 끝나는지 |

## 관련 문서

- [Java의 역사](./01-history.md)
- [Java 개요와 기본 사용법](./02-overview.md)
- [Java 개발·운영 시 자주 겪는 문제와 해결 방법](./04-pitfalls.md)
- [Java 락 장애 대응과 다중 인스턴스 환경](../0002-java-lock/05-failures.md)

## 참고 자료

- [Java Troubleshooting Guide — Oracle](https://docs.oracle.com/en/java/javase/25/troubleshoot/)
- [Spring Boot — Kubernetes Probes](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html#actuator.endpoints.kubernetes-probes)
- [Spring Boot — Graceful Shutdown](https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html)
- [Kubernetes — Configure Liveness, Readiness and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Resilience4j Documentation](https://resilience4j.readme.io/)
- [Thread.stop — JDK 20 changes](https://bugs.openjdk.org/browse/JDK-8289610)
