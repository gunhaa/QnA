---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# NGINX 장애 대응과 고가용성

## 쉬운 설명

NGINX는 모든 요청이 지나가는 **외길 다리**다. 다리 자체는 튼튼하지만 하나뿐이라 무너지면 건너편(백엔드)이 멀쩡해도 아무도 못 간다. 그래서 장애는 세 곳에서 온다. 다리 위 작업자(워커)가 쓰러지는 것, 다리 건너편 가게(백엔드)가 문을 닫아 다리에 사람이 쌓이는 것, 다리를 수리(리로드·업그레이드·보안 패치)하는 동안 생기는 문제다.

## 일반 설명

원인이 **NGINX 쪽**인 장애와 복구를 다룬다. 설정 실수처럼 사람이 원인인 문제는 [자주 겪는 문제](./04-pitfalls.md)에 있다.

### 1. 장애 유형 한눈에

| 유형 | 증상 | 영향 범위 | 1차 대응 |
|---|---|---|---|
| 워커 비정상 종료 | 에러 로그 `worker process ... exited on signal 11`, 일부 연결 끊김 | 그 워커가 쥔 연결 | 마스터가 새 워커를 띄움. 원인 모듈 확인 |
| 백엔드 장애 | 502·504 급증, `no live upstreams` | 그 upstream을 쓰는 요청 | 백엔드 복구, stale 캐시로 버팀 |
| 자원 고갈 | `worker_connections are not enough`, `Too many open files`, `No space left on device` | 노드 전체 | 한도 상향, 디스크 정리 |
| 리로드 부작용 | 메모리 증가, 옛 워커 잔존 | 노드 전체 | `worker_shutdown_timeout` |
| 노드·네트워크 장애 | NGINX 노드 다운, VIP 이동 | 그 노드로 오던 모든 트래픽 | HA 구성으로 전환 |
| 보안 취약점 | 크래시·메모리 노출·우회 | 취약 모듈을 쓰는 모든 노드 | 패치 릴리스 적용, 모듈 비활성 |

### 2. 프로세스 장애 — 워커가 죽을 때

- 마스터가 워커를 감시하다가 비정상 종료하면 **즉시 새 워커를 띄운다.** 다른 워커와 그 연결은 영향이 없다. 죽은 워커가 처리 중이던 요청만 실패한다.
- 반복 크래시의 흔한 원인은 서드파티 C 모듈, Lua·njs 코드, 그리고 nginx 자체의 메모리 안전성 버그(아래 7절)다. `worker_rlimit_core`, `working_directory`로 코어 덤프를 남기고 `nginx -V`의 모듈 목록과 함께 분석한다.
- 공유 메모리 zone(`limit_req_zone`, `proxy_cache_path keys_zone`, upstream `zone`)은 **크기가 고정**이다. 가득 차면 캐시는 오래된 키를 버리고, `limit_req`는 새 키를 거부해 에러를 낸다. 크기는 트래픽의 고유 키 수로 잡는다.

### 3. 리로드와 업그레이드가 남기는 문제

| 문제 | 원인 | 대응 |
|---|---|---|
| 리로드 후 메모리 2배 | 옛 워커가 처리 중 연결(WebSocket, 긴 다운로드, keep-alive)을 마칠 때까지 남음. 새·옛 워커가 동시에 존재 | `worker_shutdown_timeout 30s;`(1.11.11+)로 옛 워커 수명 상한. 리로드 빈도를 줄임 |
| 잦은 리로드 | 백엔드·인증서 변경마다 리로드(자동화 도구, 인그레스 컨트롤러) → 옛 워커 누적, 캐시·연결 재수립 | upstream `resolve`(1.27.3+)로 DNS 기반 갱신, 변경 묶어서 적용 |
| 리로드 실패 | 문법 오류, 인증서 경로 오류, 포트 바인딩 실패 | **마스터가 롤백하고 옛 설정으로 계속 동작**한다. 에러 로그를 확인하고 고친 뒤 다시 리로드 |
| 재시작 실패 | `systemctl restart`는 설정 오류면 그대로 내려감 | 운영 중에는 restart 대신 reload. 바이너리 교체도 USR2 방식 |
| 바이너리 업그레이드 실패 | 새 마스터의 워커가 비정상 | 옛 마스터에 HUP을 보내 옛 워커를 다시 띄우고, 새 마스터를 QUIT으로 종료(공식 문서의 롤백 절차) |

### 4. 백엔드 장애가 NGINX에서 보이는 모습

| 상태 코드 | 의미 | 흔한 원인 |
|---|---|---|
| **502** Bad Gateway | 백엔드 연결 거부·리셋, 잘못된 응답 | 백엔드 다운·재시작, 헤더가 버퍼보다 큼, 모든 서버가 실패로 표시됨(`no live upstreams`) |
| **504** Gateway Timeout | `proxy_connect_timeout`·`proxy_read_timeout` 초과 | 백엔드 과부하, 느린 쿼리 |
| **503** | `limit_req`·`limit_conn` 거부 또는 설정한 점검 응답 | 트래픽 급증 |
| **499** (로그 전용) | 응답 전에 클라이언트가 연결을 끊음 | 백엔드가 느려 클라이언트 타임아웃이 먼저 옴 |

- **재시도 증폭**: 백엔드가 느려지면 `proxy_next_upstream`이 다음 서버로 다시 보내 부하가 서버 수만큼 불어날 수 있다. `proxy_next_upstream_tries 2;`와 `proxy_next_upstream_timeout`으로 상한을 둔다.
- **패시브 헬스체크의 한계**: 죽은 서버를 사용자 요청이 실패한 뒤에야 알고, `fail_timeout`이 지나면 다시 실제 요청으로 확인한다. 즉 장애 서버가 있으면 주기적으로 일부 요청이 실패한다. 이 설계의 대가는 [트레이드오프](./03-tradeoffs.md#1-핵심-설계-선택-얻은-것과-포기한-것)에 있다.
- **캐시로 버티기**: `proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504 updating;`이면 백엔드가 죽어도 만료된 캐시를 내준다. 읽기 위주 서비스의 가장 싼 가용성 장치다.

### 5. NGINX 자체의 고가용성

NGINX에는 클러스터 기능이 없다. 노드 여러 대는 서로 모르는 독립 인스턴스이고, 고가용성은 **바깥에서** 만든다. 구성 선택지는 [트레이드오프 — 고가용성 구성](./03-tradeoffs.md#33-고가용성-구성--nginx-자체가-단일-장애점이-되지-않게)에 있다.

| 장애 | 일어나는 일 | 대응 |
|---|---|---|
| Active-Passive 노드 다운 | keepalived가 VRRP 광고 중단을 감지해 VIP를 대기 노드로 넘김(수 초) | `vrrp_script`로 nginx 프로세스·헬스 URL도 검사해 "노드는 살았는데 nginx는 죽은" 경우를 잡는다 |
| **VRRP 스플릿 브레인** | 두 노드 사이 VRRP 패킷이 막히면(방화벽, 멀티캐스트 차단) **둘 다 MASTER**가 되어 VIP를 동시에 가짐 → ARP 충돌로 간헐적 연결 실패 | 멀티캐스트 대신 `unicast_peer`, VRRP 프로토콜(112) 허용, 양쪽 상태 모니터링 |
| Active-Active 노드 하나 다운 | 앞단 LB·DNS가 헬스체크 후 제외 | DNS 라운드 로빈은 TTL·클라이언트 캐시 때문에 제외가 느리다. 가능하면 헬스체크 있는 LB를 앞에 |
| 장애 전환 후 상태 소실 | 대기 노드의 **캐시가 비어** 백엔드로 트래픽이 몰림. rate limit 카운터·`sticky learn` 테이블도 노드별 | 캐시 데우기, 백엔드 여유 용량 확보. 노드 간 동기화가 필요하면 Plus의 `zone_sync` |
| 노드 간 설정 불일치 | 한 노드만 옛 설정·옛 인증서 → 간헐적 오류 | 설정을 git으로 관리하고 모든 노드에 같은 버전을 배포, 배포 후 설정 해시 비교 |

### 6. 쿠버네티스 인그레스로 쓸 때

- **Kubernetes Ingress NGINX(`kubernetes/ingress-nginx`)는 2026년 3월 은퇴했다.** 이후 릴리스·버그 수정·보안 패치가 없다. 기존 배포는 계속 돌지만 새 취약점이 나오면 그대로 노출된다.
- 은퇴 이유로 공식 발표는 유지보수 인력이 수년간 1~2명뿐이었다는 점과, `snippets` 어노테이션처럼 임의 nginx 설정을 넣게 해 주던 유연성이 보안 결함이 됐다는 점을 든다. 2025년 3월 **IngressNightmare**(CVE-2025-1974 외 3건, CVSS 9.8)는 어드미션 웹훅에 조작된 Ingress 객체를 보내 설정을 주입하고 Pod 네트워크에서 인증 없이 클러스터를 장악할 수 있는 취약점이었다(1.12.1·1.11.5에서 수정).
- 사용 여부 확인: `kubectl get pods --all-namespaces --selector app.kubernetes.io/name=ingress-nginx`
- 이전 대상: Gateway API 구현체(NGINX Gateway Fabric, Envoy Gateway 등) 또는 다른 인그레스 컨트롤러. `nginx.ingress.kubernetes.io/*` 어노테이션은 대부분 그대로 옮겨지지 않으므로 기능별로 대응표를 만든다. F5의 NGINX Ingress Controller는 IngressNightmare와 무관한 별도 프로젝트다.

### 7. 보안 취약점 — 패치가 곧 가용성

NGINX는 C로 쓰여 메모리 안전성 버그가 꾸준히 나온다. 대부분 **특정 모듈을 켜고 특정 설정을 쓸 때만** 영향이 있다.

| CVE | 수정 버전 | 내용 |
|---|---|---|
| CVE-2013-2028 | 1.5.0 / 1.4.1 | chunked 요청 처리 스택 오버플로 → 원격 코드 실행 가능 |
| CVE-2021-23017 | 1.21.0 / 1.20.1 | `resolver` 응답 처리 1바이트 덮어쓰기 |
| CVE-2024-7347 | 1.27.1 / 1.26.2 | 조작된 mp4 파일 처리(`ngx_http_mp4_module`) |
| CVE-2025-23419 | 1.27.4 / 1.26.3 | TLS 1.3 세션 재개로 가상 서버 간 클라이언트 인증서 검증 우회 |
| CVE-2026-42945 | 1.31.0 / 1.30.1 | `ngx_http_rewrite_module` 버퍼 오버플로 (같은 날 HTTP/2 프록시 요청 주입 등 6건) |
| CVE-2026-90439 | 1.31.6 / 1.30.5 | `ngx_http_v3_module`(HTTP/3) 버퍼 오버플로 |
| CVE-2026-97629 | 1.31.7 / 1.30.6 | TLS 세션 티켓 키 순환 시 세션 위조 (같은 날 5건) |

- 2026년에는 1월~10월 사이에만 stable 보안 릴리스가 8번(1.28.2, 1.28.3, 1.30.1~1.30.6) 나왔다. **"한 달에 한 번은 패치가 나온다"** 고 가정하고 적용 절차를 자동화한다.
- 대응 순서: ① `nginx-announce` 메일링 리스트·nginx.org 보안 공지 구독 ② 공지의 **영향 모듈·설정**과 `nginx -V`·설정을 대조 ③ 해당하면 패치 릴리스로 교체(USR2 무중단 업그레이드 또는 노드 순차 교체) ④ 당장 못 올리면 해당 모듈·기능을 끈다(예: `mp4`, `ssi`, `dav`, `mail`, HTTP/3).
- 쓰지 않는 모듈을 빌드·적재하지 않는 것이 가장 확실한 공격 면 축소다.

### 8. 디스크와 백업

NGINX는 거의 상태가 없다. 지켜야 할 것과 다시 만들 수 있는 것을 나눈다.

| 대상 | 잃으면 | 백업·복구 |
|---|---|---|
| 설정 파일(`nginx.conf`, `conf.d/`) | 서비스 재구성 불가 | git으로 관리, 배포 파이프라인에서 생성 |
| TLS 개인키·인증서 | HTTPS 중단 | 비밀 저장소(Vault 등) 또는 ACME 재발급. 만료 모니터링 |
| 캐시 디렉터리 | 백엔드 부하 급증(데이터 유실은 아님) | 백업하지 않는다. 재시작 시 cache loader가 메타데이터를 다시 읽는 동안 디스크 I/O가 높다 |
| 로그 | 감사·분석 공백 | 중앙 수집(syslog, 로그 파이프라인) |

- **디스크 가득 참**: 로그, `proxy_temp`(버퍼를 넘친 응답), `client_body_temp`(큰 업로드)가 같은 파티션에 있으면 업로드·대용량 응답이 500으로 실패한다. 캐시는 `max_size`로 상한을 두고, 임시 디렉터리와 로그는 파티션을 나누거나 모니터링한다.

### 9. 복구 체크리스트

- [ ] 에러 로그(`error_log ... warn`)에서 첫 오류 메시지 확인: 워커 시그널 종료, `no live upstreams`, `too many open files`, `no space left`
- [ ] 영향 범위: 노드 하나인가 전체인가, upstream 하나인가 전체인가
- [ ] 백엔드 문제면: 502/504 비율, `$upstream_response_time` 분포, 재시도 상한 확인
- [ ] 설정 변경 직후라면: 직전 설정으로 되돌리고 `nginx -t` 후 reload
- [ ] 노드 문제면: VIP·앞단 LB가 정상 노드로 넘겼는지, 스플릿 브레인이 아닌지
- [ ] 보안 공지와 현재 버전·모듈 대조

## 관련 문서

- [NGINX의 역사](./01-history.md)
- [NGINX 개요와 기본 사용법](./02-overview.md)
- [NGINX 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [NGINX 운영 시 자주 겪는 문제와 해결 방법](./04-pitfalls.md)
- [nginx 워커는 정말 각자 독립된 이벤트 루프를 가질까?](../../../inquiry/web/0007-nginx-worker-event-loop-architecture.md)
- [고가용성 구성 방식 — replica vs cluster](../../../inquiry/distributed-systems/0009-high-availability-replication-vs-cluster-and-patterns.md)

## 참고 자료

- [Controlling nginx (리로드·바이너리 업그레이드·롤백) — nginx.org](https://nginx.org/en/docs/control.html)
- [Module ngx_http_proxy_module — nginx.org](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Module ngx_http_upstream_module — nginx.org](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
- [Core functionality (worker_shutdown_timeout) — nginx.org](https://nginx.org/en/docs/ngx_core_module.html)
- [Module ngx_stream_zone_sync_module — nginx.org](https://nginx.org/en/docs/stream/ngx_stream_zone_sync_module.html)
- [nginx security advisories — nginx.org](https://nginx.org/en/security_advisories.html)
- [nginx news: 2026 — nginx.org](https://nginx.org/2026.html)
- [nginx CHANGES — nginx.org](https://nginx.org/en/CHANGES)
- [Ingress NGINX Retirement: What You Need to Know — Kubernetes Blog](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/)
- [Ingress NGINX: Statement from the Kubernetes Steering and Security Response Committees](https://kubernetes.io/blog/2026/01/29/ingress-nginx-statement/)
- [IngressNightmare: CVE-2025-1974 — Wiz](https://www.wiz.io/blog/ingress-nginx-kubernetes-vulnerabilities)
- [Critical Ingress NGINX Controller Vulnerability — The Hacker News](https://thehackernews.com/2025/03/critical-ingress-nginx-controller.html)
- [Keepalived — VRRP configuration (unicast_peer)](https://keepalived.readthedocs.io/en/latest/configuration_synopsis.html)
