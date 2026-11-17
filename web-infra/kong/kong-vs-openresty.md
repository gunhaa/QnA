# Kong vs OpenResty, 뭐가 다른데?

레고로 비유하면, **OpenResty는 "레고 부품 상자+ 설명서"**이고, **Kong은 그 부품으로 이미 완성해놓은 "장난감 로봇"**이에요.

## OpenResty = 재료 세트

OpenResty는 nginx(웹서버 코어) 안에 **LuaJIT**(Lua 프로그래밍 언어 엔진)을 끼워 넣어서, "nginx가 요청을 처리하는 중간중간에 내 코드(Lua 스크립트)를 실행"할 수 있게 만든 **플랫폼**이에요.

- 완성품이 아니라 "무엇이든 만들 수 있는 뼈대"
- API 게이트웨이, 로그인 처리, 캐싱 등을 만들려면 **직접 Lua 코드를 짜야** 해요
- 미리 만들어진 버튼(플러그인) 같은 건 기본 제공 안 함

## Kong = 이미 조립된 로봇

Kong은 **OpenResty 위에서 돌아가는 Lua 애플리케이션**이에요. 즉 "nginx 안에서 실행되는 프로그램"인데, 이미 완성된 **API 게이트웨이** 제품이에요.

- **플러그인 방식**: 인증, 속도 제한(Rate Limiting), 로깅, 요청/응답 변환 같은 기능이 이미 버튼처럼 준비되어 있어서 설정만 켜면 됨
- **관리 API/대시보드** 제공: "이 API는 여기로 보내" 같은 라우팅 규칙을 코드 없이 API 호출이나 화면에서 등록 가능
- 코어는 가볍게 유지하고, 복잡한 로직은 대부분 플러그인에게 맡기는 설계 철학

## 비유로 정리

| | OpenResty | Kong |
|---|---|---|
| 정체 | nginx + Lua 실행 환경 (플랫폼) | OpenResty 위에서 도는 완성된 API 게이트웨이 (애플리케이션) |
| 기능 추가 방법 | 직접 Lua 코드 작성 | 플러그인 켜기/끄기 |
| 관리 도구 | 없음 (직접 nginx.conf + Lua 관리) | REST 관리 API, 웹 대시보드 제공 |
| 비유 | 레고 부품 상자 | 이미 완성된 로봇 (부품 상자로 만들어짐) |
| 성능 기반 | nginx의 이벤트 루프 그대로 사용 | 마찬가지로 nginx 이벤트 루프를 그대로 물려받아 고성능 유지 |

**한 줄 정리**: Kong은 OpenResty라는 재료로 만들어진 완성품이라, "밑바닥부터 짜기 싫고 빠르게 API 게이트웨이가 필요하다"면 Kong을, "내 마음대로 커스텀 로직을 짜고 싶다"면 OpenResty를 골라요.

**출처**
- [What is the difference between OpenResty and Kong? | GitHub Kong/kong#484](https://github.com/Kong/kong/issues/484)
- [Nginx, OpenResty and Kong | FastClouds Blog](http://fastclouds.net/blog/2017/09/04/nginx-openresty-and-kong/)
- [Kong vs OpenResty | StackShare](https://stackshare.io/stackups/kong-vs-openresty)
