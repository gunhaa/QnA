# Claude Code의 `/compact`는 정확히 뭘 하는 걸까?

## 5살한테 설명하듯

계속 놀다 보면 장난감 상자(대화 기록, 컨텍스트 윈도우)가 꽉 차서 더 이상 새 장난감을 못 넣게 돼요. `/compact`는 그동안 가지고 놀던 장난감들을 사진 한 장(요약본)으로 찍어서 치우고, 그 사진만 상자에 남겨두는 거예요. 대신 지금 하던 놀이(작업 상태, 파일 내용)는 그대로 이어갈 수 있어요.

## 실제 동작 방식

1. **요약 대상**: 지금까지의 대화 전체(사용자 요청, Claude의 답변, 도구 호출 결과 등)를 가져와서, **요약 전용 패스(summarization pass)**를 한 번 돌려요.
2. **교체**: 그 요약본이 기존의 긴 대화 turn들을 **대체**해요. 이전 대화는 사라지는 게 아니라, "압축된 형태"로 컨텍스트에 남아요.
3. **이어가기**: 같은 작업, 같은 파일 상태를 유지한 채로 대화가 이어지는데, 토큰 수만 훨씬 줄어든 상태로 계속돼요.
4. **오래된 것부터 버리기**: 컨텍스트 한도에 가까워지면 Claude Code는 먼저 **가장 오래된 도구 실행 결과(tool output)**부터 버리고, 그다음에 대화 자체를 요약하는 순서로 처리해요. 사용자의 원래 요청이나 핵심 코드 스니펫은 우선적으로 보존하려고 해요.

## 자동 압축(Auto-compact)

기본적으로 컨텍스트 윈도우의 **약 95%**에 도달하면 자동으로 압축이 트리거돼요. 예를 들어 Sonnet의 200K 토큰 기준이면 약 190K 토큰 지점, 대략 10~15시간 정도의 집중 작업 분량이에요. Claude Code 2.0.64 버전(2026년 초)부터는 압축 속도가 거의 즉각적으로 개선됐고, 수동 `/compact` 명령과 API 옵션으로도 세밀하게 제어할 수 있게 됐어요.

## `/compact [지시문]` — 커스텀 지시 붙이기

`/compact` 뒤에 원하는 지시문을 붙일 수 있어요. 예: `/compact API 변경 사항 위주로 정리해줘`. 이 텍스트는 그대로 요약을 담당하는 모델에게 전달돼서, "무엇을 남기고 무엇을 버릴지"를 조정할 수 있어요. 단, 이 지시문은 Claude Code의 기본 요약 프롬프트를 완전히 대체하는 게 아니라 **보충하는 방식**으로 붙어요.

일부 최신 버전에서는 `Esc + Esc` 또는 `/rewind`로 특정 시점을 선택해서 "여기서부터 요약" 또는 "여기까지 요약"처럼 **부분 압축**도 가능해요.

## CLAUDE.md로 압축 동작을 커스터마이징하기

`CLAUDE.md`에 "압축할 때 수정된 파일 목록과 테스트 명령어는 항상 보존해줘" 같은 지시를 적어두면, 매번 `/compact`에 지시문을 안 붙여도 **압축 시 항상 지켜지는 규칙**으로 반영할 수 있어요.

## 한 줄 요약

`/compact`는 대화를 지우는 게 아니라 "압축해서 계속 이어갈 수 있게 만드는" 기능이에요. 컨텍스트 윈도우가 한계에 도달하기 전에 자동으로도 실행되고, 수동으로 원하는 시점에 원하는 지시와 함께 실행할 수도 있어요.

---

### Sources
- [Compaction - Claude Platform Docs](https://platform.claude.com/docs/en/build-with-claude/compaction)
- [What Is Auto Compact in Claude Code - CometAPI](https://www.cometapi.com/what-is-auto-compact-in-claude-code/)
- [Claude Code Context Compaction: How Auto-Compact Works (2026)](https://claude-code-examples.vercel.app/claude-code-context-compaction/)
- [Claude Code Compaction and Long-Session Operations Guide](https://hidekazu-konishi.com/entry/claude_code_compaction_and_long_session_guide.html)
- [Claude Code Ultimate Hack: /compact "instructions"](https://tylerbliss.substack.com/p/claude-code-compact-compression)
- [Context Compaction Research: Claude Code, Codex CLI, OpenCode, Amp (GitHub Gist)](https://gist.github.com/badlogic/cd2ef65b0697c4dbe2d13fbecb0a0a5f)
