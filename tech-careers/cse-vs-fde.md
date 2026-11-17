# CSE와 FDE의 차이

> 여기서 CSE는 **Customer Success Engineer**, FDE는 **Forward Deployed Engineer**. (Microsoft의 옛 조직 "Commercial Software Engineering"도 CSE로 줄여 쓰지만 다른 뜻이다.)
> 직무의 등장 배경은 [고객 대면 엔지니어 직무의 역사](./history.md) 참고.

## 쉬운 설명

FDE는 고객 집에 들어가 **처음 집을 지어 주는 목수**, CSE는 이사 들어온 뒤 **집을 잘 쓰도록 계속 돌봐 주는 관리인**이다.

---

## 일반 설명

### 1. 한 줄 정의

- **FDE**: 고객 조직 안에 들어가(embedded) 고객 데이터·시스템 위에서 **직접 코드를 짜서 제품을 프로덕션까지 올리는** 엔지니어. Palantir 표현으로 "one customer, many capabilities".
- **CSE**: 도입이 끝난 고객이 제품을 **계속 잘 쓰고 더 많이 쓰도록** 기술적으로 지원하는 엔지니어. 연동 문제 해결, 모범 사례 안내, 엔지니어링팀에 이슈 전달.

### 2. 비교표

| 항목 | FDE | CSE |
|---|---|---|
| 고객 생애주기 단계 | 계약 직후 ~ 프로덕션 가동(go-live) | go-live 이후 ~ 갱신·확장 |
| 주 업무 | 고객 맞춤 파이프라인·통합·에이전트 등 **구현** | 도입(adoption) 지원, 트러블슈팅, 설정·연동 가이드, 헬스 체크 |
| 코드 비중 | 높음 (실제 프로덕션 코드 작성) | 중간~낮음 (스크립트, 샘플, 재현 코드 위주) |
| 고객 수 | 소수(1~3개) 고객에 깊게 | 다수 고객 포트폴리오를 넓게 |
| 근무 형태 | 고객 현장 상주·출장 잦음 | 주로 원격, 정기 미팅 |
| 성공 지표 | 가치 실현 시간(TTV), go-live 속도, 고객 성과 | 유지율(retention), NRR, 사용량, 티켓 해결 |
| 제품팀에 주는 것 | 현장에서 반복되는 패턴 → 제품 기능으로 환원 | 버그·기능 요청·이탈 신호 |
| 함께 일하는 직무 | AE(영업), Solutions Architect, 제품팀 | CSM, Support, Account Manager |
| 필요 역량 | 풀스택/데이터 엔지니어링, 빠른 프로토타이핑, 모호한 요구사항 정리 | 제품 깊은 이해, 디버깅, 커뮤니케이션, 교육 |
| 대표 기업 | Palantir, OpenAI, Anthropic, Scale AI 등 | Segment, Datadog 등 B2B SaaS |

### 3. 일반적인 핸드오프 흐름

```
[영업/SE] 계약 → [FDE] 고객 환경에 구축·프로덕션 가동 → 핸드오프 → [CSE/CSM] 안정 운영·확장·갱신
```

FDE가 "거기까지 가게" 만들고, CSE가 "거기서 계속 잘 돌게" 만든다.

### 4. 헷갈리는 이유

- **직함이 회사마다 다르다**: Palantir엔 "Forward Deployed Enablement Engineer, Customer Success" 같은 혼합 직함도 있다. AI 회사들은 FDE, Applied AI Engineer, Solutions Architect를 섞어 쓴다.
- **FDE를 CSM처럼 쓰는 함정**: 구축이 끝난 뒤에도 FDE가 계정 관리를 계속 떠안으면 비싼 엔지니어가 지원 업무에 묶인다는 비판이 있다.
- 결국 **JD에서 "누구의 코드를 얼마나 쓰나", "어느 단계에 책임지나", "무엇으로 평가받나"** 를 보면 구분된다.

### 5. 커리어 관점

- **FDE**: 소프트웨어 엔지니어 기본기 + 고객 문제 정의 능력. 2024~2025년 AI 회사 중심으로 수요가 급증(공고 수백 % 증가 보도). 이후 제품 엔지니어, PM, 창업으로 많이 이동.
- **CSE**: 기술 지원 → CSE → Solutions Architect/TAM, 또는 CS 리더십으로 이동하는 경로가 흔하다.

## 관련 문서

- [고객 대면 엔지니어 직무의 역사](./history.md)

## 참고 자료

- [Forward deployed engineer vs solutions engineer, sales engineer and customer success engineer (FDE Academy)](https://fde.academy/blog/forward-deployed-engineer-vs-solutions-engineer-sales-engineer-and-customer-success-engineer)
- [FDE vs Customer Success Engineer (Webfuse)](https://www.webfuse.com/compare/fde-vs-customer-success-engineer)
- [Forward deployed engineers as CSMs: It's a trap (Chad Horenfeldt)](https://chadhorenfeldt.substack.com/p/forward-deployed-engineers-as-csms)
- [Forward-Deployed Engineer vs. Solutions Engineer vs. Customer Engineer (Paraform)](https://www.paraform.com/insights/forward-deployed-engineer-vs-solutions-engineer-vs-customer-engineer)
- [Roles confused with FDE (Simpliaxis)](https://www.simpliaxis.com/resources/roles-confused-with-fde)
- [What Is a Forward Deployed Engineer in 2026 (Underdog.io)](https://underdog.io/blog/forward-deployed-engineer)
- [Customer Success Engineer (Leadfeeder)](https://www.leadfeeder.com/blog/customer-success-engineer/)
- [Meet the Success Engineer (Customer Success Collective)](https://www.customersuccesscollective.com/meet-the-success-engineer.md)
- [The Definitive Guide to Forward Deployed Engineering (Next Play)](https://nextplayso.substack.com/p/the-definitive-guide-to-forward-deployed)
