# DB 함수(FUNCTION)·트리거(TRIGGER), 요즘 왜 잘 안 쓸까?

관련 글: [MySQL 함수와 PostgreSQL 트리거 비교](mysql-function-vs-postgresql-trigger.md)

## 5살 아이에게 설명하면

트리거는 "냉장고 문을 열면 자동으로 불이 켜지는 장치"예요. 편해 보이지만, 냉장고 안에 그런 장치가 10개, 20개 숨어있으면 어떻게 될까요?

- 문을 열었는데 갑자기 얼음이 나오고, 알람이 울리고, 누군가한테 문자가 가요. 근데 나는 그 장치들을 눈으로 못 봐요 (냉장고 뜯어봐야 앎).
- "왜 문 열었는데 얼음이 나오지?" 하고 물으면, 냉장고 설명서(애플리케이션 코드)에는 안 적혀있어요. 냉장고 속(데이터베이스) 깊은 곳에 숨어있거든요.

이게 바로 요즘 개발자들이 트리거·DB 함수를 꺼리는 이유입니다: **로직이 눈에 안 보이는 곳(숨은 장치)에 숨어서, "왜 이렇게 됐지?"를 추적하기 어렵게 만들기 때문**이에요.

## 잘 안 쓰는(권장하지 않는) 이유 5가지

### 1. 로직이 숨어서 안 보인다 (Hidden logic / 가시성 문제)
애플리케이션 코드(GitHub 저장소)만 봐서는 "이 INSERT를 하면 트리거가 몰래 다른 테이블도 바꾼다"는 걸 알 수 없어요. 코드 리뷰, 검색(grep), 디버깅 모두 안 걸립니다. 신입 개발자가 몇 달 지나서야 "어? 여기 트리거가 있었네?" 하고 발견하는 경우가 흔합니다.

### 2. 테스트하기 어렵다 (Testability)
애플리케이션 코드는 단위 테스트(unit test)로 쉽게 검증하지만, DB 트리거/함수는 실제 데이터베이스를 띄워야 테스트할 수 있어요. CI 파이프라인에 넣기도 번거롭고, 버전 관리(git)로 변경 이력을 추적하기도 애매합니다.

### 3. 성능·확장성 문제
트리거가 실행되는 동안 **트랜잭션(transaction)이 열린 채로 잠금(lock)이 걸립니다.** 트리거 로직이 무거우면 그 시간만큼 다른 요청이 기다려야 해요. 특히 클라우드 네이티브(cloud-native)·멀티테넌트(multi-tenant) 환경에서는 한 고객사의 트리거가 다른 고객사 자원까지 잡아먹는 문제가 생깁니다. DB 서버는 원래 "데이터 저장"에 집중해야 하는데, 트리거가 비즈니스 로직까지 처리하면 DB가 병목(bottleneck)이 됩니다.

### 4. ORM/애플리케이션 상태와 충돌
Django, JPA/Hibernate 같은 ORM(Object-Relational Mapping)은 "내가 UPDATE한 값"을 메모리에 캐싱해두는데, 트리거가 DB 안에서 몰래 값을 더 바꿔버리면 애플리케이션이 들고 있는 값과 실제 DB 값이 어긋납니다(stale state). 이게 이상한 버그의 원인이 됩니다.

### 5. 점점 커지는 로직 (Scope creep)
"간단한 자동 채우기 하나만" 하려고 트리거를 만들었는데, 시간이 지나면서 그 안에 조건문·예외처리·다른 테이블 조회까지 다 들어가서 트리거 하나가 미니 애플리케이션이 되어버리는 일이 흔합니다. 그러면 관리가 거의 불가능해집니다.

## 그럼 요즘은 뭘 쓰나?

| 옛날 방식 (DB에 로직) | 요즘 방식 (애플리케이션/인프라에 로직) |
|---|---|
| 트리거로 감사 로그(audit log) 남기기 | **CDC**(Change Data Capture, 예: Debezium)로 트랜잭션 로그를 비동기로 읽어서 처리 |
| 트리거로 다른 테이블 자동 갱신 | 애플리케이션이 이벤트를 **메시지 브로커**(Kafka 등)에 발행 → 별도 서비스가 비동기 처리 (도메인 이벤트 패턴) |
| DB 함수로 복잡한 계산 | 애플리케이션 코드(서비스 레이어)에서 계산 — 테스트·버전관리·리뷰가 쉬움 |
| DB 함수로 유효성 검사 | 애플리케이션 레벨 검증 + (선택) DB의 단순 `CHECK` 제약조건 정도만 |

## 그래도 트리거를 쓰는 경우

완전히 금지된 건 아닙니다. 아래처럼 **"단순하고, DB 무결성과 직결된"** 경우에는 여전히 합리적입니다.
- `updated_at` 컬럼 자동 갱신처럼 아주 단순하고 절대 바뀌지 않을 로직
- 여러 애플리케이션(서로 다른 언어/팀)이 같은 테이블에 접근하는데, **어떤 경로로 쓰든 반드시 지켜야 하는 무결성 규칙**(예: 잔액이 음수가 되면 안 됨)
- 성능이 극도로 중요해서 애플리케이션 왕복(round-trip) 비용조차 줄여야 하는 경우

핵심 기준: **"이 로직이 애플리케이션 하나만의 규칙인가, 아니면 데이터 자체의 절대 규칙인가?"** 후자면 DB에 둘 이유가 있고, 전자라면 애플리케이션 레이어로 옮기는 게 요즘 권장 방식입니다.

---

### Sources
- [Are Stored Procedures and Triggers Anti-Patterns in the Cloud Native World? (Yugabyte)](https://www.yugabyte.com/blog/are-stored-procedures-and-triggers-anti-patterns-in-the-cloud-native-world/)
- [Architectural Anti-Pattern: Why Database Triggers Harm Enterprise Applications (C# Corner)](https://www.c-sharpcorner.com/article/architectural-anti-pattern-why-database-triggers-harm-enterprise-applications/)
- [Busy Database antipattern (Microsoft Learn, Azure Architecture Center)](https://learn.microsoft.com/en-us/azure/architecture/antipatterns/busy-database/)
- [Love, Death & Triggers (GitGuardian Blog)](https://blog.gitguardian.com/love-death-triggers/)
- [SQL Server Triggers: When to Use (and Avoid) (Simple Talk / Red-Gate)](https://www.red-gate.com/simple-talk/databases/sql-server/database-administration-sql-server/sql-server-triggers-good-scary/)
