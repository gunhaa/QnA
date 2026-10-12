# 쿠버네티스 클러스터는 커널을 어떻게 쓰는가? (VM 1개? 클러스터 커널? 호스트 공유? Pod = VM?)

셋 다 아니에요. 정답은 **"섬(Node)마다 자기 커널이 따로 있고, 그 섬들을 다리(네트워크)로 이어서 하나처럼 보이게 만든 것"**이에요. 섬 안에서는 도커처럼 커널을 같이 쓰지만, 섬과 섬 사이에는 커널 공유가 전혀 없어요 — 그냥 배(네트워크 패킷)로 오갈 뿐이에요.

## 세 가지 가설 vs 실제 구조

```mermaid
flowchart TB
    subgraph H1["가설 1: 클러스터 = VM 1개?"]
        direction TB
        VM1["거대한 VM 하나<br/>그 안에 Pod들이 다 들어있음"]
    end
    subgraph H2["가설 2: 클러스터 전체가 호스트 커널 하나 공유?"]
        direction TB
        HK["모든 노드가 물리적으로<br/>같은 커널 인스턴스를 공유"]
    end
    subgraph H3["가설 3: 클러스터 전용 커널이 따로 있음?"]
        direction TB
        CK["K8s가 자체 커널/하이퍼바이저를<br/>새로 만들어서 구동"]
    end

    X1["❌ 틀림: Node는 각자 독립된 물리/가상 머신"]
    X2["❌ 틀림: 커널은 물리 머신 경계를 못 넘음"]
    X3["❌ 틀림: K8s는 커널을 만들지 않음, 순수 오케스트레이션 소프트웨어"]

    H1 --> X1
    H2 --> X2
    H3 --> X3

    style H1 fill:#3a1e2f,stroke:#f472b6,color:#fff
    style H2 fill:#3a1e2f,stroke:#f472b6,color:#fff
    style H3 fill:#3a1e2f,stroke:#f472b6,color:#fff
```

## 실제 구조: "노드별 독립 커널 + 네트워크로 이어붙인 착시"

```mermaid
flowchart TB
    subgraph N1["Node 1 (물리서버/VM #1)"]
        K1[("리눅스 커널 #1")]
        C1A["Pod A 컨테이너"] -.->|namespace/cgroup| K1
        C1B["Pod B 컨테이너"] -.->|namespace/cgroup| K1
    end

    subgraph N2["Node 2 (물리서버/VM #2, 완전히 별개)"]
        K2[("리눅스 커널 #2")]
        C2A["Pod C 컨테이너"] -.->|namespace/cgroup| K2
    end

    subgraph N3["Node 3"]
        K3[("리눅스 커널 #3")]
        C3A["Pod D 컨테이너"] -.->|namespace/cgroup| K3
    end

    CNI["CNI 오버레이 네트워크<br/>(Calico/Cilium 등)"]
    API["kube-apiserver<br/>(논리적으로 하나처럼 보이게<br/>이름/상태를 통일 관리)"]

    C1A <-->|"오직 네트워크 패킷으로만 통신<br/>(커널 공유 아님!)"| CNI
    C2A <--> CNI
    C3A <--> CNI

    N1 -.->|"상태 보고"| API
    N2 -.->|"상태 보고"| API
    N3 -.->|"상태 보고"| API

    style N1 fill:#1e3a2f,stroke:#4ade80,color:#fff
    style N2 fill:#1e3a2f,stroke:#4ade80,color:#fff
    style N3 fill:#1e3a2f,stroke:#4ade80,color:#fff
```

## 요약 표

| 범위 | 커널 공유 여부 | 근거 |
|---|---|---|
| **같은 Node 안, 같은 Pod 안 컨테이너들** | ✅ 공유 (네트워크 namespace까지 공유해서 `localhost` 통신 가능) | 도커와 동일한 원리, [[pod-host-kernel-sharing]] 참고 |
| **같은 Node 안, 다른 Pod들** | ✅ 공유 (namespace/cgroup으로 격리만 함) | 커널 인스턴스 자체는 하나 |
| **다른 Node에 있는 Pod들** | ❌ 공유 안 함 (완전히 별개의 커널) | Node = 별도의 물리/가상 머신, 오직 네트워크로만 연결 |
| **클러스터 전체** | ❌ "클러스터 커널" 같은 건 존재하지 않음 | K8s는 소프트웨어 오케스트레이터일 뿐, 커널이나 하이퍼바이저가 아님 |

---

## 일반 설명

### 커널 공유의 경계는 정확히 "Node"에서 끊긴다

Linux 커널은 하드웨어(또는 그 하드웨어를 흉내 낸 가상 머신) 한 대 위에서 부팅되는 단일 인스턴스다. 커널이 물리적/가상적 머신 경계를 넘어 여러 대에 걸쳐 존재할 수 있는 방법은 없다. 따라서:

- **Node 내부**: 같은 Node에서 도는 모든 Pod/컨테이너는 그 Node가 부팅한 **단 하나의 커널 인스턴스**를 공유한다. 컨테이너 런타임(containerd, CRI-O)이 그 커널의 **Namespace**(PID, Mount, Network, UTS, IPC 등)와 **cgroup**을 이용해 프로세스를 논리적으로만 격리한다. 이건 도커 컨테이너의 격리 방식과 완전히 동일하다.
- **Node 사이**: Node A와 Node B는 물리적으로 다른 커널이 각자 독립적으로 돌아간다. 서로의 프로세스 목록도, 파일시스템도, 메모리도 전혀 볼 수 없고, 오직 **네트워크 인터페이스를 통한 패킷 교환**으로만 상호작용한다.

### 그럼 클러스터가 "하나처럼" 보이는 이유는?

커널을 공유해서가 아니라, **소프트웨어 계층에서 통일된 뷰를 제공**하기 때문이다.

1. **kube-apiserver + etcd**: 모든 Node/Pod의 상태를 중앙(논리적으로) 저장소에 모아두므로 `kubectl get pods -A`로 클러스터 전체를 한 화면에서 볼 수 있다. 이건 상태 조회 API의 통일이지, 커널의 통일이 아니다.
2. **CNI(오버레이/언더레이 네트워크)**: 서로 다른 Node에 있는 Pod라도 마치 같은 평평한 네트워크(flat network) 위에 있는 것처럼 Pod IP로 직접 통신 가능하게 해준다. Calico/Cilium 같은 CNI 플러그인이 BGP 라우팅이나 VXLAN 터널링으로 이 "가상의 단일 네트워크" 착시를 만든다.
3. **CoreDNS**: 어느 Node에 떠 있든 상관없이 서비스 이름 하나로 접근 가능하게 해서, 물리적 위치를 완전히 숨긴다.

즉 Kubernetes가 만드는 "하나의 시스템처럼 보이는 착시"는 **네트워크 계층 + 컨트롤 플레인의 상태 통합**으로 만들어지는 것이지, 실제 커널이나 하이퍼바이저를 클러스터 단위로 새로 만든 게 절대 아니다. Kubernetes 자체는 커널 코드를 한 줄도 갖고 있지 않은 순수 사용자 공간(userspace) 오케스트레이션 소프트웨어다.

### 그럼 Pod은 VM에서 실행되는 것과 같은가?

아니다. 기본(runc) Pod은 **격리된 프로세스**일 뿐 VM이 아니다. Pod 안에서 `uname -r`을 치면 Node의 커널 버전이 그대로 나오는 것이 커널 공유의 직접 증거다.

| 항목 | 기본 Pod (runc) | VM |
|---|---|---|
| 커널 | Node host 커널 공유 | 게스트마다 독립 커널 |
| 격리 수단 | namespace, cgroup, seccomp, LSM | 하이퍼바이저 + 하드웨어 가상화(VT-x/AMD-V) |
| 시작 시간 | 수십~수백 ms (프로세스 생성 수준) | 수 초~수십 초 (부팅) |
| 메모리 오버헤드 | 거의 없음 | 게스트 OS 몫 수백 MB~ |
| 커널 버전/모듈 | Node 것을 그대로 사용 (Pod별로 못 바꿈) | 게스트별로 자유 |
| 보안 경계 | 커널 취약점 1개로 탈출 가능(container escape) | 하이퍼바이저를 뚫어야 함 |

### 예외: Node 안에서도 Pod마다 커널을 분리하는 경우 (RuntimeClass)

강한 격리가 필요한 멀티테넌시 환경에서는 `RuntimeClass`로 기본 runc 대신 샌드박스 런타임을 지정한다.

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: kata
handler: kata        # containerd에 설정된 런타임 핸들러 이름
---
apiVersion: v1
kind: Pod
metadata:
  name: isolated
spec:
  runtimeClassName: kata
  containers:
    - name: app
      image: nginx
```

다만 두 대표 런타임의 방식은 다르다.

| 런타임 | 방식 | Pod별 커널? | 비용 |
|---|---|---|---|
| **Kata Containers** | Pod마다 경량 마이크로 VM을 띄우고 **진짜 게스트 리눅스 커널을 부팅** (KVM + QEMU/Cloud Hypervisor/Firecracker) | **예** | 시작 ~100ms+, Pod당 ~128MB 메모리, Node에 `/dev/kvm` 필요 |
| **gVisor (runsc)** | VM 아님. 유저 공간 프로세스 **Sentry("application kernel", Go로 작성)**가 syscall을 가로채 대신 처리하는 "가짜 커널". KVM 플랫폼 모드도 주소 공간 격리용일 뿐 게스트 OS를 부팅하지 않음 | **아니요** (host 커널은 하나, 노출 면적만 축소) | syscall 많은 워크로드는 2~3배 느려질 수 있음 |
| **runc (기본)** | namespace + cgroup | 아니요 | 거의 없음 |

즉 **Kata를 쓸 때만 "Pod = 작은 VM"**이 성립한다. User Namespace(v1.36 GA)로도 공유 커널 문제가 남는 이유는 [[pod-host-kernel-sharing]] 참고.

### 클라우드 매니지드의 경우

- EKS/GKE의 일반 Node는 그 자체가 **클라우드 VM**이다. 즉 "VM(Node) 하나 안에서 여러 Pod이 커널을 공유"하는 구조.
- AWS Fargate처럼 Pod마다 Firecracker microVM을 띄우는 서비스는 사실상 Pod별 커널이다. GKE Sandbox는 gVisor 기반이다.

Sources:
- [Pods | Kubernetes](https://kubernetes.io/docs/concepts/workloads/pods/)
- [cgroups and Namespaces — The Linux Kernel's Building Blocks Behind Containers | DEV Community](https://dev.to/kobbyprincee/cgroups-and-namespaces-the-fundamental-building-blocks-of-linux-containers-and-orchestration-53e3)
- [Why Kubernetes Namespace Isolation Fails | vCluster](https://www.vcluster.com/blog/kubernetes-namespace-isolation-failures)
- [Kubernetes User Namespaces Don't Fix the Shared Kernel | Edera](https://edera.dev/stories/kubernetes-finally-has-user-namespace-support-the-shared-kernel-problem-remains)
- [Introduction to gVisor security | gVisor](https://gvisor.dev/docs/architecture_guide/intro/)
- [MicroVM vs gVisor | Northflank](https://northflank.com/blog/microvm-vs-gvisor)
- [Kata Containers vs gVisor | Northflank](https://northflank.com/blog/kata-containers-vs-gvisor)
- [Kata Containers vs gVisor: A RuntimeClass Decision Framework (2026-07)](https://bex.co/blog/2026/07/09/kata-containers-vs-gvisor-runtimeclass-selection)
- [Kata Containers Isolation – Kubernetes agent-sandbox SIG](https://agent-sandbox.sigs.k8s.io/docs/use-cases/kata-containers-isolation/)
- [How to Create Kubernetes RuntimeClass – OneUptime (2026-01)](https://oneuptime.com/blog/post/2026-01-30-kubernetes-runtimeclass/view)
