# Kafka(카프카)가 뭐예요?

우체국 중앙 물류창고를 떠올려보세요. 전국 각지에서 편지(데이터)가 쏟아져 들어오고, 여러 대의 트럭(소비자)이 각자 필요한 편지만 골라 가져가요. **Kafka는 이 "물류창고" 역할을 하는, 대용량 실시간 메시지 시스템**이에요.

## 태어난 이야기

2010년, **LinkedIn**은 "여기저기서 쏟아지는 대량의 이벤트 데이터(누가 프로필을 봤다, 누가 좋아요를 눌렀다 등)를 안정적으로 옮길 방법"이 필요했어요. Jay Kreps, Neha Narkhede, Jun Rao 세 엔지니어가 이 문제를 풀기 위해 **Kafka**(체코 작가 프란츠 카프카의 이름을 땄어요)를 만들었고, 2011년 오픈소스로 공개했어요. 이후 2014년엔 이 핵심 개발자들이 나와서 **Confluent**라는 회사를 차려 Kafka를 계속 발전시키고 있어요.

## 핵심 구조 (물류창고의 부품들)

| 이름 | 역할 | 비유 |
|---|---|---|
| **Producer(생산자)** | 데이터를 보내는 쪽 | 편지를 부치는 사람 |
| **Broker(브로커)** | 데이터를 저장/관리하는 서버 한 대 | 물류창고 건물 한 동 |
| **Cluster(클러스터)** | 여러 브로커가 모인 전체 | 물류창고 단지 |
| **Topic(토픽)** | 편지의 종류(카테고리) | "택배용", "등기용" 같은 우편함 종류 |
| **Partition(파티션)** | 토픽을 여러 조각으로 쪼갠 것 | 우편함을 여러 칸으로 나눠 각각 다른 담당자가 처리 |
| **Offset(오프셋)** | 파티션 안에서 각 메시지의 순번 | 편지에 붙은 접수 번호표 |
| **Consumer(소비자)** | 데이터를 꺼내가는 쪽 | 편지를 찾으러 온 배달원 |

**핵심 아이디어**: 토픽 하나를 여러 **파티션**으로 쪼개두면, 여러 소비자가 **동시에 병렬로** 나눠 처리할 수 있어서 트래픽이 몰려도 빠르게 처리돼요. 그리고 각 파티션은 리더(Leader) 브로커 하나가 읽기/쓰기를 전담하고, 팔로워(Follower) 브로커들이 그 내용을 그대로 복제해둬서, 리더가 죽어도 팔로워가 바로 대신할 수 있어요(장애 대비, Replication).

## 왜 그냥 DB나 일반 메시지 큐(RabbitMQ 등) 안 쓰고 Kafka를 쓸까?

- **엄청난 처리량**: 초당 수백만 건의 이벤트도 버텨요. LinkedIn, Netflix 같은 곳에서 초대형 트래픽을 처리하려고 태어난 물건이라 규모가 다르게 설계됐어요.
- **데이터가 안 사라짐**: 메시지를 소비자가 가져가도 **바로 지우지 않고, 정해둔 기간 동안 로그처럼 계속 보관**해요. 그래서 나중에 다시 처음부터 재생(Replay)할 수도 있어요. (일반 메시지 큐는 보통 가져가면 바로 삭제)
- **여러 소비자가 각자 속도대로**: 지난번 다룬 것처럼, 소비자가 `poll()`로 직접 당겨가는(Pull) 구조라 소비자가 자기 페이스대로 처리할 수 있어요.

## 이번 세션에서 다룬 관련 내용
- [OTel Collector와 Kafka 연동 시 Push/Pull](./otel-collector-kafka-push-pull.md)
- [Kafka 소비자가 메시지를 받는 실제 방식(롱 폴링)](./kafka-consumer-mechanism.md)

## 한 줄 정리
Kafka는 **토픽을 파티션으로 쪼개 여러 서버(브로커)에 분산 저장하고, 여러 소비자가 각자 속도대로 당겨가며 처리하게 해주는, 대용량·고성능 분산 메시징 시스템**이에요. LinkedIn의 내부 문제 해결용으로 태어나 지금은 사실상 실시간 데이터 파이프라인의 표준이 됐어요.

**출처**
- [What Is Apache Kafka? | IBM](https://www.ibm.com/think/topics/apache-kafka)
- [아파치 카프카 | 위키백과](https://ko.wikipedia.org/wiki/%EC%95%84%ED%8C%8C%EC%B9%98_%EC%B9%B4%ED%94%84%EC%B9%B4)
- [Understanding Apache Kafka: From LinkedIn's Data Streams | Medium](https://medium.com/@berktorun.dev/understanding-apache-kafka-from-linkedins-data-streams-to-worldwide-communication-8e199d7140f7)
- [Apache Kafka 의 기본 아키텍쳐 | velog](https://velog.io/@hyeondev/Apache-Kafka-%EC%9D%98-%EA%B8%B0%EB%B3%B8-%EC%95%84%ED%82%A4%ED%85%8D%EC%B3%90)
