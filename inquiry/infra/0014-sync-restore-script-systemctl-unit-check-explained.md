# cmd_sync_restore 스크립트 쉽게 풀어보기 — 왜 cgroup이 아니라 유닛 파일을 찾는가

```bash
cmd_sync_restore() {
  echo ">> [syncrestore] 테스트 sync 프로세스 종료"
  ssh_do "$DB_HOST" "pkill -f '$TEST_SYNC_SCRIPT_PATH' 2>/dev/null || true"
  # 어느 유닛을 stop했었는지 기록해두지 않는다 — 대신 지금 이 순간 실제로 설치돼 있는 쪽을
  # 다시 조회해서 그걸 start한다(state 파일은 /tmp가 비워지거나 중간에 스크립트가 죽으면
  # 무엇을 되살려야 할지 알 수 없어지는 약점이 있어 일부러 두지 않았다).
  local target=""
  for unit in "$SYNC_SYSTEMD_UNIT" "${LEGACY_SYNC_SYSTEMD_UNITS[@]}"; do
    if ssh_do "$DB_HOST" "systemctl list-unit-files --no-legend '${unit}.service' 2>/dev/null | grep -q ."; then
      target="$unit"
      break
    fi
  done
  if [ -z "$target" ]; then
    echo "!! $SYNC_SYSTEMD_UNIT / ${LEGACY_SYNC_SYSTEMD_UNITS[*]} 중 설치된 유닛이 하나도 없다."
    echo "   수동으로 확인할 것: ssh $DB_HOST \"systemctl list-unit-files | grep keyval-db\""
    return 1
  fi
  echo ">> [syncrestore] $target 재기동"
  ssh_do "$DB_HOST" "systemctl start '$target'"
  if [ "$target" != "$SYNC_SYSTEMD_UNIT" ]; then
    echo "   ⚠️ legacy 유닛이다 — 원래는 $SYNC_SYSTEMD_UNIT 로 마이그레이션돼 있어야 정상."
    echo "     install_db_mirror_ubuntu.sh를 이 호스트에서 재실행해 정리할 것을 권장."
  fi
  echo ">> [syncrestore] 완료 — 시작 시점 즉시 재조정이 돌아 gateway_mirror(RDB) 기준으로"
  echo "   keyval이 복원된다(대기 불필요)."
  echo "   확인: ssh $DB_HOST \"systemctl is-active $target\""
}
```

## 먼저 결론

이 스크립트가 하는 일은 딱 하나예요: **"디스크에 저장된 레시피(유닛 파일)가 있는지 찾아서, 있으면 그걸로 새로 요리를 시작한다."** cgroup은 전혀 안 봐요. [[systemd-vs-systemctl-role|이전 문서]]에서 설명한 "유닛 파일은 영구, cgroup은 그 순간만 존재하는 스냅샷"이라는 구조가 이 스크립트에 그대로 녹아있어요.

## 한 줄 비유

이 함수는 **"어젯밤에 먹던 요리를 냉장고에서 꺼내 다시 데우는 게 아니라, 레시피 카드가 서랍에 남아있는지 확인하고 처음부터 다시 요리하는 것"**이에요.
- 냉장고 속 "어제 먹던 요리"(=cgroup, 실행 중인 프로세스 묶음) → 이미 다 먹어서 없어요. 신경 안 써요.
- 서랍 속 "레시피 카드"(=`.service` 유닛 파일) → 여전히 그대로 있어요. 이걸 찾아서 다시 요리(=`systemctl start`)해요.

## 코드를 한 줄씩 뜯어보기

### 1. 테스트용 임시 프로세스 정리
```bash
ssh_do "$DB_HOST" "pkill -f '$TEST_SYNC_SCRIPT_PATH' 2>/dev/null || true"
```
누가 테스트하려고 수동으로 띄워놨을 수도 있는 임시 sync 스크립트를 먼저 강제 종료해요. `|| true`를 붙인 건 "그런 프로세스가 애초에 없어도 에러로 죽지 말고 그냥 넘어가라"는 뜻이에요 (5살 비유: "방에 흘린 장난감이 있으면 치우고, 없으면 그냥 넘어가!").

### 2. 어떤 유닛이 실제로 설치돼 있는지 탐색
```bash
for unit in "$SYNC_SYSTEMD_UNIT" "${LEGACY_SYNC_SYSTEMD_UNITS[@]}"; do
  if ssh_do "$DB_HOST" "systemctl list-unit-files --no-legend '${unit}.service' 2>/dev/null | grep -q ."; then
    target="$unit"
    break
  fi
done
```
여기서 핵심 명령어가 `systemctl list-unit-files`예요. 이건 **"지금 실행 중인 것"을 보는 게 아니라 "디스크에 설치되어 있는 레시피 카드가 존재하는가"만 확인**하는 명령이에요 (실행 중 여부를 보려면 `systemctl list-units`를 써야 하는데, 이 스크립트는 일부러 그걸 안 써요).

- 새 유닛 이름(`SYNC_SYSTEMD_UNIT`)부터 먼저 확인하고, 없으면 옛날 이름들(`LEGACY_SYNC_SYSTEMD_UNITS`)을 순서대로 확인해요.
- `--no-legend`는 표 제목줄을 빼서 스크립트가 결과를 파싱하기 쉽게 해줘요.
- `grep -q .` 은 "한 글자라도 출력이 있으면 성공"이라는 뜻이에요. 즉 "이 이름의 유닛 파일이 하나라도 설치돼 있나?"를 참/거짓으로 바꿔주는 트릭이에요.

이 로직 자체가 곧 이전 질문에 대한 답이에요: **"이전 작업 내용을 systemctl이 다시 실행할 수 있는 이유는, cgroup이 뭔가를 기억해서가 아니라 이 for문이 확인하는 '유닛 파일이 디스크에 남아있는가'가 참이기 때문"**이에요.

### 3. 아무 유닛도 없으면 실패 처리
```bash
if [ -z "$target" ]; then
  echo "!! ... 중 설치된 유닛이 하나도 없다."
  return 1
fi
```
새 이름도, 옛날 이름도 다 서랍에 없으면 "요리할 레시피 자체가 없다"는 뜻이니 깔끔하게 포기하고 사람에게 알려줘요.

### 4. 찾은 유닛을 재기동
```bash
ssh_do "$DB_HOST" "systemctl start '$target'"
```
드디어 찾은 레시피로 요리를 다시 시작해요. 여기서 새로운 cgroup이 새로 만들어지는 거예요 (예전 cgroup의 부활이 아니라 완전히 새 생성).

### 5. legacy 유닛이면 경고
```bash
if [ "$target" != "$SYNC_SYSTEMD_UNIT" ]; then
  echo "   ⚠️ legacy 유닛이다 — 원래는 ... 로 마이그레이션돼 있어야 정상."
fi
```
옛날 이름의 레시피 카드로 요리했다면 "이건 원래 정리됐어야 하는 낡은 레시피인데 아직 안 치워졌다"고 알려주는 안전장치예요.

## state 파일을 일부러 안 쓰는 이유 (주석에 적힌 설계 의도)

스크립트 주석에 이렇게 적혀 있어요:
> "어느 유닛을 stop했었는지 기록해두지 않는다 — state 파일은 /tmp가 비워지거나 중간에 스크립트가 죽으면 무엇을 되살려야 할지 알 수 없어지는 약점이 있어 일부러 두지 않았다."

이건 아주 좋은 설계 판단이에요. 만약 "아까 뭘 껐었는지"를 `/tmp/some-state-file`에 따로 적어놨다면:
- 서버가 재부팅되거나 `/tmp`가 청소되면 그 기록이 날아가요.
- 스크립트가 중간에 죽으면 state 파일이 틀린 내용을 갖고 있을 수도 있어요.

대신 **"지금 이 순간 실제로 설치된 유닛이 뭔지 다시 조회한다"**는 방식은 항상 진짜(source of truth)를 참조하기 때문에, 기록이 깨질 걱정이 없어요. 이것도 결국 "cgroup 같은 휘발성 상태를 믿지 말고, 디스크에 남는 진짜 설정을 믿어라"는 같은 철학의 연장선이에요.

## 정리

| 스크립트가 확인하는 것 | 실체 |
|---|---|
| `systemctl list-unit-files` | 디스크에 `.service` 파일이 설치돼 있는지 (영구) |
| `systemctl start` | 그 파일 내용을 읽어서 새 프로세스 + 새 cgroup을 만드는 행위 (매번 새로 생성) |
| cgroup | 스크립트 어디에도 등장하지 않음 — 확인 대상이 아님 |
| state 파일(/tmp) | 일부러 안 씀 — 휘발성 저장소를 신뢰하지 않기 위한 설계 |

## Sources
- [systemctl List Services: Running, Enabled, Failed & Unit Files](https://www.golinuxcloud.com/systemctl-list-services/)
- [systemctl-list-unit-files man | Linux Command Library](https://linuxcommandlibrary.com/man/systemctl-list-unit-files)
- [Listing Linux Services with systemctl | Linuxize](https://linuxize.com/post/systemctl-list/)
