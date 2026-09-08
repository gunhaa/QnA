# 리눅스(Linux)란? 기본 구성요소

## 한 줄 비유

리눅스는 **"장난감 나라를 운영하는 왕국"** 같은 거예요.
- **커널(Kernel)** = 왕국을 실제로 움직이는 왕 (하드웨어에게 직접 명령)
- **쉘(Shell)** = 왕에게 백성의 말을 전달하는 통역사
- **파일시스템(Filesystem)** = 왕국의 물건을 정리해둔 서랍장

## 1. 커널 (Kernel)

커널은 리눅스의 **심장이자 왕**이에요. 컴퓨터의 CPU, 메모리, 하드디스크 같은 진짜 하드웨어에게 직접 "이거 해!"라고 명령을 내리는 유일한 존재예요.

- **프로세스 관리**: 어떤 프로그램에게 CPU를 얼마나 줄지 정해요 (마치 왕이 신하들에게 일을 나눠주듯이). 이 자원 배분을 실제로 제한/추적하는 도구가 [[cgroups-explained|cgroup]]이에요.
- **메모리 관리**: 프로그램들이 서로 방을 안 뺏도록 메모리를 나눠줘요.
- **디바이스 드라이버**: 키보드, 마우스, 네트워크 카드 같은 하드웨어와 대화하는 통역 담당이에요.
- **시스템 콜(System Call)**: 일반 프로그램이 커널에게 "이거 해줘"라고 부탁하는 정식 창구예요. 예를 들어 파일을 열거나 화면에 글씨를 찍는 것도 결국 시스템 콜을 통해 커널에게 부탁하는 거예요.

## 2. 쉘 (Shell)

쉘은 사람과 커널(왕) 사이에서 말을 옮겨주는 **통역사**예요. 사람이 "ls" 라고 타이핑하면, 쉘이 이걸 알아듣고 커널에게 "이 폴더 안에 뭐가 있는지 보여줘!"라고 전달해요.

- 대표 선수는 **bash**예요 (요즘은 zsh도 많이 씀).
- 명령어를 하나씩 입력하는 **대화형 모드**, 명령어를 미리 적어둔 종이(스크립트)를 읽는 **스크립트 모드** 둘 다 가능해요.
- 쉘이 키보드 입력을 어떻게 한 글자씩 받아 처리하는지는 [[terminal-keystroke-input-pipeline|터미널 키 입력 처리 파이프라인]] 문서에 더 자세히 나와요.

## 3. 파일시스템 (Filesystem)

리눅스는 모든 것을 **거꾸로 뒤집힌 나무** 모양으로 정리해요. 맨 꼭대기(뿌리)는 `/`(루트)라고 불러요.

```
/            ← 뿌리 (모든 것의 시작)
├── /bin     ← 기본 명령어 도구들
├── /etc     ← 설정 서랍
├── /home    ← 각 사용자의 개인 방
├── /var     ← 계속 바뀌는 로그, 데이터
└── /proc    ← 지금 실행 중인 프로그램들의 정보 (가짜 파일처럼 보임)
```

리눅스는 "모든 것은 파일이다(Everything is a file)"라는 철학을 가지고 있어요. 심지어 프린터나 실행 중인 프로세스 정보도 파일처럼 다룰 수 있어요.

## 4. 프로세스 (Process)

프로세스는 **실행 중인 프로그램**이에요. 왕국에 살고 있는 "일하는 사람들"이라고 생각하면 돼요. `ps -ef` 명령으로 지금 왕국에서 누가 일하고 있는지 볼 수 있어요 (자세한 컬럼 설명은 [[ps-ef-output-columns-explained|ps -ef 출력 컬럼 설명]] 참고).

## 5. 사용자 공간 프로그램 (User Space)

커널 위에서 돌아가는 나머지 프로그램들이에요. 텍스트 에디터, 웹 브라우저, `systemd` 같은 부팅·서비스 관리자([[systemd-vs-systemctl-role|systemd와 systemctl의 역할]] 참고)가 여기 속해요. 이 프로그램들은 커널에게 직접 명령하지 못하고, 반드시 시스템 콜을 통해 "부탁"해야 해요.

## 정리

| 구성요소 | 역할 | 비유 |
|---|---|---|
| 커널 | 하드웨어를 직접 제어 | 왕 |
| 쉘 | 사람 명령을 커널에 전달 | 통역사 |
| 파일시스템 | 데이터를 나무 구조로 정리 | 서랍장 |
| 프로세스 | 실행 중인 프로그램 | 일하는 사람 |
| 사용자 공간 프로그램 | 응용 프로그램들 | 왕국의 상점·시설 |

이 다섯 가지가 손발을 맞춰 움직이면서 "리눅스"라는 하나의 운영체제가 완성돼요.

## Sources
- [Lesson 0 - Linux components - LEARN HPC @ QMUL](https://learn.hpc.qmul.ac.uk/linux_101/00_linux_components/)
- [Architecture of Linux - GeeksforGeeks](https://www.geeksforgeeks.org/linux-unix/architecture-of-linux-operating-system/)
- [What is Linux? | HPC@UCD - UC Davis](https://hpc.ucdavis.edu/linux-tutorials/linux-os)
- [Basic Linux Architecture: Kernel, Shell & Filesystem Explained - GravityDevOps](https://gravitydevops.com/basic-linux-architecture-kernel-shell-filesystem/)
