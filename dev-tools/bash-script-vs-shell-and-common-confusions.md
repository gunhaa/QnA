# bash 스크립트란 무엇이고, 평소 쓰는 터미널 쉘과 뭐가 다를까?

## 결론부터

**"터미널에서 명령어를 치는 것"과 "bash 스크립트를 실행하는 것"은 같은 bash 프로그램을 쓰지만 완전히 다른 모드로 동작해요.** 평소 터미널은 사람과 대화하려고 이것저것 편의 기능(자동완성, 프롬프트, 히스토리)을 켜둔 **대화형(interactive) 셸**이고, 스크립트를 실행할 때는 그런 편의 기능을 다 끄고 명령어만 순서대로 처리하는 **비대화형(non-interactive) 셸**이에요. 이 둘이 **설정 파일을 읽는 방식이 다르다**는 걸 모르고 넘어가면, "터미널에서는 되는데 스크립트로 실행하면 안 돼요" 같은 문제의 8할이 여기서 시작돼요.

## 다섯 살에게 설명하듯

같은 사람(bash)이 **두 가지 다른 상황**에 있다고 생각해 보세요.

- **터미널에서 직접 타이핑할 때** = 이 사람이 **친구와 수다 떠는 상황**이에요. 농담(자동완성)도 하고, 이전에 한 말(히스토리)도 기억하고, 예쁘게 꾸민 말투(프롬프트)로 대답해요. 이걸 위해서 미리 "대화 준비물 목록"(`~/.bashrc`, `~/.bash_profile`)을 꺼내 읽어요.
- **스크립트(`.sh` 파일)를 실행할 때** = 이 사람이 **혼자 조용히 할 일 목록을 순서대로 처리하는 상황**이에요. 농담도 안 하고 꾸밀 필요도 없으니, **아까 꺼냈던 "대화 준비물 목록"을 아예 안 꺼내요.** 그래서 터미널에서 잘 되던 별명(alias)이나 함수가 스크립트 안에서는 "그런 거 몰라요" 하고 없는 셈 쳐지는 일이 생겨요.

그리고 스크립트 맨 위에 적는 `#!/bin/bash` 같은 줄은 **"이 할 일 목록은 반드시 bash라는 사람한테 시켜주세요"라고 적어둔 메모(shebang)**예요. 이 메모가 없거나 다른 사람(`sh`, `dash`) 이름이 적혀 있으면, 전혀 다른 성격의 사람이 그 할 일 목록을 읽고 "어? 이 표현은 나 모르는데" 하며 다르게 행동하기도 해요.

---

## 1. "쉘(shell)"과 "터미널(terminal)"부터 구분하기

가장 먼저 헷갈리는 지점이에요.

- **터미널(terminal)**: 사용자가 글자를 입력하고 결과를 보는 **창(인터페이스)**일 뿐이에요. (예: Windows Terminal, iTerm, GNOME Terminal)
- **쉘(shell)**: 터미널 안에서 실제로 **명령어를 해석하고 실행하는 프로그램**이에요. (예: bash, zsh, dash, sh)
- **bash**: 여러 쉘 프로그램 중 하나예요. "Bourne Again SHell"의 줄임말로, 리눅스에서 가장 흔한 기본 쉘이에요.

즉 "터미널을 연다"는 "그릇을 준비한다"이고, "bash가 실행된다"는 "그 그릇 안에서 요리사(bash)가 주문을 받기 시작한다"는 거예요. 터미널 자체는 명령어를 이해 못 해요 — 다 안에서 돌아가는 쉘이 이해하는 거예요.

## 2. 대화형(interactive) vs 비대화형(non-interactive) — 가장 헷갈리는 부분

| | 대화형 (터미널에서 직접 입력) | 비대화형 (스크립트 실행) |
|---|---|---|
| 언제 발생하나 | 터미널 열고 프롬프트에서 직접 타이핑할 때 | `./script.sh` 나 `bash script.sh`로 파일을 실행할 때 |
| 프롬프트(`$`) | 표시됨 | 표시 안 됨 |
| 자동완성·명령어 히스토리 | 켜져 있음 | 꺼져 있음 (기본적으로) |
| 읽는 설정 파일 | `~/.bashrc` 등 | **기본적으로 아무 설정 파일도 안 읽음** |

**여기서 가장 자주 나오는 착각**: "터미널에서 잘 되던 alias나 함수, 환경변수인데 스크립트에서는 `command not found`가 뜬다"는 문제는, 거의 항상 **비대화형 셸이 `~/.bashrc`를 안 읽어서** 생기는 문제예요. 스크립트 안에서 그 설정을 쓰고 싶으면 `source ~/.bashrc`를 스크립트 안에 직접 적어줘야 해요.

## 3. 로그인(login) vs 비로그인(non-login) 셸 — 또 다른 축

이건 대화형/비대화형과는 **별개의 축**이라 더 헷갈려요.

- **로그인 셸**: SSH로 원격 접속하거나, 컴퓨터에 처음 로그인할 때 생기는 셸. `/etc/profile` → `~/.bash_profile`(없으면 `~/.bash_login` → `~/.profile` 순으로 하나만) 을 읽어요.
- **비로그인 셸**: 이미 로그인한 상태에서 터미널 창을 새로 하나 더 열 때 생기는 셸. `~/.bashrc`를 읽어요.

그래서 실무에서 흔히 쓰는 요령이, `~/.bash_profile` 안에 `~/.bashrc`를 불러오는 한 줄(`source ~/.bashrc`)을 넣어서 **두 경우 모두 같은 설정을 쓰게 만드는** 거예요. macOS 터미널 앱은 새 창을 열 때마다 기본적으로 로그인 셸처럼 동작해서 리눅스 서버와 습관이 다르다는 점도 종종 혼란을 줘요.

## 4. `#!/bin/bash` vs `#!/bin/sh` — 셔뱅(shebang)이 하는 일

- 스크립트 첫 줄의 `#!경로`를 **셔뱅**이라고 불러요. "이 파일을 어떤 프로그램으로 실행할지" 커널에게 알려주는 역할이에요.
- `bash script.sh`처럼 **직접 bash 명령어로 실행하면 셔뱅 줄은 아예 무시**돼요 — 셔뱅과 상관없이 무조건 bash가 실행해요.
- 반대로 `./script.sh`처럼 **실행 권한으로 직접 실행**하면, 커널이 셔뱅 줄을 읽고 거기 적힌 프로그램(`/bin/bash`, `/bin/sh` 등)에게 넘겨요.
- **문제는 `sh`가 늘 bash가 아니라는 점**이에요. 우분투·데비안 계열에서는 `/bin/sh`가 보통 **dash**(더 가볍고 POSIX 표준만 지키는 셸)를 가리키는 심볼릭 링크예요. `#!/bin/sh`라고 써놓고 정작 bash 전용 문법(`[[ ]]`, 배열, `local`, `function` 키워드 등 — 이런 것들을 **bashism**이라고 불러요)을 쓰면, 터미널(bash)에서 테스트할 땐 멀쩡하다가 실제 배포 환경(dash가 실행)에서 에러가 나는 사고가 나요.

## 5. 변수 스코프와 서브셸(subshell) — 파이프에서 특히 잘 낚이는 함정

파이프(`|`)나 `$(...)`, `(...)` 괄호는 **새로운 자식 프로세스(서브셸)**를 만들어요. 서브셸 안에서 바꾼 변수는 **부모 셸로 절대 전달되지 않아요.**

```bash
count=0
cat file.txt | while read -r line; do
  count=$((count + 1))   # 이 count는 서브셸 안의 count
done
echo "$count"   # 여전히 0! (파이프 오른쪽이 서브셸에서 돌기 때문)
```

이건 bash를 처음 쓰는 사람이 거의 반드시 한 번은 겪는 함정이에요. 해결하려면 `while read` 루프를 서브셸에 안 들어가게(`< file.txt`로 입력을 리다이렉트) 바꾸거나, `bash 4.2+`의 `lastpipe` 옵션을 쓰는 방법이 있어요.

## 6. 따옴표와 단어 분리(word splitting) — "왜 파일 이름에 공백 있으면 깨지지?"

bash는 기본적으로 **변수를 따옴표 없이 쓰면, 그 값 안의 공백을 기준으로 여러 단어로 쪼개버려요(word splitting).**

```bash
file="my document.txt"
rm $file      # rm이 "my"와 "document.txt" 두 개의 인자로 받음 → 의도와 다르게 동작하거나 에러
rm "$file"    # 항상 이렇게 큰따옴표로 감싸야 "my document.txt" 하나로 인식
```

**규칙은 단순해요: 변수를 쓸 땐 항상 큰따옴표로 감싼다(`"$var"`).** 예외적인 경우(일부러 단어를 쪼개고 싶을 때)를 빼면 이게 기본값이 되어야 해요.

## 7. `=` vs `-eq`, 그리고 초기화 안 된 변수

- 문자열 비교는 `=` (또는 `==`), 숫자 비교는 `-eq`/`-lt`/`-gt` 등을 써요. `[ "$a" -eq "$b" ]`에 문자열을 넣거나 `[ "$a" = "$b" ]`에 숫자 비교 의도로 쓰면 예상과 다른 결과가 나와요.
- **초기화 안 된 변수는 `0`이 아니라 "빈 문자열(null)"**이에요. `[ "$count" -eq 0 ]`처럼 숫자 비교를 했다가 변수가 아예 비어 있으면 `integer expression expected` 에러가 나는 게 이 때문이에요.

## 8. `set -e`가 "생각보다" 안전망이 안 되는 경우

스크립트 안전장치로 `set -e`(에러 나면 즉시 종료)를 많이 써요. 그런데 **파이프라인의 중간 명령이 실패해도 `set -e`가 못 잡는 경우**가 있어요 — 기본적으로 파이프 전체의 종료 코드는 **맨 마지막 명령의 종료 코드**만 보기 때문이에요.

```bash
set -e
grep "존재안하는패턴" file.txt | sort   # grep이 실패해도 sort는 성공 → 파이프 전체가 "성공"으로 처리됨
```

이걸 잡으려면 `set -o pipefail`을 같이 켜서 "파이프 안의 명령 중 하나라도 실패하면 전체를 실패로 친다"로 바꿔야 해요. 그래서 실무에서는 `set -euo pipefail`을 세트로 스크립트 맨 위에 넣는 관행이 흔해요(`-u`는 정의 안 된 변수를 쓰면 에러를 내는 옵션).

---

## 9. 요약 — 헷갈리는 부분 체크리스트

| 헷갈리는 지점 | 핵심 |
|---|---|
| 터미널 vs 쉘 | 터미널은 창, 쉘(bash)은 그 안에서 명령어를 해석하는 프로그램 |
| 대화형 vs 비대화형 | 비대화형(스크립트)은 기본적으로 `.bashrc`를 안 읽음 → alias/함수가 안 보임 |
| 로그인 vs 비로그인 | SSH 접속=로그인 셸(`.bash_profile`), 새 터미널 탭=비로그인 셸(`.bashrc`) |
| `#!/bin/bash` vs `#!/bin/sh` | `sh`는 리눅스에서 흔히 dash — bash 전용 문법(bashism) 쓰면 깨질 수 있음 |
| 서브셸 변수 스코프 | 파이프·`$()`·`()` 안에서 바꾼 변수는 바깥으로 안 나감 |
| 따옴표/단어 분리 | 변수는 항상 `"$var"`로 감싸기 — 안 그러면 공백에서 쪼개짐 |
| `=` vs `-eq` | 문자열 비교와 숫자 비교는 다른 연산자 |
| `set -e`의 한계 | 파이프 중간 실패는 안 잡음 → `set -o pipefail` 같이 써야 함 |

## 출처

- [What's the Difference Between bash script.sh and ./script.sh — Baeldung on Linux](https://www.baeldung.com/linux/direct-and-indirect-script-invocation)
- [Interactive vs non interactive shell — KodeKloud](https://notes.kodekloud.com/docs/Advanced-Bash-Scripting/Introduction/Interactive-vs-non-interactive-shell/page)
- [.bashrc vs .bash_profile: What is the Difference? — Linuxize](https://linuxize.com/post/bashrc-vs-bash-profile/)
- [Difference Between .bashrc, .bash-profile, and .profile — Baeldung on Linux](https://www.baeldung.com/linux/bashrc-vs-bash-profile-vs-profile)
- [What's the Difference Between sh and Bash? — Baeldung on Linux](https://www.baeldung.com/linux/sh-vs-bash)
- [Major Differences From The Bourne Shell — GNU Bash Reference Manual](https://www.gnu.org/software/bash/manual/html_node/Major-Differences-From-The-Bourne-Shell.html)
- [Chapter 34. Gotchas — Advanced Bash-Scripting Guide (TLDP)](https://tldp.org/LDP/abs/html/gotchas.html)
- [Quotes — Greg's Wiki](https://mywiki.wooledge.org/Quotes)
- [How to Handle Subshells in Bash Scripts — OneUptime](https://oneuptime.com/blog/post/2026-01-24-bash-subshells/view)
