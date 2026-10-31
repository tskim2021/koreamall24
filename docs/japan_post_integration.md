# 일본우체국(Japan Post) 배송 추적 연동 가이드

## 개요
일본우체국은 다음과 같은 배송 추적 서비스를 제공합니다:

1. **공개 웹 서비스**: 개인 고객용 추적 (11-13자리 추적번호)
2. **사업소 향 제공 서비스**: 기업용 서비스 (EDI, 전용 웹사이트)

## 추적 데이터 제공 방식

### 1. 공개 웹 서비스 (Public Web Service)
- **URL**: https://trackings.post.japanpost.jp/services/srv/search/
- **추적번호 형식**: 11-13자리 숫자 (하이픈 제거)
- **조회 기간**: 배송 처리 후 100일
- **특징**: 개인 고객용, 무료, 실시간 조회 가능

### 2. 사업소 향 제공 서비스 (Business Service)
#### (1) 전용 웹사이트 (Dedicated Website)
- 사전 신청 필요
- CSV 형식 다운로드 가능
- 등록 조건 검색 또는 일괄 다운로드 방식

#### (2) EDI 서비스 (Enterprise Data Interchange)
- 기업 시스템과 직접 연동
- 매일 정시에 추적 데이터 제공
- 가장 자동화된 방식

## 추적번호 형식
- **ゆうパック** (Yu-Pack): 13자리
- **EMS**: 13자리
- **書留郵便物** (Registered Mail): 11-13자리
- **国際郵便物** (International Mail): 13자리

## 현재 구현 상태
- ✅ 공개 웹 서비스 기반 추적 가능
- ⏳ EDI 서비스 연동 (사전 신청 필요)
- ⏳ 자동 배송 상태 업데이트 (폴링 기반)

## 다음 단계
1. 일본우체국에 EDI 서비스 신청
2. API 인증 정보 획득
3. 자동 추적 스케줄러 구현
4. 배송 상태 코드 매핑

## 참고 링크
- 공식 추적 서비스: https://www.post.japanpost.jp/tsuiseki/tuiseki_teikyo.html
- 웹 추적 페이지: https://trackings.post.japanpost.jp/services/srv/search/
