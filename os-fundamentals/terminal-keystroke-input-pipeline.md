# 터미널에 타자를 치면 무슨 일이 일어날까?

## 한 줄 비유

터미널에 글자 하나를 치는 건, **놀이터에서 친구에게 쪽지를 전달하는 릴레이 게임**이랑 똑같아요.
"A" 라는 쪽지를 손(키보드)에서 출발시키면, 여러 명의 친구(하드웨어 → 커널 → 터미널 → 셸)를 거쳐서 마지막 친구(셸, `shell`)한테 도착해야 "명령"이 실행돼요. 중간에 친구가 한 명이라도 빠지면 쪽지는 못 전달돼요.

---

## 전체 그림 (요약 순서)

```
[손가락] → [키보드 스위치] → [키보드 컨트롤러: 스캔코드]
   → [OS 커널의 키보드 드라이버: 스캔코드 → 키 이벤트]
   → [터미널 에뮬레이터(Windows Terminal 등): 키 이벤트 → 문자/이스케이프 시퀀스]
   → [PTY(가상 터미널) master ↔ slave]
   → [라인 디시플린(line discipline): 편집, 에코, 특수키 처리]
   → [셸(bash/PowerShell)이 read()로 읽음]
   → [셸이 명령을 해석하고 실행]
```

---

## 1단계 — 손가락이 키를 누르는 순간 (하드웨어)

키보드 안에는 각 키마다 위치가 정해져 있고, 키를 누르면 그 위치에 대응하는 **스캔코드(scancode)** 라는 숫자가 만들어져요.
비유하면, 키보드는 "몇 번째 자리 학생이 손을 들었는지"만 알려주는 선생님이에요. "A"라는 글자를 아는 게 아니라, "3번 자리"가 눌렸다는 신호만 보내는 거죠.

- 요즘 키보드는 대부분 **USB HID(Human Interface Device)** 방식이에요. 키를 누르면 키보드가 컴퓨터에 "인터럽트(interrupt)"를 보내고, 그 안에 스캔코드가 담긴 작은 데이터 뭉치(리포트)가 들어있어요.
- 옛날 PS/2 키보드는 누를 때(make code)와 뗄 때(break code)가 따로 있었지만, USB는 "지금 눌려있는 키 목록"을 계속 보고하는 방식이에요.

## 2단계 — 커널이 스캔코드를 "키 이벤트"로 번역 (OS 커널)

컴퓨터 안의 **운영체제 커널(kernel)**이 이 인터럽트를 받아서, "스캔코드 → 키 이벤트(어떤 키가 눌렸다/떼졌다)"로 번역해요.
비유하면, 선생님이 "3번 자리 학생 = 철수, 철수가 손을 들었다"로 바꿔주는 거예요.

- Windows에서는 키보드 드라이버가 이 신호를 받아서 **가상 키 코드(virtual key code)**로 바꾸고, 포커스를 가진 프로그램(여기선 터미널 에뮬레이터)에 "키 입력 메시지"로 전달해요.
- Linux라면 `evdev` 같은 입력 서브시스템이 비슷한 역할을 해요.

## 3단계 — 터미널 에뮬레이터가 문자로 바꿈

**터미널 에뮬레이터(Windows Terminal, iTerm, gnome-terminal 등)**는 그 자체로는 셸이 아니에요. 그냥 "그림을 그리는 창 + 키 입력을 텍스트로 바꿔주는 프로그램"이에요.
비유하면, 철수가 손을 든 걸 보고 "종이에 A라고 적어서 옆으로 넘겨주는 심부름꾼"이에요.

- 일반 문자("a")는 그대로 문자로 바뀌고, 화살표 키·Home·F1 같은 특수키는 **ANSI 이스케이프 시퀀스**(예: `\x1b[A`)라는 특별한 코드로 바뀌어요.

## 4단계 — PTY(가상 터미널)를 통해 전달

여기서부터가 진짜 재미있는 부분이에요. 터미널 에뮬레이터와 셸은 직접 붙어있지 않고, **PTY(pseudo-terminal, 가상 터미널)**라는 파이프 같은 장치를 사이에 두고 통신해요.

- PTY는 **master**(터미널 에뮬레이터가 쓰는 쪽)와 **slave**(셸이 읽는 쪽)로 나뉘어요.
- 터미널 에뮬레이터가 master에 "A"를 쓰면, 커널이 그걸 slave 쪽으로 옮겨줘요.
- Windows에서는 이 역할을 **ConPTY**(Windows Pseudo Console API, Windows 10부터 도입)가 담당해요. Windows Terminal이 보낸 키 입력을 VT 시퀀스로 바꿔서 익명 파이프로 ConPTY에 전달하면, ConPTY가 이를 파싱해서 콘솔 내부의 `INPUT_RECORD`(입력 기록)로 만들고, 그 안에서 PowerShell 같은 셸이 실행돼요.

비유하면 PTY는 "쪽지를 넣는 우체통(master)"과 "쪽지를 꺼내는 우편함(slave)"이 파이프로 연결된 것과 같아요.

## 5단계 — 라인 디시플린이 다듬어줌

커널 안에는 **라인 디시플린(line discipline)**이라는 소프트웨어 계층이 있어요. TTY 드라이버와 셸 사이에 앉아서, 문자를 그냥 흘려보내지 않고 몇 가지 똑똑한 일을 해줘요.

- **기본 모드(canonical mode, 캐노니컬 모드)**: 한 글자씩 바로 셸에 넘기지 않고, 한 줄 버퍼에 모아뒀다가 **Enter(줄바꿈)**를 눌러야 통째로 셸에 넘겨요.
- **에코(echo)**: 내가 친 글자를 화면에 다시 보여주는 것도 이 계층이 해줘요. (그래서 타이핑한 게 바로 보이는 거예요!)
- **줄 편집**: Backspace(한 글자 지우기), Ctrl+U(줄 전체 지우기), Ctrl+W(단어 지우기) 같은 것도 여기서 처리해요.
- **특수키 → 신호(signal) 변환**: Ctrl+C를 누르면 문자로 전달되는 게 아니라 **SIGINT**(인터럽트 신호)로 바뀌어서 실행 중인 프로그램을 멈추게 하고, Ctrl+Z는 **SIGTSTP**(일시정지 신호), Ctrl+D는 **EOF**(입력 끝)로 바뀌어요.

비유하면, 라인 디시플린은 "쪽지 검사관"이에요. 그냥 통과시키는 게 아니라 "이 쪽지는 아직 안 끝났으니 모아둬", "이건 특수 표시니까 폭탄(신호)으로 바꿔서 던져" 같은 판단을 해줘요.

- 참고로 vim, htop처럼 화면 전체를 그리는 프로그램들은 **raw mode(로우 모드)**로 전환해서, 이 자동 편집·에코 기능을 끄고 모든 키 입력을 직접 한 글자씩 받아서 스스로 처리해요.

## 6단계 — 셸이 드디어 읽는다

Enter를 누르면, 버퍼에 모여있던 한 줄이 PTY slave를 통해 셸(bash, zsh, PowerShell 등)의 **표준 입력(stdin)**으로 전달돼요. 셸은 `read()` 시스템 콜로 이 데이터를 기다리고 있다가, 마침내 문자열을 받아서 명령으로 해석하고 실행해요.

비유하면, 마지막 친구(셸)가 쪽지를 받고 나서야 "아, `ls` 라고 적혀있네, 그럼 파일 목록을 보여줘야지!" 하고 움직이는 거예요.

---

## ★ 핵심 포인트 3가지

1. **키보드는 문자를 몰라요.** 스캔코드(숫자)만 보내고, "A"라는 의미로 바뀌는 건 커널 드라이버와 터미널 에뮬레이터의 몫이에요.
2. **터미널 에뮬레이터 ≠ 셸.** 터미널은 그림을 그리고 키를 문자로 바꾸는 창일 뿐이고, 실제 명령을 실행하는 건 PTY 너머의 셸이에요. Windows에서는 이 다리 역할을 ConPTY가 해요.
3. **Enter를 누르기 전까지는 커널의 라인 디시플린이 붙잡고 있어요.** 그래서 백스페이스로 지우거나 Ctrl+C로 멈추는 게 셸이 아니라 커널 수준에서 먼저 처리되는 거예요.

---

## 출처

- [TTY Line Discipline — The Linux Kernel documentation](https://docs.kernel.org/driver-api/tty/tty_ldisc.html)
- [The TTY demystified](https://www.linusakesson.net/programming/tty/)
- [Understanding the tty subsystem: Line discipline - Jonathan Lam](https://lambdalambda.ninja/blog/56/)
- [The terminal, the TTY, and the shell - The Linux Field Guide](https://lfg.popovicu.com/series/the-shell-as-a-language/terminal-tty-and-shell/)
- [TTY Architecture: PTY, Line Discipline, Shell, and Terminal | Terminfo.dev](https://terminfo.dev/fundamentals/tty-architecture)
- [How UNIX Terminal Devices Work: TTY, Pseudo-Terminals, and Line Discipline | Pranav](https://www.pranavramjoshi.me/blog/unix-terminal-device-tty-line-discipline)
- [Developing Keyboard and Mouse HID Client Drivers - Microsoft Learn](https://learn.microsoft.com/en-us/windows-hardware/drivers/hid/keyboard-and-mouse-hid-client-drivers)
- [USB Human Interface Devices - OSDev Wiki](https://wiki.osdev.org/USB_Human_Interface_Devices)
- [Windows Command-Line: Introducing the Windows Pseudo Console (ConPTY)](https://devblogs.microsoft.com/commandline/windows-command-line-introducing-the-windows-pseudo-console-conpty/)
- [ConPTY and VT I/O | microsoft/terminal | DeepWiki](https://deepwiki.com/microsoft/terminal/2.4-conpty-and-vt-io)
