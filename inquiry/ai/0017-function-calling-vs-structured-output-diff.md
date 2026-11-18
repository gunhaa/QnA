# function calling(도구 호출)이랑 구조화된 출력(Structured Output), 뭐가 다를까?

## 5살한테 설명하듯

**구조화된 출력(structured output)**은 "네가 그리는 그림은 무조건 이 틀(스키마) 모양이어야 해"라는 **규칙 그 자체**예요.

**function calling(도구 호출)**은 그 규칙을 "장난감 상자에서 도구를 하나 골라서, 그 도구가 필요로 하는 부품(파라미터)을 챙겨줘"라는 **하나의 놀이(용도)**예요.

즉, function calling은 구조화된 출력을 **써먹는 방법 중 하나**이지, 둘이 같은 레벨의 개념이 아니에요. "그림 그리는 규칙(구조화된 출력)"이 있고, 그 규칙을 적용한 "특정 놀이(도구 호출)"가 있는 거죠.

## 관계 정리

| | 목적 | 산출물 |
|---|---|---|
| **구조화된 출력** | "데이터를 프로그램이 바로 쓸 수 있는 모양으로 만들기" | 정해진 JSON 스키마 그 자체 |
| **function calling** | "모델이 외부 도구/API를 어떤 파라미터로 호출할지 정하기" | 도구 이름 + 그 도구의 파라미터(JSON) |

실제로는 **"function calling이 무엇을 할지 결정하고, 구조화된 출력이 그 데이터가 어떤 모양이어야 하는지 정의한다"**는 식으로 둘이 함께 쓰여요. 도구 호출도 결국 파라미터를 JSON 형태로 뱉어야 하니, 내부적으로 구조화된 출력 기술(스키마 강제)을 빌려 쓰는 셈이에요.

## 세팅 난이도로 보면

- **JSON 모드**: 파라미터 하나만 켜면 끝(스키마 정의 없이 "그냥 JSON으로 줘"). 제일 가벼움.
- **function calling**: 도구 스키마를 미리 정의해야 함.
- **구조화된 출력(strict)**: 위에 더해 `strict: true` 같은 옵션까지 켜서, 스키마의 모든 필드가 **항상, 정확히** 나오도록 강제.

## 그래서 "1번(프롬프팅)"과 "3번(도구 호출)"이 사실상 같은 거냐는 질문에 대해

**꼭 그렇진 않아요 — "언제 나온 방식이냐"에 따라 갈려요.**

- **초기(2023년경) function calling**: 모델이 특정 도구 호출 형식(특수 토큰)을 뱉도록 **많은 예시로 미세조정(fine-tuning)**해두고, 그걸 프롬프트로 유도하는 방식이었어요. 이때는 토큰 단위로 강제하는 게 아니라 "모델이 그렇게 하도록 훈련받고 부탁받은" 것에 가까워서, 사실상 1번(프롬프팅)과 신뢰도 면에서 비슷한 계열이었습니다. 가끔 스키마를 어기기도 했어요.
- **요즘(2026년 기준) strict 모드**: OpenAI가 `strict: true`를 켜면 function calling 내부에서도 **제약 디코딩(constrained decoding)**을 그대로 사용해서, 토큰 단계에서부터 스키마에 안 맞는 토큰을 막아버려요. Anthropic의 네이티브 Structured Outputs(`output_format`)도 마찬가지로 문법 강제 디코딩을 씁니다.

정리하면:
- **"강제(guarantee) 여부"의 진짜 경계선은 1번 vs 2번·3번이 아니라, "제약 디코딩을 실제로 쓰는가"예요.**
- 구식/비-strict function calling은 사실상 1번(프롬프팅+파인튜닝)에 가깝고,
- strict 모드가 켜진 function calling이나 네이티브 구조화된 출력은 2번(제약 디코딩)을 내부 엔진으로 쓰는 3번이라고 보면 정확해요.

즉 3번은 "겉모습(인터페이스)"이고, 그 안을 프롬프팅이 채우느냐 제약 디코딩이 채우느냐는 **구현 시점과 옵션**에 달려 있다는 게 정확한 답이에요.

---

### Sources
- [Function Calling is Structured Output — Reilly Wood](https://www.reillywood.com/blog/function-calling-is-structured-output/)
- [The guide to structured outputs and function calling with LLMs — Agenta Blog](https://agenta.ai/blog/the-guide-to-structured-outputs-and-function-calling-with-llms)
- [Structured Output as a Full Replacement for Function Calling — Medium](https://medium.com/@virtualik/structured-output-as-a-full-replacement-for-function-calling-430bf98be686)
- [Structured Outputs with LLMs: JSON Mode, Function Calling, and When to Use Each — Towards Data Science](https://towardsdatascience.com/structured-outputs-with-llms-json-mode-function-calling-and-when-to-use-each/)
- [JSONSchemaBench: A Rigorous Benchmark of Structured Outputs for Language Models (arXiv)](https://arxiv.org/pdf/2501.10868)
