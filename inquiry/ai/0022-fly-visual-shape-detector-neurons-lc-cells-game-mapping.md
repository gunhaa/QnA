# 3D 게임에서 특정 모양을 보면 버튼이 눌리게 만들 수 있을까 (학습 없이)

## 쉬운 설명

파리 눈에는 이미 "모양별 스티커"가 몇 개 붙어 있어요 — "커지면서 다가오는 동그라미" 전용 스티커, "작게 움직이는 점" 전용 스티커, "옆으로 스윽 지나가는 선" 전용 스티커. 그 스티커랑 딱 맞는 모양이 화면에 나타나면 배우지 않아도 자동으로 "삑!"(반사)이 울립니다. 그러니까 **그 몇 가지 정해진 스티커 모양이면** 학습 없이도 "모양 보면 버튼 누르기"가 됩니다. 근데 그 스티커 목록에 없는 완전히 새로운 모양(게임에만 있는 특이한 아이콘 같은 것)은 반응이 안 나와요.

## 일반 설명

가능합니다 — 단, **초파리가 진화적으로 이미 갖추고 있는 정해진 시각 패턴 종류에 한해서만** 학습 없이 됩니다.

### 1. LC(lobula columnar) 뉴런 — 초파리 눈 속의 "고정된 모양 인식기 세트"

초파리의 시각계에는 **엽구 기둥 뉴런(lobula columnar neuron, LC neuron)**이라는 특수한 뉴런 집단이 있고, 최소 22종 이상이 해부학적으로 구분돼 있습니다. 각 LC 유형은 특정 시각 패턴에만 반응하는 **매치드 필터(matched filter)**처럼 작동하며, 반응하면 정해진 중심뇌 영역(광학 사구체, optic glomerulus)으로 신호를 보내 **고정된 행동 프로그램**을 실행시킵니다. 대표적인 예:

| LC 유형 | 반응하는 시각 패턴 | 유발되는 행동 |
|---|---|---|
| LC4, LPLC1, LPLC2 | 화면에서 원형이 확대되며 다가오는 패턴(루밍, looming — 포식자가 덮치는 모양) | 급회피 반응 |
| LC10 계열 | 작게 움직이는 점(작은 목표물) | 추적/추격 행동 (구애 시 사용) |
| LC18 | 렌즈 해상도보다 작은 물체 | 물체 감지 반응 |
| LC25 | 복잡한 선형(직선) 움직임 | 별도의 회피/반응 행동 |

즉 이 뉴런들은 사람이 딥러닝 모델을 학습시켜 만드는 "물체 인식기(object detector)"를, 진화가 이미 하드웨어(배선)로 완성해놓은 버전이라고 볼 수 있습니다. 각 유형은 15°~40° 정도의 좁은 시야(수용장, receptive field)를 담당하는 국소 특징 감지기로 작동합니다.

### 2. 그래서 3D 게임에 적용한다면

원하는 게임 이벤트(예: "적이 갑자기 화면 가운데서 커지며 튀어나옴", "작은 아이템이 화면 구석에서 반짝이며 움직임")를 위 표에 있는 패턴과 **실제로 시각적으로 유사하게** 렌더링하도록 만들면:

- 별도의 학습 없이도, 해당 LC 뉴런이 반응 → 그 결과로 나오는 고정된 행동(회피 턴, 추적 움직임)을 원하는 게임 버튼에 매핑해서 **"이 모양을 보면 이 버튼을 누른다"**를 신뢰성 있게 구현할 수 있습니다.
- 예를 들어 LC10 계열의 "작은 표적 추적" 반사를 이용하면, 게임 속 조준점(에임)이 작게 움직이는 적을 저절로 따라가게 만드는 것도 원리적으로 가능합니다.

### 3. 한계 — 임의의 모양은 안 됨

문제는 **이 20여 종 목록에 없는 임의의 모양**입니다. 예를 들어 "이 게임에만 있는 특정 로고나 UI 아이콘을 보면 버튼을 눌러라" 같은 건 초파리가 진화적으로 준비해둔 반사 목록에 없기 때문에, 아무리 화면을 잘 변환해서 넣어줘도 **일관된 반응이 나오지 않습니다.**

이런 "새로운 임의의 자극 ↔ 반응"을 연결하려면 실제로는 **연합 학습(associative learning)**이 필요한데, 이는 지난 답변에서 다룬 버섯체(mushroom body, KC→MBON 경로)의 도파민 기반 가소성 영역이 담당하는 기능입니다. 그리고 그 학습 메커니즘은 (DOOMFLY 사례에서 확인했듯) 아직 신뢰성 있게 작동한다고 검증되지 않은 상태입니다.

### 정리

| 구분 | 가능 여부 | 이유 |
|---|---|---|
| 루밍, 작은 점, 특정 엣지 움직임 등 **진화가 이미 준비한 20여 종 패턴** | **가능** (학습 불필요) | LC 뉴런이 이미 고정 배선된 "모양 인식기"이기 때문 |
| 게임 고유의 임의 아이콘/로고/텍스트 등 **새로운 임의 모양** | **불가능** (학습 필요, 현재 미검증) | 진화적으로 준비되지 않은 자극이라 연합 학습(mushroom body 가소성)이 필요하나 아직 안정적으로 작동하지 않음 |

## 참고 자료

- [Visual projection neurons in the Drosophila lobula link feature detection to distinct behavioral programs (eLife, 2017)](https://elifesciences.org/articles/21022)
- [A functionally ordered visual feature map in the Drosophila brain (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S0896627322001787)
- [Feature detecting columnar neurons mediate object tracking saccades in Drosophila (bioRxiv)](https://www.biorxiv.org/content/10.1101/2022.09.21.508959.full.pdf)
- [Inhibitory Interactions and Columnar Inputs to an Object Motion Detector in Drosophila (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S2211124720300863)
- [doomfly (GitHub, nftechie)](https://github.com/nftechie/doomfly)
