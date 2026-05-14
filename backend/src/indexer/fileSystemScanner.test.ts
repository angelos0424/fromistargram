import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanDataRoot } from './fileSystemScanner.js';

let tempRoots: string[] = [];

async function createDataRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'fromistargram-indexer-'));
  tempRoots.push(root);
  return root;
}

async function writeStoryItem(
  accountDir: string,
  timestamp: string,
  mediaContent: string,
  textContent: string
): Promise<void> {
  await writeFile(
    path.join(accountDir, `${timestamp}_UTC.json`),
    JSON.stringify({ instaloader: { node_type: 'StoryItem' } })
  );
  await writeFile(path.join(accountDir, `${timestamp}_UTC.jpg`), mediaContent);
  await writeFile(path.join(accountDir, `${timestamp}_UTC.txt`), textContent);
}

afterEach(async () => {
  await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
  tempRoots = [];
});

describe('scanDataRoot story grouping', () => {
  it('groups stories by KST date, deduplicates media, and merges text chronologically', async () => {
    const dataRoot = await createDataRoot();
    const accountDir = path.join(dataRoot, 'openai');
    await mkdir(accountDir);

    await writeStoryItem(
      accountDir,
      '2026-05-14_14-30-00',
      'same image bytes',
      'newer story #ai'
    );
    await writeStoryItem(
      accountDir,
      '2026-05-13_15-30-00',
      'same image bytes',
      'older story #ml'
    );
    await writeStoryItem(
      accountDir,
      '2026-05-14_15-10-00',
      'next date image bytes',
      'next KST day'
    );

    const snapshot = await scanDataRoot(dataRoot);
    const posts = snapshot.accounts[0]?.posts ?? [];
    const may14Story = posts.find((post) => post.id === '2026-05-14_KST_story_openai');
    const may15Story = posts.find((post) => post.id === '2026-05-15_KST_story_openai');

    expect(may14Story).toMatchObject({
      accountId: 'openai',
      type: 'Story',
      textContent: 'older story #ml\n\nnewer story #ai',
      caption: 'older story #ml\n\nnewer story #ai',
      tags: ['ml', 'ai']
    });
    expect(may14Story?.postedAt.toISOString()).toBe('2026-05-14T14:30:00.000Z');
    expect(may14Story?.media).toHaveLength(1);
    expect(may14Story?.media[0]).not.toHaveProperty('contentHash');
    expect(may14Story?.media[0]).not.toHaveProperty('sourcePath');
    expect(may15Story?.media).toHaveLength(1);
  });
});
