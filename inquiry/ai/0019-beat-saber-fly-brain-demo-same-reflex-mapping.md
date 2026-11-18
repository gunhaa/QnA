# 비트세이버 초파리 뇌 데모도 DOOMFLY와 같은 "패턴 매핑"일 뿐인가

## 쉬운 설명

네, 맞아요. 이것도 DOOMFLY와 똑같은 원리예요 — 파리 눈앞에 뭔가 다가오면서 커지는 걸 보여주면 반사적으로 몸이 반응하는데, 그 반응을 "왼쪽 베기/오른쪽 베기"로 갈아 끼운 것뿐입니다. 그래서 리듬을 "이해"하고 연습해서 느는 게 아니라, 그냥 블록이 다가올 때마다 반사적으로 꿈틀거리는 거라 음표를 자주 놓칩니다.

## 일반 설명

맞습니다 — 비트세이버 데모(개발자 lyra bubbles가 공개, Three.js로 구현)도 지금까지 살펴본 DOOMFLY·fly-escape와 **완전히 동일한 구조**를 가진 사례입니다.

### 동작 구조

1. **감각 입력 매핑**: 게임 화면(다가오는 빨강/파랑 블록)을 초파리의 시각 뉴런 자극값으로 변환해서 커넥톰에 주입.
2. **고정 배선을 통한 신호 전파**: MaleCNS 커넥톰을 LIF(leaky integrate-and-fire) 시뮬레이터로 돌려 신호가 퍼짐 — 앞서 설명한 것처럼 **가중치는 전혀 학습되지 않고 고정**.
3. **운동 출력 매핑**: 130개 운동 뉴런(motor neuron)의 발화 패턴을 읽어서 "왼쪽 세이버 휘두르기 / 오른쪽 세이버 휘두르기"에 대응.

즉 지난 답변들에서 설명한 것과 같은 파이프라인 — **① 감각 뉴런에 자극 주입 → ② 고정 커넥톰으로 전파 → ③ 운동 뉴런 출력을 버튼에 매핑** — 을 게임만 바꿔서 재사용한 것입니다.

### 왜 여기서도 "학습"처럼 보이지 않는가

이 데모 역시 **다가오면서 점점 커지는 시각 패턴**(블록이 플레이어 쪽으로 날아오는 것)을 활용하는데, 이는 앞서 설명한 **루밍(looming) 감지 회로**가 반응하기 딱 좋은 조건입니다. 블록이 좌우 어느 위치에 있는지는 초파리 시각계가 원래 좌우 반구로 나뉘어 있다는 **양측 대칭 구조** 덕분에 자연스럽게 좌/우 운동 경로로 갈립니다. 다시 말해 "빨간 블록/파란 블록을 구분해서 학습했다"기보다, **"왼쪽에서 뭔가 커지며 다가오면 왼쪽 반사, 오른쪽이면 오른쪽 반사"**가 이미 배선돼 있는 걸 그대로 이용한 것에 가깝습니다.

이를 뒷받침하는 사실: 보도에 따르면 이 디지털 파리는 **박자를 자주 놓칩니다("regularly misses notes")**. 리듬 게임에서 필요한 건 "정확한 타이밍에 정확한 방향으로 베기"인데, 반사 회로는 타이밍이나 정확도를 스스로 개선하지 못하므로 이런 미스가 반복되는 것 — DOOMFLY의 "생존 검증 실패"와 같은 성격의 결과입니다.

### 종합

| 항목 | DOOMFLY | 비트세이버 데모 |
|---|---|---|
| 데이터 | MaleCNS v1.0 커넥톰 | MaleCNS v1.0 커넥톰 |
| 학습 여부(기본) | 없음, 고정 시뮬레이션 | 없음, 고정 시뮬레이션 |
| 활용하는 반사 | 광학운동 반사, 루밍 회피 | 루밍 회피 + 좌우 대칭 구조 |
| 실제 성능 | 생존 검증 실패 | 박자를 자주 놓침 |
| 공통 결론 | 지능적 판단이 아니라 반사 재활용 | 지능적 판단이 아니라 반사 재활용 |

즉 질문하신 대로, 비트세이버 사례도 **새로운 걸 학습시킨 게 아니라, 기존에 정리한 "특정 시각 패턴(루밍/좌우 위치) → 고정 반사 → 게임 버튼" 매핑을 그대로 실행시킨 것**이 맞습니다.

## 참고 자료

- [After Google mapped an adult male fruit fly's brain, software engineers made it play Doom, Mario64, and Beat Saber (PC Gamer)](https://www.pcgamer.com/hardware/after-google-mapped-an-adult-male-fruit-flys-brain-software-engineers-made-it-play-doom-mario64-and-beat-saber/)
- [Google's digital fly brain gets its own heaven after going through Beat Saber hell (Dexerto)](https://www.dexerto.com/gaming/googles-digital-fly-brain-gets-its-own-heaven-after-going-through-beat-saber-hell-3407304/)
- [Google's Open-Source Fly Brain Connectome: The Viral Demos Explained (Stork.AI)](https://www.stork.ai/blog/google-unleashed-a-fly-brain-chaos-ensued)
- [flybrain (GitHub, snedea) — FlyWire FAFB 기반 139K LIF 뉴런 시뮬레이션](https://github.com/snedea/flybrain)
