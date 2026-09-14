# 질문 응답 규칙

- 사용자의 질문에는 반드시 웹 검색으로 최신 정보를 확인한 뒤 답변한다.
- 말투는 간결하게 작성하되, 5살 아이에게 설명하듯 쉬운 비유를 사용한다. 단, 관련 전문 용어는 함께 명시한다.
- 모든 답변은 `.md` 파일로 생성한다.
- 답변은 **관심사(주제)별 폴더**에 저장한다. 저장소 루트에 주제 폴더(예: `ai-llm-basics/`, `web-infra/`, `kubernetes/`, `claude-tools/`, `llm-services/`)를 두고, 질문 주제와 일치하는 폴더가 있으면 그 안에, 없으면 새 주제 폴더를 만들어 저장한다.
- 파일명은 질문 내용을 요약한 kebab-case로 짓는다 (예: `kubernetes/kubernetes-overview.md`).
- 같은 주제 폴더 안에서 **세부적으로 동일하거나 유사한 질문(같은 소주제)이 3개 이상** 쌓이면, 해당 소주제를 위한 하위 폴더를 새로 만들고 관련 파일들을 그 안으로 옮긴다 (예: `kubernetes/pod/`, `kubernetes/service/`). 이후 같은 소주제의 새 답변도 그 하위 폴더에 저장한다.
  - 판단 기준은 **동일한 기술/제품명(예: nginx, kafka, kubernetes)을 핵심 주제로 다루는지**로 잡는다 — 굳이 질문이 연속되거나 서로 참조할 필요는 없고, 같은 기술명이 제목/핵심 내용에 등장하는 답변이 3개 이상이면 그 기술명으로 하위 폴더를 만들어 묶는다 (예: `web-infra/nginx/`).
  - 단, 하위 폴더 이름이 상위 주제 폴더보다 더 넓거나 거의 같아져서 구분 의미가 없어지는 경우는 만들지 않는다 (예: `web-infra/web/`처럼 지나치게 포괄적인 이름은 지양). 애매하면 파일 제목에 실제로 반복 등장하는 기술명을 폴더명으로 쓴다.
- 새 주제 폴더(또는 하위 폴더)를 만들거나 기존 폴더의 성격이 바뀌면, 아래 **폴더 맵**에도 한 줄로 반영해서 최신 상태로 유지한다.

# 폴더 맵 (관심사별 분류)

> 새 질문의 주제를 어느 폴더에 저장할지 판단할 때 참고한다. `nginx/`는 문서 폴더가 아니라 로컬 nginx 설정 파일(`nginx.conf` 등)이 있는 별도 디렉터리이므로 답변 저장 대상에서 제외한다.

| 폴더 | 다루는 관심사 |
|---|---|
| `ai-llm-basics/` | LLM/AI 기초 개념 전반 (파운데이션 모델, 파라미터, VRAM, RAG, 벡터 임베딩) |
| `ai-llm-basics/llm-architecture/` | LLM 아키텍처를 단계별로 (토크나이저 → 임베딩 → 포지셔널 인코딩 → 어텐션 → FFN/MoE → 정규화 → 출력 샘플링), 하위 `reasoning/`은 추론(CoT, 에이전틱 툴콜) 관련 |
| `ai-llm-basics/kv-cache/` | KV 캐시 개념·연산·메모리 스케일링 |
| `ai-llm-basics/structured-output/` | function calling, structured output(JSON) 관련 |
| `algorithms/` | 범용 알고리즘 (유전 알고리즘 등) |
| `aws-cloud/` | AWS/클라우드 서비스 (KMS 등) |
| `claude-tools/` | Claude Code 등 클로드 관련 도구의 내부 동작 방식 |
| `database/` | DB 이론/실무 일반 (트리거 등) |
| `database/mysql-postgresql/` | MySQL·PostgreSQL 락(gap/next-key lock), MVCC, 격리 수준 비교 |
| `dev-tools/` | 개발 유틸리티/스크립트/CLI 도구 (bash, vim, no-op 등) |
| `dev-tools/github-trending/` | GitHub 트렌딩/스타 추적 관련 |
| `docker/` | Docker/컨테이너 내부 동작 (커널 공유 등) |
| `file-formats/` | 파일 포맷 구조/역사 (전자책 포맷 등) |
| `google-api/` | Google API 종류/활용 |
| `kafka/` | Kafka 메시징 (컨슈머 동작, 타 메시지 큐 비교) |
| `kotlin/` | Kotlin 언어/코루틴, 타 언어(Go) 비교 학습 경로 |
| `kubernetes/` | Kubernetes 아키텍처/개요/Pod 동작 |
| `llm-services/` | LLM 제공 서비스 (OpenRouter 등 API 서비스) |
| `neuroscience-ai/` | 신경과학×AI (뇌 커넥톰 기반 시뮬레이션·모델 등) |
| `news-media/` | 뉴스/미디어 API 및 속보 소스 |
| `observability/` | 로그/메트릭/트레이스 관측성 도구 (Fluentd, OTel Collector 등) |
| `os-fundamentals/` | 리눅스/OS 기초 (cgroup, 프로세스, 터미널 입력) |
| `os-fundamentals/systemd/` | systemd 서비스 유닛 작성/운영 |
| `security-crypto/` | 보안/암호 일반 |
| `security-crypto/api-key-verification/` | API 키 검증 방식 (해시, HMAC, Vault 연동) |
| `software-testing/` | 소프트웨어 테스트 기법/도구 (부하 테스트 등) |
| `web-infra/` | 웹 인프라 일반 (SNI 등) |
| `web-infra/nginx/` | Nginx/OpenResty 내부 동작, Lua/njs, LuaJIT |

# 커밋 규칙

- 커밋/푸시 시점에 아직 커밋되지 않은 변경(신규/수정 파일)이 여러 개 쌓여 있고, 그 변경들이 서로 다른 주제 폴더(관심사)에 걸쳐 있다면, 하나의 커밋으로 묶지 말고 **주제(폴더)별로 나누어 각각 커밋**한다.
- 같은 주제 폴더 내 변경이라도 성격이 다르면(예: 새 답변 추가 vs 기존 답변 폴더 재구성) 별도 커밋으로 분리하는 것을 우선 고려한다.
