# 기능 리뷰: 버그와 오류

검토일: 2026-10-23 (Asia/Seoul) · 기준 커밋: 9fdacb893e287498387a3abf9e5ce38f42ece762 (최신 main)

[범위·검증 결과·우선순위 요약](README.md) · [보안 리뷰](02-security.md) · [디자인 개선](03-design.md)

최신 main 반영 외에 서비스 소스에 별도 수정은 하지 않았습니다. 아래 13개는 현재 소스의 실행 경로나 API 계약으로 확인한 항목입니다. 기존 11개를 유지하고, 도메인 전환의 연계 누락(F-12)과 새 프로필 업로드의 계정 ID 불일치(F-13)를 추가했습니다. mock 재현은 실제 DB·배포 환경 검증과 구분했습니다.

**최신화 검증:** 최초 리뷰 adc0768 이후 main 변경 5개 파일을 추가 검토했습니다. 기존 근거 파일 19개 중 모바일 업로드 파일만 변경되어 F-05를 현재 코드로 재확인했고, 나머지 근거 파일은 동일합니다. 이전 mock·브라우저 증거는 해당 코드가 유지되는 범위에서 보존했습니다. F-11은 최신 main에서 테스트를 다시 실행해 확인했습니다.

## F-01 · P1 · 계정이 다른 게시물이 같은 ID로 저장되어 데이터가 뒤섞임

확신도: 10/10 · 실제 스캐너·동기화 함수 + Prisma mock 재현

근거: [backend/src/indexer/fileSystemScanner.ts:277](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/indexer/fileSystemScanner.ts#L277), [backend/src/indexer/fileSystemScanner.ts:318](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/indexer/fileSystemScanner.ts#L318), [backend/prisma/schema.prisma:24](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/prisma/schema.prisma#L24), [backend/src/indexer/indexer.ts:204](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/indexer/indexer.ts#L204)

**원인:** 일반 게시물 ID를 계정 없이 `${timestamp}_UTC`로 만듭니다. 전역 기본키에 upsert하면서 update에는 accountId가 없고, 기존 미디어를 삭제한 뒤 새 미디어를 저장합니다.

**재현·확인:** 서로 다른 두 계정에 동일 초의 일반 게시물을 넣었습니다. 실제 동기화 함수를 mock DB로 실행한 결과 입력 2개가 저장 1개가 되었으며, 소유 계정은 A, 캡션과 미디어는 B의 값이었습니다.

**영향:** 게시물 누락과 계정 간 데이터 오염이 발생합니다. 소유 계정 디렉터리에서 다른 계정의 파일을 찾으면 이미지도 깨집니다.

**개선안:** 계정 ID를 포함한 식별자 또는 (accountId, sourcePostId) 복합키를 사용합니다. 기존 데이터와 상세 URL의 마이그레이션을 함께 설계해야 합니다.

**완료 기준:** 같은 timestamp의 A/B 게시물을 동기화해 두 레코드·캡션·미디어가 각각 유지되는지 검증합니다.

## F-02 · P1 · 관리자 수동 업로드가 이전 원본을 경고 없이 덮어씀

확신도: 10/10 · 실제 라우트 + 임시 파일 재현

근거: [frontend/src/routes/admin/AdminUploadsPage.tsx:17](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/routes/admin/AdminUploadsPage.tsx#L17), [frontend/src/routes/admin/AdminUploadsPage.tsx:118](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/routes/admin/AdminUploadsPage.tsx#L118), [backend/src/routes/registerAdminManualUploadRoutes.ts:153](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerAdminManualUploadRoutes.ts#L153)

**원인:** 프론트 게시시각 기본값이 2026-03-13T12:04:27.000Z로 고정되고 성공 후에도 같은 값으로 돌아갑니다. 서버는 계정·게시시각·순번으로 경로를 만들고 `writeFile(filepath, entry.buffer)`로 덮어씁니다.

**재현·확인:** 같은 계정·기본 시각·확장자로 서로 다른 파일을 두 번 요청했습니다. 두 응답 모두 200이었고 첫 파일의 내용이 두 번째 내용으로 교체됐습니다.

**영향:** 성공 안내만 표시되는 동안 기존 원본이 손실됩니다.

**개선안:** 실제 게시시각을 입력하도록 하고, 기존 파일과 내용이 다르면 기본적으로 충돌(409)을 반환합니다. 배타적 생성 또는 원자적 저장으로 동시 요청도 보호합니다. 교체 기능이 필요하면 명시적인 동작으로 구분합니다.

**완료 기준:** 동일 내용 재업로드의 의도된 정책은 유지하면서, 다른 내용의 중복 경로 요청이 기존 파일을 변경하지 않는지 확인합니다.

## F-03 · P2 · 날짜 필터가 종료일 대부분과 시작일 오전을 누락

확신도: 10/10 · 실제 서비스의 조회 조건 캡처

근거: [frontend/src/components/filter/FiltersPanel.tsx:27](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/components/filter/FiltersPanel.tsx#L27), [backend/src/services/postsService.ts:94](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/services/postsService.ts#L94), [backend/src/services/sharedMediaService.ts:61](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/services/sharedMediaService.ts#L61)

**원인:** 날짜 입력의 YYYY-MM-DD를 `new Date(...)`로 바꾸고 종료 조건을 `lte`로 사용합니다. 날짜만 있는 값은 UTC 00:00이므로 한국 시간으로 09:00이며, 종료일 하루 전체를 포함하지 않습니다.

**재현·확인:** 시작·종료를 모두 2026-10-23으로 지정하면 gte와 lte가 모두 2026-10-23T00:00:00.000Z입니다. 당일 정오 KST(03:00Z)의 게시물이 제외되는 조건을 확인했습니다.

**영향:** 일반 피드·공유 미디어의 날짜 검색 결과가 실제 보관 자료보다 적게 표시됩니다.

**개선안:** 서비스 시간대를 명시하고 날짜 전용 입력을 시작일 00:00 이상, 종료 다음 날 00:00 미만으로 변환합니다. ISO 시각 입력 지원 여부도 API 계약에 명시합니다.

**완료 기준:** KST 기준 시작일 00:00·종료일 23:59:59는 포함하고 다음 날 00:00은 제외합니다.

## F-04 · P2 · 관리자 공유 미디어의 다음 페이지를 불러올 수 없음

확신도: 9/10 · 서버·클라이언트 계약 대조

근거: [frontend/src/routes/admin/AdminUploadsPage.tsx:85](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/routes/admin/AdminUploadsPage.tsx#L85), [frontend/src/lib/api/admin/types.ts:70](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/lib/api/admin/types.ts#L70), [frontend/src/lib/api/admin/sharedMedia.ts:23](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/lib/api/admin/sharedMedia.ts#L23), [backend/src/routes/registerAdminSharedMediaRoutes.ts:188](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerAdminSharedMediaRoutes.ts#L188)

**원인:** 서버는 `{ success, data, meta: { hasMore, nextCursor } }`로 응답하지만 `getNextPageParam`은 `lastPage.nextCursor`를 읽습니다. 프론트 응답 타입도 잘못된 최상위 구조를 선언합니다.

**재현·확인:** 51개 이상일 때 첫 50개 응답에 meta.nextCursor가 있어도 현재 콜백은 undefined를 반환합니다. 브라우저의 관리자 인증 흐름은 재현하지 않았고 데이터 경로를 정적으로 검증했습니다.

**영향:** 더 보기 버튼이 활성화되지 않아 첫 페이지 이후 미디어를 관리할 수 없습니다.

**개선안:** meta.nextCursor를 사용하고 실제 응답 구조에 맞는 타입을 적용합니다. any를 제거해 계약 불일치가 타입 검사에 드러나게 합니다.

**완료 기준:** 51개 이상의 fixture에서 다음 페이지가 열리고 마지막 항목을 조회·수정할 수 있는지 확인합니다.

## F-05 · P2 · 모바일 Story 업로드 성공 링크와 인덱서의 ID가 다름

확신도: 10/10 · 실제 업로드 라우트와 스캐너 연계 재현

근거: [backend/src/routes/registerMobileIngestRoutes.ts:713](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerMobileIngestRoutes.ts#L713), [backend/src/indexer/fileSystemScanner.ts:47](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/indexer/fileSystemScanner.ts#L47), [backend/src/indexer/fileSystemScanner.ts:138](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/indexer/fileSystemScanner.ts#L138)

**원인:** 모바일 업로드는 Story에도 `${timestamp}_UTC` ID를 반환하지만 인덱서는 계정별 KST 날짜로 Story를 묶어 다른 ID를 만듭니다.

**재현·확인:** 최신 main의 실제 모바일 라우트와 스캐너를 합성 Story fixture로 다시 실행했습니다. 업로드 응답은 2026-10-23_03-00-00_UTC였고 스캐너 결과는 2026-10-23_KST_story_review_fixture였습니다. 응답 archiveUrl도 잘못된 응답 postId를 사용합니다. 최초 리뷰 이후에도 동일하게 남아 있습니다.

**영향:** 성공 응답의 archiveUrl이 인덱싱 완료 후에도 실제 게시물을 가리키지 않습니다.

**개선안:** Story 그룹 ID 생성 함수를 업로드와 인덱서가 공유하거나 실제 인덱싱 결과의 식별자를 반환합니다.

**완료 기준:** Story 업로드 응답의 postId가 인덱싱 결과 및 상세 조회 ID와 일치하는지, KST 자정 전후를 포함해 검증합니다.

## F-06 · P2 · 검색이 현재 페이지에만 적용되어 존재하는 자료를 없다고 표시

확신도: 10/10 · 실제 프론트 + 로컬 fixture 브라우저 재현

근거: [frontend/src/routes/FeedPage.tsx:126](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/routes/FeedPage.tsx#L126), [frontend/src/routes/FeedPage.tsx:198](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/routes/FeedPage.tsx#L198), [frontend/src/routes/FeedPage.tsx:221](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/routes/FeedPage.tsx#L221), [frontend/src/routes/FeedPage.tsx:243](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/routes/FeedPage.tsx#L243)

**원인:** 검색어를 API에 전달하지 않고 이미 받은 현재 페이지 배열에만 filter를 적용합니다. 상단 총 개수는 현재 검색 결과 수로 바뀌지만 하단 페이지 수는 전체 자료 기준입니다.

**재현·확인:** 합성 게시물 24개 중 13번째에만 있는 검색어를 입력했습니다. 1페이지에서는 총 0개·게시물 없음, 다음 페이지에서는 같은 검색어로 총 1개가 표시됐습니다. 하단은 계속 총 24개였습니다.

**영향:** 사용자가 자료가 없다고 오인하고, 검색 결과 수와 페이지 안내가 모순됩니다.

**개선안:** 서버에서 검색과 count를 같은 조건으로 처리하고 검색어 변경 시 첫 페이지로 이동합니다. 현재 페이지 내 검색이 의도라면 입력명과 개수 안내에 그 범위를 명시해야 합니다.

**완료 기준:** 다른 페이지에 있는 검색 대상도 첫 검색 결과에 나타나며 총 개수·페이지 수가 동일한 조건을 사용하는지 확인합니다.

증거: [1페이지 검색 결과 없음](evidence/search-page1-empty.jpg), [같은 검색어의 2페이지 결과](evidence/search-page2-result.jpg).

## F-07 · P2 · 업로드의 파일 추가가 기존 선택을 교체함

확신도: 9/10 · 이벤트·상태 변경 경로 확인

근거: [frontend/src/components/common/upload/PreviewGrid.tsx:50](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/components/common/upload/PreviewGrid.tsx#L50), [frontend/src/components/common/UploadModal.tsx:47](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/components/common/UploadModal.tsx#L47)

**원인:** “파일 추가”도 동일한 파일 선택기를 열고, 변경 이벤트는 기존 배열을 합치지 않고 `setFiles(selectedFiles)`와 새 미리보기 배열로 교체합니다.

**재현·확인:** 파일 A 선택 후 “파일 추가”에서 B를 선택하면 제출 배열은 [B]가 됩니다. 이는 소스 경로 확인 결과이며 실제 OS 파일 선택기는 조작하지 않았습니다.

**영향:** 여러 번 나누어 선택한 자료 중 먼저 선택한 파일이 업로드 대상에서 사라집니다.

**개선안:** 추가 선택은 기존 파일과 합치고 중복 처리 규칙을 정합니다. 선택기를 취소했을 때 기존 선택을 유지합니다. 미리보기 URL은 제거되는 파일만 해제하도록 수명을 관리합니다.

**완료 기준:** A 선택 → B 추가 → [A, B] 유지, B 제거 → A 유지, 선택 취소 → 기존 상태 유지.

## F-08 · P2 · 공유 미디어 API 장애를 빈 보관함으로 표시

확신도: 10/10 · HTTP 503 fixture 브라우저 재현

근거: [frontend/src/routes/FeedPage.tsx:147](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/routes/FeedPage.tsx#L147), [frontend/src/routes/FeedPage.tsx:165](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/routes/FeedPage.tsx#L165), [frontend/src/routes/FeedPage.tsx:401](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/routes/FeedPage.tsx#L401)

**원인:** 공유 목록 useQuery에서 error를 받지 않고 undefined 데이터를 빈 배열로 바꿉니다. 일반 피드의 오류 분기와 달리 Shared 경로에는 오류 화면이 없습니다.

**재현·확인:** 로컬 /api/shared가 503을 반환하도록 했습니다. 재시도가 끝난 뒤 “아직 업로드된 미디어가 없습니다”와 “첫 미디어를 추가해보세요”가 표시됐습니다.

**영향:** 일시적인 장애를 데이터 부재로 오인하고 재시도할 방법이 없습니다.

**개선안:** 오류·로딩·성공한 빈 결과를 구분하고 재시도 버튼을 제공합니다. 계정 조회·상세 조회도 같은 상태 규칙을 점검합니다.

**완료 기준:** 503에는 오류와 재시도, 200 빈 배열에만 빈 상태가 표시되는지 확인합니다.

증거: [503을 빈 목록으로 표시한 화면](evidence/shared-api-error-as-empty.jpg).

## F-09 · P3 · 계정 API의 게시물 수가 항상 0

확신도: 10/10 · 실제 서비스 + mock 재현

근거: [backend/src/services/accountsService.ts:86](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/services/accountsService.ts#L86), [backend/src/services/accountsService.ts:127](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/services/accountsService.ts#L127), [backend/src/services/accountsService.ts:186](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/services/accountsService.ts#L186)

**원인:** _count.posts를 조회하지만 반환값은 미조회 관계인 `account.posts?.length ?? 0`을 사용합니다.

**재현·확인:** _count.posts=7인 fixture로 목록·상세 함수를 실행해 두 응답 모두 postCount=0을 확인했습니다.

**영향:** API 소비자에게 잘못된 통계가 전달됩니다. 현재 프론트에서 이 값을 직접 표시하는 경로는 확인되지 않아 P3으로 분류했습니다.

**개선안:** 조회한 _count.posts를 반환하고 타입도 실제 조회 결과에 맞춥니다.

**완료 기준:** 목록·상세 API 모두 실제 게시물 수를 반환하는지 검증합니다.

## F-10 · P3 · 원본 링크 복사가 썸네일 주소를 복사

확신도: 9/10 · 버튼과 handler 대조

근거: [frontend/src/components/shared/SharedMediaModal.tsx:120](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/components/shared/SharedMediaModal.tsx#L120), [frontend/src/components/shared/SharedMediaModal.tsx:244](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/components/shared/SharedMediaModal.tsx#L244)

**원인:** 버튼은 “원본 링크 복사”지만 `thumbnailUrl ?? mediaUrl`을 복사합니다.

**재현·확인:** thumbnailUrl이 존재하는 미디어를 선택하면 원본 대신 이미지 변환 주소가 선택됩니다. 동영상에도 같은 코드가 적용됩니다.

**영향:** 동영상을 공유하려는 사용자에게 정지 썸네일 링크가 전달될 수 있습니다.

**개선안:** 원본 링크에는 activeMedia.mediaUrl을 사용하고 썸네일 공유를 별도 제공하려면 명칭을 구분합니다.

**완료 기준:** 이미지·동영상 각각에서 복사된 주소가 실제 원본 mediaUrl인지 확인합니다.

## F-11 · P3 · 페이지네이션 테스트가 현재 DOM 구조와 불일치

확신도: 10/10 · 기존 테스트 실행 실패

근거: [frontend/src/components/feed/__tests__/Pagination.test.tsx:12](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/components/feed/__tests__/Pagination.test.tsx#L12), [frontend/src/components/feed/Pagination.tsx:18](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/components/feed/Pagination.tsx#L18)

**원인:** 전체 문장을 getByText로 찾지만 숫자는 b 자식 요소로 나뉘어 있습니다. 기존 assertion이 표시 문구를 찾지 못합니다.

**재현·확인:** `rtk proxy pnpm -r test --run`에서 Pagination의 첫 테스트가 실패했습니다. 프론트 4개 통과·1개 실패, obsolete snapshot 1개가 함께 보고됐습니다.

**영향:** 현재 테스트 명령이 실패하여 회귀 검증 기준이 깨져 있습니다. 이 실패만으로 실제 페이지 이동 기능이 잘못됐다고 판단하지 않습니다.

**개선안:** 요약 컨테이너의 textContent나 의미 있는 역할 기준으로 확인하고, 의도된 UI를 검토한 뒤 스냅샷을 갱신합니다.

**완료 기준:** 이전·다음 비활성화와 페이지 변경 검증을 유지한 상태에서 프론트 테스트 전체 통과.

## F-12 · P3 · 새 도메인과 크롤러·배포 안내의 주소가 불일치

확신도: 9/10 · 소스와 최신 빌드의 정적 파일 확인

근거: [frontend/src/lib/utils/image.ts:1](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/lib/utils/image.ts#L1), [docker-compose.yml:55](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/docker-compose.yml#L55), [frontend/public/robots.txt:3](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/public/robots.txt#L3), [frontend/public/sitemap.xml:4](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/public/sitemap.xml#L4), [README.md:3](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/README.md#L3)

**원인:** 썸네일과 HTTP loader 허용 주소는 fromistargram.ddunddun.xyz로 바뀌었지만 robots.txt와 sitemap.xml은 fromistargram.com을 가리키고 배포 가이드 링크는 옛 .shop 주소입니다. 이 주소 잔존은 기존 누락이며, 이번 도메인 변경의 영향 범위를 확인하면서 추가 발견했습니다.

**재현·확인:** 최신 main에서 빌드한 dist/robots.txt와 dist/sitemap.xml에도 fromistargram.com이 그대로 남는 것을 확인했습니다. 외부 도메인의 DNS·리다이렉트·검색 색인 상태는 조회하지 않았습니다.

**영향:** 이 정적 파일을 새 도메인에 배포하면 크롤러용 안내와 사이트 목록이 다른 도메인을 지목하고, 배포 문서 이용자는 이전 주소로 이동합니다. 실제 검색 노출 감소까지 실측한 것은 아닙니다.

**개선안:** 대표 사이트 주소를 기준으로 robots·sitemap·배포 문서를 함께 갱신하고, 환경별 주소를 한 곳에서 관리합니다. SeoHead의 기본 주소도 함께 점검하되, 현재 FeedPage는 실제 페이지 URL을 넘기므로 모든 canonical이 이전 주소라고 판단하지 않았습니다.

**완료 기준:** 생성된 정적 파일과 배포 안내가 의도한 대표 도메인을 일관되게 사용하며, 이전 주소를 유지할 곳은 리다이렉트 정책이 명시되어야 합니다.

## F-13 · P2 · 대문자가 포함된 기존 계정의 프로필 사진 업로드가 404

확신도: 10/10 · 계정 등록 계약 확인 + 최신 라우트의 로컬 mock 재현

근거: [frontend/src/routes/admin/AdminDatabasePage.tsx:165](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/routes/admin/AdminDatabasePage.tsx#L165), [backend/src/services/accountsService.ts:40](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/services/accountsService.ts#L40), [backend/src/services/accountsService.ts:198](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/services/accountsService.ts#L198), [backend/src/indexer/fileSystemScanner.ts:412](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/indexer/fileSystemScanner.ts#L412), [backend/src/routes/registerMobileIngestRoutes.ts:105](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerMobileIngestRoutes.ts#L105), [backend/src/routes/registerMobileIngestRoutes.ts:427](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerMobileIngestRoutes.ts#L427), [backend/src/routes/registerMobileIngestRoutes.ts:798](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerMobileIngestRoutes.ts#L798)

**원인:** 관리자 계정 등록은 대문자를 허용하고 그대로 저장하며 인덱서도 디렉터리 이름을 계정 ID로 보존합니다. 새 프로필 업로드는 accountName을 소문자로 변환한 뒤 정확한 ID로 조회합니다.

**재현·확인:** 기존 계정이 MixedCase인 합성 DB fixture에서 같은 MixedCase로 실제 /api/mobile/profile-photo-ingest에 요청했습니다. 라우트가 mixedcase를 조회하여 404를 반환하는 것을 확인했습니다. 실제 운영에 대문자 계정이 있는지는 확인하지 않았습니다.

**영향:** 지원되는 등록 경로로 만든 대문자 포함 계정에 프로필 사진을 올릴 수 없습니다. 모두 소문자인 계정에서는 이 조건이 발생하지 않습니다.

**개선안:** 생성·인덱싱·조회·업로드의 계정 ID 정규화 규칙을 통일합니다. 기존 ID를 보존한다면 정확한 ID를 우선 조회하고, 소문자로 통일한다면 기존 DB와 파일 경로의 마이그레이션·충돌 처리도 함께 설계합니다.

**완료 기준:** 관리자에서 등록하거나 인덱싱한 대문자 포함 계정에 동일 ID로 프로필 사진을 요청하면 해당 계정에 정상 반영되어야 합니다.

