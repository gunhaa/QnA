# Claude Code 플러그인과 사내 마켓플레이스 배포

## 쉬운 설명

플러그인은 **도구 상자**야. 안에 망치(스킬), 조수(에이전트), 알람(훅), 전화기(MCP)를 한꺼번에 넣어둬. 마켓플레이스는 **도구 상자 목록표**고, 목록표를 회사 창고(git 저장소)에 두면 직원들이 "이 창고 등록할게요" 한 번 하고 필요한 상자를 꺼내 쓰면 돼.

## 일반 설명

### 1. 플러그인이란

스킬·에이전트·훅·MCP 서버 등을 **하나의 단위로 묶어 설치/로드**하는 디렉터리.

```
my-plugin/
├── .claude-plugin/plugin.json   # 매니페스트 (name, version, description)
├── skills/review/SKILL.md       # /my-plugin:review 로 실행
├── agents/reviewer.md           # 서브에이전트
├── hooks/hooks.json             # 라이프사이클 훅
└── .mcp.json                    # MCP 서버
```

- 스킬은 `플러그인명:스킬명` 네임스페이스로 호출된다.
- 활성화된 플러그인의 스킬/에이전트 name·description은 **매 턴 컨텍스트에 상주**한다 (토큰 소모). 본문은 사용 시에만 로드.
- 플러그인이 실행하는 코드는 **사용자 권한**으로 돈다 → 사내 배포 시 리뷰 필수.
- 단독 스킬(`~/.claude/skills/`)로 충분하면 플러그인이 필요 없다. 여러 구성요소를 묶어 팀에 배포·버전 관리할 때 플러그인을 쓴다.

### 2. 사내 플러그인 배포 = 마켓플레이스 저장소 + 설치 안내

**결론: 맞다. 저장소 위치(registry)와 등록/설치 방법을 공유하면 된다.** 마켓플레이스는 "호스팅되는 스토어"가 아니라 `.claude-plugin/marketplace.json` 카탈로그 파일이 있는 git 저장소(또는 디렉터리/URL)다.

```
company-plugins/                     # 사내 git 저장소
├── .claude-plugin/marketplace.json  # 카탈로그
└── plugins/
    └── code-formatter/
        ├── .claude-plugin/plugin.json
        └── skills/...
```

`marketplace.json` 최소 예시 (`name`, `owner`, `plugins` 필수):

```json
{
  "name": "company-tools",
  "owner": { "name": "Platform Team" },
  "plugins": [
    {
      "name": "code-formatter",
      "source": "./plugins/code-formatter",
      "description": "사내 포맷터 스킬"
    }
  ]
}
```

- `source`: 상대 경로, `github`, `git-subdir`(모노레포), `url`(임의 git), `archive`(zip), `npm` 등.
- 항목 `name`과 `plugin.json`의 `name`은 **동일하게** 유지.
- 배포 전 `claude plugin validate ./company-plugins`로 검증.

### 3. 호스팅 위치별 사용자 등록 명령

| 호스트 | 사용자 명령 |
|---|---|
| GitHub | `/plugin marketplace add your-org/company-plugins` |
| GitLab/Bitbucket/GHES/사내 git | `/plugin marketplace add https://gitlab.example.com/team/plugins.git` (`owner/repo` 축약은 항상 github.com) |
| `marketplace.json` URL | `/plugin marketplace add https://plugins.example.com/marketplace.json` (상대경로 source 불가) |
| 공유 디렉터리 | `/plugin marketplace add /Volumes/shared/claude-plugins` |

설치: `/plugin install code-formatter@company-tools` (셸에서는 `claude plugin install ...`). 브랜치/태그 고정은 `#<ref>` 접미사 (예: `...#stable`).

### 4. 비공개 저장소 접근

- Claude Code는 **자체 git 토큰이 없다**. 사용자 머신의 git 자격증명(SSH 키 / credential helper)을 프롬프트 없이 사용.
- SSH: 패스프레이즈 없이 쓸 수 있어야 하고(ssh-agent), 호스트가 `known_hosts`에 있어야 함.
- HTTPS: 저장된 자격증명만 동작. GitHub은 `gh auth login` → `gh auth setup-git`.
- git 계정이 없는 사용자: `archive` 소스(HTTPS zip, `sha256` 고정 + `headers`/`headersHelper` 인증), 공유 디렉터리, 또는 seed 디렉터리(`CLAUDE_CODE_PLUGIN_SEED_DIR`) 사용.
- CI: `GH_TOKEN` 설정 후 `gh auth setup-git`.
- Team/Enterprise 플랜이면 claude.ai **Organization settings > Plugins & skills**로 배포 가능 (사용자 git 자격증명 불필요, 저장소는 private/internal이어야 함).

### 5. "안내 공유" 없이 자동화하는 방법

**(a) 저장소 단위** — 프로젝트 `.claude/settings.json`에 커밋:

```json
{
  "extraKnownMarketplaces": {
    "company-tools": {
      "source": { "source": "github", "repo": "your-org/company-plugins" }
    }
  },
  "enabledPlugins": { "code-formatter@company-tools": true }
}
```

팀원이 폴더 trust를 수락하면 마켓플레이스가 등록된다. 단 외부 소스(별도 저장소) 플러그인은 `claude plugin install <name>@<marketplace> --scope project`를 한 번 실행해야 한다.

**(b) 조직 전체(관리자)** — managed settings(서버 관리 설정 / MDM / `managed-settings.json`)에 같은 키 지정. 사용자가 비활성화할 수 없고 `autoUpdate`도 강제 가능.

**(c) 제한** — `strictKnownMarketplaces`(허용 목록), `blockedMarketplaces`, `disableSideloadFlags`로 사내 마켓플레이스 외 설치 차단.

### 6. 버전/업데이트

- 자동 업데이트는 기본 **꺼져 있음**. 사용자가 `/plugin` > Marketplaces에서 켜거나, 관리자가 `autoUpdate: true` 지정.
- 수동: `/plugin marketplace update <name>` 또는 `claude plugin update <plugin>@<name>`.
- `version`은 **올리거나 아예 생략**해야 한다. 같은 `version`으로 커밋만 푸시하면 사용자는 캐시본을 계속 쓴다. `plugin.json`과 마켓플레이스 항목 양쪽에 동시에 쓰지 말 것.
- 이름 변경은 `renames` 맵, 제거는 `null` 매핑 (+`forceRemoveDeletedPlugins`).
- 안정/실험 채널은 `ref`가 다른 마켓플레이스 2개로 분리.
- Git LFS 파일은 clone 시 포인터만 받으므로 사용 금지.

### 7. 개발·테스트

- 마켓플레이스 없이 로컬 로드: `claude --plugin-dir ./my-plugin`
- 로컬 마켓플레이스: `claude plugin marketplace add ./my-marketplace` → 수정 후 `/reload-plugins`
- 확인: `claude plugin list`, `claude plugin details <name>`

### 8. 체크리스트 (사내 배포용)

1. 사내 git 저장소 생성 + `marketplace.json` + 플러그인 디렉터리
2. `claude plugin validate`로 검증, 로컬에서 설치 테스트
3. 접근 권한 부여(저장소 read 권한 + 사용자 git 자격증명 안내)
4. 안내 문서에 **저장소 위치, `marketplace add` 명령, `install` 명령, 인증 방법** 기재
5. 가능하면 `.claude/settings.json` 또는 managed settings로 자동 등록
6. `version` 정책과 업데이트 방법 공지

Sources:
- [Plugins overview](https://code.claude.com/docs/en/plugins)
- [Create a marketplace](https://code.claude.com/docs/en/plugin-marketplaces)
- [Host and maintain a marketplace](https://code.claude.com/docs/en/plugins/host-marketplace)
- [Manage plugins for your organization](https://code.claude.com/docs/en/plugins/org)
