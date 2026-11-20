# 저장소 목적

기술·개념 지식을 문서로 모으는 저장소. 문서는 세 유형(inquiry·knowledge·source)이고, 사용자가 요청할 때만 그 유형의 스킬로 만든다. 그냥 질문하면 대화로 답하고 문서를 만들지 않는다.

# 질문 응답 규칙

- 질문에는 웹 검색으로 최신 정보를 확인한 뒤 답한다.
- 말투는 간결하게 쓴다.

# 문서 만들기

| 유형 | 스킬 | 만드는 것 |
|---|---|---|
| inquiry | [`/inquiry [질문]`](./.claude/skills/inquiry/SKILL.md) | 질문 하나에 대한 답 문서 |
| knowledge | [`/knowledge <대상>`](./.claude/skills/knowledge/SKILL.md) | 대상(솔루션·개념) 하나의 5문서 세트 |
| source | [`/source <저작물>`](./.claude/skills/source/SKILL.md) | 저작물 자체의 장별 분석 |

- 사용자가 스킬 이름 없이 "문서로 만들어", "세트로 정리해"처럼 요청해도 맞는 스킬을 불러와 따른다.
- 폴더·번호 규칙은 [`ARCHITECTURE.md`](./ARCHITECTURE.md)가 원문이다. 문서를 만들거나 옮길 때 읽는다.
- 아래 공통 규칙은 세 유형 모두에 적용한다.

## 요약 섹션

문서는 맨 앞에 짧은 요약 섹션을 두어, 독자가 첫 10초 안에 무엇을 얻는지 알게 한다.

- **`## 쉬운 설명`**: 5살 아이에게 설명하듯 쉬운 비유로 핵심을 1~3문장으로 요약한다. **그 문서가 답하는 질문 하나에만** 집중한다. 이어서 `## 일반 설명`에서 전문 용어를 포함해 자세히 설명한다.
- **`## 한 줄 결론`**: 목록·수치·가격·현황이 중심인 inquiry는 쉬운 설명 대신 답 자체를 1~3줄로 먼저 준다. 비유는 쓰지 않는다. 이어서 표·목록 중심 본문, 마지막에 출처.

## frontmatter

문서 맨 위에 YAML frontmatter를 둔다.

```yaml
---
type: inquiry            # inquiry | knowledge | source (루트 폴더와 같다)
created: 2026-11-18      # 처음 만든 날짜
verified: 2026-11-18     # 선택. 시간이 지나면 틀리는 내용이 있을 때만
author: agent            # agent | human
model: claude-opus-5-5   # author: agent일 때만. 모르면 unknown
---
```

- `verified`: 가격·버전·현황처럼 시간이 지나면 틀리는 내용을 마지막으로 확인한 날짜. 그런 내용이 있는 문서에만 두고, 다시 확인해 고치면 갱신한다. 재확인 대상은 `grep -rl '^verified:' inquiry knowledge source`로 모은다.
- `author`: 문서를 처음 작성한 주체. 에이전트가 쓰면 `agent`, 사람이 직접 쓰면 `human`.
- `model`: 처음 작성한 모델의 API 모델 ID (예: `claude-opus-5-5`). 컨텍스트 창 옵션("1M context")은 넣지 않는다. 나중에 다른 모델이 고쳐도 바꾸지 않는다.
- source 문서는 `source`, `linked` 필드를 더한다 ([`/source`](./.claude/skills/source/SKILL.md)).

# 대주제 맵

> 새 문서를 어느 대주제에 둘지 판단할 때 참고한다. 세 유형 폴더 모두 같은 대주제 이름을 쓴다.

| 대주제 | 다루는 관심사 |
|---|---|
| `ai/` | LLM 기초(파운데이션 모델, 파라미터, VRAM, 양자화, 임베딩, 모델 평가), LLM 아키텍처 연재·추론(CoT, 에이전틱 툴콜), KV 캐시, function calling·structured output, LLM API 서비스, RAG 설계·평가, 강화학습, 음성 AI(STT·화자 분리), 신경과학×AI |
| `game-ai/` | 게임 AI·게임플레이 에이전트(FSM·BT·GOAP·LLM 하이브리드), 스타크래프트 봇·RL, 인간-AI 협동 플레이 |
| `database/` | DB 이론·실무(트리거, MVCC, 락, 격리 수준), MySQL, PostgreSQL(pg_bigm, pgvector), Redis, ClickHouse |
| `distributed-systems/` | 복제, 합의, 로그 추상화, 데이터 통합, 고가용성 구성, Kafka·메시지 큐 |
| `web/` | HTTP·TLS·CORS 등 웹 프로토콜, Nginx/OpenResty, Kong, SEO·GEO |
| `infra/` | Kubernetes, Docker, AWS, 관측성(로그·메트릭·트레이스), systemd |
| `cs/` | 컴퓨터공학 기초 개념(일급 객체, IEEE 754), 리눅스/OS(cgroup, 프로세스, 터미널), 알고리즘 |
| `java/` | Java 언어·JVM, 동시성(락·AQS·Condition), Lombok 등 생태계 |
| `languages/` | Java 외 언어(Kotlin·코루틴, Go), 언어 비교 |
| `software-engineering/` | 아키텍처 패턴(DDD, 헥사고날, 클린 아키텍처, Outbox), 테스트, 기술 문서화(Diátaxis 등), 오픈소스 라이선스 실무 |
| `dev-tools/` | git·GitHub(CODEOWNERS, Pages, 트렌딩), bash·vim·grep 등 CLI, Claude Code 등 클로드 도구, 파일 포맷(전자책, Markdown) |
| `security/` | 암호·인증 일반(HMAC, 2FA), API 키 검증 |
| `external-apis/` | Microsoft Teams, Slack, Google, 뉴스·미디어 API |
| `study-and-career/` | 학습·스터디 방법, IT 직무·커리어, 철학(인식론) |

# 커밋 규칙

- 커밋/푸시 시점에 아직 커밋되지 않은 변경이 여러 대주제에 걸쳐 있다면, 하나의 커밋으로 묶지 말고 **대주제별로 나누어 각각 커밋**한다.
- 같은 대주제 내 변경이라도 성격이 다르면(예: 새 문서 추가 vs 폴더 재구성) 별도 커밋으로 분리하는 것을 우선 고려한다.
