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
  onMediaClick?: () => void;
}

const PostMediaCarousel = ({
  media,
  accountId,
  activeIndex,
  onActiveIndexChange,
  isLoading,
  onMediaClick
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
        img.src = item.thumbnailUrl;
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
        className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[20px] border border-white/60 bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7EC8FF] backdrop-blur-[8px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:rounded-2xl dark:border-white/10 dark:bg-black/40 dark:focus-visible:ring-brand-400"
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label="게시물 미디어"
        aria-live="polite"
      >
        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-[#7B8794] dark:text-slate-400">
            미디어를 불러오는 중입니다...
          </div>
        ) : activeMedia ? (
          activeMedia.type === 'video' ? (
            <div
              className={`h-full w-full ${onMediaClick ? 'cursor-pointer' : ''}`}
              onClick={onMediaClick}
            >
              <VideoPlayer
                key={activeMedia.id}
                media={activeMedia}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <img
              key={activeMedia.id}
              {...getResponsiveImageProps(accountId, activeMedia.filename, [600, 1080])}
              alt="게시물 이미지"
              className={`max-h-full w-full object-contain ${onMediaClick ? 'cursor-pointer' : ''}`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 60vw"
              onClick={onMediaClick}
            />
          )
        ) : (
          <div className="text-sm text-[#7B8794] dark:text-slate-400">표시할 미디어가 없습니다.</div>
        )}
        {media.length > 1 ? (
          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/60 bg-white/90 px-3 py-1 text-xs font-medium text-[#2D3748] shadow-[0_4px_12px_rgba(0,0,0,0.08)] backdrop-blur-[8px] dark:border-white/10 dark:bg-black/60 dark:text-white dark:shadow-lg dark:shadow-black/40">
            {slideLabel}
          </div>
        ) : null}
        {media.length > 1 ? (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-white/95 text-lg text-[#7B8794] shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition hover:bg-gradient-to-r hover:from-[#7EC8FF] hover:to-[#B8A4F0] hover:text-white hover:shadow-[0_4px_16px_rgba(126,200,255,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7EC8FF] dark:border-white/20 dark:bg-black/40 dark:text-white dark:shadow-none dark:hover:border-brand-400 dark:hover:text-brand-200 dark:focus-visible:ring-brand-400"
              onClick={() => onActiveIndexChange(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
              aria-label="이전 미디어"
            >
              ‹
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-white/95 text-lg text-[#7B8794] shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition hover:bg-gradient-to-r hover:from-[#7EC8FF] hover:to-[#B8A4F0] hover:text-white hover:shadow-[0_4px_16px_rgba(126,200,255,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7EC8FF] dark:border-white/20 dark:bg-black/40 dark:text-white dark:shadow-none dark:hover:border-brand-400 dark:hover:text-brand-200 dark:focus-visible:ring-brand-400"
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
          className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20 hover:scrollbar-thumb-white/30 dark:scrollbar-thumb-white/10 dark:hover:scrollbar-thumb-white/20"
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
              className={`flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7EC8FF] ${activeIndex === index ? 'border-[#7EC8FF] shadow-[0_0_12px_rgba(126,200,255,0.4)] dark:border-brand-400' : 'border-white/60 opacity-70 hover:opacity-100 dark:border-white/10'
                }`}
              onClick={() => handleSelect(index)}
            >
              {item.type === 'video' ? (
                <img
                  src={item.thumbnailUrl}
                  alt={`${index + 1}번째 미디어 썸네일`}
                  className="h-full w-full object-cover"
                  loading="lazy"
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
