# GPT-2를 직접 만들어보는 워크북, 있을까?

네, 있어요! 레고 설명서처럼 "한 조각씩" GPT-2를 조립해보는 자료가 두 개 유명해요.

1. **karpathy/build-nanogpt** (Andrej Karpathy, GitHub + 유튜브 강의)
2. **Build a Large Language Model (From Scratch)** (Sebastian Raschka 책 + 깃허브 코드)

둘 다 "빈 파일"에서 시작해서 진짜 굴러가는 GPT-2를 직접 코딩까지 해보는 실습형 자료예요.

## 제작 워크플로우 (레시피북처럼 순서대로)

빵을 만들 때 밀가루 반죽 → 발효 → 굽기 순서가 있듯이, GPT-2도 순서가 정해져 있어요.

1. **재료 준비 (토크나이저, Tokenizer)**
   글자를 숫자 조각(토큰)으로 잘게 써는 단계예요. (BPE 토크나이저 사용)
2. **반죽 빚기 (임베딩, Embedding)**
   숫자 조각을 의미를 담은 벡터(숫자 목록)로 바꿔요.
3. **핵심 장치 조립 (어텐션, Attention / 트랜스포머 블록, Transformer Block)**
   "이 단어가 문장 어디를 봐야 할지" 알아내는 부품이에요. 이걸 여러 층 쌓으면 GPT-2 몸통이 완성돼요.
4. **오븐에 굽기 (사전학습, Pretraining)**
   엄청 많은 글을 읽히면서 파라미터(나사)를 조금씩 조여요. (build-nanogpt 기준 GPT-2 124M 모델은 GPU로 약 1시간, 10달러 정도)
5. **맛보기 (텍스트 생성, Inference/Generation)**
   학습된 모델에 문장을 주면 이어지는 말을 뱉어내는지 확인해요.
6. (선택) **입맛대로 조정 (파인튜닝, Fine-tuning)**
   특정 작업(분류, 대화 등)에 맞게 추가로 조금 더 학습시켜요.

## 어떤 걸 고를까?

- **영상 보며 따라치고 싶다** → karpathy/build-nanogpt (커밋 하나하나가 "레고 조각 하나씩" 추가되는 구조, 유튜브 4시간 강의 동반)
- **책으로 차근차근, 노트북(주피터) 실습 원한다** → Raschka의 책 + 깃허브 코드 (일반 노트북에서도 실습 가능, GPT-2 공개 가중치 활용 챕터 있음)

**출처**
- [karpathy/build-nanogpt (GitHub)](https://github.com/karpathy/build-nanogpt)
- [Line By Line, Let's Reproduce GPT-2: Section 1 | Towards Data Science](https://towardsdatascience.com/line-by-line-lets-reproduce-gpt-2-section-1-b26684f98492/)
- [Build a Large Language Model (From Scratch) | Sebastian Raschka](https://sebastianraschka.com/llms-from-scratch/)
- [Build a Large Language Model (From Scratch) - Manning](https://www.manning.com/books/build-a-large-language-model-from-scratch)
