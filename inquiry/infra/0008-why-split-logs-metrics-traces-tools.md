# 왜 OTel이랑 Fluentd를 따로 쓸까? 기능별로 도구를 쪼갠 건 무슨 의미일까?

병원을 떠올려보세요. 감기 걸리면 내과, 이 아프면 치과, 뼈 부러지면 정형외과에 가죠. "종합병원 의사 한 명이 다 보면 되지 않나?"라고 생각할 수 있지만, **각 분야가 요구하는 지식과 도구가 완전히 달라서 전문의로 쪼개진 거예요.** 관측성(Observability) 도구도 똑같은 이유로 쪼개졌어요.

## 로그·지표·추적은 애초에 "생긴 게 달라요"

| 신호 | 생김새 | 필요한 저장/조회 방식 |
|---|---|---|
| **로그(Log)** | 사람이 읽는 글자 덩어리, 형식 제각각 | 텍스트 전체를 뒤지는 **전문 검색(Full-text Search)**, 용량이 어마어마함 |
| **지표(Metric)** | "CPU 70%"처럼 숫자 하나가 계속 찍힘 | 숫자를 빠르게 더하고 평균내는 **시계열 DB(Time-series DB)** |
| **추적(Trace)** | 요청 하나가 여러 서비스를 거치는 **연결된 나무 구조** | 부모-자식 관계를 다시 이어붙이는 **그래프 재구성** |

이 셋을 억지로 한 저장소, 한 엔진에 다 우겨넣으면 **셋 다 어중간해져요.** 로그 검색은 느려지고, 지표 집계는 무거워지고, 추적은 관계가 꼬여요. 그래서 오랫동안 각각 전문 도구가 따로 발전했어요: 로그는 Fluentd/ELK, 지표는 Prometheus/Graphite, 추적은 Jaeger/Zipkin.

## 그럼 지금 Fluentd + OTel을 같이 쓰는 이유는?

여기엔 "설계상 원칙"과 "역사적 현실"이 섞여 있어요.

### 1) 소프트웨어 원칙: 관심사 분리 (Separation of Concerns)

인증, 재시도, 여러 목적지로 나눠 보내기(Fan-out), 민감정보 지우기 같은 건 **"텔레메트리 인프라"의 관심사**지, 서비스 코드 하나하나가 신경 쓸 일이 아니에요. 이걸 전담하는 별도 프로세스로 떼어놓으면, 각 도구는 자기 전문 분야(로그면 로그)만 파고들어 훨씬 깊이 있게 잘할 수 있어요. 이게 유닉스 철학("한 가지를 잘 하는 작은 도구들") 그대로예요.

### 2) 역사적 현실: 태어난 시기가 달라요

Fluentd는 2011년부터 로그 하나만 파며 **플러그인 800개+**를 쌓아온 베테랑이에요. OTel Collector가 로그까지 다루기 시작한 건 비교적 최근이라, **아직 커버리지가 Fluentd만큼 넓지 않아요.** 그래서 "이미 잘 굴러가는 Fluentd 로그 파이프라인을 갑자기 다 뜯어고치느니, 필요한 부분(지표·추적)만 OTel로 새로 짜고 로그는 당분간 Fluentd에 맡기자"는 실용적 선택이 많아요.

### 3) 안전장치: 한 곳이 무너져도 전체가 안 죽어요

지표 수집기가 버그로 죽어도 로그 수집은 멀쩡히 돌아가야 하잖아요? 도구를 쪼개두면 **장애가 전체로 안 번지고 격리(Isolation)**돼요. 하나의 거대한 프로그램이었다면 그 프로그램의 버그 하나가 로그·지표·추적을 통째로 마비시킬 수 있어요.

## 그런데 지금은 다시 "합치는 방향"으로 가고 있어요

재밌는 반전이 있어요. OTel Collector 자체가 "로그+지표+추적을 한 에이전트로 통일하자"는 목표로 만들어진 거예요. 그래서:

- **Fluent Forward Receiver**라는 다리(Bridge)를 OTel Collector에 만들어놔서, 기존 Fluentd/Fluent Bit 에이전트를 안 건드리고도 점진적으로 OTel 쪽으로 옮겨갈 수 있게 해줘요.
- 이미 지표·추적을 OTel로 쓰고 있다면, 로그까지 OTel 하나로 합쳐서 **관리할 부품 수를 줄이는(운영 복잡도 감소)** 방향으로 가는 팀이 늘고 있어요.

## 한 줄 정리
쪼갠 이유는 **① 데이터 형태 자체가 근본적으로 달라서(엔진 최적화), ② 역사적으로 태어난 시점이 달라서(Fluentd가 먼저 있었음), ③ 장애를 격리하기 위해서**예요. 이건 "영원히 나눠져 있어야 한다"는 뜻이 아니라, **각 시대·상황에 맞는 실용적 타협**이고, 지금은 OTel이라는 공통 표준이 생기면서 다시 하나로 합쳐지는 과도기예요.

**출처**
- [The 3 pillars of observability: Unified logs, metrics, and traces | Elastic Blog](https://www.elastic.co/blog/3-pillars-of-observability)
- [8.1: Why the OpenTelemetry Collector Exists | Soumendra Kumar Sahoo](https://www.soumendrak.com/series/practical-observability-with-python/otel-collector/)
- [Bridging Fluentd to OpenTelemetry with Fluent Forward | Dash0](https://www.dash0.com/guides/opentelemetry-fluent-forward-receiver)
- [How to Switch from Fluentd/Fluent Bit to OpenTelemetry Log Collection](https://oneuptime.com/blog/post/2026-02-06-switch-fluentd-fluent-bit-to-opentelemetry-log-collection/view)
