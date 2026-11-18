# OpenResty와 nginx, 뭐가 다를까?

## 한 문장 비유

nginx는 **"손님을 안내하는 아주 빠른 웨이터"**예요. 정해진 메뉴(설정 파일)대로만 움직이죠.
OpenResty는 그 웨이터에게 **"즉석에서 요리법을 바꿀 수 있는 마법 요리책(Lua 스크립팅)"**을 쥐여준 버전이에요. 손님 요청에 따라 그때그때 다르게 대응할 수 있어요.

## 기술적으로 풀어보면

- **nginx**: 가볍고 빠른 웹 서버(web server) / 리버스 프록시(reverse proxy)예요. 정적 파일 서빙, 요청 전달, 로드밸런싱(load balancing)이 주특기고, 기능을 늘리려면 C언어로 모듈을 만들어야 해서 진입장벽이 높아요.
- **OpenResty**: nginx를 코어(core)로 그대로 쓰면서, 여기에 **LuaJIT**(Lua 언어를 초고속으로 실행하는 JIT 컴파일러)와 다양한 Lua 라이브러리를 붙인 것이에요. 즉, "nginx + Lua = OpenResty"라고 보면 됩니다.
- 그래서 OpenResty는 요청이 들어올 때마다 Lua 스크립트로 **동적으로 로직을 실행**할 수 있어요. 인증(authentication), 캐싱(caching), 요청 라우팅(request routing), 응답 압축 등을 nginx 설정 안에서 직접 코드로 짤 수 있죠. nginx만으로는 이런 걸 하려면 별도 C 모듈 컴파일이 필요해서 훨씬 번거로워요.
- 반대로 단순히 정적 파일을 서빙하거나 기본적인 리버스 프록시/로드밸런서로만 쓸 거라면 nginx가 더 가볍고 배우기 쉬워요. OpenResty는 Lua를 알아야 진가를 발휘하기 때문에 학습 곡선(learning curve)이 좀 더 있어요.
- 실무에서는 **API 게이트웨이(API Gateway)**를 만들 때 OpenResty가 많이 쓰여요 (예: Kong, APISIX 같은 오픈소스 API 게이트웨이가 OpenResty 기반이에요).

## 최신 소식 (2026년 기준)

- OpenResty는 계속 nginx 코어와 LuaJIT를 기반으로 발전 중이며, 최근 **1.29.2.5** 버전에서는 nginx의 rewrite 모듈에 있던 버퍼 오버플로우 취약점(CVE-2026-9256)을 패치했어요.
- **1.27.1.1** 버전에서는 LuaJIT가 2.1-20240815로 업데이트되어 에러 처리, 스택 오버플로우 관리가 개선됐고, OpenSSL이 1.1.1 → 3.0.15로, PCRE가 8.45 → 10.42로 업그레이드됐어요. HTTP/3 모듈(`http_v3_module`)도 공식 빌드에 추가됐어요.
- OpenResty 팀은 API 게이트웨이 전문 상용 제품인 **OpenResty Edge**, 보안/관측 도구인 **OpenResty XRay**도 함께 내놓고 있어요.

## 요약 비교표

| 구분 | nginx | OpenResty |
|---|---|---|
| 정체 | 웹 서버 / 리버스 프록시 | nginx + LuaJIT 기반 애플리케이션 서버 |
| 확장 방법 | C 모듈 컴파일 | Lua 스크립트 (동적) |
| 대표 용도 | 정적 서빙, 프록시, 로드밸런싱 | API 게이트웨이, 동적 로직 처리 |
| 난이도 | 비교적 쉬움 | Lua 지식 필요, 다소 어려움 |

Sources:
- [OpenResty vs NGINX: Differences, Use Cases, and API Gateway Fit - API7.ai](https://api7.ai/learning-center/openresty/openresty-vs-nginx)
- [OpenResty vs Nginx: Detailed Comparison Review - Zoftwarehub](https://blogs.zoftwarehub.com/openresty-vs-nginx-detailed-comparison-review-in-2025/)
- [nginx vs openresty - StackShare](https://stackshare.io/stackups/nginx-vs-openresty)
- [OpenResty 1.29.2.5 Released - OpenResty Official Blog](https://blog.openresty.com/en/openresty-ann-1.29.2.5/)
- [OpenResty 1.27.1.1 Released - OpenResty Official Blog](https://blog.openresty.com/en/openresty-ann-1.27.1.1/)
