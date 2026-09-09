# Linux에서 systemd와 systemctl은 각각 무슨 역할을 하나요?

## 결론부터

**systemd는 "일하는 사람(관리자·매니저)"이고, systemctl은 "그 관리자에게 지시를 내리는 리모컨"이에요.** `systemd`는 리눅스가 부팅될 때 커널 바로 다음으로 실행되는 **PID 1번 프로세스**로, 다른 모든 프로그램(서비스)을 언제·어떤 순서로 켜고 끌지 실제로 관리하는 주체예요. `systemctl`은 사람이 터미널에서 "이 서비스 좀 켜줘/꺼줘/상태 보여줘"라고 말하면, 그 요청을 systemd에게 전달만 하는 **명령줄 도구**예요. **systemd 없이 systemctl만 있으면 아무 일도 못 하고, systemctl 없어도 systemd는 알아서 부팅 시 정해진 일을 하지만, 사람이 실시간으로 조작하려면 systemctl이 필요해요.**

## 다섯 살에게 설명하듯

학교 급식실을 떠올려 보세요.

- **systemd** = 급식실에서 **실제로 일하는 조리사 반장**이에요. "국은 먼저 끓이고, 밥은 그 다음, 반찬은 동시에 준비해도 돼" 하는 순서를 정해서 실제로 요리(서비스 실행)를 시키고, 누가 아직 요리 중인지, 다 됐는지 계속 확인해요. 학교 문(부팅)이 열리자마자 제일 먼저 출근해서 모든 걸 지휘해요.
- **systemctl** = 반장에게 말을 거는 **인터폰**이에요. "3번 화구(서비스) 좀 꺼줘", "지금 뭐 하고 있어?", "내일부터는 이 요리 자동으로 해줘" 같은 요청을 반장(systemd)에게 전달만 해요. 인터폰 자체는 요리를 안 해요 — 그냥 말을 전달하는 도구일 뿐이에요.
- **유닛 파일(unit file)** = "이 요리는 이런 재료로, 이 순서로, 이런 조건에서 만들어라"고 적힌 **레시피 카드**예요. 반장(systemd)은 이 카드를 보고 일해요.

## 기술적으로 풀어보면

### systemd — 실제 관리자 (PID 1)

- 커널이 부팅을 마치면 가장 먼저 실행되는 **init 시스템**이자 **PID 1 프로세스**예요. 시스템이 꺼질 때는 가장 마지막까지 살아있어요.
- 옛날 init 시스템(SysV init)은 서비스 A가 끝날 때까지 기다렸다가 B를 시작하는 **순차적 방식**이었지만, systemd는 **의존관계만 지켜지면 최대한 많은 서비스를 동시에 병렬로 부팅**시켜서 부팅 속도를 크게 줄여요.
- **유닛(unit)**이라는 단위로 관리 대상을 정의해요. 대표적인 유닛 타입:
  - `.service` — 데몬 프로세스 하나(예: `nginx.service`, `sshd.service`)
  - `.socket` — 네트워크/유닉스 소켓. 실제 요청이 들어올 때까지 서비스를 안 띄우고 있다가, 요청이 오면 그때 연결된 서비스를 자동으로 깨우는 **소켓 활성화(socket activation)** 기능도 제공해요.
  - `.mount` / `.automount` — 파일시스템 마운트
  - `.timer` — `cron`을 대체할 수 있는 시간 기반 트리거
  - `.target` — 여러 유닛을 묶어놓은 그룹. 옛날의 "런레벨(runlevel, 0~6 숫자로 하나만 선택)"을 대체하는데, 런레벨과 달리 **여러 target을 동시에 활성화**할 수 있다는 게 차이예요 (예: `multi-user.target`, `graphical.target`).
- 이 모든 동작 방식은 사람이 읽고 쓸 수 있는 **평문 유닛 파일**(보통 `/etc/systemd/system/` 또는 `/usr/lib/systemd/system/`에 위치)로 선언적으로(declarative) 정의돼요.

### systemctl — systemd를 조작하는 CLI 도구

`systemctl`은 systemd 데몬에게 명령을 보내는 **클라이언트**예요. 자주 쓰는 명령들:

| 명령 | 역할 |
|---|---|
| `systemctl start <unit>` | 지금 당장 서비스를 실행 |
| `systemctl stop <unit>` | 지금 당장 서비스를 중지 |
| `systemctl restart <unit>` | 중지 후 재시작 |
| `systemctl status <unit>` | 현재 상태(실행 중/실패/비활성) 확인 |
| `systemctl enable <unit>` | **다음 부팅부터** 자동으로 시작되게 설정(심볼릭 링크 생성) |
| `systemctl disable <unit>` | 자동 시작 해제 |
| `systemctl daemon-reload` | 유닛 파일을 수정한 뒤, systemd에게 "설정 다시 읽어" 하고 알려주기 |

여기서 중요한 포인트는 `enable`/`disable`은 **"자동 시작 여부"**만 바꾸고, `start`/`stop`은 **"지금 이 순간의 실행 여부"**만 바꾼다는 거예요. 그래서 "지금 켜져 있지만 다음 부팅부턴 안 켜지게" 또는 "지금은 꺼져 있지만 다음 부팅부턴 켜지게" 같은 조합도 가능해요.

### 정리하면

| 구분 | systemd | systemctl |
|---|---|---|
| 정체 | PID 1 데몬(실제 관리자) | CLI 클라이언트(리모컨) |
| 하는 일 | 유닛 파일을 읽고 실제로 프로세스를 실행·감시·순서 관리 | 사용자의 명령을 systemd에 전달, 상태 조회 결과를 사람이 보기 좋게 출력 |
| 없으면? | 시스템 자체가 부팅·서비스 관리를 못 함 | systemd는 정상 동작하지만, 사람이 손쉽게 조작할 방법이 없어짐(다른 API로는 가능) |

## 요약

- **systemd**는 부팅 시 PID 1로 실행돼 유닛 파일에 정의된 대로 서비스들을 병렬로 관리하는 **실제 init 시스템(관리자)**이에요.
- **systemctl**은 그 systemd에게 시작/중지/상태확인/자동시작 설정 같은 **명령을 내리는 도구**일 뿐, 자체적으로 서비스를 관리하지 않아요.
- 유닛(`.service`, `.socket`, `.target`, `.timer` 등)이라는 선언적 설정 파일이 이 둘을 이어주는 매개체예요.

---

## 출처

- [Introduction to systemd Basics — SUSE Documentation](https://documentation.suse.com/smart/systems-management/html/systemd-basics/index.html)
- [Using the systemctl command to manage systemd units — Opensource.com](https://opensource.com/article/20/5/systemd-units)
- [Chapter 10. Managing Services with systemd — Red Hat Enterprise Linux 7](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/chap-managing_services_with_systemd)
- [systemd.unit — freedesktop.org](https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html)
- [What Is The Difference Between Systemd And Systemctl?](https://onlinetutorialhub.com/linux/differences-systemd-and-systemctl/)
- [How to Use systemd Targets Instead of Runlevels on Ubuntu](https://oneuptime.com/blog/post/2026-03-02-how-to-use-systemd-targets-instead-of-runlevels-on-ubuntu/view)
- [systemd — ArchWiki](https://wiki.archlinux.org/title/Systemd)
- [Understanding Systemd "Units": Services, Sockets, Targets, and More](https://dohost.us/index.php/2025/07/30/understanding-systemd-units-services-sockets-targets-and-more/)
