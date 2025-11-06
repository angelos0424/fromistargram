# 📘 Instagram Crawler Viewer — Developer Prompt (v1)

본 문서는 Instagram 크롤링 데이터를 기반으로 **다중 계정 뷰어 웹서비스**를 구현하기 위한 개발 지시서이다.  
구현자는 여기 명세를 그대로 따라 시스템을 구축한다.

---

# ✅ 1. 프로젝트 개요

## 목적
`instaloader`로 수집한 **로컬 파일 기반 크롤링 데이터**를 대상으로  
여러 Instagram 계정을 한곳에서 조회할 수 있는 웹 뷰어를 구축한다.

- 각 계정별 게시물 목록 제공
- 게시물 상세에서 이미지/동영상 캐러셀 제공
- 본문/해시태그 표시
- 프로필 이미지 히스토리 제공
- 날짜 기반 필터
- 페이지네이션 기반 탐색
- 썸네일 서버 도입으로 고품질/최적화된 이미지 제공

---

# ✅ 2. 전체 시스템 구성도
```text
+------------------------+
|      Frontend (SPA)    |
|   React / Tailwind     |
|------------------------|
| Profile Strip / Filter |
| Feed (pagination)      |
| Post Modal             |
+------------+-----------+
             |
             v
+------------------------+    +----------------------+
|        API Server      |    |     Thumbnail        |
|  Node.js (Fastify)     |    |   Server (imgproxy)  |
|------------------------|    |----------------------|
|  - Accounts API        |    | - Resize / WebP/AVIF |
|  - Posts API           |    | - Cache-Control      |
|  - Profile gallery     |    |                      |
|  - Media file serving  |    +----------------------+
|  - DB sync/indexing    |
+------------+-----------+
             |
             v
+------------------------+
|        Postgres        |
|------------------------|
| accounts               |
| posts                  |
| media                  |
| profile_pics           |
| tags / post_tags       |
+------------+-----------+
             |
             v
+-------------------------+
|    Crawler (Python)     |
|  instaloader 기반       |
|-------------------------|
| /root/{account}/...     |
| profile_pic files       |
| post media + txt        |
+-------------------------+
```
---

# ✅ 3. 데이터 구조
## 3.1 파일 시스템 구조

```
/root/<account>/
  2025-11-02_19-30-52_UTC_profile_pic.jpg
  2025-11-02_19-40-12_UTC_1.jpg
  2025-11-02_19-40-12_UTC_2.mp4
  2025-11-02_19-40-12_UTC.txt
  ...
```

### 규칙
- `<timestamp>_UTC_{n}.jpg|mp4` → 게시물 미디어
- `<timestamp>_UTC.txt` → 본문
- `<timestamp>_UTC_profile_pic.jpg` → 프로필 이미지 히스토리  
- JSON 메타는 **사용하지 않음**

---

# ✅ 4. 백엔드(DB) 스키마

## accounts
- id (PK)
- latest_profile_pic_url
- created_at
- updated_at

## posts
- id (`YYYY-MM-DD_HH-mm-ss_UTC`)
- account_id FK
- posted_at
- caption
- has_text
- created_at

## media
- id PK
- post_id FK
- order_index
- filename
- mime
- width/height/duration (nullable)

## profile_pics
- id PK
- account_id FK
- taken_at
- filename

## tags / post_tags
- 단방향 Many-to-Many  
- caption에서 해시태그 파싱

---

# ✅ 5. API 명세

## 5.1 Accounts 관련

### GET /api/accounts
```json
{
  "items": [
    { "account": "aaa", "latestProfileUrl": "/thumb/w80/...jpg" },
    { "account": "bbb", "latestProfileUrl": "/thumb/w80/...jpg" }
  ]
}
```

### GET /api/profile/:account
```json
{
  "account": "aaa",
  "profiles": [
    { "url": "...jpg", "timestamp": "2025-11-02T19:30:52Z" }
  ]
}
```

---

## 5.2 Posts API

### GET /api/posts
- 페이징: 키셋 기반  
- 필터: account[], date_from, date_to

```json
{
  "items": [
    {
      "id": "2025-11-02_19-40-12_UTC",
      "account": "aaa",
      "postedAt": "2025-11-02T19:40:12Z",
      "thumbnail": "/thumb/w360/aaa/2025-11-02_19-40-12_UTC_1.jpg",
      "captionExcerpt": "본문 요약...",
      "tags": ["여행", "서울"]
    }
  ],
  "nextCursor": "...."
}
```

### GET /api/posts/:account/:postId
- 게시물 상세
```json
{
  "id": "...",
  "account": "aaa",
  "postedAt": "2025-11-02T19:40:12Z",
  "caption": "...전체본문...",
  "tags": ["여행"],
  "media": [
    { "order": 1, "type": "image", "url": "/media/aaa/..._1.jpg" },
    { "order": 2, "type": "video", "url": "/media/aaa/..._2.mp4" }
  ]
}
```

---

## 5.3 Media API
### GET /media/:account/:filename
- 이미지/동영상 원본 파일 서빙  
- Range 지원

---

# ✅ 6. 썸네일 서버
- 서비스명: thumb
- 추천: imgproxy, 성능 우수 / 캐싱 자동화
## URL 패턴
```text
/thumb/w{width}/{account}/{filename}
```
- 출력 포맷:
  - WebP / AVIF 우선 
  - JPG 폴백 
  - 강 캐시: Cache-Control: public, max-age=31536000, immutable
- 주요 프리셋
  - 프로필 스트립: w=80
  - 피드 카드: w=360
  - 미디어 상세: w=1080
---

# ✅ 7. 프런트엔드(UI) 요구사항

프런트엔드는 React 기반 SPA(Single Page Application)으로 작성한다.  
React Router, React Query, Tailwind CSS 사용을 명시한다.

---

## 7.1 전체 구조

### 공통 기술 스택
- React 18+
- React Router
- React Query
- Tailwind
- Axios 또는 Fetch
- IntersectionObserver(필요 시)
- TypeScript

### 공통 기능
- URL 쿼리 파라미터 동기화
- 상태 캐싱
- 로딩/에러 스켈레톤
- 반응형 UI

---

## 7.2 상단 프로필 스트립 (Sticky)

### 화면 구성
- 상단 고정(sticky top-0)
- 가로 스크롤 리스트
- 프로필 이미지(썸네일) + 아이디 텍스트

### 동작
- 아이디 클릭 → 선택 계정 필터에 추가
- 프로필 이미지 클릭 → `/profile/:account` 라우팅
- 현재 선택된 계정은 강조 상태 표시

---

## 7.3 필터 바 (Sticky)

### 구성 요소
- 날짜 범위 선택기(Date Range Picker)
- 정렬(최신/오래된순)
- 리셋 버튼

### 동작
- 필터 변경 시 URL 쿼리 반영
    - `?accounts=a,b&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&sort=desc`
- 필터 적용 시 최초 페이지부터 다시 로드

---

## 7.4 피드 그리드 (페이지네이션 기반)

### 카드 구성
- 썸네일(360px 리사이즈)
- 계정명
- 게시일(Date)
- 캡션 요약
- 해시태그 일부

### 동작
- `GET /api/posts` 호출하여 1페이지 로드
- 다음 페이지 버튼 클릭 → 다음 cursor 로딩
- 이전 페이지 버튼 → 이전 cursor 로딩
- 무한 스크롤이 아니라 "이전/다음" 기반 페이지네이션

---

## 7.5 게시물 상세 (Modal + Routing)

### 라우트
- `/p/:account/:postId`

### UI 구성
- 중앙 모달 또는 full-screen 반응형
- 좌측: 이미지/영상 캐러셀
- 우측/하단: caption, tags, postedAt, account

### 동작
- ESC로 닫기
- 뒤로가기 가능(라우팅 유지)
- 캐러셀:
    - 키보드 ← →
    - 모바일 스와이프

---

## 7.6 프로필 히스토리 페이지

### 라우트
- `/profile/:account`

### 구성
- 모든 프로필 사진 목록 표시
- 최신순/오래된순 토글
- 라이트박스 뷰어 탑재

---

## 7.7 에러/로딩 처리

- 공통 스켈레톤
- API 실패 시 재시도 버튼
- Post 상세 API 실패 시 모달 내 안내 메시지 표시

---
# ✅ 8. Crawler 요구사항

## 8.1 기술 스택
- Python 3.12+
- instaloader
- pathlib
- urllib (프로필 이미지 다운로드용)

## 8.2 동작 목적
`targets/targets.txt` 목록을 기반으로 각 계정의:
- 최신 프로필 이미지
- 게시물 이미지/영상
- 본문 텍스트(.txt)

을 `/root/<account>/` 아래에 저장한다.  
**JSON 메타는 생성하지 않는다.**

## 8.3 입력: targets.txt 규칙
```
aaa, bbb
ccc
ddd, eee
```
- 콤마 또는 줄바꿈 모두 허용
- 공백 제거 후 문자열만 계정으로 처리

## 8.4 출력 구조
```
/root/<account>/
  2025-11-02_19-30-52_UTC_profile_pic.jpg
  2025-11-02_19-40-12_UTC_1.jpg
  2025-11-02_19-40-12_UTC_2.mp4
  2025-11-02_19-40-12_UTC.txt
```

## 8.5 동작 규칙

### ✅ 프로필 이미지
- UTC timestamp 생성
- 파일명: `<timestamp>_profile_pic.jpg`
- 히스토리 누적 저장

### ✅ 게시물
- instaloader filename pattern:
  `{date_utc}_UTC_{num}`
- 이미지/영상 저장
- 캡션은 `<prefix>.txt` 로 저장

### ✅ 로그인 처리
- IG_USERNAME, IG_PASSWORD 제공 시 로그인
- 세션 파일 `/sessions/<username>.session` 재사용

### ✅ 실패 처리
- 실패 파일 로그만 출력하고 계속 진행

---

# ✅ 9. 인덱싱 / DB 리프레시

API 서버는 `/root` 파일 구조를 정기적으로 스캔하여 DB와 동기화한다.

## 9.1 스캔 트리거
- 서버 시작 시 전체 스캔
- 관리자 호출 `/api/admin/reindex`
- 크롤러 완료 후 Hook(선택)

## 9.2 인덱싱 로직
1. `/root` 내 account 폴더 탐색
2. 각 파일명 prefix에서 timestamp, order_index, 종류 파싱
3. DB 업서트 수행:
    - accounts
    - posts
    - media
    - profile_pics
    - tags / post_tags
4. accounts.latest_profile_pic_url 갱신

## 9.3 해시태그 파싱
정규식:
```
/#([^\s#.,!?;:]+)/g
```

## 9.4 삭제 정책
- 실제 파일 삭제는 하지 않음
- orphan post/media 삭제는 별도 배치 옵션

---

# ✅ 10. 비기능 요구사항

## 10.1 성능
- Feed API 응답 ≤ 200ms (DB Hit 기준)
- Thumbnail 서버는 WebP/AVIF 강 캐시
- 동영상은 Range 요청 필수

## 10.2 확장성
- `/root` 대신 S3/MinIO로 이전 가능하도록 추상화
- 썸네일 서버 imgproxy/Thumbor로 교체 가능

## 10.3 보안
- 관리자 페이지 Basic Auth 또는 세션 인증
- Rate-limit 옵션
- 미디어 경로는 읽기 전용

## 10.4 백업
- DB backup cron
- `/root` 데이터 snapshot

## 10.5 장애 처리
- 파일 파싱 실패 시 로그 출력 후 스킵
- DB 업서트 실패 시 rollback 후 재처리
- 크롤 중단 → instaloader가 다음 실행에서 처리

---

# ✅ 11. Docker 구조

## 11.1 Services

### ✅ api
- Node.js Fastify
- Posts/Accounts/Profile API
- Media Range 서빙
- DB 인덱싱
- Static frontend(optional)

### ✅ crawler
- Python instaloader
- 스크립트는 별도로 제공 예정. python script 실행하는 부분만 구현할 것.

### ✅ thumb
- imgproxy 또는 sharp 기반 이미지 변환
- `/thumb/w{width}/{account}/{filename}`
- WebP/AVIF + immutable 캐시

### ✅ db
- PostgreSQL
- docker volume 저장

### ✅ redis(optional)
- API 결과 캐싱

## 11.2 공유 볼륨
```
data_root:   # /root
sessions:    # instaloader 세션
pg_data:     # postgres
```

## 11.3 docker-compose 예시 흐름
- api → /root 읽기, DB 연결 
- crawler → /root 쓰기 
- thumb → /root 읽기 
- db → 모든 메타데이터 관리

---

# ✅ 12. 개발 완료 기준(AC)

## 기능 기준
- [ ] 계정 목록/썸네일 출력
- [ ] 계정 선택 기반 post 필터링
- [ ] 날짜 범위 필터 동작
- [ ] 페이지네이션 기반 feed 탐색
- [ ] 상세 모달 + 라우팅 정상
- [ ] 프로필 히스토리 정상 동작

## 백엔드 기준
- [ ] 파일 → DB 인덱싱 100%
- [ ] posts/media/txt 매핑 정확
- [ ] 동영상 Range 지원
- [ ] 썸네일 서버 연동

## 크롤러 기준
- [ ] 프로필 이미지 누적 저장
- [ ] 미디어/캡션 저장 규칙 일치
- [ ] 세션 재사용
- [ ] 전체 계정 처리 성공률 100%

## 성능 기준
- [ ] Feed 응답 < 200ms
- [ ] Thumbnail 로딩 최적화

## Docker 기준
- [ ] docker compose up -d 로 전체 실행
- [ ] api/crawler/thumb/db 정상 기동

## 문서 기준
- [ ] /plans/plan{$number}.md 문서 생성
- [ ] 각 plan 문서에 체크리스트/상태 포함
- [ ] README 설치/실행 가이드 포함


---

# ✅ 13. 요청사항

본 프로젝트는 **/plans 폴더 내에 작업 계획서를 작성해야 한다.**

## 요구사항

### 1) 디렉터리 구조
```
/plans/
  plan1.md
  plan2.md
  plan3.md
  ...
```

### 2) plan{$number}.md 구성 규칙
각 파일은 다음 항목을 포함해야 한다:

#### ✅ 제목
예) `Plan 1 — 프런트엔드 초기 세팅`

#### ✅ 작업 목표
해당 Plan에서 처리해야 할 기능/모듈 정의

#### ✅ 상세 작업 항목 체크리스트
예)
```
- [ ] React 프로젝트 초기화
- [ ] Router 구성
- [ ] QueryProvider 세팅
```

#### ✅ 예상 산출물
코드/문서/API 등

#### ✅ 완료 여부
```
status: pending | in-progress | done
```

#### ✅ 필요 기술/참고 문서 (선택)

---

# ✅ 14. 요청사항

이 문서에 정의된 요구사항을 기반으로:

- 전체 구현
- /plans 폴더 작성
- 각 Plan 문서의 체크리스트 관리
- 작업 완료 후 작업 내용에 맞는 이름의 branch를 만들어서 커밋과 pr 진행
를 수행한다.



모든 구현은 이 Developer Prompt를 기준으로 한다.


