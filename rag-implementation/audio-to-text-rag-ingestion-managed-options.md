# 회의 녹음 → 텍스트 → RAG DB 적재: 직접 구현 없이 가능한 방법

## 쉬운 설명

받아쓰기(STT)부터 서랍 정리(RAG DB 저장)까지 **직접 다 만들 필요는 없다**. 받아쓰기를 해 주는 가게(관리형 서비스)나, 파일을 던지면 알아서 글자로 바꿔 서랍에 넣어 주는 도구가 이미 있다. 다만 "우리 서랍(RAG DB)에 맞게 연결하는 얇은 배관"은 보통 조금 만들어야 한다.

## 일반 설명

### 1. 결론

- **STT 엔진은 직접 구현하지 않아도 된다.** 관리형 API/서비스가 변환까지 해 준다.
- **완전 무코딩은 아니다.** 변환 결과를 청킹·임베딩해 RAG DB에 넣는 연결부는 대개 필요하다. 다만 프레임워크나 관리형 인덱서를 쓰면 설정 수준으로 줄어든다.
- Teams 회의라면 STT 자체를 건너뛴다. Teams가 만든 트랜스크립트(VTT)를 Graph로 받으면 된다 ([관련 문서](../collaboration-tools/teams-meeting-transcript-summary-pipeline.md)).

### 2. 선택지 (구현량 적은 순)

| 수준 | 방법 | 설명 | 직접 구현 |
|---|---|---|---|
| **1. 관리형 인제스트 파이프라인** | **Azure AI Content Understanding** (+ Azure AI Search) | 오디오/비디오를 화자 분리된 **WebVTT 트랜스크립트**와 요약으로 변환. `prebuilt-audioSearch`, `prebuilt-videoSearch` 분석기 제공. 검색된 문서 기준 Azure AI Search의 Blob/SharePoint/OneLake 지식 소스에서 `contentExtractionMode = standard`로 인덱싱 파이프라인에 연결 가능 | 거의 설정 |
| **2. 오픈소스 RAG 엔진** | **RAGFlow** 등 | 검색된 자료 기준 RAGFlow는 오디오 파일 파싱을 지원. 파일 업로드 → 파싱 → 청킹 → 인덱싱을 UI로 처리 | 설정 + 운영 |
| **3. 프레임워크 로더** | **LlamaIndex / LangChain** + AssemblyAI 등 리더 | `AssemblyAIAudioTranscriptReader`가 파일 경로/URL의 오디오·비디오를 받아 Document로 반환(기본 전체 트랜스크립트 1건). 이후 청킹·임베딩·벡터 스토어 적재 | 수십 줄 코드 |
| **4. Teams 전용 노코드** | **Power Automate + Graph 커넥터** | 트랜스크립트(.vtt)를 가져와 SharePoint/OneDrive에 저장. Teams는 트랜스크립트를 녹화처럼 자동으로 폴더에 저장하지 않아 이 자동화가 필요함. SharePoint에 쌓이면 이후 Azure AI Search 인덱서로 연결 | 플로우 구성 |
| **5. 직접 조립** | STT API/Whisper + 청킹 + 임베딩 + DB | 최대 자유도(사내 pgvector 등) | 전부 구현 |

### 3. 이미 pgvector/자체 RAG가 있을 때

사내에 Spring AI + pgvector 같은 RAG가 있다면 ([인제스트 설계 문서](rag-internal-policy-xlsx-ingestion-design.md)) 가장 현실적인 구성은 다음과 같다.

```
Teams 트랜스크립트(Graph) 또는 오디오 → [STT: 관리형 API, 필요 시만]
   → VTT 파싱 → 화자/시간 메타데이터 보존 → 청킹 → 임베딩 → pgvector
```

- STT 부분만 외부 서비스로 대체하고, 기존 인제스트 엔드포인트에 **"VTT/트랜스크립트 파서"** 하나만 추가하면 된다.
- 청킹 팁: 발화 단위로 합쳐 일정 길이(시간 구간)로 묶고, `meeting_id`, `speaker`, `start/end time`, `date`, `participants`를 메타데이터로 저장한다. 검색 결과에서 해당 시각으로 되돌아갈 수 있다.
- 요약본(summary)과 원문 청크를 **둘 다** 저장하면 개요 질문과 세부 질문 모두에 대응한다.

### 4. 선택 기준

| 상황 | 추천 |
|---|---|
| Azure/M365 환경, 코딩 최소화 | Content Understanding + Azure AI Search, 또는 Power Automate → SharePoint → AI Search |
| 사내 자체 RAG(pgvector 등) 보유 | 파서 1개 추가(옵션 5의 일부), STT만 관리형 사용 |
| 빠른 PoC | LlamaIndex + 관리형 STT 리더 |
| 외부 반출 불가 | RAGFlow 자체 호스팅 + 로컬 STT 모델 (Whisper 계열) |

### 5. 주의

- 관리형 서비스는 **한국어 품질, 화자 분리 지원, 파일 크기/길이 제한, 리전, 가격**을 PoC로 확인해야 한다.
- 회의 녹음은 민감 정보라 보존·접근 권한(회의 참석자만 검색 가능 등)을 RAG 메타데이터 필터로 반영해야 한다.
- Content Understanding 세부 연동 옵션은 문서가 자주 바뀌므로 공식 문서 확인이 필요하다. RAGFlow의 오디오 지원 범위(포맷, 사용 STT 모델)는 이번 검색에서 상세히 확인하지 못했다.

### 출처

- [Azure AI Content Understanding: Video/Audio 개요](https://learn.microsoft.com/en-us/azure/ai-services/content-understanding/video/overview)
- [Azure AI Content Understanding 개요·가격](https://www.itmagination.com/technologies/azure-ai-content-understanding)
- [LlamaIndex AssemblyAI 연동](https://assemblyai.com/docs/integrations/llamaindex/python)
- [llama-index-readers-assemblyai](https://pypi.org/project/llama-index-readers-assemblyai/0.1.1)
- [RAGFlow (오디오 파싱 지원)](https://github.com/ken2190/ragflow)
- [Teams 트랜스크립트 자동 저장 (Microsoft Q&A)](https://learn.microsoft.com/en-au/answers/questions/5565309/transcript-storage-and-automation-for-teams-meetin)
- [Power Platform으로 회의록 자동화](https://sharepointeurope.com/?p=89122)
