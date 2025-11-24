import path from 'path';

const mediaPublicBase = process.env.PUBLIC_MEDIA_BASE_URL ?? '/api/media';

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

export function buildMediaUrl(accountId: string, filename: string): string {
  console.log('buildMediaUrl', accountId, filename);
  const safeFilename = encodeURIComponent(filename);
  const safeAccount = encodeURIComponent(accountId);
  const normalizedBase = ensureTrailingSlash(mediaPublicBase);

  if (/^https?:\/\//iu.test(normalizedBase)) {
    return `${normalizedBase}${safeAccount}/${safeFilename}`;
  }

  return path.posix.join(normalizedBase, safeAccount, safeFilename);
}

export function isAbsoluteMediaBase(): boolean {
  return /^https?:\/\//iu.test(ensureTrailingSlash(mediaPublicBase));
}
