# Kafka랑 연동되면 Push일까?

**"어느 쪽이냐"에 따라 달라요.** Kafka 자체가 원래 **반은 Push, 반은 Pull인 하이브리드 구조**라서, Collector가 Kafka의 어느 쪽(입구/출구)에 붙느냐에 따라 대답이 달라져요.

## 먼저, Kafka 자체의 구조

우체국 택배함 비유를 이어가면:
- **생산자(Producer) → 브로커(Broker)**: 택배기사가 물건을 **직접 던져 넣어요(Push)**. 물건이 생기는 즉시 보내요.
- **브로커(Broker) → 소비자(Consumer)**: 하지만 물건을 찾아가는 사람은 "새 택배 왔나요?" 하고 **직접 와서 물어보고 가져가요(Pull, 정확히는 Polling)**. 이게 Kafka Consumer의 핵심 설계예요 — 소비자가 자기 속도에 맞춰 가져가야 밀리거나 넘치는 문제(백프레셔)를 스스로 조절할 수 있거든요.

## OTel Collector가 Kafka와 연동될 때

Collector에는 이 양쪽에 대응하는 부품이 각각 있어요.

| 부품 | Collector의 역할 | Kafka 입장에서 | 방향 |
|---|---|---|---|
| **Kafka Exporter** | Kafka에 데이터를 **밀어넣는 쪽** | Producer(생산자) | **Push** |
| **Kafka Receiver** | Kafka에서 데이터를 **가져오는 쪽** | Consumer(소비자) | **Pull(Polling)** |

즉, "Kafka Exporter를 쓴다" → Collector가 처리를 마친 텔레메트리를 Kafka 토픽에 **바로 던져 넣는 Push**예요.
"Kafka Receiver를 쓴다" → Collector가 능동적으로 Kafka 토픽에 **"새 메시지 있어?" 하고 계속 물어보며 가져오는 Pull**이에요.

## 지난번 Prometheus 사례와 헷갈리지 않기

여기서 중요한 차이가 있어요. 지난번 **Prometheus Exporter**는 "**외부(Prometheus 서버)가 Collector에게** 달라고 요청해야 주는" 구조였죠. 반면 **Kafka Receiver**는 "**Collector 스스로가 Kafka에게** 계속 물어보며 당겨오는" 구조예요.

- Prometheus Exporter: 남이 나(Collector)에게 요청 → 나는 수동적으로 대기만 함
- Kafka Receiver: 내(Collector)가 남(Kafka)에게 요청 → 나는 능동적으로 계속 당겨옴

둘 다 "Pull"이라 부르지만, **누가 누구에게 요청하느냐가 정반대**예요. 그래서 Kafka Receiver를 쓴다고 해서 Collector가 "요청 오면 주는" 서버처럼 동작하는 건 아니고, 여전히 데이터를 능동적으로 가져와서 파이프라인 뒤쪽(Processor→Exporter)으로 계속 흘려보내는 구조예요.

## 왜 Kafka를 중간에 끼워 넣을까?

Producer 역할 Collector와 Consumer 역할 Collector를 **Kafka로 분리(디커플링)**해두면:
- 트래픽이 몰려도 Kafka가 버퍼처럼 잠깐 쌓아둬서 뒷단이 안 죽어요 (백프레셔 흡수)
- 소비하는 쪽(백엔드) 설정을 바꾸는 동안에도 데이터는 계속 Kafka에 안전하게 쌓여요
- 소비자를 여러 개로 늘려서(Consumer Group) 나눠 처리(Fan-out)할 수 있어요

## 한 줄 정리
Kafka와 연동 시, **Exporter는 Push**(Collector→Kafka로 밀어넣기), **Receiver는 Pull**(Collector가 Kafka에서 당겨오기)이에요. 다만 이 Pull은 "외부가 Collector에게 요청"하는 게 아니라 "**Collector가 스스로 Kafka에게** 계속 물어보며 가져오는" 능동적 Pull이라, 전체적으로는 여전히 데이터가 끊임없이 흐르는 파이프라인이에요.

**출처**
- [Kafka receiver and exporter | AWS Distro for OpenTelemetry](https://aws-otel.github.io/docs/components/kafka-receiver-exporter/)
- [How to Use the Kafka Exporter and Kafka Receiver in the Collector](https://oneuptime.com/blog/post/2026-02-06-kafka-exporter-receiver-buffered-telemetry/view)
- [Kafka Consumer Design: Consumers, Consumer Groups, and Offsets | Confluent Docs](https://docs.confluent.io/kafka/design/consumer-design.html)
- [Kafka — Why does Kafka use a pull-based message consumer? | Medium](https://medium.com/codex/asynchronous-communication-why-does-kafka-use-a-pull-based-message-consumer-442c19a70f58)
