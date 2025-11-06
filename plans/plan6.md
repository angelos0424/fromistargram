Plan 6 — 백엔드 구현 & 썸네일/캐싱
===================================

## 작업 목표
- Fastify 기반 API 서버를 완성하고 파일 인덱싱, 썸네일 서버, 캐싱 전략을 구현한다.

## 상세 작업 항목 체크리스트
- [ ] Postgres 스키마 마이그레이션(`accounts`, `posts`, `media`, `profile_pics`, `tags`, `post_tags`, `crawl_*`)
- [ ] 파일 스캐너 → DB 업서트 배치 잡 구현 및 테스트 데이터 반영
- [ ] 미디어 Range 응답 및 정적 파일 서빙 최적화
- [ ] 썸네일 서버(imgproxy) 연동 및 URL 서명/캐시 정책 설정
- [ ] API 응답 캐싱(Redis optional) 및 지표 로깅
- [ ] OpenAPI/Swagger 문서화 및 계약 테스트 작성

## 예상 산출물
- 완성된 Fastify 서비스 코드 및 마이그레이션 스크립트
- 인덱싱 및 썸네일 연동 설정 파일
- API 문서와 계약 테스트

## 완료 여부
status: pending

## 필요 기술/참고 문서
- Fastify 공식 문서
- imgproxy 문서
- Prisma 마이그레이션 가이드
