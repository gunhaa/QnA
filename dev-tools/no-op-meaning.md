# no-op이 뭐예요?

## 5살에게 설명하듯

장난감 리모컨에 버튼이 하나 있어요. 눌러도 **아무 일도 안 일어나는 버튼**이에요. 로봇은 "어, 버튼 눌렸네? 근데 할 일이 없네" 하고 그냥 넘어가요.

이게 바로 `no-op`(노옵)이에요. **"no operation"(연산 없음)**의 줄임말로, "명령을 실행은 했는데 아무것도 바뀌지 않는 것"을 뜻해요.

## 조금 더 기술적으로

### 1. CPU 명령어 레벨의 no-op (NOP)
가장 오래된 의미예요. CPU(중앙처리장치)에게 "다음 칸으로 그냥 넘어가"라고만 시키는 기계어 명령어(`NOP`)예요. 실제로는 쓸모가 있어요.

- **타이밍 맞추기**: CPU가 다른 작업과 속도를 맞추도록 일부러 시간을 끌 때
- **메모리 정렬(memory alignment)**: 데이터가 특정 위치에 딱 맞게 놓이도록 빈 공간을 채울 때
- **파이프라인 위험(pipeline hazard) 방지**: CPU가 명령어를 미리 처리하다 꼬이는 걸 막을 때

### 2. 코드에서의 no-op 함수
프로그래밍에서는 "호출은 되지만 아무 동작도 하지 않는 함수"를 말해요.

```javascript
function noop() {}  // 일부러 아무것도 안 하는 함수
```

- 콜백(callback) 자리에 뭔가 넣어야 하는데 특별히 할 일이 없을 때 기본값으로 씀
- 테스트할 때 실제 로직을 잠깐 꺼두고 싶을 때(스텁, stub) 씀
- React 같은 라이브러리에서 "옵션인데 함수 자리를 비워두면 에러 나니까" 기본값으로 자주 등장

### 3. 배포/인프라(CI/CD)에서의 no-op
요즘 개발 문서에서 가장 자주 보이는 의미예요. **"실행은 했지만 실제로 바뀐 게 없는 작업"**을 가리켜요.

- **Terraform**: `terraform plan -detailed-exitcode`를 돌렸을 때 종료 코드(exit code)가 `0`이면 "서버 설정이 이미 원하는 상태라서 바꿀 게 없다(no-op)"는 뜻이에요. 이 경우 실제 적용(apply) 단계를 건너뛰도록 파이프라인을 짤 수 있어요.
- **Git**: `git commit --allow-empty`로 "내용은 안 바꿨지만 기록만 남기는" 커밋을 만들 수 있는데, 이것도 일종의 no-op 커밋이에요. 브랜치 추적이나 CI 재실행 트리거용으로 씀.
- **배포 파이프라인**: "이번 배포는 no-op였다"라고 하면, 배포는 진행됐지만 실제 서버 상태는 하나도 안 바뀌었다는 뜻이에요.

### no-op vs idempotent(멱등) 헷갈리지 않기
- **no-op**: 애초에 "아무 일도 안 함"
- **idempotent(멱등)**: 여러 번 실행해도 "결과가 같음" (첫 실행은 실제로 뭔가 바꿀 수 있음)

예를 들어 "불 끄기" 버튼은 멱등이에요. 이미 꺼져 있는 상태에서 눌러도 결과는 똑같이 "꺼짐"이니까요. 하지만 이미 꺼진 상태에서 누른 그 순간의 동작 자체는 no-op(아무 일도 안 일어남)이라고 부를 수 있어요.

## 한 줄 요약
> no-op = "실행 버튼은 눌렸는데, 결과적으로 아무것도 안 바뀜"

## Sources
- [What is no op (no operation)? | TechTarget](https://www.techtarget.com/whatis/definition/no-op-no-operation)
- [NOP (code) - Wikipedia](https://en.wikipedia.org/wiki/NOP_(code))
- [Terraform Plan Command: Output, Flags & Examples - Spacelift](https://spacelift.io/blog/terraform-plan)
