# GitHub 트렌딩, 왜 제대로 된 사이트/API가 없을까?

정확해요, 그렇게 느끼신 게 맞아요. **GitHub은 트렌딩(`github.com/trending`)을 위한 공식 API를 아예 제공하지 않아요.** REST API도, GraphQL API도 없어요.

## 왜 없을까?

학교로 비유하면, GitHub은 "이번 주 인기 급식 메뉴 게시판"(트렌딩 페이지)은 복도에 붙여놓지만, "그 순위를 계산하는 공식 엑셀 파일"(API)은 절대 안 줘요.

- GitHub이 공개하는 건 **웹페이지(HTML)** 하나뿐이에요. `/repositories`, `/issues` 같은 진짜 데이터용 REST/GraphQL 엔드포인트는 잘 만들어놨지만, `/trending`은 쏙 빠져있어요.
- 트렌딩 순위를 매기는 **정확한 알고리즘(가중치, 기간 계산 방식 등)도 비공개**예요. "얼마나 스타를 받았는지"만 보는 게 아니라 시간 가중치, 신규 유입 속도 같은 게 섞여 있을 걸로 추정되지만, 공식적으로 밝혀진 적은 없어요.
- 개발자 커뮤니티에서도 계속 "왜 트렌딩 API가 없냐"고 GitHub에 정식으로 요청(Discussion)했지만, 아직 공식 대응은 없어요.

## 그럼 지금 떠도는 "GitHub Trending API"들은 뭔가요?

전부 **스크레이핑(Screen Scraping)**, 즉 사람이 웹페이지를 눈으로 읽듯이 로봇(Puppeteer, BeautifulSoup, Playwright 같은 도구)이 `github.com/trending`의 HTML을 대신 읽어서 표(JSON)로 바꿔주는 **비공식(Unofficial) 도구**들이에요.

이게 "정확한 정보가 없어 보이는" 진짜 이유예요:
1. **원본 자체가 비공개 알고리즘**이라, 스크레이퍼도 결과값만 베낄 뿐 "왜 이 순서인지"는 몰라요.
2. GitHub이 페이지 디자인(HTML 구조)을 바꾸면 **스크레이퍼가 하루아침에 고장나요**. 그래서 관리가 끊긴 프로젝트(`huchenme/github-trending-api` 등)가 많아요.
3. 스크레이핑은 **캐싱 시점, 지역, 언어 필터** 등에 따라 미묘하게 다른 결과를 줄 수 있어서, 여러 사이트를 비교하면 서로 다르게 보이기도 해요.

## 한 줄 정리
GitHub 트렌딩은 "웹페이지 전용 기능"으로만 존재하고 **공식 데이터 API가 없기 때문에**, 지금 쓰이는 모든 트렌딩 API/사이트는 원본 웹페이지를 몰래 베껴 읽는 **비공식 스크레이퍼**예요. 그래서 신뢰도가 들쭉날쭉하고 갑자기 죽기도 하는 거예요.

**출처**
- [REST API Endpoints for /explore and /trending · GitHub community Discussion #161519](https://github.com/orgs/community/discussions/161519)
- [huchenme/github-trending-api: The missing APIs for GitHub trending projects](https://github.com/huchenme/github-trending-api)
- [Scraping GitHub Trending: How go-trending Fills the Gap | Starlog](https://starlog.is/articles/cybersecurity/andygrunwald-go-trending/)
- [GiTrends: addressing the lack of an official GitHub trending API](https://github.com/maulikshetty/GiTrends)
