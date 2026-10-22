/** Stable identifiers shared by filesystem indexing and upload responses. */
export function buildPostId(accountId: string, timestamp: string): string {
  return `${timestamp}_UTC_post_${accountId}`;
}

export function parsePostId(id: string): { accountId: string; legacyId: string } | null {
  const match = id.match(/^(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_UTC)_post_(.+)$/);
  return match ? { legacyId: match[1], accountId: match[2] } : null;
}

export function formatKstDateKey(date: Date): string {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function buildStoryGroupId(accountId: string, date: Date): string {
  return `${formatKstDateKey(date)}_KST_story_${accountId}`;
}
