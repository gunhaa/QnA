# Fluentd랑 OTel(OpenTelemetry Collector), 뭐가 다를까?

둘 다 "데이터를 모아서 정리한 다음 다른 곳으로 보내주는 우체국 분류 센터" 역할을 해요. 그런데 **한 곳(Fluentd)은 원래 "편지(로그)"만 전문으로 다루던 오래된 센터**고, **다른 한 곳(OTel Collector)은 "편지+소포+엽서(로그+지표+추적)"까지 다 다루는 최신 통합 센터**예요.

## Fluentd = 로그 전문 베테랑

2011년에 태어난 **CNCF 졸업 프로젝트**로, "어떤 소스에서 오든, 어떤 목적지로 가든 다 연결해주는 통합 로깅 레이어"가 목표였어요.

**구조 (컨베이어 벨트 4단계)**
1. **Input(입력 플러그인)**: 로그를 모아옴 (예: `in_tail`은 파일을 계속 지켜보며 새 줄이 생기면 읽어요)
2. **Filter(필터 플러그인)**: 내용 수정/가공 (필드 추가, 민감정보 마스킹, 특정 로그 버리기 등)
3. **Buffer(버퍼)**: 목적지로 보내기 전 **잠깐 쌓아두는 대기실**. 목적지가 잠깐 멈춰도 데이터가 안 사라지게 해줘요.
4. **Output(출력 플러그인)**: 최종 저장소로 전송

**강점**: 커뮤니티가 만든 **플러그인이 800개 넘게** 있어서, 거의 모든 로그 소스/목적지를 이미 누가 연결해놨어요.
**약점**: 설정 문법이 XML 비슷하게 생겨서 다소 장황해요. 그리고 **로그만** 다뤄요.

## OTel Collector = 신입이지만 만능

**구조 (컨베이어 벨트 3단계, 지난번 답변과 동일)**
1. **Receiver** ≈ Fluentd의 Input
2. **Processor** ≈ Fluentd의 Filter (+ 배치 처리 등)
3. **Exporter** ≈ Fluentd의 Output

**강점**: 로그뿐 아니라 **지표(Metric), 추적(Trace)까지 하나의 도구로 통합** 수집. CNCF 표준이라 벤더 종속이 없어요.
**약점**: 로그 전용 플러그인 숫자는 아직 Fluentd만큼 많지 않아요 (다만 `filelog` receiver 하나로 대부분의 파일 기반 로그 수집은 커버 가능).

## 나란히 비교

| | Fluentd | OTel Collector |
|---|---|---|
| 태생 연도 | 2011년 | 비교적 최근 (로그 지원은 신입) |
| 다루는 신호 | 로그만 | 로그 + 지표 + 추적 (통합) |
| 구조 | Input → Filter → Buffer → Output | Receiver → Processor → Exporter |
| 설정 문법 | XML과 비슷한 자체 문법 | YAML |
| 플러그인 수 | 800개+ (압도적) | 빠르게 느는 중, 로그는 아직 적음 |
| 소속 | CNCF 졸업 프로젝트 | CNCF 프로젝트 |

## 그럼 같이 쓰기도 해요?

네, 자주 같이 써요! 대표적인 조합:
- **Fluent Bit(경량 수집기) → Fluentd(집계/라우팅)**: 각 서버엔 가벼운 Fluent Bit를 심어 로그만 모으고, 중앙의 무거운 Fluentd가 이걸 받아서 복잡한 라우팅/가공을 담당하는 전통적인 조합.
- **OTel Collector 하나로 통합**: 로그+지표+추적을 한 에이전트로 다 모으고 싶을 때. 특히 새로 관측성(Observability) 스택을 짜는 팀이 선호해요.

## 한 줄 정리
Fluentd = **로그 전용 베테랑**(플러그인 풍부, XML풍 설정). OTel Collector = **로그+지표+추적 통합 신흥강자**(YAML, 벤더 중립, CNCF 표준). 로그만 다루고 플러그인 다양성이 중요하면 Fluentd, 관측성 3요소를 한 도구로 통일하고 싶으면 OTel Collector예요.

**출처**
- [How to Compare OpenTelemetry Collector vs Fluentd for Log Collection](https://oneuptime.com/blog/post/2026-02-06-compare-opentelemetry-collector-vs-fluentd-log-collection/view)
- [OpenTelemetry collector vs Fluentd | GitHub Discussion #4840](https://github.com/open-telemetry/opentelemetry-collector/discussions/4840)
- [Fluentd vs Fluent Bit vs OpenTelemetry Collector | DevOpsBoys](https://devopsboys.com/blog/fluentd-vs-fluent-bit-vs-otel-collector-2026)
- [The Fluentd Architecture Explained: Inputs, Filters, Buffers, and Outputs](https://dohost.us/index.php/2025/09/29/the-fluentd-architecture-explained-inputs-filters-buffers-and-outputs/)
- [Fluentd working demystified | Medium (IBM Cloud)](https://medium.com/ibm-cloud/fluentd-working-demystified-6ae5b46704f2)
