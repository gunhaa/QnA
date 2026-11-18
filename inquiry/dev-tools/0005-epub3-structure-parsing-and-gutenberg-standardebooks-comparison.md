# EPUB3 파일의 구조, 일반적인 파싱 방법, 그리고 Project Gutenberg·Standard Ebooks 등의 컨벤션 비교

## 결론부터

**EPUB(3판)은 사실 "확장자만 바꾼 ZIP 압축 파일"이에요.** 압축을 풀면 안에 "이 파일이 무슨 형식인지 알려주는 표지(`mimetype`)", "책의 진짜 목차 파일이 어디 있는지 알려주는 안내판(`container.xml`)", "책의 모든 정보를 담은 종합 설계도(`.opf` 패키지 문서 — 메타데이터·목차·읽는 순서)", 그리고 실제 글이 담긴 "페이지들(XHTML 파일들)"이 들어 있어요. **파싱(parsing)은 이 안내판 → 설계도 → 실제 페이지 순서로 하나씩 따라가며 읽는 과정**이에요. Project Gutenberg는 이 EPUB을 **기계가 자동으로** 찍어내고, Standard Ebooks는 **사람이 한 줄씩 손으로 다듬어서** 찍어낸다는 게 컨벤션의 가장 큰 차이예요.

## 다섯 살에게 설명하듯

EPUB 파일 하나를 **"이케아 가구 상자"**라고 생각해 보세요.

- **`mimetype`** = 상자 겉면에 붙은 **"이거 책장임"이라는 라벨 스티커**예요. 상자를 열어보지 않고 라벨만 봐도 "아 이건 책장이구나" 하고 알 수 있어요. (반드시 상자 맨 위, 압축도 안 하고 그대로 붙여요.)
- **`META-INF/container.xml`** = 상자를 열면 맨 위에 있는 **"설명서는 이 봉투 안에 있어요" 쪽지**예요. 진짜 조립 설명서가 어디 들어있는지 위치만 알려줘요.
- **`.opf` 패키지 문서** = 진짜 **조립 설명서**예요. "이 가구 이름은 뭐고(메타데이터), 부품이 몇 개 들어있고(매니페스트), 1번 부품 다음엔 2번 부품을 조립하세요(스파인=읽는 순서)"가 다 적혀 있어요.
- **`nav.xhtml`** = 설명서 맨 앞에 있는 **"차례" 페이지**예요. "1장은 몇 페이지, 2장은 몇 페이지" 하는 목차요.
- **실제 챕터 파일들(`.xhtml`)** = 상자 속 **진짜 부품(선반, 나사, 다리)**이에요. 이게 실제로 읽는 내용이에요.

그리고 **Project Gutenberg**는 이 가구를 **로봇 팔이 텍스트 파일만 보고 자동으로 상자에 척척 담는** 곳이에요. 빠르고 양이 많지만, 가끔 나사가 삐뚤게 들어가듯 따옴표 모양이 이상하거나 목차가 살짝 어긋나기도 해요. **Standard Ebooks**는 그렇게 자동으로 만들어진 가구를 **장인이 다시 하나하나 사포질하고 나사를 다시 조여서** 더 예쁘고 튼튼하게 다시 포장해주는 곳이에요.

---

## 1. EPUB3의 전체 파일 구조

EPUB은 압축 포맷으로 ZIP을 그대로 쓰되, "이건 EPUB이다"라고 인식시키는 규칙(mimetype 파일)을 얹은 것이에요. 전형적인 구조는 이렇습니다.

```
mybook.epub  (실제로는 .zip 파일)
├── mimetype                     ← 반드시 첫 번째, 무압축(Stored)으로 저장
├── META-INF/
│   └── container.xml            ← OPF 파일 위치를 가리키는 안내판
└── EPUB/ (또는 OEBPS/ — 관습적 이름일 뿐 강제 아님)
    ├── content.opf               ← 패키지 문서: 메타데이터 + 매니페스트 + 스파인
    ├── nav.xhtml                  ← EPUB3 표준 목차 (필수)
    ├── toc.ncx                    ← EPUB2 호환용 목차 (선택, 하위호환)
    ├── text/
    │   ├── chapter01.xhtml
    │   ├── chapter02.xhtml
    │   └── ...
    ├── css/
    │   └── style.css
    ├── images/
    │   └── cover.jpg
    └── fonts/
        └── custom-font.otf
```

### 1) `mimetype`
`application/epub+zip`이라는 문자열만 정확히, 줄바꿈이나 공백도 없이 담고 있는 파일이에요. ZIP 안의 다른 파일들은 보통 압축(Deflate)해서 넣지만, 이 파일만은 **압축 없이(Stored) 맨 앞자리**에 넣어야 해요. 그래야 리더 프로그램이 파일 전체를 다 풀어보지 않고도 "앞부분 몇 바이트만 봐도 이게 EPUB이구나"라고 빠르게 판단할 수 있어요.

### 2) `META-INF/container.xml`
`<rootfile full-path="EPUB/content.opf" .../>` 같은 형태로, **진짜 패키지 문서(.opf)가 어디 있는지 경로만 알려주는 역할**을 해요. 폴더 이름을 `OEBPS`로 하든 `EPUB`으로 하든 상관없는 이유가 여기 있어요 — 실제 위치는 이 파일이 알려주니까요.

### 3) 패키지 문서 (`.opf`, Open Packaging Format)
EPUB의 심장부예요. 세 부분으로 나뉘어요.

- **`<metadata>`**: 더블린 코어(Dublin Core) 표준을 써서 제목(`dc:title`), 저자(`dc:creator`), 언어(`dc:language`), 고유 식별자(`dc:identifier`, 보통 ISBN이나 URN) 등을 적어요.
- **`<manifest>`**: EPUB 안에 들어있는 **모든 파일 목록**을 "이 파일의 id는 무엇이고, 실제 경로는 어디고, 미디어 타입(MIME type)은 뭐다"라고 나열해요. 목차 파일에는 `properties="nav"`라는 표시가 붙어서 "이게 EPUB3 목차 파일이다"를 알려줘요.
- **`<spine>`**: 매니페스트에 나열된 파일 중 "**실제로 읽는 순서**"만 뽑아서 나열해요. 매니페스트엔 있어도 스파인에 없으면 "참고 자료긴 한데 순서상 안 읽는 파일"이 될 수 있어요.

### 4) 내비게이션 문서 (`nav.xhtml`)
EPUB2에서 쓰던 `toc.ncx`(전용 XML 포맷)를 대체하는, **EPUB3부터 필수인 표준 XHTML 목차 파일**이에요. 그냥 브라우저로 열어도 사람이 읽을 수 있는 평범한 HTML `<nav>` 태그 구조라, 별도 파서 없이도 목차를 이해할 수 있다는 게 큰 개선점이에요. `epub:type="toc"`, `epub:type="landmarks"`, `epub:type="page-list"` 같은 역할 표시가 붙어요.

### 5) 콘텐츠 문서 (XHTML)
실제 본문이에요. HTML이 아니라 **엄격한 XHTML**(닫는 태그 필수, 소문자 태그명, XML 선언 포함)이어야 해요. 이 덕분에 리더 프로그램이 관대한 HTML 파서 대신 **엄격한 XML 파서**로 빠르고 예측 가능하게 처리할 수 있어요.

---

## 2. 일반적인 파싱(parsing) 방법

리더 앱(Apple Books, Kindle 앱, calibre, epub.js 같은 라이브러리)이 EPUB 파일 하나를 여는 과정은 대개 이 순서를 따릅니다.

1. **ZIP으로 압축 해제** — EPUB은 그냥 ZIP이므로 표준 ZIP 라이브러리로 연다.
2. **`mimetype` 확인** — 첫 바이트들이 `application/epub+zip`인지 검증해 "이거 진짜 EPUB 맞다"를 확인.
3. **`META-INF/container.xml` 읽기** — `full-path` 속성에서 패키지 문서(.opf)의 실제 경로를 알아낸다.
4. **패키지 문서(.opf) 파싱**
   - `<metadata>`에서 제목/저자 등 서지 정보 추출
   - `<manifest>`에서 전체 리소스 목록(파일 id ↔ 실제 경로 ↔ 타입) 확보
   - `<spine>`에서 **읽는 순서**대로 콘텐츠 문서 id 목록을 얻음
5. **내비게이션 문서(nav.xhtml 또는 toc.ncx) 파싱** — 목차 트리(챕터 제목 ↔ 실제 파일 앵커) 구성
6. **스파인 순서대로 XHTML 콘텐츠 문서를 로드** — 각 문서에 연결된 CSS·이미지·폰트도 함께 로드해서 렌더링

즉 "안내판(container.xml) → 설계도(.opf) → 차례(nav) → 실제 페이지(XHTML)" 순서로, **위에서 아래로 참조를 따라가며(reference-following)** 읽는 구조예요. 이 계층 덕분에 리더 앱은 파일 전체를 무작정 다 읽지 않고도 필요한 순서대로 필요한 파일만 골라 읽을 수 있어요.

---

## 3. Project Gutenberg의 컨벤션

- **원본은 텍스트/HTML, EPUB은 파생물**: Project Gutenberg는 2004년 이후 거의 모든 책을 **plain text와 HTML을 "원본(마스터 포맷)"으로** 삼고, EPUB·MOBI 등은 여기서 **자동 변환**해서 만들어요.
- **`ebookmaker`라는 자체 변환 도구 사용**: 하나의 HTML 소스와 이미지 폴더를 넣으면 EPUB2, EPUB3, MOBI(Kindle) 파일을 한꺼번에 찍어내는 파이썬 도구예요.
- **자동 변환의 한계**: 원본이 plain text인 경우, 프로그램이 문단 구분·시(verse) 줄바꿈·제목(heading) 여부 등을 **추측**해야 해서, 시의 줄바꿈이 뭉개지거나 문단이 잘못 제목으로 인식되는 등의 오류가 종종 발생해요.
- **타이포그래피가 기본적인 수준**: 예쁜 곱은따옴표(curly quotes) 처리나, 팝업 각주·팝업 목차 같은 최신 리더 기능을 적극 활용하지 못하는 경우가 많아요 — 자동화 우선, 정교함은 후순위인 정책이에요.
- **목표 자체가 다름**: "최대한 많은 책을 저작권 없이 무료로, 빠르게" 배포하는 게 목적이라 텍스트 정확성·가용성이 최우선이고, EPUB의 시각적 완성도는 부차적이에요.

## 4. Standard Ebooks의 컨벤션 (Gutenberg와의 비교)

Standard Ebooks는 **Project Gutenberg 등에서 원문을 가져와, 사람이 직접 교정·재조판(retypeset)한 뒤 다시 EPUB으로 만드는 프로젝트**예요. 기술적으로 뚜렷하게 다른 점들이 있어요.

- **시맨틱 인플렉션(semantic inflection)**: EPUB3의 `epub:type` 속성을 적극 활용해서, 그냥 `<span>`이나 `<p>` 태그에 "이건 인명이다", "이건 각주 번호다", "이건 서간체 편지의 서명 부분이다" 같은 **의미 태그**를 세밀하게 붙여요. 우선순위는 **EPUB 공식 어휘 → z3998 어휘 → Standard Ebooks 자체 어휘(`se:` 네임스페이스)** 순으로 참조하고, `se:` 어휘는 계층적으로 조직돼 있어요.
- **소스 저장소 구조가 공개·표준화**: 모든 책의 원본을 GitHub에 공개하고, 내부적으로 `src/epub/css/core.css`, `local.css`, `se.css` 같은 **일관된 CSS 파일 분리 규칙**을 따라요. `core.css`는 모든 책 공통 스타일, `local.css`는 그 책만의 예외적 스타일을 담는 식으로 역할을 분리해요.
- **접근성(accessibility) 강화**: ARIA 역할, 상세한 목차·랜드마크(landmarks) 구성 등 스크린리더 사용자를 고려한 마크업을 신경 써서 넣어요.
- **정확한 타이포그래피**: 곧은따옴표를 전부 곱은따옴표로, 하이픈을 문맥에 맞는 en/em dash로 바꾸는 등 출판사 수준의 조판 규칙(스타일 매뉴얼)을 수작업으로 적용해요.
- **완전 오픈소스·버전 관리**: 모든 책이 Git 저장소로 관리돼서, 오탈자나 마크업 오류를 누구나 풀 리퀘스트로 고칠 수 있어요.

## 5. 비교 요약표

| 항목 | Project Gutenberg | Standard Ebooks |
|---|---|---|
| 원본 포맷 | plain text / HTML (마스터), EPUB은 파생물 | Gutenberg 등에서 가져온 텍스트를 재조판 |
| EPUB 생성 방식 | `ebookmaker`로 **완전 자동 변환** | 사람이 직접 편집·교정 후 빌드 |
| 시맨틱 마크업 | 최소한 — 자동 변환기가 구조를 추측 | `epub:type` + `se:` 네임스페이스로 세밀하게 태깅 |
| 타이포그래피 | 곧은따옴표 등 기본 수준 | 곱은따옴표·en/em dash 등 출판 수준 |
| 목차/각주 UX | 기본적인 nav만 제공 | 팝업 각주, 상세 landmarks 등 최신 리더 기능 적극 활용 |
| 소스 관리 | 별도 공개 저장소 없음(파생 산출물 중심) | GitHub 공개, 커뮤니티 교정 가능 |
| 우선순위 | 속도·방대한 장서량 | 품질·일관성·접근성 |

## 6. 정리

- EPUB3는 **ZIP + mimetype 라벨 + container.xml 안내판 + .opf 설계도 + nav 목차 + XHTML 본문**이라는 계층 구조를 갖고 있고, 파싱은 이 계층을 위에서부터 따라 내려가며 필요한 파일만 골라 읽는 과정이에요.
- **EPUB3 표준 자체(container.xml, .opf, nav.xhtml 구조)는 모든 곳에서 동일**하지만, 그 안에 **"얼마나 정성 들여 태그를 붙이고 다듬었는가"**는 배포처마다 크게 달라요.
- Project Gutenberg는 "자동화·물량" 중심, Standard Ebooks는 "수작업 품질·접근성" 중심이라는 게 두 컨벤션의 근본적인 차이예요.

---

## 출처

- [Anatomy of an EPUB 3 file – EDRLab](https://www.edrlab.org/open-standards/anatomy-of-an-epub-3-file/)
- [EPUB 3.3 — W3C](https://www.w3.org/TR/epub-33/)
- [EPUB OPF Package Document: Structure, Metadata, and Spine Explained — toolkit.bot](https://toolkit.bot/blog/epub-opf)
- [Inside an EPUB File: Structure, Files, and How It All Works — toolkit.bot](https://toolkit.bot/blog/epub-structure)
- [File Formats Utilized by Project Gutenberg](https://www.gutenberg.org/help/file_formats.html)
- [gutenbergtools/ebookmaker — GitHub](https://github.com/gutenbergtools/ebookmaker)
- [What Makes Standard Ebooks Different](https://standardebooks.org/about/what-makes-standard-ebooks-different)
- [4. Semantics — The Standard Ebooks Manual of Style](https://standardebooks.org/manual/1.6.2/4-semantics)
- [Standard Ebooks — Wikipedia](https://en.wikipedia.org/wiki/Standard_Ebooks)
