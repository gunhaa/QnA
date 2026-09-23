# 인간이 AI 에이전트와 **함께** 게임하는 분야 — 공식 지원과 연구 현황 (2026년 9월)

## 쉬운 설명

**여기는 오히려 대문이 활짝 열려 있어요.** "AI를 이겨라"보다 "AI랑 같이 놀아라" 쪽이 회사들이 돈을 더 많이 쓰고 있거든요.

구글 딥마인드가 만든 **SIMA 2**가 딱 그거예요. 진짜 상용 게임 안에서 **"나무 베어 줘"** 하면 베어옵니다. 심지어 이모지로 🪓🌲 보내도 알아듣고요. 게임 회사들이랑 정식으로 손잡고 만들었습니다.

그리고 여러분이 **직접 해볼 수 있는 것**도 있어요. 마인크래프트에 **MINDcraft**라는 걸 깔면, 사람이 AI랑 같은 서버에 들어가서 **같이 일하거나 AI한테 지시를 내릴 수 있습니다.** 공짜고 오픈소스예요.

점수 매기는 것도 쉬워요. 싸우는 게임은 "상대가 잘해서 진 건가?"를 따져야 하는데, **같이 하는 건 팀 점수 하나면 끝**이거든요.

---

## 일반 설명

### 0. 먼저 전제 하나 정정 — "vs 인간" 길도 완전히 막힌 건 아니다

말씀하신 *"공개 API 게임이 없고, 측정도 어렵고, 많이 하지도 않는다"* 는 **RTS에 한해서는 맞지만 일반화하면 틀립니다.**

| 반례 | 내용 |
|---|---|
| **Pokémon Showdown** | **완전 공개 API + 인간 래더 + Elo**. 앞 문서에서 본 PokéAgent Challenge(NeurIPS 2025, 100+ 팀)가 정확히 여기서 돌아갑니다. 인간 데모 400만 판 데이터까지 공개 |
| **Lichess Bot API** | 체스. 봇 계정 공식 등록 → 인간과 레이팅 대전. 완전 합법·공식 |
| **GT Sophy** (Sony AI × Polyphony) | **초인간 레이싱 AI가 실제 상용 게임에 탑재됐습니다.** Nature 표지 게재 후 1년 만에 GT7 Spec II(패치 1.40)로 전세계 배포. 340+ 차량, 9개 트랙, 플레이어와 1대1 모드 |

즉 **"vs 인간 알파고"는 실제로 출시까지 된 사례가 있습니다.** 다만 GT Sophy는 Sony AI가 **같은 그룹의 스튜디오와 함께** 만든 것이고 공개 API는 없습니다. 그리고 **실시간 RTS**에 한정하면 말씀하신 진단이 정확합니다 — 무대도 없고 측정도 어렵습니다.

> **결론: vs 인간이 하고 싶다면 RTS를 버리고 Pokémon Showdown이나 체스로 가면 길이 열려 있습니다.** 그게 아니라 협동 쪽이 더 끌린다면, 아래가 훨씬 더 풍부합니다.

---

### 1. 공식/산업 지원 — SIMA 2가 이 분야의 현재 기준점

#### 1.1 SIMA 2 (Google DeepMind, 2025년 11월)

**Scalable Instructable Multiworld Agent**. 딥마인드가 블로그 제목에 명시한 문구가 *"an agent that plays, reasons, and learns **with you** in virtual 3D worlds"* 입니다. **질문하신 것 그 자체입니다.**

| 항목 | 내용 |
|---|---|
| 구조 | SIMA 1의 저수준 정책을 **Gemini 추론 코어로 교체**. 내부 계획 수립, 의도 설명, self-play 기반 자기개선 |
| 지시 방식 | 자연어 + **이미지** + **이모지**. `🪓🌲` → 나무 베러 감 |
| 역할 | 단순 실행기가 아니라 **interactive partner** — 고수준 목표 추론, 사용자와 대화 |
| 성능 | **9개 상용 타이틀 과제 스위트 65% 달성** (SIMA 1은 31%, **인간 평균 71%**) |
| 스튜디오 제휴 | Coffee Stain Studios 등과 **정식 파트너십** |
| 계보 | SIMA 1은 상용 게임 전반에서 **600개 이상의 언어 추종 스킬** 학습 |

인간 71% 대 SIMA 2 65% — **격차가 거의 닫혔습니다.** 다만 **일반 공개 API/SDK는 아직 없습니다** (연구 프리뷰 단계).

#### 1.2 Microsoft Gaming Copilot — 그리고 경고 신호

- 2025년 3월 GDC에서 **Copilot for Gaming** 발표. 게임 중 막혔을 때 부르는 **음성 AI 어시스턴트 + 실시간 코칭**.
- 2025년 5월 Xbox 모바일 앱 베타 → Windows 11, ROG Xbox Ally 핸드헬드로 확장.
- 2026년 3월 GDC: Xbox Series X|S 콘솔 탑재 예고.
- **2026년 5월: Xbox CEO Asha Sharma가 모바일·콘솔 개발 중단 발표.** 폰/PC/핸드헬드 베타에만 남음.

> ⚠️ **이건 중요한 데이터 포인트입니다.** "AI 게임 동반자"의 **소비자 제품화**는 마이크로소프트조차 접었습니다. 연구 무대는 건강하지만 **제품 수요는 아직 입증되지 않았습니다.** 프로젝트 목표를 "제품"이 아니라 "연구/포트폴리오"로 잡는 게 안전합니다.

#### 1.3 그 외

NVIDIA ACE, Inworld AI 등 NPC 에이전트 플랫폼 (앞 문서 `game-agent-fsm-vs-llm-architecture.md` 참조). 이쪽은 "함께 플레이"보다 "NPC 연출"에 가깝습니다.

---

### 2. 연구 무대 — 여기가 실제로 활발하고, 바로 참가 가능하다

#### 2.1 ⭐ AH2AC2 — 지금 당장 참가 가능한 공식 챌린지

**Ad-Hoc Human-AI Coordination Challenge** (2025). 질문에 대한 가장 직접적인 답입니다.

| 항목 | 내용 |
|---|---|
| 게임 | **Hanabi** (2인·3인) — 협동 + 불완전정보 + 제한된 소통(힌트) + **마음이론(theory of mind)** 요구 |
| **핵심 설계** | 실제 사람 대신 **human proxy 에이전트**로 평가. 인간 데이터 147,621판으로 **행동복제 + 정규화 RL** 학습, 인간 유사성 검증 완료(교차플레이, 행동예측 정확도) |
| 공개 데이터 | hanab.live 커뮤니티 **3,079판** (2인 1,858 / 3인 1,221). **의도적으로 소량만 공개** — 데이터 효율적 방법을 유도하기 위해 |
| 참가 절차 | 실험 사전등록 → **API로 1,000판 평가** → 리더보드 자동 게시 |
| 리더보드 | **[ah2ac2.com](https://ah2ac2.com/)** 공개. 베이스라인 구현·사전학습 가중치 제공 |
| 부가 트랙 | 인간 행동 예측(held-out 데이터, cross-entropy 평가) |
| 현재 상태 | **zero-shot coordination 기법(OBL)이 인간 데이터 쓰는 방법들을 앞섭니다.** LLM은 파인튜닝 없이도 어느 정도 협응하지만 **아직 목표 수준에 못 미침** |

**왜 이게 좋은가:**
- **사람을 섭외하지 않고도** 재현 가능하고 값싼 인간 상대 평가가 가능합니다. 앞서 스타1 인간전에서 최대 제약이 "표본 확보"였는데, 그 문제가 설계 차원에서 해결돼 있습니다.
- **미해결 문제가 명확히 정의돼 있습니다** — *"제한된 인간 데이터를 효율적으로 활용하는 새 기법이 시급하다"*. 기여 지점이 뚜렷합니다.
- 공개 리더보드라 결과가 객관적으로 비교됩니다.

#### 2.2 Overcooked 계열 — human-AI coordination의 표준 환경

- **Overcooked-AI** — 이 분야의 원조 벤치마크. 2인 주방 협동.
- **Collab-Overcooked** (2025) — "Agent Bob(주방장) + Agent Alice(보조)" 구조로 LLM의 협업 능력 평가. **인간은 엄격한 시간 제약 하에서도 모든 난이도에서 일관되게 높은 성능**을 낸 반면 LLM은 그렇지 못함 → 인간과 AI의 협업 접근 방식에 근본적 차이가 있음을 보임.
- **Overcooked Generalisation Challenge** — 새 파트너·새 레이아웃 일반화.

#### 2.3 그 외 벤치마크

| 벤치마크 | 구성 |
|---|---|
| **LLM-Coordination** | 순수 협동 게임 4종 — Hanabi, Overcooked-AI, Collab Capture, Collab Escape |
| **CollabBench** (2026) | 다양한 플레이어와의 협업 능력, **선제적 개입(proactive engagement)** 평가 |
| ad-hoc teamwork 방법론 | FCP(fictitious co-play), MEP(최대엔트로피 population-based training) — 처음 보는 파트너와의 협응 |

---

### 3. ⭐ 직접 만들 수 있는 것 — MINDcraft가 가장 현실적인 출발점

**[mindcraft-ce](https://github.com/mindcraft-ce/mindcraft-ce)** / [mindcraft](https://github.com/mindcraft-bots/mindcraft) — Minecraft에서 LLM 기반 협동 에이전트를 만드는 오픈소스 플랫폼입니다.

**인간-에이전트 상호작용을 두 가지 모드로 지원합니다:**

1. **인간이 함께 작업 수행** — 같은 서버에서 나란히 일하며 동적 협력
2. **인간이 지시자 역할** — 과제 분담, 조율, 전략 결정을 지시

부가 기능:
- Mineflayer 기반 → **관측이 구조화돼 있고 액션이 코드**
- 백엔드 자유: OpenAI, Anthropic, Gemini, Replicate, Hugging Face, **Ollama**(로컬)
- **프로필 기반 설정 + 태스크 스위트 + 평가 도구 내장** → 벤치마킹이 바로 됨
- plug-and-play

> 앞 문서에서 "Minecraft로 한 사이클 돌고 다음으로"라고 권했던 것과 **정확히 맞물립니다.** 그때는 단독 에이전트 기준이었는데, 협동으로 목표를 바꾸면 **같은 도구 스택이 그대로 쓰이면서 주제가 훨씬 덜 붐빕니다.**

---

### 4. 왜 협동(co-op)이 대전(vs)보다 나은 선택인가

스타1 vs 인간 구조와 비교해보면 **거의 모든 축에서 유리합니다.**

| 축 | vs 인간 (스타1) | **협동 (Minecraft/Hanabi)** |
|---|---|---|
| **측정** | 상대 실력 통제 어려움, Elo 노이즈 큼 | **팀 점수가 곧 지표.** 과제 완수율/시간 |
| **표본 확보** | 사람 섭외 필요, 판당 10~20분 | **human proxy로 사람 없이 평가 가능** (AH2AC2), Minecraft는 반복 실행 저렴 |
| **레이턴시** | 실시간 압박 존재 | **압박 약함** — LLM에 유리 |
| **LLM 적합도** | 마이크로·반응속도가 병목 (LLM 무관) | **자연어 지시 이해, 의도 추론, 설명 가능성** — 전부 LLM 강점 |
| **실패 양상** | 착취당해 무너짐(치명적) | 점수 하락(점진적) |
| **공식 지원** | 없음 | **SIMA 2, 공개 챌린지, 오픈소스 프레임워크** |
| **미해결 난이도** | 높음 (20년 정체) | **높음 — 좋은 의미로.** LLM이 아직 인간 협응 수준에 못 미침이 문헌으로 확인됨 |

**마지막 행이 중요합니다.** 협동이 "쉬운 길"이라서 권하는 게 아닙니다. AH2AC2에서 LLM은 OBL 같은 zero-shot coordination 기법에 밀리고, Collab-Overcooked에서는 인간이 전 난이도에서 LLM을 일관되게 앞섭니다. **제대로 미해결 문제이면서, 도구와 평가가 갖춰져 있는 드문 조합입니다.**

---

### 5. 추천 경로

| 목표 | 경로 |
|---|---|
| **가장 빠른 착수, 만드는 재미 우선** | **MINDcraft로 Minecraft 인간+에이전트 협동.** 도구 완비, 백엔드 자유, 평가 하네스 내장. 앞 문서의 권고와 일치 |
| **객관적 성과·리더보드 우선** | **AH2AC2 참가.** 사람 섭외 불필요(human proxy), 공개 리더보드, 문제 정의 명확("제한된 인간 데이터의 효율적 활용") |
| **둘 다** | Hanabi로 **협응 알고리즘을 검증**(작고 측정 쉬움) → Minecraft로 **개방형 확장**(크고 보여주기 좋음) |
| 굳이 vs 인간을 하고 싶다면 | RTS를 버리고 **Pokémon Showdown**(공개 API + 인간 래더 + Elo + 400만 판 데이터). PokéAgent가 living benchmark로 살아 있음 |

**개인적 추천은 세 번째 줄입니다.** Hanabi는 **협응의 본질(마음이론, 제한된 소통, 파트너 의도 추론)만 남긴 최소 환경**이라 알고리즘 검증이 빠르고, 거기서 만든 것이 Minecraft 개방 환경으로 자연스럽게 확장됩니다. 그리고 리더보드 결과와 데모 영상을 둘 다 얻습니다.

---

### 6. 주의할 점

1. **제품화는 아직 이르다는 신호가 있습니다.** Microsoft가 Gaming Copilot의 콘솔·모바일 개발을 접었습니다(2026/5). 연구·포트폴리오 목표로 잡으세요.
2. **SIMA 2는 참고 대상이지 사용 대상이 아닙니다.** 공개 API가 없으므로 "SIMA 2 같은 것을 작은 규모로"가 현실적 프레이밍입니다.
3. **인간 파트너 평가는 결국 필요합니다.** human proxy는 개발 루프를 싸게 돌리기 위한 것이고, 최종 주장에는 실제 사람과의 세션이 들어가야 설득력이 생깁니다. 다만 그 수가 적어도 됩니다 — proxy로 이미 걸러놨으므로.
4. **협응의 어려움은 "AI를 강하게 만들기"가 아니라 "파트너에 맞추기"입니다.** 강한 정책이 인간과는 오히려 안 맞는 현상(zero-shot coordination 문제)이 이 분야의 핵심 난제입니다. 성능 최적화 직관이 그대로 통하지 않습니다.

---

## 참고 자료

**공식/산업**
- [SIMA 2: An agent that plays, reasons, and learns with you in virtual 3D worlds — Google DeepMind](https://deepmind.google/blog/sima-2-an-agent-that-plays-reasons-and-learns-with-you-in-virtual-3d-worlds/) / [기술 리포트 (2025/12)](https://storage.googleapis.com/deepmind-media/DeepMind.com/Blog/sima-2-an-agent-that-plays-reasons-and-learns-with-you-in-virtual-3d-worlds/SIMA_Tech_Report_2025.pdf) / [TechCrunch](https://techcrunch.com/2025/11/13/googles-sima-2-agent-uses-gemini-to-reason-and-act-in-virtual-world)
- [Microsoft Copilot for Gaming 발표 (2025/3)](https://techcrunch.com/2025/03/13/xbox-debuts-a-new-ai-powered-gaming-companion) / [Xbox Copilot 중단 (2026/5)](https://winbuzzer.com/2026/05/06/microsoft-gives-up-on-xbox-copilot-ai-xcxwbn/)
- [Gran Turismo Sophy 글로벌 배포 — Sony AI](https://ai.sony/articles/sonyai018/) / [From Research to Deployment in One Year](https://ai.sony/blog/from-research-to-deployment-in-one-year-gt-sophy-is-now-available-to-all-gt7-players)

**연구 무대**
- [AH2AC2: Ad-Hoc Human-AI Coordination Challenge (arXiv 2506.21490)](https://arxiv.org/html/2506.21490) / [리더보드 ah2ac2.com](https://ah2ac2.com/)
- [LLM-Coordination (arXiv 2310.03903)](https://arxiv.org/pdf/2310.03903)
- [Collab-Overcooked (arXiv 2502.20073)](https://www.alphaxiv.org/abs/2502.20073) / [Overcooked Generalisation Challenge](https://arxiv.org/html/2406.17949v2)
- [CollabBench (2026)](https://arxiv.org/pdf/2606.05793)
- [Evaluation of Human-AI Teams for Learned and Rule-Based Agents in Hanabi](https://arxiv.org/pdf/2107.07630)
- [LLMs as Policy-Agnostic Teammates (2025)](https://arxiv.org/pdf/2510.06151)

**직접 쓸 도구**
- [mindcraft-ce](https://github.com/mindcraft-ce/mindcraft-ce) / [mindcraft](https://github.com/mindcraft-bots/mindcraft) — Minecraft LLM 협동 에이전트 플랫폼
- [Pokémon Showdown 기반 PokéAgent Challenge](https://pokeagent.github.io/) — vs 인간 경로를 택할 경우
