# Kong의 역사 — API 마켓플레이스의 부품에서 AI·MCP 게이트웨이까지

관련 글: [Kong의 RPC 지원](kong-rpc-support.md) · [Kong vs OpenResty](kong-vs-openresty.md) · [Kong Consumer는 Entity인가 상태인가](kong-consumer-entity-vs-state-machine.md) · [Kong의 스트리밍·WebSocket 지원](kong-streaming-websocket-support.md)

## 쉬운 설명

원래 Kong은 API 장터(Mashape)를 운영하던 회사가 **자기 장터 입구를 지키려고 만든 문지기**였다. 문지기가 장터보다 더 인기가 많아지자 회사는 장터를 팔고, 이름도 문지기 이름(Kong)으로 바꿨다. 그 뒤로 문지기가 맡는 일이 계속 늘었다. 처음엔 HTTP만 보다가 gRPC를 받기 시작했고, 본부와 현장을 나눠 일하게 됐고(하이브리드), 지금은 AI 모델과 AI 도구(MCP) 호출까지 지킨다.

## 일반 설명

### 등장 배경 (2010년대 초중반)

- **Mashape**는 API 마켓플레이스를 운영했다. 수많은 API 앞에서 인증, 과금, rate limit을 처리할 게이트웨이를 사내에서 만들어 썼다.
- 기반은 **NGINX + OpenResty(LuaJIT)** 다. 고성능 이벤트 루프 위에 Lua로 플러그인을 얹는 구조였고, 설정은 Cassandra/PostgreSQL에 저장했다.
- 풀려던 문제는 **API마다 반복되는 공통 관심사(인증, 로깅, rate limit)를 앞단에서 한 번에 처리하는 것**이다. 마이크로서비스가 늘던 시기와 맞물렸다.

### 주요 변천

| 시기 | 사건 | 의미 |
|---|---|---|
| **2015** | Mashape가 Kong을 **오픈소스로 공개** | NGINX 기반 OSS API 게이트웨이의 대표 주자가 됨 |
| **2017** | API 마켓플레이스를 **RapidAPI에 매각**, 회사명을 **Kong Inc.** 로 변경 | 게이트웨이 단일 제품 회사로 전환 |
| **2018.09** | **Kong 1.0** | 안정 API 확정, 서비스 메시·DB-less 방향의 토대 |
| **2019** | **1.x에서 gRPC 프록시 지원**, DB-less(선언적 설정) | HTTP/REST 전용에서 벗어남 |
| **2020.01** | **Kong Gateway 2.0 — 하이브리드 모드**(CP/DP 분리), Go 플러그인 | 데이터 플레인을 어디에나 두고 설정은 중앙에서 관리 → SaaS인 Konnect의 기반 |
| **2022** | **3.0** — 3.1에서 레거시 하이브리드 프로토콜 제거(wRPC로 일원화), 라우터 재작성 등 | 대규모 운영·성능 정비 |
| **2024** | **AI Gateway** 플러그인 묶음 공개 (3.6 무렵) | LLM 호출을 API 트래픽처럼 프록시·관측·통제 |
| **2025** | **3.12 — MCP 지원**(AI MCP Proxy, MCP OAuth2) | AI 에이전트의 도구 호출(JSON-RPC 기반 MCP)까지 게이트웨이 대상으로 |
| **2026** | 3.15대 릴리스, A2A(에이전트 간 통신) 게이트웨이 홍보 | "API 게이트웨이" → "API + AI 연결 플랫폼"으로 포지셔닝 |

### 현재 상태

- **OSS(Kong Gateway)와 Enterprise/Konnect(SaaS 컨트롤 플레인)의 이원 구조**다. gRPC, gRPC-Web, gRPC-Gateway 같은 핵심 프록시 기능은 OSS에 있다. AI MCP Proxy 같은 최신 AI 기능은 Enterprise에 집중되는 경향이 있다.
- 쿠버네티스 쪽은 **Kong Ingress Controller**와 **Kong Operator**(Gateway API 지원)로 확장되었다.
- 경쟁 구도: Envoy 기반 게이트웨이(Istio Gateway, Envoy Gateway, Gloo), 클라우드 관리형(AWS API Gateway 등), APISIX(같은 OpenResty 계열).

> 연도 중 일부(gRPC 지원 도입 버전, AI Gateway 첫 공개 버전)는 출처마다 조금씩 다르다. 정확한 날짜는 Kong 공식 changelog로 확인하는 것이 좋다.

## 참고

- [Wikipedia — Kong Inc.](https://en.wikipedia.org/wiki/Kong_Inc.)
- [Wikipedia — Mashape](https://en.wikipedia.com/wiki/Mashape)
- [Kong blog — Kong Gateway OSS Turns Six](https://konghq.com/blog/news/kong-gateway-oss-turns-six)
- [Kong blog — Celebrating Four Years](https://konghq.com/blog/celebrating-four-years)
- [Kong blog — Kong Gateway 2.0.0 Released](https://konghq.com/blog/kong-gateway-2-0-0-released)
- [Kong 1.0 Debuts (Enterprise Apps Today)](https://enterpriseappstoday.com/?p=23061)
- [App Developer Magazine — Mashape releases Kong](https://appdevelopermagazine.com/mashape-releases-kong-open-source-management-layer-for-apis/)
- [TechCrunch — Kong](https://techcrunch.com/?p=2665585)
- [Computer Weekly — How Kong is driving the future of APIs](https://computerweekly.com/news/366616380/How-Kong-is-driving-the-future-of-APIs)
- [Kong 3.1 — Breaking changes](https://docs.konghq.com/gateway/3.1.x/breaking-changes)
- [Kong — AI MCP Proxy](https://developer.konghq.com/plugins/ai-mcp-proxy/)
