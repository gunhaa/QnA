# function calling은 결국 "시스템 프롬프트 주입 + 사전 파인튜닝"이 맞을까?

## 결론부터: 거의 맞아요, 다만 한 겹이 더 있어요

5살한테 설명하면: 엄마가 "장난감 상자 목록표(함수 목록)"를 아이 방 벽에 몰래 붙여놓고(**시스템 프롬프트 주입**), 아이는 예전에 "이런 목록표를 보면 이런 식으로 말해야 해"라고 **수백 번 연습(파인튜닝)**해둔 상태예요. 그래서 실제 놀이 시간에 목록표만 보여주면, 아이가 연습한 그 말투 그대로 도구를 골라 말하는 거예요.

질문하신 두 가지 — ① 함수 정의를 시스템 프롬프트처럼 주입한다, ② 그 출력 구조(예: `<answer>` 태그 같은 형식)를 미리 예시로 파인튜닝해둔다 — **둘 다 맞습니다.** 실제로 이렇게 동작해요.

## 실제로 벌어지는 일

1. **주입 단계**: API에 `tools`(OpenAI) 또는 `tools` 파라미터(Claude)로 함수 스펙을 JSON Schema 형태로 넘기면, provider가 이걸 사람이 짠 프롬프트 템플릿에 끼워 넣어서 **숨겨진 시스템 프롬프트**로 만들어요. Claude의 경우 API가 사용자가 안 보이는 곳에서 "너는 이런 도구들을 쓸 수 있어" 라는 시스템 프롬프트를 자동으로 앞에 붙입니다(silently prepend). 겉보기엔 정확히 질문하신 대로 `function(arg1, arg2, ...)` 같은 함수 시그니처 나열에 가까운 형태예요.

2. **파인튜닝 단계**: 모델은 출시 전에 "이런 도구 목록 + 이런 사용자 요청" → "이런 특정 구조로 답하라"는 수많은 (프롬프트, 정답) 쌍으로 **지도 학습(SFT)**되어 있어요. 예를 들어 Claude는 XML 스타일 태그(`<function_calls><invoke name="...">...`)로 답하도록 훈련되어 있는데, 이게 Claude가 원래 학습 데이터에 XML이 많아서 XML을 "모국어"처럼 다루기 때문이에요. OpenAI는 JSON 형태의 `function_call` 필드로 답하도록 훈련돼 있고요. 말씀하신 `<answer>` 예시와 정확히 같은 원리 — **정해둔 태그/구조를 파인튜닝으로 몸에 익힌 것**이에요.

## 다만 한 가지 덧붙일 부분

여기서 "구조가 100% 지켜지는가"는 **두 층으로 나뉘어요**:

- **"어떤 도구를 부를지 / 어떤 태그로 감쌀지"** → 이건 여전히 순수하게 **파인튜닝된 습관**에 의존해요. 모델이 "이번엔 도구를 안 부르는 게 낫겠다"고 자유롭게 판단하는 부분이라, 여기엔 제약 디코딩이 개입하지 않아요.
- **"그 안의 파라미터 값(JSON)이 스키마 타입에 맞는가"** → strict 모드(OpenAI `strict: true`, Claude 네이티브 Structured Outputs)가 켜져 있으면, 이 부분에는 실제로 **제약 디코딩(토큰 마스킹)**이 추가로 걸려서, 파인튜닝만으로는 못 잡는 오타·타입 오류·필수 필드 누락까지 강제로 막아줘요.

그래서 정확히 표현하면: **"어떤 형식으로 말할지" 자체는 말씀하신 대로 100% 시스템 프롬프트 주입 + 사전 파인튜닝**이고, **"그 형식 안의 값이 스키마를 어기지 않는지"는 (strict 모드일 때) 추가로 제약 디코딩이 이중 잠금**을 거는 구조예요.

## 덤으로 알아두면 좋은 것들

- **왜 Claude는 JSON이 아니라 XML을 쓸까**: 우연이 아니에요. 사전학습 데이터에 XML/HTML 구조가 풍부해서 태그의 열고 닫는 짝을 "직관적으로" 더 잘 다루기 때문이라고 알려져 있어요. 반대로 OpenAI 계열은 JSON 학습 비중이 더 커서 JSON을 모국어처럼 다룹니다 — 같은 문제(구조화)를 서로 다른 "모국어"로 풀고 있는 셈이에요.
- **보안과의 연결고리**: "시스템 프롬프트 주입 + 파인튜닝"이라는 조합은 프롬프트 인젝션(prompt injection) 공격·방어 연구에서도 그대로 다뤄지는 메커니즘이에요. 도구 목록을 모델에 밀어 넣는 통로가, 공격자가 악의적 지시를 끼워 넣는 통로와 원리적으로 같기 때문에, function calling을 쓰는 에이전트 시스템에서는 프롬프트 인젝션이 특히 중요한 위협으로 취급됩니다. 이를 막기 위한 special token 필터링, DefensiveTokens(보안 목적으로 최적화된 임베딩을 가진 특수 토큰) 같은 방어 기법도 연구되고 있어요.

---

### Sources
- [Tool use with Claude - Claude Platform Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [Define tools - Claude Platform Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- [The Ultimate Guide to Agentic Tool Calling — SylphAI Blog](https://blog.sylph.ai/posts/ultimate-guide-agentic-tool-calling)
- [Fine tuning for function calling — OpenAI Cookbook](https://cookbook.openai.com/examples/fine_tuning_for_function_calling)
- [Claude Tool Use: Complete Developer Tutorial (2026) — AI for Anything](https://aiforanything.io/blog/claude-tool-use-function-calling-tutorial-2026)
