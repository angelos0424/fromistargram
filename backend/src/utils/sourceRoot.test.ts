import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveSourceRoot, resolveUploadedRoot } from './sourceRoot.js';

const originalDataRoot = process.env.DATA_ROOT;
const originalCrawlOutputDir = process.env.CRAWL_OUTPUT_DIR;

describe('source root resolution', () => {
  beforeEach(() => {
    delete process.env.DATA_ROOT;
    delete process.env.CRAWL_OUTPUT_DIR;
  });

  afterEach(() => {
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

  it('keeps default source and uploaded roots under /data', () => {
    expect(resolveSourceRoot()).toBe(path.resolve('/data/source'));
    expect(resolveUploadedRoot()).toBe(path.resolve('/data/uploaded'));
  });

  it('prefers CRAWL_OUTPUT_DIR over DATA_ROOT for source reads', () => {
    process.env.DATA_ROOT = '/tmp/fromistargram-data';
    process.env.CRAWL_OUTPUT_DIR = '/tmp/fromistargram-crawl';

    expect(resolveSourceRoot()).toBe(path.resolve('/tmp/fromistargram-crawl'));
    expect(resolveUploadedRoot()).toBe(path.resolve('/tmp/fromistargram-data/uploaded'));
  });
});
