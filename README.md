# claude 저장소

Claude와 나눈 질문/답변을 주제별 `.md` 파일로 아카이빙하는 저장소. 저장 규칙은 [`CLAUDE.md`](./CLAUDE.md) 참고.

## 폴더 구조

- 루트에 **주제 폴더**를 두고, 그 안에 답변 파일을 kebab-case로 저장.
- 한 폴더 안에서 같은 기술/제품명(예: nginx)을 다루는 답변이 3개 이상 쌓이면 그 이름의 하위 폴더로 다시 묶음 (예: `web-infra/nginx/`).

## 주제 폴더

| 폴더 | 내용 |
|---|---|
| `ai-llm-basics/` | LLM 개념, 아키텍처 파이프라인(`llm-architecture/`) |
| `aws-cloud/` | AWS 관련 |
| `claude-tools/` | Claude Code 자체 기능(웹서치 등) |
| `dev-tools/` | 개발 도구, GitHub 트렌딩/스타 수집(`github-trending/`) |
| `distributed-systems/` | 분산 시스템 일반, "The Log" 에세이 분석(`the-log/`) |
| `google-api/` | Google API |
| `kafka/` | Kafka |
| `kubernetes/` | Kubernetes |
| `llm-services/` | OpenRouter 등 LLM 서비스 |
| `news-media/` | 뉴스/미디어 API |
| `observability/` | 로깅·모니터링·OTel |
| `security-crypto/` | 암호화·API 키 검증(`api-key-verification/`) |
| `software-testing/` | 테스트 방법론 |
| `web-infra/` | nginx·OpenResty 등 웹 인프라(`nginx/`), TLS/SNI |

> `nginx/`(루트)는 답변 아카이브가 아니라 실제 nginx 설정 파일(`default.conf`) 디렉터리.
