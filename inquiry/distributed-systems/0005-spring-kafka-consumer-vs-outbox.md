# Spring Kafka Consumer = N초마다 폴링? 그럼 Transactional Outbox랑은 뭐가 다름?

두 개념이 완전히 다른 층(레이어)의 문제를 풀어요. 헷갈리기 쉬운 이유는 **둘 다 내부적으로 "폴링"이라는 단어를 쓰기 때문**이에요. 하나씩 풀어볼게요.

## Spring Kafka Consumer는 정확히 어떤 폴링이야?

"N초마다 자다가 일어나서 확인하는" 구조가 아니라, 지난번 말씀드린 **롱 폴링을 계속 반복하는 쉼 없는 루프**예요.

```
while (살아있는 동안) {
    records = consumer.poll(pollTimeout);  // 최대 pollTimeout(기본 5초)까지 "기다리며" 대기
    // 메시지가 그 전에 도착하면 즉시 반환됨. 안 오면 5초 채우고 빈 채로 반환.
    처리(records);
    다시 루프 맨 위로 (곧바로 또 poll 호출)
}
```

- `pollTimeout`은 "몇 초마다 확인할지"가 아니라 **"한 번 물어봤을 때 응답 없으면 최대 얼마나 기다려줄지(long-poll 대기시간)"**예요. 메시지가 즉시 오면 바로 처리하고 곧장 다음 poll로 넘어가요. **쉬는 시간이 기본적으로 없어요.**
- 굳이 "일부러 N초 쉬었다가 확인"하게 하고 싶으면 `idleBetweenPolls`라는 별도 옵션을 켜야 해요 (기본은 꺼져있음). 이건 스로틀링(속도 조절)용 옵션이지, 기본 동작이 아니에요.

즉, 말씀하신 "N초마다 감시"는 **의도적으로 느리게 설정하지 않는 한 정확한 표현이 아니고**, 기본은 "끊임없이 물어보되, 대답이 없으면 잠깐(5초까지) 참을성 있게 기다려주는" 구조예요.

## Transactional Outbox는 완전히 다른 문제를 풀어요 (소비자 쪽이 아니라 발행자 쪽!)

여기가 핵심이에요. **Kafka Consumer는 "이미 Kafka에 안전하게 들어간 메시지를 어떻게 읽어올까"**의 문제고, **Transactional Outbox는 "내 서비스가 DB도 바꾸고 Kafka에도 메시지를 보내야 하는데, 그 둘을 어떻게 안전하게 같이 할까"**의 문제예요. **읽기 vs 쓰기(발행), 아예 다른 쪽 이야기예요.**

### 왜 이게 문제가 되냐면 (이중 쓰기 문제, Dual-Write Problem)

주문 서비스가 있다고 해봐요:
1. DB에 "주문 저장" ✅ 성공
2. Kafka에 "주문 생성됨" 이벤트 발행 ❌ 마침 Kafka가 잠깐 멈춤 → 실패

이러면 **DB엔 주문이 있는데, 아무도 그 사실을 몰라요.** DB 트랜잭션과 Kafka 발행은 서로 다른 시스템이라 **하나의 트랜잭션으로 묶을 수 없어서** 생기는 문제예요.

### Outbox의 해법

1. 주문을 저장할 때, **같은 DB 트랜잭션 안에서 "outbox"라는 테이블에도 "이 이벤트를 나중에 보내야 함"이라고 같이 적어요.** (DB 하나 안에서의 트랜잭션이니 100% 원자적으로 묶여요)
2. 이후 **별도의 릴레이(Relay) 프로세스**가 이 outbox 테이블을 보고 Kafka로 실제 발행해요. 이 릴레이는 두 가지 방식이 있어요:
   - **폴링 방식**: 릴레이가 "outbox 테이블에 안 보낸 거 있나?" 하고 주기적으로 SQL 조회 (구현 간단, 약간의 지연 있음)
   - **CDC 방식**(Debezium 등): DB의 트랜잭션 로그(binlog 등)를 실시간으로 훔쳐봐서, 커밋되는 즉시(밀리초 단위) Kafka로 쏴줌 (더 빠르고, DB에 부하도 적음)

## 그래서 진짜 차이는?

| | Kafka Consumer (Spring) | Transactional Outbox |
|---|---|---|
| 위치 | **읽는(소비) 쪽** | **쓰는(발행) 쪽** |
| 푸는 문제 | Kafka에 이미 있는 메시지를 효율적으로 계속 읽어오기 | 내 DB 변경 + Kafka 발행을 원자적으로 묶기 (이중 쓰기 문제 해결) |
| 폴링의 의미 | 브로커에게 "새 메시지 있어?" 반복 확인 (롱 폴링) | outbox 테이블에 "안 보낸 거 있어?" 반복 확인 (구현 방식 중 하나일 뿐) |
| 대안 | (거의 유일한 방식, poll 기반이 Kafka 소비의 표준) | CDC(Debezium)로 대체하면 폴링 자체가 아예 없어짐 |

## 한 줄 정리
Spring Kafka Consumer의 "폴링"은 **이미 Kafka 안에 있는 메시지를 읽어오는 방법**(대부분 즉시 처리되는 롱 폴링)이고, Transactional Outbox의 "폴링"(선택적)은 **내 DB 변경 사항을 나중에 Kafka로 안전하게 보내기 위한 릴레이 방식 중 하나**예요. 둘은 파이프라인의 정반대 끝(발행 전 vs 소비 시)에서 서로 다른 문제를 풀고 있어서, 같이 써도 전혀 이상하지 않아요 (Outbox로 안전하게 발행 → Kafka Consumer로 안전하게 소비).

**출처**
- [Message Listener Containers | Spring Kafka 공식 문서](https://docs.spring.io/spring-kafka/reference/kafka/receiving-messages/message-listener-container.html)
- [ContainerProperties API | Spring for Apache Kafka](https://docs.spring.io/spring-kafka/docs/current/api/org/springframework/kafka/listener/ContainerProperties.html)
- [Transactional Outbox: Database-Kafka Consistency | Conduktor](https://www.conduktor.io/blog/transactional-outbox-pattern-database-kafka)
- [The Outbox Pattern Explained: Reliable Event Publishing for Microservices | Streamkap](https://streamkap.com/resources-and-guides/outbox-pattern-explained)
