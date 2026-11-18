# OpenRouter가 뭐예요?

장난감 가게에 비유하면, 원래는 레고 사려면 레고 가게, 마블 피규어 사려면 마블 가게에 따로따로 가야 해요. **OpenRouter는 "이 열쇠 하나로 모든 가게 문을 열 수 있게" 만들어주는 만능 열쇠 가게**예요.

OpenAI, Anthropic, Google, Meta 등 **80개 넘는 회사의 500개 넘는 AI 모델**을, API 키 하나 + 똑같은 요청 형식(**OpenAI 호환 API**, `/chat/completions`)으로 다 부를 수 있게 통합해주는 서비스예요.

## 어떻게 동작하는지 (내부 원리)

1. 내 프로그램이 OpenRouter라는 "하나의 우체통"(단일 엔드포인트)으로 요청을 보내요.
2. OpenRouter가 요청을 보고 "이건 어느 회사 모델로 보낼지" 스스로 판단해요. 비용, 속도, 재고(가용성), 내가 설정한 우선순위를 기준으로 골라요. 이걸 **라우팅(Routing)**이라고 해요.
3. 고른 회사(예: Anthropic)의 서버가 죽어있거나 사용량 초과라면, **자동으로 다른 회사 모델로 갈아타요(Failover/자동 폴백)**. 손님이 눈치 못 채게 대신 다른 가게로 배달해주는 거예요.
4. 결과를 다시 나에게 똑같은 형식으로 돌려줘요.

## 돈은 어떻게 벌까요? (요금 구조)

- 기본적으로 각 제공사(OpenAI, Anthropic 등)의 **원래 가격 그대로** 전달(패스스루)해요. 중간에서 토큰당 웃돈을 붙이지는 않아요.
- 대신 **선불 크레딧(credit) 충전할 때 수수료 5.5%**(카드) 또는 **5%**(암호화폐, 최소 수수료 없음)를 받아요.
- **:free**가 붙은 이름의 모델은 무료로 쓸 수 있어요. ($10 이상 한번 충전하면 무료 사용 횟수 제한이 크게 늘어나요)
- **BYOK(Bring Your Own Key, 내 API 키 직접 연결)**는 월 $25,000 어치까지 무료이고, 그 이상부터 5% 수수료가 붙어요.

## 2026년 최신 소식
2026년 8월 20일, **Stripe(결제회사)에 인수**됐어요. 다만 서비스 운영 방식 자체는 그대로 유지된다고 해요.

## 한 줄 정리
OpenRouter = "AI 모델판 만능 리모컨". 여러 회사의 다양한 모델을 **키 하나, 표준 API 하나**로 골라 쓰고, 장애 시 자동으로 대체 모델로 넘어가게 해주는 **LLM 라우팅/마켓플레이스** 서비스예요.

**출처**
- [OpenRouter (r6 판) | 나무위키](https://namu.wiki/w/OpenRouter?uuid=503a4336-6121-4284-87eb-b0bdbc2bba53)
- [OpenRouter: 키 하나로 모든 LLM을 부르는 통합 API | Dale Seo](https://daleseo.com/openrouter/)
- [A practical guide to OpenRouter | Medium](https://medium.com/@milesk_33/a-practical-guide-to-openrouter-unified-llm-apis-model-routing-and-real-world-use-d3c4c07ed170)
- [OpenRouter FAQ (공식 문서)](https://openrouter.ai/docs/faq)
- [OpenRouter Pricing: How the Markup Model Works (2026)](https://www.layer3labs.io/guides/openrouter-pricing)
