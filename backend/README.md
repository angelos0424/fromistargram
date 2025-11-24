# Fromistargram Backend

Fastify 기반 백엔드 서버로 파일 시스템에 저장된 Instagram 크롤링 데이터를 DB에 동기화하고 REST API를 제공합니다.

## 개발 명령어

```bash
pnpm install                # 루트에서 워크스페이스 의존성 설치
pnpm --filter @fromistargram/backend dev    # Fastify 개발 서버 실행 (기본 포트 4000)
pnpm --filter @fromistargram/backend build  # TypeScript 빌드
pnpm --filter @fromistargram/backend start  # 빌드 후 서버 실행
pnpm --filter @fromistargram/backend lint   # 타입 검사
```

## 주요 디렉터리

- `src/server.ts` — Fastify 앱 부트스트랩
- `src/routes/` — REST 엔드포인트 정의 (`/api/accounts`, `/api/posts`, `/api/media/...`)
- `src/services/` — Prisma 기반 도메인 서비스 계층
- `src/indexer/` — `/root/<account>/` 디렉터리 스캔 및 DB 업서트 파이프라인
- `src/utils/range.ts` — 동영상 스트리밍을 위한 Range 응답 유틸리티

## Prisma

`backend/prisma/schema.prisma` 는 PostgreSQL 스키마를 정의합니다. 마이그레이션은 추후 `pnpm --filter @fromistargram/backend prisma migrate dev` 명령으로 생성할 수 있습니다.

## 인덱싱 파이프라인

`pnpm --filter @fromistargram/backend dev` 또는 별도의 크론 작업에서 `node dist/indexer/cli.js` 를 실행하면 파일 시스템의 최신 상태를 DB에 반영합니다. (TypeScript 개발 환경에서는 `tsx src/indexer/cli.ts` 로 실행할 수 있습니다.)

## 썸네일 서버 연동

`/api/media/:account/:filename` 엔드포인트는 `MEDIA_ROOT` 환경 변수 기반으로 원본 파일을 Range 스트리밍합니다. 추후 `imgproxy` 와 같은 썸네일 서버를 붙일 때는 해당 경로를 역프록시 대상으로 활용하거나, Fastify 플러그인으로 프리사이즈 이미지를 반환하도록 확장할 수 있습니다.

크롤링 산출물 이름(예: `2025-02-18_10-59-28_UTC_profile_pic.jpg`)만 전달되는 경우에는 `/api/media/by-filename/:filename` 를 사용하세요. 백엔드는 DB에서 해당 파일을 보유한 계정을 조회한 뒤 `/root/<account>/<filename>` 경로의 실제 파일을 Range 스트리밍합니다. 중복 파일명이 둘 이상 발견되면 409를 반환해 모호성을 알립니다.
