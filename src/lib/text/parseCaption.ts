export type CaptionSegment =
  | { type: 'text'; value: string }
  | { type: 'hashtag'; value: string }
  | { type: 'mention'; value: string };

const TAG_PATTERN = /(#[^\s#@]+|@[^\s#@]+)/g;

export const parseCaption = (caption: string): CaptionSegment[] => {
  if (!caption) {
    return [];
  }

  const segments: CaptionSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TAG_PATTERN.exec(caption)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        value: caption.slice(lastIndex, match.index)
      });
    }

    const token = match[0];
    const type = token.startsWith('#') ? 'hashtag' : 'mention';
    segments.push({
      type,
      value: token
    });

    lastIndex = TAG_PATTERN.lastIndex;
  }

  if (lastIndex < caption.length) {
    segments.push({
      type: 'text',
      value: caption.slice(lastIndex)
    });
  }

  return segments;
};

export const getCaptionLink = (segment: CaptionSegment): string | null => {
  if (segment.type === 'hashtag') {
    return `https://www.instagram.com/explore/tags/${segment.value.slice(1)}/`;
  }

  if (segment.type === 'mention') {
    return `https://www.instagram.com/${segment.value.slice(1)}/`;
  }

  return null;
};
