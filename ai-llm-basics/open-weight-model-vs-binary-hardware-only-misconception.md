# AI 가중치 공개 = 바이너리 공개? 하드웨어만 있으면 바로 쓸 수 있나?

## 쉬운 설명

가중치 공개는 "완성된 게임 CD를 공짜로 나눠주는 것"과 비슷해요. CD(가중치)만 있으면 게임을 할 수 있을 것 같지만, 실제로는 그 CD를 돌릴 **게임기(구동 프로그램)**와 **설명서(설정값)**도 있어야 해요. 다행히 이 게임기와 설명서는 대부분 CD랑 같이 공짜로 딸려오거나 인터넷에서 쉽게 구할 수 있어서, 결국 "하드웨어 + 약간의 소프트웨어"만 있으면 쓸 수 있는 게 맞아요. 근데 CD 뒷면에 "이 게임은 특정 회사에는 못 팔아요" 같은 사용 제한 딱지가 붙어있을 수도 있다는 게 함정이에요.

## 일반 설명

질문의 비유는 **정확합니다.** 실제로 업계에서 "오픈 웨이트(open-weight) 모델은 소스코드가 아니라 컴파일된 바이너리(실행 파일)에 가깝다"는 비유를 그대로 씁니다. 다만 "하드웨어만 있으면 된다"는 부분은 정확히는 **"하드웨어 + 몇 가지 부속 소프트웨어"**로 고쳐야 합니다.

### 1. 왜 "바이너리"에 비유되는가

- 가중치(weights)는 학습이 끝난 뒤의 **숫자 파라미터 값 그 자체**다. 이걸 어떻게 학습시켰는지(학습 코드, 학습 데이터, 하이퍼파라미터, 데이터 큐레이션 방법)는 대부분 공개되지 않는다.
- 이는 소프트웨어에서 **소스코드 없이 실행 파일(.exe)만 배포**하는 것과 구조적으로 동일하다. 실행은 되지만, "왜 이렇게 동작하는지" 내부 로직을 들여다보거나 처음부터 재현할 수는 없다.
- 그래서 **"오픈 웨이트 ≠ 오픈소스"** 라는 구분이 명확히 존재한다. 오픈소스가 되려면 학습 코드, 데이터에 대한 충분한 정보, 재배포 권리까지 공개되어야 하는데, 대부분의 "공개 모델"은 가중치만 공개하고 이 나머지는 비공개로 남긴다.

### 2. 실제로 필요한 것 = 하드웨어 + α

가중치 파일 하나만 달랑 있다고 바로 돌아가지는 않는다. 최소한 다음이 더 필요하다.

- **추론 런타임(inference runtime)**: 가중치 숫자를 읽어서 실제로 행렬 연산을 수행해줄 프로그램. `llama.cpp`, `vLLM`, `Ollama`, `LM Studio` 같은 것들. GGUF 같은 포맷은 가중치 텐서와 메타데이터를 한 파일에 묶어서 이 런타임이 바로 읽을 수 있게 해준다.
- **토크나이저(tokenizer)**: 사람이 입력한 텍스트를 모델이 이해하는 토큰 ID로 바꿔주는 부분. 가중치와 별도 파일로 같이 배포되는 게 보통이다.
- **아키텍처/설정 정보(config)**: 레이어 수, 히든 차원, 어텐션 헤드 수 같은 구조 정보. 이게 있어야 런타임이 가중치를 어떤 모양으로 배치할지 알 수 있다.

다행인 점은, 이 세 가지(런타임·토크나이저·설정)는 대부분 **가중치와 함께 무료로 같이 배포되거나, 오픈소스 런타임으로 이미 존재**하기 때문에 실질적으로는 "다운로드 한 번 + 오픈소스 도구 설치"로 해결된다. 그래서 결론적으로 **"하드웨어(그리고 그 하드웨어를 충분히 돌릴 VRAM/메모리) + 무료로 구할 수 있는 소프트웨어 몇 가지"만 있으면 실행 자체는 가능**하다는 질문의 요지는 맞다. (필요한 VRAM 규모는 [이전에 다룬 문서](./llm-inference-vram-weights-vs-input-memory.md) 참고.)

### 3. 진짜 함정 — 라이선스 제약

"돌릴 수 있다"와 "마음대로 써도 된다"는 별개다. 오픈 웨이트로 공개된 모델도 상당수가 사용 제한을 건다.

- **상업적 사용 임계값**: 예를 들어 Llama Community License는 상업적 사용을 허용하지만, **월간 활성 사용자(MAU) 7억 명이 넘는 기업**에는 별도 라이선스 계약을 요구한다.
- **수용 가능한 사용 정책(Acceptable Use Policy)**: 특정 용도(불법·유해 행위 등)로의 사용을 명시적으로 금지.
- **완전 허용 라이선스도 존재**: Apache 2.0(Mistral, Qwen 등)이나 수정된 MIT 라이선스는 상업적 사용에 사실상 제약이 없는 편이지만, 특정 사용자 규모 이상에서는 모델명을 인터페이스에 표기해야 하는 등 조건이 붙기도 한다.

즉 "가중치 공개 = 바이너리 공개"라는 비유는 **기술적 재현 가능성** 측면에서는 정확하지만, 실제 사용 가능 여부는 **법적 라이선스 조건**에 별도로 걸려있다는 점이 소프트웨어 바이너리 배포와 또 다른 층위의 제약이다.

### 4. 정리

| 필요한 것 | 오픈 웨이트 공개 시 상태 |
|---|---|
| 하드웨어(GPU/VRAM) | 사용자가 직접 준비해야 함 (모델 크기에 비례) |
| 추론 런타임 | 보통 오픈소스로 별도 존재(llama.cpp 등), 무료 |
| 토크나이저·설정 파일 | 가중치와 함께 배포되는 게 일반적 |
| 학습 코드·데이터 | **대부분 비공개** — 이게 "오픈소스"와의 결정적 차이 |
| 사용 라이선스 | 모델마다 상이 — 상업적 사용 제한이 걸린 경우가 많음 |

---

### 출처
- [Open-source is NOT the same as open-weight (Gary Marcus)](https://garymarcus.substack.com/p/open-source-is-not-the-same-as-open)
- [A deep dive into open-weight AI models (Flavio Copes)](https://flaviocopes.com/open-weight-models/)
- [Kilo - Open Source vs Open Weight AI Models Explained](https://kilo.ai/open-source-vs-open-weight-models)
- [What is an Open-Weights Model? (AI21)](https://www.ai21.com/glossary/foundational-llm/open-weights-model/)
- [Open Weights vs Open Source: The Real Difference (2026)](https://geotoolbox.ai/blog/open-weights-vs-open-source)
- [Navigating the AI Licensing Labyrinth: Truly Open vs. Restricted "Open-Weight" Models (Medium)](https://medium.com/ai-simplified-in-plain-english/navigating-the-ai-licensing-labyrinth-truly-open-vs-restricted-open-weight-models-89de5c2e649d)
- [Openness in language models: open source, open weights & restricted weights (ITLawCo)](https://itlawco.com/openness-in-language-models-open-source-open-weights-restricted-weights/)
- 관련 문서: [LLM 추론 VRAM — 가중치 vs 입력 메모리](./llm-inference-vram-weights-vs-input-memory.md)
