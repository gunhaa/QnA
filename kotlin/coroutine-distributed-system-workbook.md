# Kotlin 코루틴 + 분산 시스템, 문제-답 구조의 워크북/프로젝트가 있을까?

## 5살 아이에게 설명하듯이

**코루틴(Coroutine)**은 "일꾼(스레드, Thread)을 새로 안 뽑고도 여러 일을 동시에 하는 척척박사 알바생"이에요. 원래는 일 하나 시키려면 사람을 한 명씩 새로 고용(스레드 생성)해야 해서 비싼데, 코루틴은 한 명의 알바생이 "이 일 잠깐 멈추고, 저 일 하다가, 다시 이 일로 돌아올게!"를 아주 가볍게 반복해요. 그래서 수천 개 일도 거뜬히 처리할 수 있어요.

**분산 시스템(Distributed System)**은 "여러 대의 컴퓨터가 서로 전화(네트워크)로 연락하면서 하나의 큰 일을 나눠서 하는 마을"이에요. 이 마을 사람들끼리 연락(요청/응답)을 주고받을 때, 코루틴을 잘 쓰면 "전화 걸어놓고 기다리는 동안 다른 일도 하는" 효율적인 알바생처럼 시스템을 만들 수 있어요.

질문하신 "코루틴을 분산 시스템 문맥에서 연습해볼 수 있는, 문제→풀이(예제-답변) 구조의 워크북"은 **정확히 이 조합(분산 시스템 + 워크북 형식)만 딱 맞춘 자료는 흔치 않지만**, 아래 두 갈래를 조합하면 원하시는 학습 경로를 만들 수 있어요.

## 1) 코루틴 자체를 연습하는 문제-답 구조 워크북

| 자료 | 형태 | 특징 |
|---|---|---|
| [MarcinMoskala/kotlin-coroutines-workshop](https://github.com/MarcinMoskala/kotlin-coroutines-workshop) | GitHub 실습 저장소 | Kt. Academy 워크숍용, 문제 파일 + 정답 브랜치 구조 |
| [PaulienVa/coroutines-workshop](https://github.com/PaulienVa/coroutines-workshop/blob/main/exercises/Ex3.md) | GitHub 실습 저장소 | `exercises/Ex3.md`처럼 연습문제가 마크다운으로 정리됨 |
| [Kotlin 공식 코루틴 튜토리얼](https://kotlinlang.org/docs/coroutines-and-channels.html) | 공식 문서 + 실습 | IntelliJ에서 네트워크 요청 실습, **solutions 브랜치**에 정답 제공 |
| [코틀린 코루틴의 정석 (책) - GitHub](https://github.com/seyoungcho2/coroutinesbook) | 책 + 예제 코드 저장소 | 테스트 코드로 직접 검증 가능한 실습 구조 |
| [코루틴 실습 예제 - dalinaum](https://dalinaum.github.io/coroutines-example/) | 온라인 실습 | 한국어 예제, 패스트캠퍼스 강의 연계 |

## 2) 코루틴으로 "분산 시스템스러운" 걸 실제로 만들어보는 프로젝트형 자료

| 자료 | 형태 | 특징 |
|---|---|---|
| [Ktor 공식 문서](https://ktor.io/) | 프레임워크 + 튜토리얼 | 코틀린 전용 비동기 서버 프레임워크, 코루틴 기반이라 마이크로서비스/분산 통신 실습에 적합 |
| Rock the JVM - Kotlin Coroutines & Concurrency | 유료 코스 | 병렬/동시성 애플리케이션을 손으로 만들어보는 실습 중심 강의 |
| 『코틀린 동시성 프로그래밍』(에이콘출판) | 책 | RSS 리더 프로젝트, 스레드 한정·액터·뮤텍스 등 실전 패턴 다룸 |

## 결론: "정확히 이거다" 하나는 없지만, 조합 추천

정리하면, **"분산 시스템 + 코루틴 + 문제-답 워크북"이 하나의 패키지로 딱 존재하지는 않아요.** 대신 이렇게 조합하는 걸 추천해요.

1. `kotlin-coroutines-workshop` 같은 저장소로 코루틴 문법/동시성 개념(취소, 예외 처리, `Flow`, `Channel`, `Mutex` 등)을 문제-답 형식으로 먼저 다지기
2. Ktor로 서버 2~3개(예: 주문 서비스, 재고 서비스, 게이트웨이)를 만들어서 서로 코루틴 기반 비동기 HTTP/WebSocket 통신을 시키는 **미니 분산 프로젝트**를 직접 구성 (예: 분산 카운터, 간단한 작업 큐, 채팅 서버 등)
3. 이 과정에서 `Channel`을 메시지 큐처럼, `Flow`를 이벤트 스트림처럼, 구조화된 동시성(`coroutineScope`, `supervisorScope`)을 장애 격리 패턴처럼 다루는 연습이 자연스럽게 분산 시스템 실습이 됨

## 원하시면

말씀 주시면 이 저장소(`kotlin/`) 안에 **직접 문제-답 구조의 워크북**(예: "5개 서비스로 구성된 미니 주문 시스템을 코루틴으로 구현하기" 같은 단계별 챕터)을 만들어드릴 수 있어요. 시중 자료에 없는 부분이니 맞춤 제작이 오히려 나을 수 있습니다.

---

## 출처
- [Kotlin Coroutines Workshop - MarcinMoskala](https://github.com/MarcinMoskala/kotlin-coroutines-workshop)
- [coroutines-workshop exercises - PaulienVa](https://github.com/PaulienVa/coroutines-workshop/blob/main/exercises/Ex3.md)
- [Coroutines and channels tutorial - Kotlin 공식 문서](https://kotlinlang.org/docs/coroutines-and-channels.html)
- [코틀린 코루틴의 정석 - GitHub 저장소](https://github.com/seyoungcho2/coroutinesbook)
- [코루틴 실습 예제 - dalinaum](https://dalinaum.github.io/coroutines-example/)
- [코틀린 코루틴의 정석 - 교보문고](https://product.kyobobook.co.kr/detail/S000212376884)
- [코틀린 동시성 프로그래밍 - 에이콘출판사](http://acornpub.co.kr/book/concurrency-kotlin)
- [Kotlin Coroutines & Concurrency - Rock the JVM](https://rockthejvm.com/courses/kotlin-coroutines-and-concurrency)
