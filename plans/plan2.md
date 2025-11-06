Plan 2 — 백엔드 API 및 인덱싱 설계
=================================

## 작업 목표
- `api/` 디렉터리에서 Fastify 서버 골격 작성
- `/api/accounts`, `/api/posts`, `/api/posts/:id` 엔드포인트 설계
- DB 인덱싱 파이프라인(파일 스캔 → Postgres 업서트) 정의
- 썸네일 서버 연동 방안 수립

## 상세 작업 항목 체크리스트
- [ ] Fastify 프로젝트 부트스트랩
- [ ] Prisma 또는 Query Builder 결정
- [ ] `/root/<account>/` 파서 구현
- [ ] 해시태그 정규식 `/#([^\s#.,!?;:]+)/g/` 적용
- [ ] Range 응답 테스트
- [ ] React Query로 프런트엔드 데이터 패칭 전환 준비

## 예상 산출물
- Fastify 서버 초기 코드
- DB 스키마/마이그레이션
- 인덱싱 스크립트
- 향후 썸네일 서비스 계약 문서 초안

## 완료 여부
status: pending
