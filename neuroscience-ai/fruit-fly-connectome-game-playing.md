# 초파리 뇌 커넥톰(connectome)으로 게임을 플레이하는 원리

## 한 줄 비유

초파리 뇌 지도는 **미로처럼 얽힌 전선 배선도**예요. 이미 배선이 다 되어 있어서, 전기 스위치(감각 자극)만 켜주면 정해진 길을 따라 신호가 흐르다가 반대편 스위치(운동 출력)에 불이 켜집니다. "학습"이 아니라 "이미 완성된 회로에 전류를 흘려보는 것"에 가깝습니다.

## 무엇이 공개되었나

2026년 9월 3일, HHMI Janelia와 Google Research가 **MaleCNS v1.0**이라는 초파리 수컷 성체의 뇌+중추신경계 전체 배선도(커넥톰, connectome)를 공개했습니다.

- 뉴런(neuron) 약 166,000개
- 시냅스(synapse, 뉴런 사이 연결) 약 1억 2,500만 개

공개 직후 개발자들이 이 데이터를 그대로 가져다 **DOOM, 마리오64, 비트세이버(Beat Saber), 마인크래프트**를 플레이시키는 데모를 만들면서 화제가 됐습니다. 대표 사례:

- [DOOMFLY](https://github.com/nftechie/doomfly) — 초파리 뇌 시뮬레이션이 둠(Doom)을 플레이
- [fly-escape](https://github.com/dzhng/fly-escape) — 초파리들이 집 안 미로를 탈출하는 3D 브라우저 게임
- [desktop-fly](https://github.com/DenisSergeevitch/desktop-fly) — 맥 데스크탑에서 실시간으로 걷고 그루밍하는 3D 초파리
- [awesome-fly](https://github.com/cobanov/awesome-fly) — 관련 프로젝트 모음 리스트

## 어떻게 "플레이"가 가능한가 (동작 원리)

1. **뇌를 그래프(graph)로 취급**: 뉴런 하나하나가 노드(node), 시냅스 하나하나가 가중치(weight)가 있는 방향성 간선(edge)입니다. 가중치는 실제 전자현미경으로 센 시냅스 개수와 신경전달물질(흥분성/억제성) 극성에서 그대로 가져옵니다.
2. **LIF(leaky integrate-and-fire) 모델로 시간 시뮬레이션**: 각 뉴런은 "막전위가 쌓이다가 임계값을 넘으면 발화(spike)하고, 발화가 없으면 서서히 새어나간다(leak)"는 아주 단순한 규칙만 따릅니다. 이 규칙을 그래프 전체에 대해 매 시간 단계(timestep)마다 반복 계산합니다.
3. **입출력 매핑**: 게임 화면(픽셀)을 초파리의 시각 뉴런(광수용체 계통) 자극값으로 변환해서 그래프에 주입하고, 반대편 끝에 있는 특정 운동 뉴런(motor neuron)의 발화 패턴을 "왼쪽으로 돌기/전진/발사" 같은 게임 입력 버튼에 고정으로 대응시킵니다.
4. **역전파(backpropagation) 학습이 없음**: 시냅스 가중치를 경사하강법(gradient descent)으로 조정하지 않고, 실측된 연결 그대로 고정해서 씁니다. 그래서 "학습된 결과"가 아니라 "이미 존재하는 배선을 그대로 실행"한 것에 가깝습니다.

## 사용자가 말한 "거대한 그래프 탐색 계산식" 맞는가?

정확히 맞습니다. 조금 더 정밀하게 말하면:

- 이건 "탐색(search)"이라기보다는 **매 순간 그래프 전체의 상태를 동시에 갱신하는 반복 계산(iterative simulation)**입니다. A→B 최단경로를 찾는 게 아니라, 그래프 인접행렬(adjacency matrix)을 순환 신경망(RNN, recurrent neural network)의 가중치 행렬처럼 사용해서 매 타임스텝 `다음 상태 = f(현재 상태 × 연결 가중치)`를 계속 반복하는 것입니다.
- 즉 "커넥톰 = 이미 짜여진 RNN"이라고 보면 됩니다. 다만 이 RNN은 사람이 학습시킨 게 아니라 진화가 수백만 년에 걸쳐 "학습"시켜 놓은 가중치를, 전자현미경으로 그대로 읽어낸 것뿐입니다.
- 실제로 학계에서도 이런 접근을 "connectome-constrained network"(커넥톰으로 고정된 네트워크)라고 부르며, 2024년 Nature에 실린 연구(Lappalainen 외)에서 시각계 커넥톰만으로 실제 뉴런 반응을 상당히 정확히 예측할 수 있음을 보였습니다.

## 참고 자료 (근거 논문/코드)

- [awesome-fly (GitHub)](https://github.com/cobanov/awesome-fly) — 초파리 커넥톰 관련 프로젝트 총정리
- [DOOMFLY (GitHub)](https://github.com/nftechie/doomfly)
- [fly-escape (GitHub)](https://github.com/dzhng/fly-escape)
- [desktop-fly (GitHub)](https://github.com/DenisSergeevitch/desktop-fly)
- [Connectome-constrained networks predict neural activity across the fly visual system (Nature, 2024)](https://www.nature.com/articles/s41586-024-07939-3)
- [A leaky integrate-and-fire computational model based on the connectome of the entire adult Drosophila brain (bioRxiv/Nature)](https://www.biorxiv.org/content/10.1101/2023.05.02.539144.full.pdf)
- [Whole-Brain Connectomic Graph Model Enables Whole-Body Locomotion Control in Fruit Fly (arXiv 2602.17997)](https://arxiv.org/pdf/2602.17997)
- [Google's Open-Source Fly Brain Connectome: The Viral Demos Explained (Stork.AI)](https://www.stork.ai/blog/google-unleashed-a-fly-brain-chaos-ensued)
- [Tom's Hardware: Google maps entire brain of adult male fruit fly](https://www.tomshardware.com/software/programming/google-maps-entire-brain-and-central-nervous-system-of-adult-male-fruit-fly-software-engineers-immediately-make-it-run-doom-ai-powered-3d-model-of-over-166-000-neurons-can-also-play-super-mario-64)
