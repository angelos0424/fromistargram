import { fetchApi } from '../../queryClient';
import { ADMIN_INDEXER_PATH, ADMIN_UPLOADED_RECONCILER_PATH } from './consts';
import type { ApiResponse, IndexerStatus, UploadedReconcilerStatus } from './types';

export const fetchIndexerStatus = () =>
  fetchApi.get<ApiResponse<IndexerStatus>>(ADMIN_INDEXER_PATH).then((res) => res.data);

export const requestIndexerRun = () =>
  fetchApi.post<ApiResponse<IndexerStatus>>(`${ADMIN_INDEXER_PATH}/run`).then((res) => res.data);

export const fetchUploadedReconcilerStatus = () =>
  fetchApi
    .get<ApiResponse<UploadedReconcilerStatus>>(ADMIN_UPLOADED_RECONCILER_PATH)
    .then((res) => res.data);

export const requestUploadedReconcilerRun = (options?: {
  dryRun?: boolean;
  cleanOrphanOlderThanDays?: number;
  pruneDeletedDbOlderThanDays?: number;
  recalculateSize?: boolean;
}) =>
  fetchApi
    .post<ApiResponse<UploadedReconcilerStatus>>(
      `${ADMIN_UPLOADED_RECONCILER_PATH}/run`,
      options ?? {}
    )
    .then((res) => res.data);
