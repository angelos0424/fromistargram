# Authentik 연동 가이드

프런트엔드 어드민 패널은 Authentik OpenID Connect(OIDC) 애플리케이션과 연동하여 관리자 인증을 수행합니다. 다음 절차에 따라 환경 변수를 구성하고 리디렉트 경로를 등록하세요.

## 1. Authentik OIDC 애플리케이션 생성
1. Authentik 대시보드에서 **Applications → Create**를 선택합니다.
2. `Protocol`을 **OAuth2/OpenID Provider**로 지정하고 `Client Type`은 **Public**으로 설정합니다.
3. 생성된 애플리케이션의 **Client ID**와 **Issuer URL**(예: `https://auth.example.com`)을 확인합니다.
4. **Redirect URIs**에 프런트엔드에서 사용할 주소를 추가합니다. 개발 환경에서는 `http://localhost:5173/admin`을 등록합니다.
5. **Logout URIs**에는 로그아웃 후 돌아올 주소(예: `http://localhost:5173/admin`)를 추가합니다.
6. `Scopes` 항목에 `openid profile email`과 같은 기본 범위를 포함하고, 역할 정보를 담는 커스텀 클레임을 추가했다면 해당 scope도 등록합니다.

## 2. 역할(Claim) 매핑
어드민 패널은 ID 토큰의 `roles` 클레임 안에 `admin` 문자열이 포함되어 있는지 검사합니다. Authentik의 **Policy → Property Mapping** 기능을 사용해 `roles` 배열에 운영자 권한을 주입하세요.

예시 매핑:
```json
{
  "roles": ["admin"]
}
```

## 3. 환경 변수 설정
프런트엔드 루트에 `.env` 파일을 생성하고 아래 값을 채웁니다. 기본 템플릿은 [`frontend/.env.example`](../.env.example)을 참고합니다.

```bash
VITE_AUTHENTIK_ISSUER_URL=https://auth.example.com
VITE_AUTHENTIK_CLIENT_ID=fromistargram-admin
VITE_AUTHENTIK_REDIRECT_URI=http://localhost:5173/admin
VITE_AUTHENTIK_LOGOUT_REDIRECT_URI=http://localhost:5173/admin
VITE_AUTHENTIK_SCOPE=openid profile email roles
VITE_AUTHENTIK_ADMIN_ROLE=admin
```

필요 시 `VITE_AUTHENTIK_AUDIENCE` 값을 추가해 Authentik의 리소스 서버와 통신할 수 있습니다.

## 4. 동작 확인
1. `pnpm --filter @fromistargram/frontend dev` 명령으로 프런트엔드를 실행합니다.
2. 브라우저에서 `/admin` 경로에 접속하면 Authentik 로그인 화면으로 리디렉션되는지 확인합니다.
3. 로그인 후 토큰이 발급되면 어드민 대시보드가 노출됩니다.
4. 로그아웃 버튼을 누르면 Authentik의 로그아웃 엔드포인트를 거쳐 다시 `/admin`으로 돌아옵니다.

위 설정이 완료되면 어드민 패널은 Authentik 발급 토큰을 사용해 관리자 여부를 식별하고, 세션 상태를 브라우저 세션 스토리지에 안전하게 저장합니다.
