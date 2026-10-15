# Git에서 커밋 X부터 Y까지의 diff 보기

## 쉬운 설명

사진 두 장을 나란히 놓고 "**처음 사진과 마지막 사진 사이에 뭐가 바뀌었지?**"를 보는 것과 같습니다. 중간 사진을 한 장씩 볼 수도 있고, 처음과 끝만 비교해서 한 번에 볼 수도 있습니다.

## 일반 설명

### 1. 기본: 두 커밋 사이의 누적 diff

```bash
git diff X Y          # X 시점 → Y 시점 사이 전체 변경 (한 덩어리)
git diff X..Y         # 위와 완전히 동일 (diff에서 ..는 공백과 같은 의미)
```

- `git diff`는 **범위(range)를 보는 것이 아니라 두 끝점(endpoint)의 스냅샷을 비교**합니다. 중간에 커밋이 몇 개 있든 X 시점과 Y 시점의 트리 차이만 보여 줍니다.
- 중간 커밋에서 추가했다가 나중에 되돌린 내용은 결과에 나타나지 않습니다.

### 2. X 커밋 자신의 변경까지 포함하려면

`git diff X Y`는 **X 이후**의 변경만 보여 줍니다. X 커밋에서 바뀐 내용까지 보려면 X의 부모 커밋부터 비교합니다.

```bash
git diff X^ Y         # X의 부모 → Y (X 커밋의 변경 포함)
git diff X~1 Y        # 위와 동일
```

### 3. 커밋별로 나눠서 보기: `git log -p`

```bash
git log -p X..Y               # X 이후 ~ Y까지 각 커밋의 diff를 하나씩 출력
git log -p X^..Y              # X 커밋 포함
git log -p --reverse X..Y     # 오래된 커밋부터 순서대로
```

- `git log`에서 `X..Y`는 "**Y에서 도달할 수 있지만 X에서는 도달할 수 없는 커밋들**"이라는 범위를 뜻합니다.

### 4. 두 점(`..`) vs 세 점(`...`): diff와 log에서 의미가 다름

| 표기 | `git diff`에서 | `git log`에서 |
|---|---|---|
| `A..B` | A와 B를 직접 비교 (`git diff A B`와 같음) | B에는 있고 A에는 없는 커밋 |
| `A...B` | **merge-base(A,B)** → B 비교. 즉 B 쪽 브랜치에서만 생긴 변경 | A와 B 중 **한쪽에만 있는** 커밋 (symmetric difference) |

```bash
git diff main...feature   # feature 브랜치가 분기 이후 한 작업만 보기 (PR diff와 같은 관점)
```

GitHub PR의 "Files changed" 화면도 기본적으로 세 점(merge-base) 방식으로 비교합니다.

### 5. 자주 쓰는 옵션

```bash
git diff X Y --stat              # 파일별 변경량 요약
git diff X Y --name-only         # 바뀐 파일 이름만
git diff X Y --name-status       # 파일 이름 + 상태(A/M/D/R)
git diff X Y -- src/api/         # 특정 경로만
git diff X Y -w                  # 공백 변경 무시
git diff X Y --word-diff         # 단어 단위 diff
git range-diff A..B C..D         # 리베이스 전후처럼 "커밋 시리즈"끼리 비교
```

X와 Y에는 커밋 해시뿐 아니라 브랜치 이름, 태그, `HEAD~3`, `@{yesterday}` 같은 표현도 쓸 수 있습니다.

### 참고 자료

- [git-diff 문서: 두 점/세 점 표기 설명](https://www.git.lorimer.id.au/gitweb.git/blob/2b9232cc23a86f650cc1b93a35cce6ad59a8d782:/Documentation/git-diff.txt)
- [Two and three dots in difference specs (SciPy gitwash)](https://docs.scipy.org/doc/scipy/dev/gitwash/dot2_dot3.html)
- [GitHub docs issue – two-dot vs three-dot](https://github.com/github/docs/issues/32224)
- [Git mailing list – name for A..B ranges](https://lore.kernel.org/all/578E4F4A.2020708@gmail.com/T/)
