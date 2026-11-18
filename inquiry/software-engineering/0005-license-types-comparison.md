# 오픈소스 라이선스 종류 비교

## 쉬운 설명

라이선스는 "내 장난감을 갖고 놀 때 지켜야 할 규칙"이에요. 어떤 규칙은 "그냥 가져가서 니 맘대로 색칠해도 돼"(관대한 규칙)이고, 어떤 규칙은 "가져가서 고치면, 고친 것도 다시 모두에게 공개해야 해"(공유 강제 규칙)예요.

## 일반 설명

오픈소스 라이선스는 크게 **관대한 라이선스(Permissive License)**와 **카피레프트 라이선스(Copyleft License)** 두 계열로 나뉜다. 이 구분이 라이선스를 이해하는 가장 큰 축이다.

### 1. 관대한 라이선스 (Permissive)

수정·재배포 시 소스 코드를 공개할 의무가 없다. 원저작자의 코드를 가져다 **비공개(proprietary) 소프트웨어에 포함시켜도** 무방하며, 대체로 저작권 고지만 유지하면 된다.

- **MIT License**
  - 가장 단순하고 가장 널리 쓰이는 라이선스. 사용·수정·재배포·상업적 이용 모두 자유롭다.
  - 유일한 의무: 원본의 저작권 고지(copyright notice)와 라이선스 전문을 그대로 유지.
  - 특허(patent)에 대한 명시적 조항은 없다.
- **BSD License (2-Clause / 3-Clause)**
  - MIT와 사실상 동급으로 관대하다. 저작권 고지·조건 목록·면책 조항 유지 의무만 있다.
  - 3-Clause BSD는 추가로 "원저작자/기여자의 이름을 마케팅에 무단으로 사용해 보증하는 것처럼 홍보하지 말 것"이라는 조항이 붙는다.
- **Apache License 2.0**
  - MIT/BSD와 유사하게 관대하지만, **명시적 특허 라이선스 조항**이 포함된 점이 핵심 차이다.
  - 기여자가 자신의 특허를 사용자에게 명시적으로 허여하고, 특허 소송을 걸면 라이선스가 자동 종료되는 조항이 있어 기업/특허 관련 프로젝트에서 선호된다.
  - 수정 시 변경 사항을 명시(NOTICE 파일 등)해야 하는 조항이 MIT보다 조금 더 있다.

### 2. 카피레프트 라이선스 (Copyleft)

수정 후 배포 시 **동일한 라이선스로 소스 코드를 공개**해야 한다. "자유를 강제로 전파"하는 방식이라고도 표현된다.

- **GPL (GNU General Public License, v2/v3)**
  - 강력한(strong) 카피레프트. GPL 코드를 가져다 쓴 소프트웨어를 배포하면, **전체 프로그램의 소스코드**를 동일 GPL 라이선스로 공개해야 한다("바이럴" 성격이라고도 불림).
  - 상용/비공개 소프트웨어에 통합하기가 까다로워 기업에서는 기피되는 경우가 많다.
- **LGPL (Lesser GPL)**
  - GPL보다 약한(weak) 카피레프트. 라이브러리를 **링크(link)해서 사용**하는 경우, 그 라이브러리 자체의 수정분만 LGPL로 공개하면 되고, 이를 사용하는 애플리케이션 본체는 비공개로 유지할 수 있다.
  - 라이브러리 형태 배포에 적합하도록 설계됨.
- **MPL (Mozilla Public License 2.0)**
  - **파일 단위(file-level) 카피레프트**. 수정한 MPL 파일만 같은 라이선스로 공개하면 되고, 그 옆에 새로 추가한 파일은 다른(비공개) 라이선스를 써도 된다.
  - GPL과 MIT의 중간 지점에 있는 절충안 성격.
- **AGPL (Affero GPL)**
  - GPL에 "네트워크로 서비스만 제공해도(SaaS) 배포로 간주"하는 조항을 추가한 버전. 서버에 올려 API/웹서비스로만 제공해도 소스코드 공개 의무가 발생하는 점이 GPL과 다르다.

### 3. 그 외 특수한 경우

- **Public Domain / CC0 / Unlicense**: 저작권 자체를 포기하거나 최대한 포기 의사를 밝히는 방식. 사실상 아무 제약 없이 사용 가능(법적 관할에 따라 완전한 저작권 포기가 인정되지 않는 나라도 있어, 그 대안으로 CC0/Unlicense 같은 명시적 문서를 쓴다).
- **라이선스 없음(No License)**: 저장소에 아무 라이선스 파일도 없으면 기본적으로 **"모든 권리 보유(all rights reserved)"** 상태이며, 코드가 GitHub에 공개돼 있어도 법적으로 남이 함부로 복사·수정·배포할 수 없다.

### 비교 표

| 라이선스 | 계열 | 소스 공개 의무 범위 | 특허 조항 | 대표 사용처 |
|---|---|---|---|---|
| MIT | 관대 | 없음 (저작권 고지만 유지) | 없음 | 대부분의 개인/소규모 오픈소스 |
| BSD (2/3-Clause) | 관대 | 없음 | 없음 | BSD 계열 OS, 학술 프로젝트 |
| Apache-2.0 | 관대 | 없음 (NOTICE 유지) | 명시적 포함 | 기업/특허 민감 프로젝트 (Kubernetes, Android 등) |
| MPL-2.0 | 약한 카피레프트 | 수정한 파일만 | 있음 | Firefox 등 |
| LGPL | 약한 카피레프트 | 라이브러리 수정분만 | 없음 | 상용 앱에서 링크해 쓰는 라이브러리 |
| GPL v2/v3 | 강한 카피레프트 | 전체 프로그램 | v3에 있음 | Linux 커널(v2), GNU 도구 |
| AGPL v3 | 강한 카피레프트 + 네트워크 조항 | 전체 프로그램 (SaaS 포함) | 있음 | 서버/SaaS로 도는 오픈소스 (MongoDB 구버전 등) |
| CC0 / Unlicense | 저작권 포기 | 없음 | 없음 | 데이터셋, 유틸 스니펫 |

### 선택 기준 (실무 감각)

- 빠르게 채택률을 늘리고 싶고 제약을 최소화하려면 **MIT**가 무난한 기본값이다.
- 특허 이슈가 걸릴 수 있는 기업/대형 프로젝트라면 **Apache-2.0**을 우선 고려한다(특허 보호 조항).
- 라이브러리인데 상용 앱에서도 링크해 쓰이길 원한다면 **LGPL**이 절충점이다.
- "내 코드를 가져다 쓰는 모든 파생물도 반드시 오픈소스로 남기고 싶다"는 강한 신념이 있으면 **GPL/AGPL**을 선택한다.
- 2015년 이후 전체 오픈소스 생태계에서 GPL 계열 채택 비중은 줄고, MIT/Apache/BSD 같은 관대한 라이선스 비중이 늘어나는 추세다.

---

Sources:
- [오픈 소스 라이선스 가이드 | Engineering Blog by Dale Seo](https://daleseo.com/open-source-licenses/)
- [오픈소스 라이선스 종류 완벽 정리 (MIT vs GPL vs Apache)](https://jonbeo.kr/168)
- [라이선스 비교표 - OLIS](https://olis.or.kr/license/compareGuide.do)
- [Open Source Licenses: Types and Comparison | Snyk](https://snyk.io/articles/open-source-licenses/)
- [Open Source Licenses Explained: MIT, GPL & More | Mend.io](https://www.mend.io/blog/top-open-source-licenses-explained/)
- [Open Source Licenses: Which One Should You Pick? (2026 Guide) - DEV Community](https://dev.to/juanisidoro/open-source-licenses-which-one-should-you-pick-mit-gpl-apache-agpl-and-more-2026-guide-p90)
