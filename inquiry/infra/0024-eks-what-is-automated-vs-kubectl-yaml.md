# EKS는 "kubectl + YAML로 Pod 만드는 과정"을 자동화한 것인가?

> **결론**: **아니다.** YAML 작성과 `kubectl apply`는 EKS에서도 **사용자가 그대로** 한다. 그리고 "YAML → Pod 생성"을 자동으로 처리하는 건 EKS가 아니라 **k8s 자체(컨트롤 플레인의 컨트롤러·스케줄러)**다. EKS가 대신해 주는 건 **그 컨트롤 플레인을 설치·운영하는 일**이다.

## 쉬운 설명

식당에 비유하면, **주문서(YAML)를 쓰고 내는 건 손님(나)**, **주문대로 요리하는 건 주방(k8s 컨트롤 플레인)**이에요. EKS는 요리를 대신 주문해 주는 게 아니라, **주방을 지어 주고 고장 안 나게 관리해 주는 건물주**예요.

## 일반 설명

### 1. 흐름에서 누가 무엇을 하나

```
[사용자] YAML 작성 → kubectl apply
      │  (EKS여도 동일)
      ▼
[kube-apiserver] 인증/인가 → etcd에 desired state 저장   ┐
[controller-manager] Deployment → ReplicaSet → Pod 객체 생성 │ ← k8s 자체 기능
[kube-scheduler] Pod를 노드에 배정                          │   (self-managed여도 자동)
[kubelet @ 워커 노드] 컨테이너 실행 (containerd)            ┘
```

- 위의 "선언 → 조정 루프 → Pod 생성"은 **kubeadm으로 직접 설치한 클러스터에서도 똑같이 자동**이다. EKS 고유 기능이 아니다.
- EKS는 위 박스 중 **apiserver·etcd·scheduler·controller-manager를 AWS 계정 쪽에서 HA로 운영**해 준다 (멀티 AZ, etcd 백업, 패치, 인증서, 버전 업그레이드 실행).

### 2. EKS가 자동화/대행하는 것 vs 안 하는 것

| 항목 | EKS Standard | EKS Auto Mode |
|---|---|---|
| 컨트롤 플레인 설치·HA·패치·etcd 관리 | AWS | AWS |
| 워커 노드(EC2) 프로비저닝·OS 패치 | 사용자 (Managed Node Group 일부 지원) | AWS (최대 21일 주기로 노드 교체) |
| 노드 오토스케일링, VPC CNI, EBS CSI, LB 컨트롤러 | 사용자가 설치/관리 | AWS가 클러스터 밖에서 관리 |
| **YAML 작성·`kubectl apply`·CI/CD 배포** | **사용자** | **사용자** |
| 앱 가용성·보안·모니터링 | 사용자 | 사용자 |

### 3. 그럼 "배포 자동화"는 어디서?

YAML 적용까지 자동화하고 싶다면 EKS 외에 별도 도구를 쓴다.
- **GitOps**: Argo CD, Flux — Git의 YAML을 클러스터에 자동 동기화 (EKS에도 관리형 Argo CD 기능인 *EKS Capabilities*가 추가됨)
- **CI/CD 파이프라인**: GitHub Actions, CodePipeline에서 `kubectl apply` / `helm upgrade`
- **패키징**: Helm, Kustomize

### 4. 한 줄 정리

- **k8s** = "YAML대로 Pod를 맞춰 주는" 자동화 엔진
- **EKS** = 그 엔진(컨트롤 플레인)을 AWS가 대신 운영해 주는 관리형 서비스 (+ Auto Mode면 노드·애드온까지)
- **YAML 작성·apply** = 여전히 사용자 몫 (자동화하려면 GitOps/CI/CD)

**출처**
- [What is Amazon EKS? | AWS 문서](https://docs.aws.eu/eks/latest/userguide/what-is-eks.html)
- [Automate cluster infrastructure with EKS Auto Mode | AWS 문서](https://docs.aws.amazon.com/eks/latest/userguide/automode.html)
- [Under the hood: Amazon EKS Auto Mode | AWS Blog](https://aws.amazon.com/blogs/containers/under-the-hood-amazon-eks-auto-mode)
- [AWS Shared Security Responsibility Model - EKS Auto Mode | AWS Whitepaper](https://docs.aws.amazon.com/it_it/whitepapers/latest/security-overview-amazon-eks-auto-mode/aws-shared-security-responsibility-model.html)
- [EKS Capabilities / Continuous Deployment with Argo CD | AWS 문서](https://docs.aws.amazon.com/eks/latest/userguide/argocd.html)
- [Understanding Amazon EKS | DEV Community](https://dev.to/oncloud7/understanding-amazon-eks-how-kubernetes-runs-on-aws-13gm)
