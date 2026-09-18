# 쿠버네티스 LB는 kube-proxy만으로 분배하나? GSLB와의 관계

## 쉬운 설명

우체국 비유로 생각하면 쉽습니다.

- **GSLB**: "전국 우편물 분류센터" — 편지를 어느 **도시**(리전) 우체국으로 보낼지 정합니다.
- **쿠버네티스 서비스(kube-proxy)**: 그 도시 우체국 안에서, 편지를 어느 **집배원**(파드)에게 넘길지 정합니다.

두 개는 담당하는 **범위(스케일)가 다릅니다**. kube-proxy는 자기 클러스터 안만 알고, "다른 도시(리전)"라는 개념 자체를 모릅니다. 그래서 전 세계/여러 리전에 서비스를 흩어놓고 가장 가까운 곳으로 사용자를 보내려면, kube-proxy만으로는 안 되고 앞단에 GSLB(또는 그와 비슷한 글로벌 라우팅 계층)가 반드시 필요합니다.

## 일반 설명

### kube-proxy가 실제로 하는 일 (클러스터 내부, L4)

kube-proxy는 **하나의 클러스터 내부**에서만 동작하는 컴포넌트입니다.

- Service(ClusterIP)라는 가상 IP(VIP)를 실제 파드 IP 목록(Endpoints/EndpointSlice)에 매핑
- 각 노드에 iptables, IPVS, 혹은 최신 nftables 모드로 이 매핑 규칙을 심어둠
- 트래픽이 Service VIP로 들어오면 노드 커널 레벨에서 라운드로빈/랜덤 방식으로 특정 파드로 DNAT
- L4(TCP/UDP) 레벨의 분배이며, **클러스터 경계를 벗어난 개념(리전, 지리적 위치)은 전혀 알지 못함**

즉 kube-proxy는 "한 클러스터 안에서 어느 파드로 보낼까"만 결정하는 컴포넌트입니다.

### Service `type=LoadBalancer`가 하는 일 (리전 진입점)

`type=LoadBalancer` Service를 만들면 `cloud-controller-manager`가 클라우드 제공사의 L4 로드밸런서(AWS NLB/ELB, GCP LB, Azure LB 등)를 자동 프로비저닝합니다.

- 외부 트래픽 → 클라우드 LB → 클러스터 노드 → (노드에 심어진 kube-proxy 규칙) → 파드
- `externalTrafficPolicy: Local`이면 트래픽을 받은 노드에 있는 파드로만 보내(홉 하나 절약, 실제 클라이언트 IP 보존), `Cluster`면 다른 노드의 파드로도 다시 분배될 수 있음
- 이 LB는 **해당 리전/클러스터의 입구** 역할일 뿐, 여러 리전 중 어디로 보낼지는 결정하지 않음

L7 라우팅이 필요하면 Ingress 컨트롤러(nginx, ALB Ingress Controller 등)나 최신 Gateway API가 이 앞단에 추가되지만, 이것도 여전히 "한 클러스터 안" 컴포넌트입니다.

### GSLB가 필요한 이유

정리하면 kube-proxy와 Service LoadBalancer는 모두 **단일 리전/클러스터 스코프**에서만 동작합니다. 사용자를 "가장 가까운 리전" 또는 "살아있는 리전"으로 먼저 보내는 역할은 이 둘의 책임 범위 밖이라, 멀티 리전 액티브-액티브 구조에서는 반드시 앞단에 별도의 글로벌 계층이 필요합니다. 크게 두 가지 방식이 쓰입니다.

1. **DNS 기반 GSLB**
   - 사용자의 DNS 조회에 대해 지리적 위치, 레이턴시, 헬스체크 결과를 바탕으로 "가장 적합한 리전의 IP"를 응답
   - 예: AWS Route53의 지연 시간 기반/지리 기반 라우팅 + 헬스체크, Akamai GTM, NS1, Cloudflare Load Balancing
   - 쿠버네티스 환경에 특화된 오픈소스로는 **k8gb**(K8s 리소스로 GSLB를 선언적으로 관리, Route53 등과 연동), VMware의 **AMKO/AVI GSLB**, Citrix/NetScaler GSLB 등이 있음
   - 단점: DNS TTL/캐싱 때문에 장애 전환(failover)이 즉각적이지 않을 수 있음 (보통 TTL 60~300초 권장)

2. **Anycast/BGP 기반**
   - 여러 리전에서 **동일한 IP**를 BGP로 광고(advertise)해서, 라우팅 레벨에서 가장 가까운 리전으로 트래픽이 자연스럽게 도달하게 함
   - 온프레미스에서는 **MetalLB의 BGP 모드**로 여러 클러스터 노드가 동일 VIP를 광고하는 방식으로 유사하게 구현 가능
   - DNS 캐싱 이슈가 없어 장애 전환이 더 빠름

### 전체 흐름 요약

```
사용자
  │
  ▼
GSLB (또는 Anycast/BGP) ── 리전 선택: 지리/레이턴시/헬스체크 기반
  │
  ▼
선택된 리전의 클러스터 진입점 (Service type=LoadBalancer 의 클라우드 LB, 또는 Ingress/Gateway)
  │
  ▼
kube-proxy 규칙 (iptables/IPVS, 노드 단위) ── 파드 선택: 라운드로빈
  │
  ▼
Pod
```

정리하면, 질문의 답은 **"GSLB 없이 kube-proxy만으로 분배"가 아니라 "GSLB로 리전을 먼저 고르고, 그 리전 안에서 kube-proxy(+클러스터 LB)가 파드까지 분배"하는 2단계 구조**가 맞습니다. 단일 리전만 운영하는 서비스라면 GSLB 없이 클라우드 LB + kube-proxy만으로 충분하지만, 멀티 리전 구조라면 앞단의 글로벌 라우팅 계층이 별도로 필요합니다.

참고로 최근에는 kube-proxy 자체를 iptables/IPVS 대신 **Cilium 같은 eBPF 기반 kube-proxy replacement**로 대체해 노드 내 L4 분배 성능을 높이는 추세이며, 클러스터 간 트래픽 공유/페일오버는 Istio의 locality-aware load balancing이나 Kubernetes Multi-Cluster Services(MCS) API로 처리하는 경우도 늘고 있습니다. 다만 이들도 "최초 진입점 선택"이라는 GSLB의 역할을 대체하는 것은 아니며, 보통 GSLB/Anycast와 함께 조합해서 사용합니다.

---

**Sources:**
- [How to Configure Global Load Balancing Across Multiple Kubernetes Clusters](https://oneuptime.com/blog/post/2026-02-09-global-load-balancing-multi-cluster/view)
- [Getting Started - K8GB - Kubernetes Global Balancer](https://www.k8gb.io/intro/)
- [AWS Route53 - K8GB - Kubernetes Global Balancer](https://www.k8gb.io/latest/deploy_route53/)
- [GSLB overview and deployment topologies | NetScaler ingress controller](https://docs.netscaler.com/en-us/netscaler-k8s-ingress-controller/gslb/gslb.html)
- [Global Load Balancer Approaches - Red Hat](https://www.redhat.com/en/blog/global-load-balancer-approaches)
- [Services, Load Balancing, and Networking | Kubernetes](https://kubernetes.io/docs/concepts/services-networking/)
- [GitHub - vmware/global-load-balancing-services-for-kubernetes](https://github.com/vmware/global-load-balancing-services-for-kubernetes)
