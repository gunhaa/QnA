# systemd로 싱글 인스턴스 켜두는 것 = 쿠버네티스 Pod과 같은 동작인가?

## 결론부터

**절반만 맞아요.** "프로세스를 계속 살려두고, 죽으면 재시작하고, 자원을 제한하고, 로그를 모아준다"는 **감독(supervisor) 역할**은 똑같아요. 하지만 **격리 방식**과 **여러 서버에 걸친 자동 복구/확장**이라는 두 가지 핵심에서 완전히 달라요. 기본 설정의 systemd 서비스는 사실 [[java-other-programs-systemd-default-execution|일반 프로세스]]에 더 가깝고, Pod은 [[docker-host-kernel-sharing-overhead|도커 컨테이너]]예요.

## 한 줄 비유

- **systemd 단일 유닛** = 사장님 혼자 운영하는 **동네 가게**. 가게가 문 닫으면(프로세스가 죽으면) 사장님(systemd)이 바로 다시 문을 열어주지만(`Restart=on-failure`), 가게 건물 자체(host 서버)가 무너지면 아무도 대신 열어줄 사람이 없어요.
- **쿠버네티스 Pod** = 여러 지점을 관리하는 **프랜차이즈 본사**. 한 지점(Node)이 통째로 문을 닫아도, 본사(쿠버네티스 컨트롤 플레인)가 알아서 다른 동네에 새 지점을 열어줘요(Pod을 다른 Node로 재스케줄링).

## 공통점 — 둘 다 "감독관" 역할을 함

| 기능 | systemd | Kubernetes |
|---|---|---|
| 죽으면 재시작 | `Restart=on-failure` | `restartPolicy` (Pod 내 컨테이너 재시작) |
| 자원 제한 | `CPUQuota=`, `MemoryMax=` → 내부적으로 [[cgroups-explained|cgroup]] 사용 | `resources.limits` → 내부적으로 동일하게 cgroup 사용 |
| 로그 수집 | `journalctl -u` | `kubectl logs` (컨테이너 런타임이 stdout/stderr 수집) |
| 부팅/기동 순서 | `After=`, `Requires=` | `initContainers`, readiness/liveness probe |

즉 **자원 사용량을 재는 저울(cgroup) 자체는 사실 똑같은 커널 기능**을 씁니다. 검색 결과에서도 "namespace는 '뭐가 보이는가'를, cgroup은 '얼마나 쓸 수 있는가'를 답한다"고 정리하는데, 이 cgroup 축은 systemd와 쿠버네티스가 공유해요.

## 결정적 차이점

### 1. 격리(isolation) — 여기가 진짜 다른 지점

**기본 설정의 `.service` 유닛은 격리가 거의 없어요.** host와 똑같은 PID namespace, 네트워크, 파일시스템을 그대로 공유하는 "그냥 평범한 프로세스 중 하나"일 뿐이에요. (물론 `PrivateTmp=`, `ProtectSystem=strict`, `PrivateNetwork=`, `DynamicUser=` 같은 옵션을 켜면 컨테이너와 비슷한 수준까지 격리를 흉내낼 수는 있지만, 기본값은 아니에요.)

반면 **쿠버네티스 Pod은 처음부터 격리가 기본값**이에요. 컨테이너 런타임(containerd 등)이 Pod마다 자기만의 네트워크 namespace(고유 IP), 마운트 namespace(자기만 보이는 파일시스템)를 만들어줘요.

> namespace는 "무엇이 보이는가", cgroup은 "얼마나 쓸 수 있는가"를 답한다 — 이 둘을 **기본으로 같이 쓰는 것**이 컨테이너/Pod이고, systemd 단일 유닛은 **cgroup만 기본으로 쓰는 것**이라는 차이예요.

### 2. 패키징 — "이미 설치된 것" vs "이미지 통째로"

- systemd: host 서버에 이미 설치돼 있는 실행 파일(java, python 등)의 경로를 `ExecStart`에 적을 뿐이에요. 실행 환경(라이브러리 버전 등)은 host 상태에 의존해요.
- Pod: 컨테이너 이미지(예: `myapp:1.2.3`)라는 **불변(immutable)의 통째 패키지**를 실행해요. 어느 Node에서 실행하든 내부 환경이 항상 동일해요.

### 3. 장애 복구 범위 — 한 대 vs 클러스터 전체

- systemd: **같은 서버 안에서만** 재시작해요. 그 서버 자체가 죽으면 손을 쓸 수 없어요.
- Kubernetes: 컨트롤 플레인이 클러스터 전체를 보고 있다가, Node가 죽으면 **다른 살아있는 Node**에 Pod을 새로 띄워줘요. 게다가 `Deployment`/`ReplicaSet`으로 "항상 N개는 떠있어야 한다"는 선언적 목표를 유지해줘요.

### 4. 네트워킹/서비스 디스커버리

- systemd: 별도 네트워크 추상화가 없어요. host IP를 그대로 써요.
- Kubernetes: Pod마다 고유 IP, `Service`/DNS를 통한 로드밸런싱·디스커버리가 기본 제공돼요.

## 그런데 두 세계가 실제로 만나는 지점도 있어요

- **Podman Quadlet**: 컨테이너를 쿠버네티스 없이 "systemd 유닛 파일처럼" 선언해서 실행하는 최신 방식이에요. `.container` 파일을 쓰면 Podman이 이를 자동으로 진짜 systemd `.service` 유닛으로 변환해줘서, 컨테이너의 격리 + systemd의 감독(재시작/의존성/로그)을 동시에 누릴 수 있어요. "싱글 서버에서 컨테이너 하나만 안정적으로 돌리고 싶다"는 상황이면 오히려 이게 쿠버네티스보다 systemd에 더 가까운 절충안이에요.
- **Podman의 cgroup 드라이버**: Podman은 기본적으로 cgroup 관리를 systemd에게 위임하는 `systemd` 드라이버를 쓰는 반면, Docker/containerd는 자체 `cgroupfs` 드라이버를 써요 — 컨테이너 세계 안에서도 이미 systemd와 협력하는 부분이 있다는 뜻이에요.

## 정리

| | systemd 단일 유닛 | Kubernetes Pod |
|---|---|---|
| 프로세스 재시작 | ✅ (같은 서버 안에서) | ✅ (클러스터 어디서든) |
| 자원 제한(cgroup) | ✅ | ✅ |
| namespace 격리(네트워크/파일시스템) | ❌ (기본값 기준, 옵션으로 일부 가능) | ✅ (기본값) |
| 패키징 | host에 설치된 실행 파일 참조 | 불변 컨테이너 이미지 |
| 서버(Node) 죽었을 때 복구 | ❌ (수동 개입 필요) | ✅ (다른 Node로 자동 재스케줄) |
| 여러 대에 걸친 확장/로드밸런싱 | ❌ | ✅ |

**한 문장 요약**: systemd 단일 유닛은 "한 대의 서버 안에서 프로세스를 감독하는 것"이고, 쿠버네티스 Pod은 "격리된 컨테이너 + 여러 대의 서버에 걸친 자동 복구·확장까지 포함하는 것"이라, Pod이 systemd의 상위 호환이 아니라 **아예 다른 층(계층)에서 동작하는 개념**이에요.

## Sources
- [Spin Infrastructure Adventures: Containers, Systemd, and CGroups - Shopify](https://shopify.engineering/spin-infrastructure-adventures-containers-systemd-cgroups)
- [8 cgroups and systemd slices: Coevolved process management · Core Kubernetes](https://livebook.manning.com/book/core-kubernetes/chapter-8/v-2)
- [Mastering Linux Isolation: A Practical Guide to Namespaces and cgroups](https://medium.com/@er.sumitsah/mastering-linux-isolation-a-practical-guide-to-namespaces-and-cgroups-5cd39c82fe3d)
