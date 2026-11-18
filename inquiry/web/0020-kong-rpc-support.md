---
type: inquiry
created: 2026-11-17
author: agent
model: claude-opus-5-5
---

# Kong은 RPC를 지원하나? — gRPC·gRPC-Web·JSON-RPC(MCP)·내부 클러스터 RPC

관련 글: [Kong의 역사](./0019-kong-history.md) · [Kong vs OpenResty](./0001-kong-vs-openresty.md) · [Kong의 스트리밍·WebSocket 지원](./0021-kong-streaming-websocket-support.md)

## 쉬운 설명

Kong은 우체국 창구다. **gRPC라는 특수 봉투**는 그대로 받아서 배달할 수 있다. 일반 편지(REST/JSON)나 브라우저용 봉투(gRPC-Web)로 온 걸 gRPC 봉투로 **다시 포장**해 주는 기능도 있다. 반면 **JSON-RPC라는 봉투는 그냥 일반 편지로 취급**한다. 내용물을 열어 보고 처리하는 건 MCP용 유료 기능에서만 한다.

## 일반 설명

### 결론 요약

| RPC 종류 | 지원 | 방식 | 에디션 |
|---|---|---|---|
| **gRPC** (HTTP/2 + Protobuf) | **네이티브 지원** | Gateway Service/Route `protocol`을 `grpc` / `grpcs`로 지정해 프록시 | OSS |
| **REST(JSON) → gRPC 변환** | 지원 | **gRPC-Gateway 플러그인** (`.proto`의 HTTP 어노테이션 기반 트랜스코딩) | OSS |
| **gRPC-Web → gRPC 변환** | 지원 | **gRPC-Web 플러그인** (브라우저 클라이언트용, HTTP/1.1·HTTP/2 모두 가능) | OSS |
| **JSON-RPC 2.0 (일반)** | **전용 기능 없음** | 그냥 HTTP POST로 프록시된다. 메서드(`method`) 단위 라우팅·인증·rate limit을 하려면 커스텀 플러그인(Lua 등)이 필요하다 | — |
| **JSON-RPC 기반 MCP** | 지원 (3.12+) | **AI MCP Proxy 플러그인**: MCP 패스스루, REST API → MCP 도구 변환, 도구 단위 ACL | **Enterprise (AI Gateway)** |
| **Kong 내부 RPC** (CP ↔ DP) | 내부 전용 | 하이브리드 모드에서 Control Plane과 Data Plane 사이의 설정 동기화 프로토콜(2.8부터 wRPC, 3.1에서 레거시 프로토콜 제거). 사용자 트래픽용이 아니다 | — |

### 1. gRPC 프록시

- Gateway Service의 `protocol: grpc | grpcs`, Route의 `protocols: [grpc, grpcs]`로 설정한다. Kong은 HTTP/2로 받아서 업스트림 gRPC 서버에 그대로 전달한다.
- **라우팅 기준**: gRPC 요청 경로는 `/패키지.서비스/메서드` 형태라서, Route의 `paths`로 **서비스·메서드 단위 라우팅**이 가능하다.
- **gRPC 프록시는 HTTP/2가 필요**하다. 클라이언트 쪽은 TLS(`grpcs`)나 h2c 리스너 설정이 필요하다.
- **Kubernetes(KIC)**: Service에 `konghq.com/protocol: grpc|grpcs` 어노테이션을 붙인다. Gateway API의 `GRPCRoute`도 지원한다(Kong Operator).
- **플러그인 호환성**: 플러그인마다 지원 프로토콜이 다르다. 인증(key-auth, jwt 등)이나 rate limiting처럼 헤더 기반 플러그인은 대부분 grpc에서 동작한다. 반면 **요청·응답 바디를 변환하는 플러그인**은 Protobuf 바이너리를 이해하지 못해 쓸 수 없다. 공식 [Plugins Compatibility](https://developer.konghq.com/plugins/compatibility/) 표에서 확인해야 한다.

### 2. gRPC-Gateway 플러그인 (REST → gRPC)

- **HTTP(S)를 받는 Route에 붙이고, 프록시 대상 Service는 grpc(s)** 로 설정한다.
- `.proto` 파일의 `google.api.http` 어노테이션을 읽어 `GET /v1/users/{id}` 같은 REST 호출을 gRPC 메서드 호출로 바꾸고, JSON과 Protobuf를 서로 변환한다.
- 오픈소스 **grpc-gateway** 프로젝트를 모델로 만들어졌다. 차이는 별도의 프록시 서버를 생성·배포할 필요 없이 **Kong 안에서 처리**한다는 점이다.

### 3. gRPC-Web 플러그인 (브라우저 → gRPC)

- 브라우저는 HTTP/2 트레일러를 직접 다룰 수 없어서 순수 gRPC를 호출할 수 없다. 이 플러그인은 그런 브라우저용 gRPC-Web 프로토콜을 gRPC로 바꾼다.
- Envoy의 gRPC-Web 필터와 같은 역할을 Kong이 맡는 셈이다.
- 3.10.x 변경 이력에 gRPC 플러그인 사용 시 `TE` 헤더가 빠지던 버그 수정이 있다. **패치 버전을 최신으로 유지**하는 게 좋다.

### 4. JSON-RPC

- Kong에는 **일반 JSON-RPC 전용 플러그인이 없다.** JSON-RPC는 보통 `POST /` 하나의 엔드포인트로 들어오므로 Kong 입장에서는 평범한 HTTP다.
  - 프록시, 인증, IP 제한, 전체 rate limit은 **그대로 된다.**
  - **`method` 필드 기준 라우팅·권한·rate limit**은 바디를 파싱해야 하므로 기본 기능으로는 안 된다. 대안은 다음과 같다.
    - **커스텀 플러그인**(Lua/Go/JS/Python PDK)으로 바디를 파싱해 처리한다.
    - (Enterprise) 바디 조건을 다룰 수 있는 기능이 있는지 확인한다.
    - 블록체인 노드(Ethereum JSON-RPC 등)라면 전용 RPC 프록시를 앞단에 둔다.
- **예외: MCP**. MCP의 데이터 계층이 JSON-RPC 2.0이다. Kong 3.12부터 **AI MCP Proxy 플러그인**(Enterprise AI Gateway)이 MCP 트래픽을 이해한다.
  - **passthrough-listener**: 기존 MCP 서버 앞에서 프록시하며 **도구(tool) 단위 ACL**을 건다.
  - **conversion-listener**: Kong이 관리하는 REST Service를 **MCP 서버로 변환**해 제공한다.
  - **conversion-only**: 도구 정의만 만들고, 다른 리스너가 모아서 노출한다.
  - 2026-07의 3.15.0.0까지 변경 이력이 이어지고 있다.

### 5. "Kong RPC"가 내부 프로토콜을 뜻한다면

하이브리드 모드(2.0+)에서는 **Control Plane이 Data Plane에 설정을 밀어 넣는** 클러스터 통신이 있다.
- 2.8에서 **wRPC**(WebSocket 위의 RPC)가 도입됐다.
- 3.1에서 레거시 프로토콜이 제거됐다. 그래서 2.8 → 3.1 롤링 업그레이드는 불가능하고 3.0을 거쳐야 한다.
- 3.x 후반에는 이 계층에 JSON-RPC 기반 클러스터 RPC(증분 동기화 등)가 추가된 것으로 알려져 있다. 이번 검색에서는 공식 문서로 확인하지 못했다.

이 프로토콜은 **Kong 노드 사이 내부 통신**이다. 사용자 API 트래픽과는 관계없다.

### 선택 가이드

- **내부 MSA가 gRPC** → Kong을 gRPC 프록시로 쓰고, 외부 REST 노출이 필요하면 gRPC-Gateway 플러그인을 붙인다.
- **프런트엔드가 gRPC 서비스를 직접 호출** → gRPC-Web 플러그인을 쓴다.
- **JSON-RPC API를 메서드 단위로 통제** → 커스텀 플러그인을 만들거나 전용 프록시를 둔다. MCP라면 AI MCP Proxy를 쓴다(Enterprise).

## 참고

- [Kong — gRPC-Gateway plugin](https://developer.konghq.com/plugins/grpc-gateway/)
- [Kong — gRPC-Gateway changelog](https://developer.konghq.com/plugins/grpc-gateway/changelog/)
- [Kong — Use the gRPC-Gateway plugin](https://developer.konghq.com/how-to/use-grpc-gateway/)
- [Kong — gRPC-Web plugin](https://developer.konghq.com/plugins/grpc-web/)
- [Kong — gRPC-Web changelog](https://developer.konghq.com/plugins/grpc-web/changelog/)
- [Kong — Use the gRPC-Web plugin](https://developer.konghq.com/how-to/use-grpc-web/)
- [Kong — gRPC-Web examples](https://developer.konghq.com/plugins/grpc-web/examples/)
- [Kong 2.8 — Configuring gRPC](https://docs.konghq.com/gateway/2.8.x/configure/grpc)
- [Kong — Plugins Compatibility](https://developer.konghq.com/plugins/compatibility/)
- [Kong Operator — GRPCRoute](https://developer.konghq.com/operator/dataplanes/how-to/grpcroute/)
- [KIC 3.3 — gRPC services](https://docs.konghq.com/kubernetes-ingress-controller/3.3.x/guides/services/grpc)
- [Kong — AI MCP Proxy plugin](https://developer.konghq.com/plugins/ai-mcp-proxy/)
- [Kong — AI MCP Proxy changelog](https://developer.konghq.com/plugins/ai-mcp-proxy/changelog/)
- [Kong — passthrough-listener example](https://developer.konghq.com/plugins/ai-mcp-proxy/examples/passthrough-listener/)
- [Kong — conversion-listener example](https://developer.konghq.com/plugins/ai-mcp-proxy/examples/conversion-listener)
- [Kong blog — AI Gateway, MCP Gateway, MCP Server breakdown](https://konghq.com/blog/engineering/ai-gateway-mcp-gateway-mcp-server-breakdown)
- [Kong 3.1 — Breaking changes (wRPC)](https://docs.konghq.com/gateway/3.1.x/breaking-changes)
- [Kong — Hybrid mode](https://developer.konghq.com/gateway/hybrid-mode/)
- [Kong gRPC/WebSocket 지원 정리 (OneUptime)](https://oneuptime.com/blog/post/2026-02-09-kong-grpc-websocket-support/view)
