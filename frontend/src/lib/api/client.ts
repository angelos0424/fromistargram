import { fetchApi } from '../queryClient';
import {Account, AccountsResponse, FeedQuery, FeedResponse, PostResponse, PostsRequest, PostsResponse} from './types';

export const CLIENT_KEY = 'client';

export const listAccount = () => fetchApi.get<AccountsResponse>('/accounts').then(res => res.data);


export const listPost = (req: PostsRequest) => fetchApi.get<PostsResponse>('/posts', req).then(res => res.data);


export const detailPost = (postId: string) => fetchApi.get<PostResponse>(`/posts/${postId}`);