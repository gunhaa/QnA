# Java 같은 프로그램도 기본적으로 systemctl로 실행함? Unit이 곧 프로그램인가?

## 결론부터

1. **"기본적으로 systemctl(systemd)로 시작"이라는 건 절반만 맞아요.** 오래 켜져 있어야 하는 백그라운드 프로그램(데몬)을 리눅스에서 관리하는 **가장 흔한 표준 방법**이긴 하지만, **유일한 방법은 아니에요.**
2. **Unit은 프로그램이 아니에요.** Unit 파일은 "이 프로그램을 어떻게 켜고 끄고 감시할지" 적어둔 **관리 카드(설정)**이고, 진짜 프로그램은 그 카드를 읽어서 실행된 **프로세스(JVM 등)** 자체예요.

## 한 줄 비유

- **프로그램(java 프로세스)** = 실제로 일하는 **직원**
- **Unit 파일(.service)** = 그 직원의 **고용 계약서** (언제 출근시킬지, 사고 나면 재고용할지, 어떤 계정으로 일 시킬지)
- **systemd** = 계약서를 보고 직원을 관리하는 **인사팀**

계약서(Unit)가 있다고 직원(프로세스)이 저절로 일하는 건 아니에요. `systemctl start`를 해야 인사팀이 계약서를 보고 실제로 직원을 출근시켜요. 그리고 직원이 이미 출근해서 일하고 있는 도중에 계약서 파일을 삭제해도, 그 직원은 (다음에 재고용되기 전까지는) 계속 일하고 있어요 — 이게 바로 지난 문서에서 다룬 "**프로세스/cgroup은 그 순간의 실체, Unit 파일은 디스크 위의 설정**"이라는 구분이에요.

## Java나 다른 프로그램이 실제로 실행되는 방법들

systemd는 여러 방법 중 하나일 뿐이에요. 상황에 따라 이렇게 나뉘어요.

| 방법 | 언제 쓰나 | Java 예시 |
|---|---|---|
| **터미널 직접 실행** | 잠깐 테스트할 때 | `java -jar app.jar` (터미널 닫으면 같이 죽음) |
| **nohup / disown / screen / tmux** | 재부팅까지는 필요 없고 그냥 터미널 종료돼도 살아있게 하고 싶을 때 | `nohup java -jar app.jar &` |
| **cron** | 정해진 시간에 한 번씩만 돌리면 되는 작업 | 매일 새벽 배치 작업 실행 |
| **systemd (.service)** | 서버가 켜져있는 동안 계속 떠있어야 하고, 죽으면 자동 재시작·부팅 시 자동 시작이 필요할 때 | `ExecStart=/usr/bin/java -jar /opt/app/app.jar` |
| **애플리케이션 서버 (Tomcat, WildFly 등)** | 여러 개의 웹앱(.war)을 한 컨테이너 프로세스 안에서 같이 돌릴 때 | Tomcat **하나만** systemd 유닛으로 등록하고, 그 안에 WAR 여러 개를 배포 |
| **Docker/Kubernetes** | 컨테이너로 배포할 때 | 컨테이너의 `ENTRYPOINT`/`CMD`가 systemd 역할을 대신함 (컨테이너 안에는 보통 systemd 자체가 없음) |
| **다른 프로세스 매니저** | systemd 없이 프로세스만 관리하고 싶을 때 | supervisord, s6, runit, (Node 생태계의 PM2 등) |
| **Java 전용 데몬화 도구** | 예전 방식, 지금은 잘 안 씀 | Apache Commons Daemon(`jsvc`) 등 |

즉 "Java는 원래 systemctl로 시작하는 것"이 아니라, **"오래 떠있어야 하는 백그라운드 프로그램을 리눅스 표준 방식대로 관리하고 싶으면 systemd에 등록하는 것"**이에요. 임시 스크립트나, 이미 다른 프로그램(Tomcat 등)이 감싸서 관리해주는 경우엔 systemd까지 안 가도 돼요.

## Unit으로 등록하면 뭐가 프로그램에 "가까워"지는가?

정확히 말하면 **가까워지는 게 아니라, "그 프로그램을 다루는 표준 인터페이스가 생기는 것"**이에요. Unit으로 등록하기 전/후를 비교하면:

| | Unit 등록 전 (터미널 직접 실행) | Unit 등록 후 |
|---|---|---|
| 실행 주체 | 사람이 직접 `java -jar ...` 타이핑 | systemd가 `ExecStart`를 읽어서 대신 실행 |
| 재시작 | 죽으면 사람이 다시 켜야 함 | `Restart=on-failure`로 자동 재시작 |
| 부팅 시 자동 실행 | 없음 | `enable`로 가능 |
| 로그 | 터미널 화면에만 출력 (닫으면 사라짐) | `journalctl`로 영구 조회 가능 |
| 권한/자원 제한 | 사람이 매번 신경써야 함 | `User=`, cgroup 기반 자원 제한을 유닛 파일에 미리 박아둘 수 있음 |

즉 **프로그램(java 프로세스) 자체는 변하지 않아요.** 바뀌는 건 "그 프로세스를 누가, 어떻게 감독하느냐"예요. Unit 파일은 이 감독 역할을 리눅스 표준 도구(systemd)에게 위임하기 위한 **설정 문서**일 뿐, 프로그램의 일부가 되는 게 아니에요.

## 정리

- systemd는 **"오래 켜져 있어야 하는 리눅스 백그라운드 프로그램"을 관리하는 현대 리눅스의 표준**이지, 모든 프로그램 실행의 유일한 방법은 아니에요.
- Java 앱도 `java -jar` 직접 실행, cron, Tomcat 같은 애플리케이션 서버, Docker/Kubernetes 등 상황에 맞는 다양한 방법으로 켜질 수 있고, 그중 "계속 떠있어야 하는 단일 프로세스" 형태일 때 systemd 유닛으로 등록하는 게 흔해요.
- Unit 파일은 프로그램이 아니라 **"이 프로그램을 어떻게 켜고, 재시작하고, 로그를 남길지"를 적어둔 계약서**이고, 실제 프로그램은 그 계약서를 읽고 실행된 **프로세스**예요.

## Sources
- [Running a Java Application as a Linux Service — LaunchCode](https://education.launchcode.org/gis-devops/walkthroughs/unit-files/index.html)
- [Run a Java Application as a Service on Linux | Baeldung on Linux](https://www.baeldung.com/linux/run-java-application-as-service)
- [Systemd - Wikipedia](https://en.wikipedia.org/wiki/Systemd)
