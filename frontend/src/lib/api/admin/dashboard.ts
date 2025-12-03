import { fetchApi } from '../../queryClient';
import { ADMIN_FEED_STATISTICS_PATH } from './consts';
import { type ApiResponse, type FeedStatistics } from './types';

export const listStatistics = () =>
  fetchApi.get<ApiResponse<FeedStatistics>>(ADMIN_FEED_STATISTICS_PATH)
    .then(res=>res.data)