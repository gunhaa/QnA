# OpenResty의 Lua는 nginx 워커의 이벤트루프를 "같이" 쓸까? / LuaJIT은 JVM처럼 단계별로 컴파일될까?

## 질문 1: OpenResty의 Lua 코드는 nginx 워커 이벤트루프를 공유해서 씀?

**네, 정확히는 "같이 쓴다"보다 "그 안에 얹혀서(embedded) 실행된다"가 더 맞는 표현이에요.**

### 다섯 살에게 설명하듯

지난번 얘기한 웨이터(워커) 한 명이 자기 주문 노트(이벤트 루프) 하나만 들고 다닌다고 했죠? OpenResty는 그 웨이터한테 "손님 요청 오면 이 레시피 카드(Lua 코드)대로 즉석 요리도 해줘"라고 시킨 거예요. 그런데 새 노트를 따로 주는 게 아니라, **원래 있던 그 주문 노트에 레시피 카드 처리도 같이 끼워 넣는** 거예요. 그래서 웨이터가 요리하다가 오래 걸리는 일(예: 냉장고에서 재료 찾기 = DB 조회)이 생기면, 멈춰서 기다리지 않고 "재료 준비되면 알려줘" 해두고 바로 다른 테이블로 가요.

### 기술적으로 풀어보면

- OpenResty는 nginx 워커 프로세스 안에 **LuaJIT VM을 하나 내장**시켜요. 이 Lua 코드는 별도의 스레드나 별도의 이벤트 루프에서 도는 게 아니라, **그 워커의 단일 이벤트 루프 위에서 코루틴(coroutine) 형태로 스케줄링**돼요.
- `ngx.socket`, `ngx.sleep`, DB 드라이버(lua-resty-mysql 등) 같은 OpenResty API로 I/O를 호출하면, 내부적으로 **논블로킹 소켓 + 코루틴 yield/resume**을 이용해 "지금 이 코루틴은 대기시키고, 이벤트 루프는 다른 연결을 처리하도록" 넘겨줘요. I/O가 끝나면 커널이 이벤트 루프에 알려주고, 해당 코루틴이 다시 깨어나 이어서 실행돼요.
- 그래서 **"이벤트 루프를 공유한다"기보다는, Lua 코드 실행 자체가 그 워커의 이벤트 루프 스케줄링 대상 중 하나로 편입된다**고 보는 게 정확해요. 별도 루프가 생기는 게 아니에요.
- ⚠️ 여기서 지난 인사이트에서 말한 함정이 다시 나와요: `os.execute()`, 순수 Lua의 `io.read()` 같은 **블로킹 함수**를 실수로 쓰면, 그 순간 이 하나뿐인 이벤트 루프 전체가 멈춰버려서 그 워커가 처리 중이던 수천 개의 다른 연결이 전부 지연돼요. 그래서 OpenResty는 반드시 `ngx.*`, `lua-resty-*` 계열의 **논블로킹 API**만 쓰도록 강제하다시피 해요.

## 질문 2: LuaJIT은 JVM의 C1 → C2처럼 단계적(tiered)으로 컴파일됨?

**아니요, 다릅니다.** LuaJIT은 JVM식 티어드 컴파일(tiered compilation)이 아니라, **인터프리터(interpreter)와 JIT 컴파일러라는 딱 두 가지 상태만 존재**하는 구조예요. 그리고 그 JIT도 "메서드 단위"가 아니라 **"트레이스(trace) 단위"**로 동작해요.

### JVM C1/C2와의 차이 (요청하신 비교)

| 구분 | JVM (C1 → C2) | LuaJIT |
|---|---|---|
| 컴파일 단위 | 메서드(method) | 트레이스(trace) — 반복문/함수 호출이 이어진 실제 실행 경로 |
| 단계 수 | 3단계 이상 (인터프리터 → C1 → C2, 그 사이에도 세부 레벨 있음) | 2단계 (인터프리터 ↔ JIT 컴파일된 머신 코드) |
| "빠르고 대충" 중간 단계 | 있음 (C1이 그 역할) | **없음** |
| 컴파일 트리거 | 메서드 호출 횟수 카운트 | 특정 루프/트레이스의 "hotcount"(핫카운트) 임계값 초과 |

### 그래서 cold 상태엔 뭘 하고, 컴파일은 어느 레벨로 바로 감?

1. **Cold(콜드) 상태**: 처음엔 무조건 **인터프리터**로 실행돼요. 이 인터프리터 자체도 어셈블리로 직접 짜여 있어서 다른 언어의 바이트코드 인터프리터보다 훨씬 빨라요.
2. **Hot(핫) 감지**: 인터프리터가 각 루프/코드 지점의 "실행 빈도(hotness)"를 해시테이블로 계속 추적해요. 어떤 루프가 임계값을 넘으면 "이제 얘 좀 자주 도네" 하고 **레코딩(recording)**을 시작해요.
3. **트레이스 레코딩**: 그 루프를 실제로 한 번 더 실행시키면서, 그 안에서 벌어지는 모든 분기(branch)와 함수 호출을 **전부 인라인(inline)해서 하나의 선형 실행 경로(linear trace)**로 기록해요. 이 과정에서 SSA(Static Single Assignment) 기반의 중간 표현(IR)으로 바로 변환돼요.
4. **바로 최적화 + 머신코드 생성**: 이 트레이스는 곧바로 최적화(불필요한 타입 체크·객체지향 디스패치 제거 등)를 거쳐 **네이티브 머신코드로 직접 컴파일**돼요. 즉, 질문하신 "바로 C2급 레벨의 컴파일이 시작 단계에서 진행되는" 쪽에 훨씬 가까워요. C1처럼 "일단 빠르게만 찍어내는" 저품질 중간 컴파일 단계가 따로 없어요.
5. **가드(Guard)와 이탈(bailout)**: 컴파일된 트레이스에는 "이 가정이 깨지면 여기서 빠져나가라"는 **가드 어서션(guarded assertion)**이 박혀 있어요. 실행 중 가정이 틀리면(타입이 바뀌는 등) 그 즉시 인터프리터로 되돌아가고(bailout), 그 지점이 또 자주 발생하면 **사이드 트레이스(side trace)**라는 걸 새로 레코딩해서 역시 한 번에 컴파일해요. 이것도 "재컴파일해서 더 최적화"가 아니라 "새로운 갈래를 또 직접 컴파일"하는 거예요.

### 한 줄 요약

> JVM은 "일단 빨리 컴파일(C1) → 통계 쌓이면 더 잘 컴파일(C2)"이라는 **점진적 승격** 구조지만, LuaJIT은 "인터프리터로 버티다가, 핫한 트레이스가 확정되면 그 자리에서 바로 최적화된 머신코드로 직행"하는 **단일 단계(single-tier) 트레이스 컴파일** 구조예요.

Sources:
- [LuaJIT official site](https://luajit.org/luajit.html)
- [LuaJIT - Wikipedia](https://en.wikipedia.org/wiki/LuaJIT)
- [LuaJIT Internals (Pt. 2/3): Fighting the JIT Compiler - pwner.gg](https://pwner.gg/blog/2022-09-13-lua-jit-part2)
- [How JIT Compilers are Implemented and Fast: Pypy, LuaJIT, Graal and More - kipply's blog](https://kipp.ly/jits-impls/)
- [Tiered Compilation in JVM - Baeldung](https://www.baeldung.com/jvm-tiered-compilation)
- [JVM JIT Compiler Deep Dive: C1, C2, and Tiered Compilation Explained](https://www.w3computing.com/articles/jvm-jit-compiler-deep-dive-c1-c2-tiered-compilation/)
