# Gutenberg용 EPUB 파서를 그대로 Standard Ebooks에도 쓸 수 있을까? 범위가 더 넓은 건 어느 쪽일까?

## 결론부터

**"파서가 무엇을 기준으로 파일을 찾아가는가"에 달려 있어요.** `.opf`(패키지 문서)의 매니페스트·스파인만 따라가며 **표준(EPUB3 spec)대로** 동작하는 파서라면, Standard Ebooks(SE)는 오히려 Gutenberg보다 **더 깨끗하고 표준을 잘 지키는 파일**이라 그대로 잘 파싱될 가능성이 높아요. 다만 파서를 만들면서 **Gutenberg의 특이한 관행에 맞춰 슬쩍 하드코딩한 부분**(고정 파일명, 보일러플레이트 페이지 존재 가정 등)이 있다면 그 부분에서 깨질 수 있어요. 그리고 "**범위가 더 넓다**"는 질문은 **두 축으로 나눠 답해야** 해요 — "구조가 얼마나 제각각인가(다양성)" 축에서는 **Gutenberg가 더 넓고(더 지저분하고)**, "얼마나 많은 의미 정보를 담고 있는가(풍부함)" 축에서는 **Standard Ebooks가 더 넓어요.**

## 다섯 살에게 설명하듯

두 나라에서 온 편지를 읽는 상황을 생각해 보세요.

- **Gutenberg 나라**는 **수십 년 동안 여러 명의 다른 번역가(자동 변환 도구의 여러 버전)**가 그때그때 다른 방식으로 번역해서 편지를 보내왔어요. 어떤 편지는 문단이 이상하게 나뉘어 있고, 어떤 편지엔 필요 없는 안내문(라이선스 보일러플레이트)이 껴 있기도 해요. **편지 형식이 들쭉날쭉해서 "예외 상황"이 아주 많아요.**
- **Standard Ebooks 나라**는 **한 명의 꼼꼼한 편집자(수작업 교정)**가 정해진 규칙대로만 편지를 써서 보내요. 형식이 항상 일정하지만, **그 안에 "이 단어는 인명입니다", "이건 편지의 서명입니다" 같은 세세한 설명 딱지(시맨틱 태그)가 훨씬 많이 붙어 있어요.**

그래서 **"Gutenberg 편지를 읽는 법(파서)"을 배운 사람은 SE 편지도 대부분 읽을 수 있어요** — SE 편지가 오히려 더 단순하고 규칙적이니까요. 하지만 그 사람이 "Gutenberg 편지엔 항상 안내문이 껴 있으니 무조건 그걸 먼저 찾아서 지운다"처럼 **Gutenberg만의 습관에 맞춰 규칙을 외웠다면**, 안내문이 아예 없는 SE 편지 앞에서 헤맬 수 있어요.

## 기술적으로 풀어보면

### 1) 재사용이 잘 되는 경우 — "표준 준수형" 파서

파서가 아래처럼 **오직 스펙에 정의된 참조 관계만** 따라간다면 SE에도 그대로 통합니다.

- 커버 이미지: 파일명(`coverpage.jpg` 등)을 추측하지 않고, 매니페스트의 `properties="cover-image"` 속성으로 찾는다.
- 목차: `toc.ncx`(EPUB2 잔재)를 먼저 찾지 않고, 매니페스트의 `properties="nav"` 항목을 우선으로 찾는다.
- 본문 읽는 순서: 폴더 구조(`OEBPS/`, `EPUB/` 등)를 하드코딩하지 않고, `container.xml`의 `full-path` → `.opf`의 `<spine>` 순서를 그대로 따라간다.
- `epub:type` 값: 모르는 값(예: `z3998:` 이나 `se:` 네임스페이스 값)이 나와도 **에러 내지 않고 그냥 무시하거나 통과**시킨다.

이런 파서는 오히려 SE에서 **더 안정적으로 동작**할 가능성이 높아요. SE는 모든 파일이 EPUBCheck 검증을 통과하는 표준 준수 EPUB이라, 매니페스트/스파인만 잘 따라가면 예외 상황 자체가 거의 없어요.

### 2) 재사용이 깨지는 경우 — "Gutenberg 특유 관행"에 의존한 파서

반대로 아래 같은 로직이 들어있다면 SE에서 실패하거나 정보를 놓칠 수 있어요.

| 파서에 들어있을 수 있는 Gutenberg 전용 가정 | SE에서 벌어지는 일 |
|---|---|
| "라이선스 보일러플레이트 페이지가 항상 스파인 맨 앞/뒤에 있다"고 가정하고 건너뛰는 로직 | SE엔 그런 PG 전용 보일러플레이트 페이지가 없음 → 잘못된 페이지를 건너뛰거나, 없는 걸 찾다가 예외 발생 가능 |
| 표지·CSS 파일명을 `pgepub.css`, `coverpage.png`처럼 **고정 문자열 매칭**으로 찾음 | SE는 `core.css`/`local.css`/`se.css`처럼 다른 이름 체계를 씀 → 못 찾음 |
| 원문이 통짜 HTML 한 개(EPUB2 시절 관행)라고 가정하고 챕터를 텍스트 패턴으로 잘라냄 | SE는 애초에 `text/chapter-1.xhtml`처럼 **파일 자체가 챕터별로 이미 분리**돼 있음 → 자르는 로직이 무의미하거나 오작동 |
| 깨진 XHTML을 복구하는 관대한 파싱(`lxml recover=True`, 인코딩 자동 감지)에만 의존하고 표준 준수 스펙 파싱 경로가 없음 | 무해하지만(SE는 애초에 안 깨져 있음), **`epub:type`/`se:` 네임스페이스 같은 SE만의 풍부한 의미 정보는 전혀 추출 못 함** |

### 3) "범위가 더 넓다"의 두 가지 의미

| 축 | 더 넓은(다양한/까다로운) 쪽 | 이유 |
|---|---|---|
| **구조적 다양성 / 견고성(robustness) 요구량** | **Gutenberg** | 수십 년간 다양한 버전의 자동 변환 도구, 원문 품질 편차(plain text 추측 변환 포함), EPUB2 시절 잔재까지 뒤섞여 있어 예외 케이스가 훨씬 많음 |
| **의미 정보의 풍부함(semantic richness)** | **Standard Ebooks** | `epub:type` + `se:` 네임스페이스로 인명·서명·각주 등 세밀한 의미 태그를 추가로 붙임. Gutenberg 파서는 이 정보 자체가 존재하지 않아 추출할 대상이 없음 |

즉 **"Gutenberg를 처리할 수 있으면 SE도 처리할 수 있다"는 명제는 '구조적으로 안 깨진다'는 뜻에서는 대체로 맞지만, 'SE가 제공하는 추가 정보까지 다 뽑아낸다'는 뜻에서는 틀려요.** 파서가 SE의 `epub:type` 태그를 활용하고 싶다면, Gutenberg 파서 위에 **SE 전용 시맨틱 추출 레이어를 별도로 얹어야** 해요.

## 자가 점검 체크리스트

지금 만든 Gutenberg 파서가 SE에도 그대로 통할지 확인하려면 이 항목들을 코드에서 찾아보세요.

- [ ] 폴더 이름(`OEBPS` 등)을 문자열로 하드코딩한 곳이 있는가? → `container.xml`의 `full-path`를 항상 신뢰하도록 고쳐야 함
- [ ] 커버/CSS/이미지 파일을 **파일명 패턴 매칭**으로 찾는 곳이 있는가? → 매니페스트의 `properties`/`media-type` 속성 기반으로 바꿔야 함
- [ ] PG 라이선스 보일러플레이트 페이지의 존재를 전제로 한 스킵 로직이 있는가? → "있으면 스킵, 없으면 그냥 진행"하도록 옵셔널 처리 필요
- [ ] `epub:type` 값에 화이트리스트 검증(모르는 값이면 에러)을 걸어뒀는가? → 알 수 없는 값은 무시하고 통과시키도록 완화 필요
- [ ] EPUB3 `nav.xhtml`보다 EPUB2 `toc.ncx`를 우선 찾도록 짜여 있는가? → SE는 `nav.xhtml`이 정본이므로 우선순위를 바꿔야 함

이 다섯 개 중 어느 것도 해당하지 않는다면, 지금의 Gutenberg 파서는 **코드 수정 없이 SE도 그대로 파싱될 가능성이 큽니다.**

## 요약

- 재사용 가능 여부는 파서가 "스펙을 따라가는가" vs "Gutenberg의 습관에 맞춰 하드코딩됐는가"에 달려 있어요.
- **구조적으로 다뤄야 할 예외 케이스의 다양성**은 Gutenberg가 더 넓어요 — 이 축에서는 "Gutenberg를 처리하면 SE도 처리된다"는 생각이 대체로 맞습니다.
- **뽑아낼 수 있는 의미 정보의 풍부함**은 Standard Ebooks가 더 넓어요 — 이 축에서는 Gutenberg 파서가 SE의 추가 정보를 놓치게 됩니다.
- 확실히 하려면 위 체크리스트로 하드코딩된 Gutenberg 전용 가정이 있는지 직접 코드에서 확인해 보세요.

---

## 출처

- [Anatomy of an EPUB 3 file – EDRLab](https://www.edrlab.org/open-standards/anatomy-of-an-epub-3-file/)
- [Inside an EPUB File: Structure, Files, and How It All Works — toolkit.bot](https://toolkit.bot/blog/epub-structure)
- [gutenbergtools/ebookmaker — GitHub](https://github.com/gutenbergtools/ebookmaker)
- [4. Semantics — The Standard Ebooks Manual of Style](https://standardebooks.org/manual/1.6.2/4-semantics)
- [What Makes Standard Ebooks Different](https://standardebooks.org/about/what-makes-standard-ebooks-different)
- [How We Built a Robust EPUB Parsing and Rebuilding Pipeline in Python — DEV Community](https://dev.to/jacob_gong/how-we-built-a-robust-epub-parsing-and-rebuilding-pipeline-in-python-29f9)
