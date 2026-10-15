# 사내망에서 Slack 이벤트를 받는 방법

> 기준일: 2026-10-15 · 관련 문서: [Socket Mode vs HTTP](./slack-socket-mode-vs-http-inbound.md), [Slack API 개요](./slack-api-overview.md)

## 쉬운 설명

Slack이 보내는 편지를 사내 깊숙한 방에서 받아야 하는 상황이다. 방법은 크게 네 가지다.
1. **내가 직접 우체국에 전화를 걸어 놓고 기다린다** (Socket Mode)
2. **건물 입구 경비실에서 받아 안으로 전달한다** (DMZ 리버스 프록시)
3. **바깥 사서함에 쌓아두고 내가 가서 가져온다** (클라우드 릴레이 + 큐)
4. **비밀 통로를 판다** (터널)

---

## 일반 설명

### 0. 먼저 확인할 것

| 질문 | 왜 중요한가 |
|---|---|
| 사내 서버에서 **아웃바운드** `*.slack.com:443`이 나가나? 직접 나가나, 프록시를 거치나? | Socket Mode가 가능한지 |
| 외부에서 들어오는 **인바운드** HTTPS를 DMZ/인그레스에 열 수 있나? | HTTP Request URL 방식이 가능한지 |
| 클라우드 계정(AWS/GCP/Azure)을 쓸 수 있나? | 릴레이 방식이 가능한지 |
| 앱을 사내 전용으로 쓰나, Marketplace에 공개 배포하나? | 공개 배포 앱은 Socket Mode를 쓸 수 없음 |

### 1. 방법 비교

| # | 방법 | 필요 네트워크 | 장점 | 단점 | 추천 상황 |
|---|---|---|---|---|---|
| 1 | **Socket Mode** | 아웃바운드 WSS만 | 공개 URL·인증서·인바운드 포트가 필요 없음. 설정이 가장 간단 | 상시 실행 프로세스 필요. 연결 수 제한. 공개 배포 앱 불가. Slack 전용 | **사내 봇의 1순위** |
| 2 | **DMZ 리버스 프록시 / API Gateway** | DMZ 인바운드 443 + DMZ→내부 | 표준 웹훅 구조. LB 뒤로 수평 확장 가능. GitHub 등 다른 웹훅과 경로 공유 | 보안 심의, 공인 도메인/TLS 필요. 3초 응답 경로가 길어짐 | 인바운드 정책이 이미 있는 회사, 여러 SaaS 웹훅 통합 |
| 3 | **클라우드 릴레이 + 큐** (API Gateway/Lambda → SQS/PubSub → 사내 consumer) | 사내는 아웃바운드만 (큐 polling) | 사내 인바운드 0. 큐가 버퍼 역할을 해서 사내 장애 시에도 유실 없음. 3초 ack를 클라우드가 처리 | 클라우드 비용·운영 대상 증가. 동기 응답(모달 에러 표시 등)이 어려움 | 인바운드는 금지됐지만 클라우드는 허용, 이벤트 유실이 치명적일 때 |
| 4 | **터널** (cloudflared, ngrok, Tailscale Funnel) | 아웃바운드만 | 공개 URL을 바로 확보. HTTP 방식 코드를 그대로 사용 | 외부 SaaS에 트래픽을 의존. **사내 보안 정책상 금지인 경우가 많음** | 로컬 개발, PoC |
| — | (대안) **폴링** `conversations.history` | 아웃바운드만 | 이벤트 구독이 아예 필요 없음 | 실시간이 아니고 rate limit이 엄격함. 멘션·버튼 같은 인터랙션 불가 | 수집 전용 배치(요약, RAG 적재) |

### 2. 방법별 구성

#### ① Socket Mode

```
[사내 봇] ──outbound WSS──▶ (사내 프록시) ──▶ wss-primary.slack.com
          ◀──── 이벤트 push / envelope ack ────
```

- 준비물: App-level token(`xapp-`, scope `connections:write`), 앱 설정에서 Socket Mode 켜기
- **사내 프록시를 거쳐야 하는 경우**: Bolt/SDK가 프록시 옵션을 지원한다.
  - Python 내장 어댑터: `SocketModeHandler(app, token, proxy="http://proxy:8080", proxy_headers=...)`
  - `websocket-client` 어댑터: `http_proxy_host`, `http_proxy_port`, `http_proxy_auth`
  - Java: `SlackConfig`의 proxy 설정 / JS: `SocketModeReceiver`의 `dispatcher` 옵션 (Bolt JS v5)
- 프록시가 **WebSocket(Upgrade)이나 CONNECT를 막거나**, **TLS를 가로채 복호화(SSL inspection)**하면 연결이 실패한다. 이때는 보안팀에 `*.slack.com` 예외를 요청한다.
- 운영 팁: 인스턴스를 2개 이상 띄워 이중화한다 (이벤트는 열린 연결 중 하나로 전달됨). 재연결은 SDK가 처리한다.

#### ② DMZ 리버스 프록시 / API Gateway

```
Slack ──HTTPS──▶ [DMZ: WAF/Nginx/API GW] ──▶ [내부망 봇 서버]
```

- DMZ에 공인 도메인과 TLS 인증서를 두고, 특정 경로(`/slack/events`)만 내부로 프록시한다.
- **IP allowlist에 기대지 말고 서명 검증을 쓴다**: Slack은 이벤트를 보내는 IP를 고정 목록으로 보장하지 않으므로, `X-Slack-Signature`(HMAC-SHA256)와 `X-Slack-Request-Timestamp`(5분 이내)로 검증하는 것이 공식 방식이다.
  - 참고로 앱 설정의 "Restrict API Token Usage"(IP 최대 20개)는 **우리 → Slack** Web API 호출을 제한하는 기능이다. 인바운드 이벤트와는 반대 방향이다.
- 3초 ack: DMZ에서 내부까지 홉이 늘어나므로 봇은 **즉시 200을 돌려주고 비동기로 처리**한다.

#### ③ 클라우드 릴레이 + 큐

```
Slack ──HTTPS──▶ API Gateway → Lambda(서명 검증 + 즉시 200) → SQS
                                                              ▲
                                    [사내 consumer] ──outbound polling──┘
```

- 사내망은 SQS/PubSub로 나가는 아웃바운드만 필요하다.
- 큐가 사내 장애 동안 이벤트를 보관한다 (Slack 재시도는 최대 3회뿐이라 유실 방지에 유리).
- 한계: `view_submission`에서 검증 오류를 모달에 즉시 띄우는 것(`response_action: errors`)처럼 **동기 응답이 필요한 인터랙션**은 Lambda에서 처리하거나 포기해야 한다.
- 중복 처리: Slack 재시도와 큐의 at-least-once 특성 때문에 `event_id`로 멱등성을 처리한다.

#### ④ 터널

- `cloudflared tunnel`, `ngrok http 3000`, Tailscale Funnel: 에이전트가 아웃바운드로 연결을 열어두고 공개 URL을 받는다.
- 개발자별 Slack 앱과 개인 터널 조합으로 **로컬 개발용**으로 쓰는 경우가 가장 흔하다.
- 운영에 쓰려면 Cloudflare Zero Trust처럼 회사 계정으로 관리되는 터널이어야 하고, 보안 승인을 받아야 한다.

### 3. 의사결정 흐름

```
아웃바운드 *.slack.com:443 가능?
├─ 예 → 공개 배포 앱 아님? → 예 → ① Socket Mode
│                          └ 아니오 → ② 또는 ③
└─ 아니오(완전 폐쇄망)
    ├─ DMZ 인바운드 가능 → ② (DMZ가 Slack과 직접 통신)
    ├─ 클라우드 허용 → ③ (사내는 클라우드 큐로만 아웃바운드)
    └─ 둘 다 불가 → Slack 연동 자체가 불가능. 망연계 솔루션 검토
```

> Web API 호출(`chat.postMessage` 등)은 어느 방법이든 **아웃바운드 `slack.com:443`**이 필요하다. 이벤트 수신만 해결해도 응답 메시지를 못 보내면 소용없으니 둘 다 확인한다. ③에서는 응답도 Lambda가 대신 보내게 할 수 있다.

### 4. 공통 체크리스트

- [ ] 3초 이내 ack (Bolt는 `ack()` 먼저, 처리는 이후)
- [ ] `event_id` 기반 중복 제거 (재시도 헤더 `X-Slack-Retry-Num`)
- [ ] HTTP 방식은 서명 검증 필수, signing secret은 Vault/Secrets Manager에 보관
- [ ] 토큰 IP 제한(Restrict API Token Usage)에 사내 egress IP 등록 (선택, 보안 강화)
- [ ] 이중화와 헬스체크 (Socket Mode는 연결 상태 모니터링)

---

Sources:
- [Using Socket Mode (Slack Docs)](https://docs.slack.dev/apis/events-api/using-socket-mode/)
- [Slack security concepts (토큰 IP 제한)](https://docs.slack.dev/concepts/security.md)
- [Bolt Python Socket Mode 어댑터 (proxy 옵션)](https://docs.slack.dev/tools/bolt-python/reference/adapter/socket_mode/builtin/index.html)
- [websocket-client 어댑터 proxy 옵션](https://docs.slack.dev/tools/bolt-python/reference/adapter/socket_mode/websocket_client/index.html)
- [Slack transports: Socket Mode vs HTTP (OpenClaw docs)](https://docs.openclaw.ai/channels/slack/transports)
