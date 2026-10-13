# GitBook의 LLM 지원 기능과 LLM Wiki 패턴

## 쉬운 설명

GitBook에는 "LLM Wiki"라는 이름의 기능이 없다. 대신 **사람이 쓴 문서를 AI가 읽기 쉽게 펼쳐 주는 기능**(llms.txt, MCP)과, **AI 비서가 문서 고칠 곳을 찾아 제안하는 기능**(GitBook Agent)이 있다. 두 개를 합치면 Karpathy의 LLM Wiki와 꽤 비슷하게 쓸 수 있다.

## 일반 설명

### 0. 용어 정리

- **LLM Wiki**: Karpathy가 2026년 4월 gist로 공개한 **패턴**(제품 아님). raw(불변 원본) → wiki(LLM이 정리한 마크다운) → schema(규칙) 3계층 구조이며, Ingest/Query/Lint를 LLM이 수행한다. → [llm-wiki-karpathy-pattern.md](llm-wiki-karpathy-pattern.md)
- **GitBook**: 문서 작성·호스팅 플랫폼. 2026년 10월 기준 공식 문서에 "LLM Wiki"라는 기능명은 없고, 관련 기능은 **LLM-ready docs**, **MCP**, **GitBook Assistant**, **GitBook Agent**로 나뉜다.

### 1. LLM-ready docs (읽기: AI가 문서를 소비)

게시된 사이트에 자동으로 붙는 기능이고 별도 설정이 필요 없다.

| 기능 | 경로/방법 | 용도 |
|---|---|---|
| `llms.txt` | `<사이트>/llms.txt` | 페이지 목록·요약 인덱스 (Jeremy Howard 제안 표준) |
| `llms-full.txt` | `<사이트>/llms-full.txt` | 전체 문서를 한 파일로 export → 통째로 컨텍스트에 넣기 |
| 페이지별 Markdown | URL 끝에 `.md` 추가, 또는 `Accept: text/markdown` 헤더 | HTML·JS 없이 순수 마크다운 |
| `sitemap.md` | `<사이트>/sitemap.md` | 유효한 페이지 경로 탐색 |
| 질의 엔드포인트 | `<페이지>.md?ask=<질문>&goal=<목표>` | 질문에 맞는 발췌를 반환 (서버 측 검색) |

LLM Wiki와 대응시키면 `llms.txt`는 `index.md`, `.md` 페이지는 wiki 페이지 역할을 한다.

### 2. MCP 서버 2종

| 종류 | 엔드포인트 | 권한 | 용도 |
|---|---|---|---|
| **Published Docs MCP** | 사이트별 `/~gitbook/mcp` | 읽기 전용 | Claude, Cursor 등이 문서를 검색·조회 |
| **GitBook Editing MCP** | `https://mcp.gitbook.com/mcp` | 읽기/쓰기 | 사이트 생성, Change Request 열기, 페이지 작성·수정, 구조 재편 |

- 인증은 OAuth(권장) 또는 Personal Access Token(`Authorization: Bearer`)이다.
- 전송 방식은 HTTP만 지원한다(stdio, SSE 미지원).
- Claude Code 연결:
  ```bash
  claude mcp add --transport http gitbook https://mcp.gitbook.com/mcp
  # 이후 /mcp 에서 브라우저 인증
  ```

**Editing MCP가 LLM Wiki의 핵심 연결고리다.** 외부 에이전트(Claude Code 등)가 원본 자료를 읽고 GitBook 페이지를 쓰고 고치는, 즉 Ingest 단계를 그대로 수행할 수 있다.

### 3. GitBook Assistant / Agent (GitBook 내장 AI)

- **GitBook Assistant**: 독자용 AI 검색·Q&A. 게시된 문서와 연결된 소스(Connections)를 근거로 답한다. LLM Wiki의 **Query**에 해당한다.
- **GitBook Agent**: 편집자용 "AI 팀원".
  - 프롬프트로 작성·편집, PDF/Word 임포트·포맷팅, 번역, 스타일 가이드 준수
  - 댓글에서 `@gitbook`으로 호출, Change Request 생성·리뷰
  - 연결된 도구의 **신호**(지원 대화, 티켓, 스레드)로 문서 공백을 찾아 업데이트 제안 (베타)
  - LLM Wiki의 **Ingest + Lint**에 가깝다. 다만 자동 반영이 아니라 **Change Request 기반 제안**이라 사람 리뷰를 거친다.
  - 요금: 베타 기간 무료(Pro 외 요금제는 주 10메시지 제한), 번역은 별도 애드온.

### 4. LLM Wiki 패턴과 매핑

| LLM Wiki 구성요소 | GitBook에서 대응 |
|---|---|
| raw/ (불변 원본) | 별도 Git 저장소·드라이브 (GitBook 밖에 두는 것을 권장), 또는 Agent 임포트 원본 |
| wiki/ (정리된 페이지) | GitBook 스페이스 페이지 (Git Sync로 마크다운 저장소와 양방향 동기화 가능) |
| index.md | `llms.txt`, `sitemap.md` |
| schema (CLAUDE.md) | Agent 스타일 가이드 + 외부 에이전트의 CLAUDE.md |
| Ingest | Editing MCP(외부 에이전트) 또는 GitBook Agent 임포트 |
| Query | Assistant, Published Docs MCP, `?ask=` 엔드포인트, `llms-full.txt` |
| Lint | Agent의 공백 탐지·CR 리뷰 + 스크립트 점검 |

### 5. 장단점

**장점**
- 호스팅, 검색, MCP, llms.txt가 자동으로 제공된다. 문서가 적으면 `llms-full.txt` 하나를 통째로 컨텍스트에 넣어도 되므로 RAG 인프라가 필요 없다.
- Change Request 흐름으로 LLM이 쓴 변경에 **사람 승인 게이트**가 자연스럽게 생긴다. 오류 누적이라는 LLM Wiki의 약점을 보완한다.
- Git Sync를 쓰면 위키가 결국 Git의 마크다운이 되어 Karpathy 원형과 호환된다.

**한계**
- "원본에서 위키를 컴파일하고 교차 링크·모순을 표시"하는 Karpathy식 Ingest를 **자동으로 해 주지는 않는다**. 이 부분은 외부 에이전트 + Editing MCP + 규칙 문서로 직접 구성해야 한다.
- 내장 AI 기능은 요금제와 베타 제약을 받는다.
- 사내 비공개 문서라면 게시 범위(인증 사이트)와 MCP 접근 권한을 따로 설계해야 한다.

### 6. 정리

> GitBook은 LLM Wiki를 **제품으로 제공하지 않는다**. 대신 Wiki를 **보관하고 서빙하는 계층**(llms.txt, Published MCP, Assistant)과, 외부 에이전트가 Wiki를 **쓰게 하는 통로**(Editing MCP, Agent)를 제공한다. 그래서 "Claude Code + GitBook Editing MCP + Git Sync" 조합이 GitBook 위에 LLM Wiki를 구현하는 가장 현실적인 형태다.

## 출처

- [GitBook — LLM-ready docs](https://gitbook.com/docs/documentation/fr/ia-et-recherche/llm-ready-docs)
- [GitBook changelog: /llms.txt support (2025-01)](https://docs.gitbook.com/changelog/january-2025)
- [GitBook MCP](https://gitbook.com/docs/getting-started/ai-documentation/gitbook-mcp)
- [GitBook Agent](https://gitbook.com/docs/~gitbook/embed/page/gitbook-agent)
- [GitBook — AI for your readers](https://gitbook.com/docs/ai-for-your-readers)
- [GitBook AI features](https://www.gitbook.com/features/ai)
- [How to create and publish documentation with AI and MCP (GitBook blog)](https://www.gitbook.com/blog/create-documentation-with-ai-and-mcp)
- [Karpathy LLM Wiki tutorial (Data Science Dojo)](https://datasciencedojo.com/blog/llm-wiki-tutorial/)
- [lucasastorian/llmwiki (오픈소스 구현)](https://github.com/lucasastorian/llmwiki)
