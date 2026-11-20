---
type: inquiry
created: 2026-11-20
author: agent
model: claude-opus-5-5
---

# 프런트엔드 JS로 수집할 수 있는 메트릭

## 쉬운 설명

브라우저 안의 JS는 **방문자가 이 페이지에서 겪은 일**은 대부분 알 수 있다. 어디서 왔는지, 얼마나 머물렀는지, 어디까지 읽었는지, 페이지가 얼마나 빨리 떴는지, 어떤 화면·언어·다크 모드로 봤는지 같은 것들이다. 반대로 **방문자가 누구인지와 어디에 있는지**(IP, 위치)는 JS가 아니라 데이터를 받는 서버가 안다. 그래서 수집은 "브라우저가 관찰하고, 떠날 때 서버로 한 번에 보내는" 구조로 만든다.

## 일반 설명

### 1. 수집할 수 있는 정보 한눈에 보기

| 분류 | 정보 | 얻는 방법 | 브라우저 지원 |
|---|---|---|---|
| **방문** | 페이지 경로, 제목 | `location.pathname`, `document.title` | 전부 |
| | 유입 경로 | `document.referrer` (다른 사이트에서 왔을 때는 보통 도메인까지만 온다) | 전부 |
| | 캠페인 | URL의 `utm_source` 등 (`URLSearchParams`) | 전부 |
| | 들어온 방식 | `PerformanceNavigationTiming.type` — `navigate` / `reload` / `back_forward` | 전부 |
| **읽기 행동** | 머문 시간 | 보이는 동안만 잰다 (`visibilitychange`로 숨김·보임 구간을 뺀다) | 전부 |
| | 스크롤 깊이 | 최대 `scrollY / 문서 높이`, 또는 25·50·75·100% 지점 | 전부 |
| | 어느 절까지 읽었나 | `IntersectionObserver`로 `h2`·`h3`가 화면에 들어온 기록 | 전부 |
| | 클릭 | 외부 링크(GitHub 원문, 정제본), 목차 이동 | 전부 |
| | 복사 | `copy` 이벤트 (어떤 코드 블록을 복사했나) | 전부 |
| **성능** | LCP (가장 큰 내용이 그려진 시점) | `PerformanceObserver` 또는 `web-vitals` 라이브러리 | Chromium, Firefox, Safari 26.2+ |
| | INP (입력 반응 지연) | 같음 | Chromium, Firefox, Safari 26.2+ (Safari 값은 아직 부정확하다는 보고가 있다) |
| | CLS (레이아웃 밀림) | 같음 | **Chromium만** |
| | FCP, TTFB | 같음 | 전부 |
| | 리소스별 로딩 시간 | Resource Timing — 웹 글꼴(D2Coding 1.5MB), mermaid 등 | 전부 (다른 출처 리소스는 `Timing-Allow-Origin` 없으면 일부 값이 0) |
| **환경** | 화면·창 크기, 픽셀 밀도 | `screen.width`, `innerWidth`, `devicePixelRatio` | 전부 |
| | 언어, 시간대 | `navigator.language`, `Intl.DateTimeFormat().resolvedOptions().timeZone` | 전부 |
| | 다크 모드, 동작 줄이기 | `matchMedia('(prefers-color-scheme: dark)')` 등 | 전부 |
| | 브라우저·OS | `navigator.userAgent` (축소된 값), `navigator.userAgentData` | `userAgentData`는 **Chromium만** |
| | 네트워크 품질 | `navigator.connection.effectiveType` (`4g` 등), `rtt` | **Chromium만** |
| | 기기 메모리, CPU 코어 수 | `navigator.deviceMemory`, `hardwareConcurrency` | `deviceMemory`는 **Chromium만** (HTTPS 필요) |
| **오류** | JS 오류 | `window.onerror`, `unhandledrejection` | 전부 |
| | 리소스 로드 실패 | 캡처 단계 `error` 리스너 (`addEventListener('error', fn, true)`) | 전부 |

### 2. JS로 얻을 수 없는 것

| 정보 | 이유 | 대신 |
|---|---|---|
| IP 주소 | 브라우저가 노출하지 않는다 | **수집 서버**가 요청에서 읽는다 |
| 국가·도시 | 위치 API(`Geolocation`)는 사용자 허락이 필요하고, 통계용으로 묻는 것은 부적절하다 | 서버가 IP로 추정한다 (GeoIP DB) |
| 같은 사람인지 | 다른 사이트 간 추적 수단(서드파티 쿠키)은 막혀 있다 | 이 사이트 안에서만 쓰는 무작위 ID를 `localStorage`에 둔다 (아래 개인정보 주의) |
| 다른 탭·다른 사이트 행동 | 브라우저 보안 경계 밖이다 | 없음 |

### 3. 보내는 방법

메트릭은 페이지를 **떠날 때** 모아서 한 번에 보내는 것이 기본이다. 머문 시간·스크롤 깊이·INP·CLS는 떠날 때에야 값이 확정되기 때문이다.

| 방법 | 특징 |
|---|---|
| `navigator.sendBeacon(url, data)` | 페이지가 닫혀도 브라우저가 대신 보낸다. 본문 약 64KiB 제한. 가장 널리 쓰인다 |
| `fetch(url, { keepalive: true })` | sendBeacon과 비슷하지만 메서드·헤더를 고를 수 있다 |
| `fetchLater()` | Chrome이 권장하는 새 방식. 마지막 호출의 내용을 브라우저가 떠날 때 보낸다. 지원 브라우저가 아직 적어 폴리필(keepalive fetch·sendBeacon)과 함께 쓴다 |

- 보내는 시점은 `visibilitychange`(→ `hidden`)를 기본으로, `pagehide`를 보조로 쓴다. 모바일은 탭을 전환한 뒤 그대로 종료되는 경우가 많아 `pagehide`만으로는 놓친다.
- `unload`·`beforeunload`는 쓰지 않는다. 뒤로 가기 캐시(bfcache)를 끄고, 모바일에서 잘 발생하지도 않는다.
- 어떤 방법도 전송을 보장하지 않는다. 일부 유실을 전제로 통계를 해석한다.

### 4. 이 사이트(정적 knowledge 사이트)에 맞는 구성

기술 노트 사이트에서 의미 있는 질문과 그에 맞는 메트릭이다.

| 알고 싶은 것 | 메트릭 |
|---|---|
| 어떤 대상·문서가 많이 읽히나 | 페이지 경로별 방문 수 |
| 끝까지 읽나, 어디서 그만두나 | 스크롤 깊이, 화면에 들어온 마지막 `h2`·`h3` |
| 5문서를 순서대로 읽나 | 같은 세션 안의 페이지 이동 순서 (여백 목차 클릭) |
| 정제본·GitHub 원문으로 넘어가나 | 외부 링크 클릭 |
| 어디서 들어오나 | referrer, 검색 엔진 여부 |
| 사이트가 느린 곳은 | LCP, 웹 글꼴 로딩 시간 |
| 어떤 환경에서 보나 | 창 너비(모바일 비율), 다크 모드 비율 |

수집 서버(홈서버 API)는 받은 이벤트를 그대로 저장하고, IP로 국가만 추정한 뒤 IP 원문은 버리는 것이 좋다.

### 5. 개인정보 주의

- IP, 그리고 기기를 오래 구별할 수 있는 ID는 **개인정보**가 될 수 있다. 한국 개인정보 보호법 기준으로도 다른 정보와 쉽게 결합해 사람을 알아볼 수 있으면 개인정보다.
- 화면 크기·언어·시간대·GPU 같은 값을 많이 모아 합치면 **브라우저 지문(fingerprint)** 이 된다. 통계에 필요한 만큼만, 범주로 묶어 모은다 (예: 창 너비 → `모바일/태블릿/데스크톱`).
- 방문자 ID가 필요 없으면 두지 않는다. 필요하면 세션 단위(`sessionStorage`)로 짧게 쓴다.
- 쿠키나 영구 ID를 쓰거나 IP를 저장한다면 사이트에 수집 항목을 밝히는 안내를 둔다.
- `navigator.globalPrivacyControl`(GPC)이 `true`인 방문자는 수집하지 않는 선택지도 있다.

## 관련 문서

- [GitHub Pages로 knowledge 사이트 만들기 — 생성기 비교와 템플릿 선택](../dev-tools/0022-github-pages-knowledge-site-generator-and-templates.md)

## 참고 자료

- [web.dev — LCP and INP are now Baseline Newly available](https://web.dev/blog/lcp-and-inp-are-now-baseline-newly-available?hl=en)
- [DebugBear — Firefox and Safari Web Vitals support](https://debugbear.com/blog/firefox-safari-web-vitals)
- [Search Engine Journal — Apple Safari update enables tracking two Core Web Vitals metrics](https://www.searchenginejournal.com/apple-safari-update-enables-tracking-two-core-web-vitals-metrics/563465/)
- [GoogleChrome/web-vitals CHANGELOG](https://raw.githubusercontent.com/GoogleChrome/web-vitals/main/CHANGELOG.md)
- [MDN — Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API)
- [MDN — Navigator.userAgentData](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgentData)
- [Can I use — navigator.deviceMemory](https://caniuse.com/mdn-api_navigator_devicememory)
- [W3C — Device Memory API](https://www.w3.org/TR/device-memory/)
- [MDN — Navigator.sendBeacon()](https://developer.mozilla.org/docs/Web/API/Navigator/sendBeacon)
- [Chrome — Reliably measure full-session analytics and telemetry](https://developer.chrome.com/docs/modern-web-guidance/guides/performance/full-session-analytics)
- [Chrome — Debounce and batch multiple analytics events](https://developer.chrome.com/docs/modern-web-guidance/guides/performance/batch-analytics-events)
- [NicJ — Beaconing In Practice: fetchLater()](https://nicj.net/beaconing-in-practice-fetchlater/)
- [Speedkit — Unload beacon reliability benchmarking](https://www.speedkit.com/blog/unload-beacon-reliability-benchmarking-strategies-for-minimal-data-loss)
