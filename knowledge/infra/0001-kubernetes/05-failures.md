---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# Kubernetes 장애 유형과 복구

## 쉬운 설명

Kubernetes에서 가장 위험한 고장은 일하는 기계(노드)가 아니라 **장부(etcd)와 접수 창구(API 서버)** 에서 난다. 노드 한 대가 꺼지면 다른 노드로 옮기면 되지만, 장부가 망가지거나 창구가 막히면 이미 돌던 일은 계속 돌아도 아무것도 새로 고치거나 옮기지 못한다. 그래서 장부를 자주 복사해 두는 것이 복구의 출발점이다.

## 일반 설명

이 문서는 **원인이 Kubernetes 자체**(컨트롤 플레인, etcd, 노드, 네트워크, 애드온)인 장애를 다룬다. 사람이 설정을 잘못해서 생기는 문제는 [자주 겪는 문제](./04-pitfalls.md)에 있다.

### 1. 장애 영향 범위 한눈에 보기

| 고장 난 곳 | 이미 실행 중인 Pod | 새 배포·스케일·재배치 | 복구 주체 |
|---|---|---|---|
| 워커 노드 1대 | 그 노드의 Pod만 중단 | 정상. 약 5분 뒤 다른 노드에 재생성 | 컨트롤러 (자동) |
| API 서버 전체 | **계속 실행** (kubelet이 마지막 상태 유지) | 불가. 죽은 Pod 재배치·HPA·Endpoint 갱신 모두 멈춤 | 운영자 / 관리형 제공자 |
| etcd 쿼럼 상실 | 계속 실행 | 불가 (API 서버가 쓰기 못 함) | 운영자: 멤버 복구 또는 스냅샷 복원 |
| CNI·CoreDNS | 실행되지만 통신·이름 해석 실패 | 새 Pod 네트워크 구성 실패 | 운영자 |
| 어드미션 웹훅 서버 | 계속 실행 | `failurePolicy: Fail`이면 해당 리소스 생성·변경 전부 거부 | 운영자 |

핵심: **데이터 플레인은 컨트롤 플레인 없이도 한동안 버틴다.** 다만 "버티는 동안 아무것도 고칠 수 없다"는 점과, 숨은 의존성(DNS 등)이 이 버팀을 깨뜨린다는 점이 실제 장애를 키운다.

### 2. etcd: 쿼럼 상실과 용량 초과

**쿼럼 상실**

| 멤버 수 | 쿼럼 | 견디는 장애 |
|---|---|---|
| 3 | 2 | 1 |
| 5 | 3 | 2 |

- 과반을 잃으면 etcd는 쓰기를 멈춘다(일관성을 위해 가용성 포기). 클러스터 상태 변경이 전부 멈춘다.
- 멤버 하나 고장: `etcdctl member remove` → 새 멤버 `member add` 후 합류.
- 과반 영구 손실: 남은 멤버로 강제 새 클러스터(`--force-new-cluster`)를 만들거나 **스냅샷에서 복원**한다. 복원은 새 클러스터를 만드는 것이라 스냅샷 이후 변경은 사라진다.
- etcd는 디스크 fsync 지연에 민감하다. 느린 디스크·노이지 네이버로 하트비트가 늦어지면 리더 선출이 반복되며 API가 불안정해진다. 전용 SSD를 쓴다.

**용량 초과**

- 기본 쿼터 **2GiB**, 권장 상한 **8GiB**(`--quota-backend-bytes`).
- 쿼터를 넘으면 클러스터 전체 `NOSPACE` 알람 → **읽기와 삭제만 허용**. 클라이언트는 `mvcc: database space exceeded` 오류를 받는다.
- 원인: 많은 Event·대형 CRD 객체, 히스토리 압축(compaction) 누락.
- 복구: compaction → 멤버마다 defrag → `etcdctl alarm disarm`. 대규모 클러스터는 Event를 별도 etcd에 둔다.

### 3. API 서버 과부하

| 원인 | 전형적 패턴 |
|---|---|
| 클러스터 전체를 LIST하는 클라이언트 | 노드마다 뜬 DaemonSet이 동시에 전체 리소스를 조회 → 노드 수 × 요청 |
| 재시작 후 watch 재연결 폭주 | 모든 컨트롤러·kubelet이 동시에 재LIST |
| 오퍼레이터·CRD 폭증 | 객체 수·크기 증가로 etcd·watch cache 부담 |

**사례 — OpenAI (2024.12.11)**: 새 텔레메트리 서비스를 모든 클러스터에 배포했는데, 이 서비스가 노드마다 무거운 Kubernetes API 호출을 보내 대형 클러스터의 API 서버가 무너졌다. 데이터 플레인은 대부분 살아 있었지만 서비스 디스커버리용 DNS가 API 서버에 의존해, DNS 캐시가 만료되자(약 20분 뒤) 서비스 간 통신이 무너졌다. 복구하려면 문제 서비스를 지워야 하는데 그 삭제 자체가 과부하된 API 서버를 거쳐야 했다. 팀은 클러스터 축소, 관리 API로의 네트워크 차단, API 서버 증설을 병행해 통제권을 되찾았고, 장애는 약 4시간 22분(15:16~19:38 PST) 이어졌다.

대응:

- **API Priority and Fairness**(1.29 GA)로 클라이언트별 요청 우선순위·동시성 한도를 둔다. 시스템 구성요소가 사용자 요청에 밀리지 않게 한다.
- 새 클라이언트·DaemonSet은 대형 클러스터에 **단계적으로** 배포하고 API 서버 지연·요청 수를 감시한다.
- 컨트롤 플레인이 죽은 상태에서도 쓸 수 있는 **비상 접근 경로**(예: API 서버를 거치지 않는 차단 수단)를 미리 준비한다.

### 4. 노드 장애

동작 순서:

1. kubelet이 Lease 갱신을 멈춤 → 노드 컨트롤러가 일정 유예 후 노드를 `NotReady`/`Unknown`으로 표시하고 `node.kubernetes.io/unreachable`(또는 `not-ready`) **NoExecute taint**를 붙인다.
2. Pod에는 이 taint에 대한 toleration이 **기본 300초** 자동으로 붙어 있다 → 약 5분 뒤 축출. DaemonSet Pod는 축출되지 않는다.
3. Deployment는 다른 노드에 새 Pod를 만든다.

| 워크로드 | 노드 연결이 끊겼을 때 |
|---|---|
| Deployment | 약 5분 뒤 다른 노드에 대체 Pod 생성. 원래 노드가 실제로는 살아 있으면 잠시 **두 벌**이 실행된다 |
| StatefulSet | "같은 이름의 Pod는 최대 1개" 보장 때문에 **자동으로 대체하지 않는다**. 노드가 확실히 꺼졌음을 확인한 뒤 `node.kubernetes.io/out-of-service` taint(비정상 종료 노드 처리, 1.28 GA)를 붙이거나 Pod를 강제 삭제해야 볼륨이 분리되고 다른 노드에서 뜬다 |
| 로컬 볼륨(hostPath, local PV) Pod | 다른 노드로 옮겨도 데이터가 없다 |

- 5분이 너무 길면 Pod에 `tolerationSeconds`를 짧게 지정한다. 너무 짧으면 순간적인 네트워크 끊김에도 대량 재배치가 일어난다.
- 노드 자원 고갈(메모리·디스크·PID 압박)은 kubelet이 스스로 Pod를 축출한다(BestEffort → Burstable 순).

### 5. 네트워크 분리와 스플릿 브레인

| 분리 형태 | 결과 |
|---|---|
| 노드 ↔ 컨트롤 플레인만 끊김 | 노드의 Pod는 계속 서비스 중인데 컨트롤 플레인은 노드를 죽었다고 판단 → 다른 곳에 대체 Pod 생성. **같은 앱이 두 곳에서 동시에 동작** |
| 컨트롤 플레인 존 하나 분리 | etcd 과반 쪽만 쓰기 가능. 소수 쪽 API 서버는 읽기도 오래된 값이거나 실패 |
| Pod 네트워크(CNI) 일부 단절 | Pod는 Ready인데 특정 노드 간 통신만 실패. Service 트래픽 일부만 오류 |

- Kubernetes는 etcd의 Raft 쿼럼 덕분에 **클러스터 상태**는 갈라지지 않는다. 하지만 **앱 인스턴스**는 위 첫 번째 경우처럼 두 벌이 될 수 있다.
- "한 번에 하나만 실행돼야 하는" 앱(배치 리더, 단일 소비자)은 Pod 수가 아니라 **Lease 기반 리더 선출** + 외부 자원 쪽 fencing으로 보장해야 한다.

### 6. 업그레이드 실패

- 업그레이드는 etcd 데이터의 스키마·저장 버전을 바꿀 수 있어 **공식 다운그레이드 경로가 없다**. 되돌리는 방법은 업그레이드 전 **etcd 스냅샷 복원**뿐이다.
- 사례: Reddit(2023.03)은 1.24 업그레이드 후 CNI 라우팅이 무너지자 롤백 대신 백업에서 컨트롤 플레인을 복원했다. 원인(라벨 변경)은 [자주 겪는 문제 — 업그레이드](./04-pitfalls.md#6-업그레이드와-폐기-api).
- 순서: etcd 스냅샷 → 컨트롤 플레인 한 대씩 → 애드온(CNI, CoreDNS, kube-proxy) → 노드 풀 교체(드레인 + PDB 존중). 관리형은 노드 풀을 새로 만들어 옮기는 블루/그린 방식이 안전하다.

### 7. 인증서 만료

- kubeadm이 만든 컨트롤 플레인 인증서는 기본 **1년** 유효. 업그레이드 때 자동 갱신되므로, **1년 넘게 업그레이드하지 않은 클러스터**에서 어느 날 API 서버·kubelet 통신이 한꺼번에 끊긴다.
- 확인: `kubeadm certs check-expiration`. 갱신: `kubeadm certs renew all` 후 컨트롤 플레인 정적 Pod 재시작(노드마다).
- 관리형 서비스는 컨트롤 플레인 인증서를 제공자가 관리한다.

### 8. 애드온 장애

| 애드온 | 깨지면 | 대응 |
|---|---|---|
| CNI | 새 Pod IP 할당 실패(`ContainerCreating`), 노드 간 통신 단절 | CNI DaemonSet 상태, IP 풀 고갈(클라우드 CNI는 서브넷 IP 부족) 확인 |
| CoreDNS | 이름 해석 실패 → 거의 모든 서비스 호출 실패 | 레플리카·PDB·안티 어피니티, NodeLocal DNSCache로 캐시 계층 |
| 어드미션 웹훅 | 웹훅 서버가 죽으면 대상 리소스 생성 전부 차단. 웹훅 자신을 재배포하는 것도 막힐 수 있음 | `kube-system` 등 핵심 Namespace는 `namespaceSelector`로 제외, 타임아웃 짧게, 중요도 낮으면 `failurePolicy: Ignore` |
| Ingress 컨트롤러 | 외부 진입 전체 중단 | 다중 레플리카 + 존 분산. 은퇴한 Ingress NGINX는 보안 패치가 없어 그 자체가 위험 요소 |

### 9. 백업과 DR

| 대상 | 방법 | 복구 범위 |
|---|---|---|
| 클러스터 상태 전체 | `etcdctl snapshot save` (직접 구축 시. 관리형은 제공자 책임) | 같은 클러스터를 스냅샷 시점으로 |
| 리소스 + 영구 볼륨 | Velero 등 (API로 리소스 내보내기 + 볼륨 스냅샷) | 다른 클러스터로 이전·복원 |
| 선언 그 자체 | GitOps 저장소(Argo CD, Flux) | 새 클러스터에 그대로 재적용. 상태 데이터는 별도 |
| 리전 장애 | 다른 리전에 대기 클러스터 + GSLB | → [Service LB와 GSLB](../../../inquiry/infra/0021-kubernetes-service-loadbalancer-gslb.md) |

- etcd 스냅샷은 Secret을 포함하므로 암호화해 보관한다.
- 백업은 **복원 리허설**을 해야 백업이다. 복원된 클러스터에서 실제 워크로드가 뜨는지까지 확인한다.

### 10. 장애 훈련

| 시나리오 | 방법 | 확인할 것 |
|---|---|---|
| 노드 장애 | 노드 VM 강제 종료 | 대체 Pod까지 걸린 시간, PDB·분산 배치가 지켜졌는지 |
| 존 장애 | 한 AZ의 노드 그룹 축소 | 남은 존 용량, 존에 묶인 PV를 쓰는 Pod |
| etcd 멤버 손실 | 멤버 1개 중지 → 복구 | 쓰기 지속 여부, 멤버 교체 절차 |
| etcd 전체 복원 | 스테이징에서 스냅샷 복원 | 복구 시간(RTO), 유실 범위(RPO) |
| 업그레이드 | 스테이징 클러스터에서 실제 애드온 구성으로 | 폐기 API, 라벨 변경, 애드온 호환성 |

## 관련 문서

- [Kubernetes의 역사](./01-history.md)
- [Kubernetes 개요 — 구조와 동작 방식](./02-overview.md)
- [Kubernetes 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [Kubernetes 운영 시 자주 겪는 문제](./04-pitfalls.md)
- [고가용성 구성 방식 — replica vs cluster, 쿼럼, DR 전략](../../../inquiry/distributed-systems/0009-high-availability-replication-vs-cluster-and-patterns.md)

## 참고 자료

- [Operating etcd clusters for Kubernetes — Kubernetes Docs](https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/)
- [etcd Maintenance (space quota, defrag, alarm) — etcd Docs](https://etcd.io/docs/v3.6/op-guide/maintenance/)
- [Considerations for large clusters — Kubernetes Docs](https://kubernetes.io/docs/setup/best-practices/cluster-large/)
- [API Priority and Fairness — Kubernetes Docs](https://kubernetes.io/docs/concepts/cluster-administration/flow-control/)
- [Taints and Tolerations (taint-based evictions) — Kubernetes Docs](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- [Node Shutdowns — Kubernetes Docs](https://kubernetes.io/docs/concepts/cluster-administration/node-shutdown/)
- [Kubernetes 1.28: Non-Graceful Node Shutdown Moves to GA — Kubernetes Blog](https://kubernetes.io/blog/2023/08/16/kubernetes-1-28-non-graceful-node-shutdown-ga/)
- [Certificate Management with kubeadm — Kubernetes Docs](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/)
- [Dynamic Admission Control — Kubernetes Docs](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [API, ChatGPT & Sora Facing Issues — OpenAI 장애 보고서](https://status.openai.com/incidents/ctrsv3lwd797/write-up)
- [OpenAI blames its massive ChatGPT outage on a new telemetry service — TechCrunch](https://techcrunch.com/2024/12/13/openai-blames-its-massive-chatgpt-outage-on-a-new-telemetry-service)
- [A hidden DNS dependency in Kubernetes — Render Blog](https://render.com/blog/a-hidden-dns-dependency-in-kubernetes)
- [You Broke Reddit: The Pi-Day Outage — r/RedditEng](https://www.reddit.com/r/RedditEng/comments/11xx5o0/you_broke_reddit_the_piday_outage/)
- [Kubernetes Failure Stories — k8s.af](https://k8s.af/)
