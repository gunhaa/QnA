# k3s와 k8s(표준 쿠버네티스)의 차이

## 쉬운 설명

k8s가 "풀옵션 대형 트럭"이라면, k3s는 그 트럭의 **엔진과 핵심 기능은 그대로 두고, 짐칸을 줄이고 불필요한 부품을 뺀 소형 트럭**입니다. 목적지(컨테이너를 잘 굴린다)는 같지만, k3s는 좁은 골목(저사양 서버, 엣지 기기)에서도 다닐 수 있게 가볍게 만든 버전입니다.

## 일반 설명

### 정체성

- **k8s(쿠버네티스)**: CNCF가 관리하는 표준 컨테이너 오케스트레이션 플랫폼. 흔히 kubeadm, EKS/GKE/AKS 같은 매니지드 서비스, kops 등으로 구축하는 "정식" 버전.
- **k3s**: Rancher Labs(현 SUSE)가 만든 **경량 쿠버네티스 배포판**. k8s API에 완전히 호환되며 CNCF 공식 인증(conformant) 쿠버네티스입니다 — 즉 "다른 물건"이 아니라 "같은 쿠버네티스를 가볍게 패키징한 버전"입니다.

### 아키텍처/설치 방식 차이

| 항목 | k8s (표준) | k3s |
|---|---|---|
| 바이너리 | 컴포넌트별로 분리(kube-apiserver, controller-manager, scheduler, kubelet 등 각각 실행) | 단일 바이너리(~70MB 미만)에 서버/에이전트 컴포넌트 통합 |
| 설치 복잡도 | kubeadm 등으로 여러 단계 필요 | 설치 스크립트 한 줄로 서버/에이전트 구성 가능 |
| 기본 데이터스토어 | etcd | 기본은 내장 **SQLite**(단일 서버용), HA 구성 시 etcd·MySQL·PostgreSQL도 지원 |
| 최소 리소스 | 보통 2~4GB RAM 이상 권장 | 512MB RAM 수준에서도 구동 가능 |
| 기본 번들 구성요소 | 없음(직접 CNI, Ingress 컨트롤러, LB 등 선택/설치) | containerd, Flannel(CNI), CoreDNS, Traefik(Ingress), ServiceLB, local-path-provisioner를 기본 내장 |
| 제거된 요소 | 해당 없음 | 레거시/알파 기능, in-tree 클라우드 프로바이더 코드, 비표준 스토리지 드라이버 등 비필수 요소 제거로 경량화 |

### 왜 이런 차이가 생겼나

k3s는 애초에 **엣지/IoT/소형 서버/개발 환경**을 타깃으로 설계되었습니다. 라즈베리파이 클러스터, 리모트 매장의 소형 서버, CI 테스트용 임시 클러스터처럼 "리소스는 적지만 진짜 쿠버네티스 API로 실습/운영하고 싶다"는 요구를 충족하기 위해 불필요한 부분(레거시 코드, 알파 기능, 무거운 기본 컴포넌트)을 제거하고 필요한 것들(CNI, Ingress, LB)은 기본 내장해서 "설치만 하면 바로 쓸 수 있는" 형태로 만든 것입니다.

반면 k8s(kubeadm 등 표준 설치)는 대규모 프로덕션 환경에서 각 구성요소(CNI, Ingress, 스토리지, 클라우드 프로바이더 연동 등)를 환경에 맞게 자유롭게 선택/교체할 수 있도록 최소한만 제공하는 방식입니다.

### 선택 기준

- **k3s가 적합한 경우**: 엣지 컴퓨팅, IoT, 저사양 서버, 개발/테스트/CI 클러스터, 소규모 온프레미스 배포. 프로덕션에서도 쓸 수 있지만 대규모 클러스터에는 상대적으로 사례가 적음.
- **k8s(표준)가 적합한 경우**: 대규모 프로덕션, 다양한 클라우드/온프레미스 연동, 광범위한 생태계(오퍼레이터, 애드온) 활용이 필요한 환경.

두 경우 모두 표준 쿠버네티스 API를 그대로 쓰므로, YAML 매니페스트나 kubectl 명령은 동일하게 동작합니다 — 차이는 "배포판의 무게와 기본 구성"이지 "쿠버네티스 개념 자체"가 아닙니다.

---

**Sources:**
- [K3s and K8s: Key Differences and Use Cases Explained | SUSE Communities](https://www.suse.com/c/k3s-and-k8s-key-differences-and-use-cases-explained/)
- [Differences between K3S vs K8S - IONOS](https://www.ionos.com/digitalguide/server/know-how/k3s-vs-k8s/)
- [K3s vs. K8s: Lightweight vs Full-Featured Kubernetes Distributions](https://www.cloudoptimo.com/blog/k3s-vs-k8s-lightweight-vs-full-featured-kubernetes-distributions/)
- [What's the difference between k8s and k3s | Civo](https://www.civo.com/blog/k8s-vs-k3s)
- [K0s Vs. K3s Vs. K8s: The Differences And Use Cases | nOps](https://www.nops.io/blog/k0s-vs-k3s-vs-k8s/)
