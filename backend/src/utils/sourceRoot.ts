import path from 'path';

export function resolveSourceRoot(): string {
  const crawlOutputRoot = process.env.CRAWL_OUTPUT_DIR?.trim();
  if (crawlOutputRoot) {
    return path.resolve(crawlOutputRoot);
  }

  const dataRoot = process.env.DATA_ROOT?.trim();
  if (dataRoot) {
    return path.resolve(dataRoot, 'source');
  }

  return path.resolve('/root');
}

export function resolveSourceAccountPath(accountId: string): string {
  const sourceRoot = resolveSourceRoot();
  return path.resolve(sourceRoot, accountId);
}

export function resolveUploadedRoot(): string {
  const dataRoot = process.env.DATA_ROOT?.trim();
  if (dataRoot) {
    return path.resolve(dataRoot, 'uploaded');
  }

  return path.resolve('/data/uploaded');
}
