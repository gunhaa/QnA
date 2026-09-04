# Fluentd랑 Logstash, 뭐가 다를까?

둘 다 "로그를 모아서 가공한 뒤 다른 곳으로 보내는" 같은 일을 해요. 그런데 **국적(소속 생태계)과 몸무게(자원 사용량), 길 찾는 방식(라우팅)이 달라요.**

## 1. 어느 팀 소속이냐 (생태계)

- **Logstash**: **엘라스틱(Elastic) 회사의 친자식**이에요. `ELK 스택`(Elasticsearch + Logstash + Kibana)의 한 축으로 태어났고, 지금도 Elasticsearch/Kibana와 찰떡궁합으로 맞물려 돌아가요.
- **Fluentd**: 특정 회사 종속이 아닌 **CNCF(중립 재단) 소속** 오픈소스예요. 그래서 Elasticsearch든, S3든, Kafka든, 어디로 보내든 다 똑같이 취급해요. "만능 접착제" 포지션이에요.

## 2. 몸무게 (자원 사용량 / 성능)

- **Logstash**: **Java**로 만들어져서 무거운 편이에요. 처리량이 늘어날수록 메모리/CPU를 꽤 먹어요.
- **Fluentd**: 핵심 로직은 **Ruby**, 성능이 중요한 부분(버퍼링, I/O)은 **C**로 짜여있어서 훨씬 가벼워요. 부하 상태에서도 메모리 약 40MB 정도로 돌아갈 만큼 경량이에요.

→ 그래서 실무에서는 **"서버 하나하나에 심는 가벼운 요원 + 중앙에서 다 받아 처리하는 무거운 본부"** 조합을 짜는데, Logstash는 보통 본부 역할(가벼운 `Filebeat`가 각 서버에서 수집→Logstash로 전달), Fluentd는 몸이 가벼워서 요원 역할까지 혼자 감당하기도 해요 (더 가벼운 `Fluent Bit`이 요원, Fluentd가 본부인 조합도 흔해요).

## 3. 길 찾는 방식 (라우팅 철학)

- **Logstash**: `if-else` 조건문으로 이벤트를 어디로 보낼지 정해요. 파이프라인이 **input → filter → output**으로 고정된 하나의 통로예요.
- **Fluentd**: 이벤트마다 **태그(Tag)**를 붙이고, "이 태그는 이쪽으로" 하는 식으로 **하나의 스트림을 여러 목적지로 유연하게 갈래갈래 나눠요.** 우체국에서 편지에 "부산행" 도장 찍어서 자동 분류하는 것과 비슷해요.

## 4. 텍스트 가공 실력

- **Logstash**: **Grok 필터**라는 강력한 정규식 기반 파싱 도구가 있어서, 지저분한 로그 문자열을 필드별로 쪼개는 데 아주 강해요. 복잡한 텍스트 파싱이 필요하면 Logstash가 한 수 위라는 평가가 많아요.
- **Fluentd**: 파싱보다는 **연결(플러그인 500개+)**에 강점이 있어요. "이 형식 저 형식 다 지원하나요?"엔 Fluentd가 유리해요.

## 표로 정리

| | Fluentd | Logstash |
|---|---|---|
| 소속 | CNCF (중립) | Elastic (ELK 스택 전용에 가까움) |
| 언어 | Ruby + C | Java |
| 무게 | 가벼움 (~40MB) | 무거움 |
| 라우팅 | 태그 기반 (유연한 분기) | if-else 조건 (고정 파이프라인) |
| 텍스트 파싱 | 보통 | Grok으로 강력함 |
| 강점 | 다양한 목적지 연결, 경량 | Elasticsearch 연동, 복잡한 파싱 |

## 한 줄 정리
Logstash는 **"Elastic 생태계 안에서 복잡한 로그를 정교하게 파싱하는 무거운 전문가"**, Fluentd는 **"어디든 가볍게 연결하고 태그로 유연하게 나눠 보내는 만능 배달부"**예요. Elasticsearch/Kibana로 통일된 스택을 쓴다면 Logstash가, 여러 이기종 목적지에 가볍게 연결해야 한다면 Fluentd가 더 자연스러운 선택이에요.

**출처**
- [Fluentd vs Logstash 2026: The Ultimate Log Agent Comparison | Apica](https://www.apica.io/blog/fluentd-vs-logstash-the-ultimate-log-battle/)
- [Fluentd vs. Logstash: A Detailed Log Collector Comparison | Edge Delta](https://edgedelta.com/company/blog/fluentd-vs-logstash)
- [Fluentd vs Logstash: How to Choose in 2026 | Better Stack Community](https://betterstack.com/community/comparisons/fluentd-vs-logstash/)
- [Logstash vs Fluentd: Technical Comparison for Real-World Cases | Sawmills](https://www.sawmills.ai/blog/logstash-vs-fluentd-technical-comparison-for-real-world-cases)
