Plan 7 — 크롤러 자동화 & 운영 인프라
====================================

## 작업 목표
- instaloader 기반 크롤러를 운영 환경에 통합하고 Docker Compose로 전체 스택을 자동화한다.

## 상세 작업 항목 체크리스트
- [ ] instaloader 스크립트에서 프로필 이미지/미디어/본문 저장 규칙 준수 여부 검증
- [ ] 세션 재사용 로직과 다중 계정 순차 크롤링 플로우 구현
- [ ] 크롤링 실행 로그 및 실패 재시도 전략 수립
- [ ] Docker Compose 서비스(api, crawler, thumb, db) 정의 및 공유 볼륨 설정
- [ ] 환경 변수/비밀 관리(.env.sample, README) 문서화
- [ ] 성능 측정(Feed 응답 < 200ms, 썸네일 로딩 최적화)과 모니터링 지표 구성

## 예상 산출물
- 크롤러 파이썬 스크립트 및 실행 스케줄러
- docker-compose.yml 및 관련 설정
- 운영 가이드/README 업데이트

## 완료 여부
status: pending

## 필요 기술/참고 문서
- instaloader 문서
- Docker Compose 공식 문서
- Grafana/Prometheus 참고 자료(선택)
