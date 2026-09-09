# Go 문법 많이 외워야 해? 지금 Kotlin도 버거운데 Go는 나중에 하는 게 나을까?

## 5살 아이에게 설명하듯이

레고에 비유하면, **Java/Kotlin은 "레고 부품 종류가 아주 많은 큰 세트"**예요. 클래스, 상속, 제네릭, 인터페이스, 각종 문법(`suspend`, 확장 함수, null 안정성...)까지 부품 종류가 많아서 처음엔 "이 부품은 어디다 쓰는 거지?" 하고 헤매게 돼요. 특히 Java에서 Kotlin으로 넘어가면 "비슷한 세트인 줄 알았는데 부품 모양이 은근히 다 다르네?" 하고 당황하는 게 정상이에요.

**Go는 "부품 종류가 일부러 적게 설계된 미니멀 레고 세트"**예요. 키워드 개수 자체가 적고(약 25개), 클래스 상속도 없고, 제네릭도 최근에야 살짝 추가된 수준이라 "외워야 할 문법의 양" 자체는 오히려 Kotlin보다 적어요.

## 그런데 왜 헷갈릴 거라고 느껴질까 — "문법량"과 "낯섦"은 다른 문제

검색해본 자료들의 공통 의견을 정리하면:

- **문법 자체의 양(volume)은 Go가 더 적음** — 클래스 계층 설계, 제네릭 남용, 빌드 도구 전쟁 같은 게 없어서 "배울 것 자체"는 적은 편
- 다만 **패러다임이 완전히 낯설어서** 처음 며칠은 힘듦: 클래스 대신 구조체(struct)+인터페이스, 예외 대신 `(값, error)` 반환, 포인터를 직접 다뤄야 함, `goroutine`/`channel`/`defer` 같은 못 보던 키워드
- 실제 체감 타임라인 관련 자료에서는 "1주차는 문법이 다 이상해 보이지만(`defer`, goroutine, channel, 암묵적 인터페이스 구현), **3주차쯤엔 생산적으로 코드를 짤 수 있다**"는 후기가 많음 — 배울 양 자체가 적기 때문
- 반대로 Java → Kotlin은 "문법이 비슷해 보여서 쉬울 줄 알았는데" 은근히 다른 지점(널 안정성, 확장 함수, 코루틴의 `suspend`, 데이터 클래스 등)에서 오히려 더 헷갈리는 경우가 많다는 의견도 있음

즉, **"Go가 Kotlin보다 배울 문법이 많다"는 아니고, 오히려 반대에 가깝습니다.** 지금 느끼시는 어려움은 "Go가 어려워서"가 아니라 "Java와 비슷해 보이는 Kotlin이 미묘하게 달라서 오는 혼란"일 가능성이 큽니다.

## Java 사용자의 Kotlin 학습 예상 시간

지금 느끼시는 "생각보다 다르다"는 당황스러움이 얼마나 가면 가라앉을지, 자료들을 종합한 대략적인 타임라인이에요. (하루 1~2시간, 주 10~15시간 학습 기준)

| 단계 | 예상 기간 | 상태 |
|---|---|---|
| 기본 문법 적응 | **1~2주** | `val`/`var`, null 안정성(`?`, `!!`), 데이터 클래스 등 "낯선데 비슷한" 문법에 적응하는 구간 — 지금 느끼시는 당황스러움이 가장 큰 시기 |
| 실무 코드 작성 가능 | **2~4주** | 기본기(2~4주, 주 10~15시간 기준)를 갖추면 간단한 기능은 무리 없이 작성 가능 |
| 생산적으로 업무 투입 | **1~2주 (빠른 경우)** | 이미 Java로 문제 해결 경험이 있는 개발자는 1~2주 안에도 "생산적"이라고 느끼는 경우가 많음 |
| 코루틴·확장 함수 등 심화/idiomatic 활용 | **1~2개월** | `suspend`, 확장 함수, 고차 함수, sealed class 등 "코틀린다운" 스타일까지 자연스러워지는 데는 더 오래 걸림 |

즉, **"기본 문법에 익숙해지는 것"은 2~4주 정도, "코틀린답게 짜는 것"까지는 1~2개월** 정도로 보는 게 현실적이에요. 지금 겪는 혼란은 딱 1단계(1~2주 차)의 정상적인 과정이라, 조금만 더 밀어붙이면 곧 편해질 시기라고 보시면 됩니다.

## 그래서 지금 Go를 패스하고 Kotlin에 집중하는 게 맞을까?

**네, 지금 상황에서는 합리적인 선택입니다.** 이유는 문법 난이도 때문이 아니라 **동시에 두 개의 낯선 패러다임을 머릿속에서 저글링하는 것 자체가 학습 효율을 떨어뜨리기 때문**이에요.

- 지금은 "Java 사고방식 → Kotlin 사고방식" 전환 하나에 집중하는 게 우선
- Go는 나중에 배워도 **부담이 크게 늘지 않음** — 오히려 문법량이 적어서 다른 언어 하나를 이미 잘 아는 상태(지금 Kotlin을 익힌 뒤)에서 배우면 "3주 안에 생산적"이라는 체감처럼 꽤 빠르게 따라잡을 수 있음
- 지난 번 말씀드린 "Go 먼저 배우면 Kotlin 학습에 도움된다"는 조언은 **동시성 개념(채널, CSP 모델)에 한정된 이야기**였고, 지금처럼 Kotlin에 이미 발을 담근 상태라면 굳이 순서를 바꿀 필요는 없어요. 지금 하시는 Kotlin부터 어느 정도 소화한 뒤, 필요할 때 Go를 붙이는 흐름이 더 자연스럽습니다.

## 한 줄 요약

Go 문법은 오히려 적고 단순한 편(1~3주면 생산성 확보 가능)이라 "많아서 부담"이라기보다 "낯설어서 초반이 힘든" 쪽에 가깝습니다. 지금 Kotlin 학습이 버겁다면 Go는 잠시 미뤄도 나중에 크게 손해 볼 게 없으니, 지금은 Kotlin에 집중하시는 게 맞습니다.

---

## 출처
- [Learning Go in 2026: a guide for developers who already know how to code - oshy.tech](https://oshy.tech/en/blog/learn-go/)
- [Why I'm Learning Go in 2026 (A Java/Kotlin/Rust Engineer's Take) - DEV Community](https://dev.to/mihirmohapatra/why-im-learning-go-in-2026-a-javakotlinrust-engineers-take-b6e)
- [Learning Golang with a Java Background: A Developer's Journey - Medium](https://saravanastar.medium.com/learning-golang-with-a-java-background-a-developers-journey-part-i-3615aff8c983)
- [⚔️ Go vs Java: The Minimalist vs The Enterprise Veteran - DEV Community](https://dev.to/adamthedeveloper/go-vs-java-the-minimalist-vs-the-enterprise-veteran-1gg3)
- [Golang vs. Java: What Should You Pick? - Turing](https://www.turing.com/blog/golang-vs-java-which-language-is-best)
- [Learning Kotlin as a Java Developer - Medium](https://medium.com/version-1/learning-kotlin-as-a-java-developer-ee0339126822)
- [How Long You Will Take To Learn Kotlin? - Numeric Quest](https://www.numeric-quest.com/time-to-learn-kotlin/)
- [How long does it take to learn Kotlin If you know Java? - stepofweb](https://stepofweb.com/how-long-does-it-take-to-learn-kotlin-if-you-know-java/)
