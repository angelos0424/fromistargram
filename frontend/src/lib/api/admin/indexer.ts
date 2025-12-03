import { fetchApi } from '../../queryClient';
import { ADMIN_INDEXER_PATH } from './consts';
import type { ApiResponse, IndexerStatus } from './types';

export const fetchIndexerStatus = () =>
  fetchApi.get<ApiResponse<IndexerStatus>>(ADMIN_INDEXER_PATH).then((res) => res.data);

export const requestIndexerRun = () =>
  fetchApi.post<ApiResponse<IndexerStatus>>(`${ADMIN_INDEXER_PATH}/run`).then((res) => res.data);
