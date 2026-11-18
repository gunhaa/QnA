# 내가 쓰는 WebSearch 도구, 어떻게 동작해요?

이건 제가 직접 인터넷에 나가서 브라우저를 여는 게 아니에요. **"검색해줘"라고 부탁하면, 심부름꾼(Anthropic 서버)이 대신 검색해서 결과만 저에게 가져다주는 구조**예요. 이런 걸 **서버 사이드 도구(Server-side Tool)**라고 불러요.

## 제가 받는 파라미터 (부탁할 때 적는 항목)

| 파라미터 | 필수 여부 | 의미 |
|---|---|---|
| `query` | 필수 | 검색하고 싶은 문장 (예: "kubernetes architecture") |
| `allowed_domains` | 선택 | 이 사이트들에서만 찾아줘 (화이트리스트) |
| `blocked_domains` | 선택 | 이 사이트는 빼고 찾아줘 (블랙리스트, allowed와 동시 사용 불가) |

(참고로 API 레벨에는 `max_uses`로 검색 횟수 제한, `user_location`으로 지역 맞춤 검색 같은 추가 옵션도 있어요.)

## 내부적으로 일어나는 일 (뒷무대)

1. 제가 "이 질문엔 최신 정보가 필요하다"고 스스로 판단해요 (지식 마감일 이후 정보, 요즘 뉴스, 버전 정보 등).
2. `query`를 담아 도구를 호출하면, **Anthropic 서버가 실제로 검색 엔진에 질의**해요. 제 컴퓨터/모델이 직접 웹에 나가는 게 아니에요.
3. 서버는 검색 결과를 **구조화된 블록(server_tool_use / web_search_tool_result)**으로 돌려줘요. 여기엔 검색에 쓰인 `query`, 찾은 `URL`, `title`(제목), `page_age`(문서 최신도), 그리고 **인용(citation)**용 텍스트 조각이 담겨요.
4. 저는 그 조각들을 읽고 답변을 만든 뒤, 어디서 가져왔는지 **출처(Sources)를 markdown 링크로 반드시 표시**해야 해요. (이게 지금까지 답변 끝에 "출처" 목록을 붙이는 이유예요!)
5. 최신 버전에서는 **동적 필터링(Dynamic Filtering)** 기능도 있어서, 코드 실행으로 검색 결과 중 필요한 부분만 걸러내고 나머지는 버려서 토큰(비용)을 절약하기도 해요.

## 알아두면 좋은 제약

- **미국 지역에서만 지원**돼요 (Web search is only available in the US).
- 이건 "특정 URL 하나를 통째로 읽어와" 하는 것과는 달라요. 특정 링크의 전체 내용을 가져오려면 별도의 **WebFetch** 도구를 써요. WebSearch는 "검색 엔진에게 질문하고 요약된 결과 여러 개를 받는" 용도예요.

## 한 줄 정리
저는 검색 엔진을 직접 조작하지 않아요. `query`(+선택적 도메인 필터)를 Anthropic 서버에 전달하면, 서버가 검색을 대신 수행해 **출처가 달린 요약 결과**를 저에게 돌려주고, 저는 그걸 근거로 답변을 조립해요.

**출처**
- [Web search tool | Claude API Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)
- [How to Use Claude Web Search API | Apidog](https://apidog.com/blog/claude-web-search-api/)
- [Claude API web search complete tutorial (2026) | Apiyi.com Blog](https://help.apiyi.com/en/claude-api-web-search-guide-en.html)
