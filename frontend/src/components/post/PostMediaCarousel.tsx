import { useEffect, useMemo, useRef } from 'react';
import type { MediaItem } from '../../lib/api/types';
import { getResponsiveImageProps } from '../../lib/utils/image';
import VideoPlayer from './VideoPlayer';

interface PostMediaCarouselProps {
  media: MediaItem[];
  accountId: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  isLoading?: boolean;
}

const PostMediaCarousel = ({
  media,
  accountId,
  activeIndex,
  onActiveIndexChange,
  isLoading
}: PostMediaCarouselProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeMedia = media[activeIndex];

  useEffect(() => {
    if (!activeMedia) {
      return;
    }

    const preloadTargets = [media[activeIndex - 1], media[activeIndex + 1]].filter(
      Boolean
    ) as MediaItem[];

    preloadTargets.forEach((item) => {
      if (item.type === 'image') {
        const img = new Image();
        img.src = item.mediaUrl;
      }
    });
  }, [activeIndex, activeMedia, media]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const nextIndex = Math.max(0, activeIndex - 1);
        if (nextIndex !== activeIndex) {
          onActiveIndexChange(nextIndex);
        }
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextIndex = Math.min(media.length - 1, activeIndex + 1);
        if (nextIndex !== activeIndex) {
          onActiveIndexChange(nextIndex);
        }
      }
    };

    node.addEventListener('keydown', handleKeyDown);

    return () => {
      node.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeIndex, media.length, onActiveIndexChange]);

  useEffect(() => {
    containerRef.current?.focus();
  }, [activeIndex]);

  const handleSelect = (index: number) => {
    onActiveIndexChange(index);
    containerRef.current?.focus();
  };

  const slideLabel = useMemo(() => {
    if (!media.length) {
      return '';
    }

    return `${activeIndex + 1} / ${media.length}`;
  }, [activeIndex, media.length]);

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={containerRef}
        className="relative flex w-full max-h-[70vh] min-h-[280px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label="게시물 미디어"
        aria-live="polite"
      >
        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
            미디어를 불러오는 중입니다...
          </div>
        ) : activeMedia ? (
          activeMedia.type === 'video' ? (
            <VideoPlayer
              key={activeMedia.id}
              media={activeMedia}
              className="h-full w-full object-contain"
            />
          ) : (
            <img
              key={activeMedia.id}
              {...getResponsiveImageProps(accountId, activeMedia.filename, [600, 1080])}
              alt="게시물 이미지"
              className="max-h-full w-full object-contain"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 60vw"
            />
          )
        ) : (
          <div className="text-sm text-slate-400">표시할 미디어가 없습니다.</div>
        )}
        {media.length > 1 ? (
          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white shadow-lg shadow-black/40">
            {slideLabel}
          </div>
        ) : null}
        {media.length > 1 ? (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-lg text-white transition hover:border-brand-400 hover:text-brand-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              onClick={() => onActiveIndexChange(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
              aria-label="이전 미디어"
            >
              ‹
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-lg text-white transition hover:border-brand-400 hover:text-brand-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              onClick={() =>
                onActiveIndexChange(Math.min(media.length - 1, activeIndex + 1))
              }
              disabled={activeIndex === media.length - 1}
              aria-label="다음 미디어"
            >
              ›
            </button>
          </>
        ) : null}
      </div>
      {media.length > 1 ? (
        <div
          className="flex items-center justify-start gap-2 overflow-x-auto p-1"
          role="tablist"
          aria-label="미디어 썸네일"
        >
          {media.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={activeIndex === index}
              aria-label={`${index + 1}번째 미디어`}
              className={`flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                activeIndex === index ? 'border-brand-400' : 'border-white/10 opacity-70 hover:opacity-100'
              }`}
              onClick={() => handleSelect(index)}
            >
              {item.type === 'video' ? (
                <video
                  className="h-full w-full object-cover"
                  src={item.mediaUrl}
                  poster={item.thumbnailUrl}
                  muted
                  preload="metadata"
                  tabIndex={-1}
                />
              ) : (
                <img
                  {...getResponsiveImageProps(accountId, item.filename, [100, 200])}
                  alt={`${index + 1}번째 미디어 썸네일`}
                  className="h-full w-full object-cover"
                  sizes="56px"
                />
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default PostMediaCarousel;
