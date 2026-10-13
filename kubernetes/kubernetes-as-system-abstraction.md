# "k8s는 시스템의 추상화다" — 맞는 답인가?

> **결론**: **절반만 맞다.** 방향은 맞지만 너무 뭉뚱그린 표현이다. 더 정확하게는 **"인프라(서버·네트워크·스토리지)를 선언적 API로 추상화하고, 컨트롤 루프로 선언한 상태를 계속 유지시키는 컨테이너 오케스트레이션 플랫폼"**이다.

## 쉬운 설명

"k8s는 추상화다"는 "자동차는 바퀴다"처럼 틀리진 않지만 반쪽짜리 말이에요. k8s는 서버 여러 대를 **커다란 컴퓨터 한 대처럼 보이게 하는 포장지(추상화)**이면서, 동시에 "항상 3개 켜져 있어야 해"라는 약속을 **계속 지켜주는 관리자(컨트롤 루프)**이기도 해요.

## 일반 설명

### 1. 맞는 부분 — k8s는 분명히 추상화 계층이다

- 공식 문서와 업계 설명 모두 k8s를 **인프라를 추상화(abstracting infrastructure)**하는 플랫폼으로 설명한다.
- 개별 머신·IP·디스크 대신 **Pod, Service, Deployment, PersistentVolume** 같은 논리적 프리미티브로 다룬다.
  - Pod → 컨테이너 실행 단위 추상화 (어느 노드인지 몰라도 됨)
  - Service → 바뀌는 Pod IP 위에 고정 가상 IP/DNS 추상화
  - PV/PVC, StorageClass → 스토리지 벤더 추상화
  - CRI / CNI / CSI → 런타임·네트워크·스토리지 구현체 추상화 (플러그인 인터페이스)
- 덕분에 노트북·온프레·클라우드 어디서든 **같은 API**로 배포 → 이식성, 락인 완화.

### 2. 부족한 부분 — "추상화"만으로는 k8s를 설명 못 한다

| 빠진 요소 | 설명 |
|---|---|
| **무엇을** 추상화하나 | "시스템"은 모호함. 정확히는 **클러스터의 컴퓨트·네트워크·스토리지 인프라**. OS 자체나 애플리케이션 로직을 추상화하는 건 아님 |
| **선언적 API** | 명령(어떻게)이 아니라 **원하는 상태(desired state)**를 etcd에 기록. 추상화의 "형식"이 핵심 |
| **조정 루프 (Reconciliation)** | 컨트롤러가 `현재 상태 → 원하는 상태`로 끊임없이 수렴시킴. 이건 추상화가 아니라 **능동적 제어 시스템**. 자가치유·롤링업데이트·오토스케일링의 근원 |
| **스케줄링/오케스트레이션** | 어떤 Pod를 어느 노드에 둘지 결정 — 자원 관리자 역할 |
| **확장성** | CRD + Operator로 추상화 자체를 사용자가 늘릴 수 있음 → "플랫폼을 만드는 플랫폼" |

즉, 단순 추상화 계층(예: JDBC, POSIX 파일 API)은 "감싸서 통일된 인터페이스 제공"에서 끝나지만, k8s는 **감싼 뒤 그 상태를 계속 관리**한다. "API + 그 상태를 맞추는 컨트롤러들"이 본질이다.

### 3. 추상화가 "새는" 지점 (Leaky Abstraction)

추상화라고만 보면 놓치는 현실도 있다.
- Pod는 결국 **호스트 커널을 공유**함 → 격리 수준은 노드 커널에 좌우됨 (`pod-host-kernel-sharing.md` 참고)
- 노드 장애, 네트워크 파티션, CNI 성능 차이 등은 추상화 밖으로 드러남
- 그래서 운영자는 여전히 노드/커널/네트워크를 알아야 함

### 4. 면접·시험 답안으로 쓴다면

- ❌ "k8s는 시스템의 추상화다." → 모호, 감점 소지
- ✅ "k8s는 여러 노드의 인프라를 Pod·Service 같은 **선언적 API 객체로 추상화**하고, **컨트롤러의 조정 루프**로 원하는 상태를 지속 유지하는 **컨테이너 오케스트레이션 플랫폼**이다."

**출처**
- [Overview | Kubernetes 공식 문서](https://kubernetes.io/docs/concepts/overview/)
- [Kubernetes-Native Abstractions Explained | Gravitee](https://www.gravitee.io/k8s-abstractions.html)
- [Kubernetes in Action 2nd Ed. Chapter 1 | Manning](https://www.manning.com/preview/kubernetes-in-action-second-edition/chapter-1)
- [Kubernetes resource management design proposal | GitHub](https://github.com/Kubernetes/design-proposals-archive/blob/main/architecture/resource-management.md)
