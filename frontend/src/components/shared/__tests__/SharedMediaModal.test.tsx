import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SharedMediaModal from '../SharedMediaModal';
import { copyToClipboard } from '../../../lib/share/sharePost';
import type { SharedMedia } from '../../../lib/api/types';
vi.mock('../../../lib/share/sharePost', () => ({ copyToClipboard: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../post/PostMediaCarousel', () => ({ default: () => <div>미디어</div> }));

describe('SharedMediaModal', () => {
  it.each(['image/jpeg', 'video/mp4'])('copies the original %s link when a thumbnail exists', async (mime) => {
    const media: SharedMedia = { id: 'one', filename: 'one', originalName: 'one', mime, size: 100, uploadedAt: '2026-10-23T00:00:00Z', mediaUrl: 'https://example.com/original', thumbnailUrl: 'https://example.com/thumbnail' };
    render(<SharedMediaModal mediaGroup={[media]} isOpen onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: '원본 링크 복사' }));
    await waitFor(() => expect(copyToClipboard).toHaveBeenLastCalledWith(media.mediaUrl));
  });
});
