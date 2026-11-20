# 질문 응답 규칙

- 사용자의 질문에는 반드시 웹 검색으로 최신 정보를 확인한 뒤 답변한다.
- 말투는 간결하게 작성한다.
- 모든 답변은 `.md` 파일로 생성한다.

# 문서 유형

모든 답변 문서는 네 유형 중 하나이고, 같은 이름의 루트 폴더에 둔다. 파일명은 그 폴더 안에서 하나뿐인 4자리 ID를 앞에 붙여 `<ID>-<이름>.md`로 짓는다 (구조·번호 규칙은 [ARCHITECTURE.md](./ARCHITECTURE.md)). 아래 순서로 판정한다.

1. 저작물(논문·에세이·책·발표) 자체를 장 구조로 분석하는가? → **source**
2. 대상의 5문서 세트(`01-history` ~ `05-failure-modes`)의 하나인가? → **knowledge**
3. 목록·수치·가격·현황·개별 사실이 중심인가? → **factual**
4. 그 외 — 개념 설명, 비교·판단, 원인 분석, 오해 교정, 설계 검토, 방법 → **inquiry**

질문 형식이 아니라 **본문의 중심**으로 판정한다. knowledge는 내용이 아니라 **구조**로 판정한다 — 개념 하나를 독립적으로 설명한 문서도 5문서 세트가 아니면 inquiry다.

| | inquiry | factual | knowledge | source |
|---|---|---|---|---|
| 정의 | 질문 단위 문서 (개념 설명·비교·판단·분석) | 목록·수치·버전·가격·현황·개별 사실 | 대상 하나의 5문서 세트 | 저작물 자체의 정독·분석 |
| 예 | "MVCC란", "Kafka vs RabbitMQ", "MySQL gap lock은 언제 걸리나" | 속보 뉴스 API 목록, NGINX Plus 비용 | Redis, Java 락 | Jay Kreps "The Log" |
| 수명 | 중간 | 짧다 (바뀌면 틀린 정보가 된다) | 길다 | 길다 |
| 관리 | 쌓기만 한다 | 주기적으로 재확인한다 | 세트를 완성·갱신한다 | 원전 목록과 함께 갱신한다 |
| 구성 | **쉬운 설명** → **일반 설명** | **한 줄 결론** → 표·목록 → 출처 | 5문서, 각 문서는 **쉬운 설명** → **일반 설명** | `01-overview` → 장별 분석 → 비판 |

- 모든 문서는 맨 앞에 짧은 요약 섹션을 둔다. 목적은 같다 — 독자가 첫 10초 안에 이 문서에서 무엇을 얻는지 알게 하는 것.
  - **`## 쉬운 설명`** (inquiry·knowledge·source): 5살 아이에게 설명하듯 쉬운 비유로 핵심을 1~3문장으로 요약한다. **그 문서가 답하는 질문 하나에만** 집중한다. 이어서 `## 일반 설명`에서 전문 용어를 포함해 기술적으로 자세히 설명한다.
  - **`## 한 줄 결론`** (factual): 질문에 대한 답 자체를 1~3줄로 먼저 준다. 비유는 쓰지 않는다. 이어서 표·목록 중심 본문, 마지막에 출처.
- 한 질문에 여러 유형이 섞이면 주된 목적으로 유형을 정하고, 다른 쪽은 별도 문서로 나눠 링크한다. 한 문서에 섞지 않는다.
- inquiry에서 관련 knowledge 세트가 있으면 링크한다.

## frontmatter

문서 맨 위에 YAML frontmatter를 둔다.

```yaml
---
type: inquiry            # inquiry | factual | knowledge | source (루트 폴더와 같다)
created: 2026-11-18      # 처음 만든 날짜. 기존 문서는 그 파일이 처음 커밋된 날짜
author: agent            # agent | human
model: claude-opus-5-5   # author: agent일 때만. 모르면 unknown
---
```

- `author`: 문서를 처음 작성한 주체. 에이전트가 쓰면 `agent`, 사람이 직접 쓰면 `human`.
- `model`: 처음 작성한 모델의 API 모델 ID (예: `claude-opus-5-5`, `claude-sonnet-5`). 컨텍스트 창 옵션("1M context")은 넣지 않는다. 나중에 다른 모델이 고쳐도 바꾸지 않는다. 기존 문서는 첫 커밋의 `Co-Authored-By` 트레일러로 정하고, 트레일러가 없으면 `unknown`.
- `source` 문서는 아래 [원전 분석](#원전-분석-source)의 `source`, `linked` 필드를 더한다.

## 승격 규칙 (inquiry → knowledge)

- 같은 개념·솔루션을 핵심으로 다루는 inquiry가 **3개 이상** 쌓이면 그 대상의 5문서 세트를 만들 시점이다.
- 승격은 작업량이 크므로 **조건이 충족됐음을 사용자에게 알리고 확인을 받은 뒤** 작성한다.
- 승격 후 기존 inquiry는 옮기지 않고, 각 inquiry에서 새 knowledge 세트를 관련 문서로 링크한다.

# knowledge 5문서 구성

솔루션(기술·제품)이나 큰 개념(방법, 이론, 제도) **자체를 전반적으로** 물어보면 `knowledge/<대주제>/<ID>-<대상>/`에 아래 **5개 문서를 모두** 작성한다. 하나라도 빠지면 knowledge가 아니다. 순서는 역사 → 개요 → 트레이드오프 → 실패 학습 구조를 따른다 (근거: [`inquiry/study-and-career/0007-history-overview-tradeoff-failure-learning-frameworks.md`](./inquiry/study-and-career/0007-history-overview-tradeoff-failure-learning-frameworks.md)).

1. `01-history.md` — 등장 배경과 풀려던 문제 → 주요 버전·변천 → 현재 상태(최신 버전, 라이선스, 포크·경쟁 대상)
2. `02-overview.md` — 무엇을 해결하나, 어떻게 동작하나(구조), 기본 사용법·대표 예
3. `03-tradeoffs.md` — 핵심 설계 선택에서 얻은 것과 포기한 것, 대안 비교, 주요 선택지(설정·구성, 고가용성 구성 등), 쓰지 말아야 할 때, 선택 체크리스트
4. `04-pitfalls.md` — **사람이 잘못 쓰는 것**(원인이 사용자): 흔한 실수(성능, 설정 함정, 보안, 오해 등)와 진단·해결
5. `05-failure-modes.md` — **장애 유형**(원인이 대상): 대상이 어떤 방식으로 제 기능을 못 하게 되는지와 유형별 장애 지점·영향·대응. 시스템이면 노드 장애·네트워크 분리·데이터 유실·스플릿 브레인·운영 실수와 복구·고가용성 동작·백업/DR, 이론·방법이면 적용 한계와 반례
- 파일명은 위 이름으로 고정한다. 대상 이름은 폴더가 말해 주므로 파일명에 넣지 않는다.
- 해당 없는 단계도 **파일은 만들고** "해당 없음 — 이유" 한 줄을 남긴다.
- 문서 경계: 개요는 **"어떻게 동작하나"**, 트레이드오프는 **"왜 그렇게 만들었고 대가는 무엇인가, 언제 고르나"**(고르기 전에 읽는 문서), 4·5번은 **"고른 뒤 어디서 문제가 생기고 어떻게 대응하나"**(운영 중에 읽는 문서)를 다룬다. 트레이드오프는 일반론 대신 수치·사례로 쓴다.
- 각 문서의 쉬운 설명은 그 단계의 질문에만 답한다 — history: 왜 생겼나 / overview: 어떻게 동작하나 / tradeoffs: 무엇을 포기했나 / pitfalls: 사람들이 어떻게 잘못 쓰나 / failure-modes: 어떤 경우에 제 기능을 못 하나. 같은 비유를 다섯 번 반복하지 않는다.
- 04·05 판정: **고치는 쪽이 사용자**(코드·설정·운영 절차)면 04, **대상 자체의 복구·이중화가 필요하면** 05. 위험한 기본값처럼 대상 설계 탓으로 보여도 사용자가 설정을 바꿔 해결하면 04다.
- 04는 아래 용어로 쓴다. 제목은 `<대상> (사용|운영) 시 흔한 함정과 해결 방법`, 다른 문서에서 링크할 때는 "흔한 함정"으로 부른다.

  | 영어 | 용어 | 뜻 |
  |---|---|---|
  | pitfall | 함정 | 대상은 설계대로 동작하지만 사람이 알아차리기 어려워 빠지는 위험 |
  | mistake | 실수 | 사람이 잘못 쓰거나 잘못 설정한 것 |
  | misconception | 오해 | 동작 방식을 잘못 알고 있는 것 |
  | anti-pattern | 안티패턴 | 그럴듯해 보이지만 해가 더 크고, 더 나은 대안이 있는 반복적 관행 |

- 05는 아래 용어로 쓴다. "깨진다" 같은 비유는 규칙·안내 문장에 쓰지 않는다.

  | 영어 | 용어 | 뜻 |
  |---|---|---|
  | failure | 장애 | 대상이 요구된 기능을 못 하는 상태나 사건 |
  | failure mode | 장애 유형 | 장애가 나타나는 방식 (예: 리더 선출 불가, 복제 지연으로 인한 유실) |
  | failure point / SPOF | 장애 지점 / 단일 장애점 | 장애가 시작되는 구성 요소 (예: etcd, Keeper) |
  | cause / effect | 원인 / 영향(영향 범위) | 장애 유형을 일으키는 조건 / 시스템·사용자에 미치는 결과 |
  | recovery | 복구·대응 | 감지 → 조치 → 정상화 |
  | limitation / counterexample | 적용 한계 / 반례 | 이론·방법의 전제가 성립하지 않는 조건 / 그 구체적인 사례 |

  - "실패"는 개별 요청·작업의 결과에만 쓴다 (예: 쓰기 실패, 커밋 실패).
  - 각 장애 유형은 장애 지점 → 원인 → 영향 → 대응 순으로 쓰는 것을 기본으로 한다.
- 다섯 문서는 서로를 관련 문서로 링크한다. 같은 내용은 한 문서에서만 자세히 쓰고 나머지는 링크한다.
- 평가 단계(스스로 확인 질문)는 문서에 넣지 않는다. 사용자가 직접 만든다.
- 대상 안의 큰 하위 주제는 별도 대상으로 세트를 만든다 (예: `knowledge/languages/<ID>-java-lock/`).
- 대상의 세부 질문(예: "MySQL gap lock은 언제 걸리나")은 `inquiry/<대주제>/<ID>-<이름>.md` 단일 문서로 작성하고, 세트를 링크한다.

# 원전 분석 (`source/`)

특정 저작물(논문·에세이·책·발표) **자체**를 정독·분석하는 문서는 `source/<대주제>/<ID>-<제목>-<저자성>-<연도>/`에 둔다 (예: `source/distributed-systems/0001-the-log-kreps-2013/`).

- 판정: 문서의 대상이 저작물 자체(장 구조를 따라 읽기, 주장 평가)이면 source. 답변 중에 논문을 인용만 하는 문서는 inquiry다.
- 구성: `01-overview.md`(원전 정보·쓰인 맥락·읽는 법) → `02-`부터 장·절 순서의 분석 → 마지막에 비판·현재 관점.
- frontmatter에 두 필드를 더한다. 이 두 필드는 source 문서에만 쓴다.
  ```yaml
  ---
  type: source
  created: 2026-09-15
  author: agent
  model: claude-opus-5
  source: "Jay Kreps, The Log: What every software engineer should know about real-time data's unifying abstraction (2013)"
  linked:            # 저장소 루트 기준 경로
    - inquiry/distributed-systems/0002-kafka-overview.md
    - inquiry/distributed-systems/0009-high-availability-replication-vs-cluster-and-patterns.md
  ---
  ```
  - `source`: 원전의 서지 정보(저자, 제목, 연도).
  - `linked`: 저장소 안의 연관 문서. **관계는 원전 쪽에만 기록한다** — 다른 문서는 원전을 링크하지 않는다. 저작물 전체의 `linked`는 `01-overview.md`에 두고, 장별 문서는 특정 장과 강하게 연결될 때만 자체 `linked`를 둔다.
  - GitHub에서 frontmatter 경로는 클릭되지 않으므로, `01-overview.md` 본문 끝 `## 관련 문서`에 같은 목록을 링크로 옮겨 적는다 (frontmatter가 기준).
- 원전 목록: 루트 `README.md`의 `## 원전 목록`에 "원전 → 위치 → linked 문서" 표를 둔다. 원전을 추가하거나 `linked`를 바꾸면 함께 갱신한다.

# 폴더 규칙

폴더 구조와 나누는 기준(유형 폴더 → 대주제, 묶음 폴더, 4자리 ID와 2자리 순서 번호)은 [`ARCHITECTURE.md`](./ARCHITECTURE.md)가 원문이다. 아래 줄로 불러온다.

@ARCHITECTURE.md

# 대주제 맵

> 새 문서를 어느 대주제에 둘지 판단할 때 참고한다. 네 유형 폴더 모두 같은 대주제 이름을 쓴다. 루트의 `nginx/`는 로컬 nginx 설정 파일 디렉터리이므로 답변 저장 대상에서 제외한다.

| 대주제 | 다루는 관심사 |
|---|---|
| `ai/` | LLM 기초(파운데이션 모델, 파라미터, VRAM, 양자화, 임베딩, 모델 평가), LLM 아키텍처 연재·추론(CoT, 에이전틱 툴콜), KV 캐시, function calling·structured output, LLM API 서비스, RAG 설계·평가, 강화학습, 음성 AI(STT·화자 분리), 신경과학×AI |
| `game-ai/` | 게임 AI·게임플레이 에이전트(FSM·BT·GOAP·LLM 하이브리드), 스타크래프트 봇·RL, 인간-AI 협동 플레이 |
| `database/` | DB 이론·실무(트리거, MVCC, 락, 격리 수준), MySQL, PostgreSQL(pg_bigm, pgvector), Redis, ClickHouse |
| `distributed-systems/` | 복제, 합의, 로그 추상화, 데이터 통합, 고가용성 구성, Kafka·메시지 큐 |
| `web/` | HTTP·TLS·CORS 등 웹 프로토콜, Nginx/OpenResty, Kong, SEO·GEO |
| `infra/` | Kubernetes, Docker, AWS, 관측성(로그·메트릭·트레이스), systemd |
| `cs/` | 컴퓨터공학 기초 개념(일급 객체, IEEE 754), 리눅스/OS(cgroup, 프로세스, 터미널), 알고리즘 |
| `languages/` | Java(락·AQS, Lombok 등 생태계), Kotlin·코루틴, 언어 비교 |
| `software-engineering/` | 아키텍처 패턴(DDD, 헥사고날, 클린 아키텍처, Outbox), 테스트, 기술 문서화(Diátaxis 등), 오픈소스 라이선스 실무 |
| `dev-tools/` | git·GitHub(CODEOWNERS, Pages, 트렌딩), bash·vim·grep 등 CLI, Claude Code 등 클로드 도구, 파일 포맷(전자책, Markdown) |
| `security/` | 암호·인증 일반(HMAC, 2FA), API 키 검증 |
| `external-apis/` | Microsoft Teams, Slack, Google, 뉴스·미디어 API |
| `study-and-career/` | 학습·스터디 방법, IT 직무·커리어, 철학(인식론) |

# 커밋 규칙

- 커밋/푸시 시점에 아직 커밋되지 않은 변경이 여러 대주제에 걸쳐 있다면, 하나의 커밋으로 묶지 말고 **대주제별로 나누어 각각 커밋**한다.
- 같은 대주제 내 변경이라도 성격이 다르면(예: 새 답변 추가 vs 기존 답변 폴더 재구성) 별도 커밋으로 분리하는 것을 우선 고려한다.
