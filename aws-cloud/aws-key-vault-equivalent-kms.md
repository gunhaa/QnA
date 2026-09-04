# AWS "키볼트"? — 사실은 AWS KMS를 말하는 거예요

먼저 짚고 넘어갈 게 있어요. **"Key Vault"라는 이름의 서비스는 AWS가 아니라 마이크로소프트 Azure의 서비스명**이에요. AWS에서 같은 역할을 하는 서비스는 이름이 달라요. 그래서 "AWS 키볼트"라고 검색하면 나오는 건 대부분 "Azure Key Vault랑 비슷한 AWS 서비스가 뭐야?"에 대한 답변이에요.

비유하자면 **"열쇠 보관함"**이에요. 우리 집 열쇠(암호화 키, encryption key)를 아무 데나 두면 도둑이 훔쳐가서 집(데이터)을 열어볼 수 있어요. 그래서 튼튼한 금고에 열쇠를 넣어두고, "이 사람만 열쇠 꺼내갈 수 있어"라고 규칙을 정하는 서비스가 필요해요. AWS에서는 이 역할을 **AWS KMS**가 담당해요.

## AWS KMS (Key Management Service)
- 정식 이름: **AWS Key Management Service**
- 역할: 데이터를 암호화/복호화(잠그고 여는)할 때 쓰는 **암호화 키**를 만들고, 저장하고, 누가 쓸 수 있는지 관리해줘요.
- 뒤에서는 **FIPS 140-3 인증 하드웨어 보안 모듈(HSM, Hardware Security Module)**이라는 특수 금고 장치가 실제로 키를 지켜요.
- 요금은 저렴한 편이에요 — 키 1개당 월 약 1달러 + 요청 1만 건당 0.03달러 정도.
- 최근(2026년)에는 **양자컴퓨터 시대를 대비한 암호화(ML-KEM, ML-DSA 같은 포스트 퀀텀 암호화)**도 지원하기 시작했어요. 미래의 슈퍼 컴퓨터가 와도 쉽게 못 뚫도록 미리 대비하는 거예요.
- `GetKeyLastUsage` 같은 새 API로 "이 열쇠 마지막으로 언제 썼어?"도 확인할 수 있게 됐어요.

## AWS CloudHSM
- KMS보다 "더 강력하고 더 비싼 금고"예요.
- 나만 쓰는 **전용 하드웨어 금고(dedicated HSM)**를 통째로 빌리는 개념이라, 은행처럼 규제가 엄격한 곳에서 주로 써요.
- 가격: HSM 1대당 월 약 1,152달러 — KMS보다 훨씬 비싸요. 그래서 "특별한 규정 준수(compliance)가 필요할 때만" 쓰는 옵션이에요.
- KMS와 CloudHSM을 연결(custom key store)해서, KMS의 편리함 + CloudHSM의 강력함을 같이 쓰는 것도 가능해요.

## AWS Secrets Manager (덤으로 알아두면 좋아요)
- KMS가 "암호화 열쇠 자체"를 관리한다면, Secrets Manager는 **비밀번호, API 키, DB 접속 정보 같은 "비밀 쪽지"**를 저장하고 자동으로 주기적으로 바꿔주는(rotation) 서비스예요.
- 사실 Azure Key Vault는 "열쇠 + 비밀번호 + 인증서"를 한 곳에서 다 관리하는 반면, AWS는 이 역할을 KMS(열쇠) + Secrets Manager(비밀번호·API키) + ACM(인증서)로 나눠서 제공해요.

## 한눈에 비교
| 하고 싶은 것 | Azure 이름 | AWS 이름 |
|---|---|---|
| 암호화 키 관리 | Key Vault (Keys) | **AWS KMS** |
| 비밀번호/API 키 저장 | Key Vault (Secrets) | **AWS Secrets Manager** |
| 전용 하드웨어 보안 모듈 | Managed HSM | **AWS CloudHSM** |
| 인증서 관리 | Key Vault (Certificates) | **AWS Certificate Manager (ACM)** |

## Sources
- [AWS KMS keys - AWS Key Management Service](https://docs.aws.amazon.com/ko_kr/kms/latest/developerguide/concepts.html)
- [AWS KMS Vs Azure Key Vault Vs GCP KMS | Encryption Consulting](https://www.encryptionconsulting.com/aws-kms-vs-azure-key-vault-vs-gcp-kms/)
- [Features | AWS Key Management Service (KMS) | Amazon Web Services (AWS)](https://aws.amazon.com/kms/features/)
- [AWS KMS or AWS CloudHSM: Choose the right key management solution | Amazon Web Services](https://aws.amazon.com/blogs/security/aws-kms-or-aws-cloudhsm-choose-the-right-key-management-solution/)
- [AWS KMS vs. CloudHSM: Which Key Management Service Is Right for You?](https://metrotechs.io/news/aws-kms-vs-cloudhsm-key-management-guide-2026)
- [AWS CloudHSM key stores - AWS Key Management Service](https://docs.aws.amazon.com/kms/latest/developerguide/keystore-cloudhsm.html)
