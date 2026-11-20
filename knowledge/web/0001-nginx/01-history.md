---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# NGINX의 역사

## 쉬운 설명

2000년대 초 웹 서버는 손님 한 명이 올 때마다 직원 한 명을 붙였다. 손님이 1만 명이면 직원도 1만 명이 필요해서 가게가 버티지 못했다. 러시아의 한 개발자가 **직원 몇 명이 수많은 손님을 번갈아 응대하는 가게**를 만들었고, 이게 NGINX다. 너무 잘돼서 회사가 생기고, 큰 회사(F5)에 팔렸고, 그 과정에서 떠난 개발자들이 같은 가게를 따로 차렸다(Angie, freenginx).

## 일반 설명

### 1. 등장 배경 (2002~2004)

- 1999년 Dan Kegel이 **C10K 문제**(서버 한 대로 동시 연결 1만 개 처리)를 제기했다. 당시 주류였던 Apache는 연결마다 프로세스·스레드를 붙이는 방식이라 연결 수만큼 메모리와 컨텍스트 스위칭 비용이 늘었다.
- 러시아 포털 **Rambler**의 시스템 관리자 **Igor Sysoev**가 2002년 개인 시간에 개발을 시작했다. 목표는 적은 프로세스로 많은 연결을 처리하는 **이벤트 기반 비동기 서버**였다.
- **2004년 10월 4일** `nginx-0.1.0`을 공개했다. 라이선스는 **BSD 2-Clause**로 지금까지 같다.
- 핵심 설계는 "워커 프로세스 몇 개 + 각 워커의 이벤트 루프 + 논블로킹 I/O(epoll·kqueue)"다. 동작은 [개요 — 프로세스 구조](./02-overview.md#2-프로세스-구조--마스터와-워커), 설계 배경의 상세는 [nginx 탄생과 파생 시스템](../../../inquiry/web/0005-nginx-origin-and-forks.md)에 있다.

### 2. 회사와 소유 변천

| 시기 | 사건 |
|---|---|
| 2004 | 개인 프로젝트로 공개. 러시아 대형 사이트부터 채택 |
| 2011.04 | `nginx-1.0.0` 릴리스 |
| 2011 | Sysoev가 **NGINX, Inc.** 설립. 같은 해 10월 시리즈 A 투자 유치, Netflix가 첫 고객 |
| 이후 | 상용판 **NGINX Plus** 출시(액티브 헬스체크, API, 대시보드 등 + 벤더 지원) |
| **2019.03** | **F5**가 NGINX, Inc.를 약 **6억 7천만 달러**에 인수 발표. F5의 사업부가 됨 |
| 2019.12 | Rambler 측(권리를 넘겨받은 Lynwood Investments)이 "업무 중 작성한 코드"라며 저작권을 주장, 모스크바 경찰이 NGINX 사무실 압수수색. Rambler 이사회가 이후 수사 중단을 요청 |
| 2022.01 | Igor Sysoev가 NGINX·F5를 떠남 |
| 2022 | F5가 모스크바 사무실 폐쇄 (Maxim Dounin의 freenginx 발표문 기준) |
| 2022.10 | 전 NGINX 핵심 개발자들이 포크 **Angie** 1.0.0 공개 (nginx 1.23.2 기반) |
| **2024.02** | 오랜 핵심 개발자 **Maxim Dounin**이 "회사의 임의 결정에서 자유로운 개발"을 내걸고 포크 **freenginx** 발표. 계기로 HTTP/3 관련 보안 공지 처리를 둘러싼 F5와의 이견이 거론된다 |
| 2024.09 | 공식 저장소를 Mercurial에서 **GitHub**(`nginx/nginx`)로 이전. 이슈·PR도 GitHub에서 받음 |

NGINX Plus의 가격과 "지원을 산다"는 의미는 [NGINX Plus 비용](../../../factual/web/0001-nginx-plus-license-cost-estimate.md), [NGINX Plus SLA의 의미](../../../inquiry/web/0006-nginx-plus-sla-vendor-support-meaning.md)에 있다.

### 3. 주요 버전 변천

| 버전 | 날짜 | 핵심 변화 | 해결하려던 문제 |
|---|---|---|---|
| 0.1.0 | 2004.10 | 첫 공개 | C10K, 정적 파일·리버스 프록시 |
| 1.0.0 | 2011.04 | 첫 1.x 안정판 | — |
| 1.9.0 | 2015.04 | **stream 모듈**(TCP 프록시), upstream `zone`(워커 간 공유 상태) | L4 로드 밸런싱 |
| 1.9.5 | 2015.09 | **HTTP/2**(SPDY 대체) | 연결 하나로 다중 요청 |
| 1.9.11 | 2016.02 | **동적 모듈**(`load_module`) | 모듈 추가에 재컴파일 필요 |
| 1.13.10 | 2018.03 | `grpc_pass`(gRPC 프록시) | 마이크로서비스 gRPC |
| 1.25.0 | 2023.05 | **실험적 HTTP/3(QUIC)** | 모바일·손실 많은 망의 지연 |
| 1.27.3 | 2024.11 | upstream `server ... resolve`(오픈소스) | 백엔드 DNS 변경 미반영 |
| nginx-acme | 2025.08 | Rust로 쓴 **네이티브 ACME 모듈**(프리뷰), 2026.04 0.4.0 | certbot 없이 인증서 자동 발급 |
| 1.29.0 | 2025.06 | 103 Early Hints | 페이지 초기 로딩 |
| 1.29.4 | 2025.12 | **백엔드로 HTTP/2 프록시**, ECH(Encrypted ClientHello) | 백엔드 다중화, SNI 노출 |
| 1.29.6 | 2026.03 | **`sticky` 세션 어피니티**가 오픈소스에 들어옴 | 그동안 Plus 전용 |
| 1.29.7 | 2026.03 | **업스트림 keepalive 기본 활성, `proxy_http_version` 기본값 1.1**, Multipath TCP | 오래된 함정(백엔드 연결 재사용 안 됨) 제거 |
| **1.30.0** | **2026.04.14** | 위 기능을 묶은 새 stable | — |
| 1.31.0 | 2026.05 | 포워드 프록시 `ngx_http_tunnel_module`, `least_time` 지시어 | — |
| 1.31.5 | 2026.09 | control API, predicate location, `ngx_http_json_module` | — |

### 4. 버전 정책

| 브랜치 | 번호 | 성격 |
|---|---|---|
| **mainline** | 홀수 마이너(1.31.x) | 새 기능과 모든 수정. 수주~한 달 간격 |
| **stable** | 짝수 마이너(1.30.x) | 매년 4월 mainline에서 갈라져 나옴. 보안·치명적 버그 수정만 |

새 stable이 나오면 이전 stable은 지원이 끝난다(예: 1.28은 1.30.0이 나온 2026-04-14에 EOL). 그래서 "stable을 쓰면 몇 년 안전하다"는 생각은 틀리다 — 최소 1년에 한 번은 올려야 한다. 배포판 패키지와의 버전 차이 문제는 [흔한 함정 — 운영](./04-pitfalls.md#6-운영-빌드-업그레이드-관측)에 있다.

### 5. 파생 제품과 포크

| 이름 | 관계 | 2026년 11월 상태 |
|---|---|---|
| **NGINX Plus** | F5 상용판(같은 코어 + 전용 모듈 + 지원) | 판매 중. 오픈소스와 기능 격차는 줄어드는 중(sticky 등 이전) |
| **OpenResty** | nginx + LuaJIT 번들(포크가 아닌 확장) | Kong, APISIX의 기반. 비교는 [OpenResty vs nginx](../../../inquiry/web/0010-openresty-vs-nginx.md) |
| **Tengine** | 알리바바 포크(2011) | 중국권 위주 |
| **Angie** | 전 NGINX 개발자들의 포크(Web Server LLC, BSD 계열) | 1.12.x. 분기마다 릴리스, 상용판 Angie PRO 있음 |
| **freenginx** | Maxim Dounin 포크(2024) | stable 1.30.2, mainline 1.31.5 (2026.10). nginx 보안 수정도 따라 반영 |
| **Kubernetes Ingress NGINX**(`kubernetes/ingress-nginx`) | 쿠버네티스 커뮤니티의 nginx 기반 인그레스 컨트롤러 | **2026년 3월 은퇴**, 저장소 보관(archived). 이후 보안 패치 없음 |
| **F5 NGINX Ingress Controller / NGINX Gateway Fabric** | F5가 관리하는 별도 프로젝트 | 활동 중(Gateway Fabric 2.8.1, 2026.11) |

Ingress NGINX 은퇴의 배경은 유지보수 인력 부족과 2025년 3월 **IngressNightmare**(CVE-2025-1974 등 CVSS 9.8, 어드미션 컨트롤러를 통한 설정 주입 → 클러스터 장악) 같은 취약점이다. 이 취약점은 nginx 자체가 아니라 컨트롤러의 결함이다. 운영 중 영향은 [장애 대응 — 쿠버네티스](./05-failure-modes.md#6-쿠버네티스-인그레스로-쓸-때)에 있다.

### 6. 현재 상태 (2026년 11월)

- **최신 버전**: stable **1.30.6**(2026-10-14), mainline **1.31.8**(2026-10-21). njs는 1.0.x(1.0.0부터 자체 njs 엔진을 폐기 예정으로 두고 QuickJS 엔진 중심).
- **보안 릴리스 빈도**: 2026년에만 stable이 1.28.2~1.28.3, 1.30.1~1.30.6으로 이어지며 대부분 CVE 수정이었다(rewrite·HTTP/3·SSI·mp4 모듈 등). 상세는 [장애 대응 — 보안 취약점](./05-failure-modes.md#7-보안-취약점--패치가-곧-가용성)에 있다.
- **점유율**: W3Techs(2026년 5월, 서버를 식별한 사이트 기준) nginx 32.7%, Cloudflare 27.8%, Apache 23.6%, LiteSpeed 15.2%. Netcraft(2026년 7월, 전체 사이트) nginx 20.37%, OpenResty 별도 8.02%. 측정 방식이 달라 숫자끼리 직접 비교하지 않는다.
- **경쟁 대상**: Caddy(2.11.x, 자동 HTTPS), Envoy(1.40.x, xDS 동적 설정), HAProxy(3.4 LTS), Traefik(3.7.x, 서비스 디스커버리). 비교는 [트레이드오프 — 대안 비교](./03-tradeoffs.md#2-대안-비교)에 있다.

## 관련 문서

- [NGINX 개요와 기본 사용법](./02-overview.md)
- [NGINX 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [NGINX 운영 시 흔한 함정과 해결 방법](./04-pitfalls.md)
- [NGINX 장애 대응과 고가용성](./05-failure-modes.md)
- [nginx는 어떻게 태어났고, 어떤 자식들이 있을까?](../../../inquiry/web/0005-nginx-origin-and-forks.md)

## 참고 자료

- [nginx CHANGES — nginx.org](https://nginx.org/en/CHANGES)
- [nginx news: 2026 — nginx.org](https://nginx.org/2026.html)
- [nginx — endoflife.date](https://endoflife.date/nginx)
- [Celebrating 20 Years of NGINX — NGINX Community Blog](https://blog.nginx.org/blog/celebrating-20-years-of-nginx)
- [Nginx — Wikipedia](https://en.wikipedia.org/wiki/Nginx)
- [F5 Acquires NGINX to Bridge NetOps & DevOps — F5](https://www.f5.com/company/news/press-releases/f5-acquires-nginx-to-bridge-netops-devops)
- [Russia nginx raid — The Moscow Times](https://www.themoscowtimes.com/2020/08/04/russia-nginx-fsb-raid)
- [Nginx founders complain over Russian police raid — Computing](https://computing.co.uk/news/3084697/nginx-rambler-police)
- [[News] Igor Sysoev leaving nginx — nginx mailing list](https://mailman.nginx.org/pipermail/nginx/2022-January/IQWXWC7RJOCU7ETTDARQEBDNMEGDEVX5.html)
- [Angie: A New NGINX Fork Developed by Some of Its Former Devs — Linuxiac](https://linuxiac.com/angie-web-server-is-a-new-nginx-fork/)
- [Angie Version History](https://en.angie.software/angie/docs/oss_changes/)
- [Core NGINX developer forks web server into freenginx — The Register](https://www.theregister.com/2024/02/16/freenginx_fork/)
- [freenginx news](https://freenginx.org/)
- [NGINX Open Source Moves to GitHub — NGINX Community Blog](https://blog.nginx.org/blog/nginx-open-source-moves-to-github)
- [Native ACME for NGINX — Let's Encrypt](https://letsencrypt.org/2025/09/11/native-acme-for-nginx)
- [Ingress NGINX Retirement: What You Need to Know — Kubernetes Blog](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/)
- [Ingress NGINX: Statement from the Kubernetes Steering and Security Response Committees](https://kubernetes.io/blog/2026/01/29/ingress-nginx-statement/)
- [IngressNightmare: CVE-2025-1974 — Wiz](https://www.wiz.io/blog/ingress-nginx-kubernetes-vulnerabilities)
- [Usage statistics of web servers — W3Techs](https://w3techs.com/technologies/overview/web_server)
- [July 2026 Web Server Survey — Netcraft](https://www.netcraft.com/blog/july-2026-web-server-survey)
