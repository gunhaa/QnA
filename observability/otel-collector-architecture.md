# OTel Collector, "받아서 쌓아뒀다가 요청 오면 주는 구조"가 맞나요?

**절반만 맞아요.** "타입이 있는 구조체를 받아 파싱한다"는 부분은 정확하지만, "가지고 있다가 요청 오면 준다"는 건 **일부 설정에서만** 맞고, 기본 구조는 그게 아니에요.

## 실제 구조: 컨베이어 벨트(파이프라인)예요

우체국 분류 센터를 떠올려보세요. 편지가 들어오면(받기) → 분류/포장하고(가공) → 바로 다음 트럭에 실어 보내요(내보내기). **택배함처럼 "찾아갈 때까지 보관"하는 게 기본이 아니라, 들어오는 대로 바로바로 흘려보내는 컨베이어 벨트**예요.

OTel Collector는 3개의 부품으로 이 벨트를 만들어요:

1. **Receiver(수신기)**: 데이터를 안으로 받아들이는 문. `구조체(타입)`로 정의된 텔레메트리(추적 Trace, 지표 Metric, 로그 Log)를 OTLP(OpenTelemetry Protocol, gRPC 또는 HTTP), Jaeger, Prometheus 등 다양한 형식으로 받아서 **Collector 내부 공통 데이터 모델로 파싱**해요. → 여기까지가 말씀하신 "타입 있는 구조체를 받아 파싱"이 정확히 맞는 부분이에요.
2. **Processor(가공기)**: 배치로 묶기(Batching), 샘플링, 메모리 제한, 필터링 등 데이터를 다듬어요.
3. **Exporter(내보내기)**: 가공된 데이터를 **곧바로 백엔드(Datadog, Jaeger, Prometheus 등)로 밀어내요(Push)**. 각 exporter는 데이터의 복사본을 받아서 각자 목적지로 보내요.

즉 기본 흐름은 **Receiver → Processor → Exporter가 데이터를 즉시즉시 다음 단계로 "떠미는(Push)" 구조**지, "요청이 올 때까지 계속 쌓아두는" 구조가 아니에요.

## 그런데 "쌓아뒀다가 요청 오면 준다"가 맞는 경우도 있어요

Prometheus 생태계는 원래 **풀(Pull) 기반**이라, Collector도 이걸 맞춰주는 특수 부품이 있어요:

- **Prometheus Exporter** (내보내기): Collector가 처리한 지표를 내부에 잠깐 들고 있다가, Prometheus 서버가 `/metrics` 주소로 **긁으러 올 때(스크래핑, Scraping)** HTTP 응답으로 줘요. → **정확히 말씀하신 그 구조**예요!
- **Prometheus Receiver** (수신기): 반대로 Collector가 다른 시스템의 `/metrics`를 주기적으로 직접 긁어와요(Pull).

반면 OTLP, Jaeger 같은 기본 경로는 **Push 기반**이라 "요청 오면 준다"가 아니라 "들어오는 즉시 정해진 곳으로 쏴 보낸다"예요.

## 표로 정리

| 구성요소 | 방식 | 설명 |
|---|---|---|
| OTLP Receiver | Push (수신 대기) | gRPC/HTTP로 SDK가 보내는 걸 받음 |
| Prometheus Receiver | Pull (긁어옴) | Collector가 주기적으로 타겟을 스크래핑 |
| 대부분의 Exporter (OTLP, Jaeger 등) | Push (즉시 전송) | 가공 끝나면 바로 백엔드로 쏨 |
| Prometheus Exporter | Pull (요청 대기) | 말씀하신 "쌓아뒀다 요청 오면 줌" 구조와 일치 |

## 한 줄 정리
OTel Collector의 기본 정체는 **Receive → Process → Export로 이어지는 실시간 파이프라인(대부분 Push 방식)**이에요. "구조체를 받아 파싱"하는 부분은 정확하지만, "쌓아뒀다가 요청 오면 준다"는 **Prometheus Exporter를 쓸 때만 해당하는 특수 케이스**예요.

**출처**
- [Architecture | OpenTelemetry (공식 문서)](https://opentelemetry.io/docs/collector/architecture/)
- [OpenTelemetry Receivers Explained - Push vs Pull | SigNoz](https://signoz.io/blog/otel-receivers/)
- [How to Configure the Prometheus Exporter in the OpenTelemetry Collector](https://oneuptime.com/blog/post/2026-02-06-prometheus-exporter-opentelemetry-collector/view)
- [Prometheus and OpenTelemetry - Better Together (공식 블로그)](https://opentelemetry.io/blog/2024/prom-and-otel/)
