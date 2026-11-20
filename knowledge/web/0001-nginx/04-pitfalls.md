---
type: knowledge
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# NGINX 운영 시 자주 겪는 문제와 해결 방법

## 쉬운 설명

NGINX 사고의 대부분은 NGINX가 고장 나서가 아니라 **설정 한 글자** 때문에 난다. 경로 끝의 `/` 하나로 엉뚱한 폴더가 열리고, 안쪽 블록에 헤더 한 줄을 더 적었더니 바깥에 적은 보안 헤더가 전부 사라지고, 백엔드 주소를 이름으로 적었더니 IP가 바뀐 것을 모른 채 옛 주소로 계속 보낸다. 설정은 짧지만 규칙이 직관과 다르다.

## 일반 설명

원인이 **사람(설정·사용법)** 인 문제만 다룬다. NGINX 자체의 장애는 [장애 대응](./05-failure-modes.md)에 있다.

### 1. 설정 함정

| 함정 | 증상 | 원인 | 해결 |
|---|---|---|---|
| **`proxy_pass` 끝의 `/`** | 백엔드가 받는 경로가 예상과 다름 | `proxy_pass http://app;`(URI 없음)는 원래 경로를 그대로, `proxy_pass http://app/;`(URI 있음)는 **location 접두사를 잘라내고** 붙인다 | `location /api/` + `proxy_pass http://app/;` → `/api/users`가 `/users`로 간다. 의도를 정하고 둘 중 하나로 통일 |
| **배열형 지시어 상속** (`add_header`, `proxy_set_header`) | 특정 location에서 HSTS·CSP 같은 보안 헤더가 사라짐, `Host` 헤더가 바뀜 | 안쪽 블록에 하나라도 쓰면 바깥 블록의 같은 지시어를 **전부 상속하지 않는다** | 공통 헤더를 `include` 파일로 빼서 각 블록에 넣는다. 1.29.3+는 `add_header_inherit`로 병합 가능 |
| **location 안의 `if`** | `try_files`·`proxy_pass`가 무시되거나 예상 밖 동작 | `if`는 rewrite 모듈 지시어로, 안에서 쓸 수 있는 지시어와 동작이 제한적이다 | `if` 안에서는 `return`·`rewrite ... last`만 쓴다. 분기는 `map`으로 변수를 만들어 처리 |
| **정규식 location 순서** | 더 구체적인 정규식이 있는데 앞의 것이 잡음 | 정규식은 가장 긴 것이 아니라 **설정 순서상 처음** 일치한 것이 이긴다 | 구체적인 정규식을 위로. 정적 경로는 `^~` 접두사로 정규식 검사를 건너뛰게 한다 |
| **기본 server 미지정** | 모르는 도메인·IP 직접 접속에 첫 번째 사이트가 응답, 인증서 오류·정보 노출 | `default_server`가 없으면 **처음 정의된 server**가 기본 | `listen 80 default_server; return 444;` 같은 빈 기본 서버를 둔다(443은 `ssl_reject_handshake on`) |
| **`root`와 `alias` 혼동** | 404 또는 다른 파일이 열림 | `root`는 경로를 **덧붙이고**, `alias`는 location 부분을 **바꿔 끼운다** | 접두사 location에서 디렉터리를 다른 곳으로 매핑할 때만 `alias`, 나머지는 `root` |

### 2. 프록시·업스트림

| 함정 | 증상 | 원인 | 해결 |
|---|---|---|---|
| **백엔드 DNS를 한 번만 해석** | 백엔드(ELB, 쿠버네티스 Service 외부 이름 등) IP가 바뀐 뒤 502·504 | `proxy_pass http://backend.example.com;`의 이름은 **설정 로드 시 한 번** 해석된다 | 1.27.3+: upstream에 `resolver` + `server backend.example.com resolve;`. 그 이전: `resolver` + 변수(`set $b backend.example.com; proxy_pass http://$b;`) |
| **백엔드 keepalive 미사용** (1.29.7 이전) | 백엔드에 TIME_WAIT 폭증, 지연 증가 | 예전 기본값은 HTTP/1.0 + `Connection: close` | 구버전은 `keepalive 32;` + `proxy_http_version 1.1;` + `proxy_set_header Connection "";`. 1.29.7+는 기본 활성 |
| **`Host` 헤더** | 백엔드 가상 호스트·리다이렉트 URL이 틀어짐 | 기본값은 `$proxy_host`(upstream 이름) | `proxy_set_header Host $host;` |
| **클라이언트 IP 신뢰** | 로그·rate limit이 LB IP 하나로 찍힘, 또는 위조된 `X-Forwarded-For`를 믿음 | 앞단 LB 뒤에서 `$remote_addr`는 LB 주소 | `set_real_ip_from <LB 대역>` + `real_ip_header X-Forwarded-For` + `real_ip_recursive on`. **신뢰 대역만** 지정 |
| **타임아웃 기본값** | 오래 걸리는 API·리포트가 정확히 60초에 504 | `proxy_read_timeout` 기본 60초 | 해당 location만 늘리고, 근본적으로는 비동기 작업으로 분리 |
| **업로드 413** | 1MB 넘는 업로드 실패 | `client_max_body_size` 기본 **1m** | 업로드 location에만 필요한 크기로 |
| **WebSocket·SSE 끊김** | 연결이 업그레이드되지 않거나 이벤트가 몰려서 옴 | `Upgrade`/`Connection` 헤더 미전달, 응답 버퍼링(`proxy_buffering on`) | WebSocket은 `proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";`, SSE는 `proxy_buffering off` 또는 응답에 `X-Accel-Buffering: no` |
| **비멱등 요청 재시도 기대** | 백엔드 장애 때 POST가 다른 서버로 넘어가지 않음 | 1.9.13+ 기본 동작 | 의도된 안전장치다. 멱등성을 보장할 수 있을 때만 `proxy_next_upstream ... non_idempotent` |

### 3. 성능

| 함정 | 진단 | 해결 |
|---|---|---|
| `worker_connections` 부족 | 에러 로그 `worker_connections are not enough` | 프록시는 연결당 2개를 쓴다. 목표 동시 연결 × 2 ÷ 워커 수 이상으로 |
| 파일 디스크립터 한도 | `Too many open files` | `worker_rlimit_nofile`과 OS·systemd `LimitNOFILE`을 함께 올림 |
| 워커 안 블로킹 작업 | 일부 요청만 간헐적으로 느림, CPU는 낮음 | Lua·njs·Perl에서 블로킹 I/O 금지, 큰 파일은 `aio threads` |
| 로그 쓰기 비용 | 디스크 I/O 대기 | `access_log ... buffer=64k flush=5s`, 헬스체크 경로는 `access_log off` |
| 압축 과다 | CPU 포화 | `gzip_comp_level` 1~5, 이미 압축된 형식(이미지·zip) 제외 |
| `ip_hash` 쏠림 | 한 백엔드만 부하 | 회사·통신사 NAT 뒤 사용자가 같은 3옥텟으로 묶임 → `hash $cookie_... consistent`나 `sticky` |

### 4. 보안 설정 실수

| 실수 | 위험 | 해결 |
|---|---|---|
| **`alias` 끝 슬래시 불일치**: `location /img { alias /data/images/; }` | `/img../secret` → `/data/images/../secret`으로 **경로 순회** | location과 alias 끝의 `/`를 맞춘다(`location /img/ { alias /data/images/; }`). gixy 같은 설정 분석기로 검사 |
| 사용자 입력이 섞인 `proxy_pass $var` | SSRF(내부망 호출) | 변수 목적지는 `map` 화이트리스트로 제한 |
| `.git`, `.env`, 백업 파일 노출 | 소스·비밀 유출 | `location ~ /\.(?!well-known) { deny all; }` |
| `server_tokens` 기본(on) | 버전 노출 → 취약 버전 표적 | `server_tokens off;` |
| `limit_req`의 `burst`·`nodelay` 오해 | 의도보다 많이 통과하거나 정상 사용자가 503 | `burst`는 대기열 크기, `nodelay`는 대기 없이 즉시 처리. 인스턴스마다 카운터가 따로라는 점([트레이드오프](./03-tradeoffs.md#1-핵심-설계-선택-얻은-것과-포기한-것))도 고려 |
| `X-Forwarded-For` 전부 신뢰 | 클라이언트가 IP를 위조해 차단 우회 | 위 2절의 `set_real_ip_from`를 신뢰 대역으로만 |

### 5. 캐시

| 함정 | 결과 | 해결 |
|---|---|---|
| 개인화 응답 캐시 | 다른 사용자에게 남의 페이지가 보임 | `Authorization`·세션 쿠키가 있으면 `proxy_cache_bypass`/`proxy_no_cache`. 백엔드가 `Cache-Control: private`를 보내게 |
| 캐시 키 설계 누락 | 모바일/PC, 언어별 응답이 섞임 | `proxy_cache_key`에 구분 변수 추가, `Vary` 확인 |
| 만료된 순간 백엔드 폭주 | 인기 URL 만료 시 동시 요청이 모두 백엔드로 | `proxy_cache_lock on`, `proxy_cache_use_stale updating error timeout`, `proxy_cache_background_update on` |

### 6. 운영: 빌드, 업그레이드, 관측

- **`nginx -t` 없이 리로드**: 리로드는 실패하면 옛 설정으로 계속 돌지만, **재시작**(`systemctl restart`)은 설정 오류면 그대로 내려간다. CI에서 `nginx -t`를 돌리고, 배포는 reload로 한다.
- **배포판 기본 패키지의 묵은 버전**: 기능이 없거나(예: `resolve`, `sticky`) 문서와 동작이 다르다. `nginx -V`로 버전·빌드 옵션을 먼저 확인한다. 단 배포판은 보안 패치를 백포트하므로 버전 번호만으로 취약 여부를 판단하지 않는다.
- **동적 모듈 버전 불일치**: `module "..." version X instead of Y` 오류로 시작 실패. nginx를 올릴 때 모듈도 같은 버전 소스로 다시 빌드한다.
- **로그 로테이트 후 빈 로그**: 파일을 옮기기만 하고 `USR1`(`nginx -s reopen`)을 안 보내면 워커가 지워진 파일에 계속 쓴다(디스크는 계속 참).
- **컨테이너에서 환경 변수**: 설정 파일은 환경 변수를 읽지 않는다. 공식 Docker 이미지의 `/etc/nginx/templates/*.template`(envsubst) 기능을 쓴다.
- **관측**: 오픈소스 지표는 `stub_status`(활성 연결·요청 수)뿐이다. 업스트림별 지표가 필요하면 로그에 `$upstream_response_time`, `$upstream_addr`, `$request_time`을 남겨 집계하거나 Plus API·서드파티 exporter를 쓴다.

## 관련 문서

- [NGINX의 역사](./01-history.md)
- [NGINX 개요와 기본 사용법](./02-overview.md)
- [NGINX 트레이드오프와 선택 기준](./03-tradeoffs.md)
- [NGINX 장애 대응과 고가용성](./05-failure-modes.md)
- [nginx의 요청 처리 단계와 OpenResty·njs](../../../inquiry/web/0004-nginx-openresty-njs-request-processing-phases.md)

## 참고 자료

- [Module ngx_http_proxy_module — nginx.org](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Module ngx_http_headers_module — nginx.org](https://nginx.org/en/docs/http/ngx_http_headers_module.html)
- [Module ngx_http_rewrite_module — nginx.org](https://nginx.org/en/docs/http/ngx_http_rewrite_module.html)
- [Module ngx_http_core_module — nginx.org](https://nginx.org/en/docs/http/ngx_http_core_module.html)
- [Module ngx_http_upstream_module — nginx.org](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
- [Module ngx_http_realip_module — nginx.org](https://nginx.org/en/docs/http/ngx_http_realip_module.html)
- [Module ngx_http_limit_req_module — nginx.org](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html)
- [WebSocket proxying — nginx.org](https://nginx.org/en/docs/http/websocket.html)
- [How nginx processes a request — nginx.org](https://nginx.org/en/docs/http/request_processing.html)
- [Controlling nginx — nginx.org](https://nginx.org/en/docs/control.html)
- [nginx CHANGES — nginx.org](https://nginx.org/en/CHANGES)
- [gixy — Alias traversal](https://github.com/yandex/gixy/blob/master/docs/en/plugins/aliastraversal.md)
- [dvershinin/gixy (유지 중인 포크) — GitHub](https://github.com/dvershinin/gixy)
- [nginx official image (templates/envsubst) — Docker Hub](https://hub.docker.com/_/nginx)
