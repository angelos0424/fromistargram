import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent
} from 'react';
import type { MediaItem, SharedMedia } from '../../lib/api/types';
import { copyToClipboard } from '../../lib/share/sharePost';
import PostMediaCarousel from '../post/PostMediaCarousel';

interface SharedMediaModalProps {
  mediaGroup: SharedMedia[] | null;
  isOpen: boolean;
  onClose: () => void;
}

const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const SharedMediaModal = ({
  mediaGroup,
  isOpen,
  onClose
}: SharedMediaModalProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCaptionExpanded, setCaptionExpanded] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedElementRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = '';
      if (lastFocusedElementRef.current instanceof HTMLElement) {
        lastFocusedElementRef.current.focus();
      }
      return;
    }

    lastFocusedElementRef.current = document.activeElement;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
        );
        if (!focusable.length) {
          event.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    setActiveIndex(0);
    setCaptionExpanded(false);
    setShareFeedback(null);
  }, [mediaGroup]);

  useEffect(() => {
    if (!shareFeedback) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setShareFeedback(null);
    }, 2200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [shareFeedback]);

  const activeMedia = mediaGroup?.[activeIndex];

  const handleCopy = async () => {
    if (!activeMedia) {
      return;
    }

    await copyToClipboard(activeMedia.mediaUrl);
    setShareFeedback('링크가 복사되었습니다.');
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const carouselMedia: MediaItem[] = useMemo(() => {
    if (!mediaGroup) return [];
    return mediaGroup.map((item, index) => ({
      id: item.id,
      orderIndex: index,
      filename: item.mediaUrl,
      mime: item.mime,
      width: item.width ?? null,
      height: item.height ?? null,
      duration: item.duration ?? null,
      type: item.mime.startsWith('video/') ? 'video' : 'image',
      mediaUrl: item.mediaUrl,
      thumbnailUrl: item.thumbnailUrl ?? item.mediaUrl
    }));
  }, [mediaGroup]);

  if (!isOpen) {
    return null;
  }

  const hasContent = Boolean(mediaGroup) && mediaGroup!.length > 0;
  const primaryItem = hasContent ? mediaGroup![0] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-gradient-to-br from-[rgba(255,212,229,0.3)] via-[rgba(212,228,255,0.3)] to-[rgba(228,212,255,0.3)] px-3 py-4 backdrop-blur-[12px] sm:items-center sm:px-6 sm:py-8 dark:bg-black/70 dark:backdrop-blur"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shared-media-title"
        className="flex w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-white/60 bg-white/95 shadow-[0_16px_48px_rgba(0,0,0,0.12)] backdrop-blur-[8px] focus:outline-none sm:h-[90vh] sm:max-h-[95vh] dark:rounded-3xl dark:border-white/10 dark:bg-slate-950 dark:shadow-2xl dark:shadow-black/60"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex flex-col gap-3 border-b border-white/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-white/10">
          <div className="flex flex-col gap-1">
            <h3 id="shared-media-title" className="text-lg font-semibold text-[#2D3748] dark:text-white">
              공유 미디어 상세
            </h3>
            {primaryItem ? (
              <p className="text-xs text-[#7B8794] dark:text-slate-400">
                {new Date(primaryItem.uploadedAt).toLocaleString('ko-KR')}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="self-end rounded-full border border-white/60 bg-white/95 px-4 py-2 text-sm text-[#7B8794] shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition hover:bg-gradient-to-r hover:from-[#FFB8D4] hover:to-[#D4C4FF] hover:text-white hover:shadow-[0_4px_16px_rgba(255,184,212,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB8D4] sm:self-auto dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:shadow-sm dark:hover:border-brand-400 dark:hover:bg-brand-400/20 dark:hover:text-white dark:focus-visible:ring-brand-400"
            aria-label="닫기"
          >
            닫기
          </button>
        </header>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5 sm:p-6 lg:flex-row">
          <div className="flex flex-1 min-h-0 min-w-0 flex-col gap-5">
            <PostMediaCarousel
              media={carouselMedia}
              accountId=""
              activeIndex={activeIndex}
              onActiveIndexChange={setActiveIndex}
              isLoading={false}
            />
          </div>
          <aside className="flex w-full flex-col gap-5 rounded-[20px] border border-white/60 bg-white/90 p-5 backdrop-blur-[8px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] sm:p-6 lg:max-w-sm dark:rounded-2xl dark:border-white/10 dark:bg-white/5 dark:shadow-none">
            {primaryItem ? (
              <>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-[#2D3748] dark:text-white">설명</h4>
                    <div
                      className={`whitespace-pre-wrap text-sm leading-relaxed text-[#2D3748] ${isCaptionExpanded
                        ? ''
                        : 'overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:6] [-webkit-box-orient:vertical]'
                        }`}
                    >
                      {primaryItem.caption || '설명이 없습니다.'}
                    </div>
                    {(primaryItem.caption?.length ?? 0) > 160 ? (
                      <button
                        type="button"
                        className="text-xs text-[#7EC8FF] underline underline-offset-4 hover:text-[#A8D8FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7EC8FF] dark:text-brand-200 dark:hover:text-brand-100 dark:focus-visible:ring-brand-400"
                        onClick={() => setCaptionExpanded((prev) => !prev)}
                      >
                        {isCaptionExpanded ? '접기' : '더보기'}
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[#2D3748] dark:text-white">공유</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex-1 rounded-full border border-white/60 bg-white/90 px-4 py-2 text-sm text-[#7B8794] transition hover:border-[#7EC8FF] hover:text-[#7EC8FF] hover:shadow-[0_0_12px_rgba(126,200,255,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7EC8FF] backdrop-blur-[8px] dark:border-white/20 dark:bg-white/10 dark:text-slate-100 dark:hover:border-brand-300 dark:hover:text-brand-200 dark:focus-visible:ring-brand-400"
                    >
                      원본 링크 복사
                    </button>
                  </div>
                  {shareFeedback ? (
                    <p className="text-xs text-[#7EC8FF] dark:text-brand-200" aria-live="polite">
                      {shareFeedback}
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-[#7B8794] dark:text-slate-400">
                미디어를 찾을 수 없습니다.
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default SharedMediaModal;
