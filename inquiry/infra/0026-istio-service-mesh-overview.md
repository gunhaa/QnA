# Istio(이스티오)란?

> **핵심 요약**: Istio는 Kubernetes 위 마이크로서비스 사이의 **통신(트래픽·보안·관측)**을 앱 코드 수정 없이 **인프라 계층에서 대신 처리**하는 오픈소스 **서비스 메시(Service Mesh)**다. 2026년 10월 기준 최신 마이너는 **1.31**(2026-08-31)이고, 사이드카 없는 **Ambient 모드**가 GA되어 주력으로 자리 잡았다.

## 쉬운 설명

서비스들을 서로 편지를 주고받는 집들이라고 하면, Istio는 **동네 우체국 시스템**이에요. 집주인(앱)은 편지만 쓰면 되고, **봉투 잠그기(암호화), 배달 경로 정하기(라우팅), 배달 실패 시 재발송(재시도), 배달 기록 남기기(모니터링)**는 우체국이 다 알아서 해 줘요.

## 일반 설명

### 1. 왜 필요한가

k8s는 Pod를 띄우고 Service로 묶어 주지만, **서비스 간 통신의 "품질"**까지는 관리하지 않는다. 마이크로서비스가 많아지면 각 앱이 직접 구현해야 하는 것들:

- 서비스 간 **mTLS 암호화**와 인증·인가
- **재시도·타임아웃·서킷 브레이커**
- **카나리/블루-그린 배포**용 가중치 라우팅
- 서비스별 **메트릭·분산 트레이싱**

이걸 언어별 라이브러리(예: Spring Cloud, Hystrix)로 하면 언어마다 중복 구현해야 한다. 서비스 메시는 이걸 **프록시로 빼내서** 언어 무관하게 처리한다.

### 2. 아키텍처: 컨트롤 플레인 + 데이터 플레인

| 구성 | 역할 |
|---|---|
| **istiod** (컨트롤 플레인) | 설정(VirtualService 등)을 프록시 설정으로 변환해 xDS API로 배포, 인증서 발급(CA), 서비스 디스커버리. 과거 Pilot·Citadel·Galley를 1.5에서 하나로 통합 |
| **데이터 플레인** | 실제 트래픽을 가로채 처리하는 프록시들. 아래 두 모드 중 선택 |

### 3. 데이터 플레인 모드 2가지

**(1) Sidecar 모드 — 전통 방식**
- 모든 Pod에 **Envoy 프록시 컨테이너를 주입**(istio-proxy). iptables로 Pod 트래픽을 Envoy로 우회.
- 장점: 성숙, 기능 풍부, Pod 단위 세밀한 제어
- 단점: Pod마다 CPU/메모리 오버헤드, 사이드카 주입 시 **Pod 재시작 필요**, 업그레이드 번거로움

**(2) Ambient 모드 — 사이드카 없는 방식 (2024-11 v1.24에서 GA)**
- **ztunnel** (L4): 노드마다 하나씩 뜨는 DaemonSet. Rust로 작성. mTLS, L4 인가, 텔레메트리 담당 → **제로 트러스트 기본 보안**
- **waypoint** (L7): 필요한 서비스/네임스페이스에만 선택적으로 두는 Envoy 프록시. HTTP 라우팅, 재시도, L7 인가 담당
- 장점: Pod 재시작 없이 메시 편입, 리소스 사용량 크게 감소(사례상 70%+), L4만 필요하면 L7 비용을 아예 안 냄
- 1.29에서 **사이드카 → Ambient 마이그레이션 도구**(준비도 평가, 롤백 안전 상호운용) 강화

```
[Sidecar]  Pod[App + Envoy] ⇄ Pod[App + Envoy]

[Ambient]  Pod[App] → ztunnel(노드) ══mTLS(HBONE)══> (waypoint, L7 필요 시) → ztunnel(노드) → Pod[App]
```

### 4. 주요 기능과 CRD

| 영역 | 리소스 | 예 |
|---|---|---|
| 트래픽 관리 | `VirtualService`, `DestinationRule`, `Gateway`, (권장) **Kubernetes Gateway API** `HTTPRoute` | v1 90% / v2 10% 카나리, 헤더 기반 라우팅, 재시도·타임아웃, 장애 주입 |
| 보안 | `PeerAuthentication`, `AuthorizationPolicy`, `RequestAuthentication` | 자동 mTLS(SPIFFE ID 기반 워크로드 인증서), 서비스 간 접근 제어, JWT 검증 |
| 관측성 | `Telemetry` | Prometheus 메트릭, Jaeger/Zipkin/OTel 트레이싱, Kiali로 서비스 그래프 시각화 |
| 진입/출구 | Ingress/Egress Gateway | 외부 → 클러스터 진입점, 외부로 나가는 트래픽 통제 |

### 5. 2026년 동향

- **Ambient 멀티클러스터** 베타, **Gateway API Inference Extension**(LLM 추론 트래픽 라우팅) 베타, **agentgateway**(AI 에이전트/MCP 트래픽용 게이트웨이) 실험 지원 — KubeCon EU 2026 발표
- Istio 자체 API보다 **Gateway API 표준**으로 이동하는 추세
- 지원 정책: 각 마이너는 N+2 출시 후 6주까지 지원 (1.29는 2026-10-12 지원 종료)

### 6. 언제 쓰고, 언제 피하나

- **쓸 만한 경우**: 서비스 수십 개 이상, 제로 트러스트(mTLS) 요구, 카나리 배포·세밀한 트래픽 제어 필요, 다언어 환경
- **과한 경우**: 서비스 몇 개 수준, 팀에 운영 역량 부족 → Ingress + 앱 라이브러리로 충분
- **대안**: Linkerd(가볍고 단순, Rust 프록시), Cilium Service Mesh(eBPF 기반), AWS는 App Mesh가 단종되어 EKS에선 Istio/VPC Lattice 등을 사용

**출처**
- [Istio 1.29.x Releases | istio.io](https://istio.io/latest/news/releases/1.29.x/)
- [Support for Istio 1.29 ends on Oct 12, 2026 | istio.io](https://istio.io/latest/news/support/announcing-1.29-eol)
- [Istio News | istio.io](https://istio.io/news/)
- [Istio Ambient Mode Architecture Deep Dive | OneUptime](https://oneuptime.com/blog/post/2026-02-24-istio-ambient-mode-architecture-deep-dive/markdown)
- [Waypoint Proxy Role in Istio Ambient | OneUptime](https://oneuptime.com/blog/post/2026-02-24-waypoint-proxy-role-istio-ambient/markdown)
- [Istio Ambient Mesh Sidecarless | OneUptime](https://oneuptime.com/blog/post/2026-01-07-istio-ambient-mesh-sidecarless/view)
- [Red Hat OpenShift Service Mesh 3.2 Release Notes](https://docs.redhat.com/es/documentation/red_hat_openshift_service_mesh/3.2/html/release_notes/ossm-release-notes)
