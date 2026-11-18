# vim이 뭐고, 가장 기본적으로 어떻게 쓸까?

## 한 줄 비유

vim은 **"보는 모드"와 "그리는 모드"가 따로 있는 색칠 놀이 책**이에요.
보통 그림판(메모장 같은 에디터)은 클릭하면 바로 그릴 수 있죠? 그런데 vim은 "지금 나는 그림을 구경만 할래(둘러보기)"와 "지금 나는 색연필을 들고 그릴래(입력하기)"를 딱 나눠놔요. 이게 바로 vim의 **모드(mode)** 개념이에요.

---

## 1. vim의 3가지 모드

vim을 켜면 항상 **노멀 모드(Normal mode)**로 시작해요. 여기서는 타자를 쳐도 글자가 안 써지고, 대신 "명령"으로 취급돼요.

| 모드 | 비유 | 하는 일 | 들어가는 법 |
|---|---|---|---|
| **노멀 모드(Normal mode)** | 손에 지휘봉 든 상태 | 이동, 삭제, 복사 등 "명령"만 내림 | `Esc` 누르면 항상 여기로 |
| **인서트 모드(Insert mode)** | 손에 색연필 든 상태 | 진짜 글자를 타이핑함 | 노멀 모드에서 `i` |
| **명령줄 모드(Command-line mode / Ex mode)** | 선생님한테 쪽지로 부탁하기 | 저장, 종료, 찾아바꾸기 같은 굵직한 지시 | 노멀 모드에서 `:` |

★ 가장 많이 하는 실수: 켜자마자 그냥 타이핑하기 → 글자가 안 써지고 이상한 명령이 실행돼요. **처음엔 반드시 `i`를 눌러서 인서트 모드로 들어가야** 진짜로 글을 쓸 수 있어요.

---

## 2. 정말 최소한으로 알아야 할 흐름

```
1) 터미널에서 vim 파일이름.txt   → vim 실행 (노멀 모드로 시작)
2) i                           → 인서트 모드로 전환 (이제 타이핑 가능)
3) 글자 입력...
4) Esc                         → 다시 노멀 모드로 복귀
5) :wq  (또는 ZZ)              → 저장하고 종료
```

이 5단계만 외우면 "vim 켜서 글 쓰고 저장하고 나가기"는 끝이에요.

---

## 3. 노멀 모드에서 자주 쓰는 명령 (커서 이동 & 편집)

### 이동 (색연필 없이 그림책 페이지 넘기기)

| 키 | 뜻 |
|---|---|
| `h` `j` `k` `l` | 왼쪽 / 아래 / 위 / 오른쪽 (방향키 대신 씀) |
| `w` | 다음 단어 앞으로 |
| `0` / `$` | 줄 맨 앞 / 줄 맨 끝 |
| `gg` / `G` | 파일 맨 처음 / 맨 끝 |

### 편집 (지우고 복사하고 붙여넣기)

| 키 | 뜻 | 비유 |
|---|---|---|
| `x` | 커서 위 글자 한 개 지우기 | 지우개로 한 글자 톡 |
| `dd` | 줄 전체 삭제(=잘라내기) | 종이 한 줄을 통째로 오려냄 |
| `dw` | 커서부터 단어 끝까지 삭제 | 단어 하나만 오려냄 |
| `yy` | 줄 복사(yank, 얀크) | 복사기로 한 줄 복사 |
| `p` | 붙여넣기(put, 풋) | 방금 오리거나 복사한 걸 커서 아래에 붙임 |
| `u` | undo(실행 취소) | "아까 그거 취소!" |
| `Ctrl+r` | redo(다시 실행) | "아니 방금 취소한 거 다시 해줘" |

## 4. 명령줄 모드(`:`)에서 자주 쓰는 것

| 명령 | 뜻 |
|---|---|
| `:w` | 저장만 하고 계속 편집 (write) |
| `:q` | 종료 (변경사항 없을 때만 됨) |
| `:wq` 또는 `:x` | 저장하고 종료 |
| `:q!` | 저장 안 하고 강제 종료 (변경 내용 버림) |
| `:%s/찾을말/바꿀말/g` | 파일 전체에서 찾아 바꾸기 |

`ZZ` (노멀 모드에서 대문자 Z 두 번)는 `:wq`와 똑같이 "저장하고 종료"하는 단축키예요.

---

## ★ 핵심 포인트 3가지

1. **모드가 전부다.** vim에서 헷갈릴 때는 일단 `Esc`를 눌러서 노멀 모드로 돌아가는 게 안전해요. "지금 내가 색연필을 들고 있나, 지휘봉을 들고 있나"만 기억하면 돼요.
2. **명령은 "동작 + 대상"으로 조합돼요.** 예를 들어 `d`(delete, 지우기) + `w`(word, 단어) = `dw`(단어 지우기), `d` + `d` = `dd`(줄 전체 지우기)처럼, 알파벳 몇 개를 레고처럼 조합해서 명령을 만들어요.
3. **처음 막히면 `:q!`로 탈출.** 저장 안 하고 그냥 나가고 싶을 때 이 명령을 기억해두면 vim이 안 무서워져요.

---

## 출처

- [How to Use Vim – Tutorial for Beginners (freeCodeCamp)](https://www.freecodecamp.org/news/vim-beginners-guide/)
- [Vim Editor Modes Explained (freeCodeCamp)](https://www.freecodecamp.org/news/vim-editor-modes-explained/)
- [Linux basics: A beginner's guide to text editing with vim (Red Hat)](https://www.redhat.com/en/blog/beginners-guide-vim)
- [Getting started with Vim: The basics (Opensource.com)](https://opensource.com/article/19/3/getting-started-vim)
- [The Ultimate Vim Command Cheat Sheet (Pluralsight)](https://www.pluralsight.com/resources/blog/cloud/a-vim-cheat-sheet-reference-guide)
- [Vim Cheat Sheet](https://vim.rtorr.com/)
- [A Great Vim Cheat Sheet](https://vimsheet.com/)
