# grep의 성능과 동작 원리

## 쉬운 설명

두꺼운 책에서 "사과"라는 단어를 찾을 때, 한 글자씩 다 읽지 않는다. "과"가 있을 법한 자리만 성큼성큼 건너뛰며 보다가, "과"가 보이면 그제야 앞 글자가 "사"인지 확인한다. grep은 이렇게 **안 봐도 되는 글자는 건너뛰고, 본 글자에도 일을 아주 적게 하기** 때문에 빠르다.

## 일반 설명

### 1. 성능은 어느 정도인가

- **기준 버전**: GNU grep 3.12 (2025-04-10 릴리스). 대부분의 리눅스 배포판이 이 버전 근처를 쓴다.
- **대략적인 체감 수치** (환경마다 크게 다르므로 자릿수 감각으로만 참고)
  - 고정 문자열·단순 정규식을 페이지 캐시에 올라간(이미 읽은) 파일에서 찾으면, 대체로 **초당 수 GB 수준**이다. CPU와 메모리 대역폭이 상한이다.
  - 디스크에서 처음 읽는 경우에는 grep보다 **디스크 I/O 속도**(SSD 수백 MB/s ~ 수 GB/s)가 먼저 병목이 된다.
  - 반대로 **역참조(`\1`)**, 복잡한 대소문자 무시 + 유니코드, 고정 문자열을 뽑을 수 없는 패턴(`[A-Za-z]{30}` 등)은 수십 배 느려질 수 있다.
- **시간 복잡도**
  - 고정 문자열(Boyer-Moore 계열): 평균적으로 입력보다 적게 읽는다(최선 O(n/m), m은 패턴 길이). 패턴이 길수록 더 많이 건너뛰어 빨라진다.
  - 정규식(DFA): 입력 길이에 선형 O(n). 패턴이 복잡해도 바이트당 상태 전이 한 번이다.
  - 역참조 포함: DFA로 표현할 수 없어 백트래킹 엔진으로 넘어간다. 최악의 경우 지수 시간이 걸린다.
- 실제 수치는 `hyperfine --warmup 3 'grep -c foo big.log'`처럼 워밍업을 넣고 자기 데이터로 재는 것이 정확하다. 첫 실행은 파일 캐시 영향 때문에 느리게 나온다.

### 2. 원리: "모든 바이트를 보지 않고, 본 바이트에도 일을 적게 한다"

GNU grep 원작자 Mike Haertel이 2010년 FreeBSD 메일링 리스트에서 설명한 핵심이다.

#### (1) 줄 단위가 아니라 큰 버퍼 단위로 읽는다

```
일반적인 생각:   한 줄 읽기 → 패턴 검사 → 다음 줄 ...
GNU grep:        큰 버퍼(수십 KB 이상)를 read()로 통째로 읽기
                 → 버퍼 전체에서 패턴 검색
                 → 매치가 나온 경우에만 앞뒤 '\n'을 찾아 줄 경계 계산
```

- 줄마다 개행을 찾고 함수를 호출하는 비용이 없어진다. 매치가 드물면 대부분의 줄은 "줄"로 인식되지도 않는다.
- 저수준 `read()` 시스템 콜을 쓰고, 읽은 데이터를 복사하지 않는다.
- 과거에는 `mmap()`으로 커널의 복사까지 줄이려 했다(`--mmap`). 이득이 일정하지 않고 파일이 잘리면 위험해서, 지금은 이 옵션이 없어졌고 `read()` 방식을 쓴다.

#### (2) 고정 문자열은 Boyer-Moore로 건너뛴다

패턴 `apple`을 찾는다고 하자.

```
텍스트: ... t h e _ r e d _ a p p l e ...
              ↑ 패턴 길이(5)만큼 앞의 위치에서 '마지막 글자'부터 비교
```

1. 패턴의 **마지막 글자** `e` 자리에 있는 텍스트 글자를 먼저 본다.
2. 그 글자가 패턴에 아예 없으면(예: `x`) 패턴 길이만큼, 즉 5바이트를 통째로 건너뛴다.
3. 패턴 안에 있는 글자면, 미리 만든 **건너뛰기 표(skip table)**를 보고 그 글자가 패턴 끝에 맞춰지도록 이동한다.
4. 마지막 글자가 맞으면 그때 앞쪽 글자들을 비교한다.

- 그래서 **패턴이 길수록 빠르다**. 한 번에 더 멀리 건너뛰기 때문이다.
- GNU grep은 여기에 **`memchr` 건너뛰기 루프**를 더한다. 마지막 글자를 libc의 `memchr`(SIMD로 최적화됨)로 빠르게 찾는다. 내부 루프는 풀어 써서(loop unrolling) 분기를 줄인다.
- 약점: 패턴의 마지막 글자가 텍스트에 흔한 글자(공백, `e` 등)면 후보가 너무 많아져 느려진다.
- 여러 고정 문자열(`-F -e a -e b`, `-f words.txt`)은 `kwset` 모듈이 처리한다. Commentz-Walter나 Aho-Corasick 계열의 다중 패턴 알고리즘을 쓴다.

#### (3) 정규식은 "필수 리터럴 → DFA → 백트래킹" 3단계로 거른다

```
패턴: ERROR.*timeout=[0-9]+

1단계  필수 고정 문자열 추출   "ERROR" 또는 "timeout="
       → Boyer-Moore/kwset으로 후보 위치를 빠르게 찾음 (대부분의 텍스트는 여기서 탈락)
2단계  DFA로 후보 줄 검증       바이트당 표 조회 한 번, 선형 시간
3단계  (필요할 때만) 정규식 엔진  역참조 등 DFA로 안 되는 기능은 glibc regex(백트래킹)로 최종 확인
```

- **DFA(결정적 유한 오토마톤)**: 정규식을 "상태 × 입력 바이트 → 다음 상태" 표로 바꾼 것이다. 매칭할 때는 바이트마다 표를 한 번 보면 끝이라 매우 빠르다.
- **지연(lazy) DFA**: 모든 상태를 미리 만들면 상태 수가 폭발할 수 있다. 그래서 GNU grep은 실제 입력에서 마주친 상태만 그때그때 만들어 캐시한다.
- **역참조(`(a+)\1`)**: "앞에서 잡은 것과 같은 문자열"은 유한 상태로 기억할 수 없어서 DFA가 불가능하다. 이런 패턴이 느린 근본 이유다.

#### (4) 로케일(locale)이 성능을 좌우한다

- `LANG=ko_KR.UTF-8` 같은 멀티바이트 로케일에서는 `.`이나 `[가-힣]`이 "바이트"가 아니라 "문자"를 뜻한다. 그래서 DFA가 UTF-8 경계를 고려해야 하고, `-i`(대소문자 무시)도 유니코드 규칙을 따른다.
- 결과가 같다면 `LC_ALL=C grep ...`으로 바이트 단위로 처리하게 하면 눈에 띄게 빨라지는 경우가 많다. 다만 한글 문자 클래스처럼 문자 단위 의미가 필요하면 결과가 달라질 수 있다.

### 3. ripgrep과의 차이 (왜 rg가 더 빠르다고 하는가)

| 항목 | GNU grep | ripgrep (`rg`) |
|---|---|---|
| 리터럴 검색 | Boyer-Moore + `memchr` 건너뛰기 루프 | SIMD 다중 리터럴 알고리즘 **Teddy**, 흔한 바이트를 피하는 휴리스틱 |
| 정규식 | 지연 DFA + glibc regex | Rust `regex` (지연 DFA, 리터럴 최적화, 역참조 없음) |
| 병렬성 | 단일 스레드 | 디렉터리 순회와 파일 검색을 멀티스레드로 |
| 기본 필터 | 없음(지정한 대로 다 읽음) | `.gitignore`·숨김·바이너리 파일 기본 제외 |
| 유니코드 | `-i` + UTF-8에서 크게 느려질 수 있음 | 유니코드 처리 비용이 상대적으로 작음 |

- 큰 소스 트리에서 rg가 압도적으로 빠른 것은 **알고리즘보다 "덜 읽기"(ignore 규칙)와 병렬 처리** 덕분인 경우가 많다.
- 단일 대용량 파일에서 단순 패턴이면 둘의 차이는 작다. 리터럴이 없는 패턴(`[A-Za-z]{30}` 등)은 GNU grep이 더 빠르다는 사례도 있다.

### 4. 실무 팁

| 상황 | 방법 |
|---|---|
| 정규식이 아닌 고정 문자열 | `grep -F` (정규식 해석을 건너뜀) |
| 한글 등 문자 단위 의미가 필요 없음 | `LC_ALL=C grep ...` |
| 있는지만 알면 됨 | `grep -q` (첫 매치에서 바로 종료) |
| 파일 이름만 필요 | `grep -l` (파일마다 첫 매치에서 다음 파일로) |
| 앞 N개만 필요 | `grep -m N` |
| 개수만 필요 | `grep -c` (출력 비용 절감) |
| 역참조 | 가능하면 피한다 (DFA 불가) |
| 파일이 아주 많음 | `rg`, 또는 `find ... -print0 \| xargs -0 -P 8 grep ...`으로 병렬화 |
| 압축 로그 | `zgrep`보다 `zstdgrep`/`rg -z` 등. 해제 비용이 지배적이다 |

## Sources

- [why GNU grep is fast — Mike Haertel, freebsd-current (2010)](https://lists.freebsd.org/pipermail/freebsd-current/2010-August/019310.html)
- [why GNU grep is fast — 스레드 후속 논의](https://lists.freebsd.org/pipermail/freebsd-current/2010-August/019354.html)
- [GNU grep 3.12 릴리스 공지 — Savannah](https://savannah.gnu.org/news/?id=10753)
- [GNU grep Manual](https://www.gnu.org/software/grep/manual/html_node/index.html)
- [GNU grep NEWS (3.12, Debian)](https://sources.debian.org/src/grep/3.12-1/NEWS)
- [Grep 3.7 Released To Fix "Extreme Performance Degradation" — Phoronix](https://www.phoronix.com/news/GNU-Grep-3.7)
- [ripgrep is faster than {grep, ag, git grep, ucg, pt, sift} 요약](https://daniliants-com.pages.dev/insights/ripgrep-is-faster-than-grep-ag-git-grep-ucg-pt-sift)
- [10년이 지나도 회자되는 ripgrep의 기술적 승리 — WikiDocs](https://wikidocs.net/blog/@jaehong/9856/)
- [ripgrep issue #2715 — grep이 더 빠른 사례](https://github.com/burntsushi/ripgrep/issues/2715)
