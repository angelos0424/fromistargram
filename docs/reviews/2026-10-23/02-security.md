# 보안 리뷰

검토일: 2026-10-23 (Asia/Seoul) · 기준 커밋: 9fdacb893e287498387a3abf9e5ce38f42ece762 (최신 main)

[범위·검증 결과·우선순위 요약](README.md) · [기능 리뷰](01-functionality.md) · [디자인 개선](03-design.md)

6개 보안 항목입니다. 운영 서비스 공격이나 실사용자 데이터 접근은 수행하지 않았습니다. 합성 JWT, 네트워크 응답 stub, DB mock, 임시 파일로 실제 함수·라우트의 동작을 확인했습니다. 현재 운영 환경에서의 악용 가능성은 각 항목의 조건과 구분해야 합니다.

**최신화 검증:** adc0768 → 9fdacb8 변경분에서 기존 6개 보안 항목의 근거 파일 8개는 모두 동일합니다. 주요 경로를 다시 확인해 SEC-01~06을 유지했습니다. 아래 기존 로컬 재현은 최초 리뷰에서 수행한 결과이며, 새 프로필 경로에는 별도 방어가 있어 동일한 결함으로 확대하지 않았습니다.

## SEC-01 · P1 · 일반 로그인 사용자에게 관리자 API 허용

확신도: 10/10 · 실제 인증 hook 로컬 재현

근거: [backend/src/utils/auth.ts:177](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/utils/auth.ts#L177), [backend/src/utils/auth.ts:138](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/utils/auth.ts#L138), [backend/src/routes/index.ts:26](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/index.ts#L26)

**원인:** requireAdminAuth는 유효한 토큰을 확인한 뒤 `request.user = user`로 종료합니다. 관리자 역할 검사 함수를 호출하지 않습니다.

**성립 조건:** 설정된 issuer가 발급한 유효한 일반 사용자 토큰으로 API에 접근할 수 있는 경우.

**재현·확인:** 테스트용 RSA 키와 JWKS 응답으로 roles=["viewer"]인 JWT를 만들고 실제 hook을 설치한 Fastify 라우트에 주입했습니다. 결과는 200이었습니다. 별도로 hasAdminRole의 `role.includes(adminRole)` 때문에 roles=["not-admin"]도 true임을 확인했습니다.

**영향:** 보호 대상인 공유 미디어 수정·삭제, 수동 업로드, 인덱서·업로드 정리 실행, DB 개요 조회 등이 일반 사용자에게 허용됩니다. 실제로 등록된 관리자 라우트 범위만 영향으로 기재했습니다.

**개선안:** 토큰 검증 후 서버에서 관리자 역할을 정확히 비교하고 권한이 없으면 403을 반환합니다. 사용되지 않던 helper를 연결할 때 부분 문자열 비교도 제거해야 합니다. 요청마다 권한을 확인하는 원칙은 [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)를 참고했습니다.

**완료 기준:** 무토큰 401, viewer 403, not-admin 403, 기대 audience와 정확한 관리자 역할을 가진 토큰만 허용.

## SEC-02 · P1 · 이미지로 위장한 HTML이 실행 가능한 문서로 제공됨

확신도: 9/10 · 실제 업로드·다운로드 응답 재현, 브라우저 실행 미실시

근거: [backend/src/utils/fileUpload.ts:18](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/utils/fileUpload.ts#L18), [backend/src/utils/fileUpload.ts:79](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/utils/fileUpload.ts#L79), [backend/src/routes/registerSharedMediaRoutes.ts:151](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerSharedMediaRoutes.ts#L151), [backend/src/routes/registerMediaRoutes.ts:299](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerMediaRoutes.ts#L299)

**원인:** 클라이언트가 주장한 MIME과 크기만 검사하고 원래 확장자를 보존합니다. 제공 시에는 `lookup(filename)`으로 확장자에 따른 Content-Type을 지정합니다.

**성립 조건:** 공개 업로드 API에 접근할 수 있고 피해자가 업로드 파일의 URL을 문서로 여는 경우. 프론트와 API가 같은 출처인지에 따라 피해 범위가 달라집니다.

**재현·확인:** 임시 저장소와 DB create mock으로 filename=review.html, Content-Type=image/jpeg, 합성 HTML 내용을 업로드했습니다. 업로드 200, 다운로드 200, 저장 확장자 .html, 응답 Content-Type=text/html, 원문 보존을 확인했습니다. 해당 응답에 Content-Disposition과 CSP는 없었습니다. 스크립트 실행·토큰 접근은 하지 않았습니다.

**영향:** 공격자가 API 출처에서 실행 가능한 HTML을 게시하는 저장형 XSS 경로입니다. 프론트와 같은 출처의 기존 로그인 탭에서 열리는 경우 sessionStorage에 저장된 토큰에도 영향이 생길 수 있습니다. API가 별도 출처면 프론트 토큰 접근까지 동일하게 주장할 수 없습니다.

**개선안:** 허용 확장자·MIME·실제 파일 시그니처/디코딩 결과를 함께 검증하고 서버가 확장자를 결정합니다. 지원 가능한 이미지의 재인코딩, 업로드 전용 출처 분리, 안전한 응답 헤더를 함께 검토합니다. Content-Type만 신뢰하지 않는 방어는 [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)를 기준으로 했습니다.

**완료 기준:** MIME·확장자·내용이 불일치한 HTML/SVG를 거부하고, 업로드 미디어 경로에서 실행 가능한 HTML이 inline으로 반환되지 않는지 검증.

## SEC-03 · P1 · 인증 설정이 없으면 운영 모드에서도 인증을 건너뜀

확신도: 10/10 · production 조건의 실제 hook 재현

근거: [backend/src/utils/auth.ts:156](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/utils/auth.ts#L156)

**원인:** AUTHENTIK_ISSUER_URL이 없으면 경고 로그만 남기고 return합니다. NODE_ENV 검사나 명시적인 개발 우회 플래그가 없습니다.

**성립 조건:** 배포 시 해당 설정이 누락되거나 빈 값으로 주입되고 API가 접근 가능한 경우. 실제 운영 환경변수 값은 읽지 않았으므로 현재 배포가 이 상태라고 단정하지 않습니다.

**재현·확인:** NODE_ENV=production, issuer 미설정, Authorization 헤더 없음 조건으로 hook을 실행했을 때 200을 확인했습니다.

**영향:** 이 설정 조건에서는 관리자 API가 익명 접근을 허용합니다. SEC-01의 역할 검사 문제와 별개로 수정해야 합니다.

**개선안:** 운영 필수 인증 설정을 시작 시 검증하고 누락 시 기동을 거부합니다. 개발 우회가 필요하면 명시적 플래그와 개발 환경·loopback 조건으로 제한합니다. 기본 거부 원칙은 [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)를 참고했습니다.

**완료 기준:** 운영 모드에서 issuer 미설정 시 시작 실패 또는 관리자 API 접근 거부. 인증 서버 오류도 접근 허용으로 전환되지 않아야 함.

## SEC-04 · P2 · 수동 업로드의 계정명으로 source 밖에 파일 쓰기 가능

확신도: 10/10 · 실제 라우트 + 격리 임시 경로 재현

근거: [backend/src/routes/registerAdminManualUploadRoutes.ts:120](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerAdminManualUploadRoutes.ts#L120), [backend/src/routes/registerAdminManualUploadRoutes.ts:141](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerAdminManualUploadRoutes.ts#L141), [backend/src/utils/sourceRoot.ts:17](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/utils/sourceRoot.ts#L17)

**원인:** accountId의 존재 여부만 검사하고 `path.resolve(sourceRoot, accountId)`에 전달합니다. 구분자·상위 경로·절대 경로를 차단하지 않습니다.

**성립 조건:** 관리자 수동 업로드 API에 접근할 수 있는 경우. SEC-01/03과 결합하면 접근 가능한 사용자 범위가 확대됩니다.

**재현·확인:** 하나의 임시 디렉터리 아래에 source와 검증 공간을 만들고 accountId="../outside-source"로 요청했습니다. 응답 200과 source 밖 합성 파일 생성을 확인했습니다. 모든 파일은 검증용 임시 공간 안에만 썼습니다.

**영향:** 서버가 쓰기 가능한 source 외부 디렉터리에 미디어·캡션·메타데이터를 만들거나 같은 이름의 파일을 덮어쓸 수 있습니다. 생성 파일명은 타임스탬프 규칙의 제약이 있으므로 임의 이름의 시스템 파일 교체까지 확인된 것은 아닙니다.

**개선안:** 계정 식별자의 허용 문자와 실제 계정 존재 여부를 검사하고, 공통 경로 함수에서 최종 경로가 source 하위인지 검증합니다. 절대 경로와 경로 구분자가 포함된 계정명을 거부합니다.

**완료 기준:** ../escape, 절대 경로, 구분자 포함 계정명을 거부하고 source 외부에 파일이 생기지 않는지 확인.

## SEC-05 · P2 · JWT의 대상 서비스(audience)를 검증하지 않음

확신도: 10/10 · 다른 audience의 합성 토큰 수용 재현

근거: [backend/src/utils/auth.ts:98](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/utils/auth.ts#L98)

**원인:** `jose.jwtVerify(token, jwks, { issuer: issuerUrl })`에 기대 audience를 전달하지 않습니다.

**성립 조건:** 동일 issuer가 서명한 다른 용도의 토큰을 확보할 수 있는 경우. 실제 Authentik 발급 정책·issuer 분리 상태는 확인하지 않았습니다.

**재현·확인:** 동일 합성 issuer, aud="unrelated-api", roles=["admin"]인 서명된 JWT를 실제 hook에 전달하여 200을 확인했습니다.

**영향:** 이 API를 대상으로 발급하지 않은 토큰이 인증에 재사용될 수 있습니다. 관리자 역할 검사만 추가해도 이 문제는 독립적으로 남습니다.

**개선안:** API의 기대 audience를 필수 설정으로 지정하고 jwtVerify에 전달합니다. 사용하는 토큰의 목적·클레임도 실제 발급 정책과 맞춥니다. audience 옵션이 기대 aud를 검증하고 해당 클레임의 존재를 요구하는 것은 [jose 공식 문서](https://github.com/panva/jose/blob/main/docs/jwt/verify/interfaces/JWTVerifyOptions.md#audience)에서 확인했습니다.

**완료 기준:** 잘못된/누락된 audience는 401, 올바른 audience만 다음 권한 검사로 진행.

## SEC-06 · P2 · 공개 업로드가 전체 파일을 검증 전에 메모리에 누적

확신도: 8/10 · 소스와 설치된 multipart 제한 확인, 부하 재현 미실시

근거: [backend/src/routes/registerSharedMediaRoutes.ts:115](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerSharedMediaRoutes.ts#L115), [backend/src/routes/registerSharedMediaRoutes.ts:147](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerSharedMediaRoutes.ts#L147), [backend/src/server.ts:57](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/server.ts#L57)

**원인:** 파일마다 `await part.toBuffer()`를 호출하여 배열에 보관하고 전체 multipart를 읽은 다음 검증합니다. 앱 설정은 파일당 200 MiB이며, 더 작은 요청별 합산 크기·업로드 파일 수·동시성 제한은 없습니다.

**성립 조건:** 공개 업로드 접근이 가능하고 운영 프록시의 별도 제한이 충분하지 않은 경우. 운영 프록시·메모리 한도는 확인하지 않았습니다.

**재현·확인:** 설치된 @fastify/multipart의 기본 parts 제한은 1000으로 확인했습니다. 따라서 완전한 무제한이라고 판단하지는 않았으나, 여러 큰 파일을 버퍼에 누적하는 실행 경로는 확인했습니다. 대량 요청이나 메모리 고갈 실험은 하지 않았습니다.

**영향:** 여러 큰 파일을 포함한 요청이 API 프로세스 메모리를 과도하게 사용하여 응답 지연·프로세스 종료로 이어질 위험이 있습니다.

**개선안:** 요청별 합산 바이트·파일 개수·동시성 한도를 정하고 스트리밍 임시 저장 및 조기 검증으로 바꿉니다. 실패 시 임시파일 정리와 저장 quota도 적용합니다.

**완료 기준:** 작은 fixture와 낮은 테스트 한도로 개수·합산 제한을 검증하고, 동시 요청 시 메모리가 요청 전체 크기에 비례해 누적되지 않는지 별도 환경에서 측정.

## 최신 main의 프로필 사진 업로드에서 확인한 방어

새 `/api/mobile/profile-photo-ingest`는 기존 공개 공유 업로드·관리자 수동 업로드와 다른 경로입니다. 이번 변경에서 추가로 확정한 보안 취약점은 없습니다. 아래는 소스와 추가된 회귀 테스트를 확인한 결과이며 운영 환경의 침투 테스트 결과는 아닙니다.

| 확인 항목 | 근거 | 기존 지적과의 관계 |
|---|---|---|
| 본문 처리 전 모바일 토큰 검사, 미설정 503·불일치 401 | [모바일 인증:322](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerMobileIngestRoutes.ts#L322), [새 라우트:773](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerMobileIngestRoutes.ts#L773) | 관리자 설정 누락 문제 SEC-03과 구분 |
| 파일 1개·30 MiB·필드 2개·전체 part 3개 제한 | [multipart 제한:405](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerMobileIngestRoutes.ts#L405) | 공개 공유 업로드의 누적 문제 SEC-06과 구분 |
| 이미지 시그니처·선언 MIME 일치 검사와 감지 형식에 따른 확장자 | [형식 검사:455](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerMobileIngestRoutes.ts#L455), [확장자:543](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerMobileIngestRoutes.ts#L543) | SEC-02의 HTML 확장자 보존 경로를 그대로 적용할 수 없음 |
| 계정명 제한·실계정 조회·source 실경로 경계 확인 | [실경로 검사:514](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerMobileIngestRoutes.ts#L514), [계정 검사:783](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerMobileIngestRoutes.ts#L783) | 관리자 수동 업로드의 SEC-04는 별도 경로에 남음 |
| 동일 계정·초 단위 프로세스 내 직렬화, 기존 파일 충돌 검사, wx 배타적 생성 | [저장:526](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerMobileIngestRoutes.ts#L526), [배타적 생성:291](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerMobileIngestRoutes.ts#L291) | 관리자 수동 업로드 F-02의 강제 덮어쓰기와 구분 |

프로필 검사도 완전한 이미지 디코딩 검증은 아닙니다. JPEG 등의 접두부만 확인하며, 정상 테스트 fixture도 완전한 이미지가 아닌 합성 바이트입니다. 손상 파일이나 픽셀 크기 검증은 보완할 수 있으나 이 사실만으로 새 XSS·디코더 공격을 확정하지 않았습니다.

도메인 변경은 Imagor·Imagorvideo의 HTTP loader 허용 대상을 단일 HTTPS `.shop`에서 단일 HTTPS `.xyz`로 교체하며 `IMAGOR_UNSAFE: 0`을 유지합니다. 이 변경을 임의 외부 주소 허용 확대라고 판단하지 않았습니다. 근거: [docker-compose.yml:55](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/docker-compose.yml#L55), [docker-compose.yml:77](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/docker-compose.yml#L77).

## 확인 범위와 제외한 주장

- 공개 미디어 읽기 경로의 단순 ../ 순회는 정규화·기준 경로 검사가 있어 확정 취약점으로 보고하지 않았습니다.
- 이미지 프록시는 compose의 HTTP loader 허용 목록까지 확인했으며, 임의 URL SSRF로 단정하지 않았습니다.
- 의존성 CVE 전수 조사, 실제 인증 제공자 정책, 배포 프록시·방화벽·TLS·운영 환경변수, 실제 DB 권한은 검증하지 않았습니다.
- 소스상 공개 업로드 허용 자체는 제품 정책일 수 있으므로 곧바로 인증 누락 결함으로 분류하지 않았습니다. 파일 검증과 자원 제한은 공개 정책 여부와 별도로 필요합니다.

