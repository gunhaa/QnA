# 단일 디스크의 파티션 거래, 리더-팔로워 복제 모델, 그리고 Kafka의 CP/DP

> 질문 셋:
> ① 디스크가 1개면 파티션은 "속도를 포기하고 컨슈머 격리성을 얻는" 거래인가?
> ② Kafka는 리더만 write하고 나머지는 read할 뿐인가?
> ③ CP/DP 모델이 Kafka 클러스터인가?

## 쉬운 설명

**①** 계산대를 여러 개 두면 직원이 왔다 갔다 해서 조금 손해예요. 그런데 **계산대 2~3개까지는 오히려 빨라집니다** — 직원이 한 손님 카드 긁는 동안 다른 손님 물건을 스캔할 수 있으니까요. 손해가 나기 시작하는 건 계산대를 **수백 개** 만들었을 때입니다.

**②** 장부는 **점장(리더)만 씁니다.** 그런데 부점장들은 그걸 "읽기만" 하는 게 아니라 **자기 장부에 똑같이 베껴 적습니다.** 그래서 종이는 3배 쓰여요. 그리고 부점장은 점장이 알려주길 기다리는 게 아니라, **자기가 계속 점장한테 물어보러 갑니다.**

**③** 가게에는 두 종류의 일이 있어요. **"누가 점장인지 정하는 일"**(관리)과 **"실제로 물건 파는 일"**(영업). Kafka는 이 둘을 **다른 사람들에게 맡깁니다.** 관리자들은 따로 모여서 다수결로 결정하고, 영업 직원들은 그 결정을 받아서 일만 합니다.

---

## 일반 설명

## 질문 ① — 단일 디스크에서 파티션은 "속도 ↔ 격리성" 거래인가?

### 부분적으로 맞지만, 두 가지를 정정해야 합니다

#### 정정 1 — 단일 디스크에서도 파티션 1 → 소수 구간은 **더 빨라집니다**

[앞 문서](./kafka-partition-disk-and-parallelism.md)에서 "파티션을 늘리면 순차 I/O가 준랜덤이 된다"고 했는데, 이건 **파티션이 아주 많아졌을 때**의 이야기입니다. 초반 구간은 반대입니다.

```
  처리량
    ▲
    │            ┌─────────────────┐
    │          ╱                     ╲
    │        ╱                         ╲
    │      ╱                             ╲__
    │    ╱                                   ╲____
    │  ╱                                           ╲____
    └─┴────┴────────┴──────────────┴───────────────────────▶ 브로커당 파티션 수
      1   2~8      수십            수백                 수천

     ①상승      ②평탄            ③완만한 하락      ④급락
```

**왜 초반에 올라가는가 — 디스크가 병목이 아니기 때문입니다.**

파티션 1개짜리 브로커는 다음을 전부 **직렬로** 처리합니다:

| 작업 | 파티션 1개일 때 | 파티션 N개일 때 |
|---|---|---|
| **요청 역직렬화 / CRC 검증** | I/O 스레드 1개가 순차 처리 | `num.io.threads` 개가 병렬 처리 |
| **압축 해제 / 재압축** | 직렬 | 파티션별 병렬 (CPU 코어 활용) |
| **Log append 락** | 단일 락에 모든 요청이 줄 섬 | 파티션별 독립 락 |
| **복제 Fetch 처리** | 단일 파티션에 대한 팔로워 요청만 | 파티션별 병렬 |
| **네트워크 소켓** | 리더 파티션 1개 → 브로커 1대에 트래픽 집중 | 분산 |

**즉 파티션 1개는 멀티코어 CPU를 거의 못 씁니다.** 16코어 서버에서 파티션 1개면 실질적으로 1~2코어만 돌아갑니다. 파티션을 몇 개로 늘리면 **같은 디스크 위에서도 처리량이 유의미하게 올라갑니다.**

> **핵심:** Kafka에서 디스크는 대개 병목이 아닙니다. 쓰기는 페이지 캐시로 끝나고(fsync 없음), 병목은 보통 **CPU(압축·CRC)와 네트워크**입니다. 그래서 "단일 디스크 = 파티션 늘려도 이득 없음"은 성립하지 않습니다.

#### 정정 2 — 얻는 것은 "컨슈머 격리성"만이 아닙니다

단일 브로커·단일 디스크 환경에서도 파티션이 사주는 것들:

| 얻는 것 | 단일 디스크에서도 유효한가 |
|---|---|
| **컨슈머 그룹 병렬성** (파티션 수 = 컨슈머 상한) | ✅ 완전히 유효. 가장 큰 이득 |
| **브로커 CPU 병렬성** | ✅ 유효 (위 정정 1) |
| **순서 보장 범위 설계** (키 → 파티션) | ✅ 유효 |
| **Head-of-line blocking 완화** | ✅ 유효 — 한 레코드 처리가 느려도 다른 파티션은 진행 |
| **장애·리밸런싱 단위 분리** | ✅ 유효 |
| **미래 확장 옵션** | ✅ **매우 중요** — 파티션 수는 나중에 줄일 수 없으므로, 브로커 추가를 대비해 미리 나눠둬야 함 |
| **브로커 간 부하 분산** | ❌ 브로커가 1대면 무효 |
| **디스크 I/O 병렬성** | ❌ JBOD가 아니면 무효 |

**"격리성(isolation)"이라는 표현은 정확히는 "독립적 진행 단위(independent progress unit)"** 입니다. 파티션 A의 컨슈머가 느려도 파티션 B는 독립적으로 진행하고, 각자 자기 오프셋을 갖습니다. 이건 컨슈머 간 격리이기도 하지만 **장애 전파 차단**이기도 합니다.

#### 정확한 서술

> **단일 디스크에서 파티션은 "속도를 포기하고 격리성을 사는 것"이 아니라,**
> **"디스크 순차성을 약간 희생하는 대신 CPU 병렬성 + 컨슈머 병렬성 + 독립 진행성 + 확장 옵션을 사는 것"이며, 손익분기점은 생각보다 훨씬 뒤(브로커당 수백~수천 파티션)에 있습니다.**

**실무 권장:** 단일 브로커라도 파티션 1개는 거의 항상 나쁜 선택입니다. 예상 컨슈머 수와 미래 브로커 확장을 고려해 **6~30개** 정도에서 시작하고, 수백 개를 넘기지 않는 것이 무난합니다.

---

## 질문 ② — 리더만 write하고 나머지는 read할 뿐인가?

### 절반만 맞습니다. 관점에 따라 답이 갈립니다.

| 관점 | 답 |
|---|---|
| **클라이언트(프로듀서) 관점** | ✅ **맞음** — 쓰기 진입점은 리더 1개뿐 |
| **디스크 관점** | ❌ **틀림** — 팔로워도 자기 로그 파일에 **씁니다** |
| **읽기 관점** | ⚠️ **기본은 리더지만, 이제 예외가 있습니다** (KIP-392) |

### (a) 팔로워는 "읽기만" 하지 않습니다 — 자기 디스크에 씁니다

```
  [Producer]
       │ ProduceRequest
       ▼
  ┌─────────────────────┐
  │  Broker 1 (Leader)  │
  │  orders-0 로그에 append  ──▶ 페이지 캐시 ──▶ 디스크 (쓰기 #1)
  └──────────▲──────────┘
             │ FetchRequest (팔로워가 pull)
      ┌──────┴───────┐
      │              │
  ┌───▼──────────┐ ┌─▼────────────┐
  │ Broker 2 (F) │ │ Broker 3 (F) │
  │ 받은 바이트를  │ │ 받은 바이트를  │
  │ 자기 로그에    │ │ 자기 로그에    │
  │ append        │ │ append        │
  │  ──▶ 디스크    │ │  ──▶ 디스크    │
  │     (쓰기 #2)  │ │     (쓰기 #3)  │
  └──────────────┘ └──────────────┘
```

**replication.factor=3이면 클러스터 전체 디스크 쓰기는 3배입니다.** 팔로워는 소비자가 아니라 **또 하나의 라이터**입니다.

이것이 클라우드에서 Kafka 비용이 큰 이유이기도 합니다 — 3중 복제는 **디스크 3배 + 크로스 AZ 네트워크 트래픽 2배**를 발생시키고, 후자가 클라우드 Kafka TCO의 최대 80%를 차지합니다. [diskless Kafka(KIP-1150)](../distributed-systems/the-log/05-critique-and-2026-update.md)가 등장한 이유가 정확히 이 지점입니다.

### (b) 복제는 push가 아니라 pull입니다

**팔로워가 리더에게 `FetchRequest`를 보내 데이터를 가져갑니다.** 리더가 팔로워에게 밀어넣는 구조가 아닙니다.

```
  일반적 primary-backup:  리더 ──push──▶ 팔로워
  Kafka:                  리더 ◀──pull── 팔로워  (팔로워가 주도)
```

**왜 pull인가:**

| 이유 | 설명 |
|---|---|
| **컨슈머와 동일한 경로 재사용** | 팔로워는 사실상 "특별한 컨슈머". `FetchRequest` 프로토콜을 그대로 씀 → 코드·최적화(제로카피 등) 공유 |
| **자연스러운 백프레셔** | 느린 팔로워가 자기 속도로 요청. 리더가 팔로워 상태를 추적할 필요 없음 |
| **배칭 제어권이 팔로워에** | `replica.fetch.max.bytes`로 팔로워가 배치 크기 조절 |
| **장애 복구 단순화** | 팔로워가 살아나면 그냥 자기 LEO부터 다시 요청 |

### (c) ISR / High Watermark — 어디까지가 "커밋된" 것인가

```
  Leader의 로그:
  offset:  0    1    2    3    4    5    6    7    8
          [■] [■] [■] [■] [■] [■] [□] [□] [□]
                              ▲                  ▲
                              HW                 LEO
                        (High Watermark)   (Log End Offset)

  Follower A (ISR):  0~6 복제 완료  (LEO=7)
  Follower B (ISR):  0~5 복제 완료  (LEO=6)   ← 가장 뒤처진 ISR
  Follower C (out):  0~2 복제       (ISR에서 제외됨)

  HW = min(모든 ISR의 LEO) = 6
  → 컨슈머는 offset 0~5 까지만 볼 수 있음 (■)
  → offset 6~8 (□)은 아직 "커밋 안 됨" — 컨슈머에게 보이지 않음
```

| 용어 | 뜻 |
|---|---|
| **LEO (Log End Offset)** | 그 레플리카가 가진 마지막 오프셋 + 1 |
| **HW (High Watermark)** | 모든 ISR이 복제 완료한 오프셋. **컨슈머 가시성 경계** |
| **ISR (In-Sync Replicas)** | `replica.lag.time.max.ms`(기본 30초) 안에 리더를 따라잡은 레플리카 집합 |

**HW 개념이 중요한 이유:** 리더만 갖고 있고 아직 복제 안 된 레코드를 컨슈머가 읽어버리면, 리더가 죽고 새 리더가 선출됐을 때 **"읽었는데 사라진 레코드"** 가 생깁니다. HW는 이를 막습니다.

> **2026년 개선:** KIP-1166(Kafka 4.1)은 FETCH 요청에 레플리카의 HW를 포함시켜, 요청을 즉시 완료할지 새 데이터/새 HW가 생길 때까지 보류할지 판단하게 합니다 — HW 전파 지연을 줄이는 최적화입니다.

### (d) `acks`와 `min.insync.replicas` — 가장 흔한 함정

```
  acks=0     : 응답 안 기다림. 유실 가능
  acks=1     : 리더 로그에만 기록되면 OK. 리더 장애 시 유실 가능
  acks=all   : ★ "ISR에 속한 모든 레플리카"가 받으면 OK
```

**⚠️ 함정: `acks=all`만으로는 부족합니다.**

`acks=all`은 "**현재 ISR에 있는** 모든 레플리카"를 뜻합니다. 만약 팔로워들이 전부 뒤처져 ISR에서 빠지면 **ISR = {리더} 하나**가 되고, 그 상태의 `acks=all`은 **사실상 `acks=1`** 입니다.

이를 막는 것이 `min.insync.replicas`인데 — **기본값이 `1`입니다.**

```properties
# 안전한 조합 (RF=3 기준)
replication.factor=3
min.insync.replicas=2          # ★ 기본값 1이므로 반드시 명시적으로 설정
acks=all                       # Kafka 3.0+ 프로듀서 기본값 (KIP-679)
enable.idempotence=true        # Kafka 3.0+ 기본값
unclean.leader.election.enable=false   # 기본값 false (KIP-106)
```

- `min.insync.replicas=2`면 ISR이 2개 미만으로 떨어질 때 **쓰기를 거부**(`NotEnoughReplicasException`)합니다 → 가용성을 포기하고 일관성을 지킴
- `replication.factor=3, min.insync.replicas=2` 조합이면 **브로커 1대 장애는 견디고, 2대 장애 시 쓰기 중단**됩니다

> `acks=all`과 `enable.idempotence=true`는 **Kafka 3.0부터 프로듀서 기본값**입니다(KIP-679). 하지만 브로커 측 `min.insync.replicas` 기본값은 여전히 **1**이므로, 이건 직접 설정해야 합니다. 이 비대칭이 실무에서 가장 자주 놓치는 지점입니다.

### (e) 예외 — 이제 읽기도 리더만이 아닙니다 (KIP-392)

**Fetch From Follower** (Kafka 2.4+)로 컨슈머가 **가장 가까운 레플리카**에서 읽을 수 있습니다.

```properties
# 컨슈머 설정
client.rack=ap-northeast-2a

# 브로커 설정
replica.selector.class=org.apache.kafka.common.replica.RackAwareReplicaSelector
broker.rack=ap-northeast-2a
```

동작:
1. 컨슈머가 `client.rack`을 매 fetch 요청에 실어 보냄
2. 리더 브로커가 `replica.selector.class`로 `PreferredReadReplica`를 골라 응답에 담음
3. 컨슈머가 그 레플리카로 전환해 읽음

**목적은 성능이 아니라 비용**입니다 — 크로스 AZ 네트워크 요금을 없앱니다. 검색 결과 표현대로 "컨슈머 네트워킹 비용을 사실상 전부 제거"할 수 있습니다. `ReplicaSelector`는 플러그인 인터페이스라 커스텀 로직도 가능합니다.

> **주의:** 팔로워는 HW까지만 제공하고 HW 전파에 지연이 있으므로, follower fetching은 **읽기 지연시간이 약간 늘어납니다.** 비용과 지연시간의 거래입니다.

### (f) The Log 관점에서의 정리

[The Log Part 1 분석](../distributed-systems/the-log/01-part1-what-is-a-log.md)의 분류에 대입하면:

| 축 | Kafka의 선택 |
|---|---|
| **무엇을 기록하는가** | **Physical logging** — 리더가 확정한 바이트를 그대로 복사 |
| **무엇을 복제하는가** | **Primary-backup** — 리더가 처리·순서 확정, 팔로워는 결과를 복사 |

**이 조합이 결정론 문제를 원천 회피합니다.** active-active(state machine) 모델이었다면 각 레플리카가 요청을 재실행해야 하고, 그러면 `NOW()`나 난수 같은 비결정성이 문제가 됩니다. Kafka는 **리더가 오프셋을 부여하고 바이트를 확정한 뒤 그대로 복사**하므로 레플리카 간 발산이 구조적으로 불가능합니다.

---

## 질문 ③ — CP/DP 모델인가?

"CP/DP"는 두 가지로 읽힐 수 있고, **둘 다 Kafka에 대해 의미 있는 답이 있습니다.**

---

### 해석 A — Control Plane / Data Plane (제어 평면 / 데이터 평면)

**이 해석이라면: 네, 정확히 그 구조입니다.** 그리고 Kafka는 이 용어를 실제로 문서에서 씁니다.

#### KRaft 이후의 구조 (Kafka 4.0 기준)

```
  ╔════════════════ CONTROL PLANE ════════════════╗
  ║                                                ║
  ║   Controller Quorum (RAFT, 보통 3 또는 5대)     ║
  ║   ┌──────────┐ ┌──────────┐ ┌──────────┐      ║
  ║   │ Ctrl 1   │ │ Ctrl 2   │ │ Ctrl 3   │      ║
  ║   │ (Active) │ │(Standby) │ │(Standby) │      ║
  ║   └────┬─────┘ └──────────┘ └──────────┘      ║
  ║        │                                       ║
  ║   __cluster_metadata  ← 단일 파티션 토픽!       ║
  ║   (토픽 생성, 파티션 재할당, ACL, 리더 선출…    ║
  ║    모든 메타데이터 변경이 append-only 레코드)    ║
  ╚════════╤═══════════════════════════════════════╝
           │ 메타데이터 전파 (브로커가 구독)
  ╔════════▼═══════════ DATA PLANE ════════════════╗
  ║   ┌──────────┐ ┌──────────┐ ┌──────────┐      ║
  ║   │ Broker 1 │ │ Broker 2 │ │ Broker 3 │ ...  ║
  ║   │ 파티션 로그│ │ 파티션 로그│ │ 파티션 로그│      ║
  ║   └──────────┘ └──────────┘ └──────────┘      ║
  ║        ▲                        ▲              ║
  ╚════════╪════════════════════════╪══════════════╝
           │                        │
      [Producer]              [Consumer]
```

**핵심 사실들:**

| 항목 | 내용 |
|---|---|
| **KRaft 도입** | KIP-500. Kafka 3.3부터 production-ready |
| **ZooKeeper 완전 제거** | **Kafka 4.0부터 ZooKeeper 기반 클러스터 미지원** |
| **컨트롤러 쿼럼** | `controller.quorum.voters`에 나열. **정확히 1대가 active controller** |
| **메타데이터 저장소** | `__cluster_metadata` — **단일 파티션 Kafka 토픽** |
| **권장 배포 형태** | **Separated mode** — 컨트롤러와 브로커를 다른 노드에서 실행. 제어 평면을 데이터 평면과 독립적으로 롤링·스케일링 가능 |

#### 가장 흥미로운 지점 — 메타데이터도 로그입니다

> "KRaft stores metadata as an append-only log, which means every metadata change — topic creation, partition reassignment, ACL update — is a record appended to `__cluster_metadata`."

**이것이 [The Log의 논증을 Kafka가 자기 자신에게 적용한 사례](../distributed-systems/the-log/01-part1-what-is-a-log.md)입니다.**

- 데이터 평면: 사용자 데이터를 로그로 관리
- 제어 평면: **클러스터 메타데이터도 로그로 관리**
- 브로커는 `__cluster_metadata`를 **구독**해서 자기 상태를 갱신 → 브로커의 메타데이터 캐시는 그 로그의 **투영(projection)**

Part 1의 "합의 알고리즘은 결국 복제 로그를 유지하는 문제"라는 주장이, ZooKeeper(ZAB)를 자체 RAFT 로그로 대체하는 형태로 실현된 것입니다.

#### 브로커 내부에도 control plane 분리가 있습니다

```properties
# KIP-291
control.plane.listener.name=CONTROLLER
```

컨트롤러→브로커 요청(리더십 변경, 메타데이터 업데이트)을 **일반 데이터 트래픽과 별도의 리스너·스레드**로 처리합니다. 데이터 트래픽이 폭주할 때 제어 요청이 큐에서 밀려 클러스터 관리가 마비되는 것을 막기 위함입니다.

> **즉 Kafka는 두 레벨에서 CP/DP를 분리합니다** — 노드 레벨(컨트롤러 vs 브로커)과 브로커 내부 레벨(리스너/스레드 풀).

---

### 해석 B — CAP 정리의 CP / AP

**이 해석이라면: 기본 지향은 CP이되, 설정으로 조절 가능(tunable)합니다.**

#### 설정에 따른 위치

| 설정 조합 | 위치 | 파티션 장애 시 동작 |
|---|---|---|
| `acks=all` + `min.insync.replicas=2` + `unclean=false` | **CP** | ISR 부족 시 **쓰기 거부**. 일관성 사수, 가용성 포기 |
| `acks=all` + `min.insync.replicas=1` | 중간 | ISR이 리더 하나여도 쓰기 성공 → 사실상 `acks=1` |
| `acks=1` | AP 쪽 | 리더만 확인. 리더 장애 시 유실 가능 |
| `acks=0` | 명백히 AP | 응답조차 안 기다림 |
| `unclean.leader.election.enable=true` | **AP 쪽** | 뒤처진 레플리카도 리더가 됨 → **데이터 손실을 감수하고 가용성 확보** |

#### `unclean.leader.election`이 CAP 스위치입니다

```
  ISR = {Leader} 뿐인 상태에서 리더가 죽었다.
  남은 건 뒤처진(out-of-sync) 레플리카뿐.

  unclean=false (기본):  파티션 사용 불가 상태 유지
                        → 일관성 보존, 가용성 포기  [CP]

  unclean=true:          뒤처진 레플리카를 리더로 승격
                        → 즉시 서비스 재개, 커밋됐던 데이터 손실  [AP]
```

**기본값은 `false`입니다** (KIP-106으로 `true`에서 변경됨). 즉 **Kafka의 기본 성향은 CP입니다.**

#### PACELC로 보면 더 정확합니다

CAP은 "파티션이 발생했을 때"만 다루므로 불충분합니다. Daniel Abadi의 **PACELC**는 정상 상태까지 포함합니다:

```
  PAC  : 파티션(P) 발생 시 → 가용성(A) vs 일관성(C)
  ELC  : 그 외(Else) 정상 시 → 지연시간(L) vs 일관성(C)
```

**Kafka = PC/EL (설정 기본값 기준)**

- **P 상황 → C 선택**: `min.insync.replicas` 미달 시 쓰기 거부
- **정상 상황 → L 선택 가능**: `acks=1`로 지연시간을 줄이거나, `acks=all`로 일관성을 택함. `linger.ms`·배칭도 같은 축의 손잡이

#### 중요한 단서 — CAP은 파티션 단위로 논해야 합니다

"Kafka 클러스터는 CP인가 AP인가"는 사실 부정확한 질문입니다. **일관성 보장의 단위는 파티션(= 하나의 레플리카 그룹)** 이기 때문입니다.

- 파티션 A는 ISR이 건강해서 정상 동작하고, 동시에 파티션 B는 ISR 부족으로 쓰기 거부될 수 있습니다
- **파티션 간에는 원자성도 순서도 없습니다** — 클러스터 전체를 하나의 일관성 단위로 보는 것 자체가 성립하지 않습니다
- 다중 파티션 원자성이 필요하면 **트랜잭션 API**를 써야 하고, 그건 별도의 2PC 계열 메커니즘입니다

#### 컨트롤 플레인은 명백히 CP입니다

```
  Controller Quorum (RAFT):
    과반(quorum) 확보 실패 → 메타데이터 쓰기 전면 중단
    → 토픽 생성, 리더 선출, 파티션 재할당 불가
    → 기존 리더의 데이터 평면 트래픽은 잠시 계속될 수 있으나,
      장애가 겹치면 복구 불가

  ⇒ 타협 없는 CP. RAFT의 본질.
```

**두 해석이 만나는 지점이 여기입니다:** Kafka는 **제어 평면은 타협 없이 CP**로, **데이터 평면은 설정으로 조절 가능하게** 설계했습니다. 이건 잘 알려진 분산 시스템 설계 패턴입니다 — 메타데이터는 작고 변경이 드무니 강한 일관성을 걸고, 대용량 데이터 경로는 튜너블하게 두는 것.

---

## 종합 — 세 질문을 하나의 그림으로

```
  ╔══════════════════ CONTROL PLANE (CP, 타협 없음) ═══════════════╗
  ║  Controller Quorum (RAFT) → __cluster_metadata (append-only)  ║
  ╚═══════════════════════════════╤═══════════════════════════════╝
                                  │ 메타데이터 구독
  ╔═══════════════════════════════▼═══════════════════════════════╗
  ║                  DATA PLANE (CP↔AP 튜너블)                     ║
  ║                                                                ║
  ║   Producer ──write──▶ ┌──────────────┐                        ║
  ║                       │ Partition 0  │  ← 단일 라이터(리더)     ║
  ║                       │   LEADER     │     · 오프셋 확정        ║
  ║                       │  Broker 1    │     · 파티션별 독립 락    ║
  ║                       └──────┬───────┘                        ║
  ║                     pull(Fetch) │                              ║
  ║               ┌─────────────────┴──────────────┐              ║
  ║        ┌──────▼──────┐                 ┌───────▼─────┐        ║
  ║        │ FOLLOWER    │                 │ FOLLOWER    │        ║
  ║        │ Broker 2    │                 │ Broker 3    │        ║
  ║        │ 자기 로그에   │                 │ 자기 로그에   │        ║
  ║        │ ★write★     │                 │ ★write★     │        ║
  ║        └─────────────┘                 └─────────────┘        ║
  ║              ▲                                                 ║
  ║              └── Consumer (KIP-392: client.rack 설정 시)       ║
  ║                                                                ║
  ║   파티션 N개 = CPU 병렬성 + 컨슈머 병렬성 + 독립 진행 단위       ║
  ║                (디스크 순차성은 약간 희생, 손익분기는 뒤쪽)      ║
  ╚════════════════════════════════════════════════════════════════╝
```

---

## 흔한 오해 정리

| 오해 | 실제 |
|---|---|
| "팔로워는 데이터를 읽기만 한다" | ❌ **자기 로그에 write한다.** RF=3이면 디스크 쓰기 3배 |
| "리더가 팔로워에게 데이터를 push한다" | ❌ **팔로워가 pull(Fetch)한다.** 컨슈머와 같은 프로토콜 |
| "읽기는 항상 리더에서" | ⚠️ 기본은 그렇지만 **KIP-392로 팔로워 읽기 가능** (`client.rack`) |
| "`acks=all`이면 안전하다" | ❌ **`min.insync.replicas` 기본값이 1**이라 ISR이 리더 하나면 `acks=1`과 같음 |
| "단일 디스크면 파티션 늘려도 무의미" | ❌ CPU 병렬성·컨슈머 병렬성 때문에 초반 구간은 **더 빨라짐** |
| "Kafka는 AP다" | ❌ 기본 설정은 **CP 지향**. `unclean.leader.election.enable` 기본값이 `false` |
| "Kafka 클러스터 전체가 CP다" | ⚠️ 일관성 단위는 **파티션**. 클러스터 단위 일관성은 정의되지 않음 |
| "KRaft는 ZooKeeper를 Kafka 안에 넣은 것" | ⚠️ 정확히는 **ZAB를 RAFT로 바꾸고 메타데이터를 Kafka 토픽(`__cluster_metadata`)으로 만든 것** |
| "컨슈머는 리더가 받은 걸 즉시 볼 수 있다" | ❌ **HW(High Watermark)까지만** 보임. 미복제 레코드는 비가시 |

---

## 한 줄 결론

> **①** 단일 디스크에서 파티션은 "속도 포기 ↔ 격리성 획득"이 아니라, **디스크 순차성을 조금 내주고 CPU 병렬성·컨슈머 병렬성·독립 진행성·확장 옵션을 사는 거래**이며, 손익분기는 브로커당 수백~수천 파티션 지점입니다.
>
> **②** **클라이언트 쓰기 진입점은 리더 하나**가 맞지만, **팔로워도 자기 디스크에 씁니다.** 그리고 복제는 리더의 push가 아니라 **팔로워의 pull**이며, KIP-392 이후로는 **읽기도 리더 전용이 아닙니다.**
>
> **③** Control Plane / Data Plane 해석이라면 — **네, 정확히 그 구조입니다.** KRaft 컨트롤러 쿼럼이 제어 평면, 브로커가 데이터 평면이고, 메타데이터조차 `__cluster_metadata`라는 **로그**로 관리됩니다. CAP의 CP/AP 해석이라면 — **제어 평면은 타협 없는 CP, 데이터 평면은 `acks`/`min.insync.replicas`/`unclean.leader.election`으로 조절 가능하며 기본값은 CP 지향**입니다.

---

## Sources

- [KIP-392: Allow consumers to fetch from closest replica — Apache Kafka](https://cwiki.apache.org/confluence/display/KAFKA/KIP-392:+Allow+consumers+to+fetch+from+closest+replica)
- [KIP-392: Fetch From Follower — 2 Minute Streaming](https://blog.2minutestreaming.com/p/kafka-kip-392-follower-fetching)
- [Consuming messages from closest replicas in Apache Kafka 2.4.0 — Red Hat Developer](https://developers.redhat.com/blog/2020/04/29/consuming-messages-from-closest-replicas-in-apache-kafka-2-4-0-and-amq-streams)
- [KIP-679: Producer will enable the strongest delivery guarantee by default — Apache Kafka](https://cwiki.apache.org/confluence/display/KAFKA/KIP-679:+Producer+will+enable+the+strongest+delivery+guarantee+by+default)
- [KIP-106: Change Default unclean.leader.election.enabled from True to False — Apache Kafka](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=67636795)
- [KIP-1166: Improve high-watermark replication — Apache Kafka](https://cwiki.apache.org/confluence/display/KAFKA/KIP-1166:+Improve+high-watermark+replication)
- [Kafka min.insync.replicas Explained — Conduktor](https://www.conduktor.io/kafka/kafka-topic-configuration-min-insync-replicas)
- [Kafka Acks & Min Insync Replicas Explained — 2 Minute Streaming](https://blog.2minutestreaming.com/p/kafka-acks-min-insync-replicas-explained)
- [Kafka Replication — Confluent Documentation](https://docs.confluent.io/kafka/design/replication.html)
- [Kafka Control Plane: ZooKeeper, KRaft, and Managing Data — Confluent Developer](https://developer.confluent.io/courses/architecture/control-plane/)
- [KRaft Explained: Kafka Without ZooKeeper — Conduktor](https://www.conduktor.io/blog/kraft-explained-kafka-without-zookeeper)
- [Kafka Metadata at Scale: Topics, Partitions, and Controller Pressure — AutoMQ](https://www.automq.com/blog/kafka-metadata-at-scale-topics-partitions-and-controller-pressure)
- [Apache Kafka 4.x: What KRaft and ZooKeeper Removal Mean](https://andrewbaker.ninja/2026/02/17/apache-kafka-4-x-what-kraft-and-zookeeper-removal-mean/)
- [Kafka and the CAP theorem — Wonder Why](https://mayankwrites.substack.com/p/kafka-and-the-cap-theorem)
- [CAP Theorem & PACELC — DEV Community](https://dev.to/rajkiran_389/system-design-6cap-theorem-pacelc-cap-theorem-pacelc-the-most-important-trade-off-in-3cod)

---

## 관련 문서

- [`kafka/kafka-partition-disk-and-parallelism.md`](./kafka-partition-disk-and-parallelism.md) — 파티션의 물리적 실체와 쓰기 경로 (이 문서의 전편)
- [`kafka/kafka-as-a-database-offset-lookup.md`](./kafka-as-a-database-offset-lookup.md) — 세그먼트·sparse index·offset 조회
- [`kafka/kafka-consumer-mechanism.md`](./kafka-consumer-mechanism.md) — 컨슈머 그룹·리밸런싱
- [`kafka/kafka-overview.md`](./kafka-overview.md) — Kafka 기본 구조
- [`distributed-systems/the-log/01-part1-what-is-a-log.md`](../distributed-systems/the-log/01-part1-what-is-a-log.md) — physical/logical logging × primary-backup/active-active 2축 분류, 합의와 로그
- [`distributed-systems/the-log/05-critique-and-2026-update.md`](../distributed-systems/the-log/05-critique-and-2026-update.md) — 크로스 AZ 복제 비용과 diskless Kafka
