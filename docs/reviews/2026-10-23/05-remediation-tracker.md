# 리뷰 후속 작업

리뷰 문서 PR: [#57](https://github.com/angelos0424/fromistargram/pull/57), main 병합 확인(`4f83443`). 수정 PR: [#87](https://github.com/angelos0424/fromistargram/pull/87). 기존 리뷰 28개와 추가 Node 보안 점검 1개를 이슈로 등록했습니다. 우선순위별 수정 상태와 검증을 아래에 기록했습니다. 최신 CI·병합 상태는 수정 PR에서 확인할 수 있습니다.

| 우선순위 | 리뷰 ID | 이슈 | 작업 | 상태 |
|---|---|---|---|---|
| P1 | SEC-01 | [#58](https://github.com/angelos0424/fromistargram/issues/58) | 일반 로그인 사용자에게 관리자 API 허용 | 구현·검증 완료 |
| P1 | SEC-02 | [#59](https://github.com/angelos0424/fromistargram/issues/59) | 이미지로 위장한 HTML이 실행 가능한 문서로 제공됨 | 구현·검증 완료 |
| P1 | SEC-03 | [#60](https://github.com/angelos0424/fromistargram/issues/60) | 인증 설정이 없으면 운영 모드에서도 인증을 건너뜀 | 구현·검증 완료 |
| P1 | SEC-07 | [#61](https://github.com/angelos0424/fromistargram/issues/61) | Node 보안 패치 적용 및 지원 종료 Node 20 교체 | 구현·검증 완료 |
| P1 | F-01 | [#62](https://github.com/angelos0424/fromistargram/issues/62) | 계정이 다른 게시물이 같은 ID로 저장되어 데이터가 뒤섞임 | 구현·검증 완료 |
| P1 | F-02 | [#63](https://github.com/angelos0424/fromistargram/issues/63) | 관리자 수동 업로드가 이전 원본을 경고 없이 덮어씀 | 구현·검증 완료 |
| P2 | SEC-04 | [#64](https://github.com/angelos0424/fromistargram/issues/64) | 수동 업로드의 계정명으로 source 밖에 파일 쓰기 가능 | 구현·검증 완료 |
| P2 | SEC-05 | [#65](https://github.com/angelos0424/fromistargram/issues/65) | JWT의 대상 서비스(audience)를 검증하지 않음 | 구현·검증 완료 |
| P2 | SEC-06 | [#66](https://github.com/angelos0424/fromistargram/issues/66) | 공개 업로드가 전체 파일을 검증 전에 메모리에 누적 | 구현·검증 완료 |
| P2 | F-03 | [#67](https://github.com/angelos0424/fromistargram/issues/67) | 날짜 필터가 종료일 대부분과 시작일 오전을 누락 | 구현·검증 완료 |
| P2 | F-04 | [#68](https://github.com/angelos0424/fromistargram/issues/68) | 관리자 공유 미디어의 다음 페이지를 불러올 수 없음 | 구현·검증 완료 |
| P2 | F-05 | [#69](https://github.com/angelos0424/fromistargram/issues/69) | 모바일 Story 업로드 성공 링크와 인덱서의 ID가 다름 | 구현·검증 완료 |
| P2 | F-06 | [#70](https://github.com/angelos0424/fromistargram/issues/70) | 검색이 현재 페이지에만 적용되어 존재하는 자료를 없다고 표시 | 구현·검증 완료 |
| P2 | F-07 | [#71](https://github.com/angelos0424/fromistargram/issues/71) | 업로드의 파일 추가가 기존 선택을 교체함 | 구현·검증 완료 |
| P2 | F-08 | [#72](https://github.com/angelos0424/fromistargram/issues/72) | 공유 미디어 API 장애를 빈 보관함으로 표시 | 구현·검증 완료 |
| P2 | F-13 | [#73](https://github.com/angelos0424/fromistargram/issues/73) | 대문자가 포함된 기존 계정의 프로필 사진 업로드가 404 | 구현·검증 완료 |
| P2 | D-01 | [#74](https://github.com/angelos0424/fromistargram/issues/74) | 업로드 모달의 제목·닫기 버튼이 화면 위로 잘림 | 구현·검증 완료 |
| P2 | D-02 | [#75](https://github.com/angelos0424/fromistargram/issues/75) | 업로드 모달의 키보드·스크린리더 동작 누락 | 구현·검증 완료 |
| P2 | D-03 | [#76](https://github.com/angelos0424/fromistargram/issues/76) | 중첩 모달에서 부모의 키보드 처리와 충돌 | 구현·검증 완료 |
| P2 | D-04 | [#77](https://github.com/angelos0424/fromistargram/issues/77) | 파스텔 버튼 위 흰 글자의 대비 부족 | 구현·검증 완료 |
| P2 | D-05 | [#78](https://github.com/angelos0424/fromistargram/issues/78) | 선택 상태·입력 이름·포커스 표시가 충분하지 않음 | 구현·검증 완료 |
| P2 | D-06 | [#79](https://github.com/angelos0424/fromistargram/issues/79) | 파일 삭제 버튼이 hover에만 보임 | 구현·검증 완료 |
| P2 | D-07 | [#80](https://github.com/angelos0424/fromistargram/issues/80) | 관리자 레이아웃의 모바일 전환 필요 | 구현·검증 완료 |
| P3 | F-09 | [#81](https://github.com/angelos0424/fromistargram/issues/81) | 계정 API의 게시물 수가 항상 0 | 구현·검증 완료 |
| P3 | F-10 | [#82](https://github.com/angelos0424/fromistargram/issues/82) | 원본 링크 복사가 썸네일 주소를 복사 | 구현·검증 완료 |
| P3 | F-11 | [#83](https://github.com/angelos0424/fromistargram/issues/83) | 페이지네이션 테스트가 현재 DOM 구조와 불일치 | 구현·검증 완료 |
| P3 | F-12 | [#84](https://github.com/angelos0424/fromistargram/issues/84) | 새 도메인과 크롤러·배포 안내의 주소가 불일치 | 구현·검증 완료 |
| P3 | D-08 | [#85](https://github.com/angelos0424/fromistargram/issues/85) | 고정 헤더의 밀도를 줄여 자료를 볼 공간 확보 | 구현·검증 완료 |
| P3 | D-09 | [#86](https://github.com/angelos0424/fromistargram/issues/86) | 분류명과 공통 UI 규칙 정리 | 구현·검증 완료 |

P1 6개 → P2 17개 → P3 6개 순으로 수정했습니다. D-08·D-09는 선택적 사용성 개선이고 D-07은 정적 검토에서 나온 반응형 후보였음을 이슈에도 보존했습니다.

이슈는 수정 PR이 검토·병합되기 전까지 열어 둡니다. 원격 업로드·PR 생성은 배포 완료를 뜻하지 않습니다.

구현·검증 및 배포 전 확인사항: [수정 결과](07-remediation-results.md). 이슈 자동 종료는 수정 PR의 main 병합 시점에 처리합니다.
