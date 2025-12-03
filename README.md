# Fromistargram 인프라 & 배포 가이드 (Coolify 기준)

[fromistargram.ddunddun.shop](https://fromistargram.ddunddun.shop)


Instaloader로 인스타그램 계정을 크롤링해 Prisma/Fastify API로 노출하고, 이미지·동영상 썸네일을 Imagor/Imagorvideo(+Nginx 캐시)로 제공하는 스택입니다. 이 문서는 imgproxy가 아닌 **Imagor**를 사용하는 현재 구성을 기준으로 Coolify에서 빌드·배포·운영하는 방법을 정리합니다.

## 구성 요소
- `api`: Fastify 기반 백엔드. Instaloader 파이프라인과 인덱서, 관리용 Admin API 포함 (포트 4000).
- `db`: PostgreSQL 16.
- `redis`: 캐시/큐(선택).
- `imagor`, `imagorvideo`: 이미지/동영상 리사이즈·인코딩.
- `nginx-cache`: Imagor 앞단 캐싱 리버스 프록시, 외부 노출 포트 `${THUMBNAIL_PORT:-8080}`.
- 데이터 볼륨: `/mnt/volume1/fromistargram/{data,pg_data,redis,nginx_cache}` (필요 시 경로 변경).

## 사전 준비물
- Coolify 4.x에서 Docker Compose 앱을 생성할 권한.
- 빌드가 가능한 Docker 호스트와 위 볼륨 경로를 만들 권한.
- Instagram 세션 혹은 로그인 계정 정보, API/썸네일용 도메인.

## 환경 변수
`.env.sample`을 복사해 `.env`를 만들고 아래 값을 채웁니다. IMGPROXY 관련 키는 더 이상 사용하지 않으며, Imagor용 키를 넣어야 합니다.
- **DB**: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`
- **API**: `API_PORT`(기본 4000), `PUBLIC_API_BASE_URL`, `LOG_LEVEL`
- **썸네일**: `THUMBNAIL_PORT`(기본 8080), `IMAGOR_SECRET`, `IMAGOR_URL`(예: `https://thumb.example.com/thumb`)
- **크롤러**: `DATA_ROOT=/data`, `CRAWL_OUTPUT_DIR`(선택), `CRAWL_SCRIPT_PATH`(선택), `INSTAGRAM_USERNAME`/`INSTAGRAM_PASSWORD`(세션 생성 시만 사용), `CRAWL_ACCOUNTS` 대신 `/api/admin/targets`로 관리 가능, `CRAWLER_RETRY_*`
- **캐시**: `REDIS_URL` (미설정 시 Redis 없이 동작)

## Coolify 배포 절차
1. Coolify에서 **Docker Compose 애플리케이션**을 새로 만들고 Git 저장소/브랜치를 연결합니다. Compose 파일 경로는 `docker-compose.yml`로 지정합니다.
2. `Settings > Environment Variables`에 `.env` 값을 입력합니다. 특히 `IMAGOR_SECRET`, `IMAGOR_URL`, `PUBLIC_API_BASE_URL`을 실제 도메인에 맞게 설정합니다.
3. 호스트 영속 디렉터리를 준비합니다:
   ```bash
   mkdir -p /mnt/volume1/fromistargram/{data,pg_data,redis,nginx_cache}
   ```
   다른 경로를 쓰려면 `docker-compose.yml`의 바인드 경로도 함께 수정하고, Coolify 볼륨을 그 경로에 매핑합니다.
4. 포트/도메인 라우팅:
   - **API**: 컨테이너 포트 4000(`API_PORT`)을 서비스 포트로 노출하고 API 도메인을 연결합니다.
   - **썸네일**: `nginx-cache`의 80 포트를 `THUMBNAIL_PORT`(기본 8080)에 노출하고 썸네일 도메인을 연결합니다.
5. `Deploy`를 실행하면 Coolify가 `backend/Dockerfile`을 빌드해 `api` 이미지를 만들고 나머지 이미지를 풀링해 Compose를 올립니다. 코드 변경 시 `Redeploy`만 누르면 됩니다.

## 사용 방법 (주요 API 흐름)
- 상태 확인: `GET /healthz`
- 크롤 계정 생성/세션 등록:
  - `POST /api/admin/accounts`로 로그인 계정 등록
  - `POST /api/admin/accounts/:id/session`에 Instaloader 세션 ID 등록
- 크롤 대상 관리: `POST /api/admin/targets`(handle, displayName), `PATCH /api/admin/targets/:id`, `POST /api/admin/targets/reorder`
- 수동 크롤 실행: `POST /api/admin/runs` `{ "sessionId": "세션ID", "targetId": "<옵션>" }` → 완료 시 인덱서가 자동 실행
- 피드 조회: `GET /api/posts?limit=20`, `GET /api/accounts`
- 원본/썸네일:
  - 원본: `GET /api/media/:account/:filename`
  - 썸네일: `GET /api/image-proxy/<imagor-path>` 예) `fit-in/640x640/filters:format(webp)/account/file.jpg` → 서명 후 Imagor/Imagorvideo로 리다이렉트

## 운영 팁
- `/mnt/volume1/fromistargram/data`에는 크롤링 원본과 Imagor 결과물(`result/`)이 함께 저장되므로 최우선 백업 대상으로 지정합니다.
- `pg_data`, `redis`, `nginx_cache`도 같은 루트 경로에 있으니 동일한 스토리지/백업 정책을 적용합니다.
- 로그 확인: Coolify 콘솔에서 `api`/`imagor`/`nginx-cache` 로그를 보거나 필요 시 `docker compose logs -f <service>`로 조사합니다.


# Todo
- video thumbnail 처리

# Change logs
