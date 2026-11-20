---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# NGINX 트레이드오프와 선택 기준

## 쉬운 설명

NGINX는 **미리 인쇄한 안내판대로만 움직이는 빠른 교통 정리원**이다. 판단을 미리 다 적어 두니 빠르고 가볍다. 대신 길이 바뀌면 안내판을 새로 찍어 붙여야 하고(리로드), 정리원끼리 서로 무전을 하지 않아서 한 명이 본 것을 다른 정리원은 모르며, 길이 막혔는지 미리 가 보지 않고 차가 막힌 뒤에야 안다(패시브 헬스체크).

## 일반 설명

이 문서는 **고르기 전에** 읽는 문서다. 동작 방식은 [개요](./02-overview.md), 고른 뒤 사람이 잘못 쓰는 문제는 [흔한 함정](./04-pitfalls.md), NGINX 자체의 장애는 [장애 대응](./05-failure-modes.md)에 있다.

### 1. 핵심 설계 선택: 얻은 것과 포기한 것

| 설계 선택 | 얻은 것 | 포기한 것 (대가) | 수치·사례 |
|---|---|---|---|
| **워커당 이벤트 루프 + 논블로킹 I/O** | 연결 수가 늘어도 메모리·CPU가 거의 선형으로 늘지 않음 | 워커 안에서 블로킹 코드 하나가 그 워커의 모든 연결을 멈춤. 모듈 작성이 어려움 | 유휴 keep-alive 연결 1만 개 ≈ 2.5MB(공식). 연결마다 프로세스·스레드를 붙이는 모델은 연결 수만큼 스택과 컨텍스트 스위칭 비용이 늘어난다 |
| **정적 설정 파일 + 리로드** | 설정이 곧 문서, 검증(`nginx -t`) 후 원자적 교체 | 백엔드 추가·인증서 교체·라우트 변경마다 리로드. 리로드마다 워커 재생성 | Envoy는 xDS API로, HAProxy는 Runtime API로 재시작 없이 바꾼다. NGINX는 Plus API 또는 OpenResty·njs로만 런타임 변경 |
| **워커 간 상태 비공유**(공유 메모리 zone만) | 락 경합이 거의 없음, 워커가 죽어도 다른 워커 무사 | 노드 간 상태 공유 없음. `limit_req`·캐시·sticky가 **인스턴스마다 따로** | LB 3대에 `limit_req rate=10r/s`면 실제 상한은 최대 30r/s. 노드 간 동기화(`zone_sync`)는 Plus 전용 |
| **C 모듈 + 컴파일 시 선택** | 오버헤드 없는 확장, 작은 바이너리 | 기능 추가가 곧 빌드 파이프라인. 동적 모듈은 nginx 버전·빌드 옵션에 묶임 | Caddy는 Go 플러그인(xcaddy), Envoy는 C++ 필터·Wasm·Lua, OpenResty는 Lua |
| **패시브 헬스체크(오픈소스)** | 추가 트래픽 없음, 구현 단순 | 죽은 서버를 **실제 사용자 요청이 실패한 뒤에야** 앎 | 기본 `max_fails=1 fail_timeout=10s`. 액티브 체크는 Plus, HAProxy·Envoy·Traefik은 오픈소스에서 기본 제공 |
| **오픈코어(오픈소스 + Plus)** | 코어는 BSD-2로 자유롭게 사용 | 운영 편의 기능 일부가 유료. 다만 격차는 줄어드는 중 | 1.29.6에서 `sticky`, 1.31.0에서 `least_time` 지시어가 오픈소스로 들어옴. 액티브 헬스체크·keyval·API는 여전히 Plus |

한 줄로 줄이면, NGINX는 **적은 자원으로 많은 연결을 처리하기 위해 런타임 동적성과 노드 간 협조를 포기**했다.

### 2. 대안 비교

| 대안 | 다른 점 | 고르는 경우 | 주의 |
|---|---|---|---|
| **Apache httpd** | MPM(prefork·worker·event), `.htaccess` 디렉터리별 설정, `mod_php` | 공유 호스팅, `.htaccess` 의존 앱 | 연결이 많으면 메모리가 커짐. 정적 파일·프록시 앞단은 NGINX를 앞에 두는 구성이 흔함 |
| **Caddy** (Apache-2.0, Go) | **자동 HTTPS가 기본값**, JSON 설정 API로 무중단 변경 | 소규모 서비스, 인증서 관리를 잊고 싶음 | 모듈 추가는 재빌드(xcaddy). 대규모 튜닝 사례·자료는 NGINX보다 적음 |
| **HAProxy** (GPLv2) | L4/L7 LB 전문, 오픈소스 **액티브 헬스체크**, stick table, Runtime API | 순수 로드 밸런서, 정교한 분산·관측이 필요 | 정적 파일 서빙·캐시는 약함. LTS 3.4(2031년 4월까지 지원) |
| **Envoy** (Apache-2.0, CNCF) | xDS 동적 설정, 서비스 메시(Istio) 데이터 플레인, 풍부한 지표 | 쿠버네티스·메시, 설정을 컨트롤 플레인이 관리 | 손으로 쓰는 설정이 장황함. 단독 웹 서버 용도로는 과함 |
| **Traefik** (MIT) | Docker·쿠버네티스 라벨에서 라우트 **자동 발견**, ACME 내장 | 컨테이너 환경의 엣지 라우터 | 3.7에서 Ingress NGINX 어노테이션 85개 이상 호환을 추가. 고성능 정적 서빙 용도는 아님 |
| **OpenResty** | nginx + LuaJIT. 요청마다 Lua 로직 | API 게이트웨이, 동적 라우팅·인증 | nginx 코어 업데이트가 OpenResty 릴리스를 기다려야 함 → [OpenResty vs nginx](../../../inquiry/web/0010-openresty-vs-nginx.md) |
| **NGINX Plus** | 같은 코어 + API·액티브 헬스체크·keyval·zone_sync + **벤더 지원** | 계약상 지원(SLA)이 필요, 동적 업스트림을 코드 없이 | 인스턴스당 연 수천 달러 추정 → [비용](../../../inquiry/web/0023-nginx-plus-license-cost-estimate.md), [SLA의 의미](../../../inquiry/web/0006-nginx-plus-sla-vendor-support-meaning.md) |
| **Angie / freenginx** | nginx 포크. 설정 호환 | F5 거버넌스를 피하고 싶음, Angie의 추가 기능(API·모니터링 등) | 서드파티 모듈·배포판 패키지·문서 생태계는 원본보다 작음 |
| **클라우드 LB**(AWS ALB, GCP LB 등) | 매니지드, 다중 AZ 기본 | 엣지 TLS·분산만 필요하고 운영 인력이 없음 | 세밀한 rewrite·캐시·스크립팅은 제한. 흔히 ALB 뒤에 NGINX를 둔다 |

### 3. 주요 선택지

#### 3.1 배포판 — 무엇을 돌릴지

| 선택 | 근거 |
|---|---|
| nginx.org 공식 패키지 | 최신 stable·mainline. 배포판 기본 패키지는 몇 년 묵은 버전일 수 있다 |
| 배포판(Debian·Ubuntu·RHEL) 패키지 | OS 벤더가 보안 패치를 백포트. 버전 번호가 낮아도 패치는 들어 있을 수 있음 |
| OpenResty | Lua로 로직을 짜야 할 때 |
| NGINX Plus | 지원 계약, Plus 전용 기능 |
| 컨테이너 이미지(`nginx:stable`, `nginx:mainline`) | 태그를 버전으로 고정해야 재현 가능 |

#### 3.2 mainline vs stable

| 기준 | mainline (1.31.x) | stable (1.30.x) |
|---|---|---|
| 새 기능 | 바로 받음 (예: control API, `least_time`) | 다음 해 4월까지 없음 |
| 변경 범위 | 기능 + 모든 버그 수정 | 보안·치명적 버그만 |
| 지원 기간 | 다음 mainline이 나오면 끝 | 다음 stable(약 1년)까지 |
| 고르는 경우 | 새 기능이 필요하고 자주 올릴 수 있음 | 변경을 최소화하고 연 1회 메이저 업그레이드 |

둘 다 보안 수정은 같은 날 나온다(2026-10-14의 1.30.6/1.31.7처럼). 어느 쪽이든 **패치 릴리스는 바로 올린다**.

#### 3.3 고가용성 구성 — NGINX 자체가 단일 장애점이 되지 않게

| 구성 | 방식 | 장애 전환 | 대가 |
|---|---|---|---|
| 단일 인스턴스 | 1대 | 없음 | 개발·내부용 |
| Active-Passive + VIP | keepalived(VRRP)로 가상 IP를 넘김 | 수 초 | 대기 노드가 놂. 같은 L2 망 필요(클라우드에서는 제한) |
| Active-Active + 앞단 LB | 클라우드 LB·DNS·ECMP가 여러 NGINX에 분산 | 앞단 헬스체크 주기 | 노드 간 상태(rate limit, 캐시, sticky)가 따로 놂 |
| 쿠버네티스 인그레스 | 컨트롤러 Pod 여러 개 + Service(LoadBalancer) | Pod 재시작 | Ingress NGINX 은퇴 → Gateway API 구현체 선택 필요 |

장애가 실제로 어떻게 번지고 어떻게 복구하는지는 [장애 대응 — 고가용성](./05-failure-modes.md#5-nginx-자체의-고가용성)에, 제품을 가리지 않는 고가용성 패턴은 [고가용성 구성 방식](../../../inquiry/distributed-systems/0009-high-availability-replication-vs-cluster-and-patterns.md)에 있다.

#### 3.4 쿠버네티스에서

| 선택 | 상태 (2026.11) |
|---|---|
| Kubernetes Ingress NGINX (`kubernetes/ingress-nginx`) | **2026년 3월 은퇴, 저장소 보관.** 신규 도입 금지, 기존 사용처는 이전 대상 |
| F5 NGINX Ingress Controller | 별도 프로젝트로 유지. 어노테이션 체계가 달라 그대로 옮겨지지 않음 |
| NGINX Gateway Fabric | F5의 Gateway API 구현(2.8.x) |
| Envoy Gateway, Traefik, HAProxy, Istio 등 | 쿠버네티스 프로젝트가 권하는 방향은 **Gateway API**로의 이전 |

### 4. 쓰지 말아야 할 때

| 상황 | 이유 | 대신 |
|---|---|---|
| 라우트·백엔드가 초 단위로 바뀌는 서비스 메시 | 매번 리로드, 노드 간 상태 없음 | Envoy(xDS), Istio·Linkerd |
| 요청마다 복잡한 비즈니스 로직 | `if`·`map`으로는 표현 한계, C 모듈은 비용이 큼 | OpenResty·njs 또는 앱 서버에서 처리 |
| 인증서 자동화만 필요한 작은 서비스 | ACME 모듈은 아직 별도 모듈(프리뷰에서 출발) | Caddy, Traefik |
| 여러 LB 노드에 걸친 정확한 전역 rate limit | 인스턴스별 카운터 | API 게이트웨이 + Redis, 클라우드 WAF |
| 프로덕션 HTTP/3 전면 도입 | 공식 문서상 아직 **experimental**, 2026년에도 HTTP/3 모듈 CVE가 여러 번 나옴 | CDN이 HTTP/3를 종료하고 원본은 HTTP/2 |
| 클라우드에서 운영 인력이 없음 | 패치·HA를 직접 해야 함 | 매니지드 LB·CDN |

### 5. 선택 체크리스트

- [ ] 맡길 역할이 무엇인가? (정적 서빙 / 리버스 프록시 / LB / TLS 종료 / 캐시 / L4)
- [ ] 백엔드 목록·라우트가 얼마나 자주 바뀌나? 리로드로 감당되는가, API·컨트롤 플레인이 필요한가?
- [ ] 액티브 헬스체크·노드 간 상태 공유가 필요한가? (필요하면 Plus·HAProxy·Envoy 검토)
- [ ] 요청 단위 로직이 필요한가? (njs로 충분한가, OpenResty인가)
- [ ] NGINX가 죽으면 무엇이 멈추나? 단일 장애점을 없앨 구성(VRRP, 앞단 LB)이 있는가?
- [ ] 패치를 최소 연 1회 메이저, 보안 릴리스는 수일 안에 적용할 체계가 있는가?
- [ ] 쿠버네티스라면 은퇴한 Ingress NGINX가 아닌 구현을 골랐는가?
- [ ] 벤더 지원(SLA)이 계약상 필요한가?

## 관련 문서

- [NGINX의 역사](./01-history.md)
- [NGINX 개요와 기본 사용법](./02-overview.md)
- [NGINX 운영 시 흔한 함정과 해결 방법](./04-pitfalls.md)
- [NGINX 장애 대응과 고가용성](./05-failure-modes.md)
- [OpenResty와 nginx, 뭐가 다를까?](../../../inquiry/web/0010-openresty-vs-nginx.md)
- [Kong vs OpenResty](../../../inquiry/web/0001-kong-vs-openresty.md)

## 참고 자료

- [nginx 소개(메모리 수치) — nginx.org](https://nginx.org/en/)
- [Module ngx_http_upstream_module — nginx.org](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
- [Module ngx_http_upstream_hc_module — nginx.org](https://nginx.org/en/docs/http/ngx_http_upstream_hc_module.html)
- [Module ngx_stream_zone_sync_module — nginx.org](https://nginx.org/en/docs/stream/ngx_stream_zone_sync_module.html)
- [Module ngx_http_v3_module — nginx.org](https://nginx.org/en/docs/http/ngx_http_v3_module.html)
- [nginx news: 2026 — nginx.org](https://nginx.org/2026.html)
- [nginx CHANGES — nginx.org](https://nginx.org/en/CHANGES)
- [Caddy — Automatic HTTPS](https://caddyserver.com/docs/automatic-https)
- [HAProxy — endoflife.date](https://endoflife.date/haproxy)
- [Envoy — xDS configuration API overview](https://www.envoyproxy.io/docs/envoy/latest/api-docs/xds_protocol)
- [Traefik Proxy 3.7 adds 85+ Ingress NGINX annotations — AlternativeTo](https://alternativeto.net/news/2026/5/traefik-proxy-3-7-adds-85-ingress-nginx-annotations-middlewares-on-services-and-more/)
- [Ingress NGINX Retirement: What You Need to Know — Kubernetes Blog](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/)
- [The End of an Era: Transitioning Away from Ingress NGINX — Google Open Source Blog](https://opensource.googleblog.com/2026/02/the-end-of-an-era-transitioning-away-from-ingress-nginx.html)
- [nginx/nginx-gateway-fabric — GitHub](https://github.com/nginx/nginx-gateway-fabric)
- [Caddy, Nginx, Traefik: Picking a Reverse Proxy in 2026](https://falcao.org/posts/caddy-nginx-traefik-2026/)
