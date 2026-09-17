# "1급(first-class)"이란 무엇인가 — 일급 객체에서 "1급 개념"까지

> 배경: [The Log 분석 문서](../distributed-systems/the-log/00-overview.md)들에서 "상태는 1급 개념이 아니다", "RAFT는 복제 로그를 1급 개념으로 놓았다", "중간 결과가 1급 시민" 같은 표현이 반복됩니다. 이 "1급"이 정확히 무슨 뜻인가.

## 쉬운 설명

동네 클럽에 **정회원**과 **손님**이 있다고 해봅시다.

**정회원**은 이름표를 받고, 친구를 데려올 수 있고, 다른 사람에게 소개될 수 있고, 회원 명부에 이름이 올라가고, 언제든 새로 가입할 수 있습니다.

**손님**은 그날 그 자리에만 있을 수 있어요. 이름표도 없고, 명부에도 없고, 다른 데 데려갈 수도 없습니다.

컴퓨터공학에서 **"1급(first-class)"은 정회원**이라는 뜻입니다. **"다른 모든 것들이 누리는 권리를 똑같이 누린다"** 는 의미예요.

그리고 **"X를 1급으로 만들자"** 는 말은 곧 **"지금까지 그림자처럼 취급되던 X에게 이름표를 주고 명부에 올리자"** 는 제안입니다.

---

## 일반 설명

### 1. 어원 — Christopher Strachey, 1967

**"first-class"** 라는 용어는 영국의 컴퓨터 과학자 **Christopher Strachey**가 1967년 8월 코펜하겐의 International Summer School in Computer Programming을 위해 쓴 강의록 **"Fundamental Concepts in Programming Languages"** 에서 나왔습니다.

> **재미있는 사실:** 이 문서는 수십 년간 사적으로만 회람되다가 **2000년에야 정식 출판**되었습니다. 그럼에도 오늘날 쓰이는 프로그래밍 언어 용어의 상당수가 여기서 나왔습니다 — **L-value / R-value**, **ad hoc polymorphism**, **parametric polymorphism**, **referential transparency**, 그리고 **first-class / second-class**.

#### Strachey는 엄밀한 정의를 내리지 않았습니다

그는 **ALGOL에서 실수(real number)와 프로시저(procedure)를 대비**시키는 방식으로 개념을 제시했습니다.

```
  ALGOL에서 실수(real):                 ALGOL에서 프로시저(procedure):
  ─────────────────────────            ─────────────────────────────
  · 식(expression)에 등장 가능          · 다른 프로시저 호출에서
  · 변수에 할당 가능                       - 연산자(피호출자)로 등장하거나
  · 함수의 실인자로 전달 가능              - 실인자로 전달되는 것만 가능
                                        · 프로시저를 포함한 식을 만들 수 없음
                                        · 프로시저를 결과로 내는 식도 없음

        → 1급(first-class)                    → 2급(second-class)
```

즉 **"같은 언어 안에 사는데도 어떤 종류의 값은 다른 종류보다 권리가 적다"** 는 관찰이 출발점이었습니다.

> **용어의 비유적 출처:** "first-class citizen / second-class citizen"은 **사회의 1등 시민 / 2등 시민** 비유입니다. 참정권 등 권리가 제한된 계층을 가리키던 표현에서 왔습니다. 그래서 일부 문헌은 이 비유를 불편해하며 "first-class value"나 "first-class entity"로 부르기도 합니다. 한국어로는 **일급 객체 / 일급 시민 / 일급 함수**로 번역되며, "1급"과 "일급"이 혼용됩니다.

---

### 2. 판정 기준 — 무엇이 있어야 "1급"인가

Strachey 이후 정착된 체크리스트입니다. 모든 문헌이 동일하진 않지만 핵심은 겹칩니다.

| # | 기준 | 영어 |
|---|---|---|
| 1 | **런타임에 생성할 수 있다** | created at run time |
| 2 | **변수에 할당할 수 있다** | assigned to a variable |
| 3 | **함수의 인자로 전달할 수 있다** | passed as an argument |
| 4 | **함수의 반환값이 될 수 있다** | returned from a function |
| 5 | **자료구조에 저장할 수 있다** | stored in data structures |
| 6 | *(추가로 자주 언급)* **이름 없이도 존재할 수 있다(익명)**, **동등성 비교가 가능하다** | anonymous / comparable |

Wikipedia의 요약 정의:

> "a first-class citizen is an entity which supports all the operations generally available to other entities, typically including being passed as an argument, returned from a function, and assigned to a variable."

**핵심은 "다른 것들이 할 수 있는 걸 똑같이 할 수 있는가"** 입니다. 절대적 기준이 아니라 **그 시스템 안의 다른 개체들과 비교한 상대적 지위**입니다.

#### 함수를 예로 든 등급 비교

```java
// Java 7 이전 — 메서드는 1급이 아니었다
public int add(int a, int b) { return a + b; }

// 이런 게 불가능했음:
// var f = add;              ❌ 변수에 할당 불가
// process(add);             ❌ 인자로 전달 불가
// return add;               ❌ 반환 불가
// List<?> fs = [add, sub];  ❌ 자료구조 저장 불가
```

```javascript
// JavaScript — 함수는 완전한 1급
const add = (a, b) => a + b;        // ✅ 변수 할당
[1,2,3].map(add.bind(null, 10));    // ✅ 인자 전달
const make = () => (x) => x * 2;    // ✅ 반환
const ops = { add, sub, mul };      // ✅ 자료구조 저장
(function(){ /* ... */ })();         // ✅ 익명 생성
```

```c
// C — 함수 포인터는 "부분적으로 1급"
int (*f)(int, int) = &add;    // ✅ 할당·전달·반환·저장 가능
                              // ❌ 런타임 생성 불가 (컴파일 타임에 존재하는 함수만)
                              // ❌ 클로저(환경 캡처) 불가
                              // → 흔히 "2.5급" 정도로 평가
```

| 언어 | 함수의 지위 |
|---|---|
| Lisp, Scheme, ML, Haskell, JS, Python, Ruby, Kotlin, Swift, Rust, Go | **1급** |
| Java 8+ | ⚠️ 람다는 **함수형 인터페이스의 인스턴스**. 편의는 얻었지만 엄밀히는 객체이지 함수 타입이 아님 |
| C | ⚠️ 함수 포인터 — 런타임 생성·클로저 불가 |
| Java 7 이하, 초기 ALGOL/Pascal | **2급** |

---

### 3. 2급, 3급이라는 등급도 있습니다

Strachey의 구분을 확장해 세 등급으로 나누기도 합니다.

| 등급 | 의미 | 예시 |
|---|---|---|
| **1급 (first-class)** | 전달·반환·저장·생성 모두 가능 | JS의 함수, Python의 클래스, Scheme의 continuation |
| **2급 (second-class)** | **전달은 되지만 반환은 안 됨** | ALGOL의 프로시저, Pascal의 중첩 프로시저, C++의 레퍼런스(일부 문맥) |
| **3급 (third-class)** | **전달조차 안 되고 그 자리에서만 존재** | 많은 언어의 레이블(label), 매크로 확장 결과, Java의 패키지 |

> **2급의 대표적 원인 — "funarg problem":** 함수를 반환하려면 그 함수가 참조하던 바깥 변수(자유 변수)를 **함수보다 오래 살려둬야** 합니다. 스택 기반 메모리 관리로는 불가능하고, **클로저 + 힙 할당 + GC**가 필요합니다. ALGOL이 프로시저를 반환하지 못한 진짜 이유가 이것입니다. **즉 "1급으로 만들기"에는 대개 구현 비용이 따릅니다.** 이 점이 뒤의 일반화된 용법에서도 그대로 적용됩니다.

---

### 4. 여기서부터가 질문의 핵심 — 프로그래밍 언어 밖으로의 확장

제가 문서에서 쓴 **"1급 개념"** 은 원래 정의를 시스템 설계 전반으로 **일반화한 용법**입니다. 업계에서 널리 쓰이지만 정의가 느슨해서 혼란을 주기도 합니다.

#### 일반화된 뜻

> **"X가 1급이다" = X가 그 시스템에서 명시적으로 이름 붙은 독립 개체로 모델링되어, 참조·전달·저장·조작·검사·재사용이 가능하다. 부수적·암묵적·파생적 존재가 아니다.**

일반화된 판정 기준:

| 언어 수준 기준 | 시스템 수준으로 번역하면 |
|---|---|
| 런타임에 생성 가능 | **동적으로 만들 수 있는가** (설정 파일 수정·재배포 없이) |
| 변수에 할당 가능 | **이름을 붙여 참조할 수 있는가** |
| 인자로 전달 가능 | **다른 컴포넌트에 넘길 수 있는가** |
| 반환 가능 | **연산의 결과로 나올 수 있는가** |
| 자료구조에 저장 가능 | **영속화·목록화·질의할 수 있는가** |
| 동등성 비교 가능 | **검사·비교·테스트할 수 있는가** |

#### 반대 개념들

| "1급이 아님"의 여러 얼굴 | 뜻 |
|---|---|
| **암묵적(implicit)** | 코드/설계 안에 숨어 있고 이름이 없음 |
| **부수적(incidental)** | 다른 것의 부작용으로만 존재 |
| **파생적(derived)** | 다른 것에서 계산해낸 결과일 뿐 |
| **특수 케이스(special-cased)** | 일반 규칙이 아니라 예외 처리로만 다뤄짐 |
| **제어 흐름(control flow)** | 값이 아니라 흐름이라 붙잡아둘 수 없음 (예: 예외) |

---

### 5. 핵심 연결 개념 — Reification(구체화)

**"X를 1급으로 만든다"의 학술적 이름이 reification입니다.**

> **Reification**: "the process by which an abstract idea about a program is turned into an explicit data model or other object created in a programming language. By means of reification, something that was previously implicit, unexpressed, and possibly inexpressible is explicitly formulated and made available to conceptual manipulation."
>
> "Informally, reification is often referred to as **'making something a first-class citizen'** within the scope of a particular system."

즉 두 표현은 사실상 같은 것을 가리킵니다:

```
  "reify X"  ≡  "make X first-class"  ≡  "X를 1급으로 승격한다"

  암묵적이고 표현 불가능하던 것
        ↓ reification
  이름이 있고, 붙잡을 수 있고, 조작·검사·저장·전달 가능한 개체
```

**전형적인 reification의 예:**

| 이전 (암묵적) | 이후 (1급으로 승격) |
|---|---|
| 객체 간의 "연관 관계"가 그냥 필드 참조 | **연관(association)을 클래스로** — 자체 속성·메서드를 가진 객체 |
| 데이터베이스 변경이 내부 구현 | **changelog를 외부 구독 가능한 로그로** (= CDC) |
| 호출 스택이 런타임 내부 사정 | **continuation을 값으로** (Scheme `call/cc`) |
| 타입이 컴파일 타임에만 존재 | **타입을 런타임 값으로** (리플렉션, dependent types) |
| 인프라가 사람이 콘솔에서 하는 작업 | **인프라를 코드로** (Terraform) |

---

### 6. 제 문서들에서 쓴 "1급"의 정확한 뜻

질문의 출발점이었던 세 용례를 해설하면:

#### ① "상태(state)는 1급 개념이 아니다" — [The Log 개요](../distributed-systems/the-log/00-overview.md)

```
  통념:  상태(테이블)가 진짜이고, 로그는 크래시 복구용 보조 장치

  주장:  로그가 1급이고, 상태는 로그의 파생물(projection)
         state_now = fold(apply, initial, log[0..n])
```

**"1급이 아니다" = "근본 개체가 아니라 다른 것에서 계산해낸 결과다"** 라는 뜻입니다. 여기서 "파생적(derived)"과 짝을 이룹니다.

이 주장의 실무적 함의: **파생물은 버리고 다시 만들 수 있고, 여러 개 만들어도 되며, 나중에 새로운 종류를 추가할 수 있습니다.** 백업해야 할 건 로그뿐입니다.

#### ② "RAFT는 복제 로그를 1급 개념으로 놓고 설계했다" — [Part 1 분석](../distributed-systems/the-log/01-part1-what-is-a-log.md)

```
  Paxos:  기본 단위 = "단일 값에 대한 합의"(single-decree)
          로그는? → Multi-Paxos라는 확장으로 나중에 덧붙임 (2급)

  RAFT:   기본 단위 = "복제된 로그" 그 자체
          알고리즘을 리더 선출 / 로그 복제 / 안전성으로 분해 (1급)
```

**"1급으로 놓았다" = "모델의 기본 구성 요소로 명시적으로 삼았다"** 는 뜻입니다. 부가물이 아니라 출발점으로 삼았다는 것.

그 결과가 RAFT 논문 제목("In Search of an **Understandable** Consensus Algorithm")에 드러납니다 — **1급으로 승격하면 그것에 대해 직접 추론하고 이야기할 수 있게 됩니다.** 이것이 "1급으로 만들자"는 설계 주장의 가장 큰 이득입니다.

#### ③ "중간 결과가 1급 시민" — [Part 3 분석](../distributed-systems/the-log/03-part3-stream-processing.md)

```
  Unix 파이프  a | b | c :
      b의 출력은 c로만 흘러가고 사라짐. 이름도 없고 저장도 안 됨. (2급)

  로그 기반 그래프 :
      잡 B의 출력도 그냥 또 하나의 "로그"
      → 이름이 있고, 영속하고, 누구나 구독 가능, 되감기 가능 (1급)
```

여기서 1급 판정 기준이 문자 그대로 적용됩니다:

| 기준 | Unix 파이프 중간 결과 | 로그 기반 중간 결과 |
|---|---|---|
| 이름을 붙여 참조 | ❌ | ✅ 토픽 이름 |
| 저장·영속 | ❌ 휘발 | ✅ 보존 기간 동안 |
| 여러 소비자에게 전달 | ❌ 1:1 | ✅ 다중 구독 |
| 검사 가능 | ❌ | ✅ 아무 때나 읽어볼 수 있음 |
| 재사용 | ❌ | ✅ 되감아 재처리 |

**즉 "1급 시민"이라는 표현이 수사적 장식이 아니라 실제 판정 기준을 통과한다는 뜻**으로 쓴 것입니다.

---

### 7. 다른 분야의 "X는 1급" 용례 모음

이 표현이 얼마나 넓게 쓰이는지 보면 감이 잡힙니다.

| 분야 | 주장 | 무엇이 바뀌는가 |
|---|---|---|
| **Go / Rust** | **에러는 값(value)이다** | 예외는 제어 흐름이라 붙잡아 저장·전달할 수 없음. `error`/`Result`는 1급 값이라 변수에 담고 반환하고 자료구조에 넣을 수 있음 |
| **Erlang / OTP** | **실패(failure)가 1급** | 프로세스의 죽음이 supervisor가 관찰·처리할 수 있는 이벤트. "let it crash"가 가능해짐 |
| **Flink / Beam** | **이벤트 시간(event time)이 1급** | 시간이 처리 순서의 부산물이 아니라 데이터 모델의 일부. 워터마크·트리거로 조작 가능 |
| **Kafka Streams** | **테이블과 스트림이 동등한 1급** | `KStream ↔ KTable` 상호 변환. 어느 한쪽이 다른 쪽의 부산물이 아님 |
| **이벤트 소싱** | **이벤트가 1급** | 상태가 아니라 이벤트가 저장 대상. 상태는 파생물 |
| **Kubernetes** | **원하는 상태(desired state)가 1급** | 명령(imperative)이 아니라 선언된 리소스가 저장·조회·diff·감시 대상 |
| **Terraform / IaC** | **인프라가 1급 아티팩트** | 콘솔 클릭이 아니라 버전 관리·리뷰·테스트 가능한 코드 |
| **OpenTelemetry** | **트레이스/스팬이 1급** | 텍스트 로그에 묻힌 정보가 아니라 구조화된 조회·집계 대상 |
| **Git** | **커밋이 1급 객체** | 커밋이 해시로 주소 지정되는 불변 객체. 전달·비교·저장 가능 |
| **Docker / OCI** | **이미지가 1급** | 빌드 결과물이 태그·해시로 참조되고 레지스트리에 저장·전송 가능 |
| **Scheme** | **continuation이 1급** | `call/cc`. 호출 스택의 "나머지 계산"을 값으로 붙잡아 나중에 재개 |
| **OCaml / SML** | **모듈이 1급** | 모듈을 인자로 넘기고 반환할 수 있음 |

> **패턴이 보입니다:** "X를 1급으로 만들자"는 주장은 거의 항상 **"지금까지 다른 것의 부산물로만 존재하던 X를, 직접 이름 붙이고 조작할 수 있는 독립 개체로 승격하자"** 는 제안입니다. 그리고 그 대가로 대개 **구현 복잡도와 저장 비용**을 지불합니다(§3의 funarg problem과 같은 구조).

---

### 8. 이 표현이 설계 논증에서 강력한 이유

"X를 1급으로 만들자"는 단순한 수사가 아니라 **구체적인 결과를 예측하는 주장**입니다.

| 1급으로 승격하면 생기는 것 | 예시 |
|---|---|
| **이름이 생김 → 대화 가능** | 팀이 "그 중간 단계"가 아니라 "enriched-clicks 토픽"이라고 부를 수 있음 |
| **검사 가능 → 디버깅 가능** | 파이프라인 중간을 들여다볼 수 있음 |
| **저장 가능 → 재사용 가능** | 한 팀이 만든 중간 결과를 다른 팀이 씀 |
| **전달 가능 → 조합(composition) 가능** | 함수가 1급이면 고차 함수(map/filter/reduce)가 가능해지는 것과 동일 |
| **테스트 가능** | 값이면 단언(assert)할 수 있음. 제어 흐름은 어려움 |
| **일반 규칙 적용 → 특수 케이스 소멸** | 에러가 값이면 에러 처리에 일반 값 처리 도구를 쓸 수 있음 |

**반대로 비용도 예측 가능합니다:** 생명주기 관리(GC/보존 정책), 이름 충돌·거버넌스, 저장 비용, 구현 복잡도.

> **실무 판단:** "이걸 1급으로 만들자"는 제안을 들으면 **"승격하면 무엇을 조합·재사용·검사할 수 있게 되는가"** 와 **"그 대가로 무엇을 관리해야 하는가"** 두 가지를 물으면 됩니다. 이득이 첫 질문에 답으로 나오지 않으면 그냥 복잡도만 늘리는 제안입니다.

---

### 9. 흔한 오해 정리

| 오해 | 실제 |
|---|---|
| "1급 = 좋은 것, 2급 = 나쁜 것" | ❌ **상대적 지위 서술**일 뿐. 2급으로 두는 게 옳은 경우도 많음(단순성·성능) |
| "1급은 절대적 기준이다" | ❌ **그 시스템 안의 다른 개체와 비교한 상대 개념.** "Python에서 함수는 1급"은 "Python의 다른 값들과 같은 권리"라는 뜻 |
| "Java 8 람다로 Java도 함수가 1급이 됐다" | ⚠️ 실용적으로는 그렇지만, 엄밀히는 **함수형 인터페이스 인스턴스(객체)**. 함수 타입 자체가 언어의 타입 시스템에 없음 |
| "1급 객체 = 객체지향의 객체" | ❌ 무관. **object**는 여기서 "개체/실체"의 일반적 의미. 함수형 언어에서도 쓰는 용어 |
| "1급/2급은 함수에만 쓰는 말" | ❌ 타입·모듈·continuation·연관관계 등 무엇에든 적용 가능. 시스템 설계에도 확장 |
| "reification과 first-class는 다른 개념" | ⚠️ 밀접. **reification = 1급으로 만드는 행위(과정)**, first-class = 그 결과(상태) |
| "1급으로 만들면 항상 이득" | ❌ **구현 비용이 따름.** 함수를 1급으로 만들려면 클로저·힙 할당·GC가 필요했던 것처럼 |

---

## 한 줄 결론

> **"1급(first-class)"은 Christopher Strachey가 1967년에 ALGOL의 실수와 프로시저를 대비시키며 만든 말로, "그 시스템의 다른 개체들이 누리는 권리(생성·할당·전달·반환·저장)를 똑같이 누리는 지위"를 뜻합니다.**
>
> 시스템 설계로 확장된 **"X가 1급 개념이다"** 는 **"X가 다른 것의 부산물·암묵적 존재가 아니라, 이름 붙고 붙잡을 수 있고 조작·검사·재사용 가능한 독립 개체로 모델링되었다"** 는 뜻입니다.
>
> 그래서 "상태는 1급이 아니다"는 **"상태는 로그에서 계산해낸 파생물이다"**, "RAFT는 로그를 1급으로 놓았다"는 **"로그를 알고리즘의 부가물이 아니라 출발점으로 삼았다"**, "중간 결과가 1급 시민"은 **"파이프라인 내부 구현이 아니라 이름·영속·다중구독·재생이 가능한 공용 자산"** 이라는 뜻입니다.

---

## Sources

- [Fundamental Concepts in Programming Languages — Wikipedia](https://en.wikipedia.org/wiki/Fundamental_Concepts_in_Programming_Languages)
- [Fundamental Concepts in Programming Languages — Christopher Strachey (원문 PDF)](https://reed.cs.depaul.edu/jriely/447/assets/articles/strachey-fundamental-concepts-in-programming-languages.pdf)
- [A Foreword to 'Fundamental Concepts in Programming Languages' — Tufts](https://www.cs.tufts.edu/~nr/cs257/archive/christopher-strachey/forward.pdf)
- [First-class citizen — Wikipedia](https://en.wikipedia.org/wiki/First-class_citizen)
- [Christopher Strachey — Wikipedia](https://en.wikipedia.org/wiki/Christopher_Strachey)
- [Reification (computer science) — Wikipedia](https://en.wikipedia.org/wiki/Reification_(computer_science))
- [Unpublished paper: 'Fundamental Concepts in Programming Languages', 1967 — Bodleian Archives](https://archives.bodleian.ox.ac.uk/repositories/2/archival_objects/28510)

---

## 관련 문서

- [`distributed-systems/the-log/00-overview.md`](../distributed-systems/the-log/00-overview.md) — "상태는 1급 개념이 아니다"의 원 맥락
- [`distributed-systems/the-log/01-part1-what-is-a-log.md`](../distributed-systems/the-log/01-part1-what-is-a-log.md) — RAFT가 로그를 1급으로 모델링한 이야기
- [`distributed-systems/the-log/03-part3-stream-processing.md`](../distributed-systems/the-log/03-part3-stream-processing.md) — 중간 결과가 1급 시민이 되는 구조
- [`kotlin/`](../kotlin/) — 코틀린의 일급 함수·고차 함수
