# nginx 워커는 정말 각자 독립된 이벤트 루프를 가질까?

## 결론부터

**네, 맞아요.** nginx는 워커(worker) 프로세스마다 **각자 단 하나씩**의 이벤트 루프(event loop)를 가지고 있고, 이 워커들은 서로 정보를 공유하지 않는 **독립적인 구조**예요. CPU 코어를 여러 워커가 나눠 쓰는 게 아니라, **워커 1개 = 이벤트 루프 1개 = (보통) CPU 코어 1개**가 짝을 이루는 구조입니다.

## 다섯 살에게 설명하듯

식당에 웨이터(worker)가 4명 있다고 생각해보세요. 각 웨이터는 자기만의 주문 노트(event loop)를 하나씩 들고 다녀요. 한 웨이터가 다른 웨이터의 노트를 보거나 같이 쓰지 않아요. 대신 각자 자기 담당 테이블(connection)들을 혼자 빠릿빠릿하게 돌면서 "물 필요하세요?", "주문 나왔어요!" 하고 처리하죠. 한 손님이 요리 나오길 기다리는 동안(I/O 대기) 웨이터는 멍하니 서 있지 않고 바로 옆 테이블로 가서 다른 손님을 응대해요.

## 기술적으로 풀어보면

- **마스터-워커 구조(master-worker architecture)**: nginx를 켜면 **마스터 프로세스(master process)** 하나가 설정 파일을 읽고, `fork()` 시스템 콜로 자기 자신을 복제해서 **워커 프로세스(worker process)**들을 만들어요. 마스터는 실제 트래픽 처리는 하지 않고, 워커들을 관리(재시작, 설정 리로드 등)하는 역할만 해요.
- **워커 = 독립된 단일 스레드 프로세스**: 각 워커는 별개의 OS 프로세스이고, 그 안에서는 **싱글 스레드(single-threaded)**로 동작해요. 스레드가 여러 개가 아니라 "워커 하나당 실행 흐름 하나"인 거예요.
- **이벤트 루프 = 논블로킹 I/O 감시자**: 이 하나의 스레드 안에서 워커는 **이벤트 루프**를 돌려요. 소켓들을 전부 논블로킹(non-blocking) 모드로 설정해두고, Linux에서는 `epoll`, BSD/macOS에서는 `kqueue` 같은 커널 기능에 "이 소켓들 중 누가 준비되면 알려줘"라고 등록만 해둬요. 그러고는 대기하다가 준비된 연결만 골라서 처리하니, 수천 개 연결을 기다리면서도 CPU를 낭비하지 않아요.
- **워커 간 완전한 독립성**: 각 워커는 자기만의 커넥션 풀(connection pool)과 이벤트 루프를 따로 가지고 있어서, 워커끼리 복잡한 프로세스 간 통신(IPC)을 할 필요가 없고 공유 자원을 두고 경쟁(contention)할 일도 줄어들어요. 그래서 멀티코어 서버에서 `worker_processes` 설정값만큼 워커를 늘리면, 각 워커가 코어 하나씩을 거의 독점하며 선형적으로 처리량이 늘어나는 구조가 돼요.
- 이 구조 덕분에 워커 하나가 초당 최대 수만 건의 요청을 처리할 수 있고, 스레드/프로세스를 매 연결마다 새로 만드는 전통적인 방식보다 훨씬 적은 오버헤드로 수백만 커넥션까지 확장할 수 있어요.

## 요약

| 항목 | 내용 |
|---|---|
| 프로세스 관계 | 마스터 1개 → 워커 N개 (fork로 생성) |
| 워커 내부 | 싱글 스레드 |
| 이벤트 루프 | 워커 1개당 1개, 서로 독립적 |
| 커널 메커니즘 | epoll(Linux) / kqueue(BSD, macOS) |
| 워커 간 통신 | 기본적으로 없음 (공유 자원 최소화) |

Sources:
- [Inside NGINX: How We Designed for Performance & Scale – NGINX Community Blog](https://blog.nginx.org/blog/inside-nginx-how-we-designed-for-performance-scale)
- [NGINX Process Model - Master-Worker Architecture Guide - NGINX Wiki](https://nginx-wiki.getpagespeed.com/architecture/process-model/)
- [Nginx: The Secret Behind Handling Thousands of Connections with Just a Few Workers - Medium](https://medium.com/pickme-engineering-blog/nginx-the-secret-behind-handling-thousands-of-connections-with-just-a-few-workers-68c92bcd441b)
- [Nginx Internals: An In-Depth Look at Connection Processing - codedamn](https://codedamn.com/news/backend/nginx-connection-processing)
- [Understanding Nginx Worker Architecture](https://mohitmishra786.github.io/chessman/2024/12/29/Understanding-NGINX-Worker-Architecture.html)
