import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent
} from 'react';
import type { Account, Post } from '../../lib/api/types';
import { copyToClipboard, sharePost } from '../../lib/share/sharePost';
import { getCaptionLink, parseCaption } from '../../lib/text/parseCaption';
import PostMediaCarousel from '../post/PostMediaCarousel';
import ProfileHistoryTimeline from '../post/ProfileHistoryTimeline';

interface PostModalProps {
  post: Post | null;
  account: Account | null;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
}

const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const PostModal = ({
  post,
  account,
  isOpen,
  isLoading,
  onClose
}: PostModalProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isCaptionExpanded, setCaptionExpanded] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const [isProfileHistoryOpen, setProfileHistoryOpen] = useState(false);

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
  }, [post?.id]);

  useEffect(() => {
    setSelectedProfileId(null);
  }, [account?.id]);

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

  const captionSegments = useMemo(
    () => parseCaption(post?.caption ?? ''),
    [post?.caption]
  );

  const shareUrl = useMemo(() => {
    if (!post) {
      return '';
    }

    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://fromistargram.local';

    return `${origin}/post/${post.id}`;
  }, [post]);

  const handleShare = async () => {
    if (!post) {
      return;
    }

    const result = await sharePost({
      url: shareUrl,
      title: `${account?.displayName ?? post.accountId}의 게시물`,
      text: post.caption ?? undefined
    });

    if (result === 'shared') {
      setShareFeedback('공유 시트가 열렸습니다.');
    } else if (result === 'copied') {
      setShareFeedback('링크가 복사되었습니다. 원하는 곳에 붙여넣기 하세요.');
    } else {
      setShareFeedback('브라우저가 공유를 지원하지 않습니다. 링크 복사를 이용해 주세요.');
    }
  };

  const handleCopy = async () => {
    if (!post) {
      return;
    }

    await copyToClipboard(shareUrl);
    setShareFeedback('링크가 복사되었습니다.');
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  const hasContent = Boolean(post) && !isLoading;
  const postDetail = hasContent ? post : null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-gradient-to-br from-[rgba(255,212,229,0.3)] via-[rgba(212,228,255,0.3)] to-[rgba(228,212,255,0.3)] px-3 py-4 backdrop-blur-[12px] sm:items-center sm:px-6 sm:py-8"
        onMouseDown={handleBackdropClick}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="post-detail-title"
          className="flex w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-white/60 bg-white/95 shadow-[0_16px_48px_rgba(0,0,0,0.12)] backdrop-blur-[8px] focus:outline-none sm:h-[90vh] sm:max-h-[95vh]"
          tabIndex={-1}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="flex flex-col gap-3 border-b border-white/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex flex-col gap-1">
              <h3 id="post-detail-title" className="text-lg font-semibold text-[#2D3748]">
                게시물 상세
              </h3>
              {post ? (
                <p className="text-xs text-[#7B8794]">
                  {new Date(post.postedAt).toLocaleString('ko-KR')}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="self-end rounded-full border border-white/60 bg-gradient-to-r from-[#FFB8D4] to-[#D4C4FF] px-4 py-2 text-sm text-white shadow-[0_4px_16px_rgba(255,184,212,0.35)] transition hover:shadow-[0_6px_20px_rgba(255,184,212,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB8D4] sm:self-auto"
              aria-label="게시물 상세 닫기"
            >
              닫기
            </button>
          </header>
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5 sm:p-6 lg:flex-row">
            <div className="flex flex-1 min-h-0 min-w-0 flex-col gap-5">
              <PostMediaCarousel
                media={post?.media ?? []}
                accountId={post?.accountId ?? ''}
                activeIndex={activeIndex}
                onActiveIndexChange={setActiveIndex}
                isLoading={isLoading}
              />
            </div>
            <aside className="flex w-full flex-col gap-5 rounded-[20px] border border-white/60 bg-white/90 p-5 backdrop-blur-[8px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] sm:p-6 lg:max-w-sm">
              {isLoading ? (
                <div className="flex flex-1 items-center justify-center text-sm text-[#7B8794]">
                  게시물 정보를 불러오는 중입니다.
                </div>
              ) : postDetail ? (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setProfileHistoryOpen(true)}
                        className="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/60 bg-white/90 text-base shadow-[0_4px_12px_rgba(0,0,0,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7EC8FF] backdrop-blur-[8px]"
                        aria-label="프로필 히스토리 보기"
                      >
                        <img
                          src={account?.latestProfilePicUrl ?? ''}
                          alt={account?.displayName}
                          className="h-full w-full object-cover"
                        />
                      </button>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-[#2D3748]">
                          {account?.displayName ?? postDetail.accountId}
                        </span>
                        <span className="text-xs text-[#7B8794]">
                          @{account?.username ?? postDetail.accountId}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-[#2D3748]">본문</h4>
                      <div
                        className={`whitespace-pre-wrap text-sm leading-relaxed text-[#2D3748] ${isCaptionExpanded
                          ? ''
                          : 'overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:6] [-webkit-box-orient:vertical]'
                          }`}
                      >
                        {captionSegments.length
                          ? captionSegments.map((segment, index) => {
                            if (segment.type === 'text') {
                              return <span key={`caption-text-${index}`}>{segment.value}</span>;
                            }

                            const href = getCaptionLink(segment);
                            return (
                              <a
                                key={`caption-link-${index}`}
                                href={href ?? '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-[#7EC8FF] underline decoration-dotted underline-offset-4 hover:text-[#A8D8FF]"
                              >
                                {segment.value}
                              </a>
                            );
                          })
                          : postDetail.caption ?? '본문이 없습니다.'}
                      </div>
                      {(postDetail.caption?.length ?? 0) > 160 ? (
                        <button
                          type="button"
                          className="text-xs text-[#7EC8FF] underline underline-offset-4 hover:text-[#A8D8FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7EC8FF]"
                          onClick={() => setCaptionExpanded((prev) => !prev)}
                        >
                          {isCaptionExpanded ? '접기' : '더보기'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-[#2D3748]">공유</h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleShare}
                        className="flex-1 rounded-full border border-white/60 bg-gradient-to-r from-[#7EC8FF] to-[#8CE8D0] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(126,200,255,0.35)] transition hover:shadow-[0_6px_20px_rgba(126,200,255,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7EC8FF]"
                      >
                        공유하기
                      </button>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex-1 rounded-full border border-white/60 bg-white/90 px-4 py-2 text-sm text-[#7B8794] transition hover:border-[#7EC8FF] hover:text-[#7EC8FF] hover:shadow-[0_0_12px_rgba(126,200,255,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7EC8FF] backdrop-blur-[8px]"
                      >
                        링크 복사
                      </button>
                    </div>
                    {shareFeedback ? (
                      <p className="text-xs text-[#7EC8FF]" aria-live="polite">
                        {shareFeedback}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-[#7B8794]">
                  게시물을 찾을 수 없습니다.
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      {isProfileHistoryOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-gradient-to-br from-[rgba(255,212,229,0.4)] via-[rgba(212,228,255,0.4)] to-[rgba(228,212,255,0.4)] px-4 backdrop-blur-[12px]"
          onClick={() => setProfileHistoryOpen(false)}
        >
          <div
            className="w-full max-w-md space-y-4 rounded-[24px] border border-white/60 bg-white/95 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.12)] backdrop-blur-[8px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#2D3748]">프로필 히스토리</h3>
              <button
                type="button"
                onClick={() => setProfileHistoryOpen(false)}
                className="rounded-full border border-white/60 bg-gradient-to-r from-[#FFB8D4] to-[#D4C4FF] px-3 py-1 text-xs text-white shadow-[0_0_8px_rgba(255,184,212,0.3)] transition hover:shadow-[0_0_12px_rgba(255,184,212,0.5)]"
              >
                닫기
              </button>
            </div>
            <ProfileHistoryTimeline
              pictures={account?.profilePictures ?? []}
              selectedId={selectedProfileId}
              onSelect={setSelectedProfileId}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default PostModal;
