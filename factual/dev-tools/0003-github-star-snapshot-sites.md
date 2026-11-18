# 방법 A(스타 개수 꾸준히 기록)로 만든 실제 사이트들

네, 있어요! 실제로 "매일 사진 찍듯이 스타 개수를 기록해서" 트렌딩을 계산하는 유명한 사이트가 여럿 있어요.

## 1. OSSInsight — ossinsight.io ⚠️ (현재 순위 업데이트 중단됨, 아래 검증 참고)

- 스타 개수 스냅샷보다 한 단계 더 나아가서, **GitHub에서 일어나는 모든 공개 이벤트(스타, 커밋, PR, 이슈 등) 105억 건 이상을 실시간으로 수집**해요.
- 이 데이터를 통째로 데이터베이스(TiDB)에 쌓아두고 SQL처럼 분석해서, 일간/주간/월간 트렌딩을 계산해요.
- `github.com/trending` HTML을 베끼는 게 아니라 **원본 이벤트 로그를 직접 집계**하는 방식이라 훨씬 근거가 투명해요.
- **[2026-09-02 업데이트] 직접 접속해서 확인해보니, GitHub의 이벤트 피드 페이지네이션 변경을 감지 못해 2025년 중반부터 스타/PR/이슈 트렌딩 순위 업데이트가 공식적으로 중단(pause)된 상태예요.** 설계는 좋지만 지금 당장은 최신 트렌딩 용도로 신뢰하기 어려워요. 자세한 건 [`github-trending-sites-verification.md`](./github-trending-sites-verification.md) 참고.

## 2. Trendshift — trendshift.io

- "떡상하고 나서가 아니라, 떡상하는 중일 때" 잡아내는 걸 목표로, **꾸준한 상승세(Momentum)**를 기준으로 순위를 매겨요.
- GitHub 공식 트렌딩 페이지에 올랐던 저장소들의 **과거 기록 아카이브**도 제공해요 (얼마나 자주, 얼마나 오래 트렌딩에 머물렀는지).
- 스타, 포크, 머지된 PR, 이슈 등을 매달 계속 축적해서 저장해요.

## 3. Best of JS — bestofjs.org

- 큐레이션한 약 3,600여 개의 웹/Node.js 관련 프로젝트를 대상으로 **매일 스타 개수 스냅샷**을 찍어요.
- 이 데이터로 "최근 몇 달간 얼마나 떴는지" 추세를 그려주고, 매주 일요일 "이번 주 가장 뜬 프로젝트 Top 10" 뉴스레터를 보내요.
- 전체 GitHub이 아니라 **분야를 좁힌(JS 생태계) 소수 정예 목록**만 추적하는 게 특징이에요. (전체를 다 훑기엔 API 한도가 부족하다는, 지난번 말씀드린 문제의 실제 해결책이에요!)

## 4. GH Archive 기반 개인 프로젝트들 — gharchive.org

- OSSInsight의 원재료가 되는 **원본 이벤트 로그 저장소** 자체예요. 2011년부터 지금까지 모든 공개 GitHub 이벤트(스타=`WatchEvent` 포함)를 시간별로 압축해서 무료 공개해요.
- Google BigQuery로 바로 SQL 질의도 가능해서, 개발자들이 이걸 가져다 자기만의 "지난 24시간 스타 급상승 저장소" 같은 걸 직접 만들기도 해요. (`antonkomarev/github-trending-archive` 같은 개인 프로젝트가 예시예요)

## 정리

| 사이트 | 방식 | 특징 |
|---|---|---|
| OSSInsight | 전체 이벤트 실시간 수집 | 가장 방대하고 투명, SQL 분석 가능 |
| Trendshift | 스타/PR/이슈 등 월별 축적 | "상승 중" 모멘텀 강조, 과거 트렌딩 이력 보관 |
| Best of JS | 매일 스타 스냅샷 | 특정 분야(JS)로 좁혀서 API 한도 문제 회피 |
| GH Archive | 원본 이벤트 로그 자체 | 남이 만든 사이트가 아니라, 내가 직접 만들 때 쓰는 재료 |

**출처**
- [We Built a GitHub Trending Page That Actually Uses Data | OSS Insight Blog](https://ossinsight.io/blog/introducing-trending-page)
- [Live trending GitHub repositories — daily momentum ranking | Trendshift](https://trendshift.io/)
- [Best of JS • About](https://bestofjs.org/about)
- [GH Archive](https://www.gharchive.org/)
- [antonkomarev/github-trending-archive (GitHub)](https://github.com/antonkomarev/github-trending-archive)
