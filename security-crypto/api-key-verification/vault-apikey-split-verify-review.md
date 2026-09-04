# API Key를 apiId_secret으로 쪼개 Vault에서 조회·캐싱하는 구조 검토

> 지난 문서([nginx-api-key-hmac-hash-lookup-review.md](./nginx-api-key-hmac-hash-lookup-review.md))의 "HMAC 계산 후 DB/캐시 조회" 구조와, 이번에 제안하신 "`apiId_secret` 분리 + Vault 조회 + 캐싱" 구조를 비교해요.

## 결론부터

**verify 로직 자체를 Vault로 완전히 이관하는 건, 매 요청마다 부르는 방식으로는 손해가 더 커요.** Vault는 초당 처리량이 Redis보다 한두 자릿수 낮고, 캐싱을 하면 결국 "캐시 히트 시 이점 없음 + 폐기 지연 문제 재발생"이라는 똑같은 딜레마로 돌아와요. 진짜 이점은 **"secret(pepper)이 nginx 프로세스 메모리에 아예 존재하지 않게 만드는 것"**과 **"감사 로그·버전관리·세분화된 접근제어" 같은 운영 거버넌스**에 있지, "verify를 더 안전하게 한다"는 데 있지 않아요.

## 두 구조 비교

| | 기존: HMAC 해시 + DB/캐시 조회 | 제안: apiId_secret 분리 + Vault 조회 |
|---|---|---|
| 조회 키 | `HMAC(pepper, api_key)` 값 자체 | `apiId` (평문, 비민감) |
| 검증 방식 | nginx가 로컬에서 HMAC 계산 후 비교 | nginx가 secret을 Vault에 보내 검증(or secret을 받아와 비교) |
| pepper/비밀 위치 | nginx 환경변수 (여전히 nginx 프로세스 메모리에 존재) | Vault 내부에만 존재 (Transit 사용 시 반출 자체가 안 됨) |
| 캐시 대상 | "이 해시값은 유효하다"는 판정 결과 | "이 apiId의 secret(또는 판정 결과)" |
| 실패 시 영향 | DB 장애 시 인증 불가 | **Vault 장애 시 인증 불가** (SPOF 하나 더 추가) |

## Q1. `apiId_secret`으로 나누는 것 자체는 좋은 아이디어인가?

**네, 이건 기존 구조와 별개로 독립적인 개선이에요.** Stripe(`sk_live_...`), GitHub PAT, AWS Access Key/Secret Key처럼 업계에서 널리 쓰는 "**식별자(identifier) + 비밀(secret)**" 분리 패턴과 같은 방향이에요.

### 다섯 살에게 설명하듯

사물함을 생각해보세요. **사물함 번호(apiId)**는 복도에 적혀 있어도 아무 문제 없어요 — 누가 봐도 그냥 숫자예요. 하지만 **자물쇠 비밀번호(secret)**는 절대 보이면 안 돼요. 지금까지는 "번호와 비밀번호를 뒤섞은 긴 문자열"을 통째로 반죽(HMAC)해서 찾았다면, 이제는 "번호로 먼저 사물함을 찾고, 그 안의 비밀번호만 따로 확인"하는 거예요.

### 기술적으로

- 이미 HMAC 스킴에서도 `HMAC(pepper, api_key)` 값 자체가 결정론적(deterministic)이라 DB 인덱스로 바로 조회가 가능해서, "**어느 레코드인지 찾는 속도**" 문제는 원래도 없었어요. 그래서 `apiId_secret` 분리의 진짜 가치는 조회 속도가 아니라 **관심사 분리**예요.
- **비민감 식별자(apiId)를 로그·모니터링·에러 메시지에 자유롭게 남길 수 있어요.** 기존 방식에서는 해시값 자체가 조회 키라서, 로그에 그 값을 남기면 (원문은 몰라도) DB 조회 키가 그대로 노출되는 셈이라 다루기 애매했어요.
- **키 폐기(revocation)를 apiId 단위로 명확하게 관리**할 수 있어요 — "이 apiId를 폐기"라는 것이 사람이 이해하기 쉬운 단위가 돼요.
- Stripe 스타일의 프리픽스 패턴은 **깃허브·GitGuardian·TruffleHog 같은 시크릿 스캐너가 유출을 탐지**하기 쉽게 해주는 부가 효과도 있어요.

→ 이 분리 자체는 채택해도 좋아요. **다만 이건 "Vault 이관"과는 별개 질문**이라는 걸 구분해야 해요.

## Q2. verify를 Vault로 이관하면 진짜 장점이 있을까?

여기서부터가 핵심 질문이에요. **"Vault에서 secret을 가져와서 nginx가 비교"하는 방식과 "Vault의 Transit 엔진에 검증 자체를 맡기는 방식"은 보안 수준이 완전히 달라요.**

### 방식 A: Vault KV에서 secret을 읽어와 nginx가 직접 비교

이건 **DB를 Vault로 바꿔치기한 것**과 큰 차이가 없어요. secret이 결국 nginx 프로세스 메모리로 들어와서 비교되니, "DB 유출 시 안전하다"는 이점 외에 새로 생기는 방어 계층은 없어요. 오히려 매 조회마다 Vault 토큰 인증, ACL 정책 평가, 감사 로그 기록이 끼어들어 **DB/Redis 조회보다 느려요.**

### 방식 B: Vault Transit의 HMAC 검증 API(`/transit/verify/:name/hmac`)를 호출

**이게 진짜 의미 있는 이관이에요.** HashiCorp는 Transit 엔진의 핵심 계약을 이렇게 설명해요 — "**키는 절대 Vault 밖으로 노출되지 않는다(the key is never exposed outside of Vault)**." 즉:

- nginx는 원문 api_key(혹은 secret 부분)를 Vault에 보내고, Vault가 내부적으로 자신만 아는 HMAC 키로 계산 후 "맞다/틀리다"만 돌려줘요.
- **pepper가 nginx 프로세스 메모리·환경변수에 단 한 순간도 존재하지 않아요.** 기존 구조(pepper를 nginx env var로 보관)에서는 nginx 워커가 침해당하면 pepper가 통째로 유출돼 공격자가 임의의 유효 HMAC을 위조할 수 있었는데, Transit 방식에서는 그게 원천적으로 불가능해요.
- 모든 검증 호출이 **자동으로 감사 로그(audit log)**에 남고, **키 로테이션도 Vault가 버전 관리**해서 애플리케이션 코드 변경 없이 처리돼요.

`─────────────────────────────────────────────────`
★ Insight ─────────────────────────────────────
HMAC "검증"과 "서명"의 경계는 원래 모호해요 — 보통 HMAC은 대칭 키라 검증하려면 키를 알아야 하는데, Vault Transit처럼 "키를 아는 제3자가 검증만 대행"해주면 사실상 비대칭 서명(공개키로 검증)과 똑같은 신뢰 모델이 돼요. 이게 Vault를 "verify 서버"로 쓰는 것의 본질이에요.
`─────────────────────────────────────────────────`

## Q3. 그럼 왜 "매 요청마다 부르는 건 손해"라고 했나?

### 처리량(throughput) 차이가 커요

- Redis는 **단순 GET/SET 기준 초당 10만 건 이상**을 처리하고, 파이프라이닝을 쓰면 초당 수백만 건까지도 나와요.
- Vault는 HashiCorp 자체 벤치마크에서 "1KB 페이로드 읽기가 **초당 수천 건(thousands of requests per second)** 수준"이라고 밝혀요 — Redis보다 최소 한 자릿수, 많게는 두 자릿수 낮아요. 여기에 Transit의 HMAC 계산·ACL 평가·감사 로그 기록까지 더해지면 지연은 더 늘어나요.
- nginx의 `access_by_lua_block`은 **초당 수천~수만 요청**을 처리하는 핫패스(hot path)예요. 여길 지나갈 때마다 네트워크 너머 Vault를 부르면, Vault가 사실상 병목이자 **단일 장애점(SPOF)**이 돼요.

### 캐싱을 하면 원래 문제가 그대로 돌아와요

- Vault 응답(secret 또는 판정 결과)을 캐싱하는 순간, **폐기(revocation) 반영 지연 문제는 기존 구조와 똑같이 재발생**해요. TTL이 남아있으면 Vault에서 이미 회수된 secret도 캐시에서는 여전히 유효하게 보여요.
- "verify를 Vault로 이관"했다고 해도, 캐시 히트 경로에서는 **Transit이 주는 "키가 nginx에 안 남는다"는 이점조차 사라져요** — 캐시에 판정 결과(true/false)나 secret 자체가 어차피 로컬에 존재하니까요.

### 새로운 secret 관리 문제가 생겨요

- nginx가 Vault를 호출하려면 **Vault 자신에 대한 인증 수단**(AppRole의 `role_id`/`secret_id`, Kubernetes auth 등)이 필요해요. 이건 "**secret zero 문제**"라고 불리는데, `role_id`는 비민감(설정 파일에 둬도 됨)이지만 `secret_id`는 여전히 민감해서 **어딘가에 안전하게 보관해야 하는 문제가 그대로 남아요.** 즉 "pepper를 어디에 두느냐"는 문제를 "Vault 토큰을 어디에 두느냐"는 문제로 이름만 바꾼 셈이에요.

## 실전 권장안

**Vault를 "매 요청 verify 서버"가 아니라 "secret 배포·회수 관제탑"으로 쓰는 하이브리드 구조**를 추천해요.

1. **평상시 경로 (고성능)**: 기존 구조 그대로 — nginx가 `apiId`로 Redis/`ngx.shared.dict`를 조회하고, secret(혹은 그 해시)을 로컬에서 비교. Vault는 이 요청 경로에 직접 끼지 않아요.
2. **secret 공급 경로**: Vault Agent 패턴처럼, **Vault가 주기적으로(또는 변경 이벤트 시) secret을 Redis/DB로 밀어 넣거나, 애플리케이션이 짧은 주기로 pull**해서 캐시를 채워요. 이게 HashiCorp가 권장하는 "Vault Agent로 로컬 캐싱해서 Vault 부하를 줄이는" 패턴과 같은 방향이에요.
3. **폐기(revocation)는 이벤트 기반으로**: 관리자가 Vault에서 secret을 회수하면, 그 이벤트를 즉시 Redis 캐시 무효화로 전파(pub/sub 등)해서 TTL을 기다리지 않게 해요.
4. **정말 민감한 소수 API(결제, 관리자 키 등)에 한해서만** Transit의 실시간 HMAC verify를 예외적으로 적용 — 트래픽이 적은 구간이라 Vault 호출 지연을 감당할 수 있는 곳에만 "진짜 verify 이관"의 이점을 누려요.

## 체크리스트

| 항목 | 권장 사항 |
|---|---|
| apiId/secret 분리 | 채택 권장 — 조회·로깅·폐기 관리가 쉬워짐 (Vault 도입 여부와 무관하게 유효) |
| Vault를 매 요청 verify에 직접 호출 | 비권장 — Redis 대비 처리량 낮고 SPOF 위험 |
| Vault Transit HMAC verify (`/transit/verify`) | pepper를 완전히 격리하고 싶은 소수의 고민감 API에 한해 적용 |
| secret 캐싱 시 폐기 반영 | Vault 이관 여부와 무관하게 TTL/즉시 무효화 이벤트 설계는 그대로 필요 |
| nginx→Vault 인증 | AppRole `role_id`(비민감)/`secret_id`(민감) 분리 + 짧은 TTL 토큰 사용, Vault Agent로 자동 갱신 |
| 장애 대응 | Vault 다운 시에도 마지막으로 캐싱된 판정으로 일정 시간 동작 가능하게(fail-open/closed 정책 사전 결정) |

## 요약

> `apiId_secret` 분리는 Vault 도입과 무관하게 그 자체로 좋은 개선이에요. 하지만 **verify 로직을 Vault로 완전히 이관**하는 건 — 단순히 Vault에서 secret을 읽어와 비교하는 방식이라면 "DB를 Vault로 바꾼 것"뿐이라 이점이 거의 없고, Transit의 실시간 HMAC 검증 API를 쓰는 진짜 이관이라 해도 **Vault의 처리량이 Redis보다 훨씬 낮아 핫패스에 직접 넣기엔 부담**돼요. 캐싱을 걸면 폐기 지연 문제가 그대로 돌아오니, **Vault는 "secret을 안전하게 보관·배포·회수하는 관제탑"으로, 실제 검증은 여전히 로컬 캐시 기반**으로 두는 하이브리드가 현실적인 절충안이에요.

Sources:
- [Transit secrets engine | Vault | HashiCorp Developer](https://developer.hashicorp.com/vault/docs/secrets/transit)
- [Transit - Secrets Engines - HTTP API | Vault | HashiCorp Developer](https://developer.hashicorp.com/vault/api-docs/secret/transit)
- [New HMAC-as-a-service feature · Issue #1373 · hashicorp/vault](https://github.com/hashicorp/vault/issues/1373)
- [Understanding Vault performance: Benchmarks from real-world workloads - HashiCorp](https://www.hashicorp.com/en/blog/understanding-vault-performance-benchmarks-from-real-world-workloads)
- [How to Benchmark Redis Performance with redis-benchmark](https://oneuptime.com/blog/post/2026-03-31-redis-benchmark-performance/view)
- [Tackling the Vault Secret Zero Problem by AppRole Authentication - HashiCorp Solutions Engineering Blog](https://medium.com/hashicorp-engineering/tackling-the-vault-secret-zero-problem-by-approle-authentication-b7a316d73380)
- [Best practices for AppRole authentication | Vault | HashiCorp Developer](https://developer.hashicorp.com/vault/docs/auth/approle/approle-pattern)
- [Key Formats & Prefixes — apikeys.guide](https://apikeys.guide/docs/implementation/key-formats-and-prefixes)
- [Stripe keys and IDs · GitHub Gist](https://gist.github.com/fnky/76f533366f75cf75802c8052b577e2a5)
- [5 best practices to get to production readiness with Hashicorp Vault in Kubernetes | Expel](https://expel.com/blog/production-readiness-hashicorp-vault-kubernetes/)
