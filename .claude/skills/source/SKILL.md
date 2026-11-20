---
name: source
description: 논문·에세이·책·발표 같은 저작물 자체를 장 구조로 정독·분석한 문서 묶음을 source/ 아래에 만든다. 사용자가 /source를 부르거나 원전 분석을 요청할 때만 쓴다. 답변 중에 논문을 인용만 하는 경우에는 쓰지 않는다.
argument-hint: <저작물>
---

# 원전 분석 만들기

저작물: $ARGUMENTS

시작하기 전에 [`CLAUDE.md`](../../../CLAUDE.md)의 문서 공통 규칙(요약 섹션, frontmatter)과 [`ARCHITECTURE.md`](../../../ARCHITECTURE.md)의 폴더·번호 규칙을 읽고 따른다. 웹 검색으로 최신 정보를 확인한 뒤 쓴다.

특정 저작물(논문·에세이·책·발표) **자체**를 정독·분석해 `source/<대주제>/<ID>-<제목>-<저자성>-<연도>/`에 둔다 (예: `source/distributed-systems/0001-the-log-kreps-2013/`).

- 구성: `01-overview.md`(원전 정보·쓰인 맥락·읽는 법) → `02-`부터 장·절 순서의 분석 → 마지막에 비판·현재 관점.
- frontmatter에 두 필드를 더한다. 이 두 필드는 source 문서에만 쓴다.
  ```yaml
  ---
  type: source
  created: 2026-09-15
  author: agent
  model: claude-opus-5
  source: "Jay Kreps, The Log: What every software engineer should know about real-time data's unifying abstraction (2013)"
  linked:            # 저장소 루트 기준 경로
    - inquiry/distributed-systems/0002-kafka-overview.md
    - inquiry/distributed-systems/0009-high-availability-replication-vs-cluster-and-patterns.md
  ---
  ```
  - `source`: 원전의 서지 정보(저자, 제목, 연도).
  - `linked`: 저장소 안의 연관 문서. **관계는 원전 쪽에만 기록한다** — 다른 문서는 원전을 링크하지 않는다. 저작물 전체의 `linked`는 `01-overview.md`에 두고, 장별 문서는 특정 장과 강하게 연결될 때만 자체 `linked`를 둔다.
  - GitHub에서 frontmatter 경로는 클릭되지 않으므로, `01-overview.md` 본문 끝 `## 관련 문서`에 같은 목록을 링크로 옮겨 적는다 (frontmatter가 기준).
- 원전 목록: 루트 `README.md`의 `## 원전 목록`에 "원전 → 위치 → linked 문서" 표를 둔다. 원전을 추가하거나 `linked`를 바꾸면 함께 갱신한다.
