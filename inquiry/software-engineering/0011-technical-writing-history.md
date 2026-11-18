---
type: inquiry
created: 2026-11-18
author: agent
model: claude-opus-5-5
---

# 기술 문서화의 역사

## 쉬운 설명

예전 설명서는 두꺼운 백과사전 한 권이었다. 사람들이 안 읽자 "짧게, 할 일 위주로, 종류별로 나눠 쓰자"로 바뀌었다. 그다음엔 설명서도 코드처럼 Git으로 관리하게 됐고, 요즘은 "읽는 사람이 지금 뭘 하려는지"에 맞춰 문서를 나누는 쪽으로 왔다.

## 일반 설명

### 1. 등장 배경: 통짜 매뉴얼의 실패

1950~60년대 컴퓨터·군수 장비 매뉴얼은 처음부터 끝까지 읽도록 쓴 두꺼운 책이었다. 사용자는 필요한 부분만 찾으려 했지만 구조가 그렇지 않았다. 이 불일치를 해결하려는 시도가 이후 흐름을 만들었다.

### 2. 주요 변천

| 시기 | 사건 | 바꾼 것 |
|---|---|---|
| 1960년대 | **Information Mapping** (Robert Horn) | 정보를 7가지 유형으로 나눈다. 블록은 짧게, 라벨을 붙이고, 모듈식으로 쓴다. 상표로 등록돼 널리 공개되지는 않았다 |
| 1980년대 | IBM의 SGML 기반 문서 (BookMaster 등), **DocBook** | 내용과 표현을 분리하고 구조화된 마크업으로 쓴다 |
| 1990 | **Minimalism** — John Carroll, *The Nurnberg Funnel* | 학습 연구에 근거해, 긴 매뉴얼 대신 짧은 과업 중심 조각으로 쓰고 사용자가 바로 해 보게 한다 |
| 2004~2005 | **DITA** — IBM이 OASIS에 기증(2004.03), 1.0 승인(2005.04) | concept / task / reference 토픽 유형, 단일 소스 재사용. Horn과 Carroll의 이론 위에 섰다 |
| 2010 | **Read the Docs** (Eric Holscher 등) | 오픈소스 문서를 자동으로 빌드하고 호스팅한다 |
| 2013 | **Write the Docs** 커뮤니티 (포틀랜드 첫 컨퍼런스) | 문서 작성자 커뮤니티가 생겼고, **Docs as Code**(문서를 Git·이슈 트래커·CI로 관리)가 퍼졌다 |
| 2017~ | **Diátaxis** (Daniele Procida, 처음 이름은 Divio Documentation System) | 독자의 필요 2축(행동/인지 × 학습/적용)으로 4유형을 나눈다 |

### 3. 현재 상태

- 대형 오픈소스와 기업 문서의 기본 관행은 Docs as Code(Markdown + 정적 사이트 생성기 + Git)다. 문서 구조 설계에는 Diátaxis가 사실상 표준 참조처럼 쓰인다.
- XML 기반 DITA는 매뉴얼 규모가 크고 재사용이 중요한 산업 분야(제조, 의료기기 등)에서 계속 쓰인다.
- 최근에는 LLM이 문서를 읽고 답하는 경우가 늘었다. 그래서 유형이 명확하게 나뉜 문서가 검색·인용에 유리하다는 논의가 나온다.

## 관련 문서

- [Diátaxis 문서화 프레임워크](./0010-diataxis-documentation-framework.md)

## 참고 자료

- [Minimalism (technical communication) — Wikipedia](https://en.wikipedia.org/wiki/Minimalism_(technical_communication))
- [History of DITA — dita-lang.org](https://dita-lang.org/history)
- [History of DITA — Oxygen XML](https://www.oxygenxml.com/dita/styleguide/Authoring_Concepts/c_The_History_of_DITA.html)
- [Echoes from the past: DITA, help, single sourcing — I'd Rather Be Writing](https://idratherbewriting.com/2008/08/04/echoes-from-the-past-dita-help-single-sourcing-tools-looking-from-the-60s-to-today/)
- [Write the Docs — Origin Story](https://writethedocs-www.readthedocs.io/origin-story/)
- [Read the Docs — Wikipedia](https://en.wikipedia.org/wiki/Read_the_Docs)
- [Docs as Code — Write the Docs](https://www-zh.readthedocs.io/en/latest/guide/docs-as-code/)
- [Diátaxis — Colophon](https://www.diataxis.fr/colophon/)
