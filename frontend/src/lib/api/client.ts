import { fetchApi } from '../queryClient';
import {
  type AccountsResponse,
  type Post,
  type PostResponse,
  type PostsRequest,
  type PostsResponse
} from './types';

export const CLIENT_KEY = 'client';

export const listAccount = async () => {
  const res = await fetchApi.get<AccountsResponse>('/accounts');
  return res.data.data;
};

export const listPost = async (params: PostsRequest) => {
  const search = new URLSearchParams();
  if (params.accountId) search.set('accountId', params.accountId);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.pageSize) search.set('limit', String(params.pageSize));
  if (params.page) search.set('page', String(params.page));
  if (params.cursor) search.set('cursor', params.cursor);

  const qs = search.toString() ? `?${search.toString()}` : '';
  const res = await fetchApi.get<PostsResponse>(`/posts${qs}`);
  return res.data;
};

export const detailPost = async (postId: string): Promise<Post> => {
  const res = await fetchApi.get<PostResponse>(`/posts/${postId}`);
  return res.data.data;
};
