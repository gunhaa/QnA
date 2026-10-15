# Slack API 한눈에 보기 (주요 기능·자주 쓰는 메서드)

> 기준일: 2026-10-15 · 공식 문서: <https://docs.slack.dev>

## 쉬운 설명

Slack은 큰 회사 건물이고, API는 그 건물에 드나드는 **출입문 여러 개**다.
- **Web API** = 안내 데스크에 "이 방에 쪽지 붙여줘" 하고 부탁하는 문
- **Events API** = 건물에서 무슨 일이 생기면 나한테 전화 걸어주는 문
- **Webhook** = 우편함 하나에 쪽지만 넣을 수 있는 가장 간단한 문

---

## 일반 설명

### 1. API 종류 한눈에

| API | 방향 | 용도 | 언제 쓰나 |
|---|---|---|---|
| **Web API** | 앱 → Slack (HTTP RPC) | 메시지 전송, 채널/사용자 조회 등 280+ 메서드 | 거의 모든 작업의 기본 |
| **Events API** | Slack → 앱 (HTTP POST 또는 WebSocket) | 메시지 작성·멘션·채널 참여 등 이벤트 수신 | 봇이 "반응"해야 할 때 |
| **Socket Mode** | WebSocket (앱이 연결 개시) | Events/인터랙션을 공개 URL 없이 수신 | 사내망·방화벽 뒤, 로컬 개발 |
| **Interactivity** | Slack → 앱 | 버튼 클릭, 모달 제출, 슬래시 커맨드, 단축키 | UI 상호작용 |
| **Incoming Webhooks** | 앱 → 특정 채널 1곳 | 고정 URL로 메시지 POST | 알림 전용 (CI, 모니터링) |
| **Block Kit** | UI 프레임워크 | 메시지/모달/App Home 레이아웃(JSON) | 풍부한 메시지 UI |
| **SCIM / Audit Logs / Admin API** | 관리용 | 사용자 프로비저닝, 감사 로그, 워크스페이스 관리 | Enterprise Grid 관리자 |
| **Real-time Search API / MCP 서버** | 앱 → Slack 검색 | 사용자 권한 범위 내 메시지·파일 실시간 검색 (2026-02 GA) | AI 에이전트에 Slack 컨텍스트 제공 |

> RTM(Real Time Messaging) API는 레거시. 신규 앱은 **Events API + Socket Mode**를 쓴다.

### 2. 인증·토큰

| 토큰 | 접두사 | 의미 |
|---|---|---|
| Bot token | `xoxb-` | 봇 자신으로 동작. **가장 많이 씀** |
| User token | `xoxp-` | 설치한 사용자 대신 동작 (검색, 사용자 권한 작업) |
| App-level token | `xapp-` | Socket Mode 연결 등 앱 전역 작업 |

- 설치: **OAuth 2.0 v2** (`oauth.v2.access`) → 필요한 **scope** 지정 (예: `chat:write`, `channels:history`, `users:read`)
- 호출: `Authorization: Bearer xoxb-...` 헤더 + `https://slack.com/api/{method}`
- 응답은 항상 HTTP 200 + `{"ok": true|false, "error": "..."}` → **`ok` 필드로 성공 판단**

### 3. 자주 쓰는 Web API 메서드

#### 메시지 (`chat.*`)

| 메서드 | 기능 | scope |
|---|---|---|
| `chat.postMessage` | 채널/DM에 메시지 전송 (`thread_ts`로 스레드 답글) | `chat:write` |
| `chat.postEphemeral` | 특정 사용자에게만 보이는 임시 메시지 | `chat:write` |
| `chat.update` | 보낸 메시지 수정 | `chat:write` |
| `chat.delete` | 메시지 삭제 | `chat:write` |
| `chat.scheduleMessage` | 예약 전송 (최대 120일 후) | `chat:write` |
| `chat.getPermalink` | 메시지 고정 링크 조회 | — |
| `chat.startStream` / `appendStream` / `stopStream` | 텍스트 스트리밍 (LLM 응답 점진 출력) | `chat:write` |

#### 채널·대화 (`conversations.*`)

| 메서드 | 기능 |
|---|---|
| `conversations.list` | 채널 목록 (public/private/DM/MPIM 타입 필터) |
| `conversations.history` | 채널 메시지 이력 |
| `conversations.replies` | 스레드 답글 조회 |
| `conversations.info` | 채널 정보 |
| `conversations.create` / `archive` / `rename` | 채널 생성·보관·이름 변경 |
| `conversations.invite` / `kick` / `join` / `leave` | 멤버 관리 |
| `conversations.members` | 채널 멤버 목록 |
| `conversations.open` | DM/그룹 DM 열기 (DM 보내기 전 채널 ID 획득) |

#### 사용자 (`users.*`)

| 메서드 | 기능 |
|---|---|
| `users.list` | 워크스페이스 사용자 목록 |
| `users.info` | 사용자 상세 |
| `users.lookupByEmail` | 이메일로 사용자 ID 찾기 (**연동 시 매우 자주 씀**) |
| `users.profile.get` / `set` | 프로필·상태 메시지 조회/설정 |
| `users.getPresence` | 온라인 여부 |

#### 파일 (`files.*`)

| 메서드 | 기능 |
|---|---|
| `files.getUploadURLExternal` | ① 업로드 URL 발급 |
| `files.completeUploadExternal` | ② 업로드 완료 처리 + 채널 공유 |
| `files.list` / `files.info` / `files.delete` | 조회·삭제 |

> ⚠️ `files.upload`는 **2025-11-12 종료**. SDK의 `filesUploadV2`(Node)·`files_upload_v2`(Python)가 위 2단계를 감싸준다.

#### UI·기타

| 메서드 | 기능 |
|---|---|
| `views.open` / `update` / `push` | 모달 열기·갱신·스택 쌓기 (`trigger_id` 필요, 3초 내) |
| `views.publish` | App Home 탭 화면 게시 |
| `reactions.add` / `remove` / `get` | 이모지 리액션 |
| `pins.add` / `remove` | 메시지 고정 |
| `bookmarks.add` / `list` | 채널 북마크 |
| `search.messages` / `search.files` | 검색 (**user token 필요**) |
| `assistant.search.context` | Real-time Search API 검색 |
| `assistant.threads.setStatus` / `setSuggestedPrompts` | AI 어시스턴트 스레드 상태·추천 프롬프트 |
| `auth.test` | 토큰 유효성·봇 ID 확인 |
| `team.info` | 워크스페이스 정보 |

### 4. 자주 쓰는 Events

| 이벤트 | 발생 시점 |
|---|---|
| `message.channels` / `.groups` / `.im` / `.mpim` | 각 대화 유형에 메시지 작성 |
| `app_mention` | 봇이 `@멘션`됨 (**봇 기본 트리거**) |
| `reaction_added` / `reaction_removed` | 리액션 추가/제거 |
| `member_joined_channel` | 채널 참여 |
| `channel_created` / `channel_rename` | 채널 생성·이름 변경 |
| `team_join` | 신규 멤버 가입 (온보딩 봇) |
| `app_home_opened` | 사용자가 App Home 열람 |
| `file_shared` | 파일 공유 |
| `assistant_thread_started` | AI 어시스턴트 스레드 시작 |

- Events API(HTTP) 방식은 **3초 내 HTTP 200 응답** 필요 → 무거운 작업은 큐로 넘기고 즉시 ack.
- 최초 등록 시 `url_verification` challenge 응답 필요. 요청 검증은 `X-Slack-Signature`(HMAC-SHA256, signing secret) 확인.

### 5. Interactivity

| 기능 | 수신 payload type |
|---|---|
| 슬래시 커맨드 (`/deploy`) | form-urlencoded (command) |
| 버튼·셀렉트 클릭 | `block_actions` |
| 모달 제출 / 닫기 | `view_submission` / `view_closed` |
| 전역·메시지 단축키 | `shortcut` / `message_action` |

모든 인터랙션도 **3초 내 ack** 규칙 동일. 이후 응답은 `response_url`(30분 내 5회)이나 Web API로 보낸다.

### 6. Rate Limit

| Tier | 대략 허용량 (분당) | 예시 |
|---|---|---|
| Tier 1 | 1+ | 드문 관리 메서드 |
| Tier 2 | 20+ | `conversations.create`, `users.list` |
| Tier 3 | 50+ | `conversations.history`, `conversations.info` |
| Tier 4 | 100+ | `users.info`, `chat.getPermalink` |
| Special | 메서드별 | `chat.postMessage`: **채널당 초당 약 1건** (짧은 버스트 허용) |

- 초과 시 HTTP `429` + `Retry-After` 헤더 → 그만큼 대기 후 재시도.
- **2025~2026 변경**: Marketplace 미등록 상태로 외부 배포되는(unlisted) 앱은 `conversations.history`/`replies`가 **분당 1회, 요청당 15건**으로 축소 (신규 설치 즉시, 기존 설치는 2026-03-03부터). **사내 전용 앱(internal)은 영향 없음.**
- 목록 메서드는 cursor 페이지네이션: `limit` + `response_metadata.next_cursor`.

### 7. 공식 SDK / 프레임워크

| 언어 | Web API 클라이언트 | 앱 프레임워크 |
|---|---|---|
| JavaScript/TS | `@slack/web-api` | **Bolt for JS** (v5: Node 20+, Fetch 기반) |
| Python | `slack_sdk` | **Bolt for Python** |
| Java/Kotlin | `com.slack.api:slack-api-client` | **Bolt for Java** |

Bolt는 서명 검증, 3초 ack, Socket Mode/HTTP 전환, OAuth 설치 흐름을 처리해준다. 최근 버전에 `sayStream`(스트리밍)·`setStatus`(로딩 상태) 같은 AI 앱용 헬퍼가 추가됐다.

### 8. 빠른 예시

```bash
# 메시지 전송
curl -X POST https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer xoxb-..." \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"channel":"C0123456","text":"배포 완료 :rocket:"}'

# Incoming Webhook (가장 간단한 알림)
curl -X POST -H 'Content-Type: application/json' \
  -d '{"text":"빌드 실패!"}' https://hooks.slack.com/services/T000/B000/XXXX
```

```python
# Bolt for Python + Socket Mode: 멘션되면 스레드로 답장
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler

app = App(token="xoxb-...")

@app.event("app_mention")
def on_mention(event, say):
    say(text="불렀어요?", thread_ts=event["ts"])

SocketModeHandler(app, "xapp-...").start()
```

### 9. 용도별 선택 가이드

| 하고 싶은 것 | 추천 조합 |
|---|---|
| 단순 알림 (CI/모니터링) | Incoming Webhook |
| 여러 채널 알림·스레드 답글 | `chat.postMessage` + bot token |
| 대화형 봇 | Bolt + Events API(`app_mention`, `message.im`) |
| 사내망 봇·로컬 개발 | Socket Mode |
| 승인 폼·입력 UI | Block Kit + `views.open` + `view_submission` |
| 채널 대화 수집(요약/RAG) | `conversations.history` + `replies` (외부 배포 시 Rate Limit 주의) |
| AI 에이전트에 Slack 검색 연결 | Real-time Search API / Slack MCP 서버 |

---

Sources:
- [Slack Developer Docs](https://docs.slack.dev)
- [conversations.history/replies rate limit 변경 (changelog)](https://api.slack.com/changelog/2026-02-real-time-search-api)
- [files.upload 종료 및 대체 메서드](https://docs.slack.dev/changelog/2024-04-a-better-way-to-upload-files-is-here-to-stay)
- [Real-time Search API](https://docs.slack.dev/apis/web-api/real-time-search-api)
- [RTS API·MCP 서버 GA 발표](https://slack.com/intl/en-in/blog/news/mcp-real-time-search-api-now-available)
- [텍스트 스트리밍 API 가이드](https://dev.classmethod.jp/articles/slack-text-streaming-api-guide/)
- [Bolt 릴리스 정보](https://www.gitclear.com/open_repos/slackapi/bolt/release/@slack~bolt@4.7.0)
- [Socket Mode 소개](https://slack.com/intl/es-us/blog/developers/socket-to-me)
