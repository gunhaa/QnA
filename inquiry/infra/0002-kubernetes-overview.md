# Kubernetes(쿠버네티스)가 뭐예요?

> **핵심 요약**: 여러 대의 독립된 커널을 가진 머신들을, 선언적 YAML + 조정 루프(watch)로 묶어서 하나의 시스템처럼 보이게 만들고, 그 위에서 컨테이너 배치·트래픽 라우팅·장애 복구·오토스케일링을 자동화하는 오케스트레이션 플랫폼.

레고 상자로 비유하면, **컨테이너(레고 블록)**들이 아주 많을 때 "몇 개를 어디에 놓을지, 하나가 부서지면 새 걸로 갈아끼울지"를 자동으로 관리해주는 **로봇 관리자**예요.

## 태어난 이야기 (생성 원리)

구글은 옛날부터 **Borg**라는 내부 시스템으로 수십만 개의 프로그램(잡, Job)을 수많은 서버(클러스터)에 자동 배치해왔어요. 이 경험을 바탕으로 2014년, 구글 엔지니어들이 오픈소스로 새로 만든 게 **Kubernetes**(그리스어로 "조타수/선장"이라는 뜻, 줄여서 **k8s**)예요. 2015년 정식 1.0 버전이 나오면서 구글은 이 기술을 **CNCF(Cloud Native Computing Foundation)**에 기증했어요. (참고로 로고의 바퀴살 7개는 사내 코드명 "Project 7"에서 왔대요)

## 왜 필요해요?

컨테이너(Docker 같은 걸로 포장한 프로그램)를 하나만 쓰면 괜찮지만, 수백 개를 여러 서버에 나눠 돌리다 보면:
- 어떤 서버에 몇 개를 놓을지
- 하나가 죽으면 누가 대신 살릴지
- 트래픽이 몰리면 어떻게 더 늘릴지(**오토스케일링**)

이런 걸 사람이 손으로 하기 힘들어져요. Kubernetes는 "선언한 상태(예: 이 프로그램은 항상 3개 떠있어야 해)"를 사람 대신 **계속 감시하고 맞춰주는(조정 루프, Reconciliation Loop)** 로봇 역할을 해요.

## 핵심 구성요소 (몸의 부위)

| 이름 | 역할 | 비유 |
|---|---|---|
| **클러스터(Cluster)** | 여러 서버(노드)를 묶은 전체 | 학교 전체 |
| **노드(Node)** | 서버 한 대 | 교실 한 칸 |
| **파드(Pod)** | 컨테이너를 담는 가장 작은 실행 단위 | 학생 한 명(또는 짝꿍끼리 묶음) |
| **컨트롤 플레인(Control Plane)** | 클러스터 전체를 지휘하는 두뇌 (kube-apiserver, etcd, scheduler, controller-manager로 구성) | 교장선생님 + 학적부(etcd) |
| **kubelet** | 각 노드에서 지시를 받아 실제로 컨테이너를 실행/관리 | 담임선생님 |
| **서비스(Service)** | 여러 파드를 하나의 안정적인 주소로 묶어줌 | 반 대표 전화번호 (담당 학생이 바뀌어도 번호는 그대로) |
| **스케줄러(Scheduler)** | 새 파드를 어느 노드에 놓을지 결정 | 자리 배치하는 선생님 |

## 한 줄 정리
Kubernetes = "컨테이너들을 어디에, 몇 개나, 얼마나 튼튼하게 돌릴지"를 사람 대신 자동으로 관리해주는 **컨테이너 오케스트레이션(Container Orchestration)** 플랫폼.

**출처**
- [쿠버네티스 아키텍처 완전 정복 | CNCF Korea Community](https://www.cncf.co.kr/cloud-native/k8s-architecture/)
- [쿠버네티스란 무엇인가요? | IBM](https://www.ibm.com/kr-ko/topics/kubernetes)
- [쿠버네티스 아키텍처(k8s) 이해 | Red Hat](https://www.redhat.com/en/topics/containers/kubernetes-architecture)
- [The Evolution of Kubernetes: From Borg to K8s | Medium](https://romanglushach.medium.com/the-evolution-of-kubernetes-from-borg-to-k8s-and-how-it-became-the-standard-for-container-7700dcdf883b)
- [As Kubernetes Hits 1.0, Google Donates Technology to CNCF | TechCrunch](https://techcrunch.com/2015/07/21/as-kubernetes-hits-1-0-google-donates-technology-to-newly-formed-cloud-native-computing-foundation-with-ibm-intel-twitter-and-others/embed/)
