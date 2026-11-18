# 테스트의 "오라클(Oracle)"이란?

## 쉬운 설명

시험 채점표 같은 거예요. 학생이 답을 써내면, 선생님은 미리 갖고 있는 "정답지"를 보고 맞았는지 틀렸는지 판단하죠. 그 정답지가 바로 오라클이에요. 근데 문제는 — 답이 여러 개 있을 수 있는 서술형 문제라면, 애초에 "정답지"를 만드는 것 자체가 어렵다는 거예요. 이게 테스트 세계의 큰 골칫거리(오라클 문제)예요.

## 일반 설명

### 정의

**테스트 오라클(Test Oracle)**은 테스트를 실행한 뒤 나온 실제 결과(actual output)가 **맞는지 틀린지를 판정하는 메커니즘**을 말한다. 즉 "기대되는 동작이 무엇인지"를 정의하고, 그 기준과 실제 출력을 비교해 pass/fail을 가르는 **판정 기준 그 자체**다. `assertEquals(expected, actual)`에서 `expected` 값을 어떻게 얻어내는가, 혹은 그 비교 로직 자체가 오라클에 해당한다.

### 오라클의 종류

- **명세 기반 오라클(Specified Oracle)**: 요구사항 문서, 공식 명세(formal specification), 인수 조건(acceptance criteria)에서 직접 유도한 기대값. 가장 신뢰도가 높지만 명세가 애매하거나 없으면 쓸 수 없다.
- **파생 오라클(Derived Oracle)**: 별도의 독립적인 구현이나 과거 실행 결과에서 기대값을 뽑아내는 방식.
- **의사 오라클(Pseudo Oracle)**: "정답"이 아니라 **비교 대상**을 기준으로 삼는 방식. 이전에 다룬 [골든 테스트/골든 마스터 테스트](./golden-test-golden-master-testing.md)가 대표적 예 — "예전 출력과 같은가"만 확인할 뿐, 그 출력 자체가 옳다는 보장은 없다. 리팩터링 전후 동작이 같은지 확인할 때 특히 유용하다.
- **인간 오라클(Human Oracle)**: QA·도메인 전문가가 "이 결과가 그럴듯한가"를 판단. 자동화하기 어려운 애매한 케이스에서 최후 수단으로 쓰인다.
- **부분 오라클/무오라클(Partial/No Oracle)**: 완전한 정답은 모르지만, 최소한 "크래시 안 남", "일정한 불변식(invariant)은 지킴" 정도만 확인하는 방식.

### 오라클 문제(The Oracle Problem)

소프트웨어 테스팅의 근본적인 난제 중 하나로 꼽히는 것이 바로 **오라클 문제**다: "임의의 테스트 케이스에 대해 올바른 기대 결과가 무엇인지를 결정하는 것 자체가 어렵다"는 문제. 특히 다음 상황에서 두드러진다.

- 복잡한 알고리즘이라 사람이 손으로 정답을 계산하기 어려운 경우
- 부동소수점 연산, 이미지/오디오 처리처럼 "완전히 동일"이 아니라 "충분히 비슷함"만 정의 가능한 경우
- **머신러닝/LLM 출력**처럼 애초에 "유일한 정답"이 존재하지 않는 경우 — 지난번 다룬 [AI 평가 방법의 한계](../ai-llm-basics/ai-model-evaluation-methods-and-limitations.md), [인간 평가자 불일치 문제](../ai-llm-basics/human-evaluator-inconsistency-ground-truth-limitation.md)와 본질적으로 같은 문제다. AI 평가에서 "정답이 하나가 아니다"라고 했던 것이, 테스팅 관점에서는 곧 "오라클을 정의할 수 없다"는 뜻이다.

### 오라클 문제를 완화하는 대표 기법

- **메타모픽 테스팅(Metamorphic Testing)**: 입력과 출력 사이의 절대적 정답을 모를 때, 대신 **입력을 체계적으로 변형했을 때 출력들 사이에 성립해야 할 관계(metamorphic relation)**를 정의해서 검증하는 방식. 예: "정렬 함수에 같은 리스트를 뒤집어 넣어도 정렬 결과는 똑같아야 한다"처럼, 정답 자체는 몰라도 관계는 알 수 있는 경우에 유용하다. 최근에는 이 관계(MR) 자체를 LLM이 추론·생성하도록 자동화하는 연구도 진행 중이다.
- **차등 테스팅(Differential Testing)**: 같은 입력을 서로 다른 구현체(예: 다른 라이브러리, 다른 버전, 다른 플랫폼)에 넣어 출력을 비교. 서로 다르면 둘 중 하나(또는 둘 다)에 버그가 있다는 신호로 삼는다.
- **의사 오라클(골든 마스터)**: 위에서 설명한 대로, "정답"이 아니라 "이전 동작과의 일치"로 대체.
- **LLM-as-oracle**: 최근에는 LLM 자체를 오라클로 활용하는 연구도 활발하다. 이는 지난번 다룬 **LLM-as-a-judge**와 사실상 같은 개념을 테스팅 분야 용어로 부른 것 — 정답을 정의하기 어려운 출력(자연어 생성, UI 스타일 등)에 대해 LLM이 "이 결과가 타당한가"를 대신 판정하게 한다. 다만 이 역시 앞서 다룬 LLM 판정자의 편향(장문 편향, 자기 선호 등) 문제를 그대로 안고 있다.

### 정리

| 개념 | 한 줄 요약 |
|---|---|
| 테스트 오라클 | pass/fail을 가르는 "기대값 판정 기준" 그 자체 |
| 오라클 문제 | 그 기준을 정의하는 게 애초에 어려운 경우가 많다는 근본적 난제 |
| 골든 마스터 테스트 | 오라클 문제를 "이전 결과와의 동일성"으로 우회하는 의사 오라클 기법 |
| 메타모픽/차등 테스팅 | 절대 정답 대신 "관계"나 "다른 구현체와의 비교"로 오라클을 대체 |
| LLM-as-oracle (LLM-as-judge) | 정답이 불명확한 출력에 LLM 판정을 오라클로 사용 — AI 평가 한계와 동일한 문제를 공유 |

---

### 출처
- [Test Oracle Tutorial: Definition, Types, and Applications (ZetCode)](https://zetcode.com/terms-testing/test-oracle/)
- [What is Test Oracle in Software Testing? (testRigor)](https://testrigor.com/blog/what-is-test-oracle-in-software-testing/)
- [The Oracle Problem in Software Testing: A Survey (IEEE)](https://ieeexplore.ieee.org/document/6963470/)
- [Retromorphic Testing: A New Approach to the Test Oracle Problem (arXiv)](https://arxiv.org/pdf/2310.06433)
- [Intramorphic Testing: A New Approach to the Test Oracle Problem (arXiv)](https://arxiv.org/pdf/2210.11228)
- [LLM-Based Test Oracles: Source-of-Authority Taxonomy—A Systematic Literature Review (arXiv)](https://arxiv.org/html/2607.05031)
- [Towards metamorphic testing with LLM-based workflows (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S0950584926001394)
- [Test Oracle Automation: LLM and Hybrid Methods](https://www.emergentmind.com/topics/test-oracle-automation)
- [Test Oracles (GeeksforGeeks)](https://www.geeksforgeeks.org/test-oracles/)
