# Pluto — 스타크래프트 브루드워 자가대국 RL 봇과 래더 무단 배포 사건

> 조사 기준일: 2026-09-21

## 쉬운 설명

누군가 혼자서 "컴퓨터가 스타를 스스로 수백만 판 두면서 배우게" 만든 프로그램(Pluto)을 만들어 공짜로 올려놨어요. 그런데 어떤 사람이 그걸 몰래 가져다가, 진짜 사람들이 게임하는 공식 래더에 몰래 풀어놨어요. 심지어 상대 진영을 훤히 보는 맵핵까지 켜서요. 이 프로그램이 프로 선수들을 이기면서 래더 5등까지 올라갔고, 그래서 지금 스타 커뮤니티가 난리가 났습니다. 만든 사람은 "나는 이렇게 쓰라고 만든 게 아닌데…" 하고 공개 시범경기도 멈춘 상태예요.

## 일반 설명

### 1. Pluto란 무엇인가

- **개발자**: `tscmoo` (Vegard Mella). 2015 AIIDE StarCraft AI Competition 우승 봇(tscmoo bot) 저자이고, 이후 Facebook AI Research의 TorchCraft 계열 연구에도 관여했던 인물이다. 즉 BW AI 씬의 베테랑이 다시 돌아온 프로젝트다.
- **저장소**: [github.com/tscmoo/pluto](https://github.com/tscmoo/pluto) — 2026-07-16 생성, 2026-07-17에 `Pluto beta 1 (model v2247200)` 바이너리 릴리스 공개. 소스는 아직 비공개(**binary beta**)이고 가중치 + 추론 엔진 + BWAPI 모듈만 배포된다.
- **핵심 주장**: *단일 신경망* 하나가 자가대국 강화학습(self-play RL)만으로 학습되어 **매크로·마이크로 전부**를, **3종족 모두**, **스크립트 없이** 수행한다. 기존 BW 봇(McRave, Locutus, PurpleWave, BananaBrain 등)이 사람이 짠 빌드오더·상태머신·휴리스틱 기반인 것과 근본적으로 다르다. SC2의 AlphaStar에 대응하는 위치이되, 사람 리플레이 지도학습(imitation) 부트스트랩 없이 **from scratch self-play**라는 점이 차별점이다.

### 2. 구현/실행 구조

README 기준 구조는 다음과 같다.

| 항목 | 내용 |
|---|---|
| 인터페이스 | BWAPI 4.4.0 + StarCraft: Brood War 1.16.1 (32비트) |
| 프로세스 분리 | `pluto.dll`(32비트 BWAPI 모듈) ↔ `pluto_infer.exe`(64비트 CUDA 추론 엔진), stdio 파이프 통신 |
| 가중치 | `pluto_weights.bin` (~1.2 GB 디스크, ~2.5 GB GPU 메모리) |
| 하드웨어 | NVIDIA Pascal(GTX 10 시리즈) 이상, 드라이버 525+ (CUDA 12.0) |
| 추론 주기 | 모델 1스텝당 약 15 ms, **6프레임마다 1스텝** (BW는 24fps 기준이므로 초당 약 4회 정책 평가) |
| 오프닝 선택 | 상대별 승패 기록 파일(`pluto_bandit_<opponent>.txt`)에 대한 **밴딧(bandit) 알고리즘**으로 빌드 선택. 파일을 직접 편집해 성향 조정 가능 |
| 네트워크 | 외부 통신 없음, StarCraft 폴더 밖 파일 접근 없음 |

32비트 게임 + 64비트 GPU 추론을 프로세스로 쪼개 파이프로 잇는 방식은, BWAPI가 레거시 32비트에 묶여 있어 현대 CUDA 런타임을 같은 프로세스에 올릴 수 없기 때문에 나온 구조다. "6프레임 1스텝"은 곧 **정책 결정 해상도**이고, 그 사이 프레임은 직전 결정의 실행 구간이다.

기술적 신빙성에 대해서는 Meta FAIR에서 RL·게임 AI를 하는 Gabriel Synnaeve가 실제 플레이 영상을 보고 "설명대로 동작하는 것으로 보인다"고 확인한 것으로 보도됐다.

### 2.5 누가 만들었나 — 개인인가 팀인가

규모를 보면 조직 프로젝트로 보이지만, **공개된 증거는 전부 1인 프로젝트를 가리킨다.**

| 근거 | 내용 |
|---|---|
| GitHub 컨트리뷰터 | **`tscmoo` 단 1명** (GitHub API 확인) |
| 저장소 규모 | 스타 20여 개, 2026-07-16 생성, 소스 비공개 바이너리 릴리스만 |
| 프로필 | 이름 Vegard Mella, bio는 `@facebookresearch` (팔로워 42명) |
| 발표 형태 | 논문·기술 블로그·보도자료 없음. README 한 장 |

조직이 아니라 **"이 분야를 직업으로 해온 사람의 개인 프로젝트"**로 보는 것이 정확하다. 그의 이력이 이 프로젝트의 공수를 설명한다.

- **tscmoo bot** — 2015 AIIDE StarCraft AI Competition 우승. BW 봇을 처음부터 만들어 본 경험.
- **TorchCraft / TorchCraftAI (CherryPi)** — Facebook AI Research. BW를 머신러닝 환경으로 감싸는 라이브러리와, SSCAIT 2017-18 우승 봇. 공저자에 Gabriel Synnaeve, Dan Gant 등. **즉 "BW를 RL 환경으로 만드는 인프라"를 회사 일로 수년간 만들어 본 사람이다.**
- **STARDATA** — BW 리플레이 대규모 연구 데이터셋.
- **Polygames: Improved Zero Learning** (2020, FAIR) — AlphaZero 계열 **제로 러닝 프레임워크** 공저. Hex 19x19 등에서 강한 사람을 이김.

정리하면 Pluto는 **환경 인프라(TorchCraft) + 자가대국 학습 프레임워크(Polygames) + 도메인 지식(tscmoo bot) 세 가지를 이미 손에 쥔 사람**이 개인 프로젝트로 붙인 결과다. 앞 문서에서 "공수의 30~50%가 환경 인프라"라고 했는데, 그 부분을 이미 몇 년 전에 끝내 둔 상태였던 셈이다.

**여전히 모르는 것**: 학습에 쓴 컴퓨트 규모와 그 출처(개인 장비인지 소속 기관 자원인지), 총 학습 기간, 자금. 저자가 공개한 적이 없다. 따라서 "개인이 혼자 저 비용을 감당했다"고 단정할 수도, "회사 자원을 썼다"고 단정할 수도 없다.

### 3. 사건: "rogue Pluto" — 공식 래더 무단 배포

BW AI 커뮤니티 개발자 **bmnielsen**이 2026-09-18 TeamLiquid에 올린 글([Bot on ladder](https://tl.net/forum/brood-war/646339-bot-on-ladder))이 사건의 1차 출처다. 요지:

1. **CoG 2026 StarCraft AI 토너먼트** 결과가 공개되면서 Pluto가 등장했고, 기존 어떤 봇도 도달하지 못한 수준을 보였다.
2. 커뮤니티는 "사람이 직접 붙어볼 수 있게 배포하는 방법"을 고민 중이었다. BWAPI는 리마스터가 아닌 1.16.1에서만 동작하므로 사람이 접근하기 어렵기 때문이다. 저자도 리마스터에서 돌려 **비공개 시범경기**를 몇 판 진행한 상태였다.
3. 그런데 커뮤니티 외부의 누군가가 먼저 **배포된 바이너리를 해킹해 리마스터에서 동작**하게 만들고, **공식 래더에서 실제 대전을 돌리고 있다**. 계정명은 **`who (^333^)`**, 글 작성 시점 기준 **글로벌 래더 5위**.
4. 게다가 **맵핵까지 켜서** 돌리고 있다. 역설적으로 이건 봇을 *약하게* 만든다 — Pluto는 전장의 안개(fog of war) 환경에서 학습했으므로, 보일 리 없는 유닛이 관측 입력에 들어오면 분포 밖(out-of-distribution) 상태가 되어 혼란스러워한다.
5. 커뮤니티는 블리자드에 신고했지만 실효성을 기대하기 어렵다고 보고, 한국 BW 커뮤니티에도 전파해달라고 요청했다. "BW AI 커뮤니티는 게임을 좋아해서 봇을 만드는 소규모 취미 개발자 모임일 뿐인데 이 일로 나쁘게 비칠까 걱정"이라는 정서.

### 4. 프로 상대 전적과 관찰된 특징

스레드에 정리된 래더 전적(맵핵 켜진 무단 버전 기준):

| 상대 | 결과 | 비고 |
|---|---|---|
| Paralyze | Pluto 승 | M&M + 락다운 조합 |
| Larva | Pluto 승 | 6배럭 M&M, 업그레이드 없음 |
| Iris | Pluto 승 | 클로킹 레이스 + 시즈탱크 |
| Ret | Pluto 승 | 물량 M&M, E-Bay 없음 |
| 바코드 저그 (Odyssey) | Pluto 패 | 22:55 장기전 |

언급된 수치와 특징:

- **승률 약 98%**, 래더 최고 5위권.
- **표시 APM 최대 2000대**지만, 실제 모델은 내부적으로 **240 APM** 수준으로 동작한다. 차이는 BWAPI가 명령을 유닛별로 쪼개 내려서 APM 카운터에 부풀려 잡히는 것(command splitting) 때문이다. 즉 "초인적 클릭 속도로 이겼다"는 단순 해석은 부정확하다.
- **비정통 전략 성향**: 무업 마린메딕 중심, 대저그전 터렛 없이 M&M 물량, 업그레이드 우선순위 무시, 건물 배치가 산만함. 반대로 유닛 컨트롤은 사람이 내기 어려운 프레임 단위 정확도를 보인다.
- 봇 식별은 이런 RL 특유의 버릇(TvT에 마린, 난잡한 건물 배치)으로 개발자 NiteKat 등이 특정했고, iFU.spx는 SCV가 시야 없는 미네랄을 클릭하는 프레임 단위 명령 기록으로 맵핵을 입증했다.
- PurpleWave 저자(dgant)는 "리플레이 약 16만 개에서 100% 정확도"라는 봇 탐지기를 블리자드에 제공하겠다고 제안했다(탐지 방식은 비공개 조건).
- 사건 여파로 **저자는 공개 시범경기 진행을 중단**한 상태로 전해진다.

### 5. 커뮤니티 반응·해설

- Artosis가 Pluto의 경기를 유튜브에서 분석 중이다 — [#1 Rank StarCraft AI - All Terran vs Zerg Games Analyzed!](https://www.youtube.com/watch?v=9nJdt7YgsZs), [AI Bot Takes over the StarCraft Ladder....](https://www.youtube.com/watch?v=1vsTqNwHquE).
- 개별 경기 영상: [Paralyze vs rogue Pluto — 8경기 시리즈](https://www.youtube.com/watch?v=7W59BfI-YU8), [sSak vs rogue Pluto @ Aiolos (TvT)](https://www.youtube.com/watch?v=0nod7uuQs6o), [Retjah vs rogue Pluto @ Attitude](https://www.youtube.com/watch?v=aXdT7Py1bGw).
- Hacker News에도 2026-09-20 "Pluto AI is top ranked in StarCraft BroodWar competitive scene"로 올라왔다(반응은 아직 작음).
- GitHub 저장소 자체는 스타 20여 개 수준으로, **연구 발표가 아니라 개인 프로젝트가 게임 커뮤니티를 통해 먼저 폭발한 형태**다. 논문·기술 리포트·학습 스케일(컴퓨트, 총 게임 수, 네트워크 구조) 정보는 아직 공개되지 않았다.

### 6. 왜 중요한가 (AlphaStar와의 비교)

| | AlphaStar (2019, SC2) | Pluto (2026, BW) |
|---|---|---|
| 주체 | DeepMind (대규모 조직) | 개인 개발자 1명 |
| 부트스트랩 | 사람 리플레이 지도학습 후 리그 self-play | 순수 self-play (주장) |
| 대상 게임 | SC2 (공식 API, 구조화된 관측) | BW (BWAPI, 레거시 1.16.1) |
| 인터페이스 | 제한된 카메라·APM 상한 협상 | BWAPI 전역 관측 + 내부 240 APM |
| 공개 형태 | 논문 + 제한 시연 | 바이너리 릴리스(누구나 다운로드) |

핵심 시사점 두 가지다.

1. **스케일 민주화**: 2019년에는 조직 단위 컴퓨트가 필요했던 수준의 RTS 에이전트를, 2026년에는 개인이 만들어 단일 GPU 추론으로 배포한다. 학습 컴퓨트는 비공개지만 추론 요구사항(2.5GB VRAM, Pascal 이상)은 매우 가볍다.
2. **배포 윤리 문제**: 오프라인 토너먼트용 봇을 공개 바이너리로 내놓는 순간, 사람 대 사람 래더에 그대로 유입되는 경로가 열린다. 이번 사건은 "게임 AI 연구 산출물의 공개 배포 = 치팅 도구 공급"이 될 수 있음을 보여준 첫 BW 사례다. 봇 탐지(리플레이 기반 분류기), 배포 제한(SCHNAIL 같은 전용 대전 플랫폼), 저자의 시범경기 중단 같은 대응이 동시에 논의되고 있다.

### 7. 확인되지 않은 것들

정확성을 위해 명시한다.

- CoG 2026 최종 순위표/승률 수치는 아직 공개 페이지에서 확인되지 않는다(대회는 2026-08-22~29 진행, 결과 발표만 언급됨).
- `who (^333^)` 계정이 블리자드에 의해 실제로 제재됐는지 확인되지 않았다.
- 공식적인 "Pluto vs 프로 공개 시범경기 시리즈"는 예고됐다가 이번 사건으로 **중단**된 상태이며, 현재 돌아다니는 프로전 영상은 대부분 **무단 래더 버전(맵핵 포함)** 기준이다. 즉 "Pluto의 진짜 실력"과 래더 전적은 동일하지 않다.
- 학습 방법 상세(네트워크 구조, 학습 게임 수, 보상 설계, 리그 구성)는 미공개다. 일부 보도에서 "양측 정책 정보에 접근하는 value model"을 쓴다고 언급됐지만 1차 자료로는 확인되지 않는다.

## 참고 자료

- [tscmoo/pluto — GitHub](https://github.com/tscmoo/pluto)
- [Bot on ladder — TeamLiquid 포럼 (bmnielsen, 2026-09-18)](https://tl.net/forum/brood-war/646339-bot-on-ladder)
- [#1 Rank StarCraft AI - All Terran vs Zerg Games Analyzed! (Artosis)](https://www.youtube.com/watch?v=9nJdt7YgsZs)
- [AI Bot Takes over the StarCraft Ladder....](https://www.youtube.com/watch?v=1vsTqNwHquE)
- [Paralyze vs the rogue Pluto bot - 8 Game Series](https://www.youtube.com/watch?v=7W59BfI-YU8)
- [sSak vs the rogue Pluto bot @ Aiolos](https://www.youtube.com/watch?v=0nod7uuQs6o)
- [Retjah vs the rogue Pluto bot @ Attitude](https://www.youtube.com/watch?v=aXdT7Py1bGw)
- [StarCraft AI Competition(s) — Dave Churchill (CoG 2026)](https://davechurchill.ca/starcraft/cog/)
- [BWAPI](https://bwapi.github.io/)
- [AlphaStar — Wikipedia](https://en.wikipedia.org/wiki/AlphaStar_(software))
