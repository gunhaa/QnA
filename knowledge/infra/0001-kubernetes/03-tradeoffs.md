---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# Kubernetes 트레이드오프와 선택 기준

## 쉬운 설명

Kubernetes는 **무엇이든 끼울 수 있는 빈 공장 설비**다. 컨베이어(네트워크), 창고(저장소), 정문(Ingress)까지 원하는 부품을 골라 끼우면 어떤 제품이든 만들 수 있다. 대신 부품을 고르고 맞추고, 1년에 한 번씩 설비 전체를 새 버전으로 바꾸는 일은 공장 주인 몫이다. 작은 가게라면 이 설비가 일보다 더 큰 짐이 된다.

## 일반 설명

이 문서는 **고르기 전에** 읽는 문서다. 동작 방식은 [개요](./02-overview.md), 고른 뒤 사람이 잘못 쓰는 문제는 [자주 겪는 문제](./04-pitfalls.md), 클러스터 자체가 깨지는 상황은 [장애 유형과 복구](./05-failures.md)에서 다룬다.

### 1. 핵심 설계 선택: 얻은 것과 포기한 것

| 설계 선택 | 얻은 것 | 포기한 것 (대가) | 수치·사례 |
|---|---|---|---|
| **선언형 API + 조정 루프** | 자가 치유, GitOps, 같은 YAML로 어디서나 재현 | 명령이 "즉시 성공/실패"하지 않고 **결국 수렴**. 원인 추적이 Events·컨트롤러 로그로 흩어짐 | `kubectl apply`는 성공해도 Pod는 `Pending`일 수 있다 |
| **모든 상태를 etcd 하나에, 모든 접근은 API 서버로** | 강한 일관성, watch 기반 이벤트 구동 | 클러스터 크기 상한. API 서버가 **단일 병목·단일 장애 지점**이 된다 | 공식 상한: 노드 5,000, 노드당 Pod 110, Pod 150,000, 컨테이너 300,000. etcd 기본 쿼터 2GiB, 권장 상한 8GiB |
| **Pod = 커널을 공유하는 컨테이너 묶음** | VM보다 높은 밀도, 초 단위 기동 | 커널 공유로 **멀티 테넌트 격리가 약함** | 강한 격리가 필요하면 RuntimeClass로 gVisor·Kata를 따로 붙여야 함 → [클러스터 커널 모델](../../../inquiry/infra/0016-kubernetes-cluster-kernel-model.md) |
| **코어는 최소, 나머지는 플러그인**(CRI·CNI·CSI·Ingress 컨트롤러·오퍼레이터) | 벤더 중립, 어떤 클라우드·온프레미스에도 이식 | 프로덕션 클러스터는 **부품 조립품**. 각 부품의 수명·보안 패치를 직접 추적 | Ingress NGINX(클라우드 네이티브 환경 약 절반이 사용)가 메인테이너 부족으로 2026.03 은퇴 |
| **빠른 릴리스**(연 3회, 마이너당 약 1년 지원) | 기능이 빨리 들어옴 | **매년 최소 1회 업그레이드** 강제. 폐기 API 대응 | EKS 연장 지원은 클러스터당 $0.60/h로 표준($0.10/h)의 6배 |
| **노드 오토스케일링을 코어 밖에 둠** | 클라우드 중립 | 노드 확장은 별도 도구(Cluster Autoscaler, Karpenter)와 클라우드 연동 필요 | → [워커 노드 오토스케일링](../../../inquiry/infra/0018-kubernetes-worker-node-autoscaling.md) |

한 줄로 줄이면, Kubernetes는 **이식성과 확장성을 위해 단순함과 운영 비용을 포기**했다. 이 대가는 팀 규모가 작을수록 커진다.

### 2. 대안 비교

| 대안 | 다른 점 | 고르는 경우 | 주의 |
|---|---|---|---|
| **VM + systemd / Docker Compose** | 오케스트레이션 없음. 한 대 단위 관리 | 서비스 몇 개, 서버 몇 대 | 노드 장애 시 자동 재배치 없음 → [systemd vs Pod](../../../inquiry/infra/0015-systemd-single-instance-vs-kubernetes-pod.md) |
| **서버리스 컨테이너**(Cloud Run, AWS Fargate+ECS, Azure Container Apps) | 클러스터 개념이 없음. 요청량으로 과금, 0까지 축소 | 무상태 HTTP 서비스, 트래픽 편차 큼, 인프라 팀이 없음 | 장시간 연결·GPU·커스텀 네트워크 제약. 벤더 종속 |
| **Amazon ECS** | AWS 전용 오케스트레이터, 컨트롤 플레인 무료 | AWS만 쓰고 이식성이 필요 없음 | Kubernetes 생태계(Helm, 오퍼레이터) 사용 불가 |
| **HashiCorp Nomad** | 단일 바이너리, 컨테이너 외 바이너리·VM도 스케줄 | 이기종 워크로드, 작은 운영 팀 | 2023년 BSL 라이선스로 변경. 생태계가 Kubernetes보다 훨씬 작음 |
| **Docker Swarm** | Docker CLI 그대로, 설정 단순 | 소규모 내부 서비스 | 신규 기능·생태계 정체 |
| **PaaS**(Heroku 류, 사내 PaaS) | 코드만 올리면 됨 | 표준 웹앱 위주 | 커스터마이즈 한계 |
| **경량 배포판 k3s** | 같은 Kubernetes API, 단일 바이너리·적은 메모리 | 엣지·IoT·개발 환경 | 대규모 프로덕션은 표준 배포판 → [k3s vs k8s](../../../inquiry/infra/0019-k3s-vs-k8s.md) |

### 3. 주요 선택지

#### 3.1 운영 형태 — 누가 컨트롤 플레인을 책임지나

| 형태 | 사용자가 책임지는 것 | 비용·특징 | 고르는 경우 |
|---|---|---|---|
| **직접 구축**(kubeadm, RKE2 등) | 전부: etcd 백업, 인증서 갱신, 업그레이드, HA | 컨트롤 플레인 VM 비용 + 인력 | 온프레미스, 규제, 클라우드 불가 |
| **관리형 표준**(EKS, GKE Standard, AKS) | 노드·애드온·워크로드. 컨트롤 플레인·etcd는 클라우드 | EKS 클러스터당 $0.10/h(월 약 $73) | 대부분의 클라우드 사용자 |
| **관리형 + 노드 자동**(GKE Autopilot, EKS Auto Mode) | 워크로드 YAML만 | Pod 단위 과금 또는 노드 관리 수수료, DaemonSet·특권 컨테이너 제약 | 노드 운영을 아예 넘기고 싶음 |

- 관리형에서 덜 알아도 되는 것과 여전히 알아야 하는 것은 [EKS를 쓰면 K8s를 덜 알아도 되나](../../../inquiry/infra/0023-eks-vs-self-managed-k8s-knowledge-scope.md)에 있다.
- 지원 기간: 업스트림 약 1년, EKS 14+12개월, AKS LTS 1+1년, GKE Extended 14+약 10개월. 연장 지원은 모두 추가 비용이다. 표는 [역사 — 릴리스 주기](./01-history.md#4-릴리스-주기와-지원-기간).

#### 3.2 클러스터 개수 — 하나를 크게 vs 여럿을 작게

| 기준 | 큰 클러스터 하나 + Namespace 분리 | 여러 클러스터 |
|---|---|---|
| 격리 | 커널·컨트롤 플레인·CRD 공유. Namespace는 권한 경계일 뿐 | 장애·보안 경계가 클러스터 단위로 분리 |
| 장애 범위 | API 서버·etcd·CNI 장애가 전체에 영향 | 한 클러스터에 국한 |
| 업그레이드 | 한 번에 전체가 영향 | 카나리 클러스터부터 순차 가능 |
| 비용·운영 | 컨트롤 플레인 1개, 자원 공유로 효율 | 컨트롤 플레인 비용 × N, 멀티 클러스터 도구(GitOps, GSLB) 필요 |

흔한 절충은 **환경(prod/stage)과 리전별로 클러스터를 나누고, 팀은 Namespace로 나누는** 방식이다. 리전 간 트래픽 분산은 [Service LB와 GSLB](../../../inquiry/infra/0021-kubernetes-service-loadbalancer-gslb.md).

#### 3.3 컨트롤 플레인 HA (직접 구축 시)

| etcd 멤버 수 | 견디는 장애 | 비고 |
|---|---|---|
| 1 | 0 | 개발용 |
| **3** | 1 | 일반적인 프로덕션 |
| 5 | 2 | 대규모·중요 클러스터. 쓰기 지연 증가 |

짝수는 이득이 없다(4대도 1대만 견딤). 컨트롤 플레인은 존(AZ)을 나눠 배치한다. 쿼럼을 잃었을 때의 동작은 [장애 — etcd](./05-failures.md#2-etcd-쿼럼-상실과-용량-초과).

#### 3.4 네트워크 구성 요소

| 선택 | 선택지 | 기준 |
|---|---|---|
| CNI | Calico, Cilium, 클라우드 CNI(AWS VPC CNI 등) | NetworkPolicy 지원, Pod IP를 VPC IP로 쓸지, eBPF 필요 여부 |
| Service 구현 | kube-proxy **iptables**(기본), **nftables**(권장 신규), **IPVS**(1.35 폐기 예고), eBPF 대체(Cilium) | 대규모 Service 수에서는 nftables·eBPF가 유리. IPVS 신규 도입 금지 |
| L7 진입점 | **Gateway API 구현체**(Envoy Gateway, Istio, Cilium, NGINX Gateway Fabric, 클라우드 Gateway 등), 또는 유지되는 Ingress 컨트롤러 | 신규는 Gateway API. Ingress API 자체는 동결 상태로 남아 있고, 은퇴한 것은 **Ingress NGINX 컨트롤러**다 |
| 서비스 메시 | 없음 / Istio(사이드카·ambient) / Linkerd | mTLS·세밀한 트래픽 제어가 필요할 때만 → [Istio](../../../inquiry/infra/0026-istio-service-mesh-overview.md) |

### 4. 쓰지 말아야 할 때

| 상황 | 이유 | 대신 |
|---|---|---|
| 서비스 몇 개, 운영 인력 1~2명 | 업그레이드·애드온·보안 패치 부담이 앱 개발보다 커짐 | 서버리스 컨테이너, PaaS, VM + Compose |
| 트래픽이 거의 없거나 간헐적 | 노드·컨트롤 플레인이 상시 비용 | Cloud Run류의 0 축소 서비스 |
| 신뢰할 수 없는 사용자 코드를 같은 노드에서 실행 | 커널 공유 | VM·microVM 격리, 또는 gVisor·Kata RuntimeClass를 전제로 설계 |
| 핵심 DB를 "Kubernetes에 올리면 HA가 된다"는 기대 | Kubernetes는 Pod 재시작만 해 줌. 복제·장애 조치는 DB·오퍼레이터 몫 | 관리형 DB, 또는 검증된 오퍼레이터 + 운영 역량 |
| 1년 주기 업그레이드를 감당할 계획이 없음 | 지원 종료 버전에 머무르게 됨 | 관리형 + 자동 업그레이드 채널, 또는 다른 플랫폼 |

### 5. 선택 체크리스트

- [ ] 운영할 서비스 수와 팀 규모가 Kubernetes 학습·운영 비용을 정당화하는가?
- [ ] 이식성(멀티 클라우드·온프레미스)이 실제 요구사항인가, 막연한 기대인가?
- [ ] 1년에 최소 한 번 마이너 업그레이드(애드온·폐기 API 포함)를 할 일정과 담당자가 있는가?
- [ ] 직접 구축이라면 etcd 백업·복구 리허설, 인증서 갱신 절차가 있는가?
- [ ] 클러스터 경계(환경·리전·테넌트)를 정했는가? Namespace만으로 충분한 격리인가?
- [ ] CNI, Service 구현(nftables·eBPF), L7 진입점(Gateway API)을 골랐고 각 부품의 유지보수 상태를 확인했는가?
- [ ] 상태 저장 워크로드는 관리형 서비스로 뺄 것인가, 오퍼레이터로 운영할 것인가?
- [ ] 노드 확장 도구(Cluster Autoscaler·Karpenter)와 비용 상한을 정했는가?

## 관련 문서

- [Kubernetes의 역사](./01-history.md)
- [Kubernetes 개요 — 구조와 동작 방식](./02-overview.md)
- [Kubernetes 운영 시 자주 겪는 문제](./04-pitfalls.md)
- [Kubernetes 장애 유형과 복구](./05-failures.md)
- [고가용성 구성 방식 — replica vs cluster, 쿼럼, DR 전략](../../../inquiry/distributed-systems/0009-high-availability-replication-vs-cluster-and-patterns.md)

## 참고 자료

- [Considerations for large clusters — Kubernetes Docs](https://kubernetes.io/docs/setup/best-practices/cluster-large/)
- [etcd maintenance (space quota) — etcd Docs](https://etcd.io/docs/v3.6/op-guide/maintenance/)
- [Managing etcd database size on Amazon EKS clusters — AWS Containers Blog](https://aws.amazon.com/blogs/containers/managing-etcd-database-size-on-amazon-eks-clusters)
- [Amazon EKS pricing](https://aws.amazon.com/eks/pricing/)
- [Amazon EKS extended support for Kubernetes versions pricing — AWS Containers Blog](https://aws.amazon.com/blogs/containers/amazon-eks-extended-support-for-kubernetes-versions-pricing)
- [AKS Long Term Support — Microsoft Learn](https://learn.microsoft.com/en-us/azure/aks/long-term-support)
- [GKE versioning and support — Google Cloud](https://docs.cloud.google.com/kubernetes-engine/versioning)
- [Ingress NGINX: Statement from the Kubernetes Steering and Security Response Committees — Kubernetes Blog](https://kubernetes.io/blog/2026/01/29/ingress-nginx-statement/)
- [KEP-5495: Deprecate ipvs mode in kube-proxy](https://kubernetes.dev/resources/keps/5495)
- [Gateway API v1.5: Moving features to Stable — Kubernetes Blog](https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/)
- [Version Skew Policy — Kubernetes](https://kubernetes.io/releases/version-skew-policy/)
- [HashiCorp Adopts Business Source License for Future Releases — DevOps Digest](https://devopsdigest.com/hashicorp-adopts-business-source-license-for-future-releases)
