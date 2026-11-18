# GEO(Generative Engine Optimization): SEO 다음 단계?

## 쉬운 설명

SEO는 도서관 **책장 맨 앞 칸**에 내 책이 꽂히게 하는 일이다. GEO는 사서 로봇(AI)이 질문을 받았을 때 **"이 책 내용이 믿을 만하네"** 하고 내 책을 인용해 설명해 주게 하는 일이다. 줄 세우기 경쟁에서 "**인용 대상으로 뽑히기**" 경쟁으로 바뀐 것이다.

## 일반 설명

### 1. 정의

**GEO**는 ChatGPT, Gemini, Perplexity, Google AI Overviews, Copilot 같은 **생성형 AI 검색 응답에서 내 콘텐츠가 인용·언급·추천되도록 최적화**하는 활동이다.

- 용어 출처: 2023년 11월 Princeton, IIT Delhi, Georgia Tech, Allen AI 연구진의 논문 *"GEO: Generative Engine Optimization"* (KDD 2024 채택).
- 같은 계열 용어: **AEO**(Answer Engine Optimization, 질문에 직접 답하는 구조화), **LLMO/AIO** 등. 업계에서 경계는 모호하며 혼용된다.
- **SEO를 대체하는 것이 아니라 확장**이다. AI 검색도 접근 가능한 웹 콘텐츠와 기존 권위 신호에 의존한다.

### 2. SEO와의 차이

| 구분 | SEO | GEO |
|---|---|---|
| 목표 | 검색 결과 **순위**, 클릭 유입 | AI 답변 안의 **인용/언급/추천** |
| 결과물 | 링크 10개 목록 | 하나의 합성된 답변(+출처) |
| 핵심 신호 | 키워드, 백링크, 페이지 경험 | **엔티티 인식**, 신뢰·권위, 명확한 사실 문장 |
| 지표 | 순위, CTR, 트래픽 | **AI 가시성(인용률, 언급 점유율, Share of Voice)** |
| 영향 범위 | 주로 자사 사이트(1st party) | 외부 생태계 평판(3rd party) 비중 큼 |
| 클릭 | 클릭이 목표 | 답변 안에서 소비(제로 클릭)되기도 함 |

업계 글(2026)은 AI 참조의 상당 부분(약 85%라는 수치가 인용됨)이 제3자 플랫폼에서 나오고, GEO가 "80% 전략(브랜드 권위·생태계 존재감), 20% 기술"이라고 주장한다. 다만 이는 **마케팅 업체 글의 수치**이므로 참고용으로만 본다.

### 3. 작동 원리 (왜 이런 최적화가 먹히나)

AI 검색은 대체로 **RAG와 유사한 흐름**이다.

```mermaid
flowchart LR
    Q["사용자 질문"] --> R["검색/리트리벌<br/>(웹 인덱스, 크롤러)"]
    R --> C["후보 문서·청크"]
    C --> L["LLM이 합성 답변 생성"]
    L --> A["답변 + 인용(출처)"]
```

- **리트리벌 단계**에서 후보로 뽑혀야 한다(접근 가능, 인덱싱, 관련성).
- **생성 단계**에서 인용될 만한 문장이어야 한다(추출하기 쉬운 사실, 신뢰 가능한 출처).
- 따라서 GEO는 "검색되기 좋게 + 인용·요약되기 좋게"의 두 겹이다. RAG 관점의 청킹/임베딩 감각이 그대로 적용된다.

### 4. 실증 연구 (Princeton GEO 논문)

논문은 생성형 검색 응답에서 콘텐츠 가시성을 올리는 기법을 블랙박스 방식으로 평가했다.

| 효과 있었던 기법 | 내용 |
|---|---|
| **통계 추가** | 모호한 서술 대신 구체적 수치 |
| **권위 있는 출처 인용** | 출처 명시, 레퍼런스 |
| **전문가 인용문(Quotation)** | 인용구 삽입 |
| 가독성/명확성 개선, 전문 용어 사용 | 보조적 효과 |
| 키워드 스터핑 | **효과 거의 없음/비효과적**(전통 SEO 기법이 그대로 통하지 않음) |

- 검색된 자료는 통계·출처·인용 기법이 가시성을 **약 40% 안팎(최대)** 끌어올렸다고 전한다. 일부 2차 글은 "77~115%"라는 더 큰 수치를 인용하는데 **논문 헤드라인과 불일치**하여 신뢰하기 어렵다. 정확한 수치는 원문(arXiv 2311.09735)을 확인할 것.
- 효과는 도메인(질문 유형)마다 다르며, 실험은 연구용 생성 엔진 환경이라 **상용 서비스에 그대로 일반화된다는 보장은 없다.**

### 5. 실무 체크리스트

**콘텐츠 작성**
1. **답을 먼저 쓴다.** 제목(질문형)+첫 1~2문장 결론, 이후 근거. 추출하기 쉽다.
2. **자기완결적 문단.** 한 문단이 단독으로 읽혀도 의미가 통해야 한다(청킹되어 가져가므로).
3. **구체적 수치·날짜·출처**를 명시한다. 모호한 형용사를 줄인다.
4. **전문가/저자 정보, 업데이트 날짜**를 노출한다(E-E-A-T 계열 신뢰 신호).
5. 표, 목록, FAQ, 정의 문장 등 **구조화된 형식**을 쓴다.

**기술**
1. **AI 크롤러 허용 여부 확인**: `robots.txt`에서 GPTBot, OAI-SearchBot, PerplexityBot, Google-Extended, ClaudeBot 등을 의도에 맞게 허용/차단. 차단하면 인용 후보에서 빠질 수 있다.
2. **서버 사이드 렌더링/정적 HTML**: 많은 AI 크롤러는 JS를 실행하지 않거나 제한적이라, 핵심 텍스트가 초기 HTML에 있어야 한다.
3. **Schema.org 구조화 데이터**(Article, FAQPage, Organization, Product, Review): 엔티티를 명확히 한다.
4. 사이트맵, 정규 URL, 빠른 응답 등 **기본 SEO 위생**.
5. **`llms.txt`**(LLM용 사이트 안내 파일 제안): 채택이 늘고 있으나 **주요 AI 서비스가 실제로 사용한다는 근거는 불분명**하다. 검색에서 확정적 근거를 확인하지 못했으므로 "있으면 손해 없는 보조 수단" 정도로 본다.

**브랜드/생태계(3rd party)**
1. 위키피디아·위키데이터, 업계 매체, 리뷰 사이트, 포럼(Reddit 등), 문서 사이트에서의 **일관된 엔티티 정보**(이름, 설명, 제품 정의).
2. 외부 매체 언급, 전문가 기고, 사례 연구로 **제3자 신뢰 신호** 확보.
3. 브랜드명·제품명·카테고리를 **같은 표현으로 일관되게** 쓴다.

### 6. 측정

- 주요 질문 세트(예: 50~100개)를 정해 ChatGPT, Gemini, Perplexity, AI Overviews에 **주기적으로 질의**하고 인용/언급 여부·순서·감성을 기록한다.
- 상용 도구(AI 가시성 트래킹 SaaS)도 늘고 있으나, 답변이 **비결정적**(같은 질문도 매번 다름)이라 반복 측정과 평균이 필요하다.
- 레퍼럴 트래픽(`chatgpt.com`, `perplexity.ai` 등)을 분석 도구에서 분리해 본다.

### 7. 한계와 주의

- 규칙이 **공개·안정적이지 않다.** 각 AI 서비스의 리트리벌/랭킹 방식이 비공개이고 자주 바뀐다.
- GEO 컨설팅 업계는 이해관계가 있어 **성과 수치가 과장**되기 쉽다. 인과가 불확실한 상관 수치에 주의한다.
- 조작(숨은 텍스트, AI에게 보내는 프롬프트 인젝션 문구, 가짜 인용)은 **정책 위반·신뢰 훼손 위험**이 크다. 정직한 구조화와 사실성이 장기적으로 유리하다.
- 사내 문서/RAG 서비스 관점에서는 같은 원칙(자기완결 청크, 메타데이터, 최신성)이 **내부 검색 품질** 개선에도 적용된다 ([RAG 구현 폴더](../rag-implementation/) 참고).

### 출처

- [Generative engine optimization (Wikipedia)](https://en.wikipedia.org/wiki/Generative_engine_optimization)
- [What is Generative Engine Optimization? GEO vs AEO vs SEO (Jasper)](https://www.jasper.ai/blog/geo-aeo)
- [GEO, AEO, and SEO in 2026 (WRITER)](https://writer.com/blog/geo-aeo-optimization/)
- [GEO vs SEO (Writesonic)](https://writesonic.com/blog/geo-vs-seo)
- [Generative Engine Optimization framework introduced in new research (Search Engine Land)](https://searchengineland.com/generative-engine-optimization-framework-introduced-research-paper-435855)
- [GEO 논문 (arXiv 2311.09735, alphaXiv)](https://alphaxiv.org/audio/2311.09735v3)
- [Generative Engine Optimization (GEO): The Complete Guide for 2026 (LLMPulse)](https://llmpulse.ai/blog/geo-guide/)
