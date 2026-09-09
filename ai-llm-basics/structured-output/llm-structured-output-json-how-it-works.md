# LLM은 어떻게 JSON/YAML 같은 "정해진 형식"으로만 답할 수 있을까?

## 5살한테 설명하듯

LLM은 원래 "다음에 올 글자(토큰)"를 하나씩 자유롭게 골라 쓰는 아이예요. 그냥 두면 색칠공부 도화지 밖으로 크레파스가 삐져나가듯, 문장이 삐뚤빼뚤해지거나 JSON 중간에 괄호를 안 닫기도 해요.

그래서 "여기서부터 여기까지만 칠해!" 하고 **틀(스키마, schema)**을 미리 그려주는 거예요. 아이가 크레파스를 도화지 밖으로 못 뻗치게, LLM이 규칙에 안 맞는 글자는 아예 못 고르게 막아버립니다.

## 실제로 막는 방법 3가지

1. **그냥 부탁하기 (프롬프트 유도)**
   "JSON으로만 답해줘" 라고 말로 부탁하는 방식. 제일 쉽지만 가끔 아이가 약속 깜빡하듯 형식을 깨뜨려요. 실제로 스키마 강제 없이 JSON을 요청하면 **8~15%는 실패**한다는 벤치마크 결과도 있어요.

2. **문법으로 원천 봉쇄 (제약 디코딩, constrained/grammar-constrained decoding)**
   이게 핵심 기술이에요. LLM이 다음 토큰을 고를 때마다, "지금 이 위치에서 문법(JSON 스키마)상 허용되는 토큰이 뭔지"를 **유한 상태 기계(finite state machine)**로 미리 계산해서, 규칙에 안 맞는 토큰의 확률을 0으로 지워버려요(마스킹). 그래서 애초에 틀린 글자를 뽑을 수가 없어요 — 크레파스를 도화지 경계선에서 물리적으로 멈추게 하는 셈이죠. Outlines, Guidance, XGrammar, llama.cpp의 grammar 기능 같은 오픈소스 도구들이 이 방식을 씁니다.

3. **도구(함수) 호출로 위장하기 (tool use / function calling)**
   Anthropic(Claude)의 전통적인 방식이에요. "이런 입력값을 받는 도구가 있다"고 스키마를 정의해두면, 모델이 그 도구를 "호출"하는 형태로 답을 만들면서 자연스럽게 정해진 구조를 따르게 돼요.

## 2026년 현재 상황

- OpenAI는 2024년 8월부터 API에 JSON 스키마를 통째로 넘기면 그대로 지켜주는 **Structured Outputs**를 제공 중이고, 신뢰도는 약 **99.9%**예요.
- Anthropic도 2026년 2월 4일, `output_format` 파라미터를 통한 네이티브 **Structured Outputs**를 정식 출시(GA)했어요. 기존 tool use 방식의 신뢰도는 약 99.8% 수준이었고, 이제는 tool 흉내가 아니라 문법 강제 디코딩을 직접 사용해요. (Sonnet 4.5, Opus 4.1부터 지원, Haiku 4.5는 추후 지원 예정)
- vLLM, Ollama, SGLang 같은 오픈소스 추론 엔진들은 이미 1년 넘게 grammar-constrained decoding을 지원해왔어요.

## 한 줄 요약

말로 부탁하는 건 "약속"이고, 제약 디코딩(constrained decoding)은 "물리적으로 못 벗어나게 막는 것"이에요. 요즘 LLM API들은 후자를 기본 제공해서 JSON/YAML 출력이 거의 100% 스키마를 지키게 됐습니다.

---

### Sources
- [LLM Structured Output in 2026: Stop Parsing JSON with Regex and Do It Right](https://dev.to/pockit_tools/llm-structured-output-in-2026-stop-parsing-json-with-regex-and-do-it-right-34pk)
- [Flexible and Efficient Grammar-Constrained Decoding (arXiv)](https://arxiv.org/pdf/2502.05111)
- [JSONSchemaBench: A Rigorous Benchmark of Structured Outputs for Language Models (arXiv)](https://arxiv.org/pdf/2501.10868)
- [Reliable JSON from Any LLM: Pydantic + Zod (2026) | TECHSY](https://techsy.io/en/blog/llm-structured-outputs-guide)
- [Anthropic boosts Claude API with Structured Outputs](https://tessl.io/blog/anthropic-brings-structured-outputs-to-claude-developer-platform-making-api-responses-more-reliable)
- [The guide to structured outputs and function calling with LLMs — Agenta Blog](https://agenta.ai/blog/the-guide-to-structured-outputs-and-function-calling-with-llms)
- [Structured Output and JSON Mode Guide 2026 - TokenMix Blog](https://tokenmix.ai/blog/structured-output-json-guide)
