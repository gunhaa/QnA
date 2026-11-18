# Markdown: 역사, 유용한 기능, 렌더러별 규격 차이

## 쉬운 설명

Markdown은 `#`이나 `*` 같은 기호를 붙여 "여기는 제목, 여기는 굵게"라고 표시하는 **글쓰기 약속**이다. 처음 만든 사람이 약속을 대충 적어 둬서, 프로그램마다 애매한 부분을 조금씩 다르게 이해한다. 그래서 같은 글이 GitHub와 Obsidian에서 다르게 보일 수 있다.

### 그래서 결국 공식 규격은 없나?

**공식 표준 기관(IETF·ISO·W3C)이 정한 "Markdown 문법 규격"은 없다.** "RFC가 있는데 잘 안 지켜진다"가 아니라, **RFC는 애초에 문법을 정의하지 않는다.**

| 문서 | 성격 | 문법을 정의하나 |
|---|---|---|
| [Gruber의 원본 Syntax 문서](https://daringfireball.net/projects/markdown/syntax) (2004) | 산문 설명 + 참조 구현(Markdown.pl) | 애매하게만. 명세·테스트 없음 |
| **[RFC 7763](https://www.rfc-editor.org/rfc/rfc7763.html)** (2016) | IETF **Informational**(표준 트랙 아님). MIME 타입 `text/markdown` 등록 | **✗** Markdown을 "평문 서식 문법들의 *계열(family)*"로 규정하고, 어떤 방언인지는 `variant` 파라미터로 밝히게 할 뿐 |
| **[RFC 7764](https://www.rfc-editor.org/rfc/rfc7764.html)** (2016) | Informational. 방언별 안내, IANA [Markdown Variants 레지스트리](https://www.iana.org/assignments/markdown-variants/markdown-variants.xhtml) 등록 | **✗** 방언 목록·특성 설명 |
| **[CommonMark](https://spec.commonmark.org)** 0.31.2 | 커뮤니티 명세 + 적합성 테스트 ([commonmark.org](https://commonmark.org), [dingus](https://spec.commonmark.org/dingus/)) | **✓** 가장 엄밀. 단 표준 기관 문서가 아니고 1.0도 아님 |
| **[GFM](https://github.github.com/gfm/)** 0.29-gfm | GitHub 명세 (CommonMark 상위 집합) | **✓** CommonMark + 표·작업 목록 등 |

즉 IETF가 한 일은 "Markdown이라는 *부류*가 있고, 주고받을 때 `text/markdown; charset=UTF-8; variant=CommonMark`처럼 어떤 방언인지 표시하라"는 **이름표 붙이는 방법**을 정한 것이다. 방언 차이를 없애려는 게 아니라 **방언이 여럿인 현실을 공식 인정**한 문서라서, "안 지켜진다"고 볼 대상이 아니다.

실질적인 기준은 **CommonMark(사실상 표준, de facto standard)** 이고, 대부분의 현대 파서(cmark, markdown-it, remark, commonmark-java, goldmark 등)가 이를 따른다. 렌더러 간 차이는 주로 ① CommonMark 이전 계열 파서(Python-Markdown 등)를 쓰는 경우와 ② CommonMark 위에 얹은 **확장 문법**(표, 콜아웃, 수학 등)에서 생긴다.

---

## 일반 설명

### 1. 역사

#### 1.1 선행 포맷 (1990~2002)

이메일·유즈넷에서 쓰던 **평문 관습**(`*강조*`, `> 인용`, 들여쓰기 코드)이 뿌리다. 이를 정리한 경량 마크업 언어들이 먼저 있었다.

| 연도 | 포맷 | 특징 |
|---|---|---|
| 1992 | Setext | 밑줄(`===`, `---`)로 제목 표시 → Markdown의 "setext 제목" |
| 2002 | atx (Aaron Swartz) | `#`로 제목 표시 → Markdown의 "ATX 제목" |
| 2002 | Textile | 블로그용, HTML 속성까지 표현 |
| 2002 | reStructuredText | Python 문서화(Sphinx)용, 엄격한 문법 |

#### 1.2 탄생 (2004)

- **2004년 3월**, John Gruber가 블로그 Daring Fireball에서 발표. Aaron Swartz가 문법 설계에 피드백을 준 베타 테스터로 참여했다.
- 설계 철학: **"평문 그대로 읽어도 자연스러워야 한다"**. HTML을 대체하는 게 아니라 HTML을 *쓰기 쉽게* 하는 도구라서, 표현 못 하는 건 HTML을 그대로 섞어 쓰게 했다.
- 구현체는 Perl 스크립트 **Markdown.pl**. 마지막 버전 1.0.1(2004-12-17) 이후 사실상 업데이트가 멈췄다.
- 문제: 공식 "Syntax" 문서는 산문 설명뿐이고 **정식 명세도, 테스트 스위트도 없었다**. 애매한 부분은 "Markdown.pl이 하는 대로"였는데 그 Perl 코드조차 정규식 기반이라 버그가 많았다.

#### 1.3 방언(Flavor)의 난립 (2005~2013)

부족한 기능(표, 각주, 코드 블록)을 각자 확장하면서 방언이 늘었다.

| 연도 | 방언 | 주요 추가 |
|---|---|---|
| 2005 | PHP Markdown Extra (Michel Fortin) | 표, 각주, 정의 목록, `~~~` 펜스 코드, `{#id}` 속성 |
| 2005 | MultiMarkdown (Fletcher Penney) | 메타데이터, 표, 인용, LaTeX 출력 |
| 2006 | Pandoc Markdown (John MacFarlane) | 수학, 그리드 표, 인용 문헌 등 학술용. 수십 개 포맷 간 변환기 |
| 2009 | GitHub Flavored Markdown | ` ``` ` 펜스 코드 + 언어 지정, 표, 자동 링크, 작업 목록 |
| 이후 | Stack Overflow, Reddit, kramdown(Jekyll), Python-Markdown 등 | 각자의 확장과 해석 |

같은 입력을 여러 구현체에 넣어 결과를 비교하는 **Babelmark**에서는 단순한 리스트 하나도 구현체마다 결과가 갈렸다.

#### 1.4 표준화: CommonMark (2012~현재)

- 2012년 Jeff Atwood(Stack Overflow 공동 창업자)가 표준화를 공개 제안.
- **2014년 9월** "Standard Markdown"으로 발표했으나, Gruber가 "Markdown" 이름 사용에 반대해 며칠 만에 **CommonMark**로 개명. 주도자는 John MacFarlane(Pandoc 저자), Atwood, GitHub·Reddit·Stack Overflow 엔지니어들.
- 산출물: 모호함을 모두 규칙으로 정한 **명세서** + **600여 개 예제 기반 적합성 테스트** + 참조 구현(C `cmark`, JS `commonmark.js`).
- 최신 버전: **0.31.2 (2024-01-28)**. 10년 넘게 1.0을 내지 않았지만 사실상 업계 기준이 됐다.

#### 1.5 이후 (2016~2026)

| 연도 | 사건 |
|---|---|
| 2016 | **RFC 7763**: MIME 타입 `text/markdown` 등록. **RFC 7764**: CommonMark, GFM, Pandoc, MultiMarkdown 등 방언을 `variant` 파라미터로 등록 (`text/markdown; variant=GFM`) |
| 2017 | GitHub가 **GFM을 CommonMark 상위 집합으로 공식 명세화**, 구현체 `cmark-gfm` 공개. 최신 GFM 명세는 0.29-gfm (2019) |
| 2018 | **MDX**: Markdown 안에 JSX 컴포넌트 (Next.js, Docusaurus 문서 사이트) |
| 2021 | GitHub 각주 지원 |
| 2022 | GitHub Mermaid 다이어그램, 수학식(`$...$`) 지원. Stripe의 Markdoc. MacFarlane이 CommonMark의 교훈을 반영한 새 경량 마크업 **Djot** 공개 |
| 2023 | GitHub **Alerts** (`> [!NOTE]` 등 5종) |
| 2023~ | LLM이 응답을 Markdown으로 출력하는 것이 기본이 되면서, Markdown이 사람-AI 간 사실상의 문서 형식이 됨 (`CLAUDE.md`, `AGENTS.md`, `llms.txt` 등) |

### 2. 규격 계층

```
┌─────────────────────────────────────────────┐
│ 플랫폼 확장 (GitHub Alerts, Mermaid, 수학,   │ ← 명세 없음, 플랫폼 문서가 기준
│ @멘션, #이슈번호, 이모지, Obsidian 위키링크) │
├─────────────────────────────────────────────┤
│ GFM 명세 확장 (표, 작업 목록, 취소선,         │ ← GFM spec 0.29-gfm
│ 확장 자동 링크, 위험 HTML 태그 필터)         │
├─────────────────────────────────────────────┤
│ CommonMark (블록·인라인 핵심 문법)            │ ← spec 0.31.2
└─────────────────────────────────────────────┘
```

**이식성 있는 문서를 원하면 CommonMark + GFM 명세 확장까지만 쓰는 것**이 안전선이다. 그 위는 플랫폼 종속이다.

#### 주요 렌더러/파서

| 파서 | 언어 | 기준 | 사용처 |
|---|---|---|---|
| cmark / cmark-gfm | C | CommonMark / GFM | GitHub, 여러 언어 바인딩 |
| commonmark.js | JS | CommonMark | 참조 구현 |
| markdown-it | JS | CommonMark + 플러그인 | VS Code 미리보기, 많은 문서 도구 |
| remark / micromark | JS | CommonMark + 플러그인(AST) | MDX, Gatsby, Docusaurus |
| marked | JS | GFM 근접 | 가벼운 웹 렌더링 |
| commonmark-java, flexmark-java | Java | CommonMark (+확장) | 서버 사이드 Java |
| Python-Markdown | Python | Markdown.pl 계열 (비 CommonMark) | MkDocs |
| Pandoc | Haskell | 자체 방언 (+CommonMark/GFM 모드) | 문서 변환 (docx, PDF, LaTeX) |
| comrak | Rust | GFM | Rust 생태계 |
| goldmark | Go | CommonMark | Hugo |

> MkDocs의 Python-Markdown은 CommonMark가 아니라서 **리스트 들여쓰기 4칸 규칙**을 따른다. GitHub에서 멀쩡하던 중첩 리스트가 MkDocs에서 깨지는 대표 원인이다.

### 3. 렌더러마다 달라지는 지점

#### 3.1 CommonMark 내부에서도 헷갈리는 규칙 (원본 Markdown.pl과의 차이)

| 항목 | Markdown.pl / 구형 파서 | CommonMark / GFM |
|---|---|---|
| `#제목` (공백 없음) | 제목 | **문단** (`#` 뒤 공백 필수) |
| 단어 안 밑줄 `snake_case_name` | `case`가 기울임이 되는 경우 있음 | 단어 안 `_`는 강조 안 함 (`*`는 함) |
| 중첩 리스트 들여쓰기 | 4칸(또는 탭) 고정 | **부모 마커 뒤 내용 시작 열**에 맞춤 (`- ` 아래는 2칸, `1. ` 아래는 3칸) |
| 문단 바로 다음 리스트 | 빈 줄 필요 | 빈 줄 없이 가능. 단 번호 목록은 `1.`로 시작할 때만 문단을 끊음 |
| 번호 목록 시작 번호 `3.` | 무시하고 1부터 | `<ol start="3">` 반영 |
| 줄바꿈 | 줄 끝 공백 2개 | 공백 2개 **또는 줄 끝 `\`** |
| HTML 블록 안의 Markdown | 처리 안 함 | 처리 안 함. 단 HTML 태그 다음에 **빈 줄**을 두면 그 뒤는 Markdown으로 처리 |
| 강조 중첩 `***a** b*` | 구현마다 다름 | "delimiter run" 규칙(left/right-flanking, 3의 배수 규칙)으로 결정 |

`setext` 제목도 함정이다. 문단 바로 아래 `---`를 쓰면 수평선이 아니라 **h2 제목**이 된다. 수평선은 앞에 빈 줄을 두거나 `***`를 쓴다.

#### 3.2 GitHub 안에서도 다른 곳: 줄바꿈

| 위치 | 단일 개행 처리 |
|---|---|
| 저장소의 `.md` 파일 | 공백으로 이어짐 (CommonMark 그대로) |
| 이슈·PR·코멘트 본문 | **`<br>`로 줄바꿈** |

같은 텍스트를 README와 이슈에 붙이면 모양이 다른 이유다.

#### 3.3 확장 문법 지원 비교

| 기능 | 문법 | CommonMark | GitHub | GitLab | Obsidian | Pandoc | MkDocs Material |
|---|---|---|---|---|---|---|---|
| 표 | `\| a \| b \|` | ✗ | ✓ | ✓ | ✓ | ✓ (+그리드 표) | ✓ |
| 작업 목록 | `- [ ]` | ✗ | ✓ | ✓ | ✓ | ✓ | 확장 |
| 취소선 | `~~a~~` | ✗ | ✓ | ✓ | ✓ | ✓ | 확장 |
| 각주 | `[^1]` | ✗ | ✓ (위키 제외) | ✓ | ✓ | ✓ | ✓ |
| 수학 | `$x$`, `$$…$$` | ✗ | ✓ (+` ```math `) | ✓ (KaTeX) | ✓ | ✓ | 확장 |
| Mermaid | ` ```mermaid ` | ✗ (코드로 표시) | ✓ | ✓ | ✓ | 필터 필요 | ✓ |
| 콜아웃 | 아래 참고 | ✗ | `> [!NOTE]` | `> [!note]` 계열 지원 | `> [!note]` (+접기) | ✗ | `!!! note` |
| 하이라이트 | `==a==` | ✗ | ✗ | ✗ | ✓ | ✓ (`[a]{.mark}`) | 확장 |
| 위키링크 | `[[문서]]` | ✗ | ✗ (위키 제외) | 위키 | ✓ | ✗ | ✗ |
| 제목 ID 지정 | `## 제목 {#id}` | ✗ | ✗ (자동 생성) | ✗ | ✗ | ✓ | ✓ |
| 정의 목록 | `용어\n: 설명` | ✗ | ✗ | ✗ | ✗ | ✓ | 확장 |
| YAML front matter | `---\n키: 값\n---` | ✗ | 표로 렌더링 | 숨김 | Properties | 메타데이터 | 메타데이터 |
| 주석 | `<!-- -->` / `%%…%%` | HTML 주석 | HTML 주석 | HTML 주석 | 둘 다 | HTML 주석 | HTML 주석 |

> ✓/✗는 기본 설정 기준. "확장"은 플러그인/설정으로 켜야 함. Notion은 Markdown을 가져오기/단축키로 지원하지만 내부 포맷이 블록 기반이라 표·HTML 등은 부분 지원이다.

#### 3.4 콜아웃/경고 상자: 같은 기능, 다섯 가지 문법

```markdown
> [!WARNING]                    ← GitHub (NOTE, TIP, IMPORTANT, WARNING, CAUTION 5종 고정)
> 운영 DB에서 실행하지 마세요.

> [!warning]- 접힌 제목          ← Obsidian (대소문자 무관, 임의 타입, +/-로 접기)
> 내용

!!! warning "제목"              ← MkDocs (Python-Markdown admonition)
    내용 (4칸 들여쓰기)

:::warning                      ← Docusaurus / VitePress
내용
:::
```

GitHub 문법은 다른 렌더러에서 **`[!WARNING]`이 글자 그대로 보이는 인용문**으로 우아하게 퇴화(graceful degradation)한다. 이식성을 생각하면 가장 무난하다.

#### 3.5 제목 앵커(링크용 ID) 생성 규칙

`[이동](#설치-방법)` 같은 링크가 동작하려면 렌더러가 만드는 ID와 맞아야 한다.

| 렌더러 | `## Hello, World! 설치` → |
|---|---|
| GitHub | `#hello-world-설치` (소문자화, 구두점 제거, 공백→`-`, 한글 유지, 중복 시 `-1` 붙임) |
| Pandoc | `#hello-world-설치` (비슷하지만 숫자로 시작하면 앞을 잘라내는 등 세부 규칙 다름) |
| Obsidian | `[[#Hello, World! 설치]]` (제목 텍스트 그대로) |

규칙이 렌더러마다 달라서, 문서 사이트 이전 시 내부 링크가 깨지는 흔한 원인이다.

#### 3.6 HTML 허용 범위

Markdown은 HTML을 섞을 수 있지만 **얼마나 허용할지는 렌더러 보안 정책**이다.
- GitHub: `<script>`, `<style>`, `<iframe>`, 이벤트 속성(`onclick`) 등 제거. `style` 속성도 제거해 색·정렬을 못 바꾼다. GFM 명세의 tagfilter가 `<title>`, `<textarea>`, `<xmp>` 등을 무력화.
- 사내 위키·블로그 엔진: 대부분 sanitizer(DOMPurify 등)를 쓰며 허용 목록이 제각각.
- 결론: HTML은 `<details>`, `<summary>`, `<kbd>`, `<sup>`, `<br>`, `<img width>` 정도만 쓰면 대부분에서 안전하다.

### 4. 유용한 기능 (덜 알려진 것 위주)

**참조형 링크**: 본문을 깔끔하게 유지하고 URL을 아래에 모은다.

```markdown
[CommonMark][cm] 명세와 [GFM][gfm] 명세를 비교한다.

[cm]: https://spec.commonmark.org "CommonMark Spec"
[gfm]: https://github.github.com/gfm/
```

**자동 링크**: `<https://example.com>` (CommonMark). GFM은 꺾쇠 없는 `https://…`, `www.…`도 링크로 만든다.

**백틱이 들어간 인라인 코드**: 바깥 백틱을 더 많이 쓴다.

```markdown
`` `code` `` → `code` 가 그대로 표시
```

**펜스 코드 블록 중첩**: 바깥 펜스를 4개 이상으로.

`````markdown
````markdown
```js
console.log(1)
```
````
`````

**접기 (`<details>`)**: 긴 로그·출력을 숨긴다. GitHub, GitLab 등 대부분 지원.

```markdown
<details>
<summary>전체 스택 트레이스</summary>

(빈 줄 뒤부터 Markdown 사용 가능)

</details>
```

**표 정렬과 이스케이프**

```markdown
| 왼쪽 | 가운데 | 오른쪽 |
|:-----|:------:|-------:|
| a    | `a \| b` | 1 |
```

셀 안 `|`는 `\|`로 이스케이프. 셀 안 줄바꿈은 `<br>`.

**GitHub 전용 코드 블록 언어**

| 언어 지정 | 효과 |
|---|---|
| `diff` | `+`/`-` 줄 색상 표시 |
| `suggestion` | PR 리뷰 코멘트에서 "변경 제안" 버튼 (클릭 한 번으로 커밋) |
| `mermaid` | 다이어그램 |
| `math` | 수식 블록 |
| `geojson`, `topojson` | 인터랙티브 지도 |
| `stl` | 3D 모델 뷰어 |

**다크 모드 대응 이미지 (GitHub)**

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="logo-dark.png">
  <img alt="로고" src="logo-light.png">
</picture>
```

**숨은 메모**: `<!-- 리뷰어만 보는 메모 -->`는 렌더링되지 않는다. PR 템플릿의 안내 문구에 흔히 쓴다.

**키보드 표시**: `<kbd>Ctrl</kbd>+<kbd>C</kbd>`

**이스케이프**: `\*`, `\#`, `\_`, `\|` 등. CommonMark는 ASCII 구두점 전부 백슬래시 이스케이프 가능.

**Pandoc 변환**: `pandoc doc.md -o doc.docx`, `-o doc.pdf`. Markdown으로 쓰고 Word/PDF로 납품하는 흐름.

### 5. 이식성 있게 쓰는 규칙

1. **블록 사이에 항상 빈 줄** (제목·리스트·코드·표·HTML 앞뒤)
2. **`#` 뒤 공백**, 제목은 ATX(`#`)만 사용 (setext 혼동 회피)
3. **줄바꿈은 `\` 또는 문단 분리**: 줄 끝 공백 2개는 에디터가 지워 버리고 눈에 안 보인다
4. **중첩 리스트는 4칸 들여쓰기**: CommonMark와 Python-Markdown 양쪽에서 동작하는 교집합
5. **펜스 코드에 언어 지정**, ` ``` `만 사용 (`~~~` 혼용 금지)
6. **강조는 `**굵게**`, `*기울임*`**: `_`는 단어 내부에서 동작이 갈린다
7. **HTML 최소화**, 플랫폼 확장(Alerts, 위키링크, 하이라이트)은 대상 렌더러가 확실할 때만
8. **린터 사용**: `markdownlint`(VS Code 확장, CLI)로 팀 규칙을 강제하고, `prettier`로 포맷 통일
9. **애매하면 테스트**: CommonMark dingus(spec.commonmark.org/dingus), Babelmark 3로 여러 파서 결과 비교

> 이 저장소의 답변 문서도 GitHub 렌더링을 전제로 쓰고 있다. 표, 펜스 코드, 상대 경로 링크는 GFM 범위라 안전하고, 다른 위키(Notion, Confluence)로 옮기면 표·앵커 링크부터 확인해야 한다.

## 관련 문서

- [전자책 포맷의 역사·구조와 표준화의 현실](ebook-formats-history-structure-and-standardization-reality.md): "명세는 있지만 구현마다 다르다"는 같은 문제를 EPUB에서 다룸
- [GitBook LLM-ready 문서 vs LLM Wiki](../ai-llm-basics/gitbook-llm-ready-docs-vs-llm-wiki.md): Markdown이 LLM용 문서 포맷으로 쓰이는 사례

## 참고 자료

- [Markdown (Wikipedia)](https://en.wikipedia.org/wiki/Markdown)
- [The History of Markdown: How Plain Text Took Over (HackMD, 2026)](https://hackmd.io/blog/2026/02/11/markdown-history)
- [A short history of Markdown](https://creativecyborg.substack.com/p/a-short-history-of-markdown)
- [The Markdown story (Buttondown)](https://buttondown.com/blog/the-markdown-story)
- [Markdown: The Genesis and Global War of Plain Text](https://devnewsletter.com/p/markdown-the-genesis-and-global-war-of-plain-text/)
- [RFC 7763: The text/markdown Media Type](https://www.rfc-editor.org/rfc/rfc7763.html)
- [RFC 7763 Datatracker (Informational, 2016-03)](https://datatracker.ietf.org/doc/rfc7763/)
- [IETF 91 APPSAWG 발표 자료 (syntax → variant 파라미터 논의)](https://www.ietf.org/proceedings/91/slides/slides-91-appsawg-1.pdf)
- [CommonMark Spec](https://spec.commonmark.org)
- [commonmark-spec Wiki](https://www.github.com/commonmark/commonmark-spec/wiki)
- [GFM Spec 미러 (0.29-gfm)](https://www.red-bean.com/doc/cmark-gfm/spec.html)
- [A formal spec for GitHub Flavored Markdown (GitHub Blog, 2017)](https://github.blog/news-insights/product-news/a-formal-spec-for-github-flavored-markdown/)
- [GitLab Flavored Markdown 명세 가이드](https://docs.gitlab.com/17.3/ee/development/gitlab_flavored_markdown/specification_guide)
- [GitHub Docs 스타일 가이드 (Alerts)](https://docs.github.com/en/contributing/style-guide-and-content-model/style-guide)
- [GFM vs CommonMark vs Pandoc Markdown 문법 비교](https://www.glukhov.org/ko/documentation-tools/markdown/gfm-vs-commonmark-vs-pandoc-markdown/)
- [What Is Markdown, Really? — GitHub 수렴 문제](https://kumestra.github.io/posts/202604/0404-markdown-standards-and-the-github-convergence-problem)
- [Markdown layers under Obsidian: what survives](https://www.obsidianstats.com/posts/2026-07-28-markdown-layers-under-obsidian-what-survives)
- [Using GitHub Alerts and Obsidian Callouts](https://docs.intra.i2db.washu.edu/tools/documentation/tutorials/11-markdown-alerts)
- [GitHub Flavored Markdown 문법 예제 (freeCodeCamp)](https://www.freecodecamp.org/news/github-flavored-markdown-syntax-examples/)
- [commonmark-extensions changelog (alerts 확장)](https://hackage.haskell.org/package/commonmark-extensions-0.2.5/changelog)
- [comrak alerts 테스트 픽스처](https://docs.rs/crate/comrak/0.52.0/source/src/tests/fixtures/alerts.md)
- [Fixing Markdown Syntax Is a Nightmare](https://hn.jakechampion.name/reader/https://mdview.io/s/fixing-markdown-syntax-is-a-nightmare)
