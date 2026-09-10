# EPUB3 같은 e-book 확장자들, 역사·구조·그리고 "표준"이라 부르기 애매한 현실

## 결론부터

전자책(e-book) 파일 형식은 **"모두가 따르는 진짜 표준" 하나로 통일된 적이 없어요.** EPUB이 가장 널리 쓰이는 **공개 표준(open standard)**이긴 하지만, 아마존은 처음부터 지금까지 **자기들만의 독자 포맷(MOBI → AZW → AZW3 → KFX)**을 따로 만들어 썼고, 같은 "EPUB"이라는 이름을 붙인 파일이라도 **리더 프로그램(Apple Books, Kindle 앱, calibre 등)마다 CSS를 처리하는 방식이 달라 실제로 보이는 모습이 조금씩 달라요.** 즉 "파일 구조를 정의하는 표준"은 있지만 "그 표준을 어떻게 화면에 그릴지"는 표준화가 안 됐고, 여기에 각 서점의 DRM(디지털 저작권 관리)까지 겹쳐서 **호환성 문제가 지금도 진행형**이에요.

## 다섯 살에게 설명하듯

전자책 파일들을 **"각 나라 말로 쓰인 편지"**라고 생각해 보세요.

- **EPUB**은 전 세계 대부분의 나라(애플, 코보, 구글, 안드로이드 앱들)가 함께 정한 **"국제 공용어"**예요. 문법책(W3C 표준 문서)도 있고, 다 같이 지키기로 약속했어요.
- 그런데 **아마존 나라**만 유독 "우리는 우리말 쓸래" 하고 **독자적인 사투리(MOBI, 그다음 AZW, 그다음 AZW3, 지금은 KFX)**를 계속 새로 만들었어요. 심지어 18년 동안 사투리를 4번이나 바꿨어요.
- 같은 "국제 공용어(EPUB)"로 편지를 써도, **읽는 사람(리더 앱)마다 발음이 조금씩 달라요.** 어떤 사람은 곱슬머리 글씨(CSS 스타일)를 정확히 읽어주고, 어떤 사람은 대충 흉내만 내요. 표준 문서에 "이렇게 읽어라"라고 다 안 적혀 있어서 생기는 일이에요.
- 게다가 어떤 편지는 **자물쇠(DRM)**가 걸려 있어서, 그 나라(서점) 앱으로만 열 수 있어요. 편지 내용(포맷)은 같아도 자물쇠 종류가 회사마다 달라요.

그래서 "전자책 표준"이라는 게 있긴 한데, **"모든 곳에서 완전히 똑같이 보이는 표준"은 없다**는 게 현실이에요.

---

## 1. 역사 — e-book 포맷이 갈라진 이유

### 1) 1999~2007: OEBPS의 탄생과 EPUB으로의 전환
- **1999년**, Open eBook Forum(나중에 IDPF로 개편)이 **OEBPS(Open eBook Publication Structure) 1.0**을 발표해요. HTML과 XML을 기반으로 전자책 콘텐츠를 표현하는 초창기 시도였어요.
- 2001~2002년 OEBPS 1.1, 1.2로 개정되다가, 2005년 말부터 **"여러 파일을 하나의 압축 파일로 묶는(container) 방식"**을 추가로 표준화하기 시작해요. 이게 2006년 **OCF(OEBPS Container Format)**로 승인돼요.
- **2007년 10월**, OPF(패키지 문서) + OCF를 묶어 이름을 바꾼 **EPUB 2.0**이 공식 발표돼요. 이때부터 "EPUB"이라는 이름이 처음 등장해요.

### 2) 2007년: 아마존의 갈림길 — Kindle과 MOBI
- 공교롭게도 **같은 2007년**, 제프 베이조스가 첫 Kindle을 출시해요. 그런데 아마존은 막 등장한 공개 표준 EPUB을 채택하지 않고, **2005년에 인수해둔 Mobipocket사의 MOBI 포맷**을 가져다가 자기들만의 DRM을 얹어 **AZW**라는 독자 포맷을 만들어요.
- 이 선택이 지금까지 이어지는 "EPUB 진영 vs 아마존 진영" 분단의 시작이에요.

### 3) 2011~2017: EPUB3와 아마존의 재추격
- **2011년 10월**, IDPF가 프랑크푸르트 도서전에서 **EPUB 3.0**을 발표해요. HTML5·CSS3·SVG를 정식으로 품고, 고정 레이아웃(fixed-layout), 오디오·비디오 삽입, 접근성(accessibility) 기능이 강화돼요.
- 아마존도 뒤따라 **2012년 AZW3(=KF8, Kindle Format 8)**를 내놓아요. HTML5/CSS3를 지원하는, EPUB3에 대응하는 자체 포맷이에요.
- **2014년 EPUB 3.0.1**, **2017년 1월 EPUB 3.1**이 나온 직후, IDPF가 **W3C(월드와이드웹 컨소시엄)에 통합**돼요. 이때부터 EPUB은 "출판 전용 단체"가 아니라 웹 표준을 관리하는 W3C가 직접 관리하게 돼요.
- 아마존은 **2015년 KFX(KF10)**라는 또 다른 독자 포맷을 추가해요. 더 정교한 타이포그래피와 연속 스크롤 같은 기능이 목적이었어요.

### 4) 2021~2026: EPUB 쪽으로 조금씩 수렴
- **2021년**, 아마존이 MOBI 형식의 직접 업로드 지원을 중단하겠다고 발표해요. MOBI는 사실상 퇴역 수순.
- **2022년**부터 Send-to-Kindle 기능이 **EPUB 파일을 직접 받아들이기** 시작해요.
- **2026년 1월 20일**부터는 아마존이 구매 인증된 독자에게 **DRM 없는 Kindle 전자책을 EPUB이나 PDF로 직접 다운로드**할 수 있게 허용하기 시작했어요. (다만 여전히 아마존 내부적으로는 자체 포맷을 씀)

즉 역사를 요약하면: **"공개 표준(EPUB) 진영"과 "아마존의 독자 포맷 진영"이 2007년에 갈라졌다가, 2020년대 들어 서서히 EPUB 쪽으로 다시 좁혀지는 중**이라는 그림이에요.

---

## 2. 주요 e-book 확장자별 구조 요약

| 포맷 | 기반 기술 | 특징 | 현재 위치 |
|---|---|---|---|
| **EPUB (.epub)** | ZIP + XHTML/CSS + XML 메타데이터 | 개방형 국제 표준, reflowable(글자 크기·화면에 맞춰 재배치)이 기본 | 사실상의 업계 표준 |
| **MOBI (.mobi)** | PalmDOC 기반 이진(binary) 포맷 | 2000년대 초 저사양 단말기용으로 설계, HTML 일부만 지원 | 사실상 단종, 아마존도 지원 중단 |
| **AZW (.azw)** | MOBI + 아마존 DRM | MOBI에 자물쇠만 얹은 버전 | 구형 Kindle 전용, 퇴역 중 |
| **AZW3/KF8 (.azw3)** | HTML5 + CSS3 기반 | EPUB3에 대응하려고 만든 아마존 자체 포맷, 고정 레이아웃 지원 | 최신 Kindle 기기가 실제로 렌더링에 쓰는 포맷 |
| **KFX (KF10)** | 아마존 독자 포맷 (비공개) | 정교한 타이포그래피, 연속 스크롤 등 최신 기능 | 최신 Kindle 앱/기기용, 구조가 공개돼 있지 않음 |
| **FB2 (.fb2)** | 단일 XML 파일 (압축 없음) | 러시아·동유럽권에서 주로 쓰임, 메타데이터가 매우 상세 | 특정 지역 커뮤니티 중심, 국제 표준은 아님 |
| **DjVu (.djvu)** | 이미지 기반 압축 포맷 | 스캔한 책·문서 압축에 특화 (1990년대 말 개발) | 학술 스캔 자료 등 니치 영역 |
| **CBZ/CBR (.cbz/.cbr)** | 이미지 시퀀스를 ZIP/RAR로 압축 | 만화책 전용, 텍스트 reflow 없이 스캔 그림 그대로 | 만화·그래픽노블 전용 |
| **PDF (.pdf)** | 고정 페이지 기술 언어 | 인쇄물과 100% 동일한 레이아웃 보존, 화면 크기 안 가리고 그대로 축소 표시 | 학술 논문·인쇄용 원본 배포에 강함, 소형 화면엔 약함 |

**reflowable(재배치형) vs fixed-layout(고정형)**이라는 축도 따로 있어요. 소설처럼 글자 위주인 책은 화면 크기에 맞춰 글자가 자동으로 흐르는 reflowable이 편하고, 그림책·만화·잡지처럼 레이아웃 자체가 중요한 책은 원본 그대로 고정해서 보여주는 fixed-layout이 필요해요. EPUB3는 두 방식을 옵션으로 다 지원하지만, MOBI 같은 옛날 포맷은 애초에 fixed-layout 개념 자체가 미비했어요.

---

## 3. "표준화되지 않은 현실" — EPUB이라는 이름값과 실제 사이의 간극

### 1) 표준 문서는 "파일 구조"까지만 정의하고, "화면에 그리는 법"은 리더 프로그램 자율
EPUB 표준(W3C의 EPUB 3.3 스펙)은 ZIP 안에 어떤 파일이 어떤 이름·구조로 있어야 하는지는 엄격히 정의하지만, **CSS를 얼마나 정확히 해석해서 화면에 그릴지는 리더 프로그램(Reading System)의 재량**이에요. 그 결과:
- 같은 EPUB 파일이 Apple Books에서는 의도한 폰트·여백대로 보이는데, 다른 리더 앱에서는 CSS 일부가 무시되거나 다르게 렌더링되는 일이 흔해요.
- 공식 검증 도구인 **EPUBCheck**조차 "구조가 스펙에 맞는지"만 검사할 뿐, **CSS 자체의 유효성이나 실제 렌더링 결과까지는 검증하지 않아요.** W3C 내부에서도 "EPUBCheck가 CSS를 어디까지 검사해야 하는가"가 여전히 논의 중인 이슈예요.
- 즉 "EPUBCheck를 통과했다"는 게 "모든 리더에서 똑같이 예쁘게 보인다"를 보장해주지 않아요.

### 2) 아마존은 애초에 표준 자체를 안 씀
아마존 Kindle 생태계(AZW, AZW3, KFX)는 EPUB 표준 기구(IDPF/W3C)의 관리 대상이 아니라 **순수 사내 독자 규격**이에요. KFX의 내부 구조는 공개돼 있지 않아서, 서드파티 도구들이 리버스 엔지니어링(역공학)으로 변환기를 만들어야 하는 처지예요. "이름이 다른 포맷이라 당연히 다르다"고 볼 수도 있지만, 문제는 **독자 대부분이 "전자책 = EPUB 아니면 Kindle 파일"이라는 두 세계가 나뉘어 있다는 걸 체감하며 살아야 한다**는 점이에요.

### 3) DRM이 포맷 위에 또 다른 파편화 층을 얹음
같은 EPUB 확장자라도 **어느 서점에서 샀느냐에 따라 걸린 DRM이 달라요**(Adobe DRM, 애플의 FairPlay, 아마존의 자체 DRM 등). 파일 구조(EPUB 스펙)는 표준이어도, **그 파일을 열 수 있는 자물쇠 해제 권한은 표준화돼 있지 않아** 특정 서점 앱에서 산 책을 다른 리더 앱으로 그냥 옮겨서 못 여는 경우가 여전히 흔해요. 2026년 1월부터 아마존이 DRM-free EPUB/PDF 다운로드를 일부 허용하기 시작한 것도, 뒤집어 보면 그동안 이게 표준화된 적이 없었다는 방증이에요.

### 4) "표준을 지켰다"의 기준 자체가 배포처마다 다름
같은 EPUB3 스펙을 따라도 실제로 얼마나 꼼꼼하게 태그를 붙이고 검증했는지는 배포처 재량이에요. 예를 들어 Project Gutenberg는 자동 변환 도구로 EPUB을 대량 생산하는 반면, Standard Ebooks는 사람이 직접 세밀한 시맨틱 태그를 손으로 붙여요. 이 차이는 같은 저장소 안의 다른 문서 [`epub3-structure-parsing-and-gutenberg-standardebooks-comparison.md`](epub3-structure-parsing-and-gutenberg-standardebooks-comparison.md)에서 더 자세히 다뤘어요 — 요점은 **"EPUB3 표준을 지켰다"는 말 자체가 실제로는 품질 스펙트럼이 매우 넓다**는 거예요.

### 5) FB2·DjVu 같은 지역/니치 포맷은 애초에 국제 표준화 시도조차 없었음
FB2는 러시아어권 커뮤니티에서 자생적으로 퍼진 포맷이라 국제 표준 기구를 거친 적이 없고, DjVu도 학술 스캔 문서용으로 특정 커뮤니티에서 개발돼 널리 쓰이지만 "전자책 표준"으로 공인된 적은 없어요. 즉 EPUB 바깥에는 애초에 "표준화 시도조차 없었던" 포맷들이 여전히 실사용되고 있는 것도 현실의 일부예요.

---

## 4. 정리

- **역사**: OEBPS(1999) → EPUB 2.0(2007, 공교롭게 Kindle 출시와 같은 해) → 아마존의 독자 노선(MOBI/AZW) 분리 → EPUB 3.0(2011)과 IDPF의 W3C 편입(2017) → 2020년대 들어 아마존이 서서히 EPUB 쪽으로 다시 접근 중.
- **구조**: EPUB은 개방형 표준으로 ZIP 기반 구조가 명확히 정의돼 있는 반면, MOBI/AZW/AZW3/KFX는 아마존의 독자 규격으로 계보가 이어짐. FB2·DjVu·CBZ 등은 각자 다른 목적(지역 커뮤니티, 스캔 문서, 만화)으로 개발된 별개의 포맷.
- **표준화 안 된 현실**: (1) 파일 구조는 표준이어도 실제 렌더링 결과는 리더 앱마다 다름, (2) 아마존 생태계는 애초에 표준 기구 바깥에 있음, (3) DRM이 포맷과 별개로 또 다른 파편화를 만듦, (4) "표준 준수"의 실천 수준 자체가 배포처마다 천차만별, (5) 애초에 국제 표준화 궤도에 오른 적 없는 지역/니치 포맷들도 여전히 살아있음.

## 출처

- [ePUB vs MOBI — Cloudwards](https://www.cloudwards.net/epub-vs-mobi/)
- [Kindle, EPUB, And Amazon's Love Of Reinventing Wheels — Hackaday](https://hackaday.com/2022/05/17/kindle-epub-and-amazons-love-of-reinventing-wheels/)
- [MOBI, AZW, and KFX: Amazon's Kindle Format Timeline — ChangeThisFile](https://changethisfile.com/blog/mobi-azw-kindle)
- [EPUB — Wikipedia](https://en.wikipedia.org/wiki/EPUB)
- [Open eBook — Wikipedia](https://en.wikipedia.org/wiki/Open_eBook)
- [International Digital Publishing Forum — Wikipedia](https://en.wikipedia.org/wiki/International_Digital_Publishing_Forum)
- [The Past 25 Years of E-books — Publishers Weekly](https://www.publishersweekly.com/pw/by-topic/digital/content-and-e-books/article/89005-the-past-25-years-of-e-books.html)
- [EPUB 3 — EDRLab](https://www.edrlab.org/open-standards/epub/)
- [10 Best eBook Formats in 2026 — PDF Guru](https://pdfguru.com/plus/blog/best-ebook-formats)
- [Kindle DRM Compatibility in 2026 — DVDFab](https://www.dvdfab.cn/bookfab/remove-drm-from-kindle-books.htm)
- [Reflowable vs Fixed-layout ePUBs — GetMagicBox](https://www.getmagicbox.com/blog/reflowable-vs-fixed-layout-epubs-best-ebooks-format/)
- [Self-Publishing Tech 101: Reflowable ePubs VS Fixed Layout ePubs — Kobo Writing Life](https://www.kobo.com/kobo-writing-life/blog/tech-101-reflowable-epubs-vs-fixed-layout-epubs)
- [eBook File Formats overview — eWritable](https://ewritable.net/e-book-e-reader-file-formats-a-detailed-explanation/)
- [What should EPUBCheck do about CSS validation? — W3C GitHub Issue](https://github.com/w3c/publ-cg/issues/69)
- [EPUB Reading Systems 3.3 — W3C](https://w3c.github.io/epub-specs/epub33/rs/)
