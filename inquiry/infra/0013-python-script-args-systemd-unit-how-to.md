# .py 파일을 인자와 함께 systemd 유닛으로 실행하려면?

## 한 줄 비유

평소에 터미널에서 `python3 script.py arg1 arg2`라고 직접 치는 건 **"내가 직접 요리사가 되어 재료를 넣고 요리하는 것"**이에요. systemd 유닛으로 만든다는 건 **"레시피 카드에 재료와 순서를 미리 다 적어놓고, 나중에는 카드 이름만 부르면(`systemctl start`) 알아서 요리되게 만드는 것"**이에요. [[systemd-vs-systemctl-role|이전 문서]]에서 다룬 "유닛 파일 = 영구 레시피"라는 개념이 여기서 실제로 활용돼요.

## 1단계: 유닛 파일 만들기

`/etc/systemd/system/` 아래에 `.service` 파일을 하나 만들어요 (파일명이 곧 유닛 이름이 돼요).

```ini
# /etc/systemd/system/my-python-job.service
[Unit]
Description=내가 만든 파이썬 스크립트를 인자와 함께 실행
After=network.target

[Service]
Type=simple
User=myuser
WorkingDirectory=/opt/my-app
ExecStart=/usr/bin/python3 /opt/my-app/script.py --arg1 value1 --arg2 value2
Environment=PYTHONUNBUFFERED=1
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### 각 항목이 뭘 하는지 (5살 비유 포함)

- **`ExecStart`**: "요리를 시작하는 정확한 명령어"예요. 여기가 핵심이에요. **파이썬 실행 파일 경로 + 스크립트 경로 + 인자**를 전부 절대 경로로, 공백으로 구분해서 한 줄에 적어요. 인자에 공백이 들어가면 `"value with space"`처럼 따옴표로 감싸줘야 해요.
- **`Type=simple`**: "요리사가 요리를 시작하면 바로 '일하는 중'으로 간주해줘"라는 뜻이에요 (스크립트가 계속 떠있는 데몬일 때 기본값).
- **`User=myuser`**: root(왕)로 실행하지 말고 권한이 제한된 계정으로 실행하라는 안전장치예요. 스크립트가 뚫려도 피해 범위를 줄여줘요.
- **`WorkingDirectory`**: 스크립트를 실행할 때 "어느 방(폴더)에서 시작할지" 정해줘요. 상대 경로로 파일을 읽는 스크립트라면 꼭 필요해요.
- **`Environment=PYTHONUNBUFFERED=1`**: 파이썬 출력이 버퍼에 갇히지 않고 바로바로 로그로 흘러나오게 해줘요. 이게 없으면 `journalctl`로 로그를 봐도 한참 있다가 몰아서 찍혀요.
- **`Restart=on-failure`**: 스크립트가 죽으면 자동으로 다시 살려줘요 (돌보미가 아이가 넘어지면 다시 일으켜 세우는 것과 비슷해요).

## 2단계: 등록하고 실행

```bash
sudo systemctl daemon-reload      # 새 레시피 카드를 서랍에 등록(반영)한다
sudo systemctl enable --now my-python-job.service   # 부팅 시 자동 시작 + 지금 바로 시작
```

- `daemon-reload`를 빼먹으면 systemd가 새 파일이 생겼다는 걸 모르고 옛날 캐시된 정보로 동작해요. 유닛 파일을 새로 만들거나 고칠 때마다 항상 먼저 해줘야 해요.
- `enable`은 "부팅할 때마다 자동으로 요리해라"고 등록하는 것, `start`(또는 `--now`)는 "지금 당장 한 번 요리해라"예요.

## 3단계: 상태·로그 확인

```bash
systemctl status my-python-job.service
journalctl -u my-python-job.service -f
```

## 만약 "매번 다른 인자"를 넣고 싶다면? — 템플릿 유닛

지금까지 방식은 인자가 유닛 파일 안에 **고정**돼요. 만약 실행할 때마다 인자를 바꾸고 싶다면(예: 어떤 DB 서버를 대상으로 할지), **템플릿 유닛**을 써요. 파일 이름에 `@`를 붙이는 게 핵심이에요.

```ini
# /etc/systemd/system/my-python-job@.service
[Unit]
Description=%i 대상으로 실행되는 파이썬 job

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/my-app/script.py --target %i
```

이렇게 만들면, 실행할 때 `@` 뒤에 원하는 값을 붙여서 시작해요:

```bash
sudo systemctl start my-python-job@db-host-1.service
sudo systemctl start my-python-job@db-host-2.service
```

`%i`는 "빈칸 채우기 레시피"예요. `@` 뒤에 적은 글자(`db-host-1`)가 그대로 `%i` 자리에 들어가서 `ExecStart`가 `python3 script.py --target db-host-1`로 완성돼요. 같은 레시피 카드 하나로 서로 다른 재료를 넣어 여러 인스턴스를 동시에 띄울 수 있는 거예요.

## 정리

| 상황 | 방법 |
|---|---|
| 평소 터미널 실행 | `python3 script.py arg1 arg2` (그 순간만 존재, 커널이 바로 프로세스+cgroup 생성) |
| 인자 고정, 부팅 시 자동 실행/재시작 필요 | 일반 `.service` 유닛, `ExecStart`에 인자를 그대로 적기 |
| 실행할 때마다 인자를 바꾸고 싶음 | `이름@.service` 템플릿 유닛 + `%i`, `systemctl start 이름@값` |

## Sources
- [GitHub - torfsen/python-systemd-tutorial](https://github.com/torfsen/python-systemd-tutorial)
- [Running a Complex Python Script as a Systemd Service: Best Practices and Troubleshooting - NixOS Discourse](https://discourse.nixos.org/t/running-a-complex-python-script-as-a-systemd-service-best-practices-and-troubleshooting/47257)
- [how to create a systemd service in linux using a python script](https://medium.com/@linuxmaster/how-to-create-a-systemd-service-in-linux-using-a-python-script-96d6b889b077)
