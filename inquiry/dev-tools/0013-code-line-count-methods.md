# 현재 프로젝트의 코드 라인(줄 수)을 확인하는 방법

## 쉬운 설명

이 저장소가 책이라면, "총 몇 쪽인지, 어떤 종류의 페이지가 몇 장인지" 세는 것과 같다. 손으로 한 장씩 셀 수도 있고(간단한 명령어), 전용 계산기(cloc/tokei/scc 같은 도구)로 순식간에 셀 수도 있다.

## 일반 설명

"코드 라인을 본다"는 것은 보통 두 가지를 의미한다. (1) 설치 없이 지금 바로 확인하는 방법, (2) 언어별·주석/공백 구분까지 정교하게 세는 전용 도구. 이 저장소(`C:\dev\claude`)는 문서 저장소라 대부분 `.md` 파일이고, 최근 `convention/java/examples/OrderService.java`처럼 코드 예제 파일도 섞여 있어 두 방식 모두 적용해볼 수 있다.

### 1. 설치 없이 바로 확인하기 (Git Bash / PowerShell)

**Git Bash (POSIX)**
```bash
# 추적 중인 파일 목록 + 총 줄 수
git ls-files | wc -l
git ls-files | xargs wc -l | tail -1

# 아직 git add 안 한 새 파일까지 포함해서 세고 싶을 때
find . -type f \( -name "*.md" -o -name "*.java" \) -not -path "./.git/*" -exec wc -l {} + | tail -1
```
- `git ls-files`는 **추적 중인 파일만** 센다. 방금 만든 새 파일처럼 아직 `git add`하지 않은 파일은 빠지므로, 전체를 보려면 `find` 기반 명령을 쓴다.

**PowerShell**
```powershell
Get-ChildItem -Recurse -Include *.md,*.java -Exclude .git |
    Get-Content |
    Measure-Object -Line
```

### 2. 이 저장소에 실제로 적용한 결과 (2026-09-18 기준)

| 범위 | 파일 수 | 총 줄 수 |
|---|---|---|
| git 추적 파일 전체(`git ls-files`) | 134개 | 11,915줄 |
| `.md` + `.java` 전체(추적 안 된 파일 포함) | 144개 | 12,993줄 |

- 확장자 구성은 `.md` 133개로 거의 전부이며, 최근 추가한 `convention/java/examples/OrderService.java` 같은 실제 코드 예제가 소수 포함되어 있다.

### 3. 전용 도구로 정교하게 세기 (언어별/주석/공백 구분, 복잡도까지)

| 도구 | 특징 | 비고 |
|---|---|---|
| **cloc** | 가장 널리 쓰임, Perl 기반, 언어별 코드/주석/공백 라인 구분 | 정확도·생태계는 좋지만 대형 저장소에서는 상대적으로 느림 |
| **tokei** | Rust 기반, 리눅스에서 가장 빠른 편 | 언어별 통계, 결과가 간결 |
| **scc** | Go 기반, **Windows·macOS에서 가장 빠름**, 복잡도·COCOMO 비용 추정까지 제공 | 이 프로젝트 환경(Windows)에서는 scc가 가장 적합 |

이 프로젝트 환경(Windows)에서는 설치가 필요 없는 방법 대신 정교한 통계가 필요하면 **scc**를 추천한다.

```powershell
# 설치 (택1)
winget install boyter.scc
scoop install scc
choco install scc

# 실행
scc C:\dev\claude
```
- `cloc`/`tokei`도 대안이며, Node.js가 이미 있다면 `npx cloc .`처럼 설치 없이 1회성으로 실행할 수도 있다.

## Sources
- [scc (GitHub)](https://github.com/boyter/scc)
- [Why count lines of code? — Ben E. C. Boyter](https://boyter.org/posts/why-count-lines-of-code/)
- [Sloc Cloc and Code 성능 비교](https://boyter.org/posts/sloc-cloc-code/)
- [cloc (GitHub)](https://github.com/AlDanial/cloc)
