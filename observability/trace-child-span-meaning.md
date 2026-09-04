# 트레이스(Trace) 시스템에서 "자식 스팬(Child Span)"이란?

## 다섯 살에게 설명하듯

손님이 식당에 들어와서 "오늘의 코스요리 주세요"라고 주문했어요. 이 **주문 전체를 처리하는 일**이 하나의 **스팬(span)**이에요 — 시작 시간, 끝난 시간, "코스요리 처리"라는 이름표가 붙어요.

그런데 이 주문을 처리하려면 주방장이 여러 하위 작업을 시켜요: "야채 손질해!(작업 A)", "고기 구워!(작업 B)", "디저트 준비해!(작업 C)". 이 각각의 하위 작업도 시작·끝 시간이 있는 **작은 스팬들**이에요. 그리고 이 작은 스팬들은 전부 "이 큰 주문 처리 작업 때문에 생겨난 일"이라는 꼬리표를 달고 있어요. 이 꼬리표가 바로 **"나는 저 부모(parent) 스팬의 자식(child) 스팬이야"**라는 관계 표시예요.

## 기술적으로 풀어보면

### 1. 스팬(Span)이란

**하나의 시간이 걸리는 작업 단위**를 기록한 데이터예요. HTTP 요청 하나, DB 쿼리 하나, 메시지 큐 발행 하나, 백그라운드 작업 한 단계 등이 각각 스팬이 될 수 있어요. 각 스팬은 시작 시각, 종료 시각, 이름, 속성(attribute), 상태(성공/실패) 등을 가져요.

### 2. 부모-자식 관계가 생기는 원리

- 모든 스팬은 **고유한 스팬 ID(Span ID)**와, **자신을 만든 스팬을 가리키는 부모 스팬 ID(Parent Span ID)**를 가지고 있어요.
- **부모 스팬(parent span)**이 먼저 시작되고, 그 안에서 다른 함수를 호출하거나 다른 서비스에 요청을 보내면, 그 하위 작업이 **자식 스팬(child span)**이 되면서 부모의 스팬 ID를 자기 컨텍스트 안에 담아가요.
- 이 관계가 없는, **가장 최초의 스팬**을 **루트 스팬(root span)**이라고 불러요 (부모가 없음). 보통 사용자 요청이 시스템에 처음 진입하는 지점(예: API Gateway가 받은 최초 HTTP 요청)이 루트 스팬이에요.
- OpenTelemetry 공식 스펙에서는 **트레이스(trace)를 "스팬들로 이루어진 방향성 비순환 그래프(DAG, Directed Acyclic Graph)"**로 정의해요. 실무에서는 보통 트리(tree) 구조로 시각화돼요 — 꼭대기에 루트 스팬 하나, 그 아래로 자식 스팬들이 쭉 뻗어나가는 모양이에요.

### 3. 부모 스팬 하나에 자식이 여러 개일 수도 있음

- 순차적으로 실행된 하위 작업들(DB 조회 → 캐시 저장 → 응답 반환)도 각각 자식 스팬이 되고,
- 병렬로 동시에 실행된 하위 작업들(여러 마이크로서비스에 동시에 요청 보내기)도 전부 같은 부모의 자식 스팬이 돼요.
- 그래서 트레이스를 시각화하면(예: Jaeger, Zipkin, Grafana Tempo UI) **"어떤 작업이 얼마나 걸렸고, 그중 어디서 병목이 생겼는지"**를 계층 구조(막대 그래프처럼 겹쳐진 타임라인)로 한눈에 볼 수 있어요.

### 4. 서비스 경계를 넘어갈 때는? — 컨텍스트 전파(Context Propagation)

마이크로서비스 환경에서 자식 스팬은 같은 프로세스 안에서만 생기는 게 아니에요. 서비스 A가 서비스 B를 HTTP/gRPC로 호출하면, A의 스팬 컨텍스트(트레이스 ID + 스팬 ID)를 **요청 헤더에 실어서(injection)** B로 넘겨줘요. B는 그 헤더를 읽어서 "내가 만들 스팬의 부모는 A가 보낸 이 스팬이구나"를 알고 자식 스팬을 만들어요. 이 메커니즘 덕분에 **서비스 여러 개를 거쳐도 하나의 트레이스 ID 아래 부모-자식 관계가 끊기지 않고 이어져요.**

## 요약 표

| 용어 | 의미 |
|---|---|
| Trace (트레이스) | 하나의 요청이 시스템을 거치며 만들어낸 스팬들의 전체 모음 (트리/DAG) |
| Span (스팬) | 하나의 시간 단위 작업 (시작~끝) |
| Root Span (루트 스팬) | 부모가 없는 최초 스팬 (트레이스의 시작점) |
| Parent Span (부모 스팬) | 다른 작업을 파생시킨 상위 스팬 |
| Child Span (자식 스팬) | 부모 스팬 때문에 생겨난 하위 작업의 스팬. 부모의 Span ID를 컨텍스트에 담고 있음 |
| Context Propagation | 서비스 경계를 넘어 트레이스 ID/스팬 ID를 전달하는 메커니즘 |

## 한 줄 요약

> **자식 스팬**은 "이 작업은 더 큰 작업(부모 스팬)의 일부로서 발생했다"는 **인과관계(causal relationship)**를 명시적으로 기록한 하위 작업 단위예요. 이 부모-자식 연결고리들이 모여서 하나의 요청이 시스템 전체를 거쳐간 전체 여정(트레이스)을 트리 구조로 재구성할 수 있게 해줘요.

Sources:
- [Traces | OpenTelemetry (공식 문서)](https://opentelemetry.io/docs/concepts/signals/traces/)
- [OpenTelemetry Trace vs Span Explained - SigNoz](https://signoz.io/comparisons/opentelemetry-trace-vs-span/)
- [Understanding OpenTelemetry Spans in Detail - SigNoz](https://signoz.io/blog/opentelemetry-spans/)
- [Traces vs Spans in OpenTelemetry - Dash0](https://www.dash0.com/knowledge/traces-vs-spans)
- [OpenTelemetry Distributed Tracing: Spans, Context, and Code Examples - Uptrace](https://uptrace.dev/opentelemetry/distributed-tracing)
