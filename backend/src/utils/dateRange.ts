const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function isValidDateFilter(value: string): boolean {
  const datePart = value.slice(0, 10);
  const day = new Date(`${datePart}T00:00:00Z`);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== datePart) return false;
  return DATE_ONLY.test(value) || (ISO_WITH_ZONE.test(value) && Number.isFinite(new Date(value).getTime()));
}

/** Dates select whole Asia/Seoul days; explicit ISO instants retain inclusive bounds. */
export function buildDateRange(from?: string, to?: string): { gte?: Date; lt?: Date; lte?: Date } | undefined {
  if (!from && !to) return undefined;
  const range: { gte?: Date; lt?: Date; lte?: Date } = {};
  for (const value of [from, to]) {
    if (value && !isValidDateFilter(value)) throw new Error('Use YYYY-MM-DD or an ISO datetime with timezone');
  }
  if (from) {
    range.gte = DATE_ONLY.test(from)
      ? new Date(new Date(`${from}T00:00:00Z`).getTime() - KST_OFFSET_MS)
      : new Date(from);
  }
  if (to) {
    if (DATE_ONLY.test(to)) {
      range.lt = new Date(new Date(`${to}T00:00:00Z`).getTime() - KST_OFFSET_MS + DAY_MS);
    } else {
      range.lte = new Date(to);
    }
  }
  return range;
}
