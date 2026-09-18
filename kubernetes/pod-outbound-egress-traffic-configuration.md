# 쿠버네티스 파드에서 외부로 나가는 통신(egress), 별도 설정이 필요할까

## 쉬운 설명

집(파드)에서 편지를 밖으로 보낼 때, **동네 우체국(노드)이 알아서 발신 주소를 "우리 동네 대표 주소"로 바꿔서 보내줍니다.** 그래서 편지를 쓰는 사람(파드)은 특별히 뭘 더 설정하지 않아도 편지가 밖으로 나갑니다 — 이게 기본 동작입니다.

다만 그 동네 자체가 **큰길(공용 인터넷)로 바로 연결이 안 되어 있고 담장(사설망) 안에만 있다면**, 동네 어귀에 "외부로 나가는 전용 문(NAT 게이트웨이)"을 하나 만들어줘야 합니다. 이건 파드 설정이 아니라 **동네(클라우드 네트워크) 설정**의 문제입니다.

---

## 일반 설명

### 1. 기본 동작 — 클러스터 내부에서는 별도 설정 불필요

쿠버네티스 파드가 **클러스터 외부(인터넷, 외부 API 등)로 나가는 통신(egress)** 을 시도하면, 기본적으로 애플리케이션 코드나 파드 매니페스트에 별도 설정 없이 나갈 수 있습니다. 이는 CNI(Container Network Interface) 플러그인이 자동으로 처리하는 **SNAT(Source NAT, 발신지 주소 변환)** 덕분입니다.

동작 원리:

1. 파드는 클러스터 내부에서만 유효한 **파드 IP(예: `10.244.x.x`)** 를 갖습니다. 이 IP는 클러스터 밖에서는 라우팅되지 않습니다.
2. 파드가 클러스터 외부로 패킷을 보내면, 파드가 위치한 **노드**가 iptables(또는 nftables/eBPF) 규칙을 통해 발신지 주소를 **파드 IP → 노드 IP**로 바꿔치기(masquerade)합니다.
3. 응답 패킷이 돌아오면 노드가 다시 노드 IP → 파드 IP로 되돌려서 파드에 전달합니다.

이 masquerade 규칙은 **`ip-masq-agent`** 또는 CNI 플러그인 자체(kube-proxy, Calico, Cilium 등)가 클러스터 생성 시점에 전 클러스터 범위로 정적으로 설정해두기 때문에, 개발자가 파드마다 신경 쓸 필요가 없습니다. 기본 규칙은 대략 다음과 같습니다.

```
목적지가 사설 IP 대역(RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)이면 → masquerade 안 함(클러스터 내부 통신으로 간주)
목적지가 그 외(공인 IP 등)이면 → masquerade 함(노드 IP로 변환해서 내보냄)
```

★ Insight ─────────────────────────────────────
파드 IP가 "클러스터 밖에서 라우팅 안 되는 사설 주소"라는 게 이 전체 메커니즘의 전제입니다. 만약 SNAT이 없다면, 외부 서버는 응답을 어느 노드로 돌려보내야 할지 알 수 없어 통신 자체가 성립하지 않습니다. 즉 SNAT은 "선택적 최적화"가 아니라 **오버레이 네트워크 모델에서 egress가 동작하기 위한 필수 조건**입니다.
─────────────────────────────────────────────────

### 2. 그럼에도 별도 설정이 필요해지는 경우

"파드/애플리케이션 레벨"에서는 설정이 필요 없지만, **클러스터가 놓인 네트워크 환경**에 따라 인프라 레벨 설정이 필요할 수 있습니다.

| 상황 | 필요한 설정 |
|---|---|
| **노드가 프라이빗 서브넷에 있음** (공인 IP 없음) | 클라우드의 **NAT 게이트웨이**를 서브넷 라우팅 테이블에 연결해야 인터넷으로 나갈 수 있음 |
| **NetworkPolicy로 egress를 제한하는 클러스터** | 기본은 "모두 허용"이지만, 하나라도 egress `NetworkPolicy`를 만들면 그때부터는 **명시적으로 허용한 목적지만** 나갈 수 있음(화이트리스트 방식으로 전환) |
| **고정 발신 IP(egress IP)가 필요한 경우** (외부 서비스의 IP 화이트리스트 대응 등) | Calico Egress Gateway, Cilium Egress Gateway, `kube-static-egress-ip` 같은 별도 컴포넌트로 특정 IP를 통해서만 나가도록 구성 |
| **보안 그룹/방화벽 규칙이 outbound를 기본 차단하는 조직** | 클라우드 보안 그룹·방화벽에서 필요한 포트(443 등) outbound 허용 규칙 추가 |
| **비-마스커레이드 대역 커스터마이징** | `ip-masq-agent`의 `nonMasqueradeCIDRs` 설정을 바꿔 특정 사설 대역도 SNAT 대상에 포함/제외 |

### 3. 클라우드별 2026년 기준 특이사항

- **AWS EKS**: 파드가 프라이빗 서브넷에 있고 인터넷으로 나가야 한다면, 해당 서브넷의 라우팅 테이블에 **NAT 게이트웨이**로 향하는 라우트가 설정되어 있어야 합니다.
- **GCP GKE (Private Cluster)**: 노드에 외부 IP가 없는 프라이빗 클러스터라면 **Cloud NAT**을 노드 IP 대역뿐 아니라 **파드가 쓰는 alias IP 대역**까지 포함해서 설정해야 외부 API·레지스트리 접근이 가능합니다.
- **Azure AKS**: 2026년 3월 31일부터 신규 클러스터는 **기본 아웃바운드 접근(default outbound access)을 더 이상 자동 제공하지 않음**(`defaultOutboundAccess = false`)으로 정책이 바뀌어, NAT 게이트웨이나 로드밸런서 등 **outbound 타입을 명시적으로 구성**해야 합니다.
- **OCI(오라클 클라우드)**: VCN-Native Pod Networking을 쓰는 경우, 워커 노드뿐 아니라 **파드가 속한 프라이빗 서브넷**도 인터넷 접근이 필요하면 VCN에 NAT 게이트웨이가 있어야 합니다.

### 4. 정리

| 레벨 | 기본 상태 | 추가 설정 필요 시점 |
|---|---|---|
| 파드/애플리케이션 코드 | **설정 불필요** — 기본적으로 나갈 수 있음 | NetworkPolicy로 egress를 제한하는 정책을 도입할 때 |
| 노드/CNI | 자동 SNAT 처리 (ip-masq-agent 등) | 특정 사설 대역을 마스커레이드 예외로 두거나, 고정 egress IP가 필요할 때 |
| 클라우드 네트워크(서브넷) | 퍼블릭 서브넷 + 공인 IP면 대체로 무설정 | 프라이빗 서브넷/프라이빗 클러스터라면 **NAT 게이트웨이/Cloud NAT 필수** |

결론적으로, **"클러스터가 인터넷에 나갈 수 있는 네트워크 위에 정상적으로 구성돼 있다"는 전제 하에서는 파드 단위로 egress 설정을 따로 할 필요가 없습니다.** 다만 프라이빗 서브넷 구성이거나, 보안 정책상 egress를 통제해야 하는 환경이라면 인프라(NAT 게이트웨이)나 클러스터 정책(NetworkPolicy) 레벨에서 설정이 필요합니다.

---

## Sources

- [IP Masquerade Agent User Guide — Kubernetes 공식 문서](https://kubernetes.io/docs/tasks/administer-cluster/ip-masq-agent)
- [Egress :: The Kubernetes Networking Guide](https://www.tkng.io/ingress/egress/)
- [Kubernetes egress — Calico Documentation](https://docs.tigera.io/calico/latest/about/kubernetes-training/about-kubernetes-egress)
- [IP masquerade agent — GKE networking, Google Cloud Documentation](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/ip-masquerade-agent)
- [Enable outbound internet access for Pods — Amazon EKS 공식 문서](https://docs.aws.amazon.com/eks/latest/userguide/external-snat.html)
- [How to Configure Cloud NAT for GKE Clusters with Private Nodes in GCP](https://oneuptime.com/blog/post/2026-02-17-how-to-configure-cloud-nat-for-gke-clusters-with-private-nodes-in-gcp/view)
- [Customize cluster egress with outbound types in AKS — Microsoft Learn](https://learn.microsoft.com/en-us/azure/aks/egress-outboundtype)
- [Network Resource Configuration for Cluster Creation and Deployment — Oracle Cloud Docs](https://docs.oracle.com/en-us/iaas/Content/ContEng/Concepts/contengnetworkconfig.htm)
- [GitHub - nirmata/kube-static-egress-ip](https://github.com/nirmata/kube-static-egress-ip)

---

## 관련 문서

- [`kubernetes/kubernetes-ingress-load-balancing.md`](./kubernetes-ingress-load-balancing.md) — 반대 방향인 인바운드(ingress) 트래픽 처리 방식
- [`kubernetes/kubernetes-service-loadbalancer-gslb.md`](./kubernetes-service-loadbalancer-gslb.md) — Service/LoadBalancer 타입의 외부 노출 방식
