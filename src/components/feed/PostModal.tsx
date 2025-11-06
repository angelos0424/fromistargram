import { useEffect, useMemo, useState } from 'react';
import type { Post } from '../../lib/api/types';

interface PostModalProps {
  post: Post | null;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
}

const PostModal = ({
  post,
  isOpen,
  isLoading,
  onClose
}: PostModalProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (post) {
      setActiveIndex(0);
    }
  }, [post]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const activeMedia = useMemo(
    () => (post ? post.media[activeIndex] : null),
    [post, activeIndex]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex h-[90vh] w-[90vw] max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/60">
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              게시물 상세
            </h3>
            {post ? (
              <p className="text-xs text-slate-400">
                {new Date(post.postedAt).toLocaleString('ko')}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-slate-200 transition hover:border-brand-400 hover:bg-brand-400/20 hover:text-white"
          >
            닫기
          </button>
        </header>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 lg:flex-row">
          <div className="flex flex-1 flex-col gap-3">
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-black/40">
              {isLoading ? (
                <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                  로딩 중...
                </div>
              ) : activeMedia ? (
                activeMedia.type === 'video' ? (
                  <video
                    controls
                    className="h-full w-full object-contain"
                    src={activeMedia.mediaUrl}
                    poster={activeMedia.thumbnailUrl}
                  />
                ) : (
                  <img
                    src={activeMedia.mediaUrl}
                    alt={post?.caption}
                    className="h-full w-full object-contain"
                  />
                )
              ) : (
                <div className="text-sm text-slate-400">미디어 없음</div>
              )}
            </div>
            {post && post.media.length > 1 ? (
              <div className="flex gap-3 overflow-x-auto">
                {post.media.map((media, index) => (
                  <button
                    key={media.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border ${
                      index === activeIndex
                        ? 'border-brand-400'
                        : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {media.type === 'video' ? (
                      <video
                        src={media.mediaUrl}
                        poster={media.thumbnailUrl}
                        muted
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <img
                        src={media.thumbnailUrl}
                        alt={`media-${index}`}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex max-h-full w-full flex-col gap-4 rounded-2xl border border-white/5 bg-white/5 p-6 lg:max-w-sm">
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                데이터를 불러오는 중입니다.
              </div>
            ) : post ? (
              <>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-white">
                    캡션
                  </h4>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                    {post.caption}
                  </p>
                </div>
                {post.hashtags.length ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-white">
                      해시태그
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {post.hashtags.map((tag) => (
                        <span
                          key={`${post.id}-${tag}`}
                          className="rounded-full bg-brand-400/20 px-3 py-1 text-xs font-medium text-brand-200"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="mt-auto rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-xs text-slate-400">
                  <p>아이디: {post.id}</p>
                  <p>미디어 수: {post.media.length}</p>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                게시물을 찾을 수 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostModal;
