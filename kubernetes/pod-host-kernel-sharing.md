# 쿠버네티스 Pod도 host 커널을 공유하는가?

## 결론부터

**네, 공유합니다.** 쿠버네티스(Kubernetes)의 Pod은 결국 [[docker-host-kernel-sharing-overhead|도커 컨테이너]]와 똑같은 원리로 동작해요. Pod 안의 컨테이너들도 그 Pod이 떠 있는 **Node(서버)의 host 커널을 그대로 빌려 씁니다.**

## 한 줄 비유

도커가 "섬 하나에 칸막이 방을 여러 개 만드는 것"이었다면, 쿠버네티스는 **"여러 섬(Node)에 어떤 방(Pod)을 어디에 배치할지 정해주는 관리 사무소"**예요. 방을 실제로 만드는 방식(커널 공유 + namespace + cgroup)은 도커와 동일해요.

## Pod 안에서는 무슨 일이 일어나는가

Pod은 컨테이너를 감싸는 "봉투" 같은 개념이에요. 실제로 컨테이너를 만들고 격리시키는 건 여전히 Node 위에서 돌아가는 **컨테이너 런타임**(containerd, CRI-O 등)이고, 이 런타임이 도커와 마찬가지로 host 커널의 **Namespace**와 **cgroup**을 사용해요.

- **네트워크 namespace**: Pod 안의 컨테이너들은 네트워크 namespace를 서로 공유해요. 그래서 같은 Pod 안 컨테이너끼리는 `localhost`로 통신할 수 있어요 (한 방 안에 룸메이트 여러 명이 사는 셈).
- **PID/마운트 namespace**: 보통 컨테이너마다 따로 나눠서, 서로의 프로세스나 파일을 못 보게 해요.
- **cgroup**: Pod의 `resources.requests`/`resources.limits`에 CPU·메모리를 적어두면, 쿠버네티스가 그걸 [[cgroups-explained|cgroup]] 설정으로 변환해서 커널에게 전달해요.

즉 쿠버네티스는 "커널을 새로 만드는" 게 아니라, **여러 Node에 걸쳐 도커(또는 다른 런타임)가 하는 namespace/cgroup 작업을 자동으로 스케줄링·관리해주는 오케스트레이터**일 뿐이에요.

## 그래서 오버헤드는?

도커 컨테이너 하나와 거의 같아요. 커널을 공유하니 VM 대비 오버헤드가 매우 작다는 결론도 그대로 적용돼요. 다만 쿠버네티스는 추가로 이런 걸 얹어요:
- **kube-proxy / CNI**: Pod 간 네트워크를 연결해주는 계층이 하나 더 있어서, 아주 약간의 네트워크 홉이 늘어나요.
- **kubelet의 감시**: Node마다 떠 있는 kubelet이 Pod 상태를 계속 체크하는 비용이 있어요.

이것들도 VM을 통째로 새로 켜는 비용에 비하면 무시할 수준이에요.

## 2026년 업데이트: User Namespace가 GA로 승격됨

쿠버네티스 **v1.36 (2026년 4월)**에서 **User Namespace 지원이 정식 GA(General Availability)**가 됐어요. Pod 스펙에 `hostUsers: false`를 설정하면, 컨테이너 안의 root 사용자를 host에서는 권한 없는 일반 UID로 매핑시켜요.

비유하자면, 컨테이너 안에서는 "내가 왕(root)이다!"라고 착각하게 해주지만, 실제 host 입장에서는 "그냥 평범한 백성 1명"으로 보이게 눈속임하는 기능이에요. 이렇게 하면 컨테이너 안에서 권한 상승 공격을 당해도 host까지 영향이 번지는 걸 크게 줄일 수 있어요.

단, 이 기능을 쓰려면:
- Node의 리눅스 커널이 **6.3 이상**이어야 하고
- **containerd 2.0+ / CRI-O 1.25+**, 그리고 **runc 1.2+ / crun 1.9+** 조합이 필요해요.

## 그래도 남는 근본적인 한계

User Namespace가 GA가 됐어도, **"커널을 공유한다"는 사실 자체는 바뀌지 않아요.** 만약 host 커널 자체에 취약점(예: 권한 상승 취약점)이 있다면, User Namespace 매핑은 그보다 더 낮은 계층(커널 자체)에서 뚫리는 공격이라 방어를 못 해요. 즉 User Namespace는 "격리를 좀 더 촘촘하게 만드는 것"이지, "커널 자체를 분리하는 것"은 아니에요.

그래서 정말 강한 격리(예: 서로 신뢰할 수 없는 멀티테넌트 워크로드)가 필요하면, 여전히 **Kata Containers**나 **gVisor** 같이 "각 Pod마다 진짜로 별도의 마이크로 VM/커널 계층을 두는" 방식을 쓰기도 해요.

## 정리 표

| | 도커 컨테이너 | 쿠버네티스 Pod |
|---|---|---|
| 커널 | host 커널 공유 | host(Node) 커널 공유 (동일) |
| 격리 도구 | namespace + cgroup | 동일 (containerd/CRI-O가 실행) |
| 추가 계층 | 없음 | 스케줄링, CNI 네트워크, kubelet 감시 |
| 2026 신규 옵션 | - | `hostUsers: false`로 User Namespace 격리 강화 (v1.36 GA) |
| 근본 한계 | host 커널 취약점에 영향받음 | 동일 (User Namespace로도 커널 취약점 자체는 못 막음) |

## Sources
- [Pods | Kubernetes](https://kubernetes.io/docs/concepts/workloads/pods/)
- [Kubernetes v1.36: User Namespaces in Kubernetes are finally GA | Kubernetes](https://kubernetes.io/blog/2026/04/23/kubernetes-v1-36-userns-ga/)
- [Kubernetes User Namespaces Don't Fix the Shared Kernel](https://edera.dev/stories/kubernetes-finally-has-user-namespace-support-the-shared-kernel-problem-remains)
- [Kubernetes User Namespaces in 1.36 with hostUsers: false - DEV Community](https://dev.to/indra_gustiprasetya_a80a/kubernetes-user-namespaces-in-136-with-hostusers-false-gpb)
