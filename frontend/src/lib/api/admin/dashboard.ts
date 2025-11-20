import { fetchApi } from '../../queryClient';
import { ADMIN_FEED_STATISTICS_PATH } from './consts';
import { type ApiResponse, type FeedStatistics } from './types';

export const fetchFeedStatistics = async (): Promise<FeedStatistics> => {
  const res = await fetchApi.get<ApiResponse<FeedStatistics>>(ADMIN_FEED_STATISTICS_PATH);
  return res.data.data;
};
