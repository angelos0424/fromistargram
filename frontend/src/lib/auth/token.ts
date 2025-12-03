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
