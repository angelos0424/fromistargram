import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { MediaItem } from '../../../lib/api/types';
import PostMediaCarousel from '../PostMediaCarousel';

const sampleMedia: MediaItem[] = [
  {
    id: 'media-1',
    orderIndex: 0,
    type: 'image',
    filename: 'media-1.jpg',
    mime: 'image/jpeg',
    width: 1080,
    height: 1350,
    duration: null,
    thumbnailUrl: 'https://example.com/media-1-thumb.jpg',
    mediaUrl: 'https://example.com/media-1.jpg'
  },
  {
    id: 'media-2',
    orderIndex: 1,
    type: 'video',
    filename: 'media-2.mp4',
    mime: 'video/mp4',
    width: 1080,
    height: 1080,
    duration: 10,
    thumbnailUrl: 'https://example.com/media-2-thumb.jpg',
    mediaUrl: 'https://example.com/media-2.mp4'
  }
];

const ControlledCarousel = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <PostMediaCarousel
      media={sampleMedia}
      activeIndex={activeIndex}
      onActiveIndexChange={setActiveIndex}
    />
  );
};

describe('PostMediaCarousel', () => {
  it('renders fallback when no media is available', () => {
    render(
      <PostMediaCarousel media={[]} activeIndex={0} onActiveIndexChange={() => undefined} />
    );

    expect(screen.getByText('표시할 미디어가 없습니다.')).toBeInTheDocument();
  });

  it('allows keyboard navigation between media items', () => {
    render(<ControlledCarousel />);

    const group = screen.getByRole('group', { name: '게시물 미디어' });
    group.focus();
    fireEvent.keyDown(group, { key: 'ArrowRight' });

    const tabs = screen.getAllByRole('tab');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });
});
