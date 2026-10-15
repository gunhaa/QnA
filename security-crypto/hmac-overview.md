# HMAC(Hash-based Message Authentication Code)이란?

## 쉬운 설명

편지에 **나와 친구만 아는 비밀 도장**을 찍는 것과 같습니다. 도장 모양은 편지 내용에 따라 매번 달라지기 때문에, 누가 편지를 몰래 고치면 도장이 맞지 않게 되고, 비밀을 모르는 사람은 도장을 흉내 낼 수 없습니다.

## 일반 설명

### 1. 정의

- **MAC(Message Authentication Code)**: 메시지와 **공유 비밀 키**로 만드는 짧은 태그입니다. 이 태그로 두 가지를 검증합니다.
  - **무결성(integrity)**: 메시지가 변조되지 않았는지
  - **출처 인증(authenticity)**: 키를 가진 쪽이 만든 메시지인지
- **HMAC**: 해시 함수(SHA-256 등)로 MAC을 만드는 표준 방식입니다. 1996년 **RFC 2104**로 정의되었고, FIPS 198-1에도 포함되어 있습니다. 사용하는 해시 함수에 따라 `HMAC-SHA256`, `HMAC-SHA512`처럼 부릅니다.

> 일반 해시(SHA-256)는 키가 없어서 **누구나 다시 계산할 수 있습니다**. 그래서 무결성은 검증할 수 있어도, 누가 만들었는지는 증명하지 못합니다. HMAC은 여기에 키를 넣어서 인증 기능까지 더한 것입니다.

### 2. 구조 (RFC 2104)

```
HMAC(K, m) = H( (K' ⊕ opad) ‖ H( (K' ⊕ ipad) ‖ m ) )
```

| 기호 | 의미 |
|---|---|
| `H` | 해시 함수 (예: SHA-256, 블록 크기 B = 64바이트) |
| `K'` | 키 길이를 B로 맞춘 키. B보다 길면 먼저 해시하고, 짧으면 0으로 패딩 |
| `ipad` | `0x36`을 B번 반복한 값 |
| `opad` | `0x5C`를 B번 반복한 값 |
| `‖` | 연결(concatenation) |

과정은 **내부 해시**(키⊕ipad + 메시지)를 먼저 구하고, 그 결과에 **외부 해시**(키⊕opad + 내부 해시)를 한 번 더 적용하는 이중 해시 구조입니다.

### 3. 왜 `H(key ‖ message)` 대신 이 구조를 쓰나: 길이 확장 공격

- SHA-1, SHA-256 같은 **Merkle–Damgård 구조** 해시는 출력값이 곧 내부 상태입니다. 그래서 `H(key ‖ m)` 값만 알면 키를 몰라도 `H(key ‖ m ‖ padding ‖ 추가데이터)`를 계산할 수 있습니다. 이것이 **length extension attack**입니다.
- HMAC은 외부 해시가 내부 해시 결과를 감싸기 때문에 이 공격이 통하지 않습니다.
- 참고로 SHA-3와 BLAKE3는 구조상 이 공격에 안전해서 `KMAC`이나 keyed 모드를 쓰지만, 호환성 때문에 실무 표준은 여전히 HMAC-SHA256입니다.

### 4. 검증 방법과 주의점

1. 수신자는 같은 키로 HMAC을 **다시 계산**하고, 받은 태그와 비교합니다.
2. 비교할 때는 반드시 **상수 시간 비교(constant-time compare)**를 써야 합니다. `==`이나 `equals()`는 첫 번째로 다른 바이트에서 바로 끝나기 때문에, 응답 시간 차이로 태그를 한 바이트씩 알아내는 **timing attack**에 노출됩니다.
   - Java: `MessageDigest.isEqual()`
   - Python: `hmac.compare_digest()`
   - Node.js: `crypto.timingSafeEqual()`
3. **재전송 공격(replay attack)은 HMAC만으로 막을 수 없습니다.** 메시지에 timestamp나 nonce를 넣어서 서명하고, 서버가 허용 시간 범위와 중복 여부를 확인해야 합니다.
4. 키 길이는 해시 출력 길이 이상의 **랜덤 값**으로 만듭니다. HMAC-SHA256이면 32바이트 이상입니다. 사람이 정한 비밀번호를 키로 쓰면 안 됩니다.
5. 무엇을 서명했는지가 명확해야 합니다. 서명 대상 문자열을 만드는 규칙(**canonicalization**: 필드 순서, 인코딩, 구분자)을 고정하지 않으면 검증이 깨지거나, 다른 메시지로 바꿔치기할 여지가 생깁니다.

### 5. HMAC vs 디지털 서명

| 항목 | HMAC | 디지털 서명 (RSA, ECDSA, Ed25519) |
|---|---|---|
| 키 | **대칭키** (양쪽이 같은 키 공유) | **비대칭키** (개인키로 서명, 공개키로 검증) |
| 부인 방지(non-repudiation) | 불가. 양쪽 모두 태그를 만들 수 있음 | 가능 |
| 속도 | 매우 빠름 | 상대적으로 느림 |
| 적합한 상황 | 서버↔서버처럼 키를 공유할 수 있는 신뢰 관계 | 검증자가 많거나 불특정한 경우 |

#### 자주 하는 오해: "각자 다른 키를 가지고 있다가 푼다"?

둘 다 틀린 이해입니다.

1. **키는 하나입니다.** HMAC은 보내는 쪽과 받는 쪽이 **똑같은 비밀키 하나**를 미리 나눠 가집니다. "개인키는 내가, 공개키는 상대가" 갖는 구조는 디지털 서명(비대칭키) 방식입니다.
2. **푸는 과정이 없습니다.** HMAC 태그는 해시라서 원래 값으로 되돌릴 수 없고, 메시지도 암호화되지 않은 평문 그대로 전송됩니다. 받는 쪽은 받은 메시지에 **자기가 가진 같은 키로 HMAC을 다시 계산**하고, 받은 태그와 **같은지 비교**합니다.

```
송신: tag = HMAC(K, msg)          → [msg, tag] 전송
수신: tag' = HMAC(K, msg) 재계산  → tag' == tag ? (상수 시간 비교)
```

디지털 서명도 엄밀히 말하면 "푼다"가 아니라 **공개키로 서명을 검증(verify)한다**고 표현합니다. 메시지 내용을 숨기는 기밀성이 필요하면 HMAC과 별도로 암호화를 해야 하고, AES-GCM 같은 AEAD 방식이나 TLS를 사용합니다.

### 6. 실무에서 쓰이는 곳

- **Webhook 서명**: GitHub의 `X-Hub-Signature-256`, Stripe의 `Stripe-Signature` 헤더
- **API 요청 서명**: AWS Signature V4는 HMAC-SHA256을 여러 번 연쇄해서 서명 키를 만듭니다.
- **JWT `HS256`**: 토큰 서명에 HMAC-SHA256을 사용합니다.
- **OTP**: HOTP(RFC 4226)와 TOTP(RFC 6238)는 HMAC-SHA1 결과를 잘라서 6자리 코드를 만듭니다.
- **키 유도**: HKDF(RFC 5869)는 HMAC 위에 만들어졌고, TLS 1.3에서 사용합니다.
- **API 키 저장 및 조회**: API 키를 HMAC으로 해시해서 DB에서 조회합니다. 자세한 내용은 [api-key-verification/](./api-key-verification/) 참고.

### 7. Java 예시

```java
Mac mac = Mac.getInstance("HmacSHA256");
mac.init(new SecretKeySpec(secretKey, "HmacSHA256"));
byte[] expected = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));

boolean valid = MessageDigest.isEqual(expected, receivedTag); // 상수 시간 비교
```

### 참고 자료

- [RFC 2104 – HMAC](https://www.rfc-editor.org/rfc/rfc2104.html)
- [PentesterLab – HMAC glossary](https://pentesterlab.com/glossary/hmac)
- [Length extension attacks anti-pattern](https://skills.cat/skills/igbuend/grimbard/length-extension-attacks-anti-pattern)
- [Understanding HMAC – a deep dive](https://peerlist.io/jagss/articles/understanding-hmac-a-deep-dive-into-hashbased-message-authen)
