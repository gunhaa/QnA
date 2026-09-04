# WebSearch가 "어디서, 어떻게" 가져오는지는 저도 몰라요?

네, 맞아요. **저(모델)는 그 안쪽을 들여다볼 수 없어요.** 심부름꾼(Anthropic 서버)에게 "이거 찾아줘"라고 쪽지만 건네고, 심부름꾼이 봉투에 결과만 담아 돌려주는 구조라서, 그 심부름꾼이 "어느 도서관에서, 무슨 방법으로" 찾았는지는 저한테 안 알려줘요.

## 공식적으로 확인된 것 vs 안 된 것

| 구분 | 내용 |
|---|---|
| ✅ 확인됨 (공식 문서) | 이건 **서버 사이드 도구(Server-side Tool)**다. Anthropic API 서버가 검색을 대신 수행하고, `query`(검색어) → `URL/title/page_age/인용문`으로 **구조화된 결과**를 돌려준다. |
| ❓ 추정됨 (공식 발표 아님, 제3자 분석) | 실제 검색 엔진은 **Brave Search**로 보인다는 분석 결과가 있어요 (Claude가 인용한 결과와 Brave 검색 상위 결과가 86.7% 겹친다는 조사). 하지만 이건 외부 리서치의 "추정"이지, Anthropic이 "우리는 Brave를 씁니다"라고 공식적으로 확정 발표한 문장은 검색되지 않았어요. |
| ❌ 알 수 없음 | 어떤 랭킹 알고리즘을 쓰는지, 어떤 웹 크롤러(Crawler)로 색인했는지, 결과를 얼마나 필터링/재정렬하는지 같은 **내부 구현 디테일**은 공개되지 않았어요. |

## 왜 이렇게 설계됐을까? (기술적 이유)

- **캡슐화(Encapsulation)**: 저(모델)는 "검색 결과"라는 인터페이스만 받아요. 내부 검색 엔진을 Anthropic이 나중에 바꾸더라도(Brave→다른 곳), 제가 쓰는 방식은 똑같이 유지돼요. 이건 소프트웨어에서 흔한 **관심사 분리(Separation of Concerns)** 설계예요.
- **신뢰/안전 이유**: 만약 제가 직접 임의의 검색엔진에 접속하고 결과를 가공 없이 그대로 가져오면, 악성 콘텐츠나 프롬프트 인젝션(Prompt Injection) 위험이 커져요. 서버가 중간에서 한 번 정제해서 넘겨주는 구조가 더 안전해요.

## 한 줄 정리
저는 "검색어를 보내면 정리된 결과가 온다"는 것만 알지, **그 결과가 정확히 어느 검색엔진·어떤 알고리즘으로 만들어졌는지는 원리적으로 알 수 없어요.** Brave일 가능성이 높다는 건 외부 관찰(추정)일 뿐, 제 안에 "나는 Brave를 쓴다"는 정보가 내장되어 있지는 않아요.

**출처**
- [Web search tool | Claude API Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)
- [Introducing web search on the Anthropic API | Claude by Anthropic](https://claude.com/blog/web-search-api)
- [Anthropic Web Search Tool | Cobus Greyling](https://cobusgreyling.medium.com/anthropic-web-search-tool-80f089ad56d7)
- [Claude web search explained | tryprofound](https://www.tryprofound.com/blog/what-is-claude-web-search-explained)
