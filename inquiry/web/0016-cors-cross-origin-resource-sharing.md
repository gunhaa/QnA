# CORS(Cross-Origin Resource Sharing)란 무엇인가

## 쉬운 설명

여러분 집(브라우저)에 택배(데이터)가 오면, 문 앞의 경비원(브라우저의 보안 정책)이 **"이 택배, 우리 집이 주문한 게 맞아?"** 를 확인합니다.

기본적으로 경비원은 **우리 집 주소로 보낸 택배만** 통과시키고, 다른 동네(다른 도메인)에서 온 택배는 무조건 막습니다. 이게 바로 **동일 출처 정책(Same-Origin Policy)**입니다.

그런데 다른 동네 가게(다른 도메인의 서버)가 "우리는 특정 손님(특정 origin)에게는 배송을 허락합니다"라고 **미리 허가증(CORS 응답 헤더)** 을 붙여서 보내면, 경비원은 그 허가증을 확인하고 통과시켜줍니다. **CORS는 이 "허가증 제도"** 를 말합니다 — 서버가 "이 출처는 나한테 요청해도 돼"라고 명시적으로 허락하는 메커니즘입니다.

---

## 일반 설명

### 0. 역사 — 어떤 사건/시나리오를 막기 위해 생겼나

CORS를 이해하려면 시간 순서로 **"동일 출처 정책(SOP)이 왜 먼저 생겼는가" → "그 SOP가 너무 빡빡해서 CORS가 왜 나중에 필요해졌는가"** 두 단계를 봐야 합니다.

#### ① 1995년 — SOP의 탄생: 자바스크립트가 만든 새로운 위협

1995년 Netscape가 브라우저에 **자바스크립트**를 처음 넣으면서, 웹페이지가 단순한 문서가 아니라 "실행되는 프로그램"이 됐습니다. 그런데 이게 곧바로 심각한 보안 구멍을 만들었습니다.

- 브라우저 창(프레임)이 여러 개 열려 있을 때, 한 페이지의 스크립트가 **다른 창/프레임의 DOM에 자유롭게 접근**할 수 있었습니다.
- 예를 들어 사용자가 은행 사이트를 한 창에서 열어두고, 동시에 악성 사이트를 다른 창/`<iframe>`으로 열었다면 — 악성 스크립트가 **은행 창의 DOM을 읽어 계좌 정보, 입력 중인 비밀번호 등을 훔쳐볼 수 있는** 구조였습니다.
- 이를 막기 위해 **Netscape Navigator 2.02(1995)**가 "스크립트는 자신과 같은 출처(origin)의 문서에만 접근할 수 있다"는 규칙, 즉 **동일 출처 정책(Same-Origin Policy)**을 세계 최초로 도입했습니다. 원래 목적을 그대로 옮기면 **"한 서버의 스크립트가 다른 서버 문서의 속성에 함부로 접근하는 것을 자동으로 막는다"**는 것이었습니다.

즉 SOP는 애초부터 "다른 사이트의 데이터를 훔쳐보는 것"을 막기 위한 방어선이었고, 이게 오늘날까지 웹 보안의 가장 근본적인 전제로 남아 있습니다.

#### ② 2000년대 중반 — AJAX/Web 2.0 시대, SOP가 너무 빡빡해지다

2000년대 들어 `XMLHttpRequest`(XHR)가 등장하면서 페이지 새로고침 없이 서버와 비동기 통신하는 **AJAX** 방식이 널리 퍼졌고, 이른바 "Web 2.0" 흐름 속에서 **서로 다른 도메인의 서비스(지도 API, 위젯, 서드파티 데이터)를 한 페이지에서 조합하는 매시업(mashup)** 수요가 폭증했습니다.

문제는 SOP가 이런 **정당한** 크로스 오리진 요청까지도 전부 차단한다는 점이었습니다. 그래서 개발자들은 SOP를 우회하는 편법을 썼습니다.

- **JSONP(JSON with Padding)**: `<script>` 태그는 SOP의 제약을 받지 않는다는 허점을 이용해, 데이터를 스크립트 형태로 받아오는 기법. 하지만 이건 **응답을 검증할 방법이 없고, 악성 스크립트를 그대로 실행하는 것과 다름없어 보안적으로 위험**했습니다.
- 이런 임시방편들이 난립하자, "브라우저 차원에서 안전하게 크로스 오리진 요청을 허용/거부할 수 있는 표준"이 필요해졌습니다.

#### ③ 2005~2014년 — CORS 표준화

- **2005년경** Mozilla 개발자들(특히 Alex Russell 등)이 Access-Control(초기 CORS 개념)을 처음 제안했고, **W3C의 Anne van Kesteren**이 이를 이어받아 명세로 발전시켰습니다.
- **2006년 4월** W3C가 `XMLHttpRequest` Working Draft를 발표했고, **2008년 XMLHttpRequest Level 2** 초안에서 "크로스 사이트 요청을 허용하는 메커니즘"이 추가되었습니다.
- 2009~2014년 사이 "Cross-Origin Resource Sharing"이라는 별도 명세로 다듬어지며 오늘날의 `Access-Control-Allow-Origin` 등 헤더 체계가 자리잡았고, 이후 WHATWG의 **Fetch 표준**에 통합되었습니다.

CORS가 막으려는 핵심 시나리오를 한 문장으로 요약하면: **"사용자가 로그인해 둔 사이트(A)의 API를, 사용자가 열어본 적도 없는 악성 사이트(B)의 스크립트가 사용자 브라우저를 통해 몰래 호출하고 그 응답(개인정보, 계좌 정보 등)을 훔쳐가는 것"** 을 막기 위함입니다. 브라우저는 요청에 A 사이트의 쿠키(세션)를 자동으로 실어 보내기 때문에, SOP/CORS가 없다면 B는 사용자 대신 인증된 요청을 마음대로 보내고 그 결과를 읽어갈 수 있습니다.

★ Insight ─────────────────────────────────────
SOP와 CORS는 **같은 위협을 막기 위한 하나의 연속선**입니다. SOP가 "기본적으로 전부 차단"이라는 강한 방어선을 세웠고(1995), 그로 인해 정당한 크로스 오리진 통신까지 막히자, CORS가 "서버가 검증 가능한 방식으로 예외를 선언할 수 있는 통로"를 표준화한 것(2006~2014)입니다. 즉 CORS의 탄생 자체가 "완전 차단은 너무 과하다, 그렇다고 JSONP 같은 편법은 위험하다"는 딜레마를 해결하려는 절충안이었습니다.
─────────────────────────────────────────────────

---

### 1. 왜 필요한가 — 동일 출처 정책(SOP)이 먼저다

CORS를 이해하려면 먼저 브라우저의 기본 보안 정책인 **동일 출처 정책(Same-Origin Policy, SOP)**을 알아야 합니다.

- **출처(Origin)** = `프로토콜 + 호스트(도메인) + 포트`의 조합. 셋 중 하나라도 다르면 "다른 출처"입니다.
  - `https://a.com` vs `http://a.com` → 프로토콜 다름 → 다른 출처
  - `https://a.com` vs `https://b.com` → 호스트 다름 → 다른 출처
  - `https://a.com:443` vs `https://a.com:8080` → 포트 다름 → 다른 출처
- SOP는 기본적으로 **자바스크립트가 다른 출처의 리소스에 접근하는 것을 차단**합니다. 이는 `evil.com`이 사용자 브라우저에서 몰래 `bank.com`의 API를 호출해 응답을 훔쳐보는 것을 막기 위한 브라우저 내장 방어 기제입니다.

문제는, 현대 웹 아키텍처(프론트엔드/백엔드 분리, 마이크로서비스, CDN, 서드파티 API 연동)에서는 **정당하게 다른 출처끼리 통신해야 하는 경우**가 매우 흔하다는 점입니다. **CORS는 이 SOP를 "서버가 명시적으로 허락한 범위 내에서" 완화해주는 표준 메커니즘**입니다. 즉, CORS는 SOP를 깨뜨리는 게 아니라, **서버가 안전하게 예외를 선언할 수 있게 해주는 통제된 통로**입니다.

★ Insight ─────────────────────────────────────
CORS를 "브라우저를 막는 성가신 규칙"으로 오해하기 쉽지만, 실제로는 **서버 측의 opt-in(선택적 허용) 메커니즘**입니다. CORS 헤더가 없으면 기본값은 "차단"이고, 서버가 헤더를 붙여야만 브라우저가 예외적으로 응답을 자바스크립트에 넘겨줍니다. 그리고 이건 **오직 브라우저에서만 강제되는 정책**이라, 서버 대 서버 통신(curl, Postman, 백엔드끼리의 API 호출)에는 CORS 자체가 적용되지 않습니다 — 응답은 도착하지만, 그걸 "막는" 주체가 브라우저이기 때문입니다.
─────────────────────────────────────────────────

### 2. 요청은 크게 두 종류로 나뉜다: 단순 요청 vs 프리플라이트 요청

#### ① 단순 요청 (Simple Request)

브라우저가 별도 확인 절차 없이 바로 실제 요청을 보내는 경우입니다. 다음 조건을 **모두** 만족해야 합니다.

- 메서드가 `GET`, `HEAD`, `POST` 중 하나
- 요청 헤더가 CORS-안전 목록(`Accept`, `Accept-Language`, `Content-Language`, `Content-Type`, `Range` 등)에 속한 것만 사용
- `Content-Type`이 `application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain` 중 하나

이 경우 브라우저는 요청에 `Origin` 헤더를 자동으로 붙여서 바로 보내고, 응답에 `Access-Control-Allow-Origin`이 요청 출처와 일치하는지 확인한 뒤 자바스크립트에 응답을 넘길지 결정합니다.

#### ② 프리플라이트 요청 (Preflight Request)

위 조건을 하나라도 벗어나면(예: `PUT`/`DELETE` 메서드, `application/json` Content-Type, 커스텀 헤더인 `Authorization` 추가 등) 브라우저는 **실제 요청 전에 `OPTIONS` 메서드로 사전 확인 요청**을 먼저 보냅니다.

```
OPTIONS /api/orders HTTP/1.1
Origin: https://frontend.example.com
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: Content-Type, Authorization
```

서버가 이를 허용한다면 다음과 같이 응답합니다.

```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://frontend.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

프리플라이트가 통과해야만 브라우저는 실제 요청(`PUT /api/orders`)을 전송합니다. `Access-Control-Max-Age`는 이 프리플라이트 결과를 브라우저가 캐시하는 시간(초)으로, 매 요청마다 OPTIONS 왕복이 발생하는 오버헤드를 줄여줍니다(브라우저마다 상한값이 있어 그 이상 값은 잘려서 적용됩니다).

---

### 3. 핵심 응답 헤더 정리

| 헤더 | 역할 |
|---|---|
| `Access-Control-Allow-Origin` | 이 리소스에 접근을 허용할 출처. 특정 출처 문자열 또는 `*`(모든 출처, 단 자격 증명 요청에는 사용 불가) |
| `Access-Control-Allow-Methods` | 허용하는 HTTP 메서드 목록 (프리플라이트 응답에서 사용) |
| `Access-Control-Allow-Headers` | 허용하는 요청 헤더 목록 (프리플라이트 응답에서 사용) |
| `Access-Control-Allow-Credentials` | 쿠키·인증 헤더 등 자격 증명을 포함한 요청을 허용할지 (`true`일 때만 허용) |
| `Access-Control-Expose-Headers` | 자바스크립트가 읽을 수 있도록 노출할 응답 헤더 목록 (기본적으로 일부 헤더만 노출됨) |
| `Access-Control-Max-Age` | 프리플라이트 응답을 캐시할 시간(초) |

### 4. 자격 증명(Credentials)이 포함된 요청 — 가장 헷갈리는 지점

쿠키, `Authorization` 헤더, TLS 클라이언트 인증서 등을 포함하는 요청(`fetch(url, { credentials: 'include' })`)은 별도 규칙이 붙습니다.

- 브라우저는 이런 요청에 자동으로 쿠키를 실어 보내지만, 응답을 자바스크립트가 읽으려면 **서버가 반드시 `Access-Control-Allow-Credentials: true`를 응답해야** 합니다.
- 이때 **`Access-Control-Allow-Origin`은 `*`를 쓸 수 없고, 반드시 구체적인 출처 값**이어야 합니다(스펙상 명시적으로 금지됨). `*`와 `true`를 같이 쓰면 브라우저가 응답을 거부합니다.
- 이는 "자격 증명이 실린 응답을 아무 출처에나 노출시키면 안 된다"는 보안 원칙 때문입니다 — 그렇지 않으면 로그인된 사용자의 쿠키를 아무 사이트나 훔쳐볼 수 있게 됩니다.

### 4-1. "요청 쪽에서 헤더를 조작해서 `*`를 만들어내면 되는 거 아닌가?"

아주 자연스러운 의심이지만, 결론부터 말하면 **안 됩니다** — 다만 이유를 정확히 알아야 진짜 위험 지점이 어딘지 보입니다. 핵심은 **CORS에 관여하는 두 헤더를 "누가 쓰는가"가 서로 다르다**는 것입니다.

| 헤더 | 누가 쓰는가 | 조작 가능한가 |
|---|---|---|
| `Origin` (요청 헤더) | **브라우저가 자동으로** 붙임 | 페이지의 자바스크립트는 절대 수정 불가 — Fetch 표준에서 `Origin`은 **금지된 헤더 이름(forbidden header name)**으로 분류되어 있어, `fetch()`나 `XMLHttpRequest`로 임의 값을 넣을 수 없음 |
| `Access-Control-Allow-Origin` (응답 헤더) | **목적지 서버가** 결정 | 공격자 페이지는 이 값을 만들어내지 못함 — 이건 공격자가 아니라 **공격 대상 서버**가 응답하는 값이기 때문 |

즉 "요청자가 헤더를 조작해서 `*`를 만든다"는 시나리오 자체가 성립하지 않습니다. 공격자는 자기가 통제하는 페이지(`evil.com`)의 자바스크립트만 조작할 수 있을 뿐, `Origin`은 브라우저가 강제로 실제 페이지 출처로 채우고, `Access-Control-Allow-Origin`은 공격 대상 서버(`bank.com`)만 결정할 수 있는 값이라 공격자가 손댈 수 없습니다.

(단, curl·Postman·서버 코드 같은 **브라우저가 아닌 클라이언트**는 `Origin`을 마음대로 설정할 수 있습니다. 하지만 이는 CORS를 "우회"하는 게 아닙니다 — CORS는 애초에 브라우저에서만 강제되는 정책이고, 비브라우저 클라이언트에는 피해자의 쿠키/세션이 자동으로 실리지 않으므로 애초에 CORS가 막으려는 공격 시나리오(피해자 세션 도용)와 무관합니다.)

**그럼 실제로 CORS가 뚫리는 진짜 경로는 뭘까?** — 헤더 위조가 아니라 **서버 설정 실수(misconfiguration)**입니다. 실무에서 가장 흔한 취약점 패턴은 다음과 같습니다.

- **Origin 반사(Reflection) + Credentials 허용**: 서버가 허용 목록을 제대로 검증하지 않고, 요청에 실린 `Origin` 값을 **그대로 복사해서** `Access-Control-Allow-Origin`에 반사하면서 동시에 `Access-Control-Allow-Credentials: true`까지 응답하는 경우. 이러면 스펙상 `*`를 못 쓴다는 제약을 "매 요청마다 그 출처값을 그대로 되돌려주는" 방식으로 **사실상 우회**하게 되어, `evil.com`이 보낸 요청에도 `Access-Control-Allow-Origin: https://evil.com` + `Allow-Credentials: true`가 응답되고, 브라우저는 이를 정당한 허용으로 판단해 피해자의 쿠키가 실린 응답을 `evil.com`의 스크립트에 그대로 넘겨줍니다. 실제로 이 패턴 때문에 개인정보 API 응답, 심지어 API 키가 유출된 버그바운티 사례들이 다수 보고되어 있습니다.
- **`null` origin 허용**: 샌드박스 iframe이나 `file://` 페이지는 `Origin: null`로 요청을 보내는데, 서버가 편의상 `null`을 허용 목록에 넣어두면 공격자가 손쉽게 `null` 출처를 만들어 우회할 수 있습니다.
- **느슨한 허용 목록 정규식**: `*.example.com`을 허용하려다 정규식을 잘못 짜서 `evil-example.com`이나 `example.com.evil.com`까지 매치되게 만드는 실수.

즉, CORS의 방어선이 뚫리는 건 "브라우저의 헤더 강제 규칙이 뚫려서"가 아니라, **서버가 허용 출처를 검증하는 로직 자체를 허술하게 짜서**입니다. 브라우저 쪽 신뢰 모델(Origin은 위조 불가, ACAO는 공격자가 못 씀)은 견고하고, 실제 사고는 항상 "서버가 뭘 허용한다고 잘못 응답했는가"에서 발생합니다.

★ Insight ─────────────────────────────────────
CORS 보안 모델은 "브라우저가 정직한 심판, 서버가 정직한 판정자"라는 두 신뢰 축 위에 서 있습니다. 공격자는 이 둘 중 어느 쪽도 아니라서 헤더 위조로는 뚫을 수 없습니다. 그래서 CORS 관련 실제 취약점을 찾을 때 보안 엔지니어들은 "헤더를 위조할 수 있는가"가 아니라 **"서버의 허용 로직(allowlist)이 요청을 신뢰할 수 없는 값(반사된 Origin, null, 느슨한 정규식)에 의존하고 있는가"** 를 점검합니다.
─────────────────────────────────────────────────

### 5. CORS와 CSRF의 관계 — 자주 혼동되는 지점

CORS는 **"응답을 자바스크립트가 읽을 수 있는가"** 를 통제할 뿐, **"요청 자체가 서버에 도달하는가"** 를 막지는 못합니다. 즉 `<form>` 태그의 단순 POST나 `<img src>` 같은 요청은 CORS 정책과 무관하게 서버까지 도달합니다(응답을 읽지 못할 뿐). 그래서 CSRF(Cross-Site Request Forgery) 공격을 막으려면 CORS 설정만으로는 부족하고, **CSRF 토큰, `SameSite` 쿠키 속성** 같은 별도 방어가 필요합니다. CORS를 "만능 보안 장치"로 오해하지 않는 게 중요합니다.

### 6. 2026년 시점 최신 동향 — Private Network Access (PNA)

최근 Chrome을 중심으로 **Private Network Access(PNA, 구 CORS-RFC1918)** 라는 확장이 진행되고 있습니다.

- 공인 인터넷 사이트(예: `evil.com`)에서 사용자의 **사설망(내부 라우터, localhost, 사내 서버 등)** 으로 향하는 요청을 보낼 때, 별도의 프리플라이트를 강제합니다.
- 이 프리플라이트에는 `Access-Control-Request-Private-Network: true` 헤더가 실리고, 대상 서버는 `Access-Control-Allow-Private-Network: true`로 명시적으로 허용해야만 요청이 진행됩니다.
- 배경은 CSRF 공격이 라우터 등 **인증 체계가 허술한 사설망 장비**를 대상으로 실제 수십만 명 규모의 피해를 낸 사례들이 있었기 때문이며, 기존 CORS가 "출처"만 검사하고 "네트워크 위치(공인망 vs 사설망)"는 검사하지 않던 허점을 메우는 조치입니다.
- Chrome은 이를 단계적으로 강제화(deprecation trial → 기본 차단)하는 방향으로 진행 중이므로, 사내망 서비스에 웹 프론트를 연동하는 경우 이 정책 변화를 주시할 필요가 있습니다.

### 7. 자주 나는 에러와 원인

| 에러 메시지(콘솔) | 주된 원인 |
|---|---|
| `No 'Access-Control-Allow-Origin' header is present` | 서버가 CORS 헤더 자체를 응답하지 않음(가장 흔한 케이스) |
| `The value of the 'Access-Control-Allow-Origin' header ... must not be the wildcard '*'` | 자격 증명 요청인데 서버가 `*`를 응답함 |
| `Method ... is not allowed by Access-Control-Allow-Methods` | 프리플라이트 응답에 실제 사용하려는 메서드가 빠짐 |
| `Request header field ... is not allowed by Access-Control-Allow-Headers` | 프리플라이트 응답에 커스텀 헤더(`Authorization` 등)가 빠짐 |
| `CORS preflight channel did not succeed` | OPTIONS 요청 자체가 네트워크 오류/서버 다운/리다이렉트 등으로 실패함 |

---

## Sources

- [Same-origin policy — Wikipedia](https://en.wikipedia.org/wiki/Same-origin_policy)
- [Origin's Origin Story: a Brief History of Web Content Origin — Dan Tracy, Medium](https://medium.com/@daniel.benjamin.tracy/origins-origin-story-the-history-of-web-content-origin-733d76a8f8fd)
- [XMLHttpRequest — Wikipedia](https://en.wikipedia.org/wiki/XmlHttpRequest)
- [CORS — W3C Wiki](https://www.w3.org/wiki/CORS)
- [Fetch Standard — WHATWG](https://www.w3.org/TR/cors/)
- [Cross-Origin Resource Sharing (CORS) — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
- [Forbidden request header — MDN Glossary](https://developer.mozilla.org/en-US/docs/Glossary/forbidden_header_name)
- [Exploiting CORS misconfigurations for Bitcoins and bounties — PortSwigger Research](https://portswigger.net/research/exploiting-cors-misconfigurations-for-bitcoins-and-bounties)
- [CORS Misconfigurations: Advanced Exploitation Guide — Intigriti](https://www.intigriti.com/researchers/blog/hacking-tools/exploiting-cors-misconfiguration-vulnerabilities)
- [CORS vulnerabilities: Weaponizing permissive CORS configurations — Outpost24](https://outpost24.com/blog/exploiting-permissive-cors-configurations/)
- [CORS errors — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS/Errors)
- [Reason: CORS header 'Access-Control-Allow-Origin' missing — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS/Errors/CORSMissingAllowOrigin)
- [Reason: CORS preflight channel did not succeed — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS/Errors/CORSPreflightDidNotSucceed)
- [Preflight request — MDN Glossary](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request)
- [Cross-Origin Resource Sharing (CORS) explained — http.dev](https://http.dev/cors)
- [Authoritative guide to CORS for REST APIs — Moesif Blog](https://www.moesif.com/blog/technical/cors/Authoritative-Guide-to-CORS-Cross-Origin-Resource-Sharing-for-REST-APIs/)
- [Private Network Access: introducing preflights — Chrome for Developers](https://developer.chrome.com/blog/private-network-access-preflight)
- [Private Network Access update: Introducing a deprecation trial — Chrome for Developers](https://developer.chrome.com/blog/private-network-access-update)

---

## 관련 문서

- [`web-infra/sni-server-name-indication.md`](./sni-server-name-indication.md) — 브라우저-서버 간 또 다른 프로토콜 레벨 협상 메커니즘(SNI)
- [`web-infra/http2-multiplexing-and-http1-coexistence.md`](./http2-multiplexing-and-http1-coexistence.md) — 같은 "브라우저 요청 동작"을 다루는 인접 주제
