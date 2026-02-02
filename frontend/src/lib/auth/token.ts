interface JwtPayload {
  exp?: number;
  iat?: number;
  sub?: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  roles?: string[];
  nonce?: string;
  [key: string]: unknown;
}

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + (4 - (normalized.length % 4)) % 4, '=');
  return atob(padded);
};

export const decodeJwt = <T extends JwtPayload = JwtPayload>(token: string): T | null => {
  if (!token) {
    return null;
  }

  const segments = token.split('.');
  if (segments.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(segments[1]));
    return payload as T;
  } catch (error) {
    console.error('Failed to decode JWT payload', error);
    return null;
  }
};

export const isTokenExpired = (token: string | null, clockToleranceSeconds = 30): boolean => {
  if (!token) {
    return true;
  }

  const payload = decodeJwt(token);
  if (!payload?.exp) {
    return true;
  }

  const nowSeconds = Date.now() / 1000;
  return payload.exp < nowSeconds - clockToleranceSeconds;
};

export interface ParsedIdToken {
  subject: string;
  email?: string;
  name?: string;
  username?: string;
  roles: string[];
  nonce?: string;
  raw: string;
}

export const parseIdToken = (token: string): ParsedIdToken | null => {
  const payload = decodeJwt(token);
  if (!payload?.sub) {
    return null;
  }

  return {
    subject: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    username:
      typeof payload.preferred_username === 'string'
        ? payload.preferred_username
        : undefined,
    roles: Array.isArray(payload.roles)
      ? payload.roles.filter((role): role is string => typeof role === 'string')
      : [],
    nonce: typeof payload.nonce === 'string' ? payload.nonce : undefined,
    raw: token
  };
};

export interface TokenResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

/**
 * Exchange authorization code for tokens using PKCE
 */
export const exchangeCodeForTokens = async (
  issuerUrl: string,
  clientId: string,
  redirectUri: string,
  code: string,
  codeVerifier: string
): Promise<TokenResponse> => {
  const tokenEndpoint = `${issuerUrl.replace(/\/$/, '')}/application/o/token/`;

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code,
    code_verifier: codeVerifier
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();
  return data as TokenResponse;
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (
  issuerUrl: string,
  clientId: string,
  refreshToken: string
): Promise<TokenResponse> => {
  const tokenEndpoint = `${issuerUrl.replace(/\/$/, '')}/application/o/token/`;

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: refreshToken
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json();
  return data as TokenResponse;
};
