# Fromistargram API

Fastify 기반 백엔드 서버로 파일 시스템에 저장된 Instagram 크롤링 데이터를 DB에 동기화하고 REST API를 제공합니다.

## 개발 명령어

```bash
npm install
npm run dev      # Fastify 개발 서버 실행 (기본 포트 4000)
npm run build    # TypeScript 빌드
npm run start    # 빌드 후 서버 실행
npm run lint     # 타입 검사
```

## 주요 디렉터리

- `src/server.ts` — Fastify 앱 부트스트랩
- `src/routes/` — REST 엔드포인트 정의 (`/api/accounts`, `/api/posts`, `/api/media/...`)
- `src/services/` — Prisma 기반 도메인 서비스 계층
- `src/indexer/` — `/root/<account>/` 디렉터리 스캔 및 DB 업서트 파이프라인
- `src/utils/range.ts` — 동영상 스트리밍을 위한 Range 응답 유틸리티

## Prisma

`api/prisma/schema.prisma` 는 PostgreSQL 스키마를 정의합니다. 마이그레이션은 추후 `npx prisma migrate dev` 명령으로 생성할 수 있습니다.

## 인덱싱 파이프라인

`npm run dev` 또는 별도의 크론 작업에서 `node dist/indexer/cli.js` 를 실행하면 파일 시스템의 최신 상태를 DB에 반영합니다. (TypeScript 개발 환경에서는 `tsx src/indexer/cli.ts` 로 실행할 수 있습니다.)

## 썸네일 서버 연동

`/api/media/:account/:filename` 엔드포인트는 `MEDIA_ROOT` 환경 변수 기반으로 원본 파일을 Range 스트리밍합니다. 추후 `imgproxy` 와 같은 썸네일 서버를 붙일 때는 해당 경로를 역프록시 대상으로 활용하거나, Fastify 플러그인으로 프리사이즈 이미지를 반환하도록 확장할 수 있습니다.
