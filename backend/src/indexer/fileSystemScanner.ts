import { readdir, readFile } from 'fs/promises';
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
  type: string;
};

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
        duration: null
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
      tags: Array.from(post.tags),
      type: post.type
    }));

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
