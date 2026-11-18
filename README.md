# claude 저장소

Claude와 나눈 질문/답변을 주제별 `.md` 파일로 아카이빙하는 저장소. 저장 규칙은 [`CLAUDE.md`](./CLAUDE.md) 참고.

## 폴더 구조

- 루트에 **주제 폴더**를 두고, 그 안에 답변 파일을 kebab-case로 저장.
- 한 폴더 안에서 같은 기술/제품명(예: nginx)을 다루는 답변이 3개 이상 쌓이면 그 이름의 하위 폴더로 다시 묶음 (예: `web-infra/nginx/`).
- 각 답변은 **쉬운 설명**(비유로 핵심 요약) → **일반 설명**(전문 용어 포함 상세) 순서로 구성.
- 새 폴더(주제 폴더, 또는 3개 이상 쌓여 만드는 하위 폴더)를 만들 때는 답변과 별도로 그 폴더에 **`history.md`**(분야·기술의 등장 배경 → 변천 → 현재)를 함께 만든다. 파일명은 항상 `history.md`로 고정하며, 기존 폴더에는 소급하지 않음.
- **솔루션(Redis, MySQL 등) 자체를 물어보면** 솔루션 이름의 하위 폴더에 4개 문서로 나눔: ① `history.md` 역사 ② `<솔루션>-overview-and-basic-usage.md` 개요·기본 사용법 ③ `<솔루션>-common-problems-and-solutions.md` 자주 겪는 문제와 해결 ④ `<솔루션>-failure-and-high-availability.md` 장애 대응·고가용성. (예: `database/redis/`, `database/mysql/`)

## 주제 폴더

| 폴더 | 내용 |
|---|---|
| `ai-llm-basics/` | LLM/AI 기초 개념, 아키텍처 파이프라인(`llm-architecture/`, 추론은 `llm-architecture/reasoning/`), KV 캐시(`kv-cache/`), function calling·structured output(`structured-output/`) |
| `algorithms/` | 범용 알고리즘 (유전 알고리즘 등) |
| `aws-cloud/` | AWS/클라우드 서비스 (KMS 등) |
| `claude-tools/` | Claude Code 등 클로드 도구의 내부 동작 |
| `collaboration-tools/` | 협업 도구 API 연동 (Teams Graph API, 회의 트랜스크립트 파이프라인), Slack(`slack/`) |
| `cs-fundamentals/` | 컴퓨터공학 일반 개념·용어 |
| `database/` | DB 이론/실무 일반 (트리거, pg_bigm, pgvector vs Vector DB), ClickHouse(`clickhouse/`), MySQL·PostgreSQL 락·MVCC(`mysql-postgresql/`), Redis(`redis/`) |
| `dev-tools/` | 개발 도구·CLI·git 설정, GitHub 트렌딩/스타 수집(`github-trending/`) |
| `distributed-systems/` | 분산 시스템 일반, "The Log" 에세이 분석(`the-log/`) |
| `docker/` | Docker/컨테이너 내부 동작 |
| `file-formats/` | 파일 포맷 구조/역사 (전자책 등) |
| `game-ai/` | 게임 AI·게임플레이 에이전트, 스타크래프트 봇(`starcraft/`), 인간-AI 협동 플레이(`human-ai-coop/`) |
| `google-api/` | Google API |
| `java/` | Java 언어·JDK 라이브러리 (AQS·LockSupport 등 동시성) |
| `kafka/` | Kafka 메시징 |
| `kotlin/` | Kotlin 언어/코루틴 |
| `kubernetes/` | Kubernetes 아키텍처, Pod, 오토스케일링, EKS, Istio |
| `llm-services/` | OpenRouter 등 LLM 서비스 |
| `neuroscience-ai/` | 신경과학×AI (커넥톰 기반 시뮬레이션 등) |
| `news-media/` | 뉴스/미디어 API |
| `observability/` | 로깅·모니터링·OTel |
| `open-source/` | 오픈소스 실무 (라이선스 표기, SPDX 등) |
| `philosophy/` | 철학 (인식론 — "안다"의 정의, 행동과 앎의 관계) |
| `os-fundamentals/` | 리눅스/OS 기초, systemd(`systemd/`) |
| `rag-implementation/` | RAG 구현 설계 (Spring AI·pgvector, 파서, 하이브리드 검색, 임베딩 모델), RAG 평가(`evaluation/`) |
| `reinforcement-learning/` | 강화학습으로 게임 학습시키기, 스타크래프트 RL(`starcraft/`) |
| `security-crypto/` | 암호화·HMAC·2FA, API 키 검증(`api-key-verification/`) |
| `seo-geo/` | SEO, GEO/AEO (생성형 AI 검색 최적화) |
| `software-architecture/` | DDD, 헥사고날, 클린 아키텍처, Outbox 등 |
| `software-testing/` | 테스트 방법론 (부하 테스트 등) |
| `speech-ai/` | 음성 AI (STT, 화자 분리, 한국어 STT) |
| `tech-careers/` | IT 직무·커리어 (CSE vs FDE 등) |
| `web-infra/` | 웹 인프라 (TLS/SNI, HTTP/2), nginx·OpenResty(`nginx/`), Kong(`kong/`) |

> `nginx/`(루트)는 답변 아카이브가 아니라 실제 nginx 설정 파일(`nginx.conf`, `default.conf`) 디렉터리.
