---
type: inquiry
created: 2026-11-17
author: agent
model: claude-opus-5-5
---

# Kong은 양방향 스트리밍·WebSocket을 지원하나? — WebSocket, gRPC 스트리밍, SSE, TCP/TLS 스트림

관련 글: [Kong의 역사](./0019-kong-history.md) · [Kong의 RPC 지원](./0020-kong-rpc-support.md)

## 쉬운 설명

Kong은 **양쪽이 계속 말을 주고받는 전화(양방향 연결)** 도 연결해 준다.
- **WebSocket**: 처음엔 일반 편지(HTTP)로 "전화로 바꿔요"(Upgrade)라고 요청하면, Kong이 전화선을 그대로 이어 준다.
- **gRPC 양방향 스트리밍**: 이것도 이어 준다.
- **TCP 전화선**: 내용을 아예 모르는 TCP 연결도 그대로 이어 줄 수 있다.

다만 Kong은 기본적으로 **"상대가 한동안 말이 없으면 끊는"** 습관(타임아웃 60초)이 있다. 그래서 그 시간을 늘리거나, 양쪽이 주기적으로 "여보세요?"(ping)를 보내야 한다.

## 일반 설명

### 결론 요약

| 방식 | 방향 | 지원 | 설정 포인트 | 에디션 |
|---|---|---|---|---|
| **WebSocket (HTTP Upgrade)** | 양방향 | ✅ | `http/https` Route + Upgrade 자동 처리. Service URL은 `ws://` 또는 `wss://`(내부적으로 http/https) | **OSS** |
| **WebSocket 전용 프로토콜(`ws`/`wss`) + 프레임 단위 플러그인** | 양방향 | ✅ | Service/Route `protocol: ws|wss` → 메시지 크기 제한·스키마 검증 등 **메시지(프레임) 단위 처리** | **Enterprise** (3.0+) |
| **gRPC 스트리밍** (서버/클라이언트/양방향) | 양방향 | ✅ | `grpc/grpcs` Service. HTTP/2 스트림을 그대로 전달 | OSS |
| **gRPC-Web 스트리밍** | **서버 → 클라이언트만** | △ | 브라우저 gRPC-Web 프로토콜 자체가 클라이언트·양방향 스트리밍을 지원하지 않음 | OSS |
| **SSE / HTTP chunked 스트리밍** | 서버 → 클라이언트 | ✅ | `response_buffering: false` 또는 업스트림이 `X-Accel-Buffering: no` 헤더 전송 + `read_timeout` 상향 | OSS |
| **요청 바디 스트리밍** (대용량 업로드) | 클라이언트 → 서버 | ✅ | `request_buffering: false` | OSS |
| **TCP/TLS L4 스트림** | 양방향 | ✅ | `stream_listen` 활성화 + `tcp`/`tls`/`tls_passthrough` Route (`sources`/`destinations`/`snis`로 매칭) | OSS |
| **LLM 응답 스트리밍** (AI Gateway) | 서버 → 클라이언트 | ✅ | AI Proxy 플러그인의 스트리밍 모드 (SSE) | 플러그인별 상이 |

### 1. WebSocket

**OSS: 투명 프록시**
- 클라이언트가 `GET` + `Connection: Upgrade` + `Upgrade: websocket`으로 요청하면 Kong(NGINX)이 업스트림까지 핸드셰이크를 전달한다. `101 Switching Protocols` 이후에는 **TCP 연결을 양방향으로 그대로 중계**한다.
- Route는 `protocols: [http, https]`로 두면 된다. Service URL은 `ws://` 또는 `wss://`로 적을 수 있다.
- **플러그인 적용 범위**: 인증(key-auth, jwt), ACL, rate limiting 같은 **HTTP 단계 플러그인은 핸드셰이크 요청 한 번에만** 적용된다. 연결이 열린 뒤 오가는 메시지는 Kong이 들여다보지 않는다.
  - 예: rate limiting은 "연결 수" 기준이지 "메시지 수" 기준이 아니다.

**Enterprise: WebSocket을 1급 프로토콜로**
- Service/Route의 `protocol`을 `ws`/`wss`로 지정하면 Kong이 **WebSocket 프레임을 파싱**한다. 그래서 메시지 단위 플러그인을 쓸 수 있다.
  - **WebSocket Size Limit**: 클라이언트·업스트림 메시지 최대 크기. 기본값은 클라이언트 1 MiB, 업스트림 16 MiB이고 최대 32 MiB까지 설정할 수 있다. 제어 프레임에는 제한을 걸지 않는다.
  - **WebSocket Validator**: 메시지를 JSON Schema(draft4)로 검증한 뒤 통과시킨다.
  - 로깅 플러그인들(file-log, loggly, udp-log 등)은 3.1.0.0부터 WebSocket Service/Route를 지원한다.
  - **PDK `kong.websocket.client` / `kong.websocket.upstream`**: 커스텀 플러그인에서 프레임을 읽고, 바꾸고, 차단할 수 있다.

### 2. gRPC 스트리밍

- Kong은 gRPC를 HTTP/2 스트림으로 **그대로 통과**시킨다. 그래서 **unary, 서버 스트리밍, 클라이언트 스트리밍, 양방향 스트리밍** 모두 프록시된다.
  - 공식 문서에 "양방향 스트리밍 지원"이라고 명시된 페이지는 이번 검색에서 찾지 못했다. 위 내용은 HTTP/2 패스스루 구조와 서드파티 자료를 근거로 한 것이다.
- 제약은 **gRPC-Web 플러그인**에 있다. gRPC-Web 프로토콜 자체가 HTTP/1.1 의미론을 따르기 때문이다(요청 바디가 끝나야 응답 시작).
  - 브라우저에서는 **서버 스트리밍만** 된다.
  - 클라이언트 스트리밍과 양방향 스트리밍은 불가능하다. gRPC-Web 로드맵에서 아직 "계획" 상태다.
  - **브라우저에서 진짜 양방향이 필요하면 WebSocket**을 쓴다.
- **gRPC-Gateway 플러그인**(REST ↔ gRPC)에서 스트리밍 메서드를 어떻게 처리하는지는 공식 문서에서 확인하지 못했다. unary 위주로 쓰는 게 안전하다.

### 3. SSE / HTTP 스트리밍

- **기본값이 버퍼링**이다. Kong은 응답을 모아서 보낼 수 있다. 그러면 SSE 이벤트가 몰려서 한꺼번에 도착한다.
- 해결 방법은 둘 중 하나를 고른다.
  1. **Route에 `response_buffering: false`**: 해당 Route만 스트리밍한다. 업로드도 스트리밍하려면 `request_buffering: false`.
  2. **업스트림이 `X-Accel-Buffering: no` 헤더를 보낸다**: Kong 공식 가이드가 권장한다. NGINX 지시어로 버퍼링을 **전역으로 끄지 말라**고 한다.
- 참고: 클라이언트가 HTTP/2이면 Kong은 응답 버퍼링을 자동으로 끈다. 로그에 `response buffering was turned off: incompatible HTTP version (2)`가 찍힌다.

### 4. TCP/TLS 스트림 (L4)

- `kong.conf`의 **`stream_listen`** 을 켜야 한다(기본은 꺼짐).
- Route `protocols: [tcp]` / `[tls]` / `[tls_passthrough]`로 지정하고, `sources`, `destinations`, `snis`로 매칭한다.
- Kong이 **프로토콜 내용을 모르는 상태로** 양방향 바이트 스트림을 중계한다. DB 연결, MQTT, 자체 바이너리 프로토콜 등에 쓴다.
- **TLS 처리 방식**
  - **terminate**: Kong이 인증서로 TLS를 풀고 평문 TCP를 백엔드로 보낸다.
  - **passthrough**: SNI만 보고 암호화된 채로 넘긴다.
- Kubernetes에서는 `TCPIngress`, Gateway API의 `TCPRoute`/`TLSRoute`를 쓴다.
- 쓸 수 있는 플러그인이 HTTP보다 훨씬 적다(IP 제한, 로깅 등).

### 5. 장시간 연결의 공통 함정: 타임아웃

| 설정 | 위치 | 기본값 | 의미 |
|---|---|---|---|
| `read_timeout` | **Service** | 60,000 ms | 업스트림에서 **연속 두 번의 읽기 사이** 최대 대기 시간 → WebSocket/SSE가 60초 동안 조용하면 끊김 |
| `write_timeout` | Service | 60,000 ms | 업스트림으로 연속 두 번의 쓰기 사이 |
| `connect_timeout` | Service | 60,000 ms | 연결 수립 |

- **해결**: `read_timeout`을 늘린다. 또는 애플리케이션에서 **주기적으로 ping/pong이나 SSE 주석(`:keepalive`)을 보내** 유휴 상태를 만들지 않는다. 후자가 더 견고하다.
- Kong 앞에 **CDN/L7 로드밸런서**가 있으면 그쪽 유휴 타임아웃도 따로 맞춰야 한다. 안 맞추면 CDN이 499나 504를 낸다.
- **배포·재시작 시 연결이 끊긴다.** Kong 워커가 재로드되면 장시간 연결은 결국 끊긴다. 클라이언트에 **재연결 로직**(SSE의 `retry:`, WebSocket 지수 백오프)을 반드시 넣는다.

### 선택 가이드

| 상황 | 추천 |
|---|---|
| 브라우저 ↔ 서버 실시간 양방향 (채팅, 협업) | **WebSocket** (OSS로 충분, 메시지 검증이 필요하면 Enterprise `ws/wss`) |
| 서버 → 브라우저 단방향 푸시 (알림, LLM 토큰 출력) | **SSE** + 버퍼링 해제 + 타임아웃 조정 |
| 서비스 ↔ 서비스 양방향 스트림 | **gRPC 양방향 스트리밍** |
| HTTP가 아닌 프로토콜 | **TCP/TLS stream** |

## 참고

- [Kong — Proxying with Kong Gateway](https://developer.konghq.com/gateway/traffic-control/proxying/)
- [Kong 2.8 — Proxy Reference (WebSocket 섹션)](https://docs.konghq.com/gateway/2.8.x/reference/proxy)
- [Kong — WebSocket Size Limit](https://developer.konghq.com/plugins/websocket-size-limit/)
- [Kong — WebSocket Size Limit changelog](https://developer.konghq.com/plugins/websocket-size-limit/changelog/)
- [Kong — WebSocket Size Limit examples](https://developer.konghq.com/plugins/websocket-size-limit/examples/limit-client-and-upstream-messages/)
- [Kong — WebSocket Validator](https://developer.konghq.com/plugins/websocket-validator/)
- [Kong — WebSocket Validator changelog](https://developer.konghq.com/plugins/websocket-validator/changelog/)
- [Kong PDK — kong.websocket.upstream](https://developer.konghq.com/gateway/pdk/reference/kong.websocket.upstream/)
- [Kong — file-log changelog (WebSocket 지원 추가)](https://developer.konghq.com/plugins/file-log/changelog/)
- [Kong — loggly changelog](https://developer.konghq.com/plugins/loggly/changelog/)
- [Kong — Configuring Kong Gateway to support SSE](https://developer.konghq.com/support/how-can-i-use-kong-to-allow-sse-server-sent-events/)
- [Kong — Enabling streaming of text/event-stream responses](https://developer.konghq.com/support/how-can-i-enable-streaming-of-responses-with-text-event-stream-content-types-instead-of-having-the-responses-buffered-and-sent-in-one-large-payload/)
- [Kong — Response buffering in Kong](https://developer.konghq.com/support/what-is-response-buffering-in-kong-and-how-is-it-controlled/)
- [Kong — response buffering turned off: incompatible HTTP version (2)](https://developer.konghq.com/support/kong-gateway-notice-in-logs-response-buffering-was-turned-off-incompatible-http-version-2/)
- [Kong — HTTP 499 behind a CDN using SSE](https://developer.konghq.com/support/http-499-error-responses-when-kong-is-behind-a-cdn-and-using-sse/)
- [Kong — Tune for large payloads](https://developer.konghq.com/gateway/performance/large-payloads/)
- [Kong — Streaming with AI Gateway](https://developer.konghq.com/ai-gateway/streaming/)
- [Kong discuss — SSE 설정](https://discuss.konghq.com/t/how-to-setup-kong-gateway-with-sse-properly/11979)
- [Kong discuss — 60초 타임아웃](https://discuss.konghq.com/t/not-able-to-increase-the-kong-default-timeout-from-60seconds/13885)
- [Kong — gRPC-Web plugin](https://developer.konghq.com/plugins/grpc-web/)
- [grpc-web — streaming roadmap](https://github.com/grpc/grpc-web/blob/master/doc/streaming-roadmap.md)
- [Kreya — gRPC-Web under the hood](https://kreya.app/blog/grpc-web-deep-dive/)
- [Red Hat — gRPC Anywhere](https://www.redhat.com/ko/blog/grpc-anywhere)
- [Kong — Traffic control and routing](https://developer.konghq.com/gateway/traffic-control-and-routing/)
- [KIC — Proxy TCP traffic over TLS by SNI](https://developer.konghq.com/kubernetes-ingress-controller/routing/tcp-by-sni/)
- [KIC 3.4 — TCP services](https://docs.konghq.com/kubernetes-ingress-controller/3.4.x/guides/services/tcp)
- [Kong Operator — TLSRoute](https://developer.konghq.com/operator/get-started/gateway-api/create-tlsroute/)
- [OneUptime — Kong Ingress gRPC & WebSocket](https://oneuptime.com/blog/post/2026-02-09-kong-grpc-websocket-support/view)
