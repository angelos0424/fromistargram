import { create } from 'zustand';

export interface DateRange {
  from: string | null;
  to: string | null;
}

interface FeedUIState {
  selectedAccountId: string | null;
  dateRange: DateRange;
  page: number;
  pageSize: number;
  setSelectedAccountId: (accountId: string | null) => void;
  setDateRange: (range: DateRange) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
  hydrateFromQuery: (state: {
    selectedAccountId: string | null;
    dateRange: DateRange;
    page: number;
  }) => void;
}

const DEFAULT_PAGE_SIZE = 12;

export const useFeedUiStore = create<FeedUIState>((set) => ({
  selectedAccountId: null,
  dateRange: {
    from: null,
    to: null
  },
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  setSelectedAccountId: (selectedAccountId) =>
    set((state) => ({
      selectedAccountId,
      page: selectedAccountId === state.selectedAccountId ? state.page : 1
    })),
  setDateRange: (dateRange) =>
    set(() => ({
      dateRange,
      page: 1
    })),
  setPage: (page) =>
    set(() => ({
      page
    })),
  resetFilters: () =>
    set(() => ({
      selectedAccountId: null,
      dateRange: { from: null, to: null },
      page: 1
    })),
  hydrateFromQuery: ({ selectedAccountId, dateRange, page }) =>
    set((state) => {
      const updates: Partial<FeedUIState> = {};

      if (state.selectedAccountId !== selectedAccountId) {
        updates.selectedAccountId = selectedAccountId;
      }

      if (
        state.dateRange.from !== dateRange.from ||
        state.dateRange.to !== dateRange.to
      ) {
        updates.dateRange = { ...dateRange };
      }

      if (state.page !== page) {
        updates.page = page;
      }

      return Object.keys(updates).length > 0 ? updates : {};
    })
}));
