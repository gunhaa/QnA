# CODEOWNERS란?

## 쉬운 설명

학교 교실마다 **담당 선생님 이름표**를 붙여 두는 것과 같습니다. 누가 과학실 물건을 바꾸려고 하면 과학 선생님이 자동으로 불려 와서 "괜찮아요"라고 허락해야 바꿀 수 있습니다.

## 일반 설명

### 1. 정의

- `CODEOWNERS`는 **저장소의 경로(파일/디렉터리)와 책임자(사용자/팀)를 연결해 두는 텍스트 파일**입니다.
- **Git 자체 기능이 아닙니다.** GitHub, GitLab, Bitbucket, JetBrains Space 같은 **호스팅 플랫폼**이 이 파일을 읽어서 PR(MR)이 올라오면 다음 두 가지를 처리합니다.
  1. 변경된 파일의 owner를 **리뷰어로 자동 지정**합니다.
  2. 브랜치 보호 규칙을 켜 두면, owner가 **승인해야만 merge할 수 있게** 강제합니다.

### 2. 파일 위치 (GitHub)

GitHub는 아래 순서로 찾고, **처음 발견한 파일 하나만** 사용합니다.

1. `.github/CODEOWNERS`
2. 저장소 루트 `/CODEOWNERS`
3. `docs/CODEOWNERS`

이 파일은 **PR의 base 브랜치**에 있어야 적용됩니다.

### 3. 문법

```
# 주석
# 패턴                 owner들 (@user, @org/team, email)
*                      @org/platform-team          # 기본 owner (맨 위에 둠)
*.js                   @org/frontend
/docs/                 @alice @bob
/src/payment/          @org/payment-team
/src/payment/legacy/                                # owner 없음 → 이 경로는 owner 지정 해제
```

- 패턴은 **`.gitignore` 문법과 거의 같습니다.** 단, `!`(부정), `[ ]`(문자 범위), `\#` 이스케이프는 GitHub에서 지원하지 않습니다.
- **마지막에 매칭된 줄이 이깁니다(last match wins).** 한 파일에 여러 패턴이 맞으면, 가장 아래에 있는 줄의 owner만 적용됩니다. 그래서 넓은 규칙은 위에, 구체적인 규칙은 아래에 둡니다.
- 경로는 **대소문자를 구분합니다.**
- 문법이 잘못된 줄은 **조용히 무시됩니다.** GitHub UI에서 CODEOWNERS 파일을 열면 오류가 표시됩니다.
- owner로 지정한 사용자나 팀은 저장소에 **write 권한이 명시적으로 있어야** 유효합니다.

### 4. merge를 막으려면 별도 설정이 필요

CODEOWNERS 파일만 있으면 **리뷰 요청만 자동으로 보내고, merge는 막지 않습니다.** 강제하려면 다음 두 가지를 켜야 합니다.

- Branch protection rule 또는 **Ruleset**
  - **Require a pull request before merging**
  - **Require review from Code Owners**

이렇게 설정하면, 변경된 파일마다 해당 owner 중 **최소 1명**이 승인해야 merge 버튼이 활성화됩니다.

### 5. GitLab과의 차이

| 항목 | GitHub | GitLab (Premium 이상) |
|---|---|---|
| 섹션 | 없음 | `[Section]` 헤더로 영역을 묶어 관리 |
| 필요 승인 수 | owner 1명 승인 | `[Backend][2]`처럼 섹션별로 승인 수 지정 가능 |
| 선택 섹션 | 없음 | `^[Docs]`: 리뷰 요청은 하지만 승인은 필수 아님 |
| 기본 owner | `*` 패턴 | 섹션 헤더 뒤에 owner를 지정하면 섹션 기본값이 됨 |
| 강제 방식 | Branch protection/Ruleset | Protected branch의 "Code owner approval" |

```
[Backend][2] @backend-team
/src/api/
/src/domain/

^[Docs] @tech-writers
/docs/
```

### 6. 실무 팁과 주의점

- **CODEOWNERS 파일 자체에도 owner를 지정합니다.** 예: `/.github/CODEOWNERS @org/platform-leads`. 그렇지 않으면 누구나 자기를 owner로 추가해서 승인을 우회할 수 있습니다.
- 개인보다 **팀(`@org/team`)으로 지정**하는 것이 좋습니다. 퇴사나 휴가 때문에 리뷰가 막히는 것을 피할 수 있습니다.
- 모노레포에서는 서비스 디렉터리별로 owner를 나누어 **소유권 경계를 코드로 문서화**하는 효과가 있습니다. DDD의 bounded context별 팀 구조와도 잘 맞습니다.
- owner가 너무 넓게 잡히면 리뷰 병목이 생깁니다. `*`를 한 팀에 몰아주지 않도록 주의합니다.
- 검증 도구로 `mszostok/codeowners-validator`나 GitHub의 오류 표시 기능을 CI에 붙여 깨진 패턴이나 존재하지 않는 팀을 잡아낼 수 있습니다.

### 참고 자료

- [GitHub Docs – About code owners](https://docs.github.com/en/enterprise-server@3.20/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [GitLab Docs – Code Owners syntax](https://docs.gitlab.com/user/project/codeowners/reference)
- [OpenReplay – Automatic code reviews with CODEOWNERS](https://blog.openreplay.com/automatic-code-reviews-codeowners/)
- [CODEOWNERS + branch protection](https://www.resumelens.org/blog/github/github-codeowners-branch-protection)
- [KodeKloud – Code Review With a CODEOWNERS File](https://notes.kodekloud.com/docs/GitHub-Foundations-Certification/Pull-Requests/Code-Review-With-a-Codeowners-File/page)
- [JetBrains SpaceCode – Code owners](https://www.jetbrains.com/help/space-code/code-owners.html)
