export const HASHTAG_REGEX = /#([^\s#.,!?;:]+)/g;

export function extractHashtags(input: string): string[] {
  const matches = input.matchAll(HASHTAG_REGEX);
  const hashtags = new Set<string>();

  for (const match of matches) {
    const value = match[1]?.trim();
    if (!value) continue;
    hashtags.add(value.toLowerCase());
  }

  return Array.from(hashtags);
}
