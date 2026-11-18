# RTX 4060 · i7 8코어 · 32GB로 스타크래프트 미니맵 반복학습(RL)이 가능한가

> 관련 문서: [짧은 시나리오 단위 RL(마이크로 컨트롤)은 얼마나 할 만한가](./starcraft-scenario-micro-rl-feasibility.md) · [RTS RL 학습 비용·난이도(풀게임 기준)](./starcraft-rl-bot-training-cost-and-difficulty.md) · [신경망 게임 학습 방법·권장 사양](./train-neural-network-to-play-games-methods-and-specs.md)

## 쉬운 설명

**충분하다 못해 남습니다.** 앞서 정리한 "1분짜리 전투 하나만 반복 학습시키기"(예: 마린 5기 vs 저글링 6마리)는 원래 **GPU 한 장, 코어 몇 개짜리 컴퓨터로 며칠 만에 되는 과제**였어요. 실제 논문 사례 중 하나는 **GPU 1장 + CPU 코어 3개 + RAM 16GB로 60시간**만에 비슷한 급의 결과를 냈습니다.

가진 컴퓨터(4060 GPU, 8코어, 32GB)는 이 기준보다 **CPU는 2배, RAM은 2배** 넉넉합니다. 진짜 병목은 그래픽카드가 아니라 **"게임을 몇 개나 동시에 돌릴 수 있느냐"** 인데, 8코어면 스타1 인스턴스 4~6개를 동시에 돌릴 수 있어서 하루에 필요한 학습판(수십만 판)을 소화하기에 충분합니다.

---

## 일반 설명

### 0. 결론 먼저

**전제: "간단한 전장 하나(소규모 유닛 vs 유닛) + 반복학습"이라는 스코프가 정확히 [마이크로 시나리오 RL](./starcraft-scenario-micro-rl-feasibility.md)에 해당합니다.** 이 스코프에서는 가진 하드웨어가 기준선을 상회합니다.

| 항목 | 가진 사양 | 공개 사례 기준선 | 판정 |
|---|---|---|---|
| GPU | RTX 4060 (8GB GDDR6, FP16 ~15 TFLOPS) | Gym-μRTS: GPU 1장(등급 불명) / SMAC: V100 1장 | **여유** — 마이크로 시나리오 정책망은 수백만 파라미터급 소형 모델이라 8GB면 병목이 되지 않음 |
| CPU | i7 8코어 | Gym-μRTS: **vCPU 3개** | **2.5배 이상 여유** |
| RAM | 32GB | Gym-μRTS: **16GB** | **2배 여유** |

즉 **"할 만하냐"가 아니라 "이미 기준을 넘는 사양"** 입니다. 단, 이건 어디까지나 **미니 시나리오** 기준이고, [풀게임 자가대국](./starcraft-rl-bot-training-cost-and-difficulty.md)(3종족 전체, Pluto급)은 여전히 이 사양으로는 불가능합니다 — 그쪽은 GPU 8장 이상·수백 코어급이 필요한 완전히 다른 체급입니다. 질문하신 "간단한 전장 하나"는 다행히 그 체급이 아닙니다.

---

### 1. 진짜 병목이 어디인지부터 — GPU가 아니라 CPU 코어 수

[신경망 학습 사양 문서](./train-neural-network-to-play-games-methods-and-specs.md)에서 이미 짚었듯, RL에서 VRAM은 **모델 크기보다 병렬 환경 개수·배치 크기에 더 좌우**됩니다. 마이크로 시나리오의 관측·행동 공간은 [해당 문서](./starcraft-scenario-micro-rl-feasibility.md) §1에서 정리했듯 "이동 + 공격(+타깃)" 수준의 저차원이라, 정책망 자체는 가볍습니다 — RTX 4060 한 장이면 학습(forward+backward)은 병목이 되지 않습니다.

실질적 병목은 **"게임 인스턴스를 몇 개나 동시에 헤드리스로 돌릴 수 있는가"** 이고, 이건 GPU가 아니라 CPU 코어 수가 정합니다. 여기서 8코어라는 스펙이 의미를 가집니다.

- 학습기(learner) 프로세스가 1~2코어를 씀
- 나머지 6~7코어로 게임 인스턴스를 돌림
- 마이크로 시나리오는 유닛 수가 10~20기뿐이라 게임 자체 연산이 가볍고(풀게임 대비), **코어당 인스턴스 1개**가 무난히 나옵니다(풀게임 기준 코어 2개당 인스턴스 1개보다 유리한 조건)

**보수적으로 동시 4~6게임** 잡고 계산하면:

```
1분(≈1,440프레임, 6프레임/스텝=240스텝) 에피소드
배속 20배(Windows 네이티브, 사운드 비활성화 등 최적화 적용 시) × 동시 5게임
= 실시간 대비 100배
→ 하루(1,440분) 기준 약 144,000 에피소드
```

[마이크로 시나리오 문서](./starcraft-scenario-micro-rl-feasibility.md) §2의 "10만~수백만 에피소드면 수렴"이라는 기준에 이미 **1~수일 안에 도달**하는 처리량입니다. 16~32코어를 가정한 원 문서 예시(하루 69만 에피소드)보다는 낮지만, 목표가 "간단한 전장 하나"라면 이 처리량으로도 수일~1~2주 안에 결과를 볼 수 있습니다.

---

### 2. 구현 경로 — Windows 네이티브가 오히려 유리한 지점

[풀게임 비용 문서](./starcraft-rl-bot-training-cost-and-difficulty.md) §1①에서 지적한 "Wine + 가상 디스플레이" 복잡함은 **리눅스 헤드리스 클러스터를 돌릴 때 얘기**입니다. 지금 환경은 Windows 네이티브이므로 그 복잡함이 상당 부분 사라집니다.

- **[BWAPI Multi-Instance](https://github.com/bwapi/bwapi/wiki/Configuration)**: `Chaoslauncher - MultiInstance.exe`로 StarCraft 인스턴스를 원하는 개수만큼 띄우고, `bwapi.ini`의 `ai` 항목에 봇 모듈 경로를 콤마로 나열하면 인스턴스별로 서로 다른(혹은 같은) AI가 주입됩니다 — Windows에서 공식적으로 지원하는 다중 실행 방식입니다.
- **헤드리스 + 사운드 비활성화**: GUI 렌더링을 끄고 사운드 엔진을 비활성화하면 인스턴스당 자원 소모를 더 줄일 수 있습니다.
- **선택지**: 실제 StarCraft 1.16.1 + BWAPI(Windows 네이티브, 지금 환경에 바로 적용 가능) 또는 WSL2 + OpenBW(더 빠르지만 리눅스 빌드·설정 부담 추가) — 처음엔 전자로 시작하는 게 마찰이 적습니다.

즉 **인프라 난이도가 [풀게임 문서](./starcraft-rl-bot-training-cost-and-difficulty.md)에서 경고한 수준(1~2개월)보다 낮습니다.** Windows 네이티브 + 소규모 인스턴스 개수(4~6개)는 Docker/Wine 오케스트레이션 없이 로컬에서 직접 관리 가능한 규모입니다.

---

### 3. 유닛 스폰(맵 만들기) — 실제로 해야 할 작업

"맵 만들어, 간단한 전장 하나"는 구체적으로 다음을 뜻합니다.

1. **StarEdit/SCMDraft 같은 맵 에디터**로 소형 맵 제작, 트리거로 양 진영 유닛을 지정 위치에 스폰
2. 매 에피소드 유닛 위치·수·체력을 **랜덤화** — [마이크로 시나리오 문서](./starcraft-scenario-micro-rl-feasibility.md) §4에서 강조한 대로, 랜덤화하지 않으면 에이전트가 관측이 아니라 타임스텝만 보고 정답을 외우는 open-loop 정책이 됩니다(SMAC가 이 문제로 SMACv2로 개정된 전례가 있음)
3. 종료 조건(한쪽 전멸 또는 1분 타임아웃) + 보상(가한 피해 − 받은 피해, 정규화) 정의
4. [TorchCraftAI 마이크로 시나리오 튜토리얼](https://torchcraft.github.io/TorchCraftAI/docs/microtut-intro.html)이 동일한 방식(공격/이동 확률분포 + 그리드 위치 행동)의 공식 예제를 제공하므로 바닥부터 설계할 필요는 없습니다

---

### 4. 대안 비교 — 굳이 BW가 아니어도 된다면

같은 사양으로 더 빠르게 파이프라인을 검증하고 싶다면 [마이크로 시나리오 문서](./starcraft-scenario-micro-rl-feasibility.md) §3의 경로 B/C가 이 하드웨어에 특히 잘 맞습니다.

| 경로 | 이 사양에서의 체감 |
|---|---|
| **A. BW + BWAPI 직접** (질문하신 방식) | 4~6개 동시 인스턴스로 수일~1~2주. 결과물이 실제 브루드워 봇에 바로 이식 가능 |
| **B. SC2 + PySC2/SMAC** | RTX 4060 한 장으로 충분. SMAC 기준 원 사례가 V100 1장 36~48시간/런이었는데, 4060도 이 규모 소형망에서는 크게 뒤지지 않음(오히려 최신 아키텍처라 FP16 처리량은 앞섬). 공식 미니게임·베이스라인이 많아 디버깅이 쉬움 |
| **C. MicroRTS** | **GPU 1장 + vCPU 3개 + RAM 16GB로 60시간에 풀게임 SOTA**라는 원 사례 자체가 이미 지금 사양보다 낮은 스펙 — 파이프라인(관측 인코딩→PPO→평가) 검증용으로 가장 빠르고 이 하드웨어로는 사실상 즉시 가능 |

참고로 **Isaac Lab(로봇 RL)을 RTX 4060 한 장으로 학습시킨 사례**도 보고되어 있어, "8GB급 소비자 GPU로도 PPO 계열 RL 학습 자체는 무리 없이 돌아간다"는 정황이 이 분야 전반에서 재확인됩니다 — RL의 VRAM 요구가 LLM 학습과는 체급이 다르기 때문입니다.

**권장**: 목적이 "진짜 브루드워 봇"이면 A로 바로 가되, 환경 인프라(맵 트리거, 헤드리스 다중 인스턴스, 크래시 복구)를 붙이기 전에 C(MicroRTS)나 B(SMAC)로 관측 인코딩·PPO 학습 루프를 먼저 검증하면, "알고리즘 문제인지 BWAPI 문제인지" 구분하는 시간을 아낄 수 있습니다([마이크로 시나리오 문서](./starcraft-scenario-micro-rl-feasibility.md) §3 권장 순서와 동일).

---

### 5. 정리

- **가능합니다.** "간단한 전장 하나 반복학습"은 정확히 마이크로 시나리오 RL 체급이고, 공개 기준선(GPU 1장 + vCPU 3개 + RAM 16GB)을 가진 사양(4060 + 8코어 + 32GB)이 웃돕니다.
- **병목은 GPU가 아니라 CPU 코어 수**입니다. 8코어면 동시 4~6인스턴스가 현실적이며, 이걸로도 하루 10만+ 에피소드 처리량이 나와 수일~1~2주 내 수렴권에 도달합니다.
- **Windows 네이티브 환경이 오히려 유리**합니다 — 풀게임 문서에서 경고한 Wine/Docker 오케스트레이션 부담이 이 스코프에서는 필요 없고, BWAPI 공식 Multi-Instance 기능으로 충분합니다.
- **파이프라인 검증은 MicroRTS나 SC2 미니게임으로 먼저** 하고 BW로 이식하는 순서가 시간을 가장 아낍니다.
- 단, **이 결론은 "간단한 전장 하나"에 한정됩니다.** 풀게임·자가대국으로 스코프가 커지면 이 사양은 완전히 부족해지며, 그건 [별도 문서](./starcraft-rl-bot-training-cost-and-difficulty.md)에서 다룬 훨씬 큰 체급의 문제입니다.

---

## Sources

- [Multiple instances of StarCraft — StarCraft AI wiki](https://www.starcraftai.com/wiki/Multiple_instances_of_StarCraft)
- [BWAPI Configuration (Multi-Instance) — GitHub Wiki](https://github.com/bwapi/bwapi/wiki/Configuration)
- [MultiInstance.wiki — bwapi](https://github.com/calebhearth/bwapi/blob/master/wiki/MultiInstance.wiki)
- [TorchCraftAI System Architecture](https://torchcraft.github.io/TorchCraftAI/docs/architecture.html) / [Micromanagement Scenarios Tutorial](https://torchcraft.github.io/TorchCraftAI/docs/microtut-intro.html)
- [Yes, You Can Train Robots in Isaac Lab on an RTX 4060! — Tech Multiverse](https://tech-multiverse.com/projects/yes-you-can-train-robots-in-isaac-lab-on-an-rtx-4060/)
- [RTX 4060 for AI: What Can an 8GB GPU Actually Do? — GIGAGPU](https://gigagpu.com/rtx-4060-for-ai-workloads/)
- [Gym-μRTS: Toward Affordable Full Game RTS Research with Deep RL (arXiv)](https://arxiv.org/abs/2105.13807)
- [SMACv2: An Improved Benchmark for Cooperative MARL (arXiv)](https://arxiv.org/abs/2212.07489)
- 관련 문서: [마이크로 시나리오 RL 난이도](./starcraft-scenario-micro-rl-feasibility.md), [RTS RL 풀게임 비용](./starcraft-rl-bot-training-cost-and-difficulty.md), [신경망 게임 학습 사양](./train-neural-network-to-play-games-methods-and-specs.md)
