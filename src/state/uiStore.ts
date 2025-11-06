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
    }))
}));
