# Claude Code는 입력을 기다리는 동안(idle) 뭘 하고 있을까?

## 5살 아이에게 설명하면

편의점 알바생을 생각해보자. 손님이 없을 때 알바생은 계속 문 앞을 뛰어다니며 "손님 있나요? 있나요? 있나요?" 하고 확인하지 않는다. 그냥 **카운터에 가만히 서서 문에서 종소리(입력)가 울리길 기다린다.** Claude Code도 똑같다 — 아무것도 안 입력하고 있을 땐, 터미널의 **표준 입력(stdin)** 이라는 문 앞에서 **가만히 멈춰서(blocking I/O)** 종소리가 울리기만 기다린다. 이게 CPU도 안 먹고 네트워크도 안 쓰는 이유다.

## 확인된 사실

- **평소 idle 상태 = stdin 대기(blocking I/O)**: 터미널에서 사용자가 뭔가 타이핑하기 전까지, Claude Code는 별도로 서버에 "혹시 새 메시지 있어요?" 하고 계속 물어보는(polling) 동작을 하지 않는다. 공식 문서·아키텍처 분석 글 어디에도 idle 중 주기적 API 호출은 언급되지 않는다.
- **MCP 서버 연결은 유지하되, 도구를 안 부르면 아무 일도 안 함**: Figma/Linear/Notion 같은 MCP 서버를 설정해뒀다면, 세션 동안 그 서버와의 연결 자체는 유지된다. 하지만 실제로 도구(tool)를 호출하지 않는 한 데이터를 주고받지 않는다. 다만 **입출력이 5분(stdio 서버는 30분) 이상 없으면 자동으로 연결이 끊긴다.**
- **내부는 polling이 아니라 이벤트 기반(event-driven)**: 자바스크립트의 **async generator**(비동기 생성기)로 이벤트 루프를 돌린다. "몇 초마다 한 번씩 확인"하는 방식이 아니라, 도구 호출 결과·MCP 신호·사용자 입력 같은 "사건(event)"이 실제로 발생했을 때만 반응해서 처리하는 구조다.
- **터미널 화면은 React + Ink**: 터미널 UI 자체는 React(웹 프론트엔드에서 쓰는 그 라이브러리)를 터미널용으로 포팅한 Ink로 그려진다. 화면이 바뀔 때만 다시 그리지, 계속 리렌더링하지 않는다.

## 참고: CPU를 많이 먹는다면 그건 버그

idle 상태에서 CPU 사용률이 50~100%까지 치솟는다는 보고가 GitHub 이슈에 있는데, 이건 정상 동작이 아니라 **메모리 할당/해제를 계속 반복하는 버그(allocation thrashing)** 로 지목되고 있다. 세션 캐시(`~/.claude/projects/`)가 비대해지면 증상이 심해진다고 한다. 즉 "가만히 있어야 할 때 CPU가 계속 돈다"면 설계된 동작이 아니라 버그일 가능성이 높다.

## 정리

질문의 감(network I/O를 하고 있는 것 같지 않다)이 맞다. Claude Code는 idle일 때 **네트워크도, 반복 polling도 하지 않고 그냥 stdin에서 블로킹된 채 기다린다.** 내부 구조 자체가 "주기적으로 확인"이 아니라 "사건이 오면 반응"하는 이벤트 기반이라, 아무 입력도 없으면 정말 아무 일도 안 일어나는 게 정상이다.

---
### Sources
- [Claude Code 아키텍처 심층 분석 (Zain Hasan Blog)](https://zainhas.github.io/blog/2026/inside-claude-code-architecture/)
- [Claude Code — How It Works (공식 문서)](https://code.claude.com/docs/en/how-claude-code-works.md)
- [GitHub Issue #30807: High CPU usage at idle](https://github.com/anthropics/claude-code/issues/30807)
- [GitHub Issue #36308: MCP servers auto-reconnect](https://github.com/anthropics/claude-code/issues/36308)
