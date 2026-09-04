# nginx에 붙은 Lua(ngx_lua), 어떻게 디버깅할까?

지난 답변이 "**컴파일이 잘 됐는지**(JIT 성능)"를 보는 방법이었다면, 이번엔 "**코드 로직이 왜 이렇게 동작하는지**(버그 추적)"를 보는 일반적인 디버깅 방법이에요. 목적이 다르니 도구도 달라요.

## 다섯 살에게 설명하듯

레시피대로 요리하던 웨이터(워커)가 이상한 요리를 내놨어요. 원인을 찾는 방법은 단계별로 있어요:
1. 웨이터에게 "지금 몇 번째 줄 하고 있어?" 하고 **말로 물어보기** (로그 찍기)
2. 아예 웨이터 옆에 서서 **한 줄씩 멈춰가며** 뭘 하는지 지켜보기 (원격 디버거로 브레이크포인트)
3. 웨이터가 쓰러졌으면(크래시) **쓰러진 자리를 그대로 사진 찍어서** 감식하기 (core dump + GDB)
4. 손님이 계속 오는 바쁜 식당(운영 서버)이라 웨이터를 멈출 순 없으니, **몰래 CCTV로 훔쳐보기** (SystemTap)

## 기술적으로 풀어보면 — 상황별 4단계 방법

### 1. 로그 기반 디버깅 (가장 기본, 실무에서 제일 많이 씀)

- **`ngx.log(ngx.ERR, "값: ", tostring(v))`**: 가장 표준적인 디버깅 출력 방법이에요. nginx의 `error_log`로 그대로 남아서 레벨(DEBUG/INFO/WARN/ERR)별로 필터링할 수 있어요.
- **`lua_code_cache off;`**: 원래 OpenResty는 Lua 파일을 처음 한 번만 컴파일해서 캐싱해두는데, 개발 중엔 이걸 꺼두면 **nginx를 재시작(reload)하지 않아도** Lua 코드 수정이 바로 반영돼요. 단, 운영 환경에서는 매 요청마다 다시 컴파일하므로 절대 켜두면 안 돼요(성능 저하).
- **`lua-resty-repl`**: nginx 안에 REPL(대화형 실행 환경)을 붙여서, 실행 중인 코드의 로컬 변수·업밸류(upvalue)·전역 변수를 직접 읽고 쓸 수 있게 해주는 라이브러리예요. 브레이크포인트처럼 특정 지점에서 멈춰서 상태를 살펴볼 수 있어요.

### 2. 원격 스텝 디버거 (IDE에서 브레이크포인트 찍고 한 줄씩 실행)

- **MobDebug + ZeroBrane Studio (또는 IntelliJ/VSCode 연동)**: `mobdebug.lua`를 nginx의 Lua 경로에 넣고, 코드에 `require("mobdebug").listen()`을 넣어두면 IDE에서 원격으로 붙어서 **실제 브레이크포인트를 찍고 한 줄씩(step) 실행**할 수 있어요. 일반적인 Lua 스크립트 디버깅과 거의 같은 경험이에요.
- ⚠️ **주의**: OpenResty는 리눅스에서 표준 Lua 코루틴 대신 **"경량 스레드(light thread)"**라는 자체 스케줄링 방식을 쓰는데, 이게 일반 디버거의 코루틴 추적 로직과 충돌할 수 있어요. 그래서 요청 하나하나를 순차적으로 테스트하는 개발 단계에서는 잘 되지만, 여러 light thread가 동시에 얽히는 복잡한 상황(비동기 서브리퀘스트 등)에서는 디버거가 흐름을 놓치는 경우가 있어요.

### 3. GDB 레벨 디버깅 (크래시, 세그폴트, 네이티브 레벨 문제)

- **`openresty-gdb-utils`**: nginx 워커가 죽거나(core dump), C 레벨 문제(세그폴트 등)가 의심될 때 쓰는 GDB 확장 스크립트예요. 일반 GDB는 LuaJIT의 내부 구조(스택 프레임이 C 콜스택과 다르게 생김)를 모르기 때문에 그냥 붙이면 의미 없는 정보만 나와요. 이 유틸리티가 그 간극을 메워줘요.
  - `lbt` (Lua backtrace): 각 Lua 함수 프레임의 이름과 지역변수 값까지 덤프
  - `linfob` / `ldel`: Lua 코드 상의 브레이크포인트를 GDB에서 보고 지우기
- 살아있는 프로세스에 `gdb -p <워커PID>`로 붙어서 지금 이 순간 뭘 하고 있는지 스냅샷을 뜰 수도 있고, core dump 파일을 분석해서 "죽기 직전에 뭘 하고 있었는지" 사후 분석도 가능해요.

### 4. 운영 중인 서버 실시간 진단 (SystemTap 기반) — 이전 답변과 연결

- 지난 답변에서 다룬 **`stapxx` / `openresty-systemtap-toolkit`**이 여기서도 등장해요. 워커 프로세스를 멈추지 않고도(비침습적, non-intrusive) 실시간으로 요청 지연, GC, 커넥션 풀 상태, 특정 함수 호출 빈도 등을 관찰할 수 있어요.
- 운영 서버에서 "가끔씩만 발생하는" 버그는 재현이 어려워서 원격 디버거나 GDB로 잡기 힘든데, 이럴 때 이 방식이 유일한 대안인 경우가 많아요. 다만 앞서 말씀드렸듯 유지보수가 중단되어 **OpenResty XRay**로의 이전이 공식 권장 경로예요.

## 상황별 선택 가이드

| 상황 | 추천 방법 |
|---|---|
| 로컬 개발 중, 값 하나만 확인하고 싶다 | `ngx.log()` + `lua_code_cache off` |
| 로직 흐름을 한 줄씩 따라가고 싶다 | MobDebug + ZeroBrane/IDE 연동 |
| 실행 중인 상태를 즉석에서 들여다보고 값도 바꿔보고 싶다 | `lua-resty-repl` |
| 워커가 죽거나 세그폴트가 난다 | `openresty-gdb-utils` (+ core dump) |
| 운영 서버에서 재현 안 되는 간헐적 버그 | `stapxx` / OpenResty XRay |

## 요약

> nginx+Lua 디버깅은 "**개발 단계 vs 운영 단계**", "**로직 버그 vs 크래시**"라는 두 축으로 도구가 갈려요. 개발 중 로직 버그는 로그나 원격 디버거로, 운영 중 크래시나 재현 안 되는 문제는 GDB/SystemTap 계열로 접근하는 게 정석이에요.

Sources:
- [OpenResty - Debugging (공식 문서)](https://openresty.org/en/debugging.html)
- [GitHub - openresty/openresty-gdb-utils](https://github.com/openresty/openresty-gdb-utils)
- [GitHub - saks/lua-resty-repl](https://github.com/saks/lua-resty-repl)
- [Debugging OpenResty and Nginx Lua scripts with ZeroBrane Studio](https://notebook.kulchenko.com/zerobrane/debugging-openresty-nginx-lua-scripts-with-zerobrane-studio)
- [GitHub - pkulchenko/MobDebug](https://github.com/pkulchenko/MobDebug)
- [Debugging Lua inside Openresty inside Docker with IntelliJ IDEA - DEV Community](https://dev.to/omervk/debugging-lua-inside-openresty-inside-docker-with-intellij-idea-2h95)
- [`systemtap-toolkit` and `stapxx` - API7.ai](https://api7.ai/learning-center/openresty/systemtap-toolkit-and-stapxx)
