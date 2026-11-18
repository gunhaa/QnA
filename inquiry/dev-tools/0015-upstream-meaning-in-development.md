# 개발에서 "업스트림(Upstream)"이란?

## 쉬운 설명

강물이 위(상류)에서 아래(하류)로 흐르듯이, 코드나 데이터가 시작되는 원천 쪽을 **업스트림(upstream)**, 그걸 받아서 쓰는 쪽을 **다운스트림(downstream)**이라고 불러요. "내가 어디서 물을 받아오는가"를 기준으로 정하는 상대적인 방향 개념이에요.

## 일반 설명

**업스트림/다운스트림**은 절대적으로 고정된 이름이 아니라, **두 대상 사이의 관계**에서 "누가 원천이고 누가 그것을 받아쓰는가"로 정해지는 상대적 개념이다. 어떤 저장소나 프로젝트도 관계에 따라 업스트림이 되기도, 다운스트림이 되기도 한다.

### 1. Git/GitHub에서의 upstream

- 오픈소스에 기여할 때 흔한 패턴: 원본 저장소를 **fork**해서 내 계정에 복제본을 만들고, 로컬에 clone한다.
  - `origin`: 내가 fork한 내 저장소(원격)
  - `upstream`: fork의 원본이 된 저장소(내가 반영을 "받아오는" 원천)
- 실제 명령어 예시:
  ```bash
  git remote add upstream https://github.com/원본-소유자/원본-저장소.git
  git fetch upstream
  git merge upstream/main   # 원본 저장소의 최신 변경을 내 브랜치에 반영
  ```
- 이렇게 원본 저장소의 변경사항을 내 fork로 "끌어오는(pull)" 방향이 상류→하류 흐름과 같아서, 원본을 upstream이라 부른다.
- 참고로 `git branch --set-upstream-to`처럼, 로컬 브랜치가 추적(tracking)하는 원격 브랜치를 가리킬 때도 "upstream branch"라는 표현을 쓴다. 이때는 fork 관계가 아니라 "내 로컬 브랜치가 어디서 push/pull 기준을 삼는가"를 뜻한다.

### 2. 오픈소스/의존성 관점의 upstream

- 내가 사용하는 라이브러리·프레임워크·OS 배포판의 **원조 프로젝트**를 upstream이라 부른다.
  - 예: React를 쓰는 내 앱 입장에서 React 프로젝트가 upstream, 내 앱은 downstream.
  - 예: Ubuntu는 Debian의 downstream, Rocky Linux는 RHEL(레드햇)의 downstream.
- "upstream에 패치를 보낸다(upstream a fix)"는 표현은, 내가 로컬에서 고친 버그 수정을 원본 프로젝트에 PR로 반영시켜 모두가 받는 공식 배포판에 포함시킨다는 뜻이다.
- "upstream maintainer"는 그 원천 프로젝트를 관리하는 사람을 가리킨다.

### 3. CI/CD·데이터 파이프라인 관점의 upstream

- 여러 단계(stage)로 이어지는 파이프라인에서, 먼저 실행되는 단계가 upstream, 그 결과를 받아 다음에 실행되는 단계가 downstream이다.
- 예: 데이터 수집 배치 작업(upstream)이 실패하면 이후의 집계·리포트 작업(downstream)도 영향을 받는다는 식으로 장애 전파 방향을 설명할 때 자주 쓰인다.

### 4. 리버스 프록시·API 게이트웨이·로드밸런서 관점의 upstream

- 이 맥락에서는 fork/파이프라인 이야기와 달리, **"클라이언트 요청을 실제로 처리해줄 백엔드 서버(군)"**를 upstream이라 부른다. Nginx/API 게이트웨이가 클라이언트로부터 요청을 받아 "위쪽(더 안쪽/뒤쪽)에 있는" 실제 애플리케이션 서버로 흘려보낸다는 뉘앙스다.
- **Nginx**: `upstream` 블록으로 백엔드 서버 그룹을 정의하고, `proxy_pass`로 그 그룹에 요청을 전달한다.
  ```nginx
  upstream backend_servers {
      least_conn;                 # 최소 연결 수 기준 로드밸런싱
      server 10.0.0.11:8080;
      server 10.0.0.12:8080;
      server 10.0.0.13:8080 backup;  # 장애 시에만 사용되는 예비 서버
  }

  server {
      location /api/ {
          proxy_pass http://backend_servers;
      }
  }
  ```
  - 기본은 라운드로빈(round-robin)이며, `ip_hash`(같은 클라이언트를 같은 서버로 고정), `least_conn`(연결 수가 가장 적은 서버 우선), `least_time`(응답이 가장 빠른 서버 우선) 등의 알고리즘을 선택할 수 있다.
  - Nginx는 이 구조에서 리버스 프록시이자 로드밸런서 역할을 하며, 클라이언트는 Nginx하고만 통신하고 실제 upstream 서버와는 직접 통신하지 않는다.
- **Kong Gateway**: `Upstream`이라는 엔티티 자체가 "가상 호스트명 + 여러 개의 `Target`(실제 백엔드 인스턴스 IP:포트) 묶음"을 의미한다. `Service`가 특정 `Upstream`을 가리키도록 설정하면, Kong이 헬스체크·서킷브레이커·로드밸런싱(라운드로빈, least-connections, consistent-hashing 등)을 자동으로 수행하며 여러 `Target` 사이에 트래픽을 분산한다.
- 즉 이 관점의 upstream은 "코드/변경사항의 원천"이 아니라 **"요청 트래픽이 최종적으로 도달해 처리되는 실제 서버 집합"**을 가리킨다는 점에서, Git/오픈소스 맥락의 upstream과 방향성 은유(상류→하류)는 같지만 가리키는 대상의 성격은 다르다.

### 핵심 정리

"upstream"의 공통 본질은 **"내가 지금 보고 있는 것보다 더 원천/앞 단계(혹은 실제 처리를 담당하는 뒷단)에 있는 대상"**이며, 무엇을 기준점으로 잡느냐(fork 관계, 로컬 브랜치, 의존 라이브러리, 파이프라인 단계, 리버스 프록시의 백엔드 서버군)에 따라 가리키는 대상만 달라진다. 항상 짝을 이루는 downstream과 함께 상대적으로 이해하는 것이 핵심이다.

---

Sources:
- [헷갈리는 Upstream과 Downstream | Engineering Blog by Dale Seo](https://daleseo.com/upstream-downstream/)
- [GitHub에서 협업을 위한 remote repository와 upstream 이해하기 | Hack IT](https://pers0n4.io/github-remote-repository-and-upstream/)
- [What Is Upstream in Git? Explained with Examples](https://tms-outsource.com/blog/posts/what-is-upstream-in-git/)
- [[Git] Upstream, Downstream, Origin - Data Engineer](https://wonyong-jang.github.io/git/2021/09/21/Github-Upstream-Downstream-Origin.html)
- [Git에서 upstream의 의미 - 홍가뤼의 개인위키](https://honggaruy.github.io/wiki/git-upstream-meaning/)
- [Module ngx_http_upstream_module - NGINX Docs](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
- [Using nginx as HTTP load balancer](https://nginx.org/en/docs/http/load_balancing.html)
- [HTTP Load Balancing | NGINX Documentation](https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/)
- [Upstreams - Kong Gateway | Kong Docs](https://developer.konghq.com/gateway/entities/upstream/)
- [Targets - Kong Gateway | Kong Docs](https://developer.konghq.com/gateway/entities/target/)
- [Load balancing with Kong Gateway | Kong Docs](https://developer.konghq.com/gateway/load-balancing/)
