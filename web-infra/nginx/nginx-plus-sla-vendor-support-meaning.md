# "NGINX Plus는 기능보다 SLA·벤더 지원을 사는 것"이 무슨 뜻일까?

## 다섯 살에게 설명하듯

무료 nginx는 **동네 도서관에서 빌린 요리책**이에요. 요리법(기능)은 아주 훌륭하고 공짜지만, 요리하다가 막히면 물어볼 사람이 없어요. 인터넷 커뮤니티(포럼, GitHub 이슈)에 질문 올리고 누군가 답해주길 기다려야 해요. 오늘 답이 올지, 내일 올지, 아예 안 올지 아무도 약속 안 해줘요.

NGINX Plus는 **"24시간 전화 상담사가 딸린 유료 요리책 구독 서비스"**예요. 책 내용(기능)은 도서관 책보다 몇 가지가 더 들어있긴 하지만, 진짜 핵심은 "요리하다 막히면 **30분 안에** 전문 상담사가 전화 받는다"는 **약속(SLA)**을 사는 거예요.

## 기술적으로 풀어보면

### 1. SLA(Service Level Agreement, 서비스 수준 협약)란

**"문제가 생겼을 때 몇 분/몇 시간 안에 답변하겠다"는 계약서상의 숫자 약속**이에요. 검색 결과에 따르면:
- 오픈소스 nginx: **SLA 자체가 없음**. 커뮤니티 지원, 공개 문서, 셀프 트러블슈팅에 의존해야 하고, **응답 시간 보장도, 벤더에게 에스컬레이션(escalation, 상급 대응 요청)할 경로도 없어요.**
- NGINX Plus (24x7 Enterprise 등급, 연 $5,000 수준): **30분 SLA**가 붙어요. 즉 "장애 티켓을 접수하면 30분 안에 담당 엔지니어가 응답한다"는 게 계약 조건이에요.

### 2. 왜 "기능"보다 "지원"이 핵심이라고 말했나

NGINX Plus에만 있는 기능들 — 액티브 헬스체크, 세션 퍼시스턴스(session persistence), 무중단 설정 변경 API(리로드 없이 업스트림 서버 추가/제거), 실시간 모니터링 대시보드, JWT 인증 — 은 분명 유용해요. 하지만 이 기능들 상당수는:
- 지난 대화에서 다룬 **OpenResty + lua-resty 생태계**(예: `lua-resty-upstream-healthcheck`, `lua-resty-jwt` 등)로 **오픈소스로도 유사하게 구현 가능**해요.
- 즉, "이 기능은 돈 주지 않으면 절대 못 만든다"가 아니라, **"엔지니어링 시간을 들이면 직접 만들 수 있는데, 그 시간과 유지보수 리스크를 돈으로 사는 것"**에 가까워요.

반면 **"장애 났을 때 30분 안에 NGINX 코어를 직접 만든 엔지니어가 전화를 받는다"**는 건 돈으로만 살 수 있어요. 커뮤니티가 아무리 친절해도 계약서상 응답 시간을 보장해줄 순 없으니까요.

### 3. 비유를 기술 용어로 다시 정리하면

| 축 | 오픈소스 nginx | NGINX Plus |
|---|---|---|
| 라이선스 비용 | $0 | 인스턴스당 연 $2,500~$5,000+ |
| 장애 대응 | 커뮤니티 포럼, 자체 해결 | 벤더 지원팀, **SLA로 응답시간 보장** |
| 에스컬레이션 경로 | 없음 | 있음 (엔지니어 직접 연결) |
| 기능 격차 | 직접 구현/OSS 모듈로 상당 부분 커버 가능 | 이미 구현되어 "즉시 사용" 가능 |
| 실제로 지불하는 대상 | (해당 없음) | **위험 이전(risk transfer)** — 장애 시 책임과 대응을 벤더에게 넘기는 것 |

즉, 총소유비용(TCO) 관점에서 보면 오픈소스는 "라이선스비 $0"이지만 그만큼 **엔지니어링 시간·장애 대응·장기 유지보수 비용이 내부로 흡수**되고, NGINX Plus는 "직접적인 금전 비용"이 생기는 대신 **운영 복잡도와 다운타임 리스크를 벤더에게 이전**하는 구조예요.

## 한 줄 요약

> NGINX Plus 요금의 본질은 "이 기능은 돈 내야만 쓸 수 있다"가 아니라, **"장애가 터졌을 때 우리 회사가 아니라 F5가 시계를 보며 30분 안에 대응할 책임을 진다"**는 **보험(계약상 책임과 응답시간 보장)**을 사는 것에 가까워요. 그래서 비즈니스 크리티컬한(SLA를 어기면 우리 회사도 고객에게 위약금을 물어야 하는) 서비스일수록 이 "돈으로 산 확실성"의 가치가 커져요.

Sources:
- [NGINX Vs NGINX Plus: Why Upgrade from Open Source to Commercial Version - Techjockey](https://www.techjockey.com/blog/nginx-vs-nginx-plus)
- [How much does NGINX cost? - Sirius Open Source](https://www.siriusopensource.com/en-us/blog/how-much-does-nginx-cost)
- [NGINX vs. NGINX Plus: Why Upgrade from Open Source to Commercial Version - Managed Server](https://www.managedserver.eu/nginx-vs-nginx-plus-why-upgrade-from-open-source-to-commercial-version/)
- [Nginx vs Nginx Plus: Key Differences Explained - SkillVeris](https://www.skillveris.com/interview-questions/nginx/nginx-vs-nginx-plus)
