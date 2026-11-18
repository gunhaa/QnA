# Slack Socket Mode는 왜 외부 포트 없이 되나? (Socket Mode vs HTTP 연결 방식)

> 기준일: 2026-10-15

## 쉬운 설명

전화로 비유하면 된다.
- **HTTP 방식**: Slack이 우리 집으로 **전화를 거는** 방식이다. 우리 집에 걸려오는 전화를 받을 번호(공개 포트)가 있어야 한다.
- **Socket Mode**: **우리가 Slack에 먼저 전화를 걸고 끊지 않는** 방식이다. 거는 전화는 누구나 할 수 있으니 받는 번호가 없어도 된다. 통화가 이어져 있는 동안 Slack은 그 회선으로 할 말을 전한다.

둘 다 "통화"라는 점은 같지만, **누가 먼저 거느냐**가 다르다. 방화벽은 바로 이 "누가 먼저 걸었나"를 보고 막을지 정한다.

---

## 일반 설명

### 1. 핵심: 연결을 누가 시작하나

TCP 연결은 한번 맺어지면 **양방향**이다. 방화벽과 NAT가 보는 것은 데이터 방향이 아니라 **SYN 패킷을 처음 보낸 쪽(연결 개시자)**이다.

| | HTTP (Request URL) | Socket Mode |
|---|---|---|
| 연결 개시 | **Slack → 우리 서버** (인바운드) | **우리 서버 → Slack** (아웃바운드) |
| 필요한 것 | 공개 DNS/IP, 443 포트 개방, 유효한 TLS 인증서 | `wss-primary.slack.com:443`로 나가는 길만 있으면 됨 |
| 방화벽 규칙 | inbound allow 필요 | 보통 기본 허용(outbound allow) |
| 이벤트 전달 | 이벤트마다 Slack이 새 HTTPS POST 요청 | 이미 열린 WebSocket으로 push |

```
HTTP 방식
  Slack ──(새 연결: SYN)──▶ [방화벽: 인바운드 차단 ✗] ──▶ 우리 서버

Socket Mode
  우리 서버 ──(새 연결: SYN)──▶ [방화벽: 아웃바운드 허용 ✓] ──▶ Slack
  우리 서버 ◀══════ 같은 연결로 이벤트 수신 ══════ Slack
```

### 2. 응답이 들어올 수 있는 이유: stateful 방화벽 / NAT

방화벽과 NAT는 **연결 추적(conntrack)** 테이블을 갖고 있다.
1. 우리 서버가 Slack으로 연결을 연다 → 방화벽이 `(내부IP:포트 ↔ Slack IP:443)` 항목을 기록한다.
2. Slack에서 오는 패킷이 이 항목과 일치하면 **"이미 성립된 연결(ESTABLISHED)의 응답"**으로 보고 통과시킨다.
3. 처음 보는 연결 요청(새 SYN)이 밖에서 들어오면 일치하는 항목이 없으니 차단한다.

일반 웹 브라우징도 같은 원리로 동작한다. 사내 PC도 외부 포트 없이 웹페이지를 "받아오고", 채팅 앱도 메시지를 실시간으로 "받는다".

### 3. Socket Mode 동작 순서

1. App-level token(`xapp-`)으로 `apps.connections.open` 호출 → 일회성 WSS URL 발급
2. 그 URL로 WebSocket 연결 (아웃바운드)
3. Slack이 이벤트/인터랙션을 envelope으로 push
4. 앱이 `envelope_id`로 ack (3초 규칙은 동일)
5. 연결은 주기적으로 갱신되므로 재연결 로직 필요 (Bolt/SDK가 처리)

### 4. "같은 거 아님?"에 대한 답

데이터가 양방향으로 오가는 것은 같다. 다른 점은 다음과 같다.
- **방화벽 정책**: 인바운드 신규 연결은 막고 아웃바운드는 열어두는 것이 기업망 기본값이다.
- **공격 표면**: 인바운드 포트를 열면 인터넷 누구나 그 포트로 접속을 시도할 수 있다. 아웃바운드는 우리가 정한 목적지(Slack)와만 연결된다.
- **인프라 요구**: HTTP 방식은 공개 도메인, TLS 인증서, 로드밸런서/리버스 프록시, 서명 검증이 필요하다. Socket Mode는 이것들이 없어도 된다.

### 5. 앞의 선택지 판단 기준

| 상황 | 선택 |
|---|---|
| 외부 → 운영 서버 HTTPS 인바운드를 **열 수 있음** | **HTTP**. Slack과 GitHub 웹훅이 같은 인그레스를 써서 구조가 통일된다. 수평 확장(LB 뒤 여러 인스턴스)과 서버리스에도 유리하다. |
| 인바운드를 **열 수 없음** (아웃바운드만 가능) | **Socket Mode 유지**. 단, Socket Mode는 **Slack 전용** 기능이다. |

> ⚠️ 함정: GitHub 웹훅에는 Socket Mode 같은 "앱이 먼저 연결하는" 공식 방식이 없다. GitHub가 우리 서버로 POST를 보내는 순수 인바운드 방식이다. 그래서 인바운드를 못 열면 GitHub 쪽은 **폴링**(REST API 주기 조회)으로 바꾸거나 smee.io, cloudflared tunnel처럼 **아웃바운드 터널로 인바운드를 흉내 내는 중계**를 써야 한다. 선택지 2번이 "sync 문서도 함께 고친다"고 한 이유가 이것이다.

참고로 `cloudflared`/ngrok 같은 터널도 같은 원리다. 터널 에이전트가 **밖으로 연결을 먼저 열어두고**, 외부 요청을 그 연결로 넘겨받는다. 그래서 "인바운드 금지" 환경에서도 공개 URL을 만들 수 있다. 다만 사내 보안 정책상 터널 사용 자체가 금지된 경우가 많으니 먼저 확인해야 한다.

### 6. Socket Mode의 제약

- Slack Marketplace 공개 배포 앱에서는 사용할 수 없다 (사내/비공개 앱용).
- 연결이 장시간 유지되는 프로세스가 필요하다 → 서버리스(Lambda 등)에는 맞지 않는다.
- 인스턴스를 여러 개 띄우면 각각 연결을 맺고, 이벤트는 연결 중 하나로만 분배된다. 연결 수 제한(앱당 최대 10개)도 있다.

---

Sources:
- [Using Socket Mode (Slack Docs)](https://docs.slack.dev/apis/events-api/using-socket-mode/)
- [Socket Mode (api.slack.com)](https://api.slack.com/socket-mode)
- [Slack transports: Socket Mode vs HTTP (OpenClaw docs)](https://docs.openclaw.ai/channels/slack/transports)
