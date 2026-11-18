---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# Kubernetes의 역사

## 쉬운 설명

컨테이너 덕분에 프로그램을 상자에 담아 어디서나 돌릴 수 있게 됐지만, 상자가 수백 개로 늘자 "어느 서버에 놓고, 죽으면 누가 다시 띄우나"를 사람이 일일이 할 수 없었다. 구글은 이 일을 10년 넘게 사내 시스템(Borg)으로 해 왔고, 그 경험을 모두가 쓸 수 있는 공개 도구로 다시 만든 것이 Kubernetes다.

## 일반 설명

### 1. 등장 배경 (2003~2014)

| 시기 | 사건 | 의미 |
|---|---|---|
| 2000년대 중반 | 구글 **Borg** — 사내 클러스터 관리자. 리눅스 컨테이너(cgroup)를 일찍 도입 | 수만 대 머신에 잡을 자동 배치하는 경험 축적 |
| 2010년대 초 | 구글 **Omega** — Borg 다음 세대 실험 | 공유 상태 저장소 + 여러 독립 컨트롤러 구조 실험 |
| 2013 | **Docker** 공개 | 컨테이너 이미지가 표준 배포 단위가 됨 → "많은 컨테이너를 누가 관리하나" 문제가 업계 전체로 번짐 |
| **2014.06.06** | GitHub 첫 커밋 (Go 언어) | Borg 코드가 아니라 **아이디어**를 물려받은 새 프로젝트 |
| 2014.06.10 | DockerCon 2014에서 Eric Brewer가 공개 발표 | |
| **2015.07.21** | **1.0** 릴리스. 같은 시기 구글이 Linux Foundation 산하에 새로 만든 **CNCF**에 기증 | 벤더 중립 거버넌스 → 경쟁 클라우드도 참여 |

풀려던 문제는 세 가지였다.

- **배치**: 컨테이너를 어느 머신에 놓을지(스케줄링)
- **유지**: 죽거나 머신이 사라져도 "N개가 떠 있어야 한다"는 상태를 계속 맞추기(조정 루프)
- **연결**: 위치가 계속 바뀌는 컨테이너를 고정된 이름·주소로 찾기(Service, DNS)

이름은 그리스어로 "조타수". 줄여서 k8s. 구조와 동작 방식은 [개요](./02-overview.md)에 있다.

### 2. 오케스트레이션 경쟁 (2015~2017)

| 경쟁자 | 특징 | 결과 |
|---|---|---|
| Docker Swarm | Docker에 내장, 설정이 단순 | 2017.10 DockerCon EU에서 Docker가 Kubernetes 기본 지원을 발표. Swarm은 남았지만 주류에서 밀려남 |
| Apache Mesos (+ Marathon) | 대규모 배치 작업에 강함, 2단 스케줄러 | Mesosphere도 2017년에 Kubernetes 지원 추가 |
| Kubernetes | 확장 가능한 선언형 API, 벤더 중립 재단 | 2017년 말 사실상 표준으로 굳어짐 |

### 3. 주요 버전 변천

| 버전 | 시기 | 핵심 변화 | 해결하려던 문제 |
|---|---|---|---|
| 1.0 | 2015.07 | Pod, ReplicationController, Service | 기본 오케스트레이션 |
| 1.5 | 2016.12 | **CRI**(Container Runtime Interface) 알파 | Docker 외 런타임을 끼울 수 있게 |
| 1.7 | 2017.06 | **CRD**가 ThirdPartyResource 대체 | 사용자 정의 리소스로 API 확장 → 오퍼레이터 생태계 |
| 1.8 | 2017.09 | **RBAC** GA | 멀티 테넌트 권한 제어 |
| 1.19 | 2020.08 | Ingress API GA (`networking.k8s.io/v1`) | HTTP 진입점 표준화 |
| 1.20 | 2020.12 | Dockershim 폐기 예고 | 런타임을 CRI 하나로 정리 |
| 1.22 | 2021.08 | 릴리스 주기를 **연 4회 → 연 3회**로 변경(KEP-2572), 다수 베타 API 제거 | 기여자·릴리스 팀 부담 |
| **1.24** | 2022.05 | **Dockershim 제거** | kubelet이 Docker Engine을 직접 다루지 않음. containerd·CRI-O 사용 |
| **1.25** | 2022.08 | **PodSecurityPolicy 제거**, Pod Security Admission GA, **cgroup v2 GA** | 복잡한 PSP 대신 3단계 표준(privileged/baseline/restricted) |
| 1.28 | 2023.08 | 사이드카 컨테이너 알파 | 사이드카의 시작·종료 순서 문제 |
| — | 2023.10 | **Gateway API v1.0 GA** (별도 CRD 프로젝트) | Ingress의 어노테이션 난립, 역할 분리 부재 |
| 1.31 | 2024.08 | cgroup v1 지원을 유지보수 모드로 | |
| **1.33** | 2025.04 | **사이드카 컨테이너 GA** (`restartPolicy: Always`인 init 컨테이너) | 로그 수집·프록시 컨테이너가 Job 종료를 막는 문제 |
| **1.34** | 2025.08 | **DRA(Dynamic Resource Allocation) GA** (`resource.k8s.io/v1`) | GPU 등 장치를 개수가 아니라 속성으로 요청 |
| **1.35** | 2025.12 | **In-place Pod resize GA**, `failCgroupV1` 기본값 `true`(cgroup v1 노드에서 kubelet 기동 실패), kube-proxy **IPVS 모드 폐기 예고**(nftables 권장), containerd 1.x를 지원하는 마지막 버전 | 재시작 없는 CPU·메모리 조정, 레거시 정리 |
| — | 2026.02 | Gateway API v1.5 (ListenerSet, TLSRoute, CORS 필터 등을 Standard 채널로) | |
| — | 2026.03 | **Ingress NGINX 컨트롤러 은퇴** (유지보수 종료, 보안 패치 없음) | 메인테이너 1~2명뿐인 핵심 인프라의 위험 |
| **1.36** | 2026.04 | **User Namespaces GA**, 세분화된 kubelet API 인가 GA, PSI 메트릭 GA, Service `externalIPs` 폐기 공지 | 컨테이너 root ≠ 호스트 root |
| **1.37** | 2026.08 | HPA scale-to-zero 베타(기본 활성), Storage Version Migration 기본 활성, Metrics API stable | 유휴 워크로드 비용, 대규모 운영 |

GA 연도에 맞춰 보면 흐름이 보인다. 2015~2020년은 **API 확장성**(CRI·CRD·RBAC), 2021~2023년은 **레거시 정리**(Dockershim·PSP·베타 API 제거), 2024년 이후는 **AI·자원 효율**(DRA, in-place resize, 워크로드 인식 스케줄링)이다.

### 4. 릴리스 주기와 지원 기간

| 항목 | 내용 |
|---|---|
| 마이너 릴리스 | 연 약 **3회** (대략 4월·8월·12월) |
| 업스트림 지원 | 1.19부터 마이너당 약 **1년** 패치 지원. 동시에 최신 3개 마이너 브랜치 유지 |
| 업그레이드 | 마이너를 **하나씩** 올린다. 다운그레이드 경로는 공식적으로 없다 |
| 관리형 연장 | EKS 표준 14개월 + 연장 12개월(총 26개월, 연장 기간은 클러스터당 시간 요금 $0.10 → $0.60), AKS LTS(커뮤니티 1년 + LTS 1년, Premium 티어), GKE Extended 채널(표준 14개월 + 약 10개월, 추가 요금) |

2026년 11월 기준 업스트림 지원 버전:

| 마이너 | 최신 패치 (2026.09) | EOL |
|---|---|---|
| 1.37 | 1.37.1 | 2027-10-28 |
| 1.36 | 1.36.5 | 2027-06-28 |
| 1.35 | 1.35.9 | 2027-02-28 |
| 1.34 | 1.34.12 | 2026-10-27 (종료) |

1년 지원은 연 3회 릴리스와 맞물려 **1년에 최소 한 번은 업그레이드해야** 한다는 뜻이다. 이 부담이 관리형 서비스를 고르는 큰 이유다 → [트레이드오프 — 운영 형태](./03-tradeoffs.md#31-운영-형태--누가-컨트롤-플레인을-책임지나).

### 5. 현재 상태 (2026년 11월)

- **위상**: CNCF 2025 연례 설문(2026.01 발표)에서 컨테이너 사용자의 **82%가 프로덕션에서 Kubernetes를 사용**(2023년 66%). 생성형 AI 모델을 운영하는 조직의 66%가 추론 워크로드에 Kubernetes를 쓴다.
- **라이선스**: Apache 2.0. 거버넌스는 CNCF와 Steering Committee, SIG(Special Interest Group) 체제.
- **배포판·관리형**: EKS·GKE·AKS 같은 관리형, OpenShift·Rancher(RKE2) 같은 엔터프라이즈 배포판, 엣지용 경량 배포판 k3s가 있다. 모두 같은 Kubernetes API를 쓴다. k3s 비교는 [k3s vs k8s](../../../inquiry/infra/0019-k3s-vs-k8s.md).
- **진행 중인 정리**: Ingress NGINX → Gateway API 이전, IPVS → nftables, cgroup v1 → v2, containerd 1.x → 2.x. 이 변화가 업그레이드 함정이 되는 경우는 [자주 겪는 문제 — 업그레이드](./04-pitfalls.md#6-업그레이드와-폐기-api)에 있다.

## 관련 문서

- [Kubernetes 개요 — 구조와 동작 방식](./02-overview.md)
- [Kubernetes 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [Kubernetes 운영 시 자주 겪는 문제](./04-pitfalls.md)
- [Kubernetes 장애 유형과 복구](./05-failures.md)
- [Kubernetes(쿠버네티스)가 뭐예요?](../../../inquiry/infra/0002-kubernetes-overview.md)

## 참고 자료

- [10 Years of Kubernetes — Kubernetes Blog](https://kubernetes.io/blog/2024/06/06/10-Years-of-Kubernetes/)
- [Kubernetes turns 10 — The Register](https://www.theregister.com/2024/06/12/kubertenes_decade_anniversary/)
- [Docker gives into inevitable and offers native Kubernetes support — TechCrunch](https://techcrunch.com/2017/10/17/docker-gives-into-invevitable-and-offers-native-kubernetes-support)
- [Kubernetes 1.8: Security, Workloads and Feature Depth — Kubernetes Blog](https://kubernetes.io/blog/2017/09/Kubernetes-18-Security-Workloads-And/)
- [KEP-2572: Defining the Kubernetes Release Cadence](https://www.kubernetes.dev/resources/keps/2572/)
- [Kubernetes Releases (지원 버전·EOL)](https://kubernetes.io/releases/)
- [Kubernetes v1.33: Octarine — Kubernetes Blog](https://kubernetes.io/blog/2025/04/23/kubernetes-v1-33-release/)
- [Kubernetes v1.34: DRA has graduated to GA — Kubernetes Blog](https://kubernetes.io/blog/2025/09/01/kubernetes-v1-34-dra-updates/)
- [Kubernetes v1.35: Timbernetes — Kubernetes Blog](https://kubernetes.io/blog/2025/12/17/kubernetes-v1-35-release/)
- [Kubernetes v1.36: Haru — Kubernetes Blog](https://kubernetes.io/blog/2026/04/22/kubernetes-v1-36-release/)
- [Kubernetes v1.37: Garhwal — Kubernetes Blog](https://kubernetes.io/blog/2026/08/26/kubernetes-v1-37-release/)
- [The Shift to cgroup v2 in Kubernetes — Kubernetes Blog](https://kubernetes.io/blog/2026/10/06/kubernetes-cgroups-v2-shift/)
- [Ingress NGINX Retirement: What You Need to Know — Kubernetes Blog](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/)
- [Gateway API v1.5: Moving features to Stable — Kubernetes Blog](https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/)
- [Amazon EKS pricing (표준·연장 지원)](https://aws.amazon.com/eks/pricing/)
- [AKS Long Term Support — Microsoft Learn](https://learn.microsoft.com/en-us/azure/aks/long-term-support)
- [GKE versioning and support — Google Cloud](https://docs.cloud.google.com/kubernetes-engine/versioning)
- [The CNCF Annual Cloud Native Survey 2025 — CNCF](https://www.cncf.io/reports/the-cncf-annual-survey-2025/)
