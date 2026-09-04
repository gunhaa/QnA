# nginx에 붙은 Lua가 JIT으로 잘 처리됐는지 확인 — 이전 방법 그대로 될까?

## 결론부터

**절반은 맞고, 절반은 다릅니다.** `jit.v`/`jit.dump`라는 **도구 자체는 동일**하지만, 지난번엔 `resty` CLI로 **독립 스크립트**를 돌리는 상황이었고, 지금은 **nginx.conf로 띄운 실제 워커 프로세스**라서 **붙이는 방식**과 **운영 환경에서의 검증 방법**이 달라져요.

## 다섯 살에게 설명하듯

지난번엔 웨이터 한 명을 조용한 연습실에 따로 불러서 "레시피 외웠는지" CCTV(jit.v)를 달고 지켜봤어요. 그런데 이번엔 **손님이 계속 들어오는 실제 식당**에서, 여러 명의 웨이터(멀티 워커)가 동시에 일하고 있어요. CCTV를 달 수는 있는데, ①어느 웨이터 화면인지 구분해야 하고 ②CCTV를 계속 켜두면 웨이터가 신경 쓰여서 일이 느려지고(오버헤드) ③애초에 "장사 중에 몇 % 시간을 레시피 외운 상태로 일했는지" 알고 싶다면 CCTV 로그보다 **손님 대기시간 통계표(플레임그래프)**를 보는 게 더 실전적이에요.

## 기술적으로 풀어보면

### 1. 같은 도구를 nginx 안에서 켜는 방법

`resty -j v`처럼 CLI 옵션이 없으니, **`init_by_lua_block`**에 직접 코드로 넣어야 해요.

```nginx
http {
    init_by_lua_block {
        local verbose = false  -- true면 jit.dump(상세), false면 jit.v(요약)
        if verbose then
            require("jit.dump").on(nil, "/tmp/jit.log")
        else
            require("jit.v").on("/tmp/jit.log")
        end
        require "resty.core"
    }
}
```

이렇게 하면 워커가 뜰 때부터 트레이스 컴파일 로그가 `/tmp/jit.log`에 쌓여요. 지난번과 똑같이 `abort`(NYI로 실패), `stop -> loop`(성공) 같은 줄을 찾으면 돼요.

### 2. 하지만 nginx라서 달라지는 3가지

- **워커가 여러 개**: `worker_processes`가 4면 워커 4개가 **같은 파일에 동시에 로그를 씀** → 로그가 뒤섞이거나 서로 덮어써요. 실무에선 파일명에 PID를 넣거나(`"/tmp/jit-" .. ngx.worker.pid() .. ".log"`), 한 번에 워커 1개로 줄여서(`worker_processes 1;`) 테스트하는 걸 권장해요.
- **"핫"해지려면 실제 트래픽이 필요**: JIT은 반복 실행을 감지해야 컴파일하니까, 로그를 켠 채로 `wrk`나 `ab` 같은 부하 도구로 **실제 요청을 여러 번 흘려줘야** 트레이스가 잡혀요. 조용히 켜두기만 하면 아무 로그도 안 찍혀요.
- **운영 환경에 상시로 켜두면 안 됨**: `jit.dump`는 물론이고 `jit.v`도 매 트레이스마다 파일 I/O가 발생해서 오버헤드가 있어요. 확인 끝나면 반드시 꺼야 해요(원래 목적이 "지금 이 순간 잘 되고 있나 확인"이지, 상시 모니터링이 아니에요).

### 3. 진짜 운영 서버에서는 다른 도구가 표준: Lua CPU 플레임그래프(Flame Graph)

`jit.v` 로그는 "컴파일 됐다/안 됐다"만 알려주지, **"전체 CPU 시간 중 몇 %가 실제로 JIT 코드에서 소비됐는지"**는 안 알려줘요. 운영 중인 서버에서 이걸 정량적으로 보려면, OpenResty 창시자 agentzh(Yichun Zhang)가 만든 방식인 **SystemTap 기반 CPU 플레임그래프**가 사실상의 표준이에요.

- **`lj-lua-stacks`** (`openresty-systemtap-toolkit`/`stapxx` 안에 포함): 실행 중인 워커 프로세스에서 **인터프리터 코드와 JIT 컴파일된 코드의 스택을 모두 샘플링**해요.
- `--arg nojit=1` 옵션을 주면 **JIT 컴파일된 프레임을 일부러 제외**하고 인터프리터 실행분만 샘플링할 수 있어서, "JIT vs 인터프리터" 비율을 비교해볼 수 있어요.
- 이 샘플들을 모아 **플레임그래프**로 그리면, 어떤 함수가 CPU를 많이 먹는지 + 그게 JIT 코드인지 인터프리터 코드인지가 **한 장의 그림으로 시각화**돼요. 코드를 한 줄도 안 건드리고(non-intrusive) 운영 서버에서 바로 뜰 수 있다는 게 최대 장점이에요.
- 이 도구 역시 유지보수가 종료돼서, 지금은 **OpenResty XRay**가 같은 역할(코드 수정 없이 JIT 트레이스 + 인터프리터 + FFI 호출까지 라인 단위 플레임그래프 생성)을 하는 공식 후속 도구예요.

## 상황별 정리

| 확인하고 싶은 것 | 방법 |
|---|---|
| 특정 함수/루프가 JIT 컴파일 되는지 여부(성공/abort) | `init_by_lua_block`에 `jit.v` 켜기 (개발/스테이징) |
| 왜 특정 트레이스가 abort 됐는지 상세 원인 | `jit.dump` (개발/스테이징, 오버헤드 큼) |
| 운영 서버에서 전체 CPU 시간 중 JIT 비율이 얼마나 되는지 | `lj-lua-stacks` 플레임그래프 (+`--arg nojit=1`) / OpenResty XRay |
| 코드 수정 없이 운영 서버 실시간 진단 | OpenResty XRay (공식 권장 최신 경로) |

## 요약

> 도구는 이전에 배운 `jit.v`/`jit.dump`가 그대로 맞지만, **`resty` CLI 대신 `init_by_lua_block`에 넣어야 하고**, 멀티 워커·부하 발생·오버헤드를 신경 써야 해요. 그리고 "운영 중 실제로 얼마나 JIT 혜택을 보고 있는지" 정량적으로 확인하려면 `jit.v` 로그보다는 **CPU 플레임그래프(SystemTap 또는 OpenResty XRay)**가 실전에서 훨씬 많이 쓰이는 방법이에요.

Sources:
- [什么是 JIT · OpenResty最佳实践 (jit.v/jit.dump를 init_by_lua_block에 넣는 예시)](https://moonbingbing.gitbooks.io/openresty-best-practices/lua/what_jit.html)
- [Lua CPU Flame Graphs: Profiling LuaJIT in Production - OpenResty Official Blog](https://blog.openresty.com/en/lua-cpu-flame-graph/)
- [GitHub - openresty/openresty-systemtap-toolkit](https://github.com/openresty/openresty-systemtap-toolkit)
- [GitHub - openresty/stapxx](https://github.com/openresty/stapxx)
- [Introduction to Lua-Land CPU Flame Graphs - SegmentFault](https://segmentfault.com/a/1190000023861052)
- [openresty-best-practices/flame_graph/how.md](https://github.com/moonbingbing/openresty-best-practices/blob/master/flame_graph/how.md)
