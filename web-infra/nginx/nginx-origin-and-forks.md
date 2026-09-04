# nginx는 어떻게 태어났고, 어떤 자식들이 있을까?

## 태어난 이유 (생성 원리)

옛날 웹서버(Apache)는 손님(연결) 한 명당 직원(프로세스/스레드) 한 명을 붙였어요. 손님이 1만 명(**C10K 문제**, 1999년 Dan Kegel이 제기)이 몰리면 직원이 부족해서 가게가 멈춰버렸죠.

러시아 개발자 **Igor Sysoev**는 "직원 몇 명이 여러 테이블을 동시에 왔다갔다하며 서빙하면 되잖아?"라는 생각으로 nginx를 만들었어요(2004년 오픈소스 공개). 이게 바로 **이벤트 기반(Event-driven) 비동기 아키텍처**예요.

- CPU 코어 개수만큼만 **워커 프로세스(Worker Process)**를 만들어요 (손님 수만큼이 아니라!)
- 각 워커는 운영체제 커널의 **이벤트 큐(epoll/kqueue)**를 보면서, "누가 말 걸었다" 신호가 올 때만 반응해요
- 그래서 대기하느라 직원을 낭비(Context Switching 낭비)하지 않아요

→ 결과: 적은 자원으로 수만 명의 손님(동시 연결)을 거뜬히 처리.

## 파생된 오픈소스/상업용 시스템

nginx가 워낙 유명해지자, 여기서 갈라져 나오거나 위에 올라탄 자식들이 많이 생겼어요.

| 이름 | 관계 | 특징 |
|---|---|---|
| **Tengine** | nginx의 포크(Fork) | 알리바바(타오바오)가 대규모 이커머스 트래픽을 위해 2011년 오픈소스화. nginx 설정과 100% 호환 |
| **OpenResty** | nginx 코어 확장(포크는 아님) | nginx에 LuaJIT을 끼워 넣어서, 웹서버 안에서 직접 Lua 코드(로직)를 실행 가능하게 만듦 |
| **Angie** | nginx의 포크 | 원래 nginx 개발자들이 만든 커뮤니티 포크. NGINX Plus(상업판) 코드는 포함 안 함 |
| **Kong** | OpenResty 위에 구축 | OpenResty(=nginx+Lua)를 이용해 만든 **API 게이트웨이** 상용/오픈소스 제품 |
| **NGINX Plus** | nginx의 상업용 버전 | 로드밸런싱, 헬스체크, API 게이트웨이 등 엔터프라이즈 기능 추가. 현재 **F5** 소속 |
| **NGINX Ingress Controller** | nginx 활용 | 쿠버네티스(Kubernetes) 클러스터의 트래픽 관문으로 nginx를 사용 |

**한 줄 정리**
- nginx = "적은 직원으로 손님 몰림을 버티는" 이벤트 기반 서버
- Tengine·Angie = nginx 자체를 포크해서 기능 추가
- OpenResty·Kong = nginx 위에 프로그래밍 능력(Lua)을 얹어서 새 제품으로 발전
- NGINX Plus = 원조 회사가 만든 유료(상업용) 버전

**출처**
- [NGINX 역사 | nginxkorea](https://www.nginxkorea.co.kr/history)
- [C10K 문제와 NGINX 등장배경](https://velog.io/@secuwave/C10K-%EB%AC%B8%EC%A0%9C%EC%99%80-NGINX-%EB%93%B1%EC%9E%A5%EB%B0%B0%EA%B2%BD-eswubesd)
- [Tengine | Wikipedia](https://en.wikipedia.org/wiki/Tengine)
- [Similarities and Differences Between Angie and nginx](https://en.angie.software/news/articles/shodstva-i-razlichiya-angie-i-nginx/)
- [A Comprehensive Guide to Kong API Gateway](https://medium.com/@nanditasahu031/a-comprehensive-guide-to-kong-api-gateway-11cc374c1ce5)
- [The Ingress NGINX Alternative | NGINX Community Blog](https://blog.nginx.org/blog/the-ingress-nginx-alternative-open-source-nginx-ingress-controller-for-the-long-term)
