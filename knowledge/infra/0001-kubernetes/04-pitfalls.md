---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# Kubernetes 운영 시 자주 겪는 문제

## 쉬운 설명

Kubernetes는 적어 준 대로만 한다. "얼마나 먹는지"를 안 적으면 아무 데나 몰아넣고, "언제 준비됐는지"를 잘못 적으면 멀쩡한 앱을 계속 죽였다 살리고, "끌 때 잠깐 기다려"를 안 적으면 손님 응대 도중에 문을 닫는다. 사고 대부분은 Kubernetes가 고장 나서가 아니라 **설정서를 빠뜨리거나 잘못 써서** 난다.

## 일반 설명

이 문서는 **원인이 사용자**인 문제를 다룬다. 컨트롤 플레인·etcd·노드처럼 Kubernetes 자체의 장애는 [장애 유형과 복구](./05-failure-modes.md)에 있다.

### 1. 자원 설정 (requests / limits)

| 실수 | 증상 | 해결 |
|---|---|---|
| requests 미설정 | BestEffort QoS. 스케줄러가 한 노드에 몰아넣고, 메모리 압박 시 가장 먼저 축출 | 모든 컨테이너에 CPU·메모리 requests. Namespace에 LimitRange로 기본값 |
| 메모리 limit을 실사용보다 낮게 | `OOMKilled`(종료 코드 137) → `CrashLoopBackOff` | 실측(p99) 기반으로 limit. 메모리는 requests = limits 권장 |
| JVM·Node.js 힙을 컨테이너 limit과 따로 설정 | 힙 + 네이티브 메모리가 limit 초과로 OOMKill | `-XX:MaxRAMPercentage`처럼 컨테이너 limit 기준 비율로 설정 |
| CPU limit을 빡빡하게 | CFS 스로틀링으로 지연 급증(평균 CPU는 낮아 보임) | 지연 민감 서비스는 CPU limit을 넉넉히 두거나 생략하고 requests로 보장. `container_cpu_cfs_throttled_periods_total` 확인 |
| requests를 과하게 | 노드는 "꽉 참", 실사용률은 20~30% → 비용 낭비 | VPA 권고 모드로 실측, in-place resize(1.35 GA)로 재시작 없이 조정 |
| HPA 대상인데 requests 없음 | HPA가 CPU 사용률(%)을 계산하지 못함 | HPA 대상 컨테이너는 requests 필수 |

### 2. 헬스 체크 (probes)

| 실수 | 증상 | 해결 |
|---|---|---|
| livenessProbe가 DB·외부 API까지 확인 | 의존 서비스 하나가 느려지면 **모든 Pod가 동시에 재시작** → 연쇄 장애 | liveness는 "프로세스가 살아 있나"만. 의존성 확인은 readiness로 |
| readinessProbe 없음 | 기동 중인 Pod로 트래픽 → 배포 때마다 5xx | readiness로 준비 완료 후에만 Endpoint 등록 |
| 기동이 느린 앱에 liveness만 | 초기화 중 liveness 실패로 무한 재시작 | `startupProbe`로 기동 구간을 따로 보호 |
| 타임아웃·실패 임계값이 너무 짧음 | GC 정지·순간 부하에도 재시작 | `timeoutSeconds`·`failureThreshold`를 실측 지연에 맞춤 |

### 3. 배포와 종료

| 실수 | 증상 | 해결 |
|---|---|---|
| SIGTERM 처리 안 함 | 진행 중 요청이 끊김. 기본 유예 30초 뒤 SIGKILL | 앱이 SIGTERM에서 새 요청 거부 → 진행 중 요청 완료 후 종료 |
| 종료와 Endpoint 제거가 **동시에** 일어남을 모름 | SIGTERM 직후에도 kube-proxy·LB가 잠시 트래픽을 보냄 → 롤링 업데이트마다 502 | `preStop`에 수 초 sleep. preStop 시간은 `terminationGracePeriodSeconds` 안에 포함되므로 유예 시간도 늘린다 |
| `image: app:latest` | 노드마다 다른 버전, 롤백 불가 | 불변 태그 또는 다이제스트(`@sha256:`) |
| PodDisruptionBudget 없음 | 노드 드레인·업그레이드 때 레플리카가 한꺼번에 축출 | PDB(`minAvailable` 또는 `maxUnavailable`) |
| 레플리카가 한 노드·한 존에 몰림 | 노드 하나 장애로 서비스 전체 중단 | `topologySpreadConstraints`, podAntiAffinity |
| 사이드카를 일반 컨테이너로 | Job이 끝나지 않음, 종료 순서 꼬임 | 1.33 GA 네이티브 사이드카(`initContainers` + `restartPolicy: Always`) |

### 4. 보안

| 실수 | 위험 | 해결 |
|---|---|---|
| Secret을 암호화된 것으로 착각 | 기본은 base64 인코딩. etcd 백업·API 읽기 권한이 곧 평문 노출 | etcd 저장 시 암호화(EncryptionConfiguration, 관리형은 KMS 연동), 외부 시크릿 저장소 |
| 편의상 `cluster-admin` 바인딩, 기본 ServiceAccount 토큰 자동 마운트 | Pod 하나 탈취 = 클러스터 탈취 | 최소 권한 Role, `automountServiceAccountToken: false` |
| root·privileged 컨테이너 | 커널 공유라 컨테이너 탈출 시 노드 장악 | Pod Security Admission `restricted`(Namespace 라벨), `runAsNonRoot`, User Namespaces(1.36 GA) |
| NetworkPolicy 없음 | 기본은 **모든 Pod 간 통신 허용** | 기본 거부 정책 + 필요한 경로만 허용 |
| NetworkPolicy를 썼지만 CNI가 미지원 | 정책이 조용히 무시됨 | Calico·Cilium 등 지원 CNI 확인 |
| 은퇴한 Ingress NGINX를 계속 운영 | 2026.03 이후 **보안 패치 없음**. 2025.03 IngressNightmare(CVE-2025-1974, CVSS 9.8, 인증 없는 원격 코드 실행) 같은 취약점이 다시 나와도 고쳐지지 않음 | Gateway API 구현체나 유지되는 Ingress 컨트롤러로 이전. 선택지는 [트레이드오프 — 네트워크](./03-tradeoffs.md#34-네트워크-구성-요소) |

### 5. 네트워크와 DNS

| 실수 | 증상 | 해결 |
|---|---|---|
| 기본 `ndots:5`를 모름 | 외부 도메인(`api.example.com`) 하나에 검색 도메인 순회로 DNS 질의가 여러 번 → CoreDNS 부하·지연 | FQDN 끝에 `.`을 붙이거나 `dnsConfig`로 ndots 낮춤(musl 기반 이미지는 동작 차이 확인), NodeLocal DNSCache |
| Ingress 하나에 트래픽 집중을 Ingress 리소스 문제로 오해 | 컨트롤러 Pod 수·분산 방식이 원인 | → [Ingress 트래픽 분산](../../../inquiry/infra/0020-kubernetes-ingress-load-balancing.md) |
| 외부 방화벽이 고정 출발 IP를 요구 | 노드 IP가 바뀌며 차단 | NAT 게이트웨이·egress 게이트웨이 → [Pod egress](../../../inquiry/infra/0022-pod-outbound-egress-traffic-configuration.md) |

### 6. 업그레이드와 폐기 API

| 실수 | 결과 | 해결 |
|---|---|---|
| 마이너 버전 건너뛰기 | 지원되지 않음. 컨트롤 플레인은 한 번에 한 마이너씩 | 1.34 → 1.35 → 1.36 순서 |
| 버전 차이(skew) 무시 | kubelet은 API 서버보다 **최대 3 마이너 낮을 수 있고, 높으면 안 됨**. 3 마이너 뒤처진 노드가 있으면 컨트롤 플레인을 더 못 올림 | 컨트롤 플레인 → 노드 순서, 노드도 주기적으로 교체 |
| 제거된 API 버전으로 매니페스트·Helm 차트 유지 | 업그레이드 후 배포 실패(예: 1.22의 베타 API 대량 제거, 1.25 PSP 제거) | 업그레이드 전 폐기 API 스캔(`kubectl` 경고, API 서버 `apiserver_requested_deprecated_apis` 메트릭) |
| 노드 OS가 cgroup v1 | 1.35부터 kubelet이 기본적으로 기동 실패 | 노드 이미지를 cgroup v2 배포판(커널 5.8+)으로 교체. `failCgroupV1: false`는 임시 회피일 뿐 |
| containerd 1.x 노드 | 1.35가 1.x를 지원하는 마지막 버전 | 1.36 전에 containerd 2.0+로. `kubelet_cri_losing_support` 메트릭으로 대상 노드 확인 |
| kube-proxy IPVS 모드 유지 | 1.35부터 폐기 경고, 향후 제거 | nftables(또는 eBPF 대체)로 이전 |
| 노드 라벨·내부 이름에 기대는 애드온 | 업그레이드가 라벨을 바꾸면 조용히 오동작 | 2023.03 Reddit: 1.23→1.24 업그레이드에서 `node-role.kubernetes.io/master` 라벨이 사라져, 그 라벨로 노드를 고르던 Calico 설정이 오동작해 314분 장애. 스테이징 클러스터에서 실제 애드온 구성으로 업그레이드 리허설 |

업그레이드 자체가 실패해 클러스터 장애로 이어지는 경우(etcd 복구, 다운그레이드 불가)는 [장애 — 업그레이드](./05-failure-modes.md#6-업그레이드-실패)에 있다.

### 7. 오토스케일링

| 실수 | 증상 | 해결 |
|---|---|---|
| HPA와 VPA가 같은 CPU·메모리 지표로 동시에 동작 | 서로 반대로 조정하며 진동 | HPA는 CPU/커스텀 지표, VPA는 권고 모드로 분리 |
| HPA만 있고 노드 오토스케일러 없음 | 새 Pod가 `Pending`으로 쌓임 | Cluster Autoscaler·Karpenter, 여유 노드(overprovisioning) → [워커 노드 오토스케일링](../../../inquiry/infra/0018-kubernetes-worker-node-autoscaling.md) |
| PVC가 특정 존에 묶임 | 다른 존 노드로 스케줄 불가 | StorageClass `volumeBindingMode: WaitForFirstConsumer` |

### 8. 진단 순서

| 증상 | 먼저 볼 것 |
|---|---|
| `Pending` | `kubectl describe pod` Events: 자원 부족, taint, affinity, PVC 바인딩 |
| `ImagePullBackOff` | 이미지 이름·태그, 레지스트리 인증(`imagePullSecrets`), 레이트 리밋 |
| `CrashLoopBackOff` | `kubectl logs --previous`, 종료 코드(137 = OOMKill/SIGKILL, 1 = 앱 오류), liveness 설정 |
| Running인데 트래픽 없음 | readiness 상태, `kubectl get endpointslices`, Service selector와 Pod 라벨 일치 |
| 간헐적 지연 | CPU 스로틀링, DNS 질의 수, 노드 conntrack 테이블 |

## 관련 문서

- [Kubernetes의 역사](./01-history.md)
- [Kubernetes 개요 — 구조와 동작 방식](./02-overview.md)
- [Kubernetes 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [Kubernetes 장애 유형과 복구](./05-failure-modes.md)
- [EKS를 쓰면 K8s를 덜 알아도 되나?](../../../inquiry/infra/0023-eks-vs-self-managed-k8s-knowledge-scope.md)

## 참고 자료

- [Resource Management for Pods and Containers — Kubernetes Docs](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Configure Liveness, Readiness and Startup Probes — Kubernetes Docs](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Pod Lifecycle — Termination of Pods — Kubernetes Docs](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination)
- [Good practices for Kubernetes Secrets — Kubernetes Docs](https://kubernetes.io/docs/concepts/security/secrets-good-practices/)
- [Pod Security Admission — Kubernetes Docs](https://kubernetes.io/docs/concepts/security/pod-security-admission/)
- [Network Policies — Kubernetes Docs](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [DNS Lookups in Kubernetes (ndots) — Karan Sharma](https://mrkaran.dev/posts/ndots-kubernetes/)
- [IngressNightmare: CVE-2025-1974 — Wiz](https://www.wiz.io/blog/ingress-nginx-kubernetes-vulnerabilities)
- [Ingress NGINX Retirement: What You Need to Know — Kubernetes Blog](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/)
- [Version Skew Policy — Kubernetes](https://kubernetes.io/releases/version-skew-policy/)
- [Kubernetes v1.35: Timbernetes (폐기·제거 항목) — Kubernetes Blog](https://kubernetes.io/blog/2025/12/17/kubernetes-v1-35-release/)
- [The Shift to cgroup v2 in Kubernetes — Kubernetes Blog](https://kubernetes.io/blog/2026/10/06/kubernetes-cgroups-v2-shift/)
- [You Broke Reddit: The Pi-Day Outage — r/RedditEng](https://www.reddit.com/r/RedditEng/comments/11xx5o0/you_broke_reddit_the_piday_outage/)
