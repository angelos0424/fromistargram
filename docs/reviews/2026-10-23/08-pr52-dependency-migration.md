# PR #52 의존성 업데이트 수정 및 검증

검토일: 2026-10-23 (KST). 대상: [PR #52](https://github.com/angelos0424/fromistargram/pull/52).

[PR #87](https://github.com/angelos0424/fromistargram/pull/87)이 실제 머지된 main `23bfda41e2c66cfdb7a52673575f03d5bcb76bc2`를 #52 브랜치에 병합한 상태에서 수정했습니다. 기존 #52 head는 `5232a76cafcb926c14d592e1bd2ad887131d4d44`입니다. #87의 인증·업로드·데이터·UI 수정과 패치된 Node 버전 조건을 유지합니다.

## 1. 기능 및 호환성

### 원래 변경의 머지 차단 사유

- Fastify만 5로 올리고 플러그인은 4 호환 버전을 유지하여 CORS, multipart, Swagger, Swagger UI 등록 시 `FST_ERR_PLUGIN_VERSION_MISMATCH`가 발생했습니다.
- Pino 인스턴스를 `logger`에 전달하는 기존 서버 생성 코드가 Fastify 5에서 `FST_ERR_LOG_INVALID_LOGGER_CONFIG`로 실패했습니다.
- 제거된 `reply.getResponseTime()` 호출과 미디어 경로의 400 응답 타입 때문에 TypeScript 검사·빌드가 실패했습니다.
- 최초 격리 검증에서 백엔드 39개 테스트가 실패했습니다. 기존 의존성 변경만으로는 머지할 수 없는 상태였습니다.

### 반영한 수정

| 구성 요소 | 최종 선언 버전 | 변경 목적 |
|---|---|---|
| Fastify | `^5.12.7` | 5 계열 보안 패치 |
| `@fastify/cors` | `^11.3.1` | Fastify 5 호환 |
| `@fastify/multipart` | `^10.1.6` | Fastify 5 호환·패치 |
| `@fastify/swagger` | `^9.9.2` | Fastify 5 호환 |
| `@fastify/swagger-ui` | `^6.1.2` | Fastify 5 호환·패치 |
| Prisma / Prisma Client | `^6.19.3` | 동일 메이저 패치 |
| Axios | `^1.20.0` | 루트·프론트 보안 패치 |
| React Router DOM | `^6.30.6` | 6 계열 최신 패치, 잔여 경고는 후속 관리 |
| Vite | `^7.3.7` | 프론트·백엔드 테스트 의존성 정렬·패치 |
| Vitest / coverage-v8 | `4.1.12` | 테스트 도구 보안 패치·peer 버전 일치 |
| PostCSS | `^8.5.31` | CSS 파서 보안 패치 |

잠금 파일에는 실제 설치 버전을 고정했습니다. 하위 의존성도 부모 패키지가 허용하는 범위에서 갱신했으며, 호환성을 무시하는 강제 메이저 override는 넣지 않았습니다.

- `buildServer`에서 Pino 등 로거 인스턴스는 `loggerInstance`로 전달합니다. 기존 호출자의 `logger: false`, 로깅 설정 객체, 사용자 정의 로거 인스턴스를 계속 지원합니다.
- 요청 시간 측정의 fallback은 Fastify 5의 `reply.elapsedTime`을 사용합니다.
- 파일·썸네일·아바타 라우트에 JSON 400 응답 스키마를 추가하여 기존 잘못된 경로·날짜 거절 동작과 타입을 일치시켰습니다.
- 서버 실제 플러그인 등록·health·문서 경로·로깅 옵션 및 잘못된 미디어 입력을 검증하는 회귀 테스트 9개를 추가했습니다.
- multipart는 기존 `request.parts()` 방식을 유지합니다. CORS 허용 메서드도 기존 명시 설정을 유지합니다. DB 스키마·마이그레이션 변경은 없습니다.

공식 근거: [Fastify 5 마이그레이션](https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/), [Fastify 5.12.7](https://github.com/fastify/fastify/releases/tag/v5.12.7), [multipart 10 변경](https://github.com/fastify/fastify-multipart/releases/tag/v10.0.0).

## 2. 보안

동일 검토 시점의 `pnpm audit` 보고 건수를 비교했습니다. 보고 건수는 실제 서비스에서 재현된 취약점 수가 아닙니다.

| 범위 | Critical | High | Moderate | Low | 합계 |
|---|---:|---:|---:|---:|---:|
| 수정 전 전체 의존성 | 4 | 60 | 51 | 6 | 121 |
| 수정 후 전체 의존성 | 0 | 2 | 3 | 0 | 5 |
| 수정 후 production 의존성 | 0 | 1 | 2 | 0 | 3 |

남은 경고는 아래와 같이 이슈로 분리했습니다. 현재 코드에서 공격 입력이 도달하는 경로를 확인하지 못한 항목도 경고가 해소된 것으로 취급하지 않습니다.

| 경고 | 남아 있는 이유·현재 노출 조건 | 후속 이슈 |
|---|---|---|
| `deepmerge-ts` 7.1.5, High, GHSA-ggr8-5vv4-36mx | Prisma config 의존성. 수정 버전은 8 이상이며 Prisma가 7을 사용합니다. 앱의 직접 사용이나 외부 객체 입력 경로는 발견하지 못했습니다. | [#88](https://github.com/angelos0424/fromistargram/issues/88) |
| `react-router` 6.30.6, Moderate 2건, GHSA-wrjc-x8rr-h8h6 / GHSA-337j-9hxr-rhxg | 수정 버전은 7.18 이상입니다. 현재 앱은 BrowserRouter 기반 SPA이며 SSR hydration을 사용하지 않습니다. 확인한 이동 경로는 내부 경로입니다. 7 전환 시 인증·리다이렉트 회귀 검증이 필요합니다. | [#89](https://github.com/angelos0424/fromistargram/issues/89) |
| `braces` 3.0.3, High, GHSA-vfj7-8cjw-p6xm | 개발·빌드 의존성. 검토 시점 패치 없음. 저장소 밖의 임의 패턴을 빌드 입력으로 받는 기능은 발견하지 못했습니다. | [#90](https://github.com/angelos0424/fromistargram/issues/90) |
| `postcss-selector-parser` 6.1.5, Moderate, GHSA-rj75-hqrm-r3gf | Tailwind 3의 빌드 의존성. 수정 버전 7.1.6 이상은 부모의 허용 범위 밖입니다. 임의 사용자 CSS를 빌드하는 기능은 발견하지 못했습니다. | [#90](https://github.com/angelos0424/fromistargram/issues/90) |

주요 패치 근거: [Axios](https://github.com/axios/axios/security/advisories/GHSA-m8m8-qj5v-23w3), [Vitest](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9), [Vite](https://github.com/vitejs/vite/security/advisories/GHSA-rq7h-c2jc-7f22), [PostCSS](https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp). 잔여 항목의 공지와 완료 조건은 각 이슈에 기록했습니다.

Node 요구 버전은 #87에서 반영한 `^22.23.4 || ^24.22.1 || ^26.12.1`, 기본 런타임은 24.22.1을 유지합니다. 22.22.2는 이번 보안 패치 기준을 충족하지 않습니다. [Node.js 2026년 10월 보안 공지](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)를 참조합니다.

## 3. 디자인 영향

이번 수정은 UI 구조·색상·문구를 변경하지 않습니다. #87의 접근성·반응형 UI 변경을 유지하고, 프론트 테스트와 프로덕션 빌드로 의존성 교체 후 회귀를 검사했습니다. 실제 브라우저·실기기 화면 비교를 추가로 수행한 것은 아닙니다.

## 검증 및 머지 판단

격리한 Node 24.22.1 / pnpm 10.20.0에서 최종 코드와 잠금 파일을 검증했습니다. 전역 Node는 변경하지 않았습니다.

| 검증 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | 통과 |
| Prisma Client 생성 | 통과, 6.19.3 |
| `pnpm -r lint` | 프론트·백엔드 타입 검사 통과 |
| `pnpm -r test --run` | 백엔드 102개 + 프론트 14개, 총 116개 통과 |
| `pnpm -r build` | 프론트·백엔드 통과 |
| `git diff --check` | 통과 |
| GitHub CI | 수정 커밋 푸시 후 Node 22.23.4 / 24.22.1 및 컨테이너 검증 결과를 PR에 기록 |

Fastify의 기존 `disableRequestLogging` 옵션은 6에서 제거 예정이라는 경고를 출력하지만 5에서는 정상 동작합니다. jsdom의 미디어 `load()` 미구현 경고도 테스트 실패를 일으키지 않았습니다.

로컬 재현에서 확인한 머지 차단 문제는 수정했습니다. 최종 머지 판단은 푸시된 동일 커밋의 CI 결과와 잔여 보안 이슈를 함께 확인해야 합니다. #52 자체의 머지나 운영 배포는 이 수정 작업에 포함하지 않았습니다.

배포 시 새 컨테이너 이미지를 빌드하고 #87의 인증 요구 사항인 올바른 `AUTHENTIK_AUDIENCE`를 설정해야 합니다. 운영 DB·인증 제공자와의 실서비스 통합 검증은 수행하지 않았습니다.
