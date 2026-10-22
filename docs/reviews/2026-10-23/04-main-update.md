# 최신 main 반영 및 리뷰 갱신 기록

확인일: **2026-10-23 (Asia/Seoul)**  
이전 리뷰 기준: **adc0768b6778255850720f5fb5cb1635791908d1**  
최신 리뷰 기준: **9fdacb893e287498387a3abf9e5ce38f42ece762**  
최종 상태: **로컬 main = origin/main = 원격 main**

## 최신화 결과와 비교 기준

원격 main을 fetch한 결과, 이전 리뷰 브랜치 `codex/fix-indexer-post-delete-fk`는 원격보다 8개 커밋 뒤에 있었고 브랜치 고유의 추가 커밋은 없었습니다. 로컬 main은 `ca890ee`로 원격보다 12개 커밋 뒤에 있었습니다. main으로 전환한 뒤 `git merge --ff-only origin/main`으로 최신화했습니다.

리뷰 갱신의 비교 범위는 **이전 리뷰 HEAD adc0768 → 최신 main 9fdacb8**입니다. 이 구간의 변경은 **5개 파일·672줄 추가·4줄 삭제**입니다. 로컬 main 자체의 최신화에서 출력된 9개 변경 파일과는 비교 시작점이 다릅니다. 최초 리뷰에서 이미 확인한 변경을 새 변경으로 중복 계산하지 않았습니다.

원격 `refs/heads/main`을 다시 조회해 같은 커밋임을 확인했습니다. 아래 기록은 이 확인 시점의 스냅샷입니다. 기존 리뷰 문서를 보존했으며 별도 서비스 코드 수정·커밋·푸시는 하지 않았습니다.

## 변경 파일별 검토

| 파일 | 변경량 | 변경 내용 | 리뷰 결과 |
|---|---:|---|---|
| [registerMobileIngestRoutes.ts](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerMobileIngestRoutes.ts) | +283 / -1 | 모바일 프로필 사진 업로드, 이미지 형식·경로·크기 검증, 충돌·재시도 처리 | 대문자 포함 기존 계정 조회 실패를 F-13으로 추가. 기존 Story 응답 ID 불일치 F-05도 최신 라우트로 재현 |
| [registerMobileIngestRoutes.test.ts](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerMobileIngestRoutes.test.ts) | +359 / -0 | 프로필 업로드 회귀 테스트 11개 | 인증, 파일·필드 제한, 형식, 계정·경로, 멱등성·충돌·동시 요청·기존 확장자 처리 확인. 11개 모두 통과 |
| [fileSystemScanner.test.ts](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/indexer/fileSystemScanner.test.ts) | +27 / -0 | 프로필 사진 파일을 게시물로 만들지 않는 테스트 1개 | 프로필 사진만 인식하고 게시물 목록이 비어 있는지 검증. 통과 |
| [docker-compose.yml](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/docker-compose.yml#L55) | +2 / -2 | Imagor·Imagorvideo HTTP loader 허용 주소를 .shop에서 .xyz로 변경 | 단일 HTTPS 호스트 제한 유지. 도메인 관련 정적 파일·배포 문서의 불일치를 F-12로 추가 |
| [frontend/src/lib/utils/image.ts](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/frontend/src/lib/utils/image.ts#L1) | +1 / -1 | 미디어 주소의 도메인을 .xyz로 변경 | UI 구조·스타일 변경 없음. robots·sitemap·배포 문서와 주소 일관성 확인 필요 |

이 구간에는 Story 날짜별 그룹화와 인덱서 삭제 오류 수정의 병합 커밋도 있습니다. 해당 내용은 이전 리뷰 HEAD에 이미 포함되어 있어 위 5개 파일 외의 새로운 내용 차이로 나타나지 않습니다.

## 리뷰 항목의 갱신

| 분류 | 이전 | 최신 | 갱신 내용 |
|---|---:|---:|---|
| 기능·버그·오류 | 11 | 13 | F-12·F-13 추가. F-05의 코드 위치와 재현 기록 갱신 |
| 보안 | 6 | 6 | 기존 항목 유지. 새 프로필 업로드에 추가된 방어를 별도로 기록 |
| 디자인·UX·접근성 | 9 | 9 | 근거 UI 소스가 동일하여 유지. 기존 화면 증거의 촬영 기준 명시 |
| 전체 | 26 | 28 | 조건부 위험과 디자인 제안도 포함한 리뷰 항목 수 |

**F-13 · P2 — 대문자 포함 기존 계정의 프로필 업로드 실패.** 기존 등록·인덱싱은 계정 ID의 대문자를 보존하지만 새 업로드는 소문자로 바꾼 뒤 조회합니다. 합성 DB에 `MixedCase`를 두고 같은 계정명으로 실제 라우트에 요청하면 `mixedcase`를 조회해 404를 반환했습니다. 운영에 해당 계정이 있는지는 확인하지 않았습니다. [상세 기능 리뷰](01-functionality.md)

**F-12 · P3 — 도메인 관련 파일의 불일치.** 썸네일·HTTP loader 주소는 `.xyz`지만 robots.txt·sitemap.xml에는 `fromistargram.com`, 배포 가이드에는 이전 `.shop`이 남아 있습니다. 오래된 주소는 기존 누락이며 이번 변경의 영향 범위를 검토하면서 발견했습니다. 최신 빌드 산출물에서도 확인했고 외부 DNS·리다이렉트·검색 노출은 검증하지 않았습니다. [상세 기능 리뷰](01-functionality.md)

**F-05 · P2 — 기존 Story 응답 ID 불일치 유지.** 최신 실제 라우트와 인덱서를 함께 실행한 격리 검증에서 응답 ID는 `2026-10-23_03-00-00_UTC`, 스캐너 ID는 `2026-10-23_KST_story_review_fixture`로 달랐습니다. 이동한 근거 위치를 [registerMobileIngestRoutes.ts:713](https://github.com/angelos0424/fromistargram/blob/9fdacb893e287498387a3abf9e5ce38f42ece762/backend/src/routes/registerMobileIngestRoutes.ts#L713)으로 갱신했습니다.

기존 기능 문서의 근거 소스 19개 중 변경된 파일은 모바일 업로드 라우트 하나입니다. 보안 문서의 기존 근거 소스 8개, 디자인 문서의 근거 소스 8개는 변경되지 않았습니다. 따라서 기존 항목을 유지하되, 이전 실행 증거를 이번에 모두 다시 실행한 것처럼 표시하지 않았습니다.

## 새 프로필 업로드의 보안 검토

본문 처리 전 모바일 토큰 검사, 파일 1개·30 MiB 제한, 이미지 시그니처와 MIME 일치 검사, 서버가 선택하는 확장자, 실계정·실경로 검사, 동일 계정·초 단위의 프로세스 내 쓰기 직렬화, 충돌 검사와 배타적 파일 생성을 확인했습니다. 새 라우트에서 추가로 확정한 보안 취약점은 없습니다.

이 검증은 기존 공개 공유 업로드와 관리자 수동 업로드의 문제를 해결하지 않습니다. 기존 SEC-01~SEC-06은 해당 라우트와 인증 코드에 그대로 남아 있습니다. 이미지 시그니처 검사는 완전한 이미지 디코딩 검증이 아니며, 병렬 쓰기 테스트는 동일 프로세스 범위입니다. [보안 상세 및 근거](02-security.md)

## 최신 main에서 실행한 검증

| 검증 | 결과 |
|---|---|
| `rtk proxy pnpm -r lint` | 프론트·백엔드 타입 검사 통과 |
| `rtk proxy pnpm -r build` | 프론트·백엔드 빌드 통과 |
| `rtk proxy pnpm -r test --run` | 백엔드 9개 파일·37개 테스트 모두 통과. 프론트 4개 통과·1개 실패로 전체 명령 종료 코드 1 |
| 기존 프론트 실패 | Pagination.test.tsx:12에서 숫자가 자식 요소로 나뉜 문구를 getByText로 찾지 못함. F-11 유지 |
| 격리 추가 검증 2개 | F-05 Story ID 불일치, F-13 대문자 계정 조회 실패를 실제 모듈과 mock DB로 재현 |
| 빌드 정적 파일 | dist/robots.txt·dist/sitemap.xml에 다른 도메인 잔존 확인 |
| Git 상태 | 최신화 후 main과 origin/main 차이 0개. 원격 main도 같은 SHA 확인 |

환경은 Node v26.5.0, pnpm 10.20.0입니다. 백엔드 테스트는 최초 리뷰 25개에서 12개 늘었습니다. 위 격리 검증 2개는 프로젝트의 37개 테스트와 별개이며, 임시 테스트·fixture·캐시는 검증 후 정리했습니다.

최초 리뷰의 브라우저 화면은 adc0768에서 로컬 합성 데이터로 촬영한 자료입니다. 해당 UI 소스가 동일함을 확인해 보존했고 이번에 다시 촬영하지 않았습니다. 실제 운영 데이터·운영 인증 제공자·배포 환경을 대상으로 검증하지 않았습니다.

## 갱신 문서

- [리뷰 요약과 우선순위](README.md)
- [기능·버그·오류](01-functionality.md)
- [보안](02-security.md)
- [디자인 개선](03-design.md)
