# LuaJIT이 "잘 컴파일됐는지" 확인하는 방법

## 다섯 살에게 설명하듯

지난번 얘기한 웨이터(워커)가 레시피(Lua 코드)를 외워서 빠르게 만들고 있는지(JIT 컴파일됨), 아니면 아직도 레시피 카드를 한 줄씩 읽어가며 만들고 있는지(인터프리터 상태), 우리가 밖에서는 알 수가 없어요. 그래서 **주방 CCTV(jit.v, jit.dump)**를 달아서 "지금 몇 번째 레시피를 외웠고, 몇 번째는 왜 못 외웠는지"를 실시간으로 보는 거예요.

## 기술적으로 풀어보면 — 3단계 도구

### 1. `jit.v` — "요약 로그" (제일 먼저 써볼 것)

LuaJIT에 내장된 모듈로, 트레이스(trace)가 컴파일될 때마다 **한 줄씩** 로그를 찍어줘요. "이 코드는 JIT 컴파일이 되는가/안 되는가"를 가장 빠르게 확인하는 방법이에요.

```lua
-- 스크립트 맨 위에
require("jit.v").on("/tmp/jit.log")
```

또는 resty-cli로 바로:
```sh
resty -j v my_script.lua
```

로그에는 대략 이런 정보가 찍혀요:
- `TRACE 1 start ...` — 트레이스 레코딩 시작
- `TRACE 1 stop -> loop` — 정상적으로 트레이스 완성(성공)
- `TRACE 1 abort ... -- NYI: bytecode XX` — **NYI(Not Yet Implemented)**, 즉 LuaJIT이 아직 JIT 컴파일 지원을 안 하는 문법/함수를 만나서 컴파일을 포기했다는 뜻
- `TRACE ... exit ...` — 가드(guard) 실패로 컴파일된 코드에서 인터프리터로 되돌아감(bailout)

### 2. `jit.dump` — "상세 로그" (트레이스 안까지 들여다볼 때)

`jit.v`보다 훨씬 자세하게, 각 트레이스의 **바이트코드 → IR(중간표현) → 실제 어셈블리 코드**까지 전부 덤프해줘요.

```sh
resty -j dump my_script.lua
```

트레이스가 왜 예상만큼 빨라지지 않는지, 어떤 타입 가드가 왜 걸려있는지 등을 어셈블리 수준에서 확인하고 싶을 때 써요. 다만 정보량이 많아서 처음엔 `jit.v`로 "컴파일 되는지 안 되는지"부터 걸러내고, 문제 있는 지점만 `jit.dump`로 파고드는 순서를 추천해요.

### 3. `jit.p` (프로파일러) — "운영 중인 서버에서 어디가 느린지"

Linux `perf`를 기반으로 한 통계적 프로파일러예요. CPU 샘플링으로 "어느 함수/라인에서 시간을 많이 쓰는지" 알려줘요.

```sh
resty -j p my_script.lua
```

⚠️ **주의할 점**: 이 프로파일러는 샘플링 순간 실행 위치가 JIT 컴파일된 코드 안이면, 정확한 콜스택을 못 찾고 **인터프리터로 잠깐 빠져나와서** 스택을 확인해요. 즉, JIT 코드 실행 중엔 통계가 살짝 왜곡될 수 있어요.

## 운영 중인(live) nginx/OpenResty 서버를 디버깅할 땐?

위 3개는 주로 스크립트를 직접 실행할 때(`resty` CLI) 쓰는 도구예요. 실제 서비스 중인 워커 프로세스를 건드리지 않고 진단하려면:

- **`openresty-systemtap-toolkit` / `stapxx`**: SystemTap 기반 도구 모음으로, 실행 중인 nginx 워커의 PID만 지정하면 JIT 컴파일된 코드 안에서도 **정확한 백트레이스(backtrace)**를 뽑아낼 수 있어요 (`jit.p`의 약점을 보완). GC, 공유 딕셔너리, 커넥션 풀, 요청 지연(latency) 등도 실시간으로 들여다볼 수 있어요.
- ⚠️ 다만 `openresty-systemtap-toolkit`은 현재 **유지보수가 중단**됐고, OpenResty 공식 팀은 후속작인 **OpenResty XRay**(상용 동적 트레이싱 플랫폼)로 옮겨가라고 권장하고 있어요.

## 실전 체크리스트

1. `resty -j v`로 먼저 돌려서 `abort` 로그가 있는지 확인 → 있으면 **어떤 NYI 때문에 트레이스가 깨졌는지** 파악
2. 흔한 NYI 원인: `pcall`/`coroutine.wrap`을 반복문 안에서 남발, 메타메서드 남용, 특정 표준 라이브러리 함수(예전엔 `string.format`의 일부 포맷 등), 가변 인자(`...`) 처리 방식 등 — 최신 LuaJIT 2.1 브랜치는 **트레이스 스티칭(trace stitching)** 기능으로 이런 NYI 함수를 만나도 트레이스를 통째로 포기하지 않고, 그 함수만 인터프리터로 실행한 뒤 이어서 새 트레이스를 시작하도록 개선됐어요.
3. 트레이스는 되는데 느리다 → `jit.dump`로 가드/타입 체크가 과하게 걸려있지 않은지 확인
4. 운영 서버에서 재현 안 되는 이슈 → `stapxx`(또는 OpenResty XRay)로 실제 워커 프로세스에 붙어서 진단

## 요약 표

| 도구 | 용도 | 실행 환경 |
|---|---|---|
| `jit.v` | 트레이스 성공/실패 요약 (가장 먼저 사용) | 로컬/스크립트 |
| `jit.dump` | IR·어셈블리까지 상세 덤프 | 로컬/스크립트 |
| `jit.p` | CPU 통계 프로파일링 | 로컬/스크립트 (JIT 코드 구간은 부정확할 수 있음) |
| `stapxx` / `openresty-systemtap-toolkit` | 운영 중인 실제 워커 프로세스 실시간 진단 | 프로덕션 서버 (유지보수 중단, XRay로 이전 권장) |
| OpenResty XRay | stapxx의 상용 후속 도구 | 프로덕션 서버 |

Sources:
- [The JIT Compiler's Drawback: Why Avoid NYI? - API7.ai](https://api7.ai/learning-center/openresty/avoid-lua-not-yet-implemented-features)
- [OpenResty - Debugging (official docs)](https://openresty.org/en/debugging.html)
- [OpenResty resty CLI Tutorial: From Hello World to JIT Profiling - OpenResty Official Blog](https://blog.openresty.com/en/resty-cmd/)
- [`systemtap-toolkit` and `stapxx`: How to Use Data to Solve Difficult Problems? - API7.ai](https://api7.ai/learning-center/openresty/systemtap-toolkit-and-stapxx)
- [GitHub - openresty/openresty-systemtap-toolkit](https://github.com/openresty/openresty-systemtap-toolkit)
- [GitHub - openresty/stapxx](https://github.com/openresty/stapxx)
- [GitHub - openresty/resty-cli](https://github.com/openresty/resty-cli)
