import type { DateRange } from '../../state/uiStore';

export interface FeedSearchParamsState {
  accountId: string | null;
  dateRange: DateRange;
  page: number;
}

const clampPage = (value: number) => (value > 0 ? value : 1);

const sanitizeDate = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString().slice(0, 10);
};

export const parseFeedSearchParams = (
  params: URLSearchParams
): FeedSearchParamsState => {
  const rawAccountId = params.get('account');
  const accountId = rawAccountId && rawAccountId.trim().length > 0 ? rawAccountId : null;
  const from = sanitizeDate(params.get('from'));
  const to = sanitizeDate(params.get('to'));
  const pageParam = params.get('page');
  const parsedPage = pageParam ? Number.parseInt(pageParam, 10) : 1;

  return {
    accountId,
    dateRange: {
      from,
      to
    },
    page: clampPage(Number.isNaN(parsedPage) ? 1 : parsedPage)
  };
};

const applyParam = (
  params: URLSearchParams,
  key: string,
  value: string | null
) => {
  if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
};

export const mergeFeedSearchParams = (
  params: URLSearchParams,
  state: FeedSearchParamsState
) => {
  const next = new URLSearchParams(params);

  applyParam(next, 'account', state.accountId);
  applyParam(next, 'from', state.dateRange.from);
  applyParam(next, 'to', state.dateRange.to);
  applyParam(next, 'page', state.page > 1 ? String(state.page) : null);

  return next;
};
