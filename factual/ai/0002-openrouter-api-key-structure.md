# OpenRouter의 API 키 구조, 무료/유료는 정확히 어떻게 다를까?

결론부터: **절반은 맞고 절반은 달라요.** 무료도 "OpenRouter 자체 API 키"는 필요해요. 다만 유료 제공사(OpenAI 등)에 낼 키는 필요 없다는 뜻이에요.

## 무료(:free) 모델: 열쇠는 필요하지만, 문지기가 대신 내줘요

장난감 가게(OpenRouter)에 들어가려면 **입장권(OpenRouter 자체 API Key)**은 있어야 해요. 이건 이메일/깃허브로 그냥 가입하면 카드번호 없이 바로 받을 수 있어요.

- 입장권만 있으면 이름 뒤에 `:free`가 붙은 모델은 **크레딧(돈) 잔액이 0원이어도** 쓸 수 있어요.
- 대신 문지기가 손님을 너무 많이 안 들여보내려고 **속도 제한(Rate Limit)**을 걸어요: 분당 20회, 크레딧을 한 번도 안 채운 계정은 하루 50회, $10 이상 한 번이라도 충전한 이력이 있으면 하루 1,000회.
- 여기서 실제로 OpenAI/Anthropic 같은 제공사 쪽 비용은 **OpenRouter가 대신 부담**하는 구조예요(무료로 풀린 모델이거나, 제공사와의 자체 계약으로 커버). 사용자는 그 뒷단을 신경 안 써도 돼요.

**정정**: "API 키 필요 없이"가 아니라 → **"OpenRouter 키는 필요하지만, 제공사(OpenAI 등) 키는 필요 없다"**가 정확해요.

## 유료: 두 가지 갈래길이 있어요

### 1) BYOK (Bring Your Own Key, 내 열쇠 직접 꽂기)

내가 이미 갖고 있는 **OpenAI/Anthropic 등의 개인 API 키**를 OpenRouter에 등록해서 써요.

- 요청이 오면 OpenRouter는 그냥 "택배 중간 배송원" 역할만 해요. 실제 요금은 **내 제공사 계정에서 직접 청구**돼요.
- OpenRouter는 이걸 중개해준 대가로 **수수료 5%**만 받아요 (매달 첫 100만 건 요청까지는 무료, 그 이후부터 부과).
- 장점: 내가 제공사와 이미 맺은 할인/약정 요금이 있다면 그대로 적용됨. 특정 키가 막히면 OpenRouter가 같은 모델을 지원하는 다른 제공사로 자동 전환도 해줘요.

### 2) 크레딧 충전 (Pooled Credit, 미리 돈을 채워두기)

사용자의 이해처럼 "OpenRouter가 매칭 계정을 새로 만들어서 연결해준다"는 건 **정확한 표현은 아니에요.** 실제로는:

- OpenRouter가 **이미 자기 명의로 여러 AI 회사(OpenAI, Anthropic 등)와 대량 계약을 맺어둔 자체 계정(공용 창고)**을 갖고 있어요.
- 내가 크레딧을 충전하면, 그건 "OpenRouter의 공용 창고를 쓸 수 있는 포인트"를 사는 거예요. 요청 하나가 처리될 때마다 그 창고 재고(제공사 원가)를 쓰고, 내 포인트(크레딧) 잔액에서 그만큼 차감돼요.
- 즉, **나를 위한 새 계정을 매번 만드는 게 아니라, 이미 존재하는 OpenRouter의 대표 계정을 다 같이 나눠 쓰는 구조(풀링, Pooling)**예요.
- 가격은 제공사 원가 그대로(마크업 없음)이고, OpenRouter는 **크레딧을 충전할 때만 5.5% 수수료**를 가져가요.

## 표로 정리

| 구분 | 필요한 키 | 실제 비용 청구처 | OpenRouter 수익 |
|---|---|---|---|
| 무료(:free) | OpenRouter 키만 | OpenRouter가 부담(자체 계약/무료 제공) | 없음 (충전 유도용) |
| BYOK | 내 제공사 키 + OpenRouter 키 | 내 제공사 계정에 직접 청구 | 요청당 5% (월 100만 건 초과분) |
| 크레딧 충전 | OpenRouter 키만 | OpenRouter의 공용(풀링) 계정에서 처리, 내 크레딧 잔액 차감 | 충전 시 5.5% |

**출처**
- [OpenRouter FAQ (공식)](https://openrouter.ai/docs/faq)
- [BYOK | Use Your Own Provider Keys with OpenRouter (공식 문서)](https://openrouter.ai/docs/use-cases/byok)
- [Free Models Router | OpenRouter (공식)](https://openrouter.ai/openrouter/free)
- [OpenRouter API Key Free: limits, free routes, paid access, and BYOK](https://www.datastudios.org/post/openrouter-api-key-free-limits-free-routes-paid-access-and-byok)
- [OpenRouter Pricing: Fees, Credits & BYOK Explained | Amnic](https://amnic.com/blogs/openrouter-pricing)
