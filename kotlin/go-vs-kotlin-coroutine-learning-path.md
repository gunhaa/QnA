# Go랑 Kotlin, 코루틴/동시성 관점에서 많이 다를까? Go 먼저 배우면 Kotlin이 빨라질까?

## 5살 아이에게 설명하듯이

**Go의 고루틴(Goroutine)**은 "태어날 때부터 여러 명이 동시에 뛰어놀 수 있게 설계된 운동장"이에요. 언어 자체가 "얘들아 다 같이 놀아!"(`go 함수()`)라고 한 줄만 쓰면 알아서 가볍게 동시에 실행시켜줘요. 놀이터 규칙(동시성 모델)이 태어날 때부터 몸에 배어 있는 아이 같아요.

**Kotlin의 코루틴(Coroutine)**은 원래 혼자 노는 걸 좋아하던 아이(JVM/Java)한테 "얘들아 같이 놀아도 돼, 여기 놀이 도구(`kotlinx.coroutines` 라이브러리) 줄게"라고 나중에 가르쳐준 느낌이에요. 언어 문법(`suspend` 키워드)의 도움은 받지만, 실제 "동시에 노는 방법"은 라이브러리가 담당해요.

두 놀이터 다 **"채널(Channel)로 편지를 주고받으며 여러 명이 동시에 일한다"**는 근본 철학(CSP, Communicating Sequential Processes 모델)은 같아요. 그래서 한쪽을 배우면 다른 쪽 개념을 이해하기가 확실히 쉬워져요.

## 실제로 얼마나 다른가 — 핵심 비교표

| 항목 | Go (Goroutine) | Kotlin (Coroutine) |
|---|---|---|
| 위치 | **언어/런타임에 내장** — `go` 키워드 하나로 끝 | **라이브러리(kotlinx-coroutines)** — JVM 위에 얹힌 기능 |
| 가벼움 | 초기 스택 약 4KB, 수만~수십만 개도 거뜬 | 스레드보다 훨씬 가볍지만, JVM 객체 오버헤드가 약간 있음 |
| 취소/구조화 | 명시적으로 `context.Context`를 손으로 전달해야 함 | **구조화된 동시성(Structured Concurrency)**이 언어 설계에 내장 — `coroutineScope`가 자식 코루틴 생명주기를 자동 관리 |
| 에러 처리 | 함수가 `(결과, error)`를 반환하는 관례 (예외 없음) | JVM 예외(Exception) 기반, `try/catch`와 `CoroutineExceptionHandler` |
| 채널 | 언어 문법에 내장 (`ch := make(chan int)`) | 라이브러리 타입 (`Channel<Int>`) — 문법은 비슷하지만 언어 코어 기능은 아님 |
| 패러다임 | 절차적/단순함 지향 (클래스 없음, 제네릭도 최근에야 도입) | 객체지향+함수형 하이브리드, JVM 생태계(Spring 등) 전면 활용 |

## Go를 먼저 배우면 Kotlin이 빨라지나?

**개념적으로는 네, 확실히 도움됩니다.** 다만 "빨라지는 부분"과 "안 빨라지는 부분"이 나뉘어요.

### 빨라지는 부분 (개념 전이가 잘 됨)
- **"동시성으로 생각하는 습관"** 자체 — 순차 코드 대신 "여러 작업이 동시에 진행된다"는 사고방식
- **채널 기반 통신 패턴** — "공유 메모리를 잠그기(lock)보다 메시지를 주고받기"라는 CSP 철학
- **분산 시스템 감각** — Go로 여러 goroutine이 채널로 통신하는 걸 연습해두면, Kotlin의 `Channel`/`Flow`도 "아, 이거 Go에서 봤던 그 패턴이네"라며 빠르게 이해됨
- 실제로 이 전이를 도와주는 자료도 있어요: [gotlin (valbaca)](https://github.com/valbaca/gotlin) — Go의 goroutine 예제를 Kotlin 코루틴으로 1:1 변환해서 보여주는 프로젝트라, "Go로 배운 걸 Kotlin으로 매핑"하기에 딱 좋습니다.

### 안 빨라지는 부분 (오히려 새로 배워야 함)
- Kotlin의 **구조화된 동시성** 개념(스코프, `Job` 트리, 부모-자식 취소 전파)은 Go에는 없는 개념이라 새로 익혀야 함
- Go는 예외가 없고 값 반환으로 에러 처리하는 반면, Kotlin/JVM은 예외 기반이라 사고방식 전환 필요
- Kotlin은 JVM 위에서 동작하므로 Spring, Ktor 같은 JVM 생태계 지식이 추가로 필요함 (Go는 표준 라이브러리만으로도 웹 서버가 잘 됨)
- 문법 자체(제네릭, 확장 함수, 널 안정성 등)는 Go와 스타일이 많이 달라서 별도 학습 필요

## 왜 Go 쪽에 분산 시스템 예제가 유독 많아 보이나

말씀하신 체감이 맞습니다. **Kubernetes, Docker, etcd, Prometheus, Temporal, CockroachDB** 등 유명 분산 시스템 인프라의 상당수가 Go로 작성돼 있고, Go 자체가 "클라우드 네이티브 마이크로서비스"를 목표로 설계된 언어라 관련 튜토리얼/오픈소스 예제가 압도적으로 많아요. 반면 Kotlin은 원래 안드로이드 언어로 출발했고, 서버 분산 시스템 쪽은 상대적으로 최근(Ktor, Spring Kotlin) 부상한 영역이라 자료가 적은 편입니다.

## 결론 및 추천 학습 순서

1. **Go로 동시성/분산 시스템의 "개념"을 먼저 익히기** — goroutine, channel, `select`, context 취소 패턴 등은 문법이 단순해서 개념 학습에 최적
2. Go로 미니 분산 프로젝트(간단한 워커 풀, pub/sub, 분산 카운터 등) 한두 개 직접 구현
3. 그다음 **Kotlin으로 넘어가서 "이건 Go의 뭐랑 똑같은 개념이지?"라며 매핑**하며 학습 — 이때 `gotlin` 저장소 같은 대조 자료가 큰 도움이 됨
4. Kotlin에서 추가로 필요한 것(구조화된 동시성, JVM 예외 모델, Ktor/Spring)만 새로 학습

즉, **"Go를 배우면 Kotlin이 완전히 공짜로 빨라진다"는 아니지만, 동시성/분산 시스템 개념의 8할은 미리 다지고 가는 셈이라 확실히 유리한 경로**입니다.

---

## 출처
- [Choosing Between Go and Kotlin/Java: A Functional Lens on Scalable Architectures - Medium](https://medium.com/@vinodjagwani/choosing-between-go-and-kotlin-java-a-functional-lens-on-scalable-architectures-2e030824df99)
- [gotlin - Kotlin Coroutine examples inspired by Go's Goroutines - GitHub](https://github.com/valbaca/gotlin)
- [gotlin - understanding Kotlin coroutines better via goroutines - valbaca's blog](https://valbaca.com/code/2023/04/26/gotlin.html)
- [IMO, Kotlin coroutines are better of Go's goroutines - Hacker News](https://news.ycombinator.com/item?id=47420064)
- [Kotlin Vs Golang: Picking The Right Fit For Your Needs - DhiWise](https://www.dhiwise.com/post/kotlin-vs-golang-make-the-best-decision-for-your-team)
- [Kotlin vs. Go: A Comparison of Two Modern Languages - Dopebase](https://dopebase.com/blog/kotlin-go-comparison-modern-languages)
