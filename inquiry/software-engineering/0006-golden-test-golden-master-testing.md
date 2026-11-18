# 골든 테스트(Golden Test)란?

## 쉬운 설명

정답지를 미리 저장해두고, 나중에 만든 답이 그 정답지랑 똑같은지 사진 대조하듯 비교하는 시험이에요. 답이 조금이라도 달라지면 "어, 뭔가 바뀌었네?" 하고 바로 알 수 있어요.

## 일반 설명

### 정의

**골든 테스트(Golden Test)**는 프로그램의 출력을 미리 저장해둔 "골든 파일(golden file, 정답 스냅샷)"과 비교해서, 코드가 바뀐 뒤에도 출력이 의도치 않게 달라지지 않았는지 확인하는 회귀 테스트(regression test) 기법이다. **스냅샷 테스트(snapshot testing)**, **승인 테스트(approval testing)**, **베이스라인 테스트(baseline testing)**는 커뮤니티/언어 생태계마다 부르는 이름만 다를 뿐 본질적으로 같은 기법을 가리킨다.

### 골든 마스터 테스트와의 관계

**골든 마스터 테스트(Golden Master Test)**는 Michael Feathers가 레거시 코드(내부 로직을 이해하지 못하는 코드)를 다룰 때 제안한 기법으로, **특성화 테스트(characterization testing)**라고도 부른다. 리팩터링 전에 기존 동작을 "그대로" 기록해두고, 리팩터링 후에도 동일한 입력에 동일한 출력이 나오는지 검증하는 방식이다. 골든 테스트는 이 개념을 일반화해 UI, JSON/XML, 생성된 코드 등 임의의 복잡한 출력물 검증에도 널리 쓰인다.

### 동작 방식

1. 테스트 대상 함수/시스템에 특정 입력을 주고 실행한다.
2. 첫 실행 결과를 "골든 파일"로 저장한다(수동 검토 후 커밋).
3. 이후 테스트 실행 시마다 현재 출력과 골든 파일을 diff 비교한다.
4. 차이가 있으면 실패 처리하고, 개발자가 그 차이가 **버그**인지 **의도된 변경**인지 검토한다.
5. 의도된 변경이면 골든 파일을 갱신(update/accept)하고 커밋한다.

### 장점

- 코드 내부 로직을 몰라도 출력만으로 테스트를 작성할 수 있어 커버리지 확보 속도가 빠르다.
- 복잡한 구조화 출력(HTML, JSON, XML, 생성 코드, UI 렌더링 결과 등) 검증에 특히 유용하다.
- 실패 시 diff를 바로 보여주므로 코드 리뷰 속도가 빨라지고 회귀 재현이 명확하다.

### 주의점 및 베스트 프랙티스

- **비결정적 데이터 정규화**: 타임스탬프, 랜덤 ID, 실행 시간처럼 매번 달라지는 값은 고정 토큰으로 치환(canonicalization)해야 불필요한 실패(false positive)를 막을 수 있다.
- **골든 파일은 리뷰 대상 자산**: 테스트 러너가 아무렇게나 생성하는 부산물이 아니라, 소유자와 근거가 있는 "검토된 테스트 데이터"로 취급해야 한다.
- **무분별한 덮어쓰기 금지**: 테스트 실패 시 바로 골든 파일을 갱신하지 말고, diff를 검토해 출력이 개선/손상/의도된 변경 중 무엇인지 판단하는 가벼운 승인 프로세스(PR 리뷰, pre-commit hook 등)를 두어야 한다.
- **가독성**: 골든 파일은 사람이 읽고 diff하기 쉬운 포맷(정렬된 JSON, 텍스트 등)으로 유지하는 것이 좋다.
- 필요하면 완전 일치 대신 **허용 오차 기반(fuzzy/tolerance) 비교**를 적용할 수 있다(예: 이미지 픽셀 차이 허용치).

### 활용 예

- **UI/비주얼 리그레션 테스트(Visual Regression Testing, VRT)**: 화면 렌더링 스크린샷을 골든 이미지와 비교.
- **API 응답 검증**: 복잡한 JSON/XML 응답 구조를 골든 파일과 비교.
- **AI/LLM 출력 검증**: 모델 응답이나 생성 결과가 회귀 없이 일관되게 유지되는지 확인하는 용도로도 최근 확산 중.
- **레거시 코드 리팩터링**: 골든 마스터 테스트로 리팩터링 전후 동작 동일성 보장.

### 대표 도구

- Go: `franiglesias/golden`, `nochso/golden`
- Rust: `snapshot-rs`, `insta`
- C#/.NET: `Snapper`
- Python: `inline-snapshot` (골든 값을 소스 코드에 직접 삽입)
- JS/TS: Jest의 snapshot testing 기능

---

Sources:
- [Golden Tests vs Unit Tests: The 2026 UI Testing Paradigm Shift](https://zignuts.com/blog/golden-tests-vs-unit-tests)
- [Regression Testing Golden File Management: A Durable Workflow for Reliable Baselines | QASkills.sh](https://qaskills.sh/blog/regression-testing-golden-file-management)
- [Approval Testing and Golden Master Testing Guide | QASkills.sh](https://qaskills.sh/blog/approval-testing-golden-master-guide)
- [Approval testing: Golden Master and seams](http://octopusinvitro.gitlab.io/blog/code-and-tech/approval-testing)
- [Golden Tests in AI: Ensuring Reliability Without Slowing Innovation | Tullie Murrell](https://tullie.ai/blog/golden-tests-in-ai)
- [GitHub - franiglesias/golden: Golang Library for snapshot testing](https://github.com/franiglesias/golden)
- [golden master/snapshot/approval testing library which puts the values right into your source code (inline-snapshot)](https://pypi.org/project/inline-snapshot/)
