import { createReadStream } from 'fs';
import { readdir, readFile } from 'fs/promises';
import { createHash } from 'node:crypto';
import path from 'path';
import { lookup } from 'mime-types';
import { extractHashtags } from '../utils/hashtags.js';
import {
  AccountSnapshot,
  IndexerSnapshot,
  IndexedMedia,
  IndexedPost,
  IndexedProfilePicture,
  IndexedHighlight,
  IndexedHighlightMedia
} from './types.js';

const MEDIA_REGEX = /^(?<timestamp>\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})_UTC(?:_(?<index>\d+))?\.(?<extension>[a-zA-Z0-9]+)$/;
const TEXT_REGEX = /^(?<timestamp>\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})_UTC\.txt$/;
const PROFILE_REGEX = /^(?<timestamp>\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})_UTC_profile_pic\.(?<extension>[a-zA-Z0-9]+)$/;
const COVER_REGEX = /^(?<timestamp>\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})_UTC_cover\.(?<extension>[a-zA-Z0-9]+)$/;

type AccumulatedMedia = IndexedMedia & {
  contentHash: string;
};

function parseTimestamp(timestamp: string): Date {
  const [datePart, timePart] = timestamp.split('_');
  const normalizedTime = timePart.replace(/-/g, ':');
  return new Date(`${datePart}T${normalizedTime}Z`);
}

function formatKstDateKey(date: Date): string {
  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildStoryGroupId(accountId: string, dateKey: string): string {
  return `${dateKey}_KST_story_${accountId}`;
}

function mergeTextContent(current: string | null, next: string | null): string | null {
  if (!next) {
    return current;
  }

  if (!current) {
    return next;
  }

  return `${current.trimEnd()}\n\n${next}`;
}

async function hashFile(filepath: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filepath)) {
    hash.update(chunk);
  }

  return hash.digest('hex');
}

type PostAccumulator = {
  id: string;
  accountId: string;
  postedAt: Date;
  media: AccumulatedMedia[];
  textContent: string | null;
  hasText: boolean;
  tags: Set<string>;
  caption: string | null;
  type: string;
};

function mergeStoryIntoGroup(group: PostAccumulator, story: PostAccumulator): void {
  if (story.postedAt.getTime() > group.postedAt.getTime()) {
    group.postedAt = story.postedAt;
  }

  const existingHashes = new Set(group.media.map((media) => media.contentHash));
  for (const media of story.media) {
    if (existingHashes.has(media.contentHash)) {
      continue;
    }

    existingHashes.add(media.contentHash);
    group.media.push(media);
  }
  group.textContent = mergeTextContent(group.textContent, story.textContent);
  group.caption = mergeTextContent(group.caption, story.caption);
  group.hasText = group.hasText || story.hasText;
  story.tags.forEach((tag) => group.tags.add(tag));
}

function groupStoriesByDay(posts: PostAccumulator[]): PostAccumulator[] {
  const groupedPosts: PostAccumulator[] = [];
  const storyGroups = new Map<string, PostAccumulator>();

  for (const post of posts) {
    if (post.type !== 'Story') {
      groupedPosts.push(post);
      continue;
    }

    const dateKey = formatKstDateKey(post.postedAt);
    const groupKey = `${post.accountId}:${dateKey}`;
    const existingGroup = storyGroups.get(groupKey);
    if (existingGroup) {
      mergeStoryIntoGroup(existingGroup, post);
      continue;
    }

    const group: PostAccumulator = {
      ...post,
      id: buildStoryGroupId(post.accountId, dateKey),
      media: [...post.media],
      tags: new Set(post.tags)
    };
    storyGroups.set(groupKey, group);
    groupedPosts.push(group);
  }

  return groupedPosts;
}

function getMediaTimestamp(filename: string): string {
  const match = path.basename(filename).match(MEDIA_REGEX);
  return match?.groups?.timestamp ?? '';
}

function compareIndexedMedia(a: IndexedMedia, b: IndexedMedia, postType: string): number {
  if (postType === 'Story') {
    return getMediaTimestamp(a.filename).localeCompare(getMediaTimestamp(b.filename)) ||
      a.orderIndex - b.orderIndex ||
      a.filename.localeCompare(b.filename);
  }

  return a.orderIndex - b.orderIndex || a.filename.localeCompare(b.filename);
}

function toIndexedPost(post: PostAccumulator): IndexedPost {
  const media = [...post.media]
    .sort((a, b) => compareIndexedMedia(a, b, post.type))
    .map(({ contentHash: _contentHash, ...item }, index) => ({
      ...item,
      orderIndex: index
    }));

  return {
    id: post.id,
    accountId: post.accountId,
    postedAt: post.postedAt,
    media,
    caption: post.caption,
    hasText: post.hasText,
    textContent: post.textContent,
    tags: Array.from(post.tags),
    type: post.type
  };
}

async function scanAccount(dataRoot: string, accountId: string): Promise<AccountSnapshot> {
  const accountDir = path.join(dataRoot, accountId);
  const entries = await readdir(accountDir, { withFileTypes: true });
  const postMap = new Map<string, PostAccumulator>();
  const profilePictures: IndexedProfilePicture[] = [];
  const highlights: IndexedHighlight[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const highlightTitle = entry.name;
      const highlightDir = path.join(accountDir, highlightTitle);
      const highlightEntries = await readdir(highlightDir, { withFileTypes: true });
      const highlightMedia: IndexedHighlightMedia[] = [];
      let coverMedia: IndexedHighlightMedia | null = null;

      for (const hEntry of highlightEntries) {
        if (!hEntry.isFile()) continue;

        const hName = hEntry.name;
        // Skip hidden files or non-media if needed, but for now accept all files or filter by extension
        // Assuming similar media extensions as posts
        if (hName.startsWith('.')) continue;

        const coverMatch = hName.match(COVER_REGEX);
        if (coverMatch?.groups) {
          const absolutePath = path.join(highlightDir, hName);
          const mime = lookup(absolutePath) || 'application/octet-stream';

          coverMedia = {
            filename: path.join(highlightTitle, hName),
            orderIndex: 0,
            mime: typeof mime === 'string' ? mime : 'application/octet-stream'
          } as IndexedHighlightMedia;

          continue;
        }

        const mediaMatch = hName.match(MEDIA_REGEX);
        if (mediaMatch?.groups) {
          const { extension } = mediaMatch.groups as {
            extension: string;
          };

          if (['json', 'txt'].includes(extension.toLowerCase())) {
            continue;
          }
          const absolutePath = path.join(highlightDir, hName);
          const mime = lookup(absolutePath) || 'application/octet-stream';

          // Try to extract order index if filename has it, otherwise use 0 or list order
          // Regex for highlight media? Or just sort by name?
          // Requirement: "folder below contents gathered and shown at once"
          // Let's just sort by filename for orderIndex if not specified.

          highlightMedia.push({
            filename: path.join(highlightTitle, hName),
            orderIndex: 0,
            mime: typeof mime === 'string' ? mime : 'application/octet-stream'
          });
        }
      }

      // Sort by filename to ensure deterministic order
      highlightMedia.sort((a, b) => a.filename.localeCompare(b.filename));
      highlightMedia.forEach((m, i) => m.orderIndex = i);

      if (highlightMedia.length > 0) {
        highlights.push({
          title: highlightTitle,
          media: highlightMedia,
          coverMedia
        });
      }
      continue;
    }

    if (!entry.isFile()) continue;

    const { name } = entry;

    const textMatch = name.match(TEXT_REGEX);
    if (textMatch?.groups) {
      const { timestamp } = textMatch.groups as { timestamp: string };
      const postId = `${timestamp}_UTC`;
      let accumulator = postMap.get(postId);
      if (!accumulator) {
        accumulator = {
          id: postId,
          accountId,
          postedAt: parseTimestamp(timestamp),
          media: [],
          textContent: null,
          hasText: false,
          tags: new Set<string>(),
          caption: null,
          type: 'Post'
        };
        postMap.set(postId, accumulator);
      }

      const content = await readFile(path.join(accountDir, name), 'utf-8');
      const trimmed = content.trim();
      accumulator.textContent = content;
      accumulator.caption = trimmed.length > 0 ? content : null;
      accumulator.hasText = trimmed.length > 0;

      if (trimmed.length > 0) {
        extractHashtags(trimmed).forEach((tag) => accumulator.tags.add(tag));
      }
      continue;
    }

    const mediaMatch = name.match(MEDIA_REGEX);
    if (mediaMatch?.groups) {
      const { timestamp, index, extension } = mediaMatch.groups as {
        timestamp: string;
        index?: string;
        extension: string;
      };

      if (extension.toLowerCase() === 'txt') {
        continue;
      }

      const postId = `${timestamp}_UTC`;
      let accumulator = postMap.get(postId);
      if (!accumulator) {
        accumulator = {
          id: postId,
          accountId,
          postedAt: parseTimestamp(timestamp),
          media: [],
          textContent: null,
          hasText: false,
          tags: new Set<string>(),
          caption: null,
          type: 'Post'
        };
        postMap.set(postId, accumulator);
      }

      if (extension.toLowerCase() === 'json') {
        try {
          const content = await readFile(path.join(accountDir, name), 'utf-8');
          const data = JSON.parse(content);


          if (data?.instaloader?.node_type) {
            // Map 'StoryItem' to 'Story', 'Post' to 'Post'
            accumulator.type = data.instaloader.node_type === 'StoryItem' ? 'Story' : 'Post';
          } else {
            console.log("Unknown node type: ", data);
          }
        } catch (e) {
          // Ignore json parse errors
        }
        continue;
      }

      const absolutePath = path.join(accountDir, name);
      const mime = lookup(absolutePath) || 'application/octet-stream';
      const orderIndex = index ? Number.parseInt(index, 10) - 1 : 0;

      accumulator.media.push({
        filename: name,
        orderIndex: Number.isNaN(orderIndex) ? accumulator.media.length : orderIndex,
        mime: typeof mime === 'string' ? mime : 'application/octet-stream',
        width: null,
        height: null,
        duration: null,
        contentHash: await hashFile(absolutePath)
      });
      continue;
    }

    const profileMatch = name.match(PROFILE_REGEX);
    if (profileMatch?.groups) {
      const { timestamp } = profileMatch.groups as { timestamp: string };
      profilePictures.push({
        id: `${accountId}_${timestamp}`,
        accountId,
        takenAt: parseTimestamp(timestamp),
        filename: name
      });
    }
  }

  const posts: IndexedPost[] = groupStoriesByDay(Array.from(postMap.values()))
    .sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime())
    .map(toIndexedPost);

  profilePictures.sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());

  return {
    id: accountId,
    posts,
    profilePictures,
    highlights
  };
}

export async function scanDataRoot(dataRoot: string): Promise<IndexerSnapshot> {
  const entries = await readdir(dataRoot, { withFileTypes: true });
  const accounts: AccountSnapshot[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const accountId = entry.name;
    const snapshot = await scanAccount(dataRoot, accountId);
    accounts.push(snapshot);
  }

  accounts.sort((a, b) => a.id.localeCompare(b.id));
  return { accounts };
}
