---
type: inquiry
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# GitHub Pages 개요

## 쉬운 설명

GitHub 저장소는 코드를 넣어 두는 **서랍**이다. GitHub Pages는 그 서랍 앞에 **진열장**을 붙여 주는 기능이다. 서랍에 HTML 파일을 넣으면 GitHub가 진열장에 그대로 꺼내 놓고, 누구나 주소(`xxx.github.io`)로 와서 볼 수 있다. 진열장은 무료지만 **보여 주기만** 할 수 있다. 계산대(서버 로직, DB)는 없다.

## 일반 설명

### 1. 정의

GitHub Pages는 GitHub 저장소의 파일(HTML·CSS·JS·이미지)을 그대로 웹사이트로 서비스하는 **정적 사이트 호스팅** 서비스다. 서버 측 코드(PHP, Node.js, DB 질의)는 실행하지 않는다. 주 용도는 프로젝트 문서, 개인 블로그·포트폴리오, 오픈소스 라이브러리 소개 페이지, 기술 문서(Docusaurus·MkDocs 등 출력물)다.

### 2. 사이트 종류와 URL

| 종류 | 저장소 조건 | 기본 URL | 개수 제한 |
|---|---|---|---|
| 사용자/조직 사이트 | 저장소 이름이 `<owner>.github.io` | `https://<owner>.github.io` | 계정당 1개 |
| 프로젝트 사이트 | 아무 저장소 | `https://<owner>.github.io/<repo>` | 저장소당 1개 |

두 종류 모두 **커스텀 도메인**을 붙일 수 있다.
- 서브도메인(`www.example.com`, `docs.example.com`) → DNS `CNAME` 레코드를 `<owner>.github.io`로
- apex 도메인(`example.com`) → `A`/`AAAA` 레코드(또는 `ALIAS`/`ANAME`)로 GitHub IP 지정
- 도메인은 저장소의 `CNAME` 파일만으로는 설정되지 않는다. 저장소 Settings 또는 API로 등록해야 한다.
- 도메인 탈취(takeover)를 막으려면 계정 단위 **도메인 검증(verify)** 을 먼저 하는 것을 GitHub가 권장한다.
- HTTPS는 기본 `github.io`와 커스텀 도메인 모두 지원한다. 커스텀 도메인은 Let's Encrypt 인증서가 자동 발급되며, "Enforce HTTPS" 옵션으로 HTTP를 강제 리다이렉트한다.

### 3. 배포 방식 (Publishing source)

| 방식 | 동작 | 언제 쓰나 |
|---|---|---|
| **브랜치에서 배포** | 지정 브랜치의 `/`(루트) 또는 `/docs` 폴더를 게시. 기본적으로 **Jekyll**로 빌드 | 순수 HTML이나 Jekyll 블로그. 빌드 과정을 따로 관리하고 싶지 않을 때 |
| **GitHub Actions** | 워크플로에서 빌드 → `actions/upload-pages-artifact` → `actions/deploy-pages` | Hugo, Astro, Next.js(static export), Vite, MkDocs 등 Jekyll이 아닌 도구. 빌드 결과물 전용 브랜치(`gh-pages`)를 두고 싶지 않을 때 |

참고:
- 브랜치 방식에서 Jekyll 처리를 끄려면 루트에 빈 `.nojekyll` 파일을 둔다. `_`로 시작하는 폴더(예: `_next/`)가 무시되는 문제를 피할 때 쓴다.
- 브랜치 방식도 내부적으로는 GitHub Actions(`pages-build-deployment`)로 돈다. 2024년 6월 30일 구형 빌드 아키텍처가 종료됐다.
- 워크플로가 `GITHUB_TOKEN`으로 푸시한 커밋은 Pages 빌드를 트리거하지 않는다. 심볼릭 링크가 있는 사이트는 Actions 방식만 쓸 수 있다.
- Actions 템플릿은 `github-pages`라는 environment를 자동 생성한다. 기본 브랜치만 배포하도록 보호 규칙을 거는 것이 권장이다.

Actions 방식 최소 예시:

```yaml
name: Deploy Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build          # 빌드 결과가 dist/ 에 생긴다고 가정
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 4. 요금제와 공개 범위

| 요금제 | 사용 가능 저장소 |
|---|---|
| GitHub Free (개인·조직) | **public 저장소만** |
| Pro, Team, Enterprise Cloud/Server | public + private 저장소 |

- **private 저장소여도 사이트는 인터넷에 공개된다.** 저장소가 비공개라고 페이지가 비공개가 되지 않는다.
- 사이트 접근을 제한하는 **비공개 게시(private publishing / access control)** 는 **Enterprise Cloud 조직**의 private·internal 저장소 **프로젝트 사이트**에서만 된다. 저장소 read 권한이 있는 사람만 볼 수 있다. 조직 사이트(`<org>.github.io`)에는 적용되지 않는다.
- 방문자 IP는 보안 목적으로 GitHub가 로그에 저장한다.

### 5. 사용 제한

| 항목 | 제한 |
|---|---|
| 게시된 사이트 크기 | 최대 1 GB |
| 소스 저장소 | 1 GB 권장 |
| 대역폭 | 월 100 GB (soft limit) |
| 빌드 횟수 | 시간당 10회 (soft limit, **커스텀 Actions 워크플로는 예외**) |
| 배포 시간 | 10분 초과 시 타임아웃 |
| 레이트 리밋 | 초과 시 HTTP 429 |

soft limit을 넘으면 GitHub가 연락해 CDN 앞단 배치, Releases 활용, 다른 호스팅 이전을 권할 수 있다.

**금지 용도**
- 온라인 비즈니스, 전자상거래, 상업용 SaaS의 무료 호스팅
- 비밀번호·카드 번호 같은 민감한 거래 처리
- 그 밖에 GitHub 이용약관 위반 콘텐츠

### 6. 할 수 없는 것과 대안

| 필요한 기능 | GitHub Pages | 대안 |
|---|---|---|
| 서버 측 로직·API **구현** | 불가 (외부 API **호출**은 가능, 7장 참고) | 외부 API(Serverless), Cloudflare Workers |
| 커스텀 응답 헤더(CSP, CORS 등) | 불가 (`<meta>` 태그로 일부만) | Netlify, Cloudflare Pages, Vercel |
| SPA 라우팅 rewrite | 불가 (`404.html` 꼼수나 hash 라우팅) | 위 서비스의 rewrite 규칙 |
| PR별 미리보기 배포 | 기본 미지원 | Netlify/Vercel/Cloudflare Pages |
| 비공개 사이트 | Enterprise Cloud만 | Cloudflare Access 등 앞단 인증 |

정리하면, **공개 문서·블로그·포트폴리오처럼 정적이고 트래픽이 적당한 사이트**에는 무료이고 저장소와 바로 연결된다는 점에서 가장 간단한 선택지다. 헤더 제어, 미리보기 배포, 상업용 서비스가 필요하면 Netlify·Vercel·Cloudflare Pages 쪽이 맞다.

### 7. (추가 질문) JS로 외부 API를 호출할 수 있나?

**가능하다.** "서버 코드를 못 돌린다"는 건 GitHub 서버가 내 코드를 실행하지 않는다는 뜻이다. 브라우저가 내려받은 JS는 방문자의 브라우저에서 실행되므로 `fetch()`로 외부 API를 부르는 구조는 정상 동작한다.

```
[브라우저] ──① HTML/JS 다운로드──▶ [GitHub Pages (정적 파일만)]
     │
     └──② fetch('https://api.example.com/...') ──▶ [외부 API 서버]
```

```js
const res = await fetch('https://api.example.com/items');
const data = await res.json();
```

걸리는 조건은 세 가지다.

| 조건 | 내용 | 안 맞으면 |
|---|---|---|
| **CORS** | 호출 대상 API가 `Access-Control-Allow-Origin`에 `https://<owner>.github.io`(또는 `*`)를 허용해야 한다. 커스텀 헤더·JSON body를 쓰면 preflight(`OPTIONS`)도 통과해야 한다 | 브라우저가 응답을 차단 (API 서버엔 요청이 도착했어도 JS가 결과를 못 읽음) |
| **HTTPS (Mixed Content)** | Pages는 HTTPS로 서비스되므로 `http://` API는 브라우저가 막는다 | 요청 자체가 차단됨 |
| **비밀 값 노출** | JS 코드와 네트워크 요청은 개발자 도구로 누구나 본다. 빌드 시점에 환경 변수로 넣어도 결과 번들에 평문으로 박힌다 | API 키 도용, 요금 폭탄 |

**경우별 판단**

| API 유형 | GitHub Pages에서 직접 호출 |
|---|---|
| 공개 API, 키 불필요, CORS 허용 (예: GitHub REST API 공개 엔드포인트, 공공 데이터 중 일부) | ✅ 그대로 가능 |
| 브라우저 노출을 전제로 한 공개 키 (Firebase/Supabase anon key, Google Maps 키 + 도메인 제한) | ✅ 가능. 보안은 키가 아니라 서버 측 규칙(RLS, 도메인 제한)이 담당 |
| OAuth 로그인 후 사용자 토큰으로 호출 (PKCE 흐름) | ✅ 가능 |
| 비밀 키가 필요한 API (OpenAI, 결제, 사내 API 관리자 키 등) | ❌ 직접 호출 금지 → 프록시 필요 |
| CORS를 허용하지 않는 API | ❌ 브라우저에서 불가 → 프록시 필요 |

**프록시 패턴**: 비밀 키나 CORS 문제가 있으면 서버리스 함수를 중간에 둔다.

```
[브라우저] ──▶ [Cloudflare Workers / AWS Lambda / Vercel Function] ──(비밀 키 첨부)──▶ [외부 API]
               └ 키는 서버리스의 환경 변수(secret)에 보관
               └ 응답에 CORS 헤더 추가
               └ Origin 허용 목록·레이트 리밋으로 남용 방지
```

프록시는 아무나 호출하면 내 키로 요금이 나가는 "열린 중계기"가 되므로, 허용 Origin 검사와 레이트 리밋을 꼭 건다. 단 Origin 헤더는 브라우저 밖(curl 등)에서는 위조할 수 있으므로, 정말 중요한 API면 사용자 인증까지 붙여야 한다.

정리: **정적 페이지 + 브라우저 fetch는 가능**하고, **비밀을 지켜야 하거나 CORS가 막힌 경우에만** 서버리스 프록시를 하나 더 둔다. 이 조합이 흔히 말하는 JAMstack 구조다.

## 관련 문서

- [GitHub CODEOWNERS](./0018-github-codeowners.md)
- [GitHub Pages로 knowledge 사이트 만들기 — 생성기 비교와 템플릿 선택](./0022-github-pages-knowledge-site-generator-and-templates.md)
- [CORS (Cross-Origin Resource Sharing)](../web/0016-cors-cross-origin-resource-sharing.md)

## 참고 자료

- [About GitHub Pages — GitHub Docs](https://docs.github.com/en/articles/about-github-pages)
- [GitHub Pages limits — GitHub Docs](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Configuring a publishing source — GitHub Docs](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [What is GitHub Pages — GitHub Docs](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [About supported custom domains — GitHub Docs](https://help.github.com/articles/about-supported-custom-domains)
- [About privately published GitHub Pages sites — GitHub Docs](https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/about-privately-published-github-pages-sites)
- [GitHub Pages now uses Actions by default — GitHub Blog](https://github.blog/news-insights/product-news/github-pages-now-uses-actions-by-default/)
- [GitHub Changelog: Pages label](https://github.blog/changelog/label/pages)
- [Cloudflare Worker + OpenAI on GitHub Pages](https://github.forks.workers.dev/m2web/m2web.github.io/blob/main/cloudflare-worker-openai-github-pages.md)
- [Workers API proxy — BetterLink Blog](https://blog.eastondev.com/en/posts/dev/20251201-workers-api-proxy)
- [Github Pages, API Key and Serverless Functions — Airtable Community](https://community.airtable.com/t/github-pages-api-key-and-serverless-functions/34865)
- [Hide API Keys in Your Frontend Code — Corsfix](https://corsfix.com/hide-api-key)
