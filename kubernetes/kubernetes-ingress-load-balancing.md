# Ingress에 트래픽이 몰리는 문제, 어떻게 해결하나?

## 쉬운 설명

식당 입구에 직원이 한 명뿐이면 손님이 아무리 많아도 그 직원이 병목이 된다. 그래서 식당은 입구 직원을 여러 명 세우고(Ingress Controller Pod를 여러 개 복제), 손님이 오면 대기줄 관리자(클라우드 로드밸런서)가 비어있는 직원에게 골고루 보낸다. 손님이 몰리는 시간대엔 직원 수를 자동으로 늘린다(오토스케일링).

## 일반 설명

### 핵심 오해 바로잡기: Ingress는 "리소스"이지 트래픽을 직접 처리하는 프로세스가 아니다

Kubernetes의 `Ingress`는 라우팅 규칙(어떤 호스트/경로를 어떤 Service로 보낼지)을 정의하는 API 오브젝트일 뿐이다. 실제로 트래픽을 받아서 라우팅을 수행하는 것은 **Ingress Controller**(nginx-ingress, HAProxy, Traefik, Kong, Envoy Gateway 등)라는 별도의 워크로드이며, 이는 일반적인 Deployment/Pod 형태로 클러스터에 배포된다. 즉 "Ingress에 부하가 몰린다"는 정확히는 "Ingress Controller Pod에 부하가 몰린다"는 뜻이다.

### 실제 트래픽 흐름

```
클라이언트 → 클라우드 L4 LoadBalancer (Service type=LoadBalancer)
           → Ingress Controller Pod (여러 개, 여러 노드에 분산)
           → 라우팅 규칙에 따라 백엔드 Service 선택
           → Service가 각 애플리케이션 Pod로 분배
```

즉 Ingress Controller 앞에도 로드밸런서가 하나 더 있다. Ingress Controller 자체는 보통 `Service(type=LoadBalancer)`로 외부에 노출되는데, 이 Service가 클라우드 제공자의 L4 로드밸런서(AWS NLB/ALB, GCP Load Balancer 등)를 프로비저닝한다. 이 L4 로드밸런서가 여러 Ingress Controller Pod 사이에 트래픽을 1차로 분산시킨다.

### 계층별 로드밸런싱: Ingress Controller Pod가 여러 개일 때 실제로 어떻게 나눠지나

핵심은 **"Ingress Controller Pod 2개 이상 = 같은 Service 하나를 공유하는 여러 엔드포인트"** 라는 점이다. Deployment를 `replicas: 3`으로 두면 Ingress Controller Pod 3개가 뜨고, 이 3개는 모두 동일한 `Service(type=LoadBalancer)`의 백엔드(Endpoints)로 등록된다. 즉 서비스 입장에서는 "같은 서비스를 가진 여러 인스턴스"이고, 이 인스턴스들 사이의 분배는 트래픽 경로상 존재하는 계층마다 각각 다른 방식으로 이루어진다. 계층은 크게 세 곳이다.

**1계층 — 클라우드 L4 로드밸런서 → Ingress Controller Pod**

`Service(type=LoadBalancer)`가 프로비저닝하는 클라우드 로드밸런서(AWS NLB, GCP External LB 등)가 커넥션을 여러 Ingress Controller Pod(정확히는 그 Pod가 떠 있는 NodePort 또는 Pod IP)로 분산한다. 이 레이어는 보통 다음 방식 중 하나를 쓴다.

- **커넥션 해시 기반 라운드로빈**: 클라이언트 IP/포트, 대상 IP/포트로 구성된 5-튜플을 해시해 대상 노드를 고정 배정하고, 새 커넥션이 들어올 때마다 대상을 순환 분배한다. 같은 커넥션(같은 TCP 세션)은 항상 같은 백엔드로 가지만, 커넥션 단위로는 거의 균등하게 흩어진다.
- **가중치 기반 분배**: 노드/타겟의 헬스체크 결과와 가중치를 반영해 비정상 타겟은 제외하고 나머지에 분배한다.

이 레이어는 클라우드 제공자가 관리형으로 운영하므로 사용자가 알고리즘을 세밀하게 튜닝할 여지는 적고, 대신 "몇 개의 백엔드에 나눌지"(Ingress Controller Pod/레플리카 수)를 늘리는 것이 실질적인 확장 수단이다.

**2계층 — Ingress Controller 자신의 업스트림 로드밸런싱 (Pod → 백엔드 애플리케이션 Pod)**

여기가 자유도가 가장 높은 계층이다. nginx-ingress 같은 컨트롤러는 **Service의 ClusterIP를 거치지 않고, Endpoints/EndpointSlices를 직접 watch해서 백엔드 애플리케이션 Pod의 IP로 곧장 트래픽을 흘려보낸다.** kube-proxy 홉을 하나 건너뛰는 구조로, 지연을 줄이고 로드밸런싱 알고리즘을 컨트롤러가 직접 제어할 수 있게 한다. nginx-ingress 기준 지원 알고리즘은 다음과 같고 Ingress 리소스에 annotation으로 지정한다.

- `round_robin` — 순서대로 균등 분배 (가중치 지정 가능)
- `least_conn` — **nginx-ingress의 기본값.** 활성 커넥션 수가 가장 적은 Pod에 우선 배정해 느린 Pod에 트래픽이 쌓이는 것을 방지
- `ip_hash` — 클라이언트 IP를 해시해 항상 같은 Pod로 보냄 (세션 고정/스티키니스 목적)
- `consistent hash (ketama)` — 특정 헤더/쿠키/URI 등 사용자가 지정한 키를 해시해 분배하되, Pod가 추가/제거돼도 전체 매핑 중 일부(1/N)만 재배치되도록 설계 — 캐시 서버 등 상태를 가진 백엔드에 유리

**3계층 — kube-proxy 기반 Service (Ingress를 거치지 않는 일반 Service-to-Service 트래픽)**

Ingress Controller가 Endpoints를 직접 쓰는 것과 별개로, 클러스터 내부의 일반적인 Service 트래픽(Ingress를 안 거치는 Pod 간 통신 등)은 여전히 kube-proxy가 처리한다. 모드에 따라 알고리즘이 다르다.

- **iptables 모드(기본)**: 랜덤 확률 기반의 동일 확률 선택(random equal-cost selection). 클러스터 규모가 커질수록 규칙 수가 늘어 성능이 O(n)으로 저하되는 경향이 있다.
- **IPVS 모드**: 커널의 Linux Virtual Server 기능을 사용해 O(1) 성능을 유지하며, 라운드로빈(기본값)·최소 커넥션·목적지/출발지 해싱 등 총 8가지 스케줄링 알고리즘을 선택할 수 있다(`--ipvs-scheduler` 옵션).
- **eBPF 기반(Cilium 등)**: 최신 CNI는 kube-proxy 자체를 대체해 커널 레벨에서 더 낮은 지연으로 분배한다.

### 정리: 왜 "계층마다 다르게" 분배하는가

각 계층은 목적이 다르다. 클라우드 LB(1계층)는 "어느 노드/컨트롤러 인스턴스로 보낼지"를 커넥션 단위로 거칠게 나누고, Ingress Controller(2계층)는 HTTP 레벨의 세밀한 정책(세션 고정, 느린 백엔드 회피, 캐시 친화적 해싱)을 적용하며, kube-proxy(3계층)는 Ingress와 무관한 클러스터 내부 트래픽을 저수준에서 처리한다. 이 자유도 덕분에 "요청을 어떻게 나눌지"는 계층별로 원하는 정책을 독립적으로 선택할 수 있다.

### 흔한 오해 두 가지 바로잡기

**오해 1: "Ingress Controller를 여러 개 두는 건 인증/인가 같은 역할을 나눠 맡기기 위해서다?"**

아니다. Ingress Controller의 레플리카(Pod)들은 **역할이 나뉜 것이 아니라 완전히 동일한 복제본**이다. Ingress Controller Pod는 stateless(무상태)로 설계되어 있고, 모든 레플리카가 Kubernetes API를 동일하게 watch해서 **똑같은 라우팅 규칙·똑같은 nginx.conf·똑같은 인증 설정**을 각자 독립적으로 들고 있다. 예를 들어 nginx-ingress의 `auth-url`/`auth-signin` annotation(외부 인증 서버 연동)이나 OAuth2 Proxy 연동을 걸어두면, 이 설정은 **모든 레플리카에 동일하게 적용**되며, 어떤 레플리카가 요청을 받든 인증까지 포함해 전체 파이프라인을 혼자 완결한다. 즉 "1번 Pod는 인증 담당, 2번 Pod는 라우팅 담당" 같은 분업 구조가 아니라 "3개의 Pod가 각자 완전한 하나의 처리 파이프라인을 통째로 갖고 있고, 그 3개에 트래픽을 나눠 보내는 것" 뿐이다. 레플리카를 늘리는 목적은 순수하게 **처리 용량 확장(스케일링)과 장애 대비(HA)**이며, 기능 분리와는 무관하다. `podAntiAffinity`로 서로 다른 노드에 흩어두는 것도 같은 이유(한 노드가 죽어도 다른 레플리카가 계속 인증·라우팅·TLS 종료를 전부 수행)다.

  다만 혼동하기 쉬운 별개의 개념이 하나 있다: `IngressClass`를 이용해 **서로 다른 종류의 Ingress Controller를 여러 벌** 두는 경우다(예: 외부 공개용 nginx-ingress 한 벌 + 내부 전용 Envoy Gateway 한 벌). 이건 기능/보안 요구사항에 따른 의도적 분리가 맞지만, 그 각각의 내부에서도 앞서 설명한 대로 레플리카는 동일 복제본으로 확장된다. 사용자가 물어본 "인증 여부로 나뉘는 것"과는 다른 이야기다.

**오해 2: "Service는 트래픽을 한 곳으로 모았다가 라운드로빈으로 백엔드에 뿌린다?"**

이 그림은 Service를 '중앙에 서서 트래픽을 받아 되뿌리는 프로세스'처럼 상상한 것인데, 실제로는 그런 물리적 실체가 없다. Kubernetes Service(ClusterIP)는 **가상의 IP 주소일 뿐**이고, 실제 분배는 클러스터의 **모든 노드에 각각 복제되어 있는 iptables 규칙(또는 IPVS/eBPF 규칙)**이 수행한다. kube-proxy가 각 노드마다 로컬로 떠 있으면서 Service·Endpoints 정보를 감시하다가, 그 노드에서 발생한 트래픽을 그 노드 자체에서 즉시 DNAT(목적지 주소 변환)해서 백엔드 Pod IP로 바로 꽂아준다. 즉 "한 곳(중앙)으로 모였다가 나가는" 게 아니라 **"주소만 하나(ClusterIP)로 통일돼 보이고, 실제 분배 판단은 트래픽이 발생한 그 자리(노드)에서 완전히 분산적으로 즉시 일어난다."** iptables 모드는 무작위(동일 확률) 선택, IPVS 모드는 라운드로빈 등 8종 알고리즘 중 선택 가능하다는 점은 앞서 설명한 것과 같다.

  게다가 Ingress Controller의 경우는 이 Service 계층 자체를 아예 건너뛴다. 앞서 설명했듯 nginx-ingress 같은 컨트롤러는 백엔드 Service의 ClusterIP로 요청을 보내는 게 아니라, **Endpoints를 직접 읽어서 백엔드 Pod IP 목록을 자체적으로 들고 있다가 그 목록 안에서 스스로(`least_conn` 등) 로드밸런싱**한다. 그래서 정확한 그림은 "Ingress Controller → Service(모임) → 라운드로빈 → 백엔드"가 아니라, **"Ingress Controller 각 레플리카가 백엔드 Pod 목록을 직접 알고 있고, 그 안에서 자체 알고리즘으로 바로 분배"**하는 것이다. Service의 kube-proxy 기반 분배(3계층)는 Ingress를 거치지 않는 일반적인 클러스터 내부 통신에서만 실제로 개입한다.

  (예외: `nginx.ingress.kubernetes.io/service-upstream: "true"` annotation을 명시적으로 켜면 Ingress Controller가 Pod IP 대신 Service의 ClusterIP로 보내도록 바꿀 수 있다. 이 경우에만 kube-proxy의 iptables/IPVS 분배가 2계층에도 개입한다. 하지만 이건 옵션이고, **기본값은 Pod IP 직접 전달**이다.)

**정확한 전체 순서 (인증/인가 포함, 오해 1·2를 합쳐서 다시 그리면)**

```
[클라우드 L4 LB] ── 용량 분배(1계층, 인증과 무관) ──> Ingress Controller Pod A/B/C 중 하나 도착
                                                              │
                                                    이 Pod가 혼자 아래를 전부 수행:
                                                    ① 인증/인가 (auth-url 등, 이 Pod 자체 판단)
                                                    ② Endpoints 조회 → 백엔드 Pod IP 목록 확보
                                                    ③ least_conn 등으로 Pod IP 하나 직접 선택 (Service IP 미경유)
                                                              │
                                                              ▼
                                                     [백엔드 애플리케이션 Pod]
```

"인증하려고 트래픽을 분산한다"도, "Service IP가 라운드로빈 지점이다"도 아니고, **"용량 때문에 분산된 각 Ingress Controller Pod가 인증부터 백엔드 Pod 직접 선택까지 전 과정을 혼자 끝낸다"**가 맞는 그림이다.

### 부하 집중을 막는 구체적 방법

1. **Ingress Controller를 다중 레플리카로 운영**
   기본값이 아니라 명시적으로 `replicas: 2` 이상으로 설정하는 것이 표준 관행이다. 여러 노드에 분산 배치되도록 `podAntiAffinity`나 `topologySpreadConstraints`를 함께 걸어, 특정 노드 장애나 리소스 경합(preemption)으로 인한 단일 장애점을 방지한다.

2. **HPA(HorizontalPodAutoscaler)로 자동 확장**
   Ingress Controller Deployment에 CPU/메모리 사용률 또는 nginx가 노출하는 커스텀 메트릭(초당 요청 수, 커넥션 수 등)을 기준으로 HPA를 붙여, 트래픽 급증 시 Pod 수를 자동으로 늘리고 감소 시 줄인다. 예: `minReplicas: 2, maxReplicas: 10, targetCPUUtilization: 50%`.

   결론적으로 **Ingress Controller도 일반 애플리케이션 Pod와 똑같이 스케일 대상이다.** CPU/메모리 기준 HPA는 즉시 적용 가능하고, 더 정교하게는 nginx-ingress가 노출하는 Prometheus 메트릭(`nginx_ingress_controller_requests`, `nginx_ingress_controller_request_duration_seconds_count`)을 활용할 수도 있다. 다만 HPA는 Prometheus를 직접 조회하지 못하므로 **Prometheus Adapter**를 중간에 두어 `sum(rate(nginx_ingress_controller_requests{status=~"2.."}[2m])) by (namespace, ingress)` 같은 쿼리를 `nginx_ingress_controller_requests_per_second`라는 커스텀/외부 메트릭으로 변환해 HPA에 노출시키는 구조를 쓴다. 이렇게 하면 CPU 사용량이 아니라 "초당 실제 요청 수"를 기준으로 Pod 수를 늘리고 줄일 수 있어 트래픽 특성에 더 정확하게 반응한다.

3. **L4 로드밸런서가 1차 분산을 담당**
   클라우드 로드밸런서(NLB 등)는 커넥션 단위로 여러 Ingress Controller Pod에 트래픽을 분산하므로, 특정 Pod 하나가 모든 요청을 받는 구조가 아니다. 이 로드밸런서 자체는 클라우드 제공자가 관리형으로 수평 확장하므로 사용자가 별도로 스케일링을 신경 쓸 필요가 적다.

4. **전용 노드/충분한 리소스 할당**
   Ingress Controller Pod에 CPU/메모리를 넉넉히 할당하고, 트래픽이 매우 많은 환경에서는 별도의 전용 노드(dedicated node)에 배치해 다른 워크로드와의 리소스 경합을 차단한다. CPU/메모리 포화, 커넥션 수 제한, 네트워크 처리량 한계가 Ingress Controller의 대표적 병목 지점이다.

5. **레이어 분리와 최신 대안**
   2026년 기준 커뮤니티의 기존 `ingress-nginx` 프로젝트가 은퇴(retirement) 수순을 밟으면서, Gateway API 기반의 차세대 컨트롤러(Envoy Gateway, Cilium Gateway API 등)로의 전환이 가속화되고 있다. 이런 최신 아키텍처는 데이터 플레인(트래픽 처리)과 컨트롤 플레인(설정 반영)을 더 명확히 분리해, 설정 변경이 잦아도 트래픽 처리 성능에 영향을 덜 주도록 설계된다.

### 요약

Ingress Controller가 단일 병목이 되지 않는 이유는 (1) 앞단에 클라우드 L4 로드밸런서가 있어 1차 분산을 하고, (2) Ingress Controller 자체도 일반 Pod처럼 다중 레플리카 + HPA로 수평 확장하기 때문이다. Service의 트래픽 분배(kube-proxy/iptables/IPVS 또는 eBPF 기반)는 그 다음 단계에서 애플리케이션 Pod들 사이의 분배를 담당하는 것이므로, 전체 구조는 로드밸런서가 계층마다 중첩되어 있는 형태다.

### LB와 워커(레플리카)는 서로 다른 층위 — 관계 요약 다이어그램

"LB가 이미 나눠주는데 왜 Ingress Controller도 여러 개 두느냐"는 의문은, **LB(분배기)와 레플리카(일꾼)를 같은 층위로 착각할 때** 생긴다. 실제로는 역할이 다른 두 층이 겹쳐 있을 뿐이다: LB는 "나눌 대상을 스스로 만들지 못하고, 이미 존재하는 대상들 사이에서 선택만" 한다. 나눌 대상 자체(레플리카 수)는 사용자가 별도로 준비해야 하며, 이게 없으면 LB는 있으나 마나 한 존재가 된다.

```
                         ┌─────────────────────────────────────┐
                         │   클라우드 L4 LB (분배기, 관리형)      │
                         │   "받은 트래픽을 셋 중 하나로 보낸다"   │
                         └───────────────┬───────────────────────┘
                                         │  (LB는 대상을 만들지 않는다.
                                         │   대상 목록은 아래에서 온다)
             ┌───────────────────────────┼───────────────────────────┐
             ▼                           ▼                           ▼
   ┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
   │ Ingress Controller │     │ Ingress Controller │     │ Ingress Controller │
   │   Pod A (일꾼)      │     │   Pod B (일꾼)      │     │   Pod C (일꾼)      │
   │  replicas: 3 으로   │     │  replicas: 3 으로   │     │  replicas: 3 으로   │
   │  사용자가 직접 준비   │     │  사용자가 직접 준비   │     │  사용자가 직접 준비   │
   └───────────────────┘     └───────────────────┘     └───────────────────┘

   레플리카 1개뿐이면?
   ┌─────────────────────────────────────┐
   │   클라우드 L4 LB                      │
   └───────────────┬───────────────────────┘
                   │  나눌 대상이 1개뿐 → 분배가 성립 자체를 안 함
                   ▼
         ┌───────────────────┐
         │ Ingress Controller │  ← 100%가 여기로 쏠림 (LB 유무와 무관하게 SPOF·용량 병목)
         │   Pod A (유일)      │
         └───────────────────┘
```

- **LB(위 칸)**: 존재하는 대상들 사이에서 "누구한테 보낼지"만 결정. 클라우드가 관리형으로 운영해 그 자체는 잘 죽지 않는다.
- **레플리카(아래 칸)**: 실제로 인증/라우팅/TLS 종료를 수행하는 일꾼. 몇 명을 둘지는 LB가 아니라 `Deployment.spec.replicas`(또는 HPA)로 정해진다.
- 두 층은 독립적으로 존재해야 의미가 있다. LB만 있고 레플리카가 1개면 "분배"라는 행위 자체가 무의미해지고, 레플리카가 여러 개여도 LB가 없으면 트래픽을 그 여러 개에 나눠 보낼 방법이 없다.

---

Sources:
- [Scaling Kubernetes Ingress for High Traffic](https://hoop.dev/blog/scaling-kubernetes-ingress-for-high-traffic-3)
- [Navigating the NGINX Ingress retirement: A practical guide to migration on AWS](https://aws.amazon.com/blogs/networking-and-content-delivery/navigating-the-nginx-ingress-retirement-a-practical-guide-to-migration-on-aws/)
- [NGINX Tutorial: Reduce Kubernetes Latency with Autoscaling | F5](https://www.f5.com/company/blog/nginx/microservices-march-reduce-kubernetes-latency-with-autoscaling)
- [Rethinking Kubernetes Ingress for AI Workloads](https://www.informationweek.com/cloud-computing/why-it-leaders-must-rethink-kubernetes-ingress-for-ai-scale-workloads)
- [Ingress Controllers | Kubernetes](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/)
- [Autoscaling Ingress controllers in Kubernetes - DEV Community](https://dev.to/danielepolencic/autoscaling-ingress-controllers-in-kubernetes-1kgn)
- [Nginx Ingress Controller Architecture & Stability in ACK - Alibaba Cloud](https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/user-guide/best-practices-for-the-nginx-ingress-controller)
- [Horizontal Pod Autoscaling Based on Frontend Traffic: Beyond CPU Metrics](https://dev.to/sohanaakbar7/horizontal-pod-autoscaling-based-on-frontend-traffic-beyond-cpu-metrics-3am2)
- [Scale workloads with Ingress traffic! - SIGHUP](https://blog.sighup.io/scale-workloads-with-ingress-traffic/)
- [Nginx Ingress Controller - Specify load balancing method (GitHub Issue)](https://github.com/kubernetes/ingress-nginx/issues/656)
- [Load Balancing Algorithms | element-hq/ingress-nginx | DeepWiki](https://deepwiki.com/element-hq/ingress-nginx/2.5-load-balancing-algorithms)
- [Configuring Consistent Hashing for Load Balancing of an Nginx Ingress - Huawei Cloud](https://support.huaweicloud.com/intl/en-us/usermanual-cce/cce_10_0698.html)
- [How ingress-nginx is resolving upstream servers block to the pod ip behind the service (GitHub Issue)](https://github.com/kubernetes/ingress-nginx/issues/6901)
- [Comparing kube-proxy modes: iptables or IPVS? | Tigera](https://www.tigera.io/blog/comparing-kube-proxy-modes-iptables-or-ipvs/)
- [IPVS-Based In-Cluster Load Balancing Deep Dive | Kubernetes](https://kubernetes.io/blog/2018/07/09/ipvs-based-in-cluster-load-balancing-deep-dive/)
- [Deploying a High-Reliability Kubernetes Ingress Controller - Alibaba Cloud](https://www.alibabacloud.com/blog/deploying-a-high-reliability-kubernetes-ingress-controller_594387)
- [How to Debug Kubernetes Service Load Balancing with iptables and ipvs](https://oneuptime.com/blog/post/2026-02-09-debug-service-load-balancing-iptables-ipvs/view)
- [How to Configure iptables Rules Created by kube-proxy](https://oneuptime.com/blog/post/2026-02-09-iptables-rules-kube-proxy/view)
- [Route TCP traffic to the service endpoint (Cluster IP/port) - GitHub Issue](https://github.com/kubernetes/ingress-nginx/issues/9060)
- [Kubernetes: ClusterIP vs NodePort vs LoadBalancer, Services, and Ingress](https://rtfm.co.ua/en/kubernetes-clusterip-vs-nodeport-vs-loadbalancer-services-and-ingress-an-overview-with-examples/)
