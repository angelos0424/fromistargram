import { fetchApi } from '../../queryClient';
import { ADMIN_UPLOADS_PATH } from './consts';
import type { ApiResponse } from './types';

export interface AdminUploadPayload {
  accountId: string;
  postedAt: string;
  type: 'Post' | 'Story';
  caption?: string;
  files: File[];
}

export const uploadAdminMedia = async (payload: AdminUploadPayload): Promise<void> => {
  const formData = new FormData();
  formData.append('accountId', payload.accountId);
  formData.append('postedAt', payload.postedAt);
  formData.append('type', payload.type);
  if (payload.caption) {
    formData.append('caption', payload.caption);
  }
  payload.files.forEach((file) => {
    formData.append('files[]', file);
  });

  await fetchApi.post<ApiResponse<unknown>>(ADMIN_UPLOADS_PATH, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};
