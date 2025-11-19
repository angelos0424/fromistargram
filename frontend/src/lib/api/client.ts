import { fetchApi } from '../queryClient';
import {AccountsResponse, PostResponse, PostsRequest, PostsResponse} from './types';

export const CLIENT_KEY = 'client';

export const listAccount = () => fetchApi.get<AccountsResponse>('/accounts').then(res => res.data);


export const listPost = async (params: PostsRequest) => {
  const search = new URLSearchParams();
  if (params.accountId) search.set('accountId', params.accountId);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.pageSize) search.set('limit', String(params.pageSize));
  if (params.page) search.set('page', String(params.page));
  if (params.cursor) search.set('cursor', params.cursor);

  const qs = search.toString() ? '?' + search.toString() : '';

  const res = await fetchApi.get<PostsResponse>(`/posts${qs}`);
  return res.data;
}


export const detailPost = (postId: string) => fetchApi.get<PostResponse>(`/posts/${postId}`);