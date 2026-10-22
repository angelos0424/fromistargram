import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PostModal from '../PostModal';
import type { Account, Post } from '../../../lib/api/types';
vi.mock('../../post/PostMediaCarousel', () => ({ default: ({ onMediaClick }: { onMediaClick: () => void }) => <button onClick={onMediaClick}>전체화면 열기</button> }));
const post: Post = { id: 'post', accountId: 'account', caption: '', textContent: null, tags: [], type: 'Post', postedAt: '2026-10-23T00:00:00Z', hasText: false, media: [{ id: 'image', filename: 'image.jpg', mime: 'image/jpeg', type: 'image', width: null, height: null, duration: null, orderIndex: 0, mediaUrl: '/image.jpg', thumbnailUrl: '/thumb.jpg' }] };
const account: Account = { id: 'account', latestProfilePicUrl: '/profile.jpg', postCount: 1, createdAt: '', updatedAt: '', lastIndexedAt: null };

describe('PostModal', () => {
  it('keeps the post open when profile history or fullscreen closes with Escape', () => {
    const onClose = vi.fn();
    const { rerender } = render(<PostModal post={post} account={account} isOpen isLoading={false} onClose={onClose} />);
    const profile = screen.getByRole('button', { name: '프로필 히스토리 보기' });
    profile.focus();
    fireEvent.click(profile);
    fireEvent.keyDown(screen.getByRole('dialog', { name: '프로필 히스토리' }), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(profile).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '전체화면 열기' }));
    fireEvent.keyDown(screen.getByRole('dialog', { name: '미디어 전체화면' }), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: '게시물 상세' })).toBeInTheDocument();
    fireEvent.click(profile);
    rerender(<PostModal post={{ ...post, id: 'next' }} account={account} isOpen isLoading={false} onClose={onClose} />);
    expect(screen.queryByRole('dialog', { name: '프로필 히스토리' })).not.toBeInTheDocument();
  });
});
