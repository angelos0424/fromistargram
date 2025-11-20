import { fetchApi } from '../../queryClient';
import { type FeedStatistics } from './types';

interface ApiResponse<T> {
  data: T;
}

export const fetchFeedStatistics = async (): Promise<FeedStatistics> => {
  const res = await fetchApi.get<ApiResponse<FeedStatistics>>('/admin/feed-statistics');
  return res.data.data;
};
