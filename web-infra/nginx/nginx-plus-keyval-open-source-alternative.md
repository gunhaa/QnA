# NGINX Plus의 keyval, 오픈소스 NGINX에서도 쓸 수 있나

## 쉬운 설명

NGINX Plus의 **keyval**은 "서버가 켜져 있는 동안 계속 값을 바꿔 끼울 수 있는 메모지판"이다. 예를 들어 "이 IP는 차단됨", "지금은 점검 모드임" 같은 값을 설정 파일을 다시 안 읽어도 실시간으로 바꿀 수 있다. 그런데 이 메모지판 기능은 원래 **유료 버전(NGINX Plus)** 전용이다. 무료 오픈소스 NGINX에는 기본으로 없지만, 개발자들이 "우리도 비슷한 메모지판을 써보자"며 만든 **직접 설치하는 별도 모듈**이나, NGINX가 공식으로 무료 제공하는 **njs(자바스크립트 확장)의 공유 딕셔너리** 기능으로 비슷한 걸 흉내낼 수 있다.

## 일반 설명

### keyval이란

`ngx_http_keyval_module`(그리고 stream 버전인 `ngx_stream_keyval_module`)은 공유 메모리 존(zone) 또는 Redis를 백엔드로 하는 **동적 키-값 저장소**를 NGINX 설정 안에서 변수처럼 다룰 수 있게 해주는 모듈이다. API(NGINX Plus API)를 통해 런타임에 키-값을 추가/수정/삭제할 수 있어, 설정 리로드 없이 IP 차단 목록 갱신, 기능 플래그(feature flag), 점검 모드 전환, A/B 테스트 배정 등을 즉시 반영하는 데 쓰인다.

### 결론 — 일반(오픈소스) NGINX에서는 기본 제공되지 않음

`ngx_http_keyval_module`은 **NGINX Plus(상업용 구독 버전) 전용 모듈**이며, nginx.org의 공식 오픈소스 배포판에는 포함되어 있지 않다. [[nginx-plus-license-cost-estimate]], [[nginx-plus-sla-vendor-support-meaning]]에서 다룬 것처럼 NGINX Plus는 F5가 유료로 제공하는 상용 버전으로, keyval도 그 프리미엄 기능 중 하나다.

### 오픈소스에서의 대안

**1. 서드파티 오픈소스 모듈 — `nginx-keyval`**
- GitHub의 `kjdev/nginx-keyval` 같은 커뮤니티 프로젝트는 NGINX Plus의 keyval과 유사한 인터페이스(공유 메모리 zone 또는 Redis 백엔드를 통한 키-값 조회용 변수 생성)를 오픈소스로 재구현했다.
- 단, 이는 **공식 NGINX 소스에 포함된 것이 아니라 별도로 컴파일·설치해야 하는 서드파티 동적 모듈**이라는 점에 유의해야 한다. NGINX Plus의 API 기반 런타임 관리 기능과 완전히 동일하지는 않다.

**2. 공식 오픈소스 대안 — njs의 `js_shared_dict_zone`**
- NGINX가 공식으로 무료 배포하는 **njs(NGINX JavaScript)** 모듈(`ngx_http_js_module` / `ngx_stream_js_module`)에는 `js_shared_dict_zone`이라는 디렉티브가 있다. 이는 워커 프로세스 간에 공유되는 딕셔너리(공유 메모리 zone)를 선언하고, njs 스크립트 안에서 `nginx.shared` 객체로 이 딕셔너리를 읽고 쓸 수 있게 해준다.
- 예시:
  ```nginx
  js_shared_dict_zone zone=foo:1M timeout=60s;       # 문자열 값, 60초 후 만료
  js_shared_dict_zone zone=bar:512K timeout=30s evict; # 공간 부족 시 오래된 항목 강제 제거
  js_shared_dict_zone zone=num:32k type=number;        # 숫자 값 전용
  js_shared_dict_zone zone=persistent:1M state=/tmp/dict.json; # 상태를 파일로 영속화
  ```
- 이를 활용하면 SSL/TLS 인증서 회전을 재시작 없이 처리하거나, REST API 스타일로 값을 갱신하는 등 keyval과 유사한 용도로 활용할 수 있다. njs와 shared dict를 결합한 조합은 [[nginx-openresty-njs-request-processing-phases]]에서 다룬 njs 요청 처리 흐름 위에서 동작한다.
- `keyval`과의 차이: keyval은 NGINX Plus의 관리 API·대시보드와 통합되어 운영 편의성이 높은 반면, `js_shared_dict_zone`은 직접 njs 코드를 작성해 값을 갱신하는 로직(예: REST 엔드포인트를 스크립트로 구현)을 만들어야 한다는 점에서 개발자가 더 많은 부분을 직접 구현해야 한다.

**3. 완전히 다른 접근 — OpenResty(Lua)의 shared dict**
- OpenResty를 쓴다면 애초에 `lua_shared_dict`라는, njs의 `js_shared_dict_zone`보다 훨씬 오래되고 생태계가 성숙한 공유 메모리 딕셔너리가 기본 제공된다. [[openresty-vs-nginx]]에서 다룬 것처럼 OpenResty는 LuaJIT 기반으로 이런 동적 상태 관리 기능이 처음부터 풍부하게 갖춰져 있어, keyval과 유사한 기능이 필요하면서 오픈소스를 유지하고 싶다면 OpenResty 전환도 실무적으로 흔히 고려되는 선택지다.

### 요약

| 방법 | 공식 여부 | 특징 |
|---|---|---|
| `ngx_http_keyval_module` | NGINX Plus 공식(상용) | API 기반 런타임 관리, Redis 연동 공식 지원 |
| `nginx-keyval`(서드파티) | 비공식 오픈소스 | keyval과 유사한 인터페이스, 별도 컴파일 필요 |
| njs `js_shared_dict_zone` | **오픈소스 NGINX 공식** | 무료, 직접 스크립트로 갱신 로직 구현 필요 |
| OpenResty `lua_shared_dict` | OpenResty 공식(오픈소스) | 가장 성숙한 생태계, Lua 기반 |

일반(오픈소스) NGINX에서 keyval 자체는 쓸 수 없지만, **공식적으로 무료 제공되는 njs의 `js_shared_dict_zone`**이 가장 가까운 공식 대안이며, 더 강력한 동적 상태 관리가 필요하다면 OpenResty의 `lua_shared_dict`도 유력한 선택지다.

---

### Sources
- [Module ngx_http_keyval_module — nginx.org](https://nginx.org/en/docs/http/ngx_http_keyval_module.html)
- [NGINX Keyval Module: Dynamic Key-Value Store Inside NGINX](https://www.getpagespeed.com/server-setup/nginx/nginx-keyval-module)
- [nginx-keyval (GitHub, kjdev)](https://github.com/kjdev/nginx-keyval)
- [Module ngx_http_js_module — nginx.org](https://nginx.org/en/docs/http/ngx_http_js_module.html)
- [Module ngx_stream_js_module — nginx.org](https://nginx.org/en/docs/stream/ngx_stream_js_module.html)
- [SSL/TLS Certificate Rotation Without Restarts in NGINX Open Source](https://blog.nginx.org/blog/ssl-tls-certificate-rotation-without-restarts-in-nginx-open-source)
- [NGINX vs. NGINX Plus: Why Upgrade from Open Source to Commercial Version](https://www.managedserver.eu/nginx-vs-nginx-plus-why-upgrade-from-open-source-to-commercial-version/)
