# Teams 회의록 요약·분석: 녹음/트랜스크립트 내보내기와 추천 구성

## 쉬운 설명

회의가 끝나면 Teams가 "받아쓴 노트(트랜스크립트)"를 서랍에 넣어 둔다.
우리는 **"노트 나왔어요!" 벨(change notification)** 이 울리면 Graph라는 열쇠로 서랍을 열어 노트를 꺼내고, 요약 잘하는 친구(LLM)에게 읽혀서 요약을 받으면 된다.
녹음 파일(영상)까지 꺼낼 필요는 거의 없다. 노트가 이미 글자로 되어 있기 때문이다.

## 일반 설명

### 1. 핵심 결론

- 녹음 파일을 직접 STT하기보다 **Teams가 만든 트랜스크립트를 Graph API로 가져와 LLM으로 요약**하는 구성을 권장한다 (STT 비용·품질·화자 분리를 Teams가 이미 처리).
- 필요한 것: Graph **application 권한** + **change notification 구독** + LLM.
- Microsoft 365 Copilot 라이선스가 있다면 **Meeting AI Insights API**로 요약/액션 아이템을 바로 받을 수도 있다 (단, beta).

### 2. 내보내는 방법 (Graph API)

| 대상 | 방법 | 비고 |
|---|---|---|
| 트랜스크립트 목록/메타 | `GET /users/{organizerId}/onlineMeetings/{meetingId}/transcripts` | `callTranscript` 리소스 |
| 트랜스크립트 본문 | `.../transcripts/{id}/content` (기본 VTT) | 화자·타임스탬프 포함. `metadataContent`로 구조화 메타 취득 가능 |
| 녹음 목록/파일 | `.../recordings`, `.../recordings/{id}/content` | mp4. 원본은 OneDrive/SharePoint에 저장 |
| 테넌트 전체 조회 | `getAllTranscripts`, `getAllRecordings` (기간·조직자 지정) | 대량 백필/수집용 |
| AI 요약 | `.../onlineMeetings/{id}/aiInsights` (beta, `callAiInsight`) | 요약·액션 아이템·멘션. Copilot 라이선스 필요 |

### 3. 권한 모델 (두 가지 중 선택)

| 방식 | 권한 | 특징 |
|---|---|---|
| **조직 전체 application 권한** | `OnlineMeetingTranscript.Read.All`, `OnlineMeetingRecording.Read.All` | 앱을 회의에 설치할 필요 없음. 테넌트 관리자 동의 필요. 보통 **Application Access Policy**(Teams PowerShell로 대상 사용자 지정)도 설정해야 함 |
| **RSC (회의 단위)** | 회의 채팅에 앱 설치 시 해당 회의만 | 최소 권한. 단, 회의마다 설치가 필요해 자동화 범위가 좁다 |

- AI Insights는 `OnlineMeetingAiInsight.Read.All`. delegated는 지원하지 않는 항목이 있어 application 기준으로 설계한다.
- 회의 소유자별 조회 구조이므로 **organizer 사용자 ID**를 알아야 한다. 알림 payload에서 얻는다.

### 4. 전제 조건 (자주 놓치는 부분)

- 회의에서 **트랜스크립션이 켜져 있어야** 트랜스크립트가 생성된다. 관리자 Teams 회의 정책에서 허용해야 하고, 자동 시작은 회의 옵션/정책으로 설정한다.
- 트랜스크립트는 회의 종료 후 **조금 늦게** 생성된다. 폴링이 아니라 알림으로 받는다.
- 채널 회의, 만료된 회의 등은 일부 API(특히 AI Insights beta)에서 제외될 수 있다.
- 한국어 인식 품질은 회의 언어 설정에 좌우된다. 회의 언어를 올바르게 지정해야 한다.

### 5. 이벤트 기반 수집 (권장)

`POST /subscriptions`로 구독한다.

- 조직 전체: `resource = communications/onlineMeetings/getAllTranscripts`
- 특정 사용자: `users/{id}/onlineMeetings/getAllTranscripts`
- 구독 쿼터(검색된 문서 기준): 앱+회의당 1, 앱+사용자당 1, 사용자당 10, 조직 전체 10,000.
- 구독은 만료되므로 **lifecycle notification**으로 갱신한다. 수신 엔드포인트는 validation token 응답이 필수. 알림이 많으면 Event Hubs/Event Grid 전달을 고려한다.

### 6. 추천 아키텍처

```
Teams 회의 종료
   ↓ (트랜스크립트 생성)
Graph change notification  → Webhook 수신 (Azure Functions 등) → 큐
   ↓
Worker: transcript content(VTT) 다운로드 → 화자/시간 파싱 → 청킹
   ↓
LLM 요약 (Map-Reduce: 청크 요약 → 통합 요약, 구조화 JSON 출력)
   ↓
저장 (DB/Blob/벡터 스토어) → 분석·검색 / Teams 채널·메일로 결과 게시
```

- **구조화 출력**: `{summary, decisions[], action_items[{owner, due}], topics[], risks[]}` JSON 스키마를 강제하면 후처리가 쉽다.
- **긴 회의**: 컨텍스트 한도를 넘으면 시간 구간별 청킹 후 계층 요약.
- **분석**: 발언 비율, 주제 분포, 액션 아이템 추적은 화자·타임스탬프가 있는 VTT에서 계산한다. 의미 검색이 필요하면 임베딩해 RAG로 구성한다.
- **결과 게시**: 채널 알림은 Workflows 웹훅, 회의 채팅 게시는 Graph 또는 봇을 쓴다 (관련 내용은 [Teams 오픈 API](microsoft-teams-open-api.md) 문서 참고).

### 7. 선택지 비교

| 선택지 | 장점 | 단점 | 추천 상황 |
|---|---|---|---|
| **A. Graph 트랜스크립트 + 자체 LLM** | 비용 예측 쉬움, 프롬프트/스키마 자유, 사내 시스템 연동 | 개발·운영 필요, 권한 승인 필요 | **기본 추천** |
| **B. Graph AI Insights API** | 구현 최소, MS 품질 | Copilot 라이선스(사용자별), beta, 제약 많음, 커스터마이징 불가 | Copilot 이미 도입한 조직 |
| **C. 녹음 파일 + 별도 STT** | 트랜스크립션 미사용 회의도 처리 | STT 비용, 화자 분리 직접, 대용량 파일 처리 | 트랜스크립션을 켤 수 없을 때만 |
| **D. Power Automate** | 노코드, 빠른 PoC | 복잡한 분석·대규모에 한계 | 파일럿 |
| **E. 상용 회의록 봇(Fireflies, Otter 등)** | 즉시 사용 | 데이터 외부 반출, 보안 심사, 맞춤 분석 제한 | 보안 요건이 낮을 때 |

### 8. 보안·컴플라이언스

- 회의 내용은 민감 데이터다. **최소 권한**(가능하면 RSC 또는 Application Access Policy로 대상 사용자 제한)을 적용한다.
- LLM 호출 시 데이터 거주지·학습 미사용 약관을 확인한다 (Azure OpenAI 등 테넌트 내 서비스 선호).
- 참석자 동의/고지, 회의록 보존·삭제 정책(법무)을 정의한다.
- 클라이언트 시크릿보다 인증서 또는 Managed Identity를 쓴다.

### 9. 주의

- AI Insights API는 beta라 변경 가능성이 있고, 일부 권한·정책 세부(Application Access Policy 요구 여부 등)는 2차 자료가 섞여 있다. **구현 전 공식 문서로 재확인**할 것.
- 한국어 요약 품질은 PoC로 실제 회의 몇 건을 검증하는 것이 확실하다.

### 출처

- [Teams call recording/transcript change notifications](https://learn.microsoft.com/en-us/graph/teams-changenotifications-callrecording-and-calltranscript)
- [callTranscript get (Microsoft Graph)](https://learn.microsoft.com/en-us/graph/api/calltranscript-get?view=graph-rest-1.0)
- [Teams 회의 트랜스크립트 API GA 공지](https://devblogs.microsoft.com/microsoft365dev/?p=16028)
- [Teams 회의 녹음 API GA 공지](https://devblogs.microsoft.com/microsoft365dev/announcing-general-availability-of-microsoft-graph-apis-for-microsoft-teams-meeting-recordings/)
- [Microsoft Q&A: 녹음·트랜스크립트 다운로드](https://learn.microsoft.com/en-us/answers/questions/2109977/utilizing-microsoft-graph-api-for-downloading-team)
- [Microsoft Q&A: RSC로 트랜스크립트 가져오기](https://learn.microsoft.com/en-in/answers/questions/2149314/how-to-fetch-meeting-transcript-using-rsc-based-pe)
- [Copilot APIs 개요 (Meeting AI Insights)](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/copilot-apis-overview)
- [Meeting AI Insights API 제약 정리](https://blog.thoughtstuff.co.uk/2025/05/the-new-meeting-ai-insights-api-is-nice-but-theres-a-big-problem/)
- [Graph change notifications 개요](https://learn.microsoft.com/en-us/graph/change-notifications-overview)
