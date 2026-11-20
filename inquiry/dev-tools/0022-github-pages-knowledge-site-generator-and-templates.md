---
type: inquiry
created: 2026-11-20
author: agent
model: claude-opus-5-5
---

# GitHub Pages로 knowledge 사이트 만들기 — 생성기 비교와 템플릿 선택

## 쉬운 설명

마크다운 공책을 웹사이트로 바꿔 주는 기계(정적 사이트 생성기)는 여러 종류다. 이 저장소에서 기계를 고르는 기준은 하나가 특히 중요하다. 공책 안에 "2번 칸으로 가세요"라는 **한글 책갈피(앵커)가 106개** 있는데, 기계마다 책갈피 이름을 짓는 규칙이 달라서 어떤 기계는 책갈피를 다 엉뚱하게 바꿔 버린다. GitHub와 **같은 규칙(github-slugger)** 으로 책갈피를 짓는 기계를 고르면 손댈 게 없다. "템플릿 골라 쓰기"는 남이 꾸며 놓은 공책 표지를 복사해 오는 것이다. 다만 블로그용 표지는 **날짜순 일기장** 모양이라, 순서가 정해진 교과서(5문서 세트)에는 **문서용 표지**가 맞다.

## 일반 설명

### 1. 이 저장소의 선택 기준

| 기준 | 이 저장소의 현황 | 왜 중요한가 |
|---|---|---|
| 한글 heading 앵커 | knowledge 안에서 쓰는 앵커 링크 **106개** (예: `./03-tradeoffs.md#2-대안-비교`) | slug 규칙이 GitHub와 다르면 사이트 안의 링크가 조용히 깨진다 |
| mermaid | knowledge 2곳, 규칙 문서(ARCHITECTURE.md)에서도 사용 | 기본 지원이 아니면 플러그인을 관리해야 한다 |
| 구조 | `<대주제>/<ID>-<대상>/01-history … 05-failure-modes` 고정 | 폴더 구조로 사이드바를 자동 생성할 수 있어야 한다 |
| 범위 | knowledge만 올리고, 다른 유형으로 가는 링크 137개는 GitHub 원문 URL로 변환 | 빌드 전에 복사·변환 단계가 있으므로, 원본 위치를 강제하는 생성기도 쓸 수 있다 |
| 유지보수 | 오래 운영할 사이트 | 지원 종료가 예정된 도구는 피한다 |

### 2. 생성기 비교 (2026-11 기준)

| 생성기 | 상태 | 한글 앵커 (GitHub와 같나) | mermaid | 비고 |
|---|---|---|---|---|
| **Astro Starlight** | 활발히 개발 중 (0.x대, 최근 0.39에서 CJK 문자 간격 개선) | **같다** — Astro가 github-slugger를 쓴다 | 기본 미지원, 플러그인 필요 | 문서 전용 테마. 검색(Pagefind) 기본 내장. 원본을 `src/content/docs/`에 두어야 하지만 빌드 때 복사하면 된다. heading이 특수문자로 끝나는 경우만 차이가 있고, Astro 5.5의 `headingIdCompat` 플래그로 맞출 수 있다 |
| **Docusaurus** | 3.10(2026-04)이 v3의 마지막 기능 릴리스, v4 준비 중 | **같다** — github-slugger 기반 | 공식 테마 `@docusaurus/theme-mermaid` | React·MDX 기반이라 무겁다. `.md`를 MDX로 읽으면 `<`·`{`에서 파싱 오류가 날 수 있어 `markdown.format: 'detect'`(`.md`는 CommonMark로 처리)가 필요하다 |
| **VitePress** | 안정판 1.6.4(2025-08), 2.0은 아직 alpha | **다르다** — 숫자로 시작하면 `_`를 붙이고(`_2-…`), 한글을 NFKD로 분해한다 | 기본 미지원, 플러그인 필요 | `markdown.anchor.slugify`에 github-slugger를 넣으면 맞출 수 있다(설정 옵션 경로는 미확인) |
| **Material for MkDocs** | **유지보수 모드**. 2027-05-05 지원 종료 예정. 후속작은 Zensical | 기본 `toc`는 한글을 **지운다**. `pymdownx.slugs.slugify(case="lower")`로 바꾸면 같다 | 기본 지원 (superfences) | 지금 고르면 1~2년 안에 Zensical로 옮겨야 한다. Zensical의 slugify 설정 지원 여부는 확인하지 못했다 |
| **Jekyll + Just the Docs** | 테마 v0.12.0(2026-01), 공식 템플릿 저장소 있음 | **위험** — kramdown 기본 ID는 ASCII만 쓴다. GFM 파서에서의 동작은 직접 테스트가 필요하다 | 테마 설정으로 지원 | GitHub Pages 기본 빌더라 설정이 가장 적다 |

#### 한글 앵커가 어떻게 달라지나

`## 2. 대안 비교`를 각 도구가 바꾸는 결과다. GitHub는 `#2-대안-비교`로 만든다.

| 도구 | 처리 순서 | 결과 |
|---|---|---|
| github-slugger (GitHub, Astro, Docusaurus) | 소문자화 → ASCII 문장부호 등 제거 → 공백을 `-`로 | `2-대안-비교` ✅ |
| pymdownx `slugify(case="lower")` | NFC → 소문자화 → `\w`·`-`·공백 외 제거 → 공백을 `-`로 | `2-대안-비교` ✅ |
| VitePress 기본 (mdit-vue) | NFKD → 결합 문자 제거 → 특수문자를 `-`로 → 숫자로 시작하면 `_` 접두 → 소문자화 | `_2-대안-비교` ❌ (한글도 자모로 분해돼 코드 포인트가 다르다) |
| Python-Markdown 기본 `toc` | non-ASCII 제거 | `2-` ❌ |

### 3. 템플릿으로 시작하는 방법

"템플릿 사이트에서 골라 쓰기"는 실제로는 세 가지 방식이다.

| 방식 | 동작 | 예 |
|---|---|---|
| **GitHub 템플릿 저장소** | 테마 제작자가 만든 starter 저장소에서 "Use this template" → 내 저장소 생성 → Actions로 배포 | Chirpy starter(블로그), Just the Docs template(문서) |
| **Jekyll `theme:` / `remote_theme:`** | `_config.yml`에 한 줄. `theme:`는 GitHub Pages 공식 지원 테마(예: `jekyll-theme-minimal`), `remote_theme:`는 GitHub에 있는 아무 Jekyll 테마 | 기존 저장소에 바로 적용 가능 |
| **생성기 테마 갤러리** | 갤러리에서 테마를 고른 뒤 그 생성기 프로젝트로 시작 | Hugo Themes(themes.gohugo.io), Astro Themes(astro.build/themes) |

주의할 점:
- **블로그 테마와 문서 테마는 구조가 다르다.** Chirpy 같은 블로그 테마는 `_posts/YYYY-MM-DD-제목.md`처럼 날짜순 글을 전제로 한다. knowledge는 순서가 고정된 5문서 세트라서 **사이드바가 있는 문서 테마**(Just the Docs, Starlight, Docusaurus docs)가 맞다.
- **템플릿 저장소는 보통 새 저장소를 만든다.** 이 저장소에서 쓰려면 템플릿의 설정 파일만 `site/` 폴더로 가져와 빌드 워크플로에서 사용하면 된다. 문서를 템플릿 저장소로 옮길 필요는 없다.
- **GitHub Pages 기본 Jekyll 빌드는 safe mode라 서드파티 플러그인이 돌지 않는다.** 테마가 플러그인을 쓰면 Actions 빌드로 바꿔야 한다. 이 저장소는 어차피 링크 변환 단계가 있어서 Actions 빌드가 전제다.

### 4. 이 저장소에 대한 결론

1. **1순위: Astro Starlight.** github-slugger를 기본으로 써서 한글 앵커 106개를 그대로 둘 수 있다. 문서 전용 테마, 검색 내장, 활발한 개발 상태가 모두 맞는다. 단점은 mermaid 플러그인을 써야 한다는 것뿐이다.
2. **2순위: Docusaurus.** 앵커와 mermaid가 모두 공식 지원이다. 다만 React·MDX 기반이라 무겁고, v4 전환을 앞두고 있다.
3. **피할 것: Material for MkDocs**(지원 종료 예정)와 **Jekyll 기본 빌드**(한글 ID가 불확실하다). **VitePress**는 slugify를 바꾸면 쓸 수 있지만, 기본값이 맞는 도구가 있는데 굳이 고칠 이유가 없다.
4. 템플릿은 블로그 테마가 아니라 **문서 테마**를 고르고, 문서는 이 저장소에 둔 채 빌드할 때 복사한다.

어느 생성기를 고르든 링크를 변환할 때 **앵커가 대상 문서의 heading slug와 맞는지 검사하는 단계**를 함께 두면, 생성기를 바꿔도 깨진 링크를 빌드 단계에서 잡을 수 있다.

### 5. 최종 결정: 생성기 없이 Tufte CSS + 직접 만든 빌드 스크립트

비교 뒤 방향을 바꿨다. 결정은 Starlight(1순위) → Docusaurus 검토 → 직접 빌드 순으로 바뀌었다. 원하는 모양이 문서 사이트 테마가 아니라 **꾸미지 않은 HTML에 정돈만 더한 고전적인 개인 홈페이지**였기 때문이다.

| 항목 | 선택 | 이유 |
|---|---|---|
| 스타일 | [Tufte CSS](https://edwardtufte.github.io/tufte-css/) 1.9.0 (npm `tufte-css`) | 기성 클래식 스타일시트. 55% 본문 폭과 넓은 오른쪽 여백이 있어서 별도 사이드바 없이 목차를 둘 수 있다 |
| 한글 보정 | `site/style.css` | 글꼴을 Noto Serif KR 하나로 통일한다. ET Book(영문)과 섞으면 한 줄 안에서 영문·숫자와 한글의 크기가 달라 보인다. 한글은 같은 px에서 더 크게 보이므로 본문을 1.2rem으로 줄이고, 보조 텍스트(표·목차·코드 블록)는 1rem 한 가지로 맞춘다. 이탤릭 제목은 바로 세우고 h3·h4는 굵기로 구분한다 |
| 내비게이션 | 오른쪽 여백(`.marginnote`)에 세트 5문서 목록 | Tufte의 margin note는 55% 폭 단락 안에서만 제자리에 뜬다. 그래서 목록을 55% 폭 `p`로 감싼다. 760px 이하에서는 본문 위로 내린다 |
| 변환 | unified (remark-parse·gfm·frontmatter → remark-rehype → rehype-raw·slug·stringify) | rehype-slug가 github-slugger를 쓰므로 한글 앵커가 GitHub와 같다 |
| 링크 | knowledge 안은 `.md` → `.html`, 밖은 GitHub blob URL로 변환 | 대상 파일이 있는지와 앵커가 대상 heading id에 있는지를 검사한다. 하나라도 틀리면 빌드를 실패시킨다 |
| 넓은 요소 | 표·mermaid는 90% 폭으로 펼친다 | 55% 폭 안에서는 5열짜리 표를 읽기 어렵다 |
| 코드 | 글꼴 D2Coding(jsDelivr), 옅은 배경 | Tufte CSS는 코드에 배경이 없어 본문과 구별되지 않는다. Consolas는 한글이 1.82칸이라 한글이 섞인 글자 도식이 어긋난다. D2Coding은 한글 2칸, 상자 그리기 문자 1칸이다 |
| 취소선 | remark-gfm `singleTilde: false` | 기본값은 `~a~`도 취소선으로 바꿔 범위 표기(`50~75%`, `수 ms~1초`)가 지워진다 |
| 배포 | `.github/workflows/pages.yml` — `knowledge/**`·`site/**`가 바뀐 push에서 빌드 → `upload-pages-artifact` → `deploy-pages` | 저장소 설정 Pages → Source를 **GitHub Actions**로 바꿔야 동작한다 |

직접 빌드의 대가는 검색, 버전 관리 같은 기능이 없다는 것이다. 문서 45개, 세트 9개 규모에서는 색인 페이지 하나로 충분하다고 판단했다. 세트가 크게 늘면 Pagefind를 빌드 뒤에 붙이는 것이 가장 가벼운 대안이다.

## 관련 문서

- [GitHub Pages 개요](./0021-github-pages-overview.md)
- [Markdown 역사·기능·스펙 차이](./0020-markdown-history-features-and-spec-differences.md)

## 참고 자료

- [Material for MkDocs — Releases (유지보수 모드, 지원 종료일)](https://github.com/squidfunk/mkdocs-material/releases)
- [Material for MkDocs Is No More! Long Live Zensical!](https://duerrenberger.dev/blog/2025/11/06/material-for-mkdocs-is-no-more-long-live-zensical/)
- [VitePress 1.0 발표](https://blog.vuejs.org/posts/vitepress-1.0), [Socket — vitepress 패키지](https://socket.dev/npm/package/vitepress)
- [mdit-vue slugify.ts (VitePress 기본 slugify)](https://raw.githubusercontent.com/mdit-vue/mdit-vue/main/packages/shared/src/slugify.ts)
- [github-slugger index.js](https://raw.githubusercontent.com/Flet/github-slugger/master/index.js)
- [pymdown-extensions slugs.py](https://raw.githubusercontent.com/facelessuser/pymdown-extensions/main/pymdownx/slugs.py), [Slugs 문서](https://facelessuser.github.io/pymdown-extensions/extras/slugs)
- [Python-Markdown PR #970 (unicode slugify)](https://github.com/Python-Markdown/markdown/pull/970)
- [Docusaurus Changelog](https://docusaurus.io/changelog), [Docusaurus 3.10](https://deploy-preview-11825--docusaurus-2.netlify.app/blog/releases/3.10)
- [Starlight 0.39](https://astro.build/blog/starlight-039/), [Astro headingIdCompat](https://v5.docs.astro.build/en/reference/experimental-flags/heading-id-compat)
- [kramdown options (transliterated_header_ids)](https://kramdown.gettalong.org/options.html)
- [GitHub Docs — Jekyll 테마 추가하기](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/adding-a-theme-to-your-github-pages-site-using-jekyll)
- [GitHub Docs — custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Just the Docs](https://github.com/just-the-docs/just-the-docs), [Just the Docs CHANGELOG](https://www.junian.dev/jekyll-jtdocs/CHANGELOG/)
- [Chirpy starter 사용 예](https://github.com/obviokuo/obviokuo.github.io?ref=sveltethemes.dev), [Chirpy 튜토리얼(2026)](https://caohongchuan.github.io/posts/blog/)
- [Hugo Themes](https://themes.gohugo.io/themes/hugo-theme-gallery)
