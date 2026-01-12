import { ADMIN_SHARED_MEDIA_PATH } from './consts';
import type { ApiResponse, AdminSharedMedia, AdminSharedMediaListResponse, AdminSharedMediaPatch } from './types';
import {fetchApi} from "../../queryClient";

export interface AdminSharedMediaListParams {
  cursor?: string;
  limit?: number;
  from?: string;
  to?: string;
  includeDeleted?: boolean;
}

export const listSharedMedia = async (params: AdminSharedMediaListParams): Promise<AdminSharedMediaListResponse> => {
  const search = new URLSearchParams();
  if (params.cursor) search.set('cursor', params.cursor);
  if (params.limit) search.set('limit', String(params.limit));
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.includeDeleted !== undefined) search.set('includeDeleted', String(params.includeDeleted));

  const qs = search.toString() ? `?${search.toString()}` : '';
  const res = await fetchApi.get<AdminSharedMediaListResponse>(`${ADMIN_SHARED_MEDIA_PATH}${qs}`);
  return res.data;
};

export interface UpdateSharedMediaInput {
  id: string;
  patch: AdminSharedMediaPatch;
}

export const updateSharedMedia = async ({ id, patch }: UpdateSharedMediaInput): Promise<AdminSharedMedia> => {
  const res = await fetchApi.patch<ApiResponse<AdminSharedMedia>>(
    `${ADMIN_SHARED_MEDIA_PATH}/${id}`,
    patch
  );
  return res.data.data;
};

export const deleteSharedMedia = async (id: string): Promise<void> => {
  await fetchApi.delete(`${ADMIN_SHARED_MEDIA_PATH}/${id}`);
};
