# EKS를 쓰면 K8s를 덜 알아도 되나? — 필요한 지식 범위

## 쉬운 설명

EKS는 **자동차 엔진룸(컨트롤 플레인)을 정비소(AWS)가 관리해 주는 차**다. 엔진 수리법은 몰라도 되지만, **운전(K8s 사용법)은 똑같이 할 줄 알아야 하고**, 길(AWS 네트워크·권한)이라는 새 규칙도 배워야 한다.

## 일반 설명

### 1. 결론

- **"K8s 사용 지식은 거의 그대로 필요하고, 컨트롤 플레인 운영 지식만 빠진다"**는 이해가 맞다.
- 다만 **"관리할 필요가 없다"는 아니다.** 빠지는 것은 컨트롤 플레인과 (모드에 따라) 노드 운영 일부다. 대신 **AWS 통합 지식**(IAM, VPC, ELB, EBS)이 새로 필요하다.
- 결과적으로 필요한 지식 총량은 크게 줄지 않고, **구성이 바뀐다**에 가깝다.

### 2. 책임 분담 (Shared Responsibility)

| 영역 | Self-managed (kubeadm 등) | EKS Standard | EKS Auto Mode |
|---|---|---|---|
| 컨트롤 플레인 (kube-apiserver, etcd, scheduler, controller-manager) | 직접 | **AWS** | **AWS** |
| etcd 백업·HA·인증서 갱신 | 직접 | **AWS** | **AWS** |
| 워커 노드 OS·패치·AMI | 직접 | 직접 (Managed Node Group이면 일부 지원) | **AWS** |
| 노드 오토스케일링 | 직접 | 직접 (Cluster Autoscaler/Karpenter 설치) | **AWS** (Karpenter 내장) |
| 핵심 애드온 (VPC CNI, kube-proxy, CoreDNS, EBS CSI, LB Controller) | 직접 | 직접 (EKS add-on으로 버전 관리 지원) | **AWS** |
| K8s 버전 업그레이드 | 직접 | 트리거·호환성 검증은 직접 (컨트롤 플레인은 AWS가 수행) | 트리거는 직접, 노드는 자동 교체 |
| VPC·서브넷·보안그룹 설계 | 직접 | 직접 | 직접 |
| 클러스터 설정, RBAC, IAM 매핑 | 직접 | 직접 | 직접 |
| **애플리케이션** (매니페스트, 리소스, 보안, 모니터링, 가용성) | 직접 | 직접 | 직접 |

맨 아래 3줄은 어떤 모드에서도 사용자 몫이다.

### 3. 몰라도 되는(덜 알아도 되는) 지식

- etcd 운영: 쿼럼, 스냅샷/복구, 디프래그
- 컨트롤 플레인 HA 구성, API 서버 앞단 LB
- 컨트롤 플레인 컴포넌트 인증서 발급·갱신(kubeadm certs)
- kubeadm으로 클러스터 부트스트랩, 컨트롤 플레인 노드 패치
- (Auto Mode라면) 노드 AMI 관리, 노드 오토스케일러 설치·튜닝, CNI/CSI 설치

### 4. 여전히 똑같이 필요한 K8s 지식

- **워크로드 리소스**: Pod, Deployment, StatefulSet, DaemonSet, Job/CronJob
- **네트워킹**: Service(ClusterIP/NodePort/LoadBalancer), Ingress/Gateway API, DNS, NetworkPolicy
- **설정·저장소**: ConfigMap, Secret, PV/PVC, StorageClass
- **스케줄링·리소스**: requests/limits, QoS, affinity, taint/toleration, PDB
- **오토스케일링**: HPA/VPA(Pod 레벨은 여전히 사용자가 설계)
- **보안**: RBAC, ServiceAccount, Pod Security Standards
- **운영·디버깅**: `kubectl describe/logs/events`, CrashLoopBackOff, OOMKilled, Pending 원인 분석
- **배포 도구**: Helm, Kustomize, ArgoCD 등

장애의 대부분은 컨트롤 플레인이 아니라 **이 계층**에서 난다. 그래서 EKS를 써도 K8s 학습량은 크게 줄지 않는다.

### 5. EKS라서 새로 필요한 AWS 지식

| 영역 | 내용 | 왜 중요한가 |
|---|---|---|
| **IAM ↔ K8s 인증** | Access Entries(구 `aws-auth` ConfigMap), kubectl 접근 권한 | 클러스터 접근 자체가 IAM으로 결정됨 |
| **Pod 단위 AWS 권한** | EKS Pod Identity / IRSA | Pod가 S3·SQS 등에 접근할 때 필요 |
| **VPC CNI** | Pod가 **VPC 실제 IP**를 받음 → 서브넷 IP 고갈, prefix delegation | 일반 K8s(overlay)와 가장 다른 지점 |
| **AWS Load Balancer Controller** | Service → NLB, Ingress → ALB 매핑, 어노테이션 | 외부 노출 방식이 AWS 리소스로 변환됨 |
| **스토리지** | EBS CSI(AZ 종속!), EFS CSI | EBS 볼륨이 다른 AZ 노드로 못 붙는 문제 |
| **노드 컴퓨트** | Managed Node Group, Karpenter, Fargate, Auto Mode, Spot | 비용·확장 전략 |
| **관측** | CloudWatch Container Insights, 컨트롤 플레인 로그 | 로그·메트릭 수집 경로 |
| **버전 수명주기** | 표준 지원 이후 **연장 지원 비용 추가** | 업그레이드를 미루면 비용 증가 |

### 6. 정리 비유

```
[직접 운영 K8s]   K8s 사용 + K8s 운영(컨트롤 플레인·노드) + 인프라
[EKS Standard]    K8s 사용 + 노드/애드온 운영           + AWS 통합
[EKS Auto Mode]   K8s 사용                              + AWS 통합(VPC·IAM 중심)
```

- **K8s 사용 지식은 어디서나 필수**다. 줄어드는 것은 "운영(Day-2) 중 인프라 계층"이다.
- 학습 순서 추천: K8s 기본 오브젝트·디버깅 → EKS의 IAM/VPC CNI/LB Controller → (Standard라면) Karpenter·애드온 업그레이드.
- 컨트롤 플레인 내부 구조(etcd, scheduler 동작)는 운영할 필요는 없어도 **장애 원인을 이해하려면 개념 수준으로는 알아 두는 것**이 좋다.

## 출처

- [Automate cluster infrastructure with EKS Auto Mode (AWS Docs)](https://docs.aws.eu/eks/latest/userguide/automode.html)
- [Under the hood: Amazon EKS Auto Mode (AWS Blog)](https://aws.amazon.com/blogs/containers/under-the-hood-amazon-eks-auto-mode)
- [EKS Auto Mode – Security (EKS Best Practices)](https://docs.aws.amazon.com/eks/latest/best-practices/autosecure.html)
- [EKS Standard vs EKS Auto Mode (DEV Community)](https://dev.to/mechcloud_academy/eks-standard-vs-eks-auto-mode-the-evolutionary-leap-in-kubernetes-operations-287g)
- [Understanding Amazon EKS (DEV Community)](https://dev.to/oncloud7/understanding-amazon-eks-how-kubernetes-runs-on-aws-13gm)
