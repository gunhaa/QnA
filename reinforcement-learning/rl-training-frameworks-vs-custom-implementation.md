# 정책은 무엇으로 학습시키고, 무엇으로 작동·피드백시키는가 — 프레임워크 vs 직접 구현

> 관련 문서: [RL 정책 = 입력→출력 함수](./rl-trained-policy-as-input-output-function.md) · [작은 전장 자가대국 + 판단 RL](./starcraft-micro-scenario-self-play-judgment-rl.md) · [RTX 4060·8코어·32GB 하드웨어 검토](./rtx4060-8core-32gb-starcraft-micro-rl-feasibility.md) · [게임 AI 라이브러리 언어 선택](../game-ai/game-ai-library-language-choice.md)

## 쉬운 설명

학습(training)과 작동(serving)은 **다른 두 개의 방**이에요.

- **학습하는 방(학원)**: 게임을 수천 번 반복시키면서 "이번엔 잘했다/못했다" 점수를 매기고, 그 점수로 뇌(신경망) 안의 숫자를 조금씩 고쳐나가는 곳. 여기서 쓰는 도구가 **RL 프레임워크**(CleanRL, Stable-Baselines3, RLlib 같은 것들)예요.
- **작동하는 방(실전 경기장)**: 이미 다 배운 뇌를 그대로 가져와서, 상황이 들어오면 답만 빠르게 뱉는 곳. 여기는 도구가 훨씬 단순해도 돼요(가중치 파일 + 추론 엔진).

그리고 **"피드백"** 은 학습하는 방 안에서 도는 순환고리예요 — 게임을 돌려서 → 결과(점수)를 받고 → 그 점수로 뇌를 고치고 → 고쳐진 뇌로 다시 게임을 돌리는 걸 계속 반복하는 거예요.

직접 다 짤 수도 있고, 이미 잘 만들어진 도구를 갖다 쓸 수도 있어요 — 둘 다 아래에 정리했습니다.

---

## 일반 설명

### 1. 전체 그림 — 세 조각으로 나뉜다

```
[게임/환경(Environment)]  ←재시작·행동 적용→  [RL 알고리즘 & 학습 루프(Trainer)]  ←계산 위임→  [신경망 라이브러리]
     StarCraft/BWAPI              CleanRL / SB3 / RLlib 등                    PyTorch
     obs, reward, done 반환         PPO 손실 계산, 그래디언트 갱신 지시            실제 forward/backward 연산
```

세 조각을 잇는 접착제가 **[Gymnasium](https://gymnasium.farama.org/)** 표준 인터페이스입니다 — `reset() → 초기 관측`, `step(action) → (관측, 보상, 종료여부, 부가정보)`. 이 API로 환경을 감싸두면, 그 위에 어떤 학습 프레임워크를 얹어도 큰 수정 없이 돌아갑니다. 멀티에이전트(자가대국처럼 팀이 여럿)는 이를 확장한 **[PettingZoo](https://pettingzoo.farama.org/)** 가 사실상 표준입니다.

### 2. "무엇으로 작동시켜 피드백시키는가" — actor-learner 루프

질문하신 두 번째 부분이 핵심입니다. 학습 중 피드백 순환은 보통 이렇게 돕니다.

```
1. Actor(게임 인스턴스 여러 개) — 현재 정책으로 게임을 진행하며 (상태, 행동, 보상, 다음상태) 수집
2. 수집된 경험을 배치로 모아 Learner에게 전달
3. Learner — PPO 손실 계산 → 그래디언트로 신경망 가중치 갱신
4. 갱신된 가중치를 다시 Actor들에게 배포 (동기화)
5. 1로 돌아가 반복
```

이게 [작은 전장 자가대국 문서](./starcraft-micro-scenario-self-play-judgment-rl.md)에서 다룬 "체크포인트 저장소에서 상대를 뽑아 대전시키는" 구조와 맞물리는 지점입니다 — Actor가 게임을 돌릴 때 상대 쪽 정책을 저장소에서 하나 불러와 끼워 넣으면 됩니다. **이 actor-learner 분리 자체를 프레임워크가 대신 해주느냐, 직접 짜느냐**가 아래 선택의 핵심 갈림길입니다.

### 3. 프레임워크 선택지

| 프레임워크 | 성격 | 멀티에이전트/자가대국 | 이 규모(로컬 4060+8코어)에서 |
|---|---|---|---|
| **[Stable-Baselines3 (SB3)](https://stable-baselines3.readthedocs.io/)** | PyTorch 기반, PPO/DQN 등 검증된 구현, 문서·예제 풍부 | **취약** — 공식 멀티에이전트 지원이 거의 없음 | 스크립트 상대 학습(1단계 기준선)엔 가장 빠르게 시작 가능 |
| **[CleanRL](https://docs.cleanrl.dev/)** | 알고리즘마다 **단일 파일**로 구현(추상화 최소화). SB3 대비 **PPO 학습이 2.3배 빠르다**는 벤치마크도 있음 | 직접 넣기 — 코드가 단일 파일이라 자가대국·체크포인트 풀 로직을 끼워 넣기 쉬움 | **이번 프로젝트에 가장 적합** — "직접 짜는 것"과 "검증된 구현"의 중간점 |
| **[Ray RLlib](https://docs.ray.io/en/latest/rllib/)** | 분산 컴퓨팅 프레임워크 Ray 위에 구축, 대규모 병렬 수집에 강함, 멀티에이전트·self-play 정책 지원 내장 | **강함** — 리그/self-play 옵션이 프레임워크 차원에서 존재 | 8코어 로컬 규모엔 다소 과한 인프라. 나중에 규모를 키울 때 이식 후보 |
| **[TorchRL](https://pytorch.org/rl/)** | PyTorch 공식 RL 라이브러리, 모듈형 컴포넌트(환경·손실·리플레이버퍼를 조합) | 컴포넌트 조합으로 가능 | 최신이라 생태계·예제가 아직 얇은 편 |
| **[PettingZoo](https://pettingzoo.farama.org/)** | 학습 알고리즘이 아니라 **멀티에이전트 환경 표준 API**(Gymnasium의 멀티에이전트 버전) | 대칭 두 팀 자가대국을 표준 형태로 표현 | 위 프레임워크들과 조합해서 **환경 인터페이스**로 씀 |

**권장**: CleanRL로 시작하세요. SB3보다 빠르고, RLlib보다 가볍고, **자가대국·체크포인트 저장소 같은 커스텀 로직을 넣기에 가장 만만합니다** — 원래 코드가 한 파일짜리라 프레임워크의 추상화 계층을 뚫고 들어갈 필요가 없습니다.

### 4. "직접 작성"이 실제로 얼마나 부담인가

PPO 자체는 생각보다 코드량이 적습니다 — CleanRL의 단일 파일 PPO 구현이 정확히 **"프레임워크 없이 직접 짜는 것"의 실사판**입니다. 핵심 구성 요소는:

1. 정책망 + 가치망 (PyTorch `nn.Module`, 수십 줄)
2. 롤아웃 수집 루프 (환경에서 경험 모으기)
3. GAE(Generalized Advantage Estimation) 계산 (어드밴티지 추정, [RL 개론 문서](./what-is-reinforcement-learning.md) §3 참조)
4. PPO 클리핑 손실 + 옵티마이저 스텝
5. 로깅(TensorBoard/[Weights & Biases](https://wandb.ai/) 등으로 보상 곡선 확인)

**"프레임워크냐 직접 작성이냐"는 사실 이분법이 아닙니다.** CleanRL 자체가 "검증된 참고 구현을 통째로 읽고 고쳐 쓰는" 방식이라, 실질적으로는 **직접 작성에 가까운 프레임워크**입니다. 처음부터 완전히 백지에서 시작하는 것보다, CleanRL의 PPO 파일을 가져다 (a) 환경 연결부만 갈아 끼우고 (b) 자가대국 체크포인트 로직을 추가하는 순서가 시간을 가장 아낍니다.

### 5. StarCraft(BWAPI/Java)와 연결하기 — 언어 경계를 넘는 지점

여기서 실무적으로 중요한 문제가 생깁니다. **학습 프레임워크(CleanRL/SB3/RLlib)는 전부 Python/PyTorch 생태계**이고, [앞서 정한 게임 클라이언트(JBWAPI/Atlantis)는 Java](../game-ai/java-backend-dev-game-agent-companion-direction.md)입니다. [게임 AI 라이브러리 언어 선택 문서](../game-ai/game-ai-library-language-choice.md) §4의 "사이드카 패턴"이 여기 그대로 적용됩니다.

**학습 단계 (Java 클라이언트 ↔ Python 트레이너)**
```
Java(JBWAPI 봇) ── 소켓/gRPC(JSON 또는 protobuf) ──► Python(CleanRL 학습 루프)
  매 스텝: 관측을 직렬화해 전송 → 행동을 응답받아 게임에 적용
```
- 이 구조는 [Cairn](../game-ai/game-agent-fsm-vs-llm-architecture.md)이나 [OpenGameAgent](../game-ai/game-agent-fsm-vs-llm-architecture.md)에서 이미 본 "게임 프로세스 ↔ 별도 에이전트 프로세스" IPC 패턴과 동일합니다.
- 다만 RL 학습은 **매 스텝(초당 수십~수백 회) IPC 왕복**이 필요해 LLM 사이드카보다 지연에 훨씬 민감합니다 — 로컬 소켓(TCP loopback)이면 왕복이 수백 μs~1ms 수준이라 감당 가능하지만, [하드웨어 검토 문서](./rtx4060-8core-32gb-starcraft-micro-rl-feasibility.md)에서 잡은 동시 4~6인스턴스 처리량을 IPC 오버헤드가 깎아먹을 수 있으니 **실측 후 병목이면 공유 메모리(mmap)로 전환**하는 게 다음 단계입니다.
- DJL(AWS의 JVM 딥러닝 라이브러리)은 현재 **추론(inference) 중심**이고 RL 학습 루프 자체를 JVM에서 대체할 만큼 성숙하지 않습니다 — 즉 **학습은 Python이 현실적**입니다.

**배포 단계 (학습이 끝난 뒤, Python → 다시 Java로)**
```
PyTorch 정책 → TorchScript/ONNX로 export → DJL(Java)이 로드 → JBWAPI 봇 안에서 직접 추론
```
[직전 문서](./rl-trained-policy-as-input-output-function.md)에서 정리한 "최종 산출물은 작은 가중치 파일"이라는 점 덕분에, **학습은 Python/PyTorch, 실전 배포는 다시 Java(DJL)로 되돌아오는 구조**가 가능합니다. DJL은 TorchScript로 직렬화된 PyTorch 모델을 네이티브 Java 객체처럼 로드해 추론하는 것을 정확히 지원하도록 만들어진 라이브러리입니다. 이러면 **학습만 Python을 빌리고, 실제 게임 안에서 도는 최종 프로그램은 순수 Java**로 남길 수 있습니다 — Java 배경에 가장 마찰이 적은 형태입니다.

### 6. 권장 착수 순서

| 단계 | 내용 |
|---|---|
| 1 | CleanRL의 PPO 단일 파일을 Gymnasium 환경(SMAC 또는 MicroRTS)에 연결해 **파이프라인부터 검증** ([마이크로 시나리오 문서](./starcraft-scenario-micro-rl-feasibility.md) §3 권장 순서와 동일) |
| 2 | JBWAPI Java 봇 ↔ Python(CleanRL) 사이에 **로컬 소켓 IPC**로 관측/행동을 주고받는 얇은 환경 래퍼 작성 — 이게 Gymnasium의 `step()`/`reset()` 구현체가 됨 |
| 3 | 스크립트 상대로 먼저 학습 → [자가대국 + 체크포인트 저장소](./starcraft-micro-scenario-self-play-judgment-rl.md)로 전환 (CleanRL 코드에 상대 정책 로딩 로직 추가) |
| 4 | 학습된 정책을 **TorchScript/ONNX로 export** |
| 5 | **DJL로 Java 봇에 흡수** — 실전 매치(SSCAIT 등)에서는 Python 의존성 없이 순수 JVM으로 구동 |

### 7. 정리

- 학습에 쓰는 것: **CleanRL**(추천, SB3보다 빠르고 커스텀하기 쉬움) 또는 SB3(빠른 시작)/RLlib(나중에 규모 키울 때). 알고리즘은 PyTorch가 실제 연산을 담당.
- 피드백 루프의 정체: **actor(게임 진행·경험 수집) → learner(그래디언트 갱신) → 갱신된 가중치를 다시 actor에 배포**하는 순환. 프레임워크가 이 배관을 대신 깔아줌.
- "직접 작성"은 백지 상태가 아니라 **CleanRL 같은 단일 파일 참고 구현을 가져다 고치는 것**이 현실적 형태입니다.
- **학습은 Python/PyTorch, 게임 클라이언트는 Java(JBWAPI)** — 둘을 로컬 소켓 IPC로 연결해 학습하고, 학습이 끝나면 **TorchScript/ONNX + DJL로 다시 순수 Java 배포**로 되돌아오는 것이 Java 배경에 가장 맞는 경로입니다.

---

## Sources

- [Gymnasium — A Standard Interface for RL Environments (arXiv 2407.17032)](https://arxiv.org/pdf/2407.17032)
- [PettingZoo (Farama Foundation)](https://pettingzoo.farama.org/)
- [CleanRL: High-quality Single-file Implementations of Deep RL Algorithms (arXiv 2111.08819)](https://arxiv.org/pdf/2111.08819) / [PPO 문서](https://docs.cleanrl.dev/rl-algorithms/ppo/)
- [CleanRL vs Stable Baselines3: PPO Training 2.3x Faster](https://buttondown.com/ckae930413/archive/cleanrl-vs-stable-baselines3-ppo-training-23x/)
- [Stable-Baselines3 문서](https://stable-baselines3.readthedocs.io/)
- [Ray RLlib 문서](https://docs.ray.io/en/latest/rllib/)
- [Using RLlib vs Stable-Baselines3 — Toolkit Comparison](https://frontierledger.ai/reinforcement-learning/using-rllib-vs-stable-baselines3toolkit-comparison)
- [TorchRL (PyTorch 공식)](https://pytorch.org/rl/)
- [Deep Java Library (DJL) — GitHub](https://github.com/deepjavalibrary/djl) / [PyTorch 엔진 문서](https://docs.djl.ai/master/engines/pytorch/index.html)
- [AI and Machine Learning in Java: TensorFlow, DJL, and Enterprise AI (2026)](https://www.javacodegeeks.com/2026/01/ai-and-machine-learning-in-java-tensorflow-djl-and-enterprise-ai.html)
- 관련 문서: [RL 정책 = 입력→출력 함수](./rl-trained-policy-as-input-output-function.md), [작은 전장 자가대국 + 판단 RL](./starcraft-micro-scenario-self-play-judgment-rl.md), [마이크로 시나리오 RL 난이도](./starcraft-scenario-micro-rl-feasibility.md), [게임 AI 라이브러리 언어 선택](../game-ai/game-ai-library-language-choice.md)
