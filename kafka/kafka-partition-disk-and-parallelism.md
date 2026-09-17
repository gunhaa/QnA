# Kafka 파티션은 디스크를 논리적으로 쪼개 병렬 쓰기를 하려는 장치인가

> 질문: 파티션이란 HDD/SSD가 1개여도 그걸 논리적으로 나눠놓은 여러 개이고, 디스크 시스템콜을 이용한 동시성 이슈 없는 병렬 쓰기를 위한 것인가?

## 쉬운 설명

마트 계산대를 생각해봅시다.

**"계산대를 여러 개 만들면 빨라진다"** — 맞는 말처럼 들리죠. 그런데 **직원이 1명뿐인데 계산대만 20개 만들면** 어떻게 될까요? 직원 한 명이 20개 계산대를 왔다 갔다 하느라 **오히려 느려집니다.**

Kafka 파티션이 정확히 이렇습니다. 파티션은 **"직원을 여러 명 쓰려고"**(= 서버를 여러 대 쓰려고) 나눈 것이지, **"바닥 공간을 나누려고"**(= 디스크를 쪼개려고) 나눈 게 아닙니다.

그리고 한 가지 더 — Kafka는 손님이 계산할 때마다 **금고에 돈을 넣지 않습니다.** 일단 계산대 서랍(메모리)에 두고, 나중에 몰아서 금고로 옮깁니다. 돈이 안전한 이유는 금고가 아니라 **"같은 장부를 다른 지점 3곳이 똑같이 갖고 있어서"**(복제)입니다.

---

## 일반 설명

### 0. 결론 — 절반은 맞고, 핵심은 다릅니다

질문을 네 조각으로 나눠 채점하면:

| 주장 | 판정 | 비고 |
|---|---|---|
| "파티션은 **논리적으로 나눠놓은 여러 개**다" | ✅ **맞음** | 물리적으로 별도 디렉터리 + 별도 파일 집합 |
| "**디스크가 1개여도** 여러 파티션을 둘 수 있다" | ✅ **맞음** | 매우 흔한 구성 |
| "**병렬 쓰기**를 위한 것이다" | ⚠️ **부분적** | 병렬성은 맞지만 **디스크 병렬성이 아니라 브로커·컨슈머 병렬성** |
| "**디스크 시스템콜의 동시성 이슈**를 피하려는 것이다" | ❌ **아님** | 여기가 핵심 오해. 아래 3절 |

**그리고 결정적인 반전이 하나 있습니다:**

> **디스크 1개짜리 브로커에서 파티션 수를 늘리면 쓰기 처리량은 오히려 떨어집니다.**

Kafka의 속도는 **순차 I/O**에서 나오는데, 파티션이 많아지면 여러 파일에 번갈아 쓰게 되어 **순차가 준랜덤으로 바뀌기** 때문입니다. 즉 "단일 디스크에서 파티션을 늘려 병렬 쓰기 이득을 본다"는 구상은 **정반대 방향**입니다.

그럼 파티션은 왜 존재하는가 — **분산 시스템 문제를 풀기 위해서**이지 디스크 문제를 풀기 위해서가 아닙니다.

---

### 1. 파티션의 물리적 실체 — "논리적 분할"이 맞습니다

이 부분은 정확히 보셨습니다. 파티션은 브로커 파일시스템에서 **디렉터리 하나**입니다.

```
  /var/lib/kafka/data/                 ← log.dirs
  ├── orders-0/                        ← 토픽 orders, 파티션 0
  │   ├── 00000000000000000000.log         실제 레코드
  │   ├── 00000000000000000000.index       offset → 바이트 위치 (sparse)
  │   ├── 00000000000000000000.timeindex   timestamp → offset (sparse)
  │   ├── 00000000000012847291.log         다음 세그먼트 (기본 1GB마다 롤링)
  │   ├── 00000000000012847291.index
  │   ├── 00000000000012847291.timeindex
  │   └── leader-epoch-checkpoint
  ├── orders-1/                        ← 같은 디스크 위의 다른 디렉터리
  ├── orders-2/
  └── payments-0/
```

**따라서 "디스크 1개 위에 파티션 여러 개"는 완전히 정상적인 구성입니다.** 파티션은 물리적 장치가 아니라 **파일 집합 + 그 파일들을 관리하는 논리적 단위(리더십, 오프셋 공간, 복제 단위)** 입니다.

그리고 각 파티션은 **자기만의 오프셋 공간**을 갖습니다. `orders-0`의 offset 100과 `orders-1`의 offset 100은 전혀 다른 레코드이고 서로 아무 관계가 없습니다.

---

### 2. 그런데 쓰기 경로에는 디스크가 (거의) 등장하지 않습니다

여기가 가설을 수정해야 하는 지점입니다. **Kafka는 producer가 메시지를 보낼 때마다 디스크에 쓰지 않습니다.**

#### 실제 쓰기 경로

```
  [Producer]
   ① send() → 파티셔너가 대상 파티션 결정
   ② RecordAccumulator: 파티션별 배치 버퍼에 누적
      (batch.size 만큼 차거나 linger.ms 만큼 기다림)
   ③ Sender 스레드가 "브로커 단위"로 여러 파티션 배치를 묶어 ProduceRequest 1개로 전송
              │
              ▼  네트워크
  [Broker]
   ④ 네트워크 스레드(num.network.threads) 수신 → 요청 큐에 적재
   ⑤ I/O 스레드(num.io.threads)가 꺼내서 처리
   ⑥ ReplicaManager → Partition → UnifiedLog.append()
        ↳ ★ 해당 파티션의 Log 객체 락 획득 (다른 파티션과 완전히 독립)
        ↳ 오프셋 할당 (단조 증가)
        ↳ FileChannel.write()  ──▶  ★ OS 페이지 캐시 (RAM)
        ↳ 필요 시 .index / .timeindex 엔트리 추가
        ↳ 락 해제
   ⑦ 팔로워 브로커가 Fetch 요청으로 복제해감
   ⑧ acks 조건(min.insync.replicas) 충족 → producer에 응답

              ⋯ 한참 뒤 ⋯
   ⑨ OS의 백그라운드 write-back이 페이지 캐시 → 실제 디스크로 flush
      (Kafka가 아니라 커널이 결정)
```

#### 핵심: Kafka는 기본적으로 `fsync`를 하지 않습니다

- `log.flush.interval.messages` 기본값은 사실상 무한대(`Long.MAX_VALUE`)입니다
- **Kafka 공식 권장은 이 값을 명시적으로 설정하지 말라는 것**입니다. OS의 백그라운드 flush에 맡기는 편이 효율적이기 때문입니다
- **내구성은 `fsync`가 아니라 복제(replication)로 확보**합니다 — `acks=all` + `min.insync.replicas=2`면 "서로 다른 머신 2대의 메모리에 존재함"이 보장되고, 이것이 "디스크 1대에 fsync됨"보다 오히려 안전합니다(디스크 1개 고장 = 전손 vs 머신 2대 동시 고장 필요)

> **왜 이게 중요한가:** producer의 쓰기 경로에서 **디스크 I/O는 동기적으로 일어나지 않습니다.** 따라서 "디스크 시스템콜의 동시성 경합"은 애초에 producer 지연시간의 병목이 아닙니다. 병목은 네트워크, 요청 큐, 복제 대기입니다.

#### 그럼 "동시성 이슈"는 어디서 어떻게 처리되는가

질문의 직관 — **"각 파티션이 독립적으로 쓰이니까 경합이 없다"** — 자체는 맞습니다. 다만 그 메커니즘이 디스크가 아니라 **애플리케이션 레벨의 락**입니다.

```
  브로커 1대 안에서:

  I/O 스레드 A ──▶ Partition orders-0 ──▶ [Log 객체 락 #1] ──▶ orders-0/*.log
  I/O 스레드 B ──▶ Partition orders-1 ──▶ [Log 객체 락 #2] ──▶ orders-1/*.log
  I/O 스레드 C ──▶ Partition orders-0 ──▶ [Log 객체 락 #1] ← A와 경합!
```

- **파티션마다 별도의 append 락**이 있습니다. 서로 다른 파티션 쓰기는 경합하지 않습니다
- **같은 파티션에 대한 쓰기는 직렬화됩니다** — 이것이 파티션 내 전순서(total order)를 보장하는 메커니즘입니다. 즉 **파티션은 "단일 라이터(single writer)" 구조**입니다
- 게다가 파티션의 쓰기는 **리더 브로커 1대에서만** 일어납니다. 클러스터 전체에서 그 파티션에 쓰는 주체는 항상 1개입니다

**정리하면:** "동시성 이슈가 없다"기보다 **"직렬화 단위를 파티션 단위로 잘게 쪼개서 경합 범위를 줄인 것"** 이 정확한 표현입니다. 그리고 그 직렬화는 커널이 아니라 Kafka가 자기 코드에서 합니다.

---

### 3. 결정적 반전 — 단일 디스크에서 파티션을 늘리면 느려집니다

가설을 직접 반증하는 부분입니다.

#### 왜 느려지는가

Kafka의 성능 근거는 [The Log 분석에서 다룬](../distributed-systems/the-log/02-part2-data-integration.md) **순차 I/O**입니다. 그런데:

```
  파티션 1개: 활성 세그먼트 파일 1개에만 append
  ┌──────────────────────────────────────────────┐
  │ ──────────────────────────────────────────▶  │  완벽한 순차 쓰기
  └──────────────────────────────────────────────┘

  파티션 100개: 활성 세그먼트 파일 100개에 번갈아 append
  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ... ┌────┐
  │ ─▶ │ │ ─▶ │ │ ─▶ │ │ ─▶ │ │ ─▶ │     │ ─▶ │
  └────┘ └────┘ └────┘ └────┘ └────┘     └────┘
     ▲      ▲      ▲      ▲      ▲           ▲
     └──────┴──────┴──────┴──────┴───────────┘
     디스크 관점에서는 100개 위치를 오가는 준랜덤 쓰기
```

- **HDD**: 헤드 시크가 발생 → 치명적. 순차 200MB/s가 랜덤 수 MB/s로 붕괴
- **NVMe SSD**: 시크는 없지만 여전히 손해 — write amplification 증가, 페이지 캐시의 dirty page가 여러 파일에 흩어져 write-back 효율 저하

#### 파티션 증가의 다른 비용들

디스크 외에도 파티션 수는 여러 자원을 선형으로 먹습니다.

| 자원 | 비용 |
|---|---|
| **파일 디스크립터** | 파티션당 세그먼트 × 3파일(`.log`/`.index`/`.timeindex`). 파티션 4,000개 = FD 수만 개 |
| **페이지 캐시 분산** | 파티션마다 활성 세그먼트 쓰기 영역을 캐시에 유지해야 함 → 캐시 효율 저하 |
| **Producer 메모리** | 파티션마다 배치 버퍼(`batch.size`, 기본 16KB). 파티션 1만 개면 producer 1개가 160MB |
| **배칭 효율 저하** | ★ 같은 트래픽이 많은 파티션에 분산되면 **파티션당 배치가 작아짐** → `linger.ms` 안에 배치가 안 참 → 요청 수 증가, 압축률 하락 |
| **리밸런싱 시간** | 컨슈머 그룹 리밸런싱이 파티션 수에 비례 |
| **장애 복구 시간** | 브로커 장애 시 리더 재선출해야 할 파티션 수만큼 지연 |
| **메타데이터** | ZooKeeper 시절 클러스터 상한을 만들던 요인. KRaft가 크게 개선 |

**배칭 효율 항목이 특히 반직관적입니다.** 파티션을 늘리면 병렬성이 올라갈 것 같지만, 실제로는 배치가 잘게 쪼개져서 **네트워크 요청 수가 늘고 압축률이 떨어져 전체 처리량이 감소**할 수 있습니다.

#### 실무 가이드라인

- **브로커당 4,000 파티션**이 흔히 인용되는 상한선입니다. Kafka 4.0+ 에서 잘 튜닝된 클러스터는 이를 넘길 수 있지만, CPU·메모리·디스크 I/O가 충분해야 합니다
- **"파티션을 늘리면 성능이 올라간다"는 통념은 틀렸습니다.** 유휴 파티션조차 시스템 자원을 소비합니다
- **파티션 수는 줄일 수 없습니다** — 늘리기만 가능하고, 늘리면 키-파티션 매핑이 깨집니다. 즉 **되돌릴 수 없는 결정**이므로 과다 설정이 특히 위험합니다

---

### 4. 그럼 파티션은 왜 존재하는가 — 진짜 목적 4가지

#### ① 브로커 간 수평 분산 (가장 근본적)

```
                     Topic: orders (파티션 6개)
  ┌─ Broker 1 ──────┐  ┌─ Broker 2 ──────┐  ┌─ Broker 3 ──────┐
  │  orders-0 (L)   │  │  orders-2 (L)   │  │  orders-4 (L)   │
  │  orders-1 (L)   │  │  orders-3 (L)   │  │  orders-5 (L)   │
  │  orders-2 (F)   │  │  orders-4 (F)   │  │  orders-0 (F)   │
  │  orders-5 (F)   │  │  orders-1 (F)   │  │  orders-3 (F)   │
  └─────────────────┘  └─────────────────┘  └─────────────────┘
       디스크·네트워크·CPU가 3배        (L)=리더 (F)=팔로워
```

**한 토픽의 데이터가 1대의 디스크 용량이나 1대의 NIC 대역폭을 넘어설 때, 나눌 수 있는 단위가 필요합니다.** 그게 파티션입니다. 이것이 존재 이유 1순위이고, **디스크 1개짜리 단일 브로커에서는 이 이득이 0입니다.**

#### ② 컨슈머 그룹 병렬성 (실무에서 파티션 수를 결정하는 가장 흔한 요인)

**규칙: 컨슈머 그룹 내에서 하나의 파티션은 최대 한 컨슈머에게만 할당됩니다.**

```
  파티션 3개, 컨슈머 5개인 그룹:
  ┌─ P0 ─┐  ┌─ P1 ─┐  ┌─ P2 ─┐
     │        │        │
     ▼        ▼        ▼
   C1       C2       C3       C4(유휴)  C5(유휴)
                              ↑ 파티션이 없어서 아무것도 못 함
```

**즉 파티션 수 = 그 토픽의 최대 소비 병렬성**입니다. 컨슈머를 10개 띄우고 싶으면 파티션이 최소 10개 있어야 합니다.

이것이 **디스크와 아무 상관없는, 순수한 분산 처리 관심사**이며, 실무에서 파티션 수를 정할 때 실제로 계산하는 값입니다:

```
  필요 파티션 수 ≈ max(목표 처리량 / 파티션당 처리량,
                      필요한 컨슈머 인스턴스 수)
```

> **2026년 변화 — KIP-932 Share Groups:** Kafka 4.0에서 early access, 4.1에서 preview, 4.2에서 GA된 **share group**은 이 제약을 깹니다. 여러 컨슈머가 **같은 파티션을 동시에** 소비할 수 있게 되어(전통적 큐 시맨틱), 컨슈머 병렬성이 파티션 수에 묶이지 않습니다. 대가는 **파티션 내 순서 보장 포기**입니다. 즉 "파티션 = 병렬성 단위"라는 공식이 처음으로 흔들리고 있습니다.

#### ③ 순서 보장 범위의 제어

[The Log Part 1 분석](../distributed-systems/the-log/01-part1-what-is-a-log.md)에서 다룬 이론적 긴장이 여기서 실무 결정으로 나타납니다.

> **전순서(total order)는 본질적으로 직렬화 지점(serialization point)을 요구한다.**
> 누군가는 "이게 3번, 저게 4번"이라고 혼자 결정해야 하고, 그 결정은 한 곳에서만 일어날 수 있다.

**파티셔닝은 이 직렬화 지점을 없애기 위해 전역 순서를 포기하는 거래입니다.**

```
  전역 전순서 요구  →  직렬화 지점 1개  →  단일 리더  →  수평 확장 불가
                                                            ↓ 포기
  파티션 내 전순서  →  직렬화 지점 N개  →  N개 리더   →  N배 확장
```

그래서 파티션 키 선택이 **곧 순서 보장 범위 설계**가 됩니다:

| 파티션 키 | 순서 보장 범위 | 확장성 |
|---|---|---|
| `user_id` | 같은 사용자의 이벤트끼리 | 사용자 수만큼 |
| `order_id` | 같은 주문의 이벤트끼리 | 주문 수만큼 |
| 없음(라운드로빈) | 없음 | 최대 |
| 고정값(파티션 1개) | 전역 | **없음** |

**대부분의 실무 요구사항은 "전역 순서"가 아니라 "엔티티 단위 순서"입니다.** 이걸 구분하면 확장성을 잃지 않고 필요한 순서를 얻습니다.

#### ④ 장애 도메인 / 운영 단위

- **리더 선출 단위** — 브로커 1대가 죽으면 그 브로커가 리더이던 파티션들만 재선출. 토픽 전체가 멈추지 않음
- **복제 단위** — ISR(In-Sync Replica) 관리가 파티션별로 독립
- **리밸런싱 단위** — 브로커 추가 시 파티션 단위로 이동
- **Tiered Storage 단위** — S3 오프로드도 파티션별 세그먼트 단위

---

### 5. 디스크 병렬성이 실제로 의미 있는 경우 — JBOD

**질문의 직관이 실제로 맞아떨어지는 유일한 지점**입니다. 브로커에 디스크가 여러 개 있을 때입니다.

```properties
# server.properties
log.dirs=/mnt/disk1/kafka,/mnt/disk2/kafka,/mnt/disk3/kafka,/mnt/disk4/kafka
```

- **JBOD (Just a Bunch Of Disks)** — RAID 없이 디스크를 각각 독립 마운트해 나열
- Kafka는 새 파티션(레플리카)을 생성할 때 **라운드로빈으로 로그 디렉터리를 선택**합니다 (파티션 개수 기준이며, 용량 기준이 아님 — 그래서 불균형이 생길 수 있음)
- 이 구성에서는 **파티션이 서로 다른 물리 디스크에 배치되므로 진짜 디스크 병렬성이 생깁니다.** 디스크 4개면 순차 쓰기 4줄이 동시에 진행됩니다

**KRaft에서의 JBOD 지원 (KIP-858):**
- ZooKeeper 시절에는 JBOD 디스크 장애 처리가 지원됐지만, 초기 KRaft에서는 빠져 있었습니다
- **KIP-858**이 이를 복원했습니다. 브로커가 여러 로그 디렉터리로 설정된 경우, **모든 파티션이 클러스터 메타데이터상 올바른 로그 디렉터리에 할당되었는지 검증될 때까지 FENCED 상태를 유지**합니다
- `AssignReplicasToDirs` RPC로 브로커가 컨트롤러에 "이 파티션은 이 디렉터리에 있다"를 보고합니다
- **KIP-113**으로 로그 디렉터리 간 레플리카 이동(디스크 간 리밸런싱)도 가능합니다

> **RAID vs JBOD:** RAID-10을 쓰면 OS가 스트라이핑을 해주므로 Kafka는 디스크 1개로 인식합니다. 관리는 편하지만 용량 절반을 잃습니다. Kafka는 **이미 복제로 내결함성을 확보**하므로 RAID의 중복성이 중복 투자가 됩니다. 그래서 대규모 배포에서는 JBOD가 일반적입니다.

**요약: "파티션 → 디스크 병렬성"은 JBOD 구성에서만 성립하며, 그때도 파티션의 1차 목적이 아니라 부수 효과입니다.**

---

### 6. 가설과 실제의 대조표

| 가설의 요소 | 실제 |
|---|---|
| 파티션 = 디스크의 논리적 분할 | ⚠️ 디렉터리 분할은 맞지만, **디스크가 아니라 클러스터의 논리적 분할**. 파티션은 브로커를 넘나들며 배치됨 |
| 디스크 시스템콜 동시성 회피 | ❌ Kafka는 `write()`로 **페이지 캐시**에만 쓰고 `fsync`는 하지 않음. 디스크 I/O는 커널이 비동기로 처리 |
| 병렬 쓰기 성능 향상 | ❌ **단일 디스크에서는 파티션 증가가 순차 I/O를 준랜덤으로 바꿔 오히려 손해** |
| 동시성 이슈 없음 | ⚠️ 정확히는 **파티션별 독립 락 + 파티션당 단일 라이터(리더)** 구조. 락이 없는 게 아니라 락 범위가 좁은 것 |
| (빠진 것) 브로커 간 분산 | ✅ **이것이 1순위 목적** |
| (빠진 것) 컨슈머 병렬성 | ✅ **실무에서 파티션 수를 결정하는 주 요인** |
| (빠진 것) 순서 보장 범위 설계 | ✅ 전역 직렬화 지점을 제거하기 위한 의도적 거래 |

---

### 7. 직접 확인해보는 법

```bash
# 1) 파티션이 정말 디렉터리인지 확인
ls -la /var/lib/kafka/data/ | head -20

# 2) 한 파티션의 파일 구성 확인
ls -la /var/lib/kafka/data/my-topic-0/

# 3) 세그먼트 내용을 사람이 읽을 수 있게 덤프
kafka-dump-log.sh --files /var/lib/kafka/data/my-topic-0/00000000000000000000.log --print-data-log

# 4) 인덱스 파일 내용 확인 (sparse index 엔트리 확인)
kafka-dump-log.sh --files /var/lib/kafka/data/my-topic-0/00000000000000000000.index

# 5) 현재 fsync 설정 확인 (기본값이 사실상 무한대임을 확인)
kafka-configs.sh --bootstrap-server localhost:9092 --describe --entity-type brokers --entity-name 0 \
  | grep -i flush

# 6) 페이지 캐시 사용량 확인 (Kafka 프로세스 RSS보다 훨씬 큰 캐시가 잡힘)
free -h
```

**직접 실험해볼 가치가 있는 것:** 디스크 1개짜리 브로커에서 파티션 1개 / 10개 / 100개 / 1000개로 같은 토픽을 만들고 `kafka-producer-perf-test.sh`로 처리량을 비교해보면, **어느 지점부터 처리량이 꺾이는지** 직접 관측할 수 있습니다. 가설이 반증되는 지점이 눈에 보입니다.

```bash
kafka-producer-perf-test.sh --topic test-p100 --num-records 10000000 \
  --record-size 1000 --throughput -1 \
  --producer-props bootstrap.servers=localhost:9092 acks=all
```

---

### 8. 흔한 오해 정리

| 오해 | 실제 |
|---|---|
| "파티션을 늘리면 처리량이 늘어난다" | ⚠️ **브로커를 함께 늘릴 때만.** 같은 브로커·같은 디스크에서 늘리면 일정 지점 이후 감소 |
| "Kafka는 메시지마다 디스크에 쓴다" | ❌ 페이지 캐시에 쓰고 커널이 나중에 flush. `fsync` 기본 비활성 |
| "acks=all이면 디스크에 저장됐다는 뜻" | ❌ **"ISR 브로커들의 페이지 캐시에 도달했다"**는 뜻. 내구성은 복제로 확보 |
| "파티션은 디스크 샤딩이다" | ❌ 클러스터 샤딩. 디스크 샤딩은 JBOD가 담당 |
| "파티션이 많으면 순서가 더 잘 지켜진다" | ❌ 반대. 파티션이 많을수록 순서 보장 범위가 좁아짐 |
| "파티션 수는 나중에 조정하면 된다" | ❌ **늘리기만 가능하고 줄일 수 없으며, 늘리면 키-파티션 매핑이 깨짐** |
| "RAID로 묶으면 파티션이 자동 분산된다" | ⚠️ RAID는 Kafka에게 디스크 1개로 보임. 디스크 병렬성은 얻지만 Kafka는 인지 못 함. Kafka가 디스크를 인지하려면 JBOD |
| "컨슈머를 늘리면 무조건 빨라진다" | ❌ 파티션 수가 상한. 초과 컨슈머는 유휴 (KIP-932 share group은 예외) |

---

## 한 줄 결론

> **파티션은 "디스크를 쪼개 병렬 쓰기를 하려는 장치"가 아니라, "전역 순서라는 직렬화 지점을 없애서 브로커와 컨슈머를 여러 개 쓸 수 있게 만드는 분산 단위"입니다.**
>
> 디스크 관점에서 보면 오히려 파티션은 **비용**입니다 — 순차 I/O를 여러 파일로 흩뜨리기 때문입니다. 그 비용을 감수하는 이유는 디스크가 아니라 **머신을 늘리고, 컨슈머를 늘리고, 장애 범위를 쪼개기 위해서**입니다.
>
> 그리고 쓰기 경로에는 디스크가 동기적으로 등장하지 않습니다. Kafka는 페이지 캐시에 쓰고, **내구성은 `fsync`가 아니라 복제로** 만듭니다.

---

## Sources

- [Kafka Partitioning: 5 Strategies Compared — Conduktor](https://www.conduktor.io/glossary/kafka-partitioning-strategies-and-best-practices)
- [How many partitions are too many for a Broker? — Confluent Community](https://forum.confluent.io/t/how-many-partitions-are-too-many-for-a-broker/509)
- [Kafka Throughput Bottlenecks: Partitions, Brokers, Replication, and Storage Explained — AutoMQ](https://www.automq.com/blog/kafka-throughput-bottlenecks-partitions-brokers-replication-and-storage-explained)
- [Kafka Partition Scaling Problems: When More Partitions Create More Operations Risk — AutoMQ](https://www.automq.com/blog/kafka-partition-scaling-problems-when-more-partitions-create-more-operations-risk)
- [The Power of Apache Kafka Partitions — Instaclustr](https://www.instaclustr.com/blog/the-power-of-kafka-partitions-how-to-get-the-most-out-of-your-kafka-cluster/)
- [Kafka Design Decisions: Use of page cache & file system](https://medium.com/@anadi.n.gangras/kafka-design-decisions-10c2a423bade)
- [Filesystem Selection for Kafka — AxonOps](https://axonops.com/docs/data-platforms/kafka/operations/performance/filesystem/)
- [Topic Configs — Apache Kafka 4.1 문서](https://kafka.apache.org/41/configuration/topic-configs/)
- [KIP-858: Handle JBOD broker disk failure in KRaft — Apache Kafka](https://cwiki.apache.org/confluence/display/KAFKA/KIP-858:+Handle+JBOD+broker+disk+failure+in+KRaft)
- [KIP-113: Support replicas movement between log directories — Apache Kafka](https://cwiki.apache.org/confluence/display/KAFKA/KIP-113:+Support+replicas+movement+between+log+directories)
- [Apache Kafka Internal Architecture - Consumer Group Protocol — Confluent Developer](https://developer.confluent.io/courses/architecture/consumer-group-protocol/)
- [Kafka Queue Semantics Now GA with Share Consumer API — Confluent](https://www.confluent.io/blog/kafka-queue-semantics-share-consumer-ga/)
- [Queues for Kafka (KIP-932) - Preview Release Notes — Apache Kafka](https://cwiki.apache.org/confluence/display/KAFKA/Queues+for+Kafka+(KIP-932)+-+Preview+Release+Notes)

---

## 관련 문서

- [`kafka/kafka-overview.md`](./kafka-overview.md) — Kafka 기본 구조
- [`kafka/kafka-consumer-mechanism.md`](./kafka-consumer-mechanism.md) — 컨슈머 그룹·리밸런싱 동작
- [`kafka/kafka-as-a-database-offset-lookup.md`](./kafka-as-a-database-offset-lookup.md) — 세그먼트·sparse index 내부 구조와 offset 조회
- [`distributed-systems/the-log/01-part1-what-is-a-log.md`](../distributed-systems/the-log/01-part1-what-is-a-log.md) — 전순서가 직렬화 지점을 요구하는 이유
- [`distributed-systems/the-log/02-part2-data-integration.md`](../distributed-systems/the-log/02-part2-data-integration.md) — 파티셔닝·배칭·순차 I/O·제로카피가 만드는 확장성
- [`os-fundamentals/`](../os-fundamentals/) — 페이지 캐시·시스템콜 등 OS 기초
