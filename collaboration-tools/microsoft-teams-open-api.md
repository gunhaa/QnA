# Microsoft Teams 오픈 API

## 쉬운 설명

Teams는 큰 건물이고, 외부 개발자에게 문을 여러 개 열어 둔다.
- **정문(Microsoft Graph)**: 건물 안 방(팀·채널·채팅)을 만들고 둘러보는 공식 출입구.
- **우체통(Workflows 웹훅)**: 편지를 넣으면 채널에 글이 올라간다.
- **안내 로봇(봇/Teams SDK)**: 사람과 대화하고 심부름하는 직원.

## 일반 설명

### 1. 결론

공개 API가 있다. 용도별로 **4갈래**다.

| 갈래 | 용도 | 방향 |
|---|---|---|
| **Microsoft Graph API** (REST) | 팀/채널/채팅/메시지/멤버/앱/온라인 회의 CRUD, 프로비저닝 | 앱 → Teams |
| **Change notifications** (Graph 구독) | 메시지·멤버 변경 이벤트 수신 (webhook/Event Hubs/Event Grid) | Teams → 앱 |
| **Workflows 웹훅** (Power Automate) | 외부 시스템 알림을 채널/채팅에 게시 | 앱 → Teams |
| **봇 / Teams SDK / 메시지 확장 / 탭** | 대화형 앱, Teams UI 내 확장 | 양방향 |

### 2. Microsoft Graph API

- 엔드포인트: `https://graph.microsoft.com/v1.0/` (신규 기능은 `/beta`). 인증은 Microsoft Entra ID(OAuth 2.0).
- 주요 리소스: `team`, `channel`, `chat`, `chatMessage`, `teamsApp`, `onlineMeeting`.
- 권한 유형
  - **Delegated**: 로그인한 사용자 권한으로 호출.
  - **Application**: 앱 자체 권한(데몬/백엔드). 테넌트 관리자 동의 필요.
  - **RSC(Resource-Specific Consent)**: 팀/채팅 단위로 소유자가 앱에 좁은 범위 권한 부여. 테넌트 전체 권한보다 최소 권한 원칙에 맞다.
- 메시지 읽기는 민감 API로 분류되어, `ChannelMessage.Read.All` 같은 권한은 관리자 동의 또는 RSC가 필요하다. 전체 메시지 내보내기용 API(`getAllMessages` 등)는 별도 정책·과금(metered)이 붙는 **보호된 API**다 (세부 조건은 공식 문서 확인).
- **스로틀링**: 한도 초과 시 `HTTP 429` + `Retry-After` 헤더. 지수 백오프+지터로 재시도한다. 검색된 자료 기준 채널/채팅 메시지 게시는 대략 초당 1건 수준으로 보수적이며 올릴 수 없다고 한다.
- 응답이 많으면 `@odata.nextLink` 페이징, 변경분 추적은 `delta` 쿼리.

### 3. Change notifications

- `POST /subscriptions`로 구독 생성 → 메시지 생성/수정/삭제 시 앱의 HTTPS 엔드포인트로 푸시.
- 구독은 **만료**가 있어 갱신(renew)해야 한다. 폴링보다 효율적.
- 리치 알림(암호화된 리소스 데이터 포함)은 인증서 등록이 필요하다.

### 4. 웹훅: Office 365 Connector 종료 → Workflows

- 기존 **Incoming Webhook(Office 365 Connector)** 은 폐기되었다. 검색 자료 기준 **2026년 5월 18~22일 사이 비활성화**.
- 대체재는 Teams의 **Workflows 앱(Power Automate 기반)** 웹훅 URL이다.
  - MessageCard 페이로드 지원(단, 버튼 렌더링 미지원), 비공개 채널 지원.
  - 한계: 봇 아이콘/이름 커스터마이징 불가, MessageCard의 상호작용 버튼 없음.
  - 신규 연동은 **Adaptive Card** 페이로드를 권장한다.
- 단순 알림은 Workflows 웹훅, 양방향/상호작용이 필요하면 봇이 맞다.

### 5. 봇·SDK 선택 (변동 큼)

- **Bot Framework SDK**: 2025-12-31 이후 지원 티켓 종료(기존 봇은 동작하나 신규 기능 없음).
- **TeamsFx**: 폐기 모드, 커뮤니티 지원만 2026-09까지.
- 신규 개발 권장
  - **Teams SDK (구 Teams AI v2)**: Teams 전용 앱/봇/탭/메시지 확장/다이얼로그.
  - **Microsoft 365 Agents SDK**: Copilot, Teams, 웹 등 멀티 채널 에이전트.
- 봇 메시지는 Adaptive Card로 UI를 구성한다.

### 6. 선택 가이드

| 하고 싶은 일 | 선택 |
|---|---|
| 모니터링/CI 알림을 채널에 게시 | Workflows 웹훅 |
| 팀·채널 자동 생성(온보딩) | Graph API (application 권한) |
| 채널 메시지 실시간 수집 | Graph change notifications (+RSC) |
| 대화형 챗봇/명령 처리 | Teams SDK 또는 Agents SDK |
| 사용자 대신 메시지 전송 | Graph delegated 권한 |

### 7. 주의

- 서비스·SDK 상태가 빠르게 바뀐다. 구현 전 공식 문서(learn.microsoft.com)의 최신 상태를 확인할 것.
- 위 Graph 속도 제한 수치는 2차 자료 기반이므로 공식 문서와 대조가 필요하다.

### 출처

- [Teams 플랫폼 개요 (Microsoft Learn)](https://learn.microsoft.com/en-us/microsoftteams/platform/overview-explore)
- [MC1181996 - Office 365 커넥터 폐기, 웹훅 URL 지원](https://mc.merill.net/message/MC1181996)
- [Replacing Retired Office 365 Connectors with Teams Workflows](https://office365itpros.com/2026/09/18/teams-workflows-updates/)
- [channel getAllMessages (Microsoft Graph)](https://learn.microsoft.com/it-it/graph/api/channel-getallmessages)
- [Teams Graph API 정리](https://microsoft.github.io/entrabot/platform-docs/teams-graph-api/)
- [Teams SDK Guidance - Fall 2025](https://www.andrewconnell.com/articles/microsoft-teams-sdk-evolution-2025/)
- [Microsoft 365 Agents SDK 개요](https://learn.microsoft.com/zh-cn/microsoft-365/agents-sdk/agents-sdk-overview?tabs=csharp)
