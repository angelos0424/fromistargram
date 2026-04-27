const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1']);
const WILDCARD_ORIGIN_PATTERN = /^([a-z][a-z\d+.-]*:\/\/)\*\.(.+)$/i;

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

  const originUrl = parseUrl(origin);
  const normalizedOrigin = originUrl?.origin ?? null;

  if (allowedOrigins.length === 0) {
    return isLocalhostOrigin(originUrl);
  }

  return allowedOrigins.some((allowedOrigin) =>
    matchesAllowedOrigin(origin, originUrl, normalizedOrigin, allowedOrigin)
  );
}

function isLocalhostOrigin(originUrl: URL | null): boolean {
  return originUrl ? LOCALHOST_HOSTS.has(originUrl.hostname) : false;
}

function matchesAllowedOrigin(
  origin: string,
  originUrl: URL | null,
  normalizedOrigin: string | null,
  allowedOrigin: string
): boolean {
  const normalizedAllowedOrigin = normalizeOrigin(allowedOrigin);
  if (normalizedOrigin && normalizedAllowedOrigin && normalizedOrigin === normalizedAllowedOrigin) {
    return true;
  }

  if (originUrl && matchesWildcardOrigin(originUrl, allowedOrigin)) {
    return true;
  }

  return origin === allowedOrigin;
}

function normalizeOrigin(origin: string): string | null {
  return parseUrl(origin)?.origin ?? null;
}

function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function matchesWildcardOrigin(originUrl: URL, allowedOrigin: string): boolean {
  const wildcardMatch = allowedOrigin.match(WILDCARD_ORIGIN_PATTERN);
  if (!wildcardMatch) {
    return false;
  }

  try {
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
