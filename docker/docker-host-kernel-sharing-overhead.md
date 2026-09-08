# 도커는 host 커널을 그대로 쓰는가? 오버헤드는 없는가?

## 결론부터

**네, 맞아요. 도커(Docker) 컨테이너는 host의 커널(Kernel)을 그대로 빌려 씁니다.** 커널을 새로 만들지 않기 때문에 VM(가상머신)보다 오버헤드가 훨씬 적어요. 다만 "완전히 0"은 아니고, 아주 작은 수준의 오버헤드는 남아있어요.

## 한 줄 비유

VM은 **"섬을 통째로 하나 더 만드는 것"**이고, 도커는 **"같은 섬 안에 칸막이(파티션)를 쳐서 방을 나누는 것"**이에요.

- VM: 섬 하나마다 자기만의 왕(커널)이 따로 있어요. 왕을 새로 만드느라 시간과 자원이 많이 들어요.
- 도커: 섬에는 왕(커널)이 딱 한 명(host 커널)뿐이에요. 컨테이너들은 그 왕 밑에서 "각자 자기 방만 보인다"고 착각하게 만든 칸막이일 뿐이에요.

## 왜 커널을 bypass하지 않고 공유하는가?

도커 컨테이너는 사실 **좀 특별하게 격리된 리눅스 프로세스**일 뿐이에요. VM처럼 하이퍼바이저(Hypervisor)가 가짜 하드웨어와 가짜 커널을 통째로 흉내내는 게 아니라, host 리눅스 커널이 제공하는 두 가지 기능을 조합해서 "격리된 것처럼 보이게" 만들어요.

### 1. Namespace — "안 보이게" 만드는 칸막이
`os-fundamentals/`에서 다룬 [[terminal-keystroke-input-pipeline|커널]]이 제공하는 기능 중 하나예요. 컨테이너마다 PID(프로세스 번호), 네트워크, 마운트 경로 등을 따로 보이게 나눠줘요. 컨테이너 안에서 `ps`를 치면 자기 자신만 1번 프로세스처럼 보이지만, 사실은 host에서 보면 그냥 평범한 프로세스 중 하나예요.

### 2. cgroups — "얼마나 쓸지" 제한하는 저울
이미 정리해둔 [[cgroups-explained|cgroup 문서]]에서 설명한 그 기능이 바로 도커가 CPU/메모리/디스크 I/O를 컨테이너별로 제한하는 데 쓰는 도구예요. 도커 컨테이너를 만들 때 `--memory`, `--cpus` 같은 옵션을 주면, 도커가 내부적으로 cgroup을 만들어서 커널에게 "이 프로세스 그룹은 여기까지만 써도 돼"라고 부탁하는 거예요.

즉 **도커 엔진(dockerd)이 하는 일은 새로운 커널을 만드는 게 아니라, host 커널에게 "namespace 쳐주고 cgroup으로 제한해줘"라고 시스템 콜(clone(2) 등)로 부탁하는 것뿐**이에요.

## 오버헤드는 정말 없을까?

완전히 0은 아니지만 VM에 비하면 무시할 수준이에요.

| 항목 | VM | 도커 컨테이너 |
|---|---|---|
| 커널 | 게스트마다 별도 커널 | host 커널 1개 공유 |
| 부팅 시간 | 수십 초~분 단위 | 수십~수백 ms (커널 clone 수준) |
| 메모리 최소치 | 512MB~2GB | 10~50MB |
| CPU 오버헤드 | 하드웨어 에뮬레이션/가상화 계층 있음 | 하드웨어 에뮬레이션 없음, 시스템 콜 몇 개 정도 |
| 격리 강도 | 강함 (커널 자체가 다름) | 상대적으로 약함 (커널을 공유하므로 커널 취약점이 있으면 컨테이너 탈출 위험) |

남아있는 미세한 오버헤드는 대략 이런 것들이에요:
- **네트워크**: 컨테이너의 가상 네트워크 인터페이스(veth)를 거쳐 host 네트워크로 나가는 경로가 한 단계 더 있어요.
- **파일시스템**: 도커 이미지는 보통 OverlayFS 같은 계층형(layered) 파일시스템을 쓰는데, 레이어를 겹쳐서 보여주는 데 아주 약간의 계산이 들어가요.
- **cgroup 카운팅**: 자원 사용량을 계속 측정해서 제한을 넘는지 체크하는 데 미세한 CPU 비용이 있어요.

이 정도는 "VM처럼 커널 전체를 새로 부팅하는 비용"에 비하면 오차 범위 수준이라, 실무에서는 보통 "컨테이너는 거의 네이티브 성능"이라고 표현해요.

## 트레이드오프 요약

- **장점**: 커널을 공유하니까 빠르고 가볍다 (거의 오버헤드 없음).
- **단점**: 커널을 공유하니까 격리가 VM보다 약하다. host 커널에 취약점이 있으면 컨테이너 하나가 뚫렸을 때 다른 컨테이너나 host 자체에 영향을 줄 위험이 VM보다 크다.

그래서 실무에서는 "VM(강한 격리, 무거움) 위에 도커 컨테이너(빠른 배포, 가벼움)를 올리는" 이중 구조를 많이 써요. 예: AWS EC2(VM) 위에서 도커를 돌리는 식.

## Sources
- [Docker vs Virtual Machines (VMs) (2026) | PerfectNotes](https://perfectnotes.org/notes/ai-cloud-security/docker-vs-vm)
- [How Docker Containers Work Under the Hood: Namespaces and Cgroups - Atlantbh](https://atlantbh.com/blog/how-docker-containers-work-under-the-hood-namespaces-and-cgroups/)
- [Namespaces vs. Cgroups: How Docker Actually Isolates Code](https://doogal.dev/how-docker-actually-works-a-deep-dive-into-namespaces-and-cgroups)
- [Docker Under the Hood: Namespaces, Cgroups, and Layered Filesystems Explained - DEV Community](https://dev.to/michaelwolfenberger/docker-under-the-hood-namespaces-cgroups-and-layered-filesystems-explained-1414)
