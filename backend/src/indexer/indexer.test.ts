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
});
