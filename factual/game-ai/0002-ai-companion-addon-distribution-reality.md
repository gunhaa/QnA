# 자율 AI 동료를 애드온으로 배포하기 — 어디가 열려 있고 어디가 닫혔나 (2026년 9월)

## 쉬운 설명

먼저 중요한 것 — **말씀하신 예시 세 개(로아 모바일 AI 용병, 배그 봇, 이터널리턴 봇)는 전부 게임 회사가 직접 만든 기능이에요.** 누가 애드온으로 붙인 게 아닙니다. 그래서 그렇게 자유롭게 움직일 수 있는 거예요.

그리고 나쁜 소식 하나. **와우가 6개월 전에 바로 그 문을 닫았습니다.** 2026년 3월 Midnight 확장팩에서 "애드온은 **보여주기만** 할 수 있고, **대신 판단해주면 안 된다**"로 규칙이 바뀌었어요. 로테이션 알려주던 Hekili도 죽었습니다.

왜 그럴까요? **AI 도우미는 게임의 핵심 재미라서, 회사가 직접 하고 싶어 하거든요.** 로아 모바일이 정확히 그 예고요. 그래서 남의 게임에 붙이는 건 성공해도 결국 막히거나 흡수됩니다.

그래도 열려 있는 곳은 있어요. **마인크래프트**랑 **도타 2**입니다.

---

## 일반 설명

### 1. 전제 정정 — 예시 세 개 모두 1st-party 기능입니다

| 예시 | 실제 정체 |
|---|---|
| **로스트아크 모바일 AI 용병** | **스마일게이트 공식 기능** (2025년 6월 비전 프리뷰 공개). 파티 인원이 부족하면 AI 용병이 자동으로 채워지고, 회피·버프·상황 대응을 수행하며 말풍선 소통까지 함. **플레이어가 지휘 버튼 또는 마이크 음성 명령으로 조작** |
| **배틀그라운드 봇** | 개발사 제작 인게임 AI |
| **이터널리턴 봇** | 개발사 제작 인게임 AI |

**셋 다 애드온이 아닙니다.** 이게 중요한 이유는 — 1st-party는 **게임 내부 상태와 캐릭터 제어권을 무제한으로** 가지지만, 서드파티 애드온은 게임사가 **의도적으로 좁게 열어준 만큼만** 쓸 수 있기 때문입니다. 같은 결과물을 만들 수 있는 권한 자체가 다릅니다.

참고로 로아 모바일은 자동 전투를 군단장 레이드까지 확장하면서도, **보스전에서는 수동 조작으로 강공격을 피해야 살아남게** 설계했습니다. AI 보조와 인간 플레이의 경계를 개발사가 직접 튜닝한 사례입니다.

---

### 2. ⚠️ 그리고 타이밍이 나쁩니다 — 와우가 정확히 그 니치를 닫았습니다

> **앞 답변 정정**: 지난 답변에서 "와우 리테일 어드바이저 애드온"을 실사용자 확보 경로로 권했습니다. 그 권고는 **Midnight 이전 기준이었고, 지금은 대부분 유효하지 않습니다.** 정정합니다.

#### 2.1 무슨 일이 있었나

**2026년 3월 2일, WoW: Midnight 출시.** 사전 패치에서 애드온 API가 전면 개편됐고, **출시 48시간 만에 애드온 생태계 상당 부분이 붕괴**했습니다.

핵심 변경:

- **블랙박스화** — 전투 진입 시, 그리고 별도 화이트리스트되지 않은 모든 인스턴스에서 데이터가 **애드온이 보지도, 상호작용하지도, 플레이어 소통을 제공하지도 못하는 "블랙박스"** 로 들어갑니다.
- **핵심 원칙**: *"애드온은 이제 **정보를 표시만** 할 수 있고, **당신을 위해 결정을 계산할 수 없다**."*
- 인스턴스 전투 중 **파티원 체력·쿨다운 접근 차단**.
- **자동 인터럽트 배정 제거**, **레이드 내 애드온 간 통신 제한**, 전투 중 자동 채팅 송수신 제한.
- **로테이션 헬퍼 전멸** — Hekili가 의존하던 API가 제거되어 작동 중단.

#### 2.2 Blizzard의 대체품과 명분

- 대체: **`C_AssistedCombat` API** (Midnight 12.0 도입)와 기본 UI의 **Assisted Highlights** — 추천 스킬을 하이라이트해줍니다. 이미 패치 11.1.7(2025/5)에 Hekili류 Combat Assistant가 들어간 연장선입니다.
- 명분: **"통일된 플레이어 경험"** 제공, 애드온이 **"사실상 필수"** 로 여겨지는 인식 제거, 신규 유입 장벽 완화.
- 생존 사례: **HekiLight** — Blizzard 승인 API인 `C_AssistedCombat` 위에 **처음부터 다시 만든** 후속 애드온.
- DBM / BigWigs는 살아남았지만 **기능이 축소**된 채로 적응했습니다.

#### 2.3 영향 정리

| 하고 싶은 것 | Midnight 이후 |
|---|---|
| AI가 캐릭터를 자율 조작 | ❌ (원래부터 금지) |
| AI가 실시간으로 판단해 "지금 이거 눌러" | ❌ **새로 금지됨** |
| 파티원 상태 읽고 힐/인터럽트 배정 | ❌ **새로 금지됨** |
| 애드온끼리 레이드 정보 공유 | ❌ **새로 제한됨** |
| 보스 타이머·경고 표시 | △ 축소된 채 가능 (DBM/BigWigs) |
| Blizzard 승인 API 위에서 UI 개선 | ✅ (HekiLight 방식) |

**즉 만들고 싶으신 것이 와우에서는 정확히 금지된 항목에 해당합니다.**

---

### 3. 더 중요한 교훈 — 이건 와우만의 일이 아닙니다

이 패턴은 구조적입니다.

1. **AI 동료/보조는 게임의 핵심 경험에 직결됩니다.** 그래서 **개발사가 직접 하고 싶어 합니다.** 로아 모바일이 정확히 그 예이고, Blizzard의 Assisted Highlights도 같은 동기입니다.
2. **서드파티가 하면 밸런스·공정성·신규 유입 문제가 생깁니다.** "그거 없으면 못 한다"는 인식이 생기는 순간 게임사가 개입할 이유가 됩니다.
3. 따라서 **"애드온이 활성화돼 있고 유저도 많은 게임"에서 자율 플레이 AI를 붙이는 자리는 구조적으로 불안정합니다.** 성공할수록 흡수되거나 차단될 확률이 올라갑니다. Hekili가 정확히 그 경로를 밟았습니다 — 유용해서 널리 쓰였고, 그래서 Blizzard가 자사 기능으로 대체했습니다.

**프로젝트 수명을 게임사의 정책 결정에 맡기게 된다**는 뜻입니다. 이건 기술 문제가 아니라 사업 구조 문제입니다.

---

### 4. 그럼 어디가 열려 있나

판단 기준 셋: ① **서드파티 자율 제어 허용** ② **활성 사용자** ③ **협동/팀 요소**

| 게임 | ① 자율 제어 | ② 유저 | ③ 협동 | 비고 |
|---|---|---|---|---|
| ⭐ **Minecraft** | ✅ Mineflayer, 서버 재량 | 압도적 | ✅ | **MINDcraft가 이미 인간-에이전트 협동을 지원**. 가장 현실적 |
| ⭐ **Dota 2** | ✅ **Valve 공식 Lua Bot API** | 많음 | ✅ 5인 역할 | 커스텀 로비에서 **AI + 인간 혼합 팀**. ⚠️ Lua 5.1 샌드박스의 외부 네트워크 호출 가능 여부 **선검증 필요** |
| **AzerothCore + playerbots** | ✅ (내 서버) | 직접 모음 | ✅ **진짜 레이드** | 레이드 메커닉이 진짜. 유통은 "내 서버 접속" |
| **Screeps** | ✅ **프로그래밍이 곧 게임 규칙** | 소수·활성 | △ | JS로 유닛을 짜는 것이 게임 그 자체. ToS 문제 원천 부재 |
| **StarCraft II** | ✅ Blizzard 공식 s2client API, AI Arena 래더 | 봇 커뮤니티 | ❌ 대전 | |
| **WoW 리테일** | ❌ **Midnight 이후 닫힘** | 압도적 | ✅ | 승인 API 위 UI 개선만 가능 |
| **PUBG / 이터널리턴** | ❌ 제어 불가로 판단 | 많음 | ✅ | ⚠️ 이터널리턴은 [Developer Portal](https://developer.eternalreturn.io/)에 **BSER Open API**가 있으나 **범위를 확인하지 못했습니다.** 명칭·문서 형태로 보아 전적/통계 조회용일 가능성이 높습니다 — 직접 확인 필요 |

---

### 5. "남들이 쓰게 배포한다"를 살리는 두 가지 형태

원하시는 것의 본질은 **"내가 만든 AI 동료를 다른 사람이 자기 플레이에 붙여 쓴다"** 입니다. 애드온이 아니어도 이건 달성됩니다.

#### 5.1 ⭐ Minecraft 서버 사이드 AI 동료 (추천)

- 유저가 **서버에 접속하면 AI 파트너가 붙습니다.**
- 배포 마찰이 **애드온 설치보다 낮습니다** — 클라이언트에 아무것도 안 깔아도 됩니다.
- 유통 채널이 이미 존재합니다: 서버 목록, 모드팩 커뮤니티, 디스코드.
- **MINDcraft**가 인간의 (a) 공동 작업 (b) 지시자 역할을 둘 다 지원하므로 바닥부터 짤 필요가 없습니다.
- 백엔드 자유(Anthropic/OpenAI/Gemini/Ollama) → 비용 구조를 직접 설계 가능.
- 그리고 **레이드형 협동을 직접 설계할 수 있습니다** — 앞 문서에서 정리한 5요소(역할 상호의존, 타이밍 메커닉, 부분 관측, 실패 연쇄, 인간의 실수 보정)를 커스텀 던전으로 구현하면 됩니다. 남의 게임 규칙에 맞추는 게 아니라 **내가 규칙을 정합니다.**

#### 5.2 Blizzard 승인 API 위에 짓기 (유저 수를 포기 못 하겠다면)

- **HekiLight가 증명한 경로** — `C_AssistedCombat` 위에서 재작성.
- 할 수 있는 일이 좁습니다. 사실상 **Blizzard 기능의 표현·UX 개선**입니다.
- 장점: 와우 유저 기반에 즉시 접근. 단점: 자율성 없음, 그리고 **언제든 같은 방식으로 또 닫힐 수 있음.**

---

### 6. 정직한 결론

> **원하시는 세 조건 — ① 자율적인 AI 동료 ② 애드온처럼 남들이 붙여서 사용 ③ 활성 유저 많은 상용 게임 — 을 동시에 만족하는 곳은 현재 없습니다.** 하나를 포기해야 합니다.

| 무엇을 지킬 것인가 | 선택 |
|---|---|
| **자율성 + 배포** (유저는 직접 모음) | **Minecraft 서버** — 가장 추천 |
| **자율성 + 진짜 레이드** (유저 최소) | AzerothCore + playerbots |
| **유저 수 + 배포** (자율성 포기) | WoW `C_AssistedCombat` 위 어드바이저 |
| **자율성 + 공식 지원 + 인간 혼합** | Dota 2 Bot API (네트워크 제약 선검증) |

**추천은 Minecraft입니다.** 앞 문서의 "직접 만들기" 결론이 여기서 한 번 더 강화됩니다 — 심지어 **유통 측면에서도** 서버 접속이 애드온 설치보다 마찰이 낮고, 게임사 정책 리스크가 없으며, 협동 콘텐츠를 AI와 함께 설계할 수 있습니다.

애드온이라는 형태에 집착할 이유가 생각보다 약합니다. **"남이 내 AI와 함께 플레이한다"가 목적이라면 서버가 더 나은 배포 채널입니다.**

---

### 7. 착수 전 확인할 것

1. **Dota 2 Lua 봇의 외부 네트워크 호출** 가능 여부 — 가능하다면 선택지가 크게 넓어집니다(공식 지원 + 실제 인간 + 5인 협응).
2. **이터널리턴 BSER Open API의 실제 범위** — [developer.eternalreturn.io](https://developer.eternalreturn.io/) 문서 직접 확인. 제어가 가능하다면 판이 달라지지만, 전적 조회용일 가능성이 높습니다.
3. **와우를 계속 고려한다면** Midnight 이후의 `C_AssistedCombat` 문서를 직접 읽고 **무엇이 실제로 남았는지** 확인. 커뮤니티 기사보다 API 레퍼런스가 정확합니다.

---

## 참고 자료

**로스트아크 모바일 (1st-party AI)**
- [AI와 파티 맺고 레이드 뛰는 '로스트아크 모바일'](http://www.ilovepcbang.com/news/articleView.html?idxno=117149) / [체험기: "AI 용병과 레이드 격파"](https://www.dailian.co.kr/news/view/1512372) / [AI 용병과 발탄 레이드를](https://www.ipnn.co.kr/news/articleView.html?idxno=412614)

**WoW Midnight 애드온 API 변경**
- [WoW Midnight's Addon, Combat, and Design Changes Part 1 – API Anarchy and The Dark Black Box](https://kaylriene.com/2025/10/03/wow-midnights-addon-combat-and-design-changes-part-1-api-anarchy-and-the-dark-black-box/) — 블랙박스 구조 상세 분석
- [WoW is adding a Hekili-like Combat Assistant in patch 11.1.7](https://blizzardwatch.com/2025/05/01/wow-combat-assistant-rotation-patch-11-1-7/)
- [API Restrictions on Rotation Helpers (Hekili) & Accessibility — Blizzard 공식 포럼](https://us.forums.blizzard.com/en/wow/t/api-restrictions-on-rotation-helpers-hekili-accessibility/2252485)
- [More Boss Mod Functionality Coming in Midnight — DBM & Big Wigs Meet with Ion Hazzikostas (Wowhead)](https://www.wowhead.com/news/more-boss-mod-functionality-coming-in-midnight-dbm-and-big-wigs-meet-with-ion-379149)
- [HekiLight (CurseForge)](https://www.curseforge.com/wow/addons/hekilight) — `C_AssistedCombat` 기반 재작성 사례
- [Essential Addons You Should Still Use in WoW Midnight (Icy Veins)](https://www.icy-veins.com/wow/news/essential-addons-you-should-still-use-in-wow-midnight/)

**열려 있는 대안**
- [mindcraft-ce](https://github.com/mindcraft-ce/mindcraft-ce) — Minecraft 인간-AI 협동 플랫폼
- [Dota 2 Lua Bots — ModDota 문서](https://docs.moddota.com/lua_bots/)
- [mod-playerbots (AzerothCore)](https://github.com/mod-playerbots/mod-playerbots)
- [Eternal Return Developer Portal](https://developer.eternalreturn.io/) — BSER Open API (범위 확인 필요)
