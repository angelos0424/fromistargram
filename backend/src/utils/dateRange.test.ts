import { describe, expect, it } from 'vitest';
import { buildDateRange, isValidDateFilter } from './dateRange.js';

describe('KST date filters', () => {
  it('includes both boundary days through the final KST millisecond', () => {
    const range = buildDateRange('2026-10-23', '2026-10-23')!;
    expect(range.gte?.toISOString()).toBe('2026-10-22T15:00:00.000Z');
    expect(range.lt?.toISOString()).toBe('2026-10-23T15:00:00.000Z');
    const includes = (value: string) => new Date(value) >= range.gte! && new Date(value) < range.lt!;
    expect(includes('2026-10-23T00:00:00+09:00')).toBe(true);
    expect(includes('2026-10-23T23:59:59.999+09:00')).toBe(true);
    expect(includes('2026-10-24T00:00:00+09:00')).toBe(false);
    expect(includes('2026-10-22T23:59:59.999+09:00')).toBe(false);
  });
  it('handles month/year boundaries and preserves explicit inclusive instants', () => {
    expect(buildDateRange(undefined, '2026-12-31')?.lt?.toISOString()).toBe('2026-12-31T15:00:00.000Z');
    expect(buildDateRange('2026-10-23T12:30:00+09:00', '2026-10-23T04:00:00Z')).toEqual({
      gte: new Date('2026-10-23T03:30:00Z'), lte: new Date('2026-10-23T04:00:00Z')
    });
  });
  it('rejects impossible calendar dates and ambiguous timezone-less timestamps', () => {
    for (const value of ['2026-02-31', '2026-02-31T10:00:00Z', 'invalid', '2026-10-23T10:00:00']) {
      expect(isValidDateFilter(value)).toBe(false);
      expect(() => buildDateRange(value)).toThrow();
    }
    expect(isValidDateFilter('2024-02-29')).toBe(true);
  });
});
