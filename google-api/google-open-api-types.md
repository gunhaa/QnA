# 구글이 주는 "오픈 API"는 어떤 종류가 있을까?

구글의 오픈 API(Open API)는 마치 **레고 블록 세트**와 같아요. 구글이 만들어 놓은 기능(지도, 이메일, 번역, 유튜브 등)을 내가 직접 안 만들어도, "블록"처럼 가져다가 내 앱에 끼워 넣을 수 있게 해주는 거예요. 이 블록을 가져다 쓰는 방법을 정해놓은 설명서가 바로 **API(Application Programming Interface, 응용 프로그램 프로그래밍 인터페이스)**입니다.

구글은 이 블록 세트를 크게 아래와 같은 종류로 나눠서 제공해요.

## 1. 구글 클라우드 API (Google Cloud API)
컴퓨터, 저장 공간, 데이터 분석 같은 "커다란 창고와 일꾼"을 빌려주는 블록이에요.
- 예: Compute Engine(가상 컴퓨터 빌리기), Cloud Storage(파일 창고), BigQuery(데이터 분석 창고)

## 2. 구글 워크스페이스 API (Google Workspace API)
친구들과 편지 쓰고, 약속 잡고, 문서를 함께 쓰는 "책상과 수첩" 블록이에요.
- 예: Gmail API(이메일 보내기/읽기), Calendar API(일정 관리), Drive API(파일 저장·공유), Docs/Sheets API(문서·표 만들기), Meet/Chat API(화상통화·채팅)

## 3. 구글 지도 플랫폼 API (Google Maps Platform API)
길을 찾고 장소를 알려주는 "장난감 지도" 블록이에요.
- 예: Maps API(지도 보여주기), Places API(가게·건물 정보), Routes API(길찾기), Geocoding API(주소 ↔ 좌표 변환), Roads API(도로 정보), Pollen API(꽃가루 정보)

## 4. 인공지능/머신러닝 API (AI/ML API)
컴퓨터가 사람처럼 "보고, 듣고, 이해하는" 마법 블록이에요.
- 예: Gemini API(대화형 AI, 텍스트·이미지·영상 이해), Cloud Vision API(사진 속 물건 알아보기), Cloud Translation API(189개 언어 번역), Cloud Natural Language API(글의 감정·의미 분석), Speech-to-Text/Text-to-Speech API(말↔글 변환), Vertex AI API(내 AI 모델 훈련·배포)

## 5. 로그인/신원 확인 API (Identity API)
"이 사람이 진짜 맞나요?"를 확인해주는 출입증 블록이에요.
- 예: Google Sign-In / OAuth 2.0(구글 계정으로 로그인하기), Identity Platform(회원 관리)

## 6. 미디어·콘텐츠 API (Media/Content API)
영상이나 검색 결과를 가져오는 "텔레비전 리모컨" 블록이에요.
- 예: YouTube Data API(영상 정보 가져오기·올리기), YouTube Analytics API(영상 통계 보기), Custom Search JSON API(검색 결과 가져오기), Google Books API(책 정보 검색)

## 정리하면
구글 API는 크게 **① 클라우드 인프라, ② 업무 협업(Workspace), ③ 지도, ④ AI, ⑤ 로그인, ⑥ 미디어**로 나뉘어요. 어떤 블록이 정확히 몇 개 있는지 전체 목록은 구글의 **API Discovery Service**(developers.google.com/discovery)나 **Google Cloud Console의 API 라이브러리**에서 확인할 수 있어요. 새로운 블록(API)이 계속 추가되고 있어서, 최신 목록은 항상 그 페이지에서 확인하는 게 정확해요.

## Sources
- [Google Enterprise APIs | Google Cloud Documentation](https://cloud.google.com/apis/docs/resources/enterprise-apis)
- [Google Maps Platform APIs by Platform | Google for Developers](https://developers.google.com/maps/apis-by-platform)
- [Google APIs Explorer | Google for Developers](https://developers.google.com/apis-explorer)
- [Google API Discovery Service | Google for Developers](https://developers.google.com/discovery)
- [Try Google Workspace APIs | Google for Developers](https://developers.google.com/workspace/explore)
- [Cloud Translation | Google Cloud](https://cloud.google.com/translate)
- [Google Cloud APIs | Google Cloud Documentation](https://docs.cloud.google.com/apis/docs/overview)
