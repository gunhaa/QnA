# GitHub 저장소의 저작권 표기 방법

## 쉬운 설명

내가 만든 장난감(코드)에 "이거 내가 만든 거고, 이런 규칙으로 갖고 놀아도 돼"라고 적힌 카드를 붙여두는 거예요. 카드가 없으면 사람들이 "이거 만져도 되는지, 베껴도 되는지" 몰라서 함부로 못 써요. GitHub에서는 이 카드를 저장소 맨 위(`LICENSE` 파일)와 코드 파일 맨 위(주석)에 붙입니다.

## 일반 설명

GitHub에서 저작권을 표기하는 방법은 크게 **저장소(레포) 단위**와 **개별 소스 파일 단위** 두 층위로 나뉜다. 이 둘은 역할이 다르므로 함께 갖추는 것이 원칙이다.

### 1. 저장소 단위 — `LICENSE` 파일

- 저장소 **루트**에 `LICENSE`, `LICENSE.txt`, `LICENSE.md` 같은 이름의 파일을 두고, 라이선스 전문(全文)을 기재한다.
- GitHub는 저장소 생성 시 또는 "Add file → Create new file"에서 `LICENSE`라는 파일명을 입력하면 **라이선스 템플릿 선택기**(MIT, Apache-2.0, GPLv3, BSD 등)를 자동으로 제안해준다. 이는 choosealicense.com과 연동된 기능이다.
- **저작권 표시(copyright notice)**와 **라이선스(license)**는 별개 개념이다.
  - 저작권 표시는 "누가 이 저작물의 권리자인가"를 밝히는 문구일 뿐이고,
  - 라이선스는 "그 권리자가 남에게 무엇을 허용하는가"를 규정하는 계약이다.
  - 저작권 표시만 있고 라이선스가 없으면, 법적으로는 **"모든 권리 보유(all rights reserved)"** 상태로 간주되어 남이 마음대로 복사·수정·배포할 수 없다. 오픈소스로 공개하려면 반드시 라이선스를 함께 명시해야 한다.
- MIT 라이선스 기준 저작권 표시 예:
  ```
  MIT License

  Copyright (c) 2026 Hong Gil-dong

  Permission is hereby granted, free of charge, to any person obtaining a copy
  ...
  ```
- README.md에도 라이선스 섹션이나 배지(badge)를 넣는 것이 관례다.
  ```markdown
  ## License
  This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
  ```

### 2. 개별 소스 파일 단위 — 헤더 주석

- 프로젝트 전체 라이선스와 별개로, 각 소스 파일 상단에 짧은 저작권/라이선스 헤더를 넣는 관행이 있다(특히 다중 기여자가 있거나, 파일별로 라이선스가 다를 수 있는 대형 오픈소스 프로젝트에서 중요).
- 기본 형태:
  ```
  // Copyright (c) 2026 Hong Gil-dong
  // SPDX-License-Identifier: MIT
  ```
- 저작권 기호는 `©`(circle-C), 단어 `Copyright`, 약어 `Copr.` 중 아무거나 국제적으로 통용되며, 여러 국가에서 두루 인식되는 `©` 사용이 흔히 권장된다.
- **SPDX(Software Package Data Exchange)** 표준을 쓰면 긴 라이선스 전문을 파일마다 복사하지 않고 짧은 태그 두 줄로 대체할 수 있다.
  ```
  SPDX-FileCopyrightText: 2026 Hong Gil-dong
  SPDX-License-Identifier: Apache-2.0
  ```
  - `SPDX-FileCopyrightText`: 저작권자·연도 표시
  - `SPDX-License-Identifier`: SPDX가 정의한 표준 라이선스 식별자(MIT, Apache-2.0, GPL-3.0-only 등)를 명시
- 이를 프로젝트 전체에 일관되게 적용하는 커뮤니티 표준으로 **REUSE 사양(REUSE Software specification)**이 있으며, `reuse lint` 같은 도구로 모든 파일에 SPDX 헤더가 빠짐없이 있는지 자동 검사할 수 있다.

### 3. 실무 체크리스트

1. 저장소 루트에 `LICENSE` 파일 추가 (GitHub 라이선스 선택기 활용 가능).
2. README에 라이선스 안내 섹션 추가.
3. (선택, 특히 다중 기여자/대형 프로젝트) 소스 파일 상단에 `SPDX-FileCopyrightText` + `SPDX-License-Identifier` 헤더 추가.
4. 제3자 코드를 가져다 쓸 경우, 원본에 있던 저작권 표시와 라이선스 문구를 임의로 삭제하지 말고 그대로 유지.
5. 라이선스를 아예 넣지 않으면 기본값은 "모든 권리 보유"라는 점 — 오픈소스 의도라면 반드시 명시할 것.

---

Sources:
- [소스 코드 내 저작권 표시 방법 | SKT Open Source](https://sktelecom.github.io/en/blog/2020/20200812-copyright-license/)
- [저작권 및 라이선스 표기 | 오픈소스 가이드](https://opensource-skt.gitbook.io/guide/creating/creating/copyright)
- [리포지토리 라이선싱 - GitHub 문서](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
- [Open Source License Best Practices - Linux Foundation](https://www.linuxfoundation.org/licensebestpractices)
- [GitHub - david-a-wheeler/spdx-tutorial](https://github.com/david-a-wheeler/spdx-tutorial)
- [How and why to properly write copyright statements in your code - Liferay](https://liferay.dev/b/how-and-why-to-properly-write-copyright-statements-in-your-code)
- [Guidance on Copyrights and Licenses - Trilinos Wiki](https://github.com/trilinos/Trilinos/wiki/Guidance-on-Copyrights-and-Licenses)
