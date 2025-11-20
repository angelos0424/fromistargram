import { fetchApi } from '../../queryClient';
import {
  type CrawlTarget,
  type CrawlTargetPatch,
  type CrawlTargetPayload
} from './types';

interface ApiResponse<T> {
  data: T;
}

const ADMIN_TARGETS_PATH = '/admin/targets';

export const listTargets = async (): Promise<CrawlTarget[]> => {
  const res = await fetchApi.get<ApiResponse<CrawlTarget[]>>(ADMIN_TARGETS_PATH);
  return res.data.data;
};

export const createTarget = async (
  payload: CrawlTargetPayload
): Promise<CrawlTarget> => {
  const res = await fetchApi.post<ApiResponse<CrawlTarget>>(ADMIN_TARGETS_PATH, payload);
  return res.data.data;
};

interface UpdateTargetInput {
  id: string;
  patch: CrawlTargetPatch;
}

export const updateTarget = async ({
  id,
  patch
}: UpdateTargetInput): Promise<CrawlTarget> => {
  const res = await fetchApi.patch<ApiResponse<CrawlTarget>>(
    `${ADMIN_TARGETS_PATH}/${id}`,
    patch
  );
  return res.data.data;
};

export const deleteTarget = async (id: string): Promise<void> => {
  await fetchApi.delete(`${ADMIN_TARGETS_PATH}/${id}`);
};

export const reorderTargets = async (idsInOrder: string[]): Promise<CrawlTarget[]> => {
  const res = await fetchApi.post<ApiResponse<CrawlTarget[]>>(
    `${ADMIN_TARGETS_PATH}/reorder`,
    { ids: idsInOrder }
  );
  return res.data.data;
};
