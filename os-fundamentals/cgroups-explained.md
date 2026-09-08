# Linux의 cgroup(control group)이란 무엇인가요?

## 결론부터

**cgroup은 리눅스 커널이 프로세스 그룹별로 "CPU·메모리·디스크 I/O를 얼마나 써도 되는지" 제한하고 감시하는 기능이에요.** 프로세스 하나하나가 아니라 **"그룹"** 단위로 자원 사용량에 상한선을 긋고, 실시간 사용량도 확인할 수 있게 해줘요. Docker 컨테이너, Kubernetes Pod, `systemd` 서비스가 "이 프로세스는 메모리 512MB만 써라"처럼 자원을 제한할 수 있는 건 전부 이 cgroup 위에서 동작하기 때문이에요. **현재(2026년 기준) 대부분의 최신 배포판(Ubuntu 21.10+, Debian 11+, Fedora 31+, RHEL/Rocky 9+)은 더 단순해진 cgroup v2를 기본으로 사용**해요.

## 다섯 살에게 설명하듯

놀이터에 있는 **"모래놀이 구역 나누기"**를 떠올려 보세요.

- 놀이터 전체(컴퓨터의 CPU·메모리·디스크)를 아이들(프로세스)이 다 같이 써야 해요.
- 선생님(커널)이 **"파란 팀은 모래 한 통까지만 써도 돼", "빨간 팀은 그네를 하루에 10분만 탈 수 있어"**처럼 **팀별로 규칙을 정해서 줄을 그어놓는 것**이 바로 cgroup이에요.
- 한 아이(프로세스 하나)한테만 규칙을 주는 게 아니라, **팀(그룹) 전체**에 규칙을 걸어요. 그래서 "control **group**"이에요.
- 선생님은 규칙만 정하는 게 아니라 **"지금 파란 팀이 모래를 얼마나 썼는지"도 계속 확인**할 수 있어요.

## 기술적으로 풀어보면

### 1) 무엇을 제한할 수 있나 — 컨트롤러(controller)

cgroup은 자원 종류별로 "컨트롤러"라는 담당자가 나뉘어 있어요.

| 컨트롤러 | 제한하는 자원 |
|---|---|
| `cpu` | CPU 사용 시간/비중(weight, quota) |
| `memory` | 메모리 사용 상한(`memory.max`), 낮은 우선순위 회수 기준(`memory.low`) |
| `io` (구 `blkio`) | 디스크 I/O 대역폭/우선순위 |
| `pids` | 그룹 안에서 만들 수 있는 프로세스(PID) 개수 상한 — fork bomb 방지 |
| `devices` | 어떤 장치 파일(`/dev/*`)에 접근 가능한지 |

### 2) cgroup v1 vs v2 — 가장 중요한 구조적 차이

- **v1**: 컨트롤러마다 **각자 독립된 계층(hierarchy)**을 따로 마운트해서 썼어요. "CPU 계층 따로, 메모리 계층 따로" 식이라 **같은 프로세스가 계층마다 다른 그룹에 속할 수 있어** 관리가 복잡하고, 컨트롤러마다 설정 파일 이름·동작 방식도 제각각이었어요.
- **v2**: **계층을 단 하나로 통일**했어요. 하나의 트리 안에 프로세스를 배치하고, 그 그룹에 원하는 컨트롤러를 `cgroup.subtree_control` 파일로 "붙였다 뗐다" 하는 방식이에요. 설정 파일 이름과 동작 규칙도 컨트롤러 간에 일관되게 정리됐어요. 리눅스 4.5부터 정식으로 도입됐고, 최근 배포판들의 기본값이에요.

### 3) 어디서 볼 수 있나

cgroup은 **가상 파일시스템**(`/sys/fs/cgroup/`)으로 노출돼요. 폴더를 만들면 그게 곧 그룹이 되고, 그 안의 `cpu.max`, `memory.max`, `pids.max` 같은 파일에 숫자를 써넣으면 그게 곧 제한값이 돼요. 즉 **"파일에 숫자 쓰기"**가 곧 자원 제한 설정이에요.

### 4) systemd·컨테이너와의 관계

- [[systemd-vs-systemctl-role]]에서 다뤘듯, systemd는 서비스마다 유닛을 관리하는데, 각 서비스는 자동으로 자신만의 cgroup에 배치돼요. 그래서 유닛 파일에 `CPUQuota=`, `MemoryMax=` 같은 지시어를 적으면 systemd가 이걸 그대로 해당 cgroup 파일에 반영해줘요.
- Docker에서 `docker run --memory=512m --cpus=2`처럼 옵션을 주면, Docker는 내부적으로 그 컨테이너 프로세스를 위한 cgroup을 만들고 `memory.max`, `cpu.weight` 같은 파일에 값을 써서 커널이 실제로 강제하게 만들어요. Kubernetes의 Pod 리소스 requests/limits도 결국 같은 방식으로 cgroup에 반영돼요.

### 5) 흔한 오해 — namespace와 다른 개념이에요

컨테이너 기술을 이야기할 때 cgroup과 **네임스페이스(namespace)**가 자주 같이 나오는데, 역할이 달라요.

- **네임스페이스** = "**무엇이 보이는가**"를 격리해요 (다른 컨테이너의 프로세스 목록, 네트워크, 파일시스템이 안 보이게).
- **cgroup** = "**얼마나 쓸 수 있는가**"를 제한해요 (CPU, 메모리 상한).

컨테이너의 "독립된 것처럼 보이면서도 자원은 제한된" 느낌은 이 두 기능이 **함께** 작동해서 나오는 결과예요.

## 요약

- cgroup은 **프로세스 그룹 단위로 CPU/메모리/디스크 I/O 등의 자원 사용을 제한·감시**하는 커널 기능이에요.
- v1은 컨트롤러마다 계층이 따로였고, v2는 **단일 계층**으로 통일돼 더 단순하고 일관성 있어졌으며, 최신 배포판의 기본값이에요.
- `/sys/fs/cgroup/` 아래 파일에 값을 쓰는 방식으로 동작하고, systemd·Docker·Kubernetes 모두 이 위에서 자원 제한 기능을 구현해요.
- "무엇이 보이는가"를 다루는 네임스페이스와 "얼마나 쓸 수 있는가"를 다루는 cgroup은 서로 다른 개념이지만, 함께 컨테이너 격리를 완성해요.

---

## 출처

- [cgroups(7) — Linux manual page](https://www.man7.org/linux/man-pages/man7/cgroups.7.html)
- [Control Group v2 — The Linux Kernel documentation](https://docs.kernel.org/admin-guide/cgroup-v2.html)
- [Migrating from CGroups V1 to CGroups V2 in Red Hat Enterprise Linux](https://access.redhat.com/articles/3735611)
- [Chapter 36. Understanding control groups — Red Hat Enterprise Linux 9](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/setting-limits-for-applications_monitoring-and-managing-system-status-and-performance)
- [About cgroup v2 — Kubernetes](https://kubernetes.io/docs/concepts/architecture/cgroups)
- [cgroups v2 resource limits with systemd — FDC Servers](https://fdcservers.net/blog/cgroups-v2-resource-limits-with-systemd)
- [How to Understand Docker Container Cgroups in Depth](https://oneuptime.com/blog/post/2026-02-08-how-to-understand-docker-container-cgroups-in-depth/view)
