# Git이 인식하는 설정 파일 목록

## 쉬운 설명

Git은 여러 개의 "규칙 쪽지"를 참고해서 동작해요. 어떤 쪽지는 "이 파일은 못 본 척해줘"(`.gitignore`), 어떤 쪽지는 "이 파일은 이렇게 다뤄줘"(`.gitattributes`), 어떤 쪽지는 "이 사람 이름은 이렇게 통일해줘"(`.mailmap`)라고 적혀 있죠. 팀 전체가 같이 보는 쪽지도 있고, 나만 보는 개인 메모 같은 쪽지도 있어요.

## 일반 설명

Git이 인식하는 설정/메타데이터 파일은 크게 **동작 설정(config)**, **파일 취급 규칙(ignore/attributes)**, **부가 메타데이터(submodule/mailmap)** 세 그룹으로 나뉩니다.

### 1. 설정(config) 계층 — `git config`

Git 자체 동작(사용자 정보, alias, 원격 저장소 등)을 정의하며 우선순위는 아래에서 위로 갈수록 높습니다.

| 파일 | 범위 | 우선순위 |
|---|---|---|
| `/etc/gitconfig` | 시스템 전체 | 최하위 |
| `~/.gitconfig` (또는 `~/.config/git/config`) | 사용자 전역 | 중간 |
| `.git/config` | 저장소 로컬 | 최상위 |
| `--worktree` 옵션 사용 시 `.git/worktrees/<id>/config.worktree` | worktree별 | 로컬보다 더 위 |

동일 키가 여러 단계에 있으면 더 좁은 범위(로컬)가 이깁니다.

### 2. 파일 취급 규칙

- **`.gitignore`**: 버전 관리에서 제외할 패턴을 정의. 저장소에 커밋되어 팀과 공유됨. 반면 나만 무시하고 싶은 패턴은 커밋되지 않는 `$GIT_DIR/info/exclude`에 적음. 전역 무시 패턴은 `core.excludesfile`로 지정한 파일(관례상 `~/.gitignore_global`)에서 관리.
- **`.gitattributes`**: 경로별 속성 지정. 줄바꿈 정규화(`text=auto`), diff/merge 드라이버, Git LFS 필터(`filter=lfs`), GitHub Linguist 언어 감지 오버라이드(`linguist-*`) 등을 설정. 적용 우선순위는 `$GIT_DIR/info/attributes` > 하위 디렉터리의 `.gitattributes` > 상위 디렉터리 순.
- **`.git-blame-ignore-revs`**: 포맷팅 전용 커밋처럼 `git blame` 결과를 왜곡시키는 커밋 해시를 나열해 blame에서 제외(`git blame --ignore-revs-file`로 사용, GitHub도 자동 인식).
- **`.lfsconfig`**: Git LFS(대용량 파일 저장소) 관련 설정(서버 URL 등)을 저장소 루트에서 오버라이드.

### 3. 메타데이터

- **`.gitmodules`**: 서브모듈 목록과 경로/URL을 기록. 문법은 `git-config`과 동일한 INI 스타일.
- **`.mailmap`**: 여러 이메일/이름으로 커밋한 동일 인물을 하나의 정식 이름·이메일로 매핑(`git shortlog`, `git log --use-mailmap` 등에서 반영).

### 참고: Git 고유 파일은 아니지만 함께 쓰이는 파일

- **`.editorconfig`**: Git이 직접 읽는 파일이 아니라 에디터/IDE가 읽는 표준. 들여쓰기 스타일, 줄바꿈, 인코딩 등을 팀 전체 에디터에서 통일하는 용도로, `.gitattributes`(Git 자체 동작)와 역할을 보완함.

---

Sources:
- [Git - gitignore Documentation](https://git-scm.com/docs/gitignore)
- [Git - git-config Documentation](https://git-scm.com/docs/git-config)
- [Git - gitattributes Documentation](https://git-scm.com/docs/gitattributes)
- [Git - gitmodules Documentation](https://git-scm.com/docs/gitmodules)
- [Git - gitmailmap Documentation](https://git-scm.com/docs/gitmailmap/2.31.0.html)
- [Git's Magic Files | Andrew Nesbitt](https://nesbitt.io/2026/02/05/git-magic-files.html)
