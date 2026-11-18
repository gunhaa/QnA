# SNI (Server Name Indication)란?

## 한 줄 비유

여러 가족이 한 아파트(같은 IP 주소)에 살고 있다고 생각해 보세요. 우편배달부(브라우저)가 편지를 배달하려면 "몇 호에 사는 누구 앞으로 왔어요"라고 겉봉투에 적어야(SNI, Server Name Indication) 해요. 그래야 배달부가 문 앞에서 헤매지 않고 정확한 집에 편지를 전달할 수 있어요.

## 기술적으로는

- SNI는 **TLS(전송 계층 보안, Transport Layer Security)** 핸드셰이크의 첫 단계인 **ClientHello** 메시지에 포함되는 확장(extension)입니다.
- 클라이언트(브라우저)가 서버에 접속할 때 "나는 `example.com`에 접속하고 싶어요"라고 알려주는 역할을 합니다.
- 이게 필요한 이유는 **가상 호스팅(virtual hosting)** 때문입니다. 하나의 IP 주소에 여러 도메인(웹사이트)이 함께 호스팅되는 경우, 서버는 SNI 값을 보고 어떤 사이트의 인증서(certificate)를 클라이언트에게 보여줄지 결정합니다. SNI가 없으면 서버는 "어느 집으로 갈지" 알 수 없습니다.

## SNI의 문제점: 평문 전송

TLS는 통신 내용을 암호화하지만, 정작 SNI 값 자체는 **암호화되기 전 평문(plaintext)**으로 전송됩니다. 즉, 편지 내용(웹페이지 데이터)은 봉투 안에 숨겨서 암호화하지만, 겉봉투에 쓴 주소(어떤 도메인에 접속하는지)는 누구나 읽을 수 있는 셈입니다.

이 때문에 중간에서 트래픽을 관찰하는 장비(ISP, 방화벽, 감시자 등)가 사용자가 어떤 사이트(예: 특정 뉴스 사이트, 정치적으로 민감한 사이트)에 접속하는지 알아낼 수 있는 **프라이버시 문제**가 있습니다.

## 해결책: ECH (Encrypted Client Hello)

최근(2025년 이후) IETF 표준으로 자리잡고 있는 **ECH(암호화된 클라이언트 헬로, Encrypted Client Hello)**는 이 문제를 해결합니다. 우편배달 비유로 다시 설명하면, 이제는 겉봉투에 아파트 단지 이름만 적고, "몇 호 누구 앞"이라는 진짜 주소는 암호화된 내부 봉투에 넣어 배달부(중간 관찰자)가 못 보게 만드는 방식입니다.

- **바깥 SNI(outer SNI)**: 서버(아파트 단지)를 식별하는 데만 사용되는, 여전히 평문인 값
- **안쪽 SNI(inner SNI)**: 실제로 접속하려는 정확한 도메인(서비스)을 담고 있으며, 암호화되어 보호됨

ECH는 2025년경 **RFC 9849**로 정식 표준화되었고, 현재 iOS, Android, Firefox 등에서 기본 지원되고 있습니다. Cloudflare 같은 CDN도 이를 지원하여, HTTPS 연결에서 마지막까지 남아있던 메타데이터 노출 문제를 해결하는 단계에 있습니다.

## 정리

| 항목 | 설명 |
|---|---|
| SNI | 클라이언트가 서버에 "어떤 도메인에 접속하려는지" 평문으로 알려주는 TLS 확장 |
| 필요한 이유 | 하나의 IP에 여러 도메인이 호스팅되는 가상 호스팅 환경 지원 |
| 문제점 | 도메인 이름이 암호화되지 않아 제3자가 접속 대상을 관찰 가능 |
| 해결책 | ECH(Encrypted Client Hello)로 내부 SNI를 암호화하여 노출 방지 |

## Sources

- [Server Name Indication - Wikipedia](https://en.wikipedia.org/wiki/Server_Name_Indication)
- [TLS Encrypted Client Hello - IETF draft](https://www.ietf.org/archive/id/draft-ietf-tls-esni-17.html)
- [RFC 9849 - TLS Encrypted Client Hello](https://datatracker.ietf.org/doc/rfc9849/)
- [Encrypted Client Hello (ECH) & TLS 1.3 - Enea](https://www.enea.com/solutions/traffic-management/encrypted-client-hello-ech-tls-1-3/)
- [Encrypted Client Hello: Closing the SNI Metadata Gap - CDT](https://cdt.org/insights/encrypted-client-hello-closing-the-sni-metadata-gap/)
- [Security/Encrypted Client Hello - MozillaWiki](https://wiki.mozilla.org/index.php?title=Security/Encrypted_Client_Hello&mobileaction=toggle_view_desktop)
