# DOOMFLY는 결국 초파리의 타고난 반사 동작을 게임 조작에 매핑한 것인가

## 쉬운 설명

맞아요, 정확히 그겁니다. 파리채를 휙 휘두르면 파리가 생각할 겨를도 없이 반사적으로 피하죠? DOOMFLY는 그 "반사적으로 피하기", "움직이는 쪽으로 몸을 트는 반사" 같은 **타고난 본능(선천적 반사, innate reflex)**을 그대로 게임 버튼에 연결만 한 것입니다. 파리가 게임을 이해하고 전략을 짜는 게 아니라, 화면이 반짝이거나 뭔가 커지면 원래 있던 반사가 튀어나오고, 그 반사 신호를 "전진", "회전", "발사" 버튼으로 갈아 끼운 것뿐이에요.

## 일반 설명

지난 답변에서 설명했듯 기본 모드(default)는 학습이 전혀 없는 순수 시뮬레이션입니다. 그런데 "학습이 없는데 어떻게 게임처럼 보이는 반응이 나오는가"에 대한 답이 바로 이겁니다 — **커넥톰 안에 이미 존재하는 선천적 반사 회로를 게임 입력에 노출시켰을 뿐**입니다.

### 1. 입력 변환: 게임 화면 → 파리의 시각 자극

DOOMFLY는 Doom의 매 프레임을 파리의 겹눈(compound eye) 광수용체(photoreceptor)가 받는 자극값으로 바꿉니다. 구체적으로 화면 하나를 3,335개의 밝기(brightness) 신호와 811개의 색상(color) 신호로 쪼개어 시각 뉴런 입력단에 주입합니다. 즉 파리 입장에서는 "게임 화면"이 아니라 "눈앞에 어떤 명암·색 패턴이 움직이고 있다"로 받아들여집니다.

### 2. 이 자극이 건드리는 실제 회로 (진화가 이미 배선해둔 반사)

- **광학운동 반사(optomotor response)**: 시야 전체가 한쪽 방향으로 흐르는 것처럼 보이면(광류, optic flow), 몸이 그쪽으로 돌고 있다고 착각해 반대로 조종간을 트는 반사입니다. 원래는 날아다닐 때 자세를 안정시키기 위한 회로인데, 게임 화면이 좌우로 스크롤되면 이 반사가 그대로 발동해 "캐릭터를 돌리는" 것처럼 보입니다.
- **루밍(looming) 감지 + 자이언트 파이버(Giant Fiber) 탈출 회로**: 뭔가 갑자기 시야에서 커지면서 다가오는 패턴(적이 덮치는 듯한 모양)을 감지하면 초고속으로 몸을 튕겨 피하는 반사입니다. 실제 초파리 연구에서 잘 알려진 회로로, 포식자를 피하기 위해 학습 없이 원래부터 존재합니다.
- 이 밖에도 **빛을 따라가거나 피하는 주광성/기피 반사**, **장애물 회피 반사** 등 여러 선천적 반사 회로들이 동시에 자극을 받습니다.

이 회로들의 공통점은 **진화가 수백만 년에 걸쳐 이미 "튜닝"해놓은 고정 배선**이라는 것 — 그래서 사람이 추가로 학습을 시키지 않아도 자극만 주면 바로 반응이 나옵니다. 지난 답변에서 "커넥톰 = 이미 완성된 회로"라고 표현한 것이 바로 이 의미입니다.

### 3. 출력 매핑: 반사의 결과물을 게임 버튼에 강제로 연결

이렇게 발동된 반사 회로의 운동 뉴런(motor neuron) 발화 패턴을, 개발자가 미리 정해둔 규칙에 따라 "전진", "좌우 회전", "발사" 같은 Doom 조작 버튼에 그대로 대응시킵니다. 파리 입장에서는 "게임을 하고 있다"는 개념 자체가 없고, 그냥 "눈앞에 뭔가 움직이길래 반사적으로 몸을 튼 것"이 우연히 캐릭터의 움직임으로 번역될 뿐입니다.

### 4. 그래서 지난 답변의 "검증 실패"와도 정확히 맞아떨어짐

DOOMFLY 저장소가 "생존 검증 게이트를 통과하지 못했다"고 밝힌 이유가 바로 이것 때문입니다 — 파리는 게임의 목표("죽지 않고 오래 버티기")를 이해하고 전략을 세우는 게 아니라, 그때그때 타고난 반사만 실행하기 때문에 위험한 상황을 "학습해서 피하는" 능력이 없습니다. 화면이 특정 패턴으로 번쩍이면 반사적으로 꿈틀거릴 뿐, 그 꿈틀거림이 실제로 생존에 유리한 방향인지는 보장되지 않습니다. 그래서 실험적 가소성(도파민 기반 학습 시도)을 별도로 넣어봤지만, 아직 유의미한 개선을 만들어내지 못한 것입니다.

### 요약

> DOOMFLY의 "플레이"는 지능적 판단이 아니라, **게임 화면을 초파리의 타고난 시각 반사(광학운동 반사, 루밍 회피 반사 등)를 자극하는 신호로 변환한 뒤, 그 반사 출력을 게임 버튼에 강제로 매핑한 것**입니다. 사용자가 말한 "초파리의 기본 동작과 게임을 매핑시킨 것"이라는 이해가 정확합니다.

## 참고 자료

- [doomfly (GitHub, nftechie)](https://github.com/nftechie/doomfly)
- [Azimuthal invariance to looming stimuli in the Drosophila giant fiber escape circuit (J. Exp. Biology)](https://journals.biologists.com/jeb/article/226/8/jeb244790/307120/Azimuthal-invariance-to-looming-stimuli-in-the)
- [Neuronal ON/OFF Motion Detection Circuits Underlying Looming-Evoked Escape Behavior in Drosophila (bioRxiv)](https://www.biorxiv.org/content/10.1101/2019.12.26.883587.full.pdf)
- [Multiple mechanisms mediate the suppression of motion vision during escape maneuvers in flying Drosophila (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9523382/)
- [Tom's Hardware: Google maps entire brain of adult male fruit fly](https://www.tomshardware.com/software/programming/google-maps-entire-brain-and-central-nervous-system-of-adult-male-fruit-fly-software-engineers-immediately-make-it-run-doom-ai-powered-3d-model-of-over-166-000-neurons-can-also-play-super-mario-64)
