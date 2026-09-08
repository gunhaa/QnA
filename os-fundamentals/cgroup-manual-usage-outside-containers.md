# cgroup을 이름으로 지정해서 프로세스를 실행/종료하는 방식, 도커·쿠버네티스 없이도 실무에서 많이 쓰나요?

## 결론부터

**네, 실제로 아주 흔하게 씁니다.** cgroup은 원래 도커·쿠버네티스의 "내부 구현 부품"으로 만들어진 게 아니라, **그 자체로 "이 프로세스(들)를 이름 붙인 그룹에 넣고 자원 제한을 걸었다가, 다 쓰면 그룹째로 정리한다"는 범용 도구**예요. 컨테이너는 이 기능을 빌려 쓰는 대표 사례 중 하나일 뿐이에요. 실무에서는 **systemd가 제공하는 `systemd-run --scope`**가 가장 흔하게 쓰이고, 더 로우레벨로는 **`cgroup-tools`(`cgexec`, `cgcreate`, `cgclassify`, `cgdelete`)**를 직접 쓰기도 하며, 사실 **로그인할 때마다 시스템이 자동으로** 세션별 cgroup을 만들어 쓰고 있기도 해요.

## 다섯 살에게 설명하듯

앞서 "모래놀이 구역 나누기" 비유를 이어가 볼게요.

- 도커/쿠버네티스는 "**아예 울타리 있는 놀이집을 통째로 짓고**, 그 안에서만 놀게 하는" 큰 작업이에요.
- 그런데 꼭 집을 짓지 않아도, **"지금 이 모래놀이 한 판만 잠깐 구역을 나눠서 하자"**처럼 **즉석에서 이름표 붙인 구역을 만들었다가, 놀이 끝나면 그 이름표를 떼버리는** 것도 가능해요. 이게 `systemd-run --scope`나 `cgexec` 같은 도구가 하는 일이에요. 집을 짓는 것보다 훨씬 가볍고 빨라요.

## 기술적으로 풀어보면 — 실제로 많이 쓰이는 4가지 패턴

### 1) `systemd-run --scope` — 가장 흔한 "즉석 자원 제한 실행"

이미 있는 systemd에게 "이 명령어를 이름 붙인 임시 그룹 안에서 실행해줘"라고 부탁하는 방식이에요. 컨테이너를 전혀 안 쓰는 서버에서도 아주 흔해요.

```bash
# myslice.slice 아래, 메모리 256MB / CPU 50%로 제한해서 즉석 실행
systemd-run --scope --slice=myslice.slice \
  --property=MemoryMax=256M --property=CPUQuota=50% \
  -- stress --vm 2 --vm-bytes 200M
```

이 명령이 끝나면 **그 임시 cgroup(scope)은 시스템이 자동으로 정리**해줘요. 흔한 실사용 예:

- "이 빌드 스크립트/배치 작업이 서버 메모리를 다 먹어서 다른 서비스가 멎는 걸 방지"하려고, 개발자가 즉석에서 메모리 상한을 걸어 실행.
- 크론(cron)으로 도는 야간 배치 작업에 CPU 쿼터를 걸어, 업무 시간대 서비스와 자원을 안 다투게 함.

### 2) `cgroup-tools` (`cgcreate`/`cgexec`/`cgclassify`/`cgdelete`) — 더 로우레벨한 수동 제어

systemd 없이, 혹은 systemd보다 더 세밀하게 제어하고 싶을 때 쓰는 전통적인 방식이에요.

```bash
# 이름 있는 cgroup 생성
cgcreate -g memory,cpu:/mygroup

# 그 cgroup 안에서 새 프로세스를 바로 실행
cgexec -g memory,cpu:/mygroup ./my_script.sh

# 이미 떠 있는(실행 중인) 프로세스를 이 그룹으로 옮기기
cgclassify -g memory,cpu:/mygroup <PID>

# 다 쓰면 그룹 삭제
cgdelete -g memory,cpu:/mygroup
```

`cgexec`는 "**새 프로세스를 처음부터 그 그룹 안에서** 실행"하고, `cgclassify`는 "**이미 돌고 있는 프로세스를** 나중에 그 그룹으로 옮기는" 차이가 있어요. 사실 이 도구들도 내부적으로는 `/sys/fs/cgroup/` 아래에 디렉터리를 만들고(`mkdir`) 파일에 값을 쓰는(`write`) 것을 감싼 래퍼(wrapper)일 뿐이에요.

### 3) 시스템이 "이미 알아서" 쓰고 있는 경우 — 로그인 세션

컨테이너와 무관하게, **로그인만 해도 이미 cgroup이 자동으로 쓰이고 있어요.** systemd는 사용자가 로그인하면 `user-1000.slice` 같은 그룹을, 각 터미널 세션마다 `session-2.scope` 같은 그룹을 자동으로 만들어서 **사용자별·세션별 자원 사용량을 추적하고 제한**해요. `systemd-oomd`는 메모리가 부족해질 때 프로세스 하나만 죽이는 게 아니라 **"이 cgroup 그룹째로" 종료**해서 관련 프로세스가 좀비처럼 남는 걸 막기도 해요.

### 4) HPC(고성능 컴퓨팅) 작업 스케줄러

Slurm 같은 클러스터 작업 스케줄러는 여러 사용자가 제출한 "잡(job)"을 각각 cgroup으로 감싸서, 한 노드 안에서 여러 사용자의 작업이 서로의 CPU·메모리를 침범하지 못하게 격리해요. 이것도 도커/쿠버네티스와 무관하게 수십 년간 이어진 전통적인 cgroup 활용 사례예요.

## 요약

- cgroup을 "이름 붙여서 실행하고, 이름으로 종료/정리"하는 패턴은 **컨테이너의 전유물이 아니라 리눅스 자원 관리의 기본 도구**로 실무에서 널리 쓰여요.
- 가장 흔한 실전 도구는 **`systemd-run --scope`**(간편, systemd 있는 곳이면 어디든), 더 세밀한 제어가 필요하면 **`cgroup-tools`**(`cgexec`/`cgcreate`/`cgclassify`/`cgdelete`)를 직접 써요.
- 심지어 사용자가 의식하지 않아도 **로그인 세션, systemd-oomd, HPC 잡 스케줄러** 등에서 이미 자동으로 활용되고 있는, 아주 보편적인 커널 기능이에요.

---

## 출처

- [How to Use systemd-run for Transient Service Execution on Ubuntu](https://oneuptime.com/blog/post/2026-03-02-how-to-use-systemd-run-for-transient-service-execution-on-ubuntu/view)
- [How to Use systemd Slices and Scopes for Resource Management on Ubuntu](https://oneuptime.com/blog/post/2026-03-02-how-to-use-systemd-slices-and-scopes-for-resource-management-on-ubuntu/view)
- [Controlling Process Resources with Linux Control Groups — iximiuz Labs](https://labs.iximiuz.com/tutorials/controlling-process-resources-with-cgroups)
- [cgcreate(1) — cgroup-tools — Debian Manpages](https://manpages.debian.org/testing/cgroup-tools/cgcreate.1.en.html)
- [cgroups — ArchWiki](https://wiki.archlinux.org/title/Cgroups)
- [Chapter 2. Using Control Groups — Red Hat Enterprise Linux 7 Resource Management Guide](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/resource_management_guide/chap-using_control_groups)
