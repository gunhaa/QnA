---
type: inquiry
created: 2026-11-17
author: agent
model: claude-opus-5-5
---

# 고객 대면 엔지니어 직무의 역사 (Field Engineer → SE → CSE → FDE)

## 쉬운 설명

옛날엔 기계를 팔면 기사님이 고객 집에 와서 설치하고 고쳐 줬다. 소프트웨어 시대엔 "팔기 전에 보여 주는 사람(SE)", "산 뒤에 잘 쓰게 돕는 사람(CSE)", 요즘 AI 시대엔 "고객 회사에 들어가 직접 만들어 주는 사람(FDE)"으로 역할이 나뉘었다.

---

## 일반 설명

### 1. 하드웨어 시대: Field Engineer (1950~80년대)

- IBM 등 메인프레임 벤더는 고객 현장에 상주하며 설치·유지보수를 맡는 **Field Engineer(FE)/Customer Engineer** 를 뒀다.
- "벤더 엔지니어가 고객 현장에 나가 있는다"는 발상이 이후 FDE의 먼 원형으로 자주 언급된다.

### 2. 엔터프라이즈 소프트웨어 시대: Sales Engineer / Solutions Engineer (1980~2000년대)

- 온프레미스 라이선스 판매가 중심이라 **계약 전 단계**가 가장 중요했다.
- **Sales Engineer(SE)/Pre-sales Engineer** 가 데모, PoC, 기술 질의 대응을 맡고, 설치 이후는 **Professional Services**(유료 컨설팅·구축)나 **Support** 가 맡았다.

### 3. SaaS 시대: Customer Success와 CSE (2000년대 후반~)

- **1996~1997년 Vantive**(CRM 벤더)가 높은 이탈률 대응을 위해 최초의 Customer Success 부서를 만든 것으로 알려진다(연도는 출처마다 다름).
- **2005년 전후 Salesforce** 가 구독 모델에서 이탈(churn)이 치명적이라는 걸 깨닫고 대규모 CS 조직("Customers for Life")을 만들며 업계에 확산됐다.
- 구독 모델에선 "팔고 끝"이 아니라 **갱신(renewal)과 확장(expansion)** 이 매출이므로, 계약 이후 고객이 제품을 잘 쓰게 만드는 조직이 필요해졌다.
- 2009~2013년 Gainsight·Totango 같은 CS 플랫폼과 컨퍼런스가 등장하며 직군이 정착했다.
- CSM(Customer Success Manager)이 관계·비즈니스를 맡는다면, 기술적으로 깊은 지원이 필요한 B2B SaaS(API, 데이터 연동 제품 등)에서 **Customer Success Engineer(CSE)/Success Engineer** 가 생겼다. 예: Segment는 CEO가 최초의 Success Engineer였다고 밝힌다.

### 4. Palantir와 FDE (2000년대 중후반~2010년대)

- Palantir가 정부·국방 고객 대상 데이터 플랫폼을 배치하며 **Forward Deployed (Software) Engineer** 직무를 만들었다. 시작 시점은 2005년, 2009년경, 2010년대 초 등 출처마다 다르다.
- 내부 명칭: 제품 엔지니어 **"Dev" = one capability, many customers**, 현장 엔지니어 **"Delta" = one customer, many capabilities**.
- 핵심 아이디어: 범용 제품이 고객 문제를 다 못 풀면, 엔지니어를 고객 쪽에 붙여 **현장에서 코드를 짜서 메우고**, 반복되는 패턴은 제품으로 흡수한다.
- 비용이 커서 오랫동안 "Palantir식 컨설팅"이라는 비판도 받았다.

### 5. 생성형 AI 시대: FDE의 재유행 (2024~현재)

- LLM은 범용 모델이지만 기업 데이터·워크플로·평가 체계에 맞게 붙이는 작업이 가치의 대부분이라, Palantir 모델이 다시 맞아떨어졌다.
- 2024~2025년 OpenAI, Anthropic, Cohere 등이 FDE 채용을 본격화했다. OpenAI는 2025년 전담 FDE 팀을 꾸렸고, Anthropic은 Forward Deployed Engineer 외에 Applied AI Engineer/Architect 직무도 둔다.
- FT 인용 자료로는 2025년 1~9월 FDE 공고가 800% 이상 늘었다고 한다(낮은 기저에서의 증가라는 지적도 있음).
- 지금은 회사마다 SE, Solutions Architect, CSE, FDE, Applied AI Engineer의 경계가 섞여 있어, **직함보다 실제 업무 기술서(JD)** 를 봐야 한다.

### 6. 흐름 요약

| 시대 | 매출 구조 | 대표 직무 | 핵심 질문 |
|---|---|---|---|
| 메인프레임 | 장비 판매·유지보수 | Field Engineer | 기계가 잘 돌아가나? |
| 온프레미스 SW | 라이선스 판매 | Sales/Solutions Engineer | 계약을 따낼 수 있나? |
| SaaS | 구독 갱신·확장 | CSM / CSE | 고객이 계속 쓰고 더 쓰나? |
| AI·데이터 플랫폼 | 고객 성과 기반 도입 | FDE | 고객 현장에서 실제로 동작하게 만들 수 있나? |

## 관련 문서

- [CSE와 FDE의 차이](./0005-cse-vs-fde.md)

## 참고 자료

- [How Palantir Invented Forward Deployed Engineering and Why AI Labs Copied It (InterviewBit)](https://www.interviewbit.com/varsity/blog/?p=1275)
- [The Definitive Guide to Forward Deployed Engineering (Next Play)](https://nextplayso.substack.com/p/the-definitive-guide-to-forward-deployed)
- [The Rise of the Forward Deployed Engineer: History, Myths, and Why It's Back (Cloud Authority)](https://cloud-authority.com/the-rise-of-the-forward-deployed-engineer-history-myths-and-why-it-s-back)
- [The FDE role at OpenAI (The Pragmatic Engineer)](https://newsletter.pragmaticengineer.com/i/170794709/3-the-fde-role-at-openai)
- [AI Forward Deployed Engineer jobs 2025 (Interview Query)](https://www.interviewquery.com/p/ai-forward-deployed-engineer-jobs-2025)
- [Forward Deployed Engineer: AI's Hottest New Career, or Consulting With a Better Title? (KDnuggets)](https://kdnuggets.com/forward-deployed-engineer-ais-hottest-new-career-or-consulting-with-a-better-title)
- [Customer Success Management: The Development Of A Profession (VARinsights)](https://www.varinsights.com/doc/customer-success-management-the-development-of-a-profession-0001)
- [A Brief History of Customer Success (CustomerGauge)](https://customergauge.com/blog/a-brief-history-of-customer-success)
- [Evolution of the CSM (Planhat)](https://www.planhat.com/blog/evolution-of-the-csm/)
- [How Success Engineers Keep Us Customer-First (Segment)](https://segment.com/blog/success-engineers-customer-first)
