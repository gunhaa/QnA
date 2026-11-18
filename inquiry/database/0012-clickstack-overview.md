# ClickStack이란 무엇인가

## 쉬운 설명

레고 세트를 생각해보자. ClickHouse는 아주 튼튼하고 빠른 "블록 창고"(데이터 저장·검색 엔진)다. 그런데 창고만 있으면 물건을 넣고 찾기가 불편하니까, ClickHouse 회사가 "물건을 자동으로 창고에 정리해서 넣어주는 컨베이어 벨트"(OpenTelemetry 수집기)와 "창고 안을 눈으로 보면서 찾아볼 수 있는 화면"(HyperDX)까지 한 세트로 묶어서 내놓았다. 이 레고 세트 전체의 이름이 **ClickStack**이다. 즉 "로그·지표·트레이스(서버가 남기는 기록들)를 한군데 모아서 빠르게 검색하고 보기 위한, ClickHouse 기반 완제품 패키지"라고 보면 된다.

## 일반 설명

### 정의

**ClickStack**은 ClickHouse, Inc.가 공개한 오픈소스 **관측성(Observability) 스택**으로, 로그(logs)·메트릭(metrics)·트레이스(traces)·세션 리플레이(session replay)를 하나의 플랫폼에서 통합 제공하는 것을 목표로 한다. 기존에 Datadog, Elastic(ELK), Splunk 등 상용/독립 솔루션이 담당하던 영역을, ClickHouse의 고성능 컬럼형 저장소 위에서 오픈소스로 구현한 것이다.

### 핵심 구성 요소 3가지

1. **ClickHouse** — 모든 관측성 데이터(로그·메트릭·트레이스)를 저장하는 중앙 저장소. 컬럼 지향 엔진과 JSON 네이티브 지원을 활용해 대규모 데이터에서도 빠른 검색·필터링·집계를 수행한다. [[clickhouse-overview]]에서 다룬 컬럼 지향/벡터화 실행/MergeTree 구조가 그대로 관측성 워크로드에 적용된다.
2. **OpenTelemetry(OTel) Collector** — ClickStack에 포함된 커스텀 OTel 컬렉터로, ClickHouse 적재에 최적화된 "opinionated schema"를 미리 구성해 제공한다. OTLP 프로토콜(gRPC 4317번, HTTP 4318번 포트)로 로그·메트릭·트레이스를 수신해 배치(batch) INSERT로 ClickHouse에 바로 기록한다. ClickHouse HTTP API나 Vector 같은 에이전트로 직접 쓰는 대안 경로도 지원한다.
3. **HyperDX UI** — 관측성 데이터를 탐색하기 위한 프런트엔드. Lucene 스타일 검색과 SQL 쿼리를 모두 지원하며, 대시보드, 알림(alerting), 트레이스 탐색, 세션 리플레이 등을 ClickHouse 백엔드에 최적화된 형태로 제공한다.

이 외에 애플리케이션 상태(대시보드 설정, 저장된 쿼리 등) 저장을 위해 **MongoDB** 인스턴스가 보조적으로 함께 배포된다.

### "Wide Event" 데이터 모델

ClickStack의 특징적인 설계는 로그·메트릭·트레이스를 각각 별도 시스템에 저장하지 않고, ClickHouse 한 곳에 **"wide event"**(폭넓은 속성을 가진 단일 이벤트 레코드) 형태로 저장해 서로 다른 신호(signal) 간의 **깊은 상관관계 분석**을 가능하게 한다는 점이다. 예를 들어 특정 트레이스 ID로 관련된 로그와 메트릭을 끊김 없이 함께 조회할 수 있다.

### 왜 ClickHouse 위에 구축했는가 — append-only 로그와의 연결

관측성 데이터(로그, 메트릭, 트레이스)는 전형적인 **append-only** 워크로드다. [[clickhouse-append-only-log-reason]]에서 설명한 것처럼 ClickHouse는 컬럼 지향 저장, 불변 part 기반 MergeTree, 벡터화 실행, TTL 기반 파티션 관리 덕분에 "계속 쌓이기만 하고 대량으로 집계 조회되는" 데이터에 최적화되어 있다. ClickStack은 이 특성을 그대로 활용해, 기존 로그 전용 솔루션(Elasticsearch 기반 ELK 등) 대비 저장 비용과 쿼리 속도 면에서 우위를 노린다.

### 배포 형태

- **오픈소스 셀프호스팅**: Docker, Helm/Kubernetes 등으로 직접 구성 요소(ClickHouse, OTel Collector, HyperDX, MongoDB)를 배포할 수 있다.
- **Managed ClickStack**: ClickHouse Cloud 위에서 완전관리형으로 동일한 스택을 제공하는 상용 옵션도 존재한다.

### 요약

ClickStack은 "ClickHouse(저장·질의) + OpenTelemetry Collector(수집) + HyperDX(시각화)"를 하나의 opinionated 패키지로 묶어, 로그·메트릭·트레이스·세션 리플레이를 단일 플랫폼에서 다룰 수 있게 한 오픈소스 관측성 스택이다. 핵심은 ClickHouse가 애초에 강점을 가진 append-only·대량 집계 워크로드 위에, 업계 표준인 OpenTelemetry와 사용자 친화적 UI를 얹어 "직접 구축하기 번거로운 관측성 파이프라인"을 완제품으로 제공한다는 데 있다.

---

### Sources
- [ClickStack: A High-Performance OSS Observability Stack on ClickHouse](https://clickhouse.com/blog/clickstack-a-high-performance-oss-observability-stack-on-clickhouse)
- [ClickStack: High-Performance Open Source Observability | ClickHouse](https://clickhouse.com/clickstack)
- [ClickStack - the ClickHouse observability stack - ClickHouse Documentation](https://clickhouse.com/docs/clickstack/overview)
- [Architecture | ClickHouse Docs](https://clickhouse.com/docs/use-cases/observability/clickstack/architecture)
- [GitHub - ClickHouse/ClickStack](https://github.com/ClickHouse/ClickStack)
- [ClickStack: ClickHouse's New Observability Stack Unveiled](https://horovits.medium.com/clickstack-clickhouses-new-observability-stack-unveiled-73f129a179a3)
- [How to engineer cost-efficient open source observability with ClickHouse (ClickStack) - 2026 technical playbook](https://clickhouse.com/resources/engineering/observability-cost-optimization-playbook)
