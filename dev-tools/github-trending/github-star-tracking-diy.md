# "스타 개수 API로 직접 기록해서 트렌딩 만들면 되지 않아?" → 맞아요, 그런데 함정이 있어요

정확한 통찰이에요! 실제로 그렇게 만든 도구들이 있어요. 다만 두 가지 방법이 있고, 최근(2026년) 그중 하나가 막혔어요.

## 방법 A: "총 스타 개수"를 주기적으로 스냅샷 찍기 (가능함, 지금도 됨)

레고 탑을 매일 사진 찍어서 "어제보다 몇 층 더 쌓였나"를 계산하는 것과 같아요.

- GitHub 저장소 정보 API(`/repos/{owner}/{repo}`)는 그냥 지금 시점의 **총 스타 개수(stargazers_count)**를 공개로 줘요. 로그인 없이도 시간당 60번, 내 계정 토큰 쓰면 시간당 5,000번까지 요청 가능해요.
- 이 숫자를 **내가 매일/매시간 직접 기록(스냅샷)**해두면, "이번 주에 스타가 몇 개 늘었는지(=스타 속도, Star Velocity)"를 스스로 계산할 수 있어요. 이게 실제로 `caarlos0/starcharts` 같은 오픈소스 도구가 하는 방식이에요.
- 심지어 저장소 하나하나 찔러볼 필요도 없이, **GH Archive**라는 프로젝트가 GitHub에서 일어나는 모든 공개 이벤트(스타 누르기 = WatchEvent 포함)를 실시간으로 통째로 기록해 공개해요. 이걸 가져다 "최근 24시간 동안 스타가 제일 많이 늘어난 저장소"를 직접 집계할 수도 있어요.

→ **사용자분 아이디어가 정확히 이 방식이에요.** "가공"이 아니라 "직접 시계열 데이터베이스를 쌓는" 거죠.

## 방법 B: "누가 언제 별을 눌렀는지" 개별 타임스탬프 받기 (2026년 7월부터 막힘)

과거에는 GitHub이 특별한 헤더(`Accept: application/vnd.github.star+json`)를 붙이면 **"어떤 유저가 정확히 몇 시 몇 분에 스타를 눌렀는지"**까지 알려주는 엔드포인트가 있었어요. `star-history.com` 같은 유명 사이트가 이걸로 예쁜 성장 그래프를 그려줬죠.

**그런데 2026년 6월 30일 GitHub이 공지하고, 7월부터 이 엔드포인트를 그 저장소의 관리자/협업자만 볼 수 있게 제한**했어요. 그래서 지금은 남의 저장소(내가 관리자가 아닌)의 "정확한 스타 타임라인 과거 기록"은 새로 조회할 방법이 없어졌어요.

## 그래서 왜 여전히 "완벽한 트렌딩"은 어려운가

1. **방법 A(스냅샷)는 여전히 가능**하지만, "미래부터 내가 직접 기록한 데이터"만 쓸 수 있어요. 과거 것은 소급 불가능.
2. GitHub 전체 저장소는 수억 개예요. 시간당 5,000번 제한으로는 **모든 저장소를 매시간 훑는 게 사실상 불가능**해서, 결국 "미리 후보 목록을 좁히는" 로직이 또 필요해요.
3. GitHub 공식 트렌딩 알고리즘 자체는 단순 "총 스타 증가량"이 아니라 언어별 가중치, 신규 유입 속도 등 **비공개 요소가 섞여 있을 가능성**이 있어서, 내가 만든 "스타 속도 순위"가 공식 트렌딩과 100% 같지는 않을 수 있어요.

## 한 줄 정리
사용자분 말이 맞아요 — **"공식 스타 개수 API + 직접 주기적 기록"으로 나만의 트렌딩(스타 속도 랭킹)을 만드는 건 실제로 가능하고, 이미 하는 사람들이 있어요.** 다만 "누가 언제 눌렀는지"의 정밀한 과거 기록(방법 B)은 2026년 7월부터 GitHub이 막았고, "전체 저장소를 실시간으로 다 훑는" 것도 API 호출 한도 때문에 현실적으로 GH Archive 같은 별도의 이벤트 로그 파이프라인이 필요해요.

**출처**
- [GitHub Has Restricted Access to Star Data | star-history.com Blog](https://www.star-history.com/blog/github-stargazer-api-restriction/)
- [caarlos0/starcharts: Plot your repository stars over time (GitHub)](https://github.com/caarlos0/starcharts)
- [Unmasking the GitHub Star History: Track Daily Trends | Medium](https://medium.com/@emafuma/how-to-get-full-history-of-github-stars-f03cc93183a7)
- [REST API endpoints for starring | GitHub Docs](https://docs.github.com/en/rest/activity/starring)
