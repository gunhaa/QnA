# MySQL의 FUNCTION과 PostgreSQL의 TRIGGER, 왜 비슷해 보일까?

## 5살 아이에게 설명하면

- **MySQL FUNCTION(함수)**: "계산기 로봇"이에요. 내가 "1 더하기 2 해줘!" 하고 **직접 불러야** 움직여요. `SELECT 함수이름(...)` 처럼요.
- **PostgreSQL TRIGGER(트리거)**: "감시하는 경비원"이에요. 내가 부르지 않아도, 누가 문(테이블)을 열고 들어오거나(INSERT), 물건을 바꾸거나(UPDATE), 가지고 나가면(DELETE) **자동으로** 튀어나와서 정해둔 일을 해요.

그런데 재밌는 건, PostgreSQL의 경비원(트리거)은 **혼자 힘으로 일하지 않고, 반드시 "계산기 로봇(함수)"을 하나 만들어서 그 로봇에게 시켜야** 한다는 점이에요. 이게 "MySQL 함수랑 비슷해 보인다"는 느낌의 정체입니다.

## 핵심: PostgreSQL 트리거는 "함수"로 만들어진다

MySQL은 트리거를 만들 때 동작 내용을 트리거 안에 바로 적습니다.

```sql
-- MySQL: 트리거 안에 로직을 그냥 씁니다
DELIMITER $$
CREATE TRIGGER before_insert_users
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
  SET NEW.created_at = NOW();
END$$
DELIMITER ;
```

반면 PostgreSQL은 **먼저 `RETURNS TRIGGER`를 반환하는 함수(트리거 함수)를 따로 만들고**, 그 함수를 트리거에 연결(`EXECUTE FUNCTION`)하는 2단계 구조입니다.

```sql
-- 1단계: 트리거 함수(진짜 FUNCTION)를 만든다
CREATE FUNCTION set_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2단계: 이 함수를 트리거에 연결한다
CREATE TRIGGER before_insert_users
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION set_created_at();
```

즉, PostgreSQL 트리거의 "실행 코드 부분"이 문법적으로 `CREATE FUNCTION`이기 때문에, MySQL의 `FUNCTION`과 겉모습이 닮아 보이는 것입니다. 하지만 **용도가 다릅니다**:

- MySQL `FUNCTION` → 사람(또는 쿼리)이 **명시적으로 호출**해서 값을 하나 돌려받는 용도 (`SELECT my_func(1,2)`)
- PostgreSQL 트리거 함수 → 사람이 부르는 게 아니라, **트리거에 연결되어 이벤트 발생 시 자동 호출**되는 용도. 일반 값이 아니라 `TRIGGER`라는 특수 타입을 반환.

## 비교표

| 구분 | MySQL FUNCTION | PostgreSQL 일반 FUNCTION | PostgreSQL TRIGGER (+ 트리거 함수) |
|---|---|---|---|
| 호출 방식 | 명시적 호출 (`SELECT func()`) | 명시적 호출 (`SELECT func()`) | 이벤트 발생 시 자동 호출 |
| 반환값 | 스칼라 값 하나 | 스칼라/테이블 등 | 반드시 `TRIGGER` 타입 |
| 실행 시점 | 호출한 그 순간 | 호출한 그 순간 | INSERT/UPDATE/DELETE **전(BEFORE)/후(AFTER)/대신(INSTEAD OF)** |
| 지원 언어 | SQL(주로) | PL/pgSQL, PL/Python, PL/Perl, PL/Tcl 등 다양 | 위와 동일 (함수로 작성되므로) |
| 같은 테이블·이벤트에 여러 개? | 트리거는 BEFORE 1개 + AFTER 1개 제한 | 해당 없음 | 테이블·이벤트당 **여러 개** 등록 가능 (실행 순서는 이름순) |
| 뷰(View)에 대한 동작 | 지원 안 함 | 해당 없음 | `INSTEAD OF` 트리거로 뷰 대체 가능 |

## 정리

- 질문의 "비슷하다"는 감각은 정확합니다 — **PostgreSQL은 트리거를 만들려면 반드시 함수부터 만들어야 하는 구조**라서, MySQL의 독립적인 `FUNCTION` 개념과 형태가 겹쳐 보이는 것입니다.
- 다만 역할은 다릅니다. MySQL `FUNCTION`은 "불러야 움직이는 계산기", PostgreSQL 트리거(+ 트리거 함수)는 "이벤트가 터지면 자동으로 움직이는 경비원"입니다.
- MySQL도 트리거 자체는 있지만, 그 내부 로직을 **별도의 재사용 가능한 함수 객체로 분리하지 않고** 트리거 정의 안에 인라인으로 넣는다는 점이 PostgreSQL과의 근본적 차이입니다.

---

### Sources
- [PostgreSQL function vs trigger function vs procedure and trigger (Medium)](https://medium.com/@razu.dev/postgresql-function-vs-trigger-function-vs-procedure-and-trigger-d1b901d14ce0)
- [Everything you need to know about PostgreSQL triggers (EDB)](https://www.enterprisedb.com/postgres-tutorials/everything-you-need-know-about-postgresql-triggers)
- [PostgreSQL Docs: Overview of Trigger Behavior](https://www.postgresql.org/docs/current/trigger-definition.html)
- [Differences Between Triggers in MySQL and PostgreSQL](https://www.mydreams.cz/en/hosting-wiki/6116-differences-between-triggers-in-mysql-and-postgresql.html)
- [Difference Between PostgreSQL and MySQL: A Comparison (DbVisualizer)](https://www.dbvis.com/thetable/postgresql-vs-mysql/)
