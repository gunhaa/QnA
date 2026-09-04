# 롱텀 테스트(Long-term Test)란?

## 한 줄 비유

장난감 로봇을 사면 딱 한 번만 눌러보고 "잘 작동하네!" 하고 끝내지 않죠? 며칠 동안 계속 켜두고 놀아봐야, 배터리가 이상하게 빨리 닳거나 갑자기 멈추는 문제를 발견할 수 있어요. **롱텀 테스트**는 소프트웨어를 오랫동안 계속 켜두고 써보면서 "시간이 지나도 안 지치고 잘 버티는지" 확인하는 시험이에요.

## 기술적으로는

롱텀 테스트는 정식 용어로 **소크 테스트(Soak Test)** 또는 **내구성 테스트(Endurance Testing)**라고 부릅니다. **비기능 테스트(non-functional testing)**의 한 종류로, 시스템이 짧은 순간이 아니라 **긴 시간 동안 지속적인 부하(load)**를 받았을 때도 안정적으로 동작하는지를 검증합니다.

- **목적**: 속도(성능)나 최대 처리량(peak capacity)을 보는 게 아니라, 시스템이 시간이 지나면서 "어떻게 늙어가는지"를 관찰합니다.
- **찾아내는 문제**:
  - **메모리 누수(memory leak)**: 프로그램이 쓰고 난 메모리를 계속 반환하지 않아 점점 쌓이는 문제
  - **데이터베이스 연결 고갈(database connection exhaustion)**: DB와 연결하는 통로(connection)가 제대로 닫히지 않고 쌓여서 결국 바닥나는 문제
  - **지연 시간 증가(latency drift)**: 시간이 지날수록 응답 속도가 점점 느려지는 현상

이런 문제들은 짧은 테스트(몇 분, 몇 시간)로는 절대 드러나지 않고, **오랜 시간 켜둬야만** 서서히 나타나기 때문에 롱텀 테스트가 꼭 필요합니다.

## 테스트 시간은 보통 얼마나?

- 일반적으로 **8~24시간** 정도 진행하며, 프로젝트 요구사항에 따라 **24~48시간**까지 늘리기도 합니다.
- 2026년 기준 모바일 앱 업계 기준(벤치마크)으로는, **4시간 소크 테스트 동안 메모리가 끝없이 증가하지 않아야 하고, 시간당 배터리 소모가 5% 미만**이어야 한다는 기준이 통용되고 있습니다.

## 진행 단계

1. **부하 적용(load 시작)**: 시스템에 일정한 사용자 요청 또는 트래픽을 걸어줍니다.
2. **정상 상태 유지(steady state / endurance phase)**: 가장 중요한 단계로, 부하를 오래 일정하게 유지하면서 메모리, 성능 저하, 안정성을 계속 관찰합니다.
3. **결과 분석**: 시간에 따른 리소스 사용량 그래프를 보고 누수나 성능 저하 추세가 있는지 확인합니다.

## 비슷한 용어와 구분

| 용어 | 초점 |
|---|---|
| 부하 테스트(Load Testing) | 예상되는 정상 트래픽에서 잘 동작하는가 |
| 스트레스 테스트(Stress Testing) | 한계치를 넘는 트래픽에서 언제/어떻게 무너지는가 |
| 소크/내구성 테스트(Soak/Endurance = 롱텀 테스트) | 오랜 시간 동안 안정성을 유지하는가 |
| 용량 테스트(Capacity Testing) | 시스템이 처리할 수 있는 최대치는 얼마인가 |

## Sources

- [Endurance Testing - Software Testing - GeeksforGeeks](https://www.geeksforgeeks.org/software-testing/software-testing-endurance-testing/)
- [What is Endurance Testing? - BrowserStack](https://www.browserstack.com/guide/endurance-testing)
- [4 Types of Load Testing: Load, Stress, Capacity & Soak (2026) - RadView](https://www.radview.com/performance_testing/4-types-of-load-testing-and-when-each-should-be-used/)
- [Endurance Testing: What It Is, Types & Examples - PFLB](https://pflb.us/blog/endurance-testing-what-it-is-types-examples/)
- [Endurance Testing: Validating Long-Term Application Stability - Testriq](https://www.testriq.com/blog/post/endurance-testing-validating-long-term-application-stability)
- [What Is a Soak Test? - Cefuk.co.uk](https://cefuk.co.uk/what-is-a-soak-test/)
- [Soak Testing and Endurance Testing for Mobile Apps - Drizz](https://www.drizz.dev/post/soak-testing-and-endurance-testing-for-mobile-apps)
