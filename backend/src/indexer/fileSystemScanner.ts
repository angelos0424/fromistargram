import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { lookup } from 'mime-types';
import { extractHashtags } from '../utils/hashtags.js';
import {
  AccountSnapshot,
  IndexerSnapshot,
  IndexedMedia,
  IndexedPost,
  IndexedProfilePicture
} from './types.js';

const MEDIA_REGEX = /^(?<timestamp>\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})_UTC_(?<index>\d+)\.(?<extension>[a-zA-Z0-9]+)$/;
const TEXT_REGEX = /^(?<timestamp>\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})_UTC\.txt$/;
const PROFILE_REGEX = /^(?<timestamp>\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})_UTC_profile_pic\.(?<extension>[a-zA-Z0-9]+)$/;

function parseTimestamp(timestamp: string): Date {
  const [datePart, timePart] = timestamp.split('_');
  const normalizedTime = timePart.replace(/-/g, ':');
  return new Date(`${datePart}T${normalizedTime}Z`);
}

type PostAccumulator = {
  id: string;
  accountId: string;
  postedAt: Date;
  media: IndexedMedia[];
  textContent: string | null;
  hasText: boolean;
  tags: Set<string>;
  caption: string | null;
};

async function scanAccount(dataRoot: string, accountId: string): Promise<AccountSnapshot> {
  const accountDir = path.join(dataRoot, accountId);
  const entries = await readdir(accountDir, { withFileTypes: true });
  const postMap = new Map<string, PostAccumulator>();
  const profilePictures: IndexedProfilePicture[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const { name } = entry;

    const mediaMatch = name.match(MEDIA_REGEX);
    if (mediaMatch?.groups) {
      const { timestamp, index, extension } = mediaMatch.groups as {
        timestamp: string;
        index: string;
        extension: string;
      };
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
          caption: null
        };
        postMap.set(postId, accumulator);
      }

      const absolutePath = path.join(accountDir, name);
      const mime = lookup(absolutePath) || 'application/octet-stream';
      const orderIndex = Number.parseInt(index, 10) - 1;

      accumulator.media.push({
        filename: name,
        orderIndex: Number.isNaN(orderIndex) ? accumulator.media.length : orderIndex,
        mime: typeof mime === 'string' ? mime : 'application/octet-stream',
        width: null,
        height: null,
        duration: null
      });
      continue;
    }

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
          caption: null
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

  const posts: IndexedPost[] = Array.from(postMap.values())
    .sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime())
    .map((post) => ({
      id: post.id,
      accountId: post.accountId,
      postedAt: post.postedAt,
      media: [...post.media].sort((a, b) => a.orderIndex - b.orderIndex),
      caption: post.caption,
      hasText: post.hasText,
      textContent: post.textContent,
      tags: Array.from(post.tags)
    }));

  profilePictures.sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());

  return {
    id: accountId,
    posts,
    profilePictures
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
