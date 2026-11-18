# 개발에서 "헤드리스(Headless)"란?

## 쉬운 설명

로봇 인형에서 "머리(화면)"만 떼어낸 몸통이라고 생각하면 돼요. 눈, 입 같은 얼굴(화면/UI)이 없어도 몸통(핵심 기능)은 시키는 대로 일을 다 할 수 있어요. 대신 로봇에게 뭘 시킬지는 리모컨(명령어나 API)으로 알려줘야 해요.

## 일반 설명

**헤드리스(Headless)**는 "머리(head) = 사용자에게 보이는 화면/UI"가 없는 상태로 소프트웨어가 동작하는 것을 뜻한다. 여기서 "머리"는 그래픽 사용자 인터페이스(GUI)나 프레젠테이션 계층을 은유적으로 가리키며, 헤드리스 소프트웨어는 GUI 없이 API·CLI·명령줄 인자 등을 통해 제어된다.

### 대표적인 헤드리스 유형

**1. 헤드리스 서버/OS**
- 모니터·키보드 같은 물리적 디스플레이 장치 없이 운영되는 서버나 리눅스 배포판.
- SSH나 원격 관리 도구로 접속해 명령어로 제어한다. 데이터센터/클라우드 VM이 대표적.

**2. 헤드리스 브라우저 (Headless Browser)**
- 화면에 아무것도 그리지 않고 내부적으로만 페이지를 렌더링하는 브라우저(예: Puppeteer, Playwright, Selenium의 headless 모드, headless Chrome).
- 자동화 테스트, 웹 크롤링/스크래핑, 스크린샷 생성, CI 파이프라인에서의 E2E 테스트 등에 쓰인다. GUI를 그리지 않으므로 서버 환경에서 가볍고 빠르게 실행 가능하다.

**3. 헤드리스 CMS (Headless Content Management System)**
- 콘텐츠 저장/관리(백엔드)와 콘텐츠 표시(프론트엔드)를 분리한 구조.
- 편집자는 CMS에서 콘텐츠를 작성·관리하고, 개발자는 REST/GraphQL 같은 API로 그 콘텐츠를 가져와 원하는 프론트엔드(React, Vue, 모바일 앱, IoT 기기 등 어디든)에 자유롭게 렌더링한다.
- 전통적 CMS(예: WordPress 기본 구성)는 콘텐츠 관리와 화면 출력(테마)이 한 몸으로 묶여 있는 반면, 헤드리스 CMS는 "출력 방식(머리)"을 아예 갖지 않는다.

**4. 헤드리스 아키텍처 / 헤드리스 커머스 (Headless Architecture / Commerce)**
- 더 넓은 개념으로, 백엔드(비즈니스 로직·데이터)와 프론트엔드(표현 계층)를 API 경계로 완전히 분리하는 설계 철학.
- 팀은 백엔드 구현과 무관하게 원하는 프론트엔드 기술 스택을 자유롭게 선택할 수 있고, 동일한 백엔드로 웹·모바일·키오스크 등 여러 채널에 동시에 콘텐츠/기능을 제공할 수 있다(멀티채널/omnichannel).
- 최근에는 이를 더 세분화한 컴포저블 아키텍처(composable architecture, MACH: Microservices, API-first, Cloud-native, Headless) 흐름으로 확장되고 있다.

### 왜 쓰는가 (장점)

- **유연성**: 프론트엔드 기술 선택이 자유롭고, 백엔드 변경이 프론트엔드에 영향을 덜 준다.
- **자동화/성능**: 브라우저 헤드리스 모드는 GUI 렌더링 비용이 없어 테스트·크롤링 속도가 빠르고 서버(디스플레이 없는 환경)에서도 실행 가능하다.
- **멀티채널 배포**: 하나의 콘텐츠/백엔드를 여러 플랫폼(웹, 앱, IoT)에 API로 재사용할 수 있다.

### 단점/트레이드오프

- API 계층을 직접 설계·유지보수해야 하므로 초기 구축 복잡도가 올라간다.
- 미리보기(preview) 기능처럼 전통적 CMS에서 기본 제공되던 UI 편의 기능을 별도로 구현해야 하는 경우가 많다.
- 프론트엔드/백엔드 팀 간 API 계약(contract) 관리 오버헤드가 발생한다.

### 요약

"헤드리스"의 공통 본질은 **"화면(UI/프레젠테이션 계층)을 시스템 자체에서 떼어내고, 그 자리를 API·CLI로 대체한다"**는 것이다. 서버냐 브라우저냐 CMS냐에 따라 적용 맥락만 다를 뿐, 항상 이 원칙이 반복된다.

---

Sources:
- [Headless software - Wikipedia](https://en.wikipedia.org/wiki/Headless_software)
- [Headless Architecture: A Comprehensive Guide - Strapi](https://strapi.io/blog/headless-architecture)
- [What is Headless Architecture? (with Examples & Comparisons) | ButterCMS](https://buttercms.com/blog/understanding-headless-architecture/)
- [Headless CMS Architecture Guide 2026 | GitNexa](https://www.gitnexa.com/blogs/headless-cms-architecture-explained)
- [The Pros and Cons of Headless Architecture | Medium](https://medium.com/elca-it/the-pros-and-cons-of-headless-architecture-1151d7633f3c)
- [Headless Web Development Explained For Founders In 2026](https://estatic-infotech.com/blog/post/headless-web-development-explained-for-founders-in-2026)
