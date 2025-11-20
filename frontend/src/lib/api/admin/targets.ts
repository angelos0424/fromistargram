import { fetchApi } from '../../queryClient';
import { ADMIN_TARGETS_PATH } from './consts';
import {
  type ApiResponse,
  type CrawlTarget,
  type CrawlTargetPatch,
  type CrawlTargetPayload
} from './types';

export const listTargets =  () => fetchApi.get<ApiResponse<CrawlTarget[]>>(ADMIN_TARGETS_PATH).then(res=>res.data);

export const createTarget = (payload: CrawlTargetPayload) =>
  fetchApi.post<ApiResponse<CrawlTarget>>(ADMIN_TARGETS_PATH, payload).then(res=>res.data);

export interface UpdateTargetInput {
  id: string;
  patch: CrawlTargetPatch;
}

export const updateTarget = ({
  id,
  patch
}: UpdateTargetInput) => fetchApi.patch<ApiResponse<CrawlTarget>>(
    `${ADMIN_TARGETS_PATH}/${id}`,
    patch
  ).then(res=>res.data);


export const deleteTarget = (id: string) => fetchApi.delete(`${ADMIN_TARGETS_PATH}/${id}`);

export const reorderTargets = (idsInOrder: string[]) => fetchApi.post<ApiResponse<CrawlTarget[]>>(
    `${ADMIN_TARGETS_PATH}/reorder`,
    { ids: idsInOrder }
  ).then(res=>res.data);
