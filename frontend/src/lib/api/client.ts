import { fetchApi } from '../queryClient';
import {
  type AccountsResponse,
  type AccountResponse,
  type Post,
  type PostResponse,
  type PostsRequest,
  type PostsResponse,
  type Highlight
} from './types';

export const CLIENT_KEY = 'client';

export const listAccount = () => fetchApi.get<AccountsResponse>('/accounts').then((res) => res.data);

export const getAccount = (id: string) => fetchApi.get<AccountResponse>(`/accounts/${id}`).then((res) => res.data);

export const listPost = async (params: PostsRequest) => {
  const search = new URLSearchParams();
  if (params.accountId) search.set('accountId', params.accountId);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.pageSize) search.set('limit', String(params.pageSize));
  if (params.page) search.set('page', String(params.page));
  if (params.cursor) search.set('cursor', params.cursor);
  if (params.type) search.set('type', params.type);

  const qs = search.toString() ? `?${search.toString()}` : '';
  const res = await fetchApi.get<PostsResponse>(`/posts${qs}`);
  return res.data;
};

export const detailPost = (postId: string) => fetchApi.get<PostResponse>(`/posts/${postId}`).then((res) => res.data);

export const listHighlights = (accountId: string) => fetchApi.get<Highlight[]>(`/accounts/${accountId}/highlights`).then((res) => res.data);

// Shared Media API
export const uploadSharedMedia = async (files: File[], caption?: string) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  if (caption) {
    formData.append('caption', caption);
  }

  const res = await fetchApi.post('/shared/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return res.data;
};

export const listSharedMedia = async (params: import('./types').SharedMediaListRequest) => {
  const search = new URLSearchParams();
  if (params.cursor) search.set('cursor', params.cursor);
  if (params.limit) search.set('limit', String(params.limit));
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);

  const qs = search.toString() ? `?${search.toString()}` : '';
  const res = await fetchApi.get<import('./types').SharedMediaListResponse>(`/shared${qs}`);
  return res.data;
};

export const getSharedMedia = (id: string) =>
  fetchApi.get<import('./types').SharedMediaResponse>(`/shared/${id}`).then((res) => res.data);
