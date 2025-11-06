Plan 5 — 어드민 패널 & Authentik 연동
======================================

## 작업 목표
- `/admin` 경로의 SPA를 구축하고 Authentik OIDC 인증을 연동하여 크롤링/노출 관리 기능을 제공한다.

## 상세 작업 항목 체크리스트
- [ ] Authentik OIDC 클라이언트 설정 및 토큰 검증 로직 구현
- [ ] 어드민 전용 라우터/레이아웃 및 역할 기반 가드 적용
- [ ] 크롤링 대상(ID) CRUD 및 `is_active`/`is_featured` 토글 UI 구성
- [ ] 크롤링 로그인 계정 CRUD + 세션 입력 폼 구현
- [ ] 수동 크롤링 실행 트리거 및 실행 이력 테이블 작성
- [ ] 피드 노출 순서/통계 대시보드 구성

## 예상 산출물
- 어드민 SPA 페이지와 컴포넌트
- Authentik 연동 설정 문서 및 환경 변수 샘플
- 어드민 API 통신 훅/서비스

## 완료 여부
status: pending

## 필요 기술/참고 문서
- Authentik OIDC 문서
- React Router v6 가드 패턴
