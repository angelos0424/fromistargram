const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1']);

export function getAllowedOrigins(): string[] {
  const corsOrigins = process.env.CORS_ORIGINS;
  if (!corsOrigins) {
    return [];
  }
  return corsOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);
}

export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) {
    return false;
  }

  if (allowedOrigins.length === 0) {
    return isLocalhostOrigin(origin);
  }

  return allowedOrigins.some((allowedOrigin) => matchesAllowedOrigin(origin, allowedOrigin));
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return LOCALHOST_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

function matchesAllowedOrigin(origin: string, allowedOrigin: string): boolean {
  const normalizedOrigin = normalizeOrigin(origin);
  const normalizedAllowedOrigin = normalizeOrigin(allowedOrigin);
  if (normalizedOrigin && normalizedAllowedOrigin && normalizedOrigin === normalizedAllowedOrigin) {
    return true;
  }

  if (matchesWildcardOrigin(origin, allowedOrigin)) {
    return true;
  }

  return origin === allowedOrigin;
}

function normalizeOrigin(origin: string): string | null {
  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
}

function matchesWildcardOrigin(origin: string, allowedOrigin: string): boolean {
  const wildcardMatch = allowedOrigin.match(/^([a-z][a-z\d+.-]*:\/\/)\*\.(.+)$/i);
  if (!wildcardMatch) {
    return false;
  }

  try {
    const originUrl = new URL(origin);
    const allowedBaseUrl = new URL(`${wildcardMatch[1]}${wildcardMatch[2]}`);
    const originHostname = originUrl.hostname.toLowerCase();
    const allowedHostname = allowedBaseUrl.hostname.toLowerCase();

    return (
      originUrl.protocol === allowedBaseUrl.protocol &&
      originUrl.port === allowedBaseUrl.port &&
      originHostname !== allowedHostname &&
      originHostname.endsWith(`.${allowedHostname}`)
    );
  } catch {
    return false;
  }
}
