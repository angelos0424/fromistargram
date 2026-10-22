import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildSnapshot } from './indexer.js';

const originalDataRoot = process.env.DATA_ROOT;
const originalCrawlOutputDir = process.env.CRAWL_OUTPUT_DIR;

let tempDir: string | null = null;

async function createTempDataRoot(): Promise<string> {
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'fromistargram-indexer-'));
  return path.join(tempDir, 'data');
}

describe('buildSnapshot', () => {
  beforeEach(() => {
    delete process.env.DATA_ROOT;
    delete process.env.CRAWL_OUTPUT_DIR;
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = null;
    }

    if (originalDataRoot === undefined) {
      delete process.env.DATA_ROOT;
    } else {
      process.env.DATA_ROOT = originalDataRoot;
    }

    if (originalCrawlOutputDir === undefined) {
      delete process.env.CRAWL_OUTPUT_DIR;
    } else {
      process.env.CRAWL_OUTPUT_DIR = originalCrawlOutputDir;
    }
  });

  it('defaults DATA_ROOT to the source directory used by uploads', async () => {
    const dataRoot = await createTempDataRoot();
    const highlightDir = path.join(dataRoot, 'source', 'test_account', 'travel');
    await mkdir(highlightDir, { recursive: true });
    await writeFile(path.join(highlightDir, '2026-04-27_10-00-00_UTC.jpg'), '');

    process.env.DATA_ROOT = dataRoot;

    const snapshot = await buildSnapshot();

    expect(snapshot.accounts).toHaveLength(1);
    expect(snapshot.accounts[0]).toMatchObject({
      id: 'test_account',
      highlights: [
        {
          title: 'travel',
          media: [
            {
              filename: path.join('travel', '2026-04-27_10-00-00_UTC.jpg'),
              mime: 'image/jpeg',
              orderIndex: 0
            }
          ],
          coverMedia: null
        }
      ]
    });
  });

  it('groups story media from the same KST day into one indexed post', async () => {
    const dataRoot = await createTempDataRoot();
    const accountDir = path.join(dataRoot, 'test_account');
    await mkdir(accountDir, { recursive: true });

    await writeFile(path.join(accountDir, '2026-05-01_15-30-00_UTC.jpg'), 'story-one');
    await writeFile(
      path.join(accountDir, '2026-05-01_15-30-00_UTC.json'),
      JSON.stringify({ instaloader: { node_type: 'StoryItem' } })
    );
    await writeFile(path.join(accountDir, '2026-05-02_03-00-00_UTC.jpg'), 'story-two');
    await writeFile(
      path.join(accountDir, '2026-05-02_03-00-00_UTC.json'),
      JSON.stringify({ instaloader: { node_type: 'StoryItem' } })
    );
    await writeFile(path.join(accountDir, '2026-05-02_16-00-00_UTC.jpg'), 'story-three');
    await writeFile(
      path.join(accountDir, '2026-05-02_16-00-00_UTC.json'),
      JSON.stringify({ instaloader: { node_type: 'StoryItem' } })
    );

    const snapshot = await buildSnapshot({ dataRoot });
    const posts = snapshot.accounts[0].posts;

    expect(posts).toHaveLength(2);
    expect(posts[0]).toMatchObject({
      id: '2026-05-03_KST_story_test_account',
      type: 'Story',
      postedAt: new Date('2026-05-02T16:00:00.000Z'),
      media: [
        {
          filename: '2026-05-02_16-00-00_UTC.jpg',
          orderIndex: 0
        }
      ]
    });
    expect(posts[1]).toMatchObject({
      id: '2026-05-02_KST_story_test_account',
      type: 'Story',
      postedAt: new Date('2026-05-02T03:00:00.000Z'),
      media: [
        {
          filename: '2026-05-01_15-30-00_UTC.jpg',
          orderIndex: 0
        },
        {
          filename: '2026-05-02_03-00-00_UTC.jpg',
          orderIndex: 1
        }
      ]
    });
  });

  it('keeps regular post media ordered by filename index', async () => {
    const dataRoot = await createTempDataRoot();
    const accountDir = path.join(dataRoot, 'test_account');
    await mkdir(accountDir, { recursive: true });

    await writeFile(path.join(accountDir, '2026-05-01_01-00-00_UTC_2.jpg'), '');
    await writeFile(path.join(accountDir, '2026-05-01_01-00-00_UTC_1.jpg'), '');

    const snapshot = await buildSnapshot({ dataRoot });
    const media = snapshot.accounts[0].posts[0].media;

    expect(media).toMatchObject([
      {
        filename: '2026-05-01_01-00-00_UTC_1.jpg',
        orderIndex: 0
      },
      {
        filename: '2026-05-01_01-00-00_UTC_2.jpg',
        orderIndex: 1
      }
    ]);
  });

  it('deduplicates identical story media in the same KST day', async () => {
    const dataRoot = await createTempDataRoot();
    const accountDir = path.join(dataRoot, 'test_account');
    await mkdir(accountDir, { recursive: true });

    await writeFile(path.join(accountDir, '2026-05-01_01-00-00_UTC.jpg'), 'same-bytes');
    await writeFile(
      path.join(accountDir, '2026-05-01_01-00-00_UTC.json'),
      JSON.stringify({ instaloader: { node_type: 'StoryItem' } })
    );
    await writeFile(path.join(accountDir, '2026-05-01_03-00-00_UTC.jpg'), 'same-bytes');
    await writeFile(
      path.join(accountDir, '2026-05-01_03-00-00_UTC.json'),
      JSON.stringify({ instaloader: { node_type: 'StoryItem' } })
    );
    await writeFile(path.join(accountDir, '2026-05-01_05-00-00_UTC.jpg'), 'different-bytes');
    await writeFile(
      path.join(accountDir, '2026-05-01_05-00-00_UTC.json'),
      JSON.stringify({ instaloader: { node_type: 'StoryItem' } })
    );

    const snapshot = await buildSnapshot({ dataRoot });
    const media = snapshot.accounts[0].posts[0].media;

    expect(media).toMatchObject([
      {
        filename: '2026-05-01_01-00-00_UTC.jpg',
        orderIndex: 0
      },
      {
        filename: '2026-05-01_05-00-00_UTC.jpg',
        orderIndex: 1
      }
    ]);
  });
});
