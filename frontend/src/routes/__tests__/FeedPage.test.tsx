import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FeedPage from '../FeedPage';
import { listAccount, listPost, listSharedMedia } from '../../lib/api/client';
import { useFeedUiStore } from '../../state/uiStore';
import type { Post } from '../../lib/api/types';
vi.mock('../../lib/api/client', () => ({ CLIENT_KEY: 'client', listAccount: vi.fn(), listPost: vi.fn(), listSharedMedia: vi.fn(), detailPost: vi.fn(), uploadSharedMedia: vi.fn() }));
vi.mock('../../components/feed/PostGrid', () => ({ default: ({ posts }: { posts: Post[] }) => <div>{posts.map((post) => <p key={post.id}>{post.caption}</p>)}</div> }));
const fixture: Post = { id: 'match', accountId: 'account', caption: '다른 페이지의 검색 대상', textContent: null, media: [], tags: [], type: 'Post', hasText: true, postedAt: '2026-10-23T00:00:00Z' };
const renderFeed = () => render(<HelmetProvider><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><FeedPage /></MemoryRouter></QueryClientProvider></HelmetProvider>);

describe('FeedPage server search and errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFeedUiStore.getState().resetFilters();
    vi.mocked(listAccount).mockResolvedValue({ success: true, data: [] });
    vi.mocked(listPost).mockImplementation(async (params) => ({ success: true, data: params.search ? [fixture] : [], meta: { total: params.search ? 1 : 24, pageInfo: { hasNextPage: !params.search, nextCursor: null } } }));
    vi.mocked(listSharedMedia).mockResolvedValue({ success: true, data: [], meta: { total: 0, hasMore: false, nextCursor: null } });
  });
  it('searches all pages on the server and resets page/count together', async () => {
    renderFeed();
    await waitFor(() => expect(screen.getByRole('button', { name: '다음' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() => expect(listPost).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    fireEvent.change(screen.getByRole('searchbox', { name: '본문 내용이나 계정명으로 검색' }), { target: { value: '검색 대상' } });
    await screen.findByText('다른 페이지의 검색 대상');
    expect(listPost).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: '검색 대상' }));
    expect(screen.getByRole('status')).toHaveTextContent('페이지 1 / 1 · 총 1개');
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '공유 미디어' }));
    await waitFor(() => expect(listSharedMedia).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: '검색 대상' })));
  });
  it('shows a retryable shared-media error separately from a successful empty collection', async () => {
    vi.mocked(listSharedMedia).mockRejectedValueOnce(new Error('503'));
    renderFeed();
    fireEvent.click(screen.getByRole('button', { name: '공유 미디어' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('공유 미디어를 불러오는 중 문제가 발생했습니다.');
    expect(screen.queryByText('아직 업로드된 미디어가 없습니다')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('아직 업로드된 미디어가 없습니다')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
