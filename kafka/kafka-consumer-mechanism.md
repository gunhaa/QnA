# Kafka 수신 측, 엔드포인트 감시? 구독 후 이벤트 발송? → 사실 둘 다 아니고 "롱 폴링"이에요

두 가지 추측 다 정답이 아니고, **그 중간에 있는 "롱 폴링(Long Polling)"**이라는 제3의 방식이에요. 왜 둘 다 아닌지부터 볼게요.

## 두 가설이 틀린 이유

- **① "엔드포인트를 감시하는 구조"**라면 → 소비자가 "새 거 왔어? 왔어? 왔어?"를 아주 짧은 간격으로 계속 물어봐야 해요(짧은 폴링/Short Polling). 이건 요청 낭비가 심해요.
- **② "구독하면 브로커가 이벤트를 발송해준다"**라면 → 그건 웹훅(Webhook)이나 진짜 Push 방식이에요. Kafka는 이렇게 안 해요. 브로커가 먼저 나서서 나에게 던져주지 않아요.

## 실제로는 "롱 폴링(Long Polling)"

전화 통화에 비유하면 이래요:
1. 내(소비자)가 브로커한테 전화를 걸어서 **"토마토 소식 오면 알려줘"**(구독, `subscribe()`)라고 말해요.
2. 그다음 실제 데이터를 받으려고 **`poll()`**이라는 요청을 보내요. 이건 "지금 새 소식 있어?"라고 묻는 거예요.
3. 근데 만약 새 소식이 **없으면, 브로커가 전화를 바로 끊지 않고 수화기를 든 채로 기다려요.** 새 메시지가 도착하거나, 정해진 시간(타임아웃)이 지날 때까지요.
4. 새 메시지가 도착하면 **그제서야 응답**을 보내줘요. 그럼 내(소비자)가 다시 `poll()`을 호출해서 이 과정을 반복해요.

이걸 **"롱 폴링"**이라고 불러요 — "짧은 폴링"처럼 헛수고로 계속 재연결하는 낭비도 없고, "진짜 Push"처럼 서버가 먼저 나서는 복잡함도 없어요. **"물어보는 주체는 항상 나(소비자)"**라는 게 핵심이에요.

## 내부적으로 좀 더 들여다보면

- **`subscribe()`**: "나 이 토픽들에 관심있어"라고 등록만 해요. 이때 **코디네이터(Coordinator)**라는 브로커 쪽 담당자가 "이 파티션은 너희 그룹 중 누가 맡을지" 배정해줘요.
- **`poll()` 루프**: 실제로 메시지를 가져오는 반복문. 내부적으로 **가져오기 요청(Fetch Request)**을 브로커에 보내요.
- **하트비트(Heartbeat)**: 별도의 스레드가 "나 아직 살아있어요"를 주기적으로 브로커에 보내요. 이게 끊기면 "얘 죽었나보다" 하고 다른 소비자에게 담당 파티션을 재배정(리밸런싱, Rebalance)해요.
- **성능 최적화**: 똑똑한 소비자는 지금 받은 메시지를 처리하는 **동안 미리 다음 Fetch 요청을 먼저 보내둬서**, 처리 끝나자마자 바로 다음 데이터를 받을 수 있게 해요 (기다리는 시간을 줄임).

## 한 줄 정리
Kafka 수신은 **"엔드포인트를 계속 두드리는 감시"도, "브로커가 알아서 밀어주는 Push"도 아니고**, 소비자가 `subscribe()`로 관심사를 등록한 뒤 `poll()`을 반복 호출하면서, **메시지가 없을 땐 브로커가 응답을 잠깐 들고 기다렸다가(Long Polling) 생기면 바로 돌려주는** 구조예요. 항상 "물어보는 쪽은 소비자"라는 게 두 가설과 다른 핵심 포인트예요.

**출처**
- [Understanding Long Polling in Kafka: A Deep Dive | Medium](https://tahseenrchowdhury.medium.com/understanding-long-polling-in-kafka-a-deep-dive-982c07abef6d)
- [Kafka Consumer Poll & Timeout Settings | Conduktor](https://www.conduktor.io/kafka/kafka-consumer-important-settings-poll-and-internal-threads-behavior)
- [Kafka The Definitive Guide — Kafka Consumers: Reading Data from Kafka | Medium](https://medium.com/@t.m.h.v.eijk/kafka-the-definitive-guide-kafka-consumers-reading-data-from-kafka-chapter-4-c5feab97f91e)
- [KafkaConsumer API 공식 문서 (Apache Kafka)](https://kafka.apache.org/24/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
