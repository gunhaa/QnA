# STT(음성 인식) 방법: 오픈소스, 클라우드 API, 한국어 솔루션

## 쉬운 설명

STT는 "귀로 들은 말을 글자로 받아 적는 속기사"다. 속기사를 **직접 고용해 우리 사무실에 앉히는 방법**(오픈소스 모델을 내 서버에서 실행)과 **외주 속기 회사에 파일을 보내고 분 단위로 요금을 내는 방법**(클라우드 API)이 있다. 외주는 편하고, 직접 고용은 기밀이 새지 않지만 사무실(GPU)이 필요하다.

## 일반 설명

### 1. 기술 구성요소

| 용어 | 의미 |
|---|---|
| **ASR/STT** | 음성 → 텍스트 변환 |
| **배치(Batch/Pre-recorded)** | 완성된 파일을 한 번에 변환. 회의록에 적합, 저렴 |
| **스트리밍(Real-time)** | 말하는 중에 실시간 변환. 비용 높고 지연이 중요 |
| **Diarization(화자 분리)** | "누가 말했나" 구분. 회의록 핵심 |
| **타임스탬프/Word-level** | 단어별 시간. 자막·구간 요약에 필요 |
| **VAD** | 음성 구간 검출. 무음 제거로 비용·환각 감소 |
| **WER/CER** | 단어/글자 오류율. 한국어는 띄어쓰기 변동이 커서 **CER**를 주로 사용 |
| **커스텀 어휘** | 사내 용어·고유명사 힌트(phrase boost, keyterm 등) |

### 2. 방법 A: 오픈소스 모델 자체 호스팅

- **OpenAI Whisper (large-v3 / turbo)**: 사실상 표준. 다국어, 오프라인 가능. 단점은 무음 구간 환각, 기본 화자 분리 없음.
- **faster-whisper (CTranslate2)**: Whisper 재구현. 속도 수 배 빠르고 메모리 적음. 서버 운영에 많이 쓴다.
- **whisper.cpp**: CPU/엣지/Apple Silicon용 경량 실행.
- **WhisperX**: faster-whisper + 단어 정렬 + **pyannote 화자 분리** 조합. 회의록 파이프라인에 인기.
- **pyannote.audio**: 화자 분리 전용(모델 라이선스/토큰 약관 확인 필요).
- **한국어 파인튜닝 모델**: Hugging Face에 Whisper 한국어 파인튜닝본이 다수 있다. 검색된 자료에서 약 1,000시간 한국어 데이터로 Whisper를 개선한 연구도 확인된다. 품질 편차가 있어 자체 검증이 필요하다.

| 장점 | 단점 |
|---|---|
| 데이터 외부 반출 없음(보안/규제) | GPU 운영·스케일링·모니터링 부담 |
| 대량 처리 시 분당 단가 최저 | 화자 분리·후처리 직접 조립 |
| 튜닝·도메인 적응 가능 | 실시간 스트리밍 구성이 어려움 |

검색된 자료 기준 Whisper large-v3를 A10G급 GPU에서 돌리면 대략 분당 $0.002 수준이지만, 상시 가동·유휴 비용과 운영 인건비는 별도다.

### 3. 방법 B: 클라우드 STT API

가격은 검색된 2차 비교 글(2026) 기준이며 **변동이 잦으므로 공식 요금표로 재확인**한다.

| 서비스 | 특징 | 참고 가격 |
|---|---|---|
| **OpenAI** `gpt-4o-transcribe`, `gpt-4o-transcribe-diarize`, `whisper-1` | LLM 기반 정확도, diarize 모델은 화자 분리 내장(2025-10 출시) | 4o-transcribe 약 $6/1,000분 (토큰 과금 기준 입력 $2.50/1M 오디오 토큰, 출력 $10/1M) |
| **Deepgram** (Nova-3, Flux) | 저지연·스트리밍 강점, 배치/실시간 모두 | 배치 약 $0.0043/분, 스트리밍 약 $0.0077/분 |
| **AssemblyAI** (Universal) | 화자 분리·요약·감정 등 Audio Intelligence 번들 | 약 $0.37/시간, 스트리밍 약 $0.15/시간 |
| **Google Cloud Speech-to-Text v2** (Chirp) | 다국어 폭넓음, GCP 연동 | 약 $16/1,000분, 대량 시 $4/1,000분 |
| **AWS Transcribe** | AWS 연동(S3·Lambda), 화자 분리·커스텀 어휘 | 약 $1.44/시간 |
| **Azure AI Speech** | Fast/Batch Transcription, 화자 분리, 커스텀 모델, **Teams/M365와 동일 벤더** | 공식 요금표 확인 |
| **ElevenLabs Scribe** | 다국어·화자 분리 | 요금표 확인 |

### 4. 한국어 특화/로컬 솔루션

- **Naver CLOVA Speech**: 한국어 회의록·콜센터 용도. 화자 분리·키워드 부스팅 지원.
- **Return Zero VITO(RTZR)**: 한국어 중심 STT API. 스트리밍 지원.
- **ETRI 음성인식 API**: 연구기관 제공 API.
- **벤치마크**: RTZR의 [Awesome-Korean-Speech-Recognition](https://www.sourcepulse.org/projects/2336157) 저장소가 Whisper, Google v2, ETRI, Clova Speech, VITO를 AI-Hub 데이터셋(대화, 콜센터, 교육)에서 **CER**로 비교한다. 다만 벤더가 운영하는 벤치마크라 편향 가능성이 있으므로 **자사 회의 샘플로 직접 재측정**하는 것이 정확하다.

### 5. 선택 가이드 (회의록 요약 용도)

| 상황 | 추천 |
|---|---|
| Teams 회의, 트랜스크립션 사용 가능 | **STT 불필요** — Graph 트랜스크립트 사용 ([관련 문서](../collaboration-tools/teams-meeting-transcript-summary-pipeline.md)) |
| 한국어 품질 최우선, 빠른 도입 | Clova Speech / RTZR 또는 gpt-4o-transcribe(diarize)를 PoC 비교 |
| 보안상 외부 전송 불가 | faster-whisper/WhisperX + pyannote 자체 호스팅 |
| 화자 분리·요약까지 한 번에 | AssemblyAI, OpenAI diarize 모델 |
| 이미 Azure/AWS/GCP 사용 | 해당 클라우드의 Speech/Transcribe/STT (IAM·네트워크 통합) |
| 대량 장기 처리, 비용 민감 | 자체 호스팅(배치, 스팟 GPU) |
| 실시간 자막/콜센터 | Deepgram, Azure Speech, Clova 스트리밍 |

### 6. 권장 파이프라인

```
오디오(mp4/m4a) → ffmpeg로 16kHz mono 변환 → VAD로 무음 제거
  → STT(+word timestamp) → 화자 분리(diarization) → 정렬/병합
  → 후처리(용어 사전 교정, 문장부호) → LLM 요약/분석
```

- 긴 파일은 구간 분할 후 처리하고, API별 **파일 크기/길이 제한**(예: 업로드 용량 상한)을 확인한다.
- Whisper 계열은 무음에서 문장을 지어내는 환각이 있어 VAD가 사실상 필수다.
- 평가는 대표 회의 5~10건에 정답 대본을 만들어 **CER + 화자 분리 정확도(DER) + 고유명사 정확도**로 비교한다.

### 7. 보안·비용 체크리스트

- 데이터 보존/학습 활용 여부 (옵트아웃, 제로 리텐션 옵션), 리전/데이터 거주지.
- 비공개 연결(VPC/Private Link), 인증 방식, 감사 로그.
- 총비용 = API 분당 단가 × 회의 시간, 또는 GPU + 운영 인력. 월 수백 시간 이하면 API가 보통 유리하고, 대량·상시면 자체 호스팅이 유리해진다 (손익분기는 직접 계산 필요).

### 주의

- 가격·벤치마크는 2차 자료(비교 블로그) 기반이다. 한국어 지원 수준과 Azure/ElevenLabs 요금은 이번 검색에서 확인하지 못했으니 공식 문서로 확인할 것.

### 출처

- [Best Speech-to-Text APIs in 2026 (Deepgram)](https://deepgram.com/learn/best-speech-to-text-apis-2026)
- [Speech-to-Text APIs in 2026: Benchmarks, Pricing (FutureAGI)](https://futureagi.com/blog/speech-to-text-apis-in-2026-benchmarks-pricing-developer-s-decision-guide/)
- [Speech-to-Text API Pricing 2026](https://convertaudiototext.com/blog/speech-to-text-api-pricing-2026)
- [5 Google Cloud Speech-to-Text alternatives in 2026 (AssemblyAI)](https://www.assemblyai.com/blog/google-cloud-speech-to-text-alternatives)
- [gpt-4o-transcribe-diarize 정보](https://cloudprice.net/models/openai-gpt-4o-transcribe-diarize)
- [GPT-4o Transcribe 스펙/가격](https://gate.ai/blog/gpt-4o-transcribe-openai-specs-pricing-api-use-cases)
- [Awesome-Korean-Speech-Recognition (RTZR)](https://www.sourcepulse.org/projects/2336157)
