# Kafka 놔두고 왜 RabbitMQ를 쓸까?

지난번 Kafka는 "**엄청 큰 물류창고**"(대용량 이벤트 스트리밍)라고 했었죠. **RabbitMQ는 "동네 우체국 심부름센터"**예요. 창고만큼 크지는 않지만, **훨씬 똑똑하고 빠르게 심부름을 배분**해줘요.

## 근본적으로 태생이 달라요

- **Kafka**: "일어난 일(이벤트)을 다 기록해서 여러 사람이 각자 필요할 때 다시 꺼내볼 수 있게 하는 **로그 창고**"에 가까워요.
- **RabbitMQ**: "할 일(작업, Task)을 한 명에게 배정해서 **딱 한 번 처리하고 끝내는 심부름센터**"예요. 오래된 정통 **메시지 브로커(AMQP 프로토콜)**예요.

이 태생 차이가 "왜 굳이 Kafka 놔두고 RabbitMQ냐"의 진짜 이유예요.

## RabbitMQ가 유리한 4가지 상황

### 1. 빠른 응답이 생명일 때 (저지연)

RabbitMQ는 메시지가 도착하면 **소비자에게 바로 밀어줘요(Push)**. 지난번 배운 Kafka의 "소비자가 물어봐야 주는 롱 폴링(Pull)" 방식보다, RabbitMQ의 Push 방식이 "지금 당장 결제 처리해줘" 같은 **실시간 트랜잭션**엔 더 즉각적이에요.

### 2. 복잡한 배달 규칙이 필요할 때 (유연한 라우팅)

우체국 심부름센터에 비유하면: "이건 서울로, 이건 부산으로, 이건 VIP만" 같은 **세밀한 분류 규칙**을 짤 수 있어요. RabbitMQ의 **Exchange**(교환기)는 메시지 내용/제목표(Routing Key)를 보고 어느 큐로 보낼지 정교하게 갈래를 나눠요. Kafka의 "토픽/파티션"보다 훨씬 촘촘한 분기 로직을 짤 수 있어요.

### 3. "한 번 처리하고 끝나는 작업"일 때 (작업 큐)

"이미지 리사이징 해줘", "이메일 보내줘" 같이 **한 번 처리되면 그걸로 끝인 작업**엔 RabbitMQ가 딱 맞아요. 처리 끝난 작업(메시지)은 확인(ACK) 받고 큐에서 바로 지워버려요. 반면 Kafka는 "여러 소비자가 같은 이벤트를 각자 다른 목적으로 재사용"하는 데 최적화돼 있어서, 이런 단순 1회성 작업엔 오히려 과한 도구예요.

### 4. 규모가 그렇게까지 크지 않을 때

초당 수백만 건이 아니라 **초당 수천 건 정도**라면, RabbitMQ가 운영 부담(설정, 클러스터 관리) 없이 훨씬 간단해요. Kafka는 강력한 만큼 **운영 난이도(파티션 설계, 리밸런싱 등)도 높아요.**

## 표로 정리

| | Kafka | RabbitMQ |
|---|---|---|
| 정체성 | 이벤트 스트리밍 플랫폼 (로그 창고) | 메시지 브로커 (심부름센터) |
| 전달 방식 | Pull (소비자가 당겨감, 롱 폴링) | Push (브로커가 바로 밀어줌) |
| 메시지 처리 후 | 계속 보관 (재생 가능) | 확인(ACK) 후 바로 삭제 |
| 라우팅 | 토픽/파티션 (비교적 단순) | Exchange로 정교한 조건 분기 |
| 적합한 규모 | 초당 수백만 건급 초대용량 | 초당 수천~수만 건, 중소규모 |
| 잘 맞는 예 | 로그 파이프라인, 여러 시스템에 이벤트 브로드캐스트 | 작업 큐, 실시간 주문 처리, 마이크로서비스 간 요청 처리 |

## 한 줄 정리
"이벤트를 여러 소비자가 각자 다시 꺼내보며 대용량으로 흘려보내야 하냐" vs "**작업 하나를 빠르고 정교하게 배정해서 한 번에 끝내야 하냐**"의 차이예요. 후자라면, 그리고 규모가 Kafka만큼 거대하지 않다면 **RabbitMQ가 더 간단하고 빠른 선택**이 돼요.

**출처**
- [RabbitMQ vs. Apache Kafka | Confluent](https://www.confluent.io/compare/rabbitmq-vs-apache-kafka/)
- [When to use RabbitMQ or Apache Kafka | CloudAMQP](https://www.cloudamqp.com/blog/when-to-use-rabbitmq-or-apache-kafka.html)
- [Kafka vs RabbitMQ: Key Differences & When to Use Each | DataCamp](https://www.datacamp.com/blog/kafka-vs-rabbitmq)
- [Kafka vs. RabbitMQ: Which message broker should you use? | Statsig](https://www.statsig.com/perspectives/kafka-vs-rabbitmq-choice)
