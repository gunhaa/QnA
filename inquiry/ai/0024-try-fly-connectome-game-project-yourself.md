# 초파리 커넥톰 게임 프로젝트, 직접 따라 해보기

## 쉬운 설명

이건 새로 자동차를 설계하는 게 아니라, 이미 완성돼서 도로 위를 잘 달리는 남의 자동차 설계도(커넥톰)를 받아서 내 차고(내 컴퓨터)에서 시동만 걸어보는 것과 같아요. 그래서 [지난번 강화학습 답변](../reinforcement-learning/train-neural-network-to-play-games-methods-and-specs.md)처럼 몇 시간씩 "훈련"시킬 필요가 없고, 그냥 내려받아서 실행 버튼만 누르면 됩니다.

## 일반 설명

### 난이도별 3가지 접근법

| 난이도 | 방법 | 특징 |
|---|---|---|
| **하 (추천)** | 공개된 오픈소스 데모를 그대로 클론해서 로컬에서 실행 | 커넥톰 데이터가 이미 프로젝트에 내장/전처리되어 있어 별도 데이터 다운로드·계정 없이 바로 체험 가능 |
| **중** | 커넥톰 원본 데이터를 직접 받아서 나만의 LIF 시뮬레이터에 연결 | neuPrint/FlyWire 계정과 API 토큰 필요, 원하는 뉴런 집합·감각 매핑을 직접 설계 |
| **상** | 처음부터 시뮬레이터 + 게임 엔진을 직접 구현 | 스파이킹 뉴런 모델링, 실시간 렌더링, 입출력 매핑까지 전부 자체 구현 |

### 1) 가장 빠른 시작: 기존 오픈소스 그대로 실행

가장 손이 덜 가는 프로젝트는 **fly-escape**입니다. 브라우저에서 로컬로 도는 3D 게임이고, MaleCNS 커넥톰 중 일부를 이미 데이터로 포함하고 있어 계정이나 별도 다운로드가 필요 없습니다.

```bash
# 사전 준비: Rust(rustup), Bun 설치
rustup target add wasm32-unknown-unknown
git clone https://github.com/dzhng/fly-escape
cd fly-escape
bun install
bun run build
bun run dev
# 터미널에 뜨는 로컬 URL을 브라우저로 열면 끝
```

Rust로 짠 스파이킹 뉴런 시뮬레이션을 WebAssembly로 컴파일해서 브라우저에서 돌리고, 화면 표시·월드 로직은 TypeScript가 맡는 구조입니다.

다른 선택지:

- **[DOOMFLY](https://github.com/nftechie/doomfly)**: Node.js 22.13 이상 필요. `doom-ui/` 폴더에서 `npm ci` → `.dev.vars`에 `DOOM_STREAM_ORIGIN` 설정 → `npm run dev`. 실제 Doom 엔진과 실시간으로 화면/조작을 주고받는 구조라 별도 Doom 스트림 서버가 있어야 하고, 로컬 검증은 `pytest`로 합니다. 셋업 난이도가 fly-escape보다 조금 높습니다.
- **[desktop-fly](https://github.com/DenisSergeevitch/desktop-fly)**: macOS 전용 데스크탑 앱. FlyWire 커넥톰 중 약 668개 뉴런/19,000개 시냅스 회로만 뽑아 걷기·그루밍 등 행동을 재현합니다.

### 2) 원본 커넥톰 데이터를 직접 받고 싶다면

내가 원하는 뉴런/회로를 직접 골라서 시뮬레이션을 짜고 싶다면 원본 데이터에 접근해야 합니다.

- **neuPrint** (`neuprint-python`): Google 계정으로 [neuprint.janelia.org](https://neuprint.janelia.org)에 로그인해 API 토큰 발급 → `Client(server="neuprint.janelia.org", dataset="hemibrain:v1.2.1", token=...)` 형태로 뉴런/시냅스 연결 정보를 쿼리.
- **MaleCNS 대량 다운로드**: [male-cns.janelia.org/download](https://male-cns.janelia.org/download/)에서 커넥톰 전체를 CSV/neo4j 백업 형태로 통째로 받을 수 있음 (`gs://flyem-male-cns/v1.0/connectome-data/` 버킷).
- **FlyWire Codex**: [codex.flywire.ai](https://codex.flywire.ai/)에서 정적 스냅샷 CSV를 다운로드 (실시간 쿼리 API는 제공하지 않음, "Info → Download Data" 메뉴 이용).

받은 연결 정보(뉴런 쌍 + 시냅스 개수 + 신경전달물질 극성)를 인접행렬로 만들고, LIF(leaky integrate-and-fire) 규칙으로 매 타임스텝 갱신하는 루프를 직접 작성하면 [지난 답변](fruit-fly-connectome-game-playing.md)에서 설명한 시뮬레이션을 처음부터 재현할 수 있습니다.

### 3) 필요한 컴퓨터 사양

**GPU가 필요 없습니다.** 지난번 강화학습(신경망을 처음부터 훈련시키는 것) 질문과 이 프로젝트는 성격이 다릅니다 — 여기서는 "학습"이 아니라 이미 정해진 배선을 그대로 시뮬레이션만 하는 것이고, 다루는 뉴런 수도 수백~십만 단위의 LIF(단순 덧셈/비교 연산) 모델이라 연산량이 딥러닝 학습에 비해 훨씬 가볍습니다.

- fly-escape, desktop-fly: 일반 노트북 CPU(최근 4~5년 내 제품), RAM 8GB 이상이면 충분. 브라우저(Chrome/Edge 최신 버전)의 WebAssembly 지원만 있으면 됨.
- DOOMFLY: Node.js 실행 환경 + Doom 엔진을 함께 띄우므로 약간 더 여유(RAM 16GB 권장) 있는 편이 쾌적함.
- 원본 데이터를 직접 다운로드해 분석할 경우: MaleCNS 전체 백업은 용량이 크므로(수 GB~수십 GB) 디스크 여유 공간을 확인할 것.

### 실행 순서 요약

1. Rust + Bun 설치 (Windows는 `winget install Rustlang.Rustup`, Bun은 공식 설치 스크립트)
2. `dzhng/fly-escape` 클론 후 위 명령어로 빌드·실행
3. 잘 동작하면 `nftechie/doomfly`, `DenisSergeevitch/desktop-fly`(macOS 한정) 순으로 확장
4. 직접 회로를 골라보고 싶어지면 neuPrint API 토큰을 발급받아 원하는 뉴런 집합을 쿼리

## 참고 자료

- [fly-escape (GitHub)](https://github.com/dzhng/fly-escape)
- [doomfly (GitHub)](https://github.com/nftechie/doomfly)
- [desktop-fly (GitHub)](https://github.com/DenisSergeevitch/desktop-fly)
- [awesome-fly — 관련 프로젝트 모음](https://github.com/cobanov/awesome-fly)
- [MaleCNS connectome download (Janelia)](https://male-cns.janelia.org/download/)
- [Codex: FlyWire](https://codex.flywire.ai/)
- [neuprint-python Quickstart](https://connectome-neuprint.github.io/neuprint-python/docs/quickstart.html)
- [fly_connectome_data_tutorial (GitHub)](https://github.com/sjcabs/fly_connectome_data_tutorial)
