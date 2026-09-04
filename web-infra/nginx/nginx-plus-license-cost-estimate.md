# NGINX Plus 라이선스 비용, 얼마나 예상하면 될까?

## 먼저 알아둘 것: "정가표"가 없어요

**F5(NGINX Plus를 판매하는 회사)는 공식 가격표를 공개하지 않아요.** CDW 같은 리셀러 사이트에서도 "Get a Quote(견적 요청)" 버튼만 있고 실제 숫자는 안 보여줘요. 그래서 아래 숫자들은 **여러 리서치/리뷰 사이트가 취합한 추정치**이며, 실제 계약 규모·협상에 따라 달라질 수 있다는 점을 먼저 말씀드려요.

## 다섯 살에게 설명하듯

무료 nginx가 "기본 장난감"이라면, NGINX Plus는 그 장난감에 **AS 보증서 + 특수 부품(로드밸런싱 고급 기능, 실시간 대시보드, WAF 등)**을 얹어 파는 **유료 버전**이에요. 그런데 이 AS 보증서 가격은 마트 진열대에 안 붙어 있고, "매장 직원한테 직접 물어봐야(영업팀에 문의)" 알 수 있는 구조예요. 대신 다른 사람들이 얼마 냈는지 물어봐서 대략의 시세를 알려드릴게요.

## 기술적으로(가격표 관점에서) 풀어보면

### 1. 라이선스 모델의 기본 단위

- **인스턴스(instance) 단위 과금**: 서버(또는 컨테이너) 1개에서 도는 NGINX Plus 1개당 라이선스 1개가 필요해요.
- **연 단위 또는 3년 단위 구독(subscription)**: 영구 라이선스가 아니라 매년 갱신하는 구독형이에요.
- **지원 등급(Support Tier)에 따라 가격이 달라짐**:
  - Basic (기본 지원)
  - Standard (표준 지원)
  - Premium / 24x7 Enterprise (프리미엄/24시간 엔터프라이즈 지원)
  - WAF 포함 (App Protect 웹 방화벽 애드온)

### 2. 조사된 가격대 (출처마다 편차 큼 — 참고용)

| 출처/구성 | 연간 예상 비용 (인스턴스당) |
|---|---|
| CostBench 리서치 (하위~상위 플랜) | 약 **$849 ~ $2,099** |
| 일부 리셀러/업계 자료 (Basic 지원) | 약 **$2,500** |
| 24x7 엔터프라이즈 지원 | 약 **$5,000** |
| Professional/중간 등급 지원 | 약 **$3,500** |
| WAF(App Protect) 애드온 추가 비용 | 약 **+$2,000** (별도 추가) |
| 인스턴스 여러 개(소~중규모 조직) 도입 시 총 연간 비용 | 약 **$20,000 ~ $100,000** (처리량/모듈 구성에 따라) |

→ 출처에 따라 **최소 $849부터, 지원 등급이 높아지면 $5,000+**까지 편차가 커요. 이건 F5가 협상 기반(deal-based) 가격 정책을 쓰기 때문에 자연스러운 현상이에요 — 구매 수량, 계약 기간(1년 vs 3년), 기존 F5 제품 보유 여부에 따라 실제 견적이 크게 달라져요.

### 3. 클라우드 마켓플레이스(AWS/Azure)로 "종량제" 확인하는 방법

정가는 비공개지만, **AWS Marketplace / Azure Marketplace**에는 시간당 과금(pay-as-you-go) 옵션이 공개되어 있어요.
- 약정 없이 EC2/VM 인스턴스 타입별로 시간당 요금이 다르게 책정돼요 (인스턴스 크기가 클수록 비쌈).
- "NGINX Plus Standard", "NGINX Plus Premium", "NGINX Plus with App Protect" 등 상품별로 마켓플레이스에 등록되어 있어서, **연간 계약 없이 당장 얼마인지 감을 잡고 싶다면** 이 경로가 가장 빠르고 투명해요.
- 다만 시간당 요금 × 24시간 × 365일로 계산하면 보통 직접 구독보다 비싸지는 구조라, 클라우드 종량제는 "일시적 사용/PoC(개념검증)"에 적합하고, 상시 운영이면 F5와 직접 연간 계약하는 게 저렴해요.

## 실전 조언

1. **오픈소스 nginx로 충분한지 먼저 점검**: NGINX Plus의 핵심 차별점은 **동적 리로드 없는 설정 변경(API 기반), 액티브 헬스체크, 실시간 모니터링 대시보드, 세션 퍼시스턴스, JWT 인증, WAF** 등이에요. 이 중 실제로 필요한 기능이 있는지부터 확인하세요. (OpenResty로 상당수 기능을 오픈소스로 구현하는 것도 대안이에요 — 지난 대화에서 다룬 내용과 연결돼요.)
2. **PoC는 클라우드 마켓플레이스 종량제로**: 정식 계약 전에 AWS/Azure의 시간당 과금으로 먼저 테스트해보고 실제 필요 사양을 파악한 뒤 F5 영업팀과 협상하세요.
3. **정확한 견적은 F5/리셀러(CDW 등)에 직접 문의**: 위 숫자는 추정치일 뿐이고, 정확한 금액은 인스턴스 수·지원 등급·계약 기간을 정해서 견적 요청을 해야 나와요.

Sources:
- [NGINX Plus Pricing 2026: $849–$2,099/per instance per year - CostBench](https://costbench.com/software/load-balancers/nginx-plus/)
- [How much does NGINX cost? - Sirius Open Source](https://www.siriusopensource.com/en-us/blog/how-much-does-nginx-cost)
- [NGINX Plus Pricing - TrustRadius](https://www.trustradius.com/products/nginx-plus/pricing)
- [NGINX App Protect Pricing 2026 - TrustRadius](https://www.trustradius.com/products/nginx-app-protect/pricing)
- [NGINX One FAQs: Subscription, Pricing & Support - F5](https://www.f5.com/go/faq/nginx-faq)
- [F5 NGINX Plus Subscription License listings - CDW](https://www.cdw.com/product/f5-nginx-plus-subscription-license-premium-support-1-instance/6457797)
- [AWS Marketplace: NGINX Plus Standard - Ubuntu 22.04](https://aws.amazon.com/marketplace/pp/prodview-wdzss7cdzvywc)
