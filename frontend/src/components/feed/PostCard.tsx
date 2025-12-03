import type { Post } from '../../lib/api/types';
import { getResponsiveImageProps } from '../../lib/utils/image';

interface PostCardProps {
  post: Post;
  onOpen: (postId: string) => void;
}

const PostCard = ({ post, onOpen }: PostCardProps) => {
  const firstMedia = post.media[0];

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/70 shadow-lg shadow-slate-950/40 transition hover:-translate-y-1 hover:border-brand-400/60 hover:shadow-xl hover:shadow-brand-400/20">
      <button
        type="button"
        onClick={() => onOpen(post.id)}
        className="flex h-full w-full flex-col text-left"
      >
        <div className="relative aspect-square w-full overflow-hidden">
          {firstMedia ? (

            <img
              {...getResponsiveImageProps(post.accountId, firstMedia.thumbnailUrl, [300, 600])}
              alt={(post.caption ?? '게시물 이미지').slice(0, 40)}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />

            // firstMedia.type === 'video' ? (
            //   <div className="flex h-full w-full items-center justify-center bg-slate-900">
            //     <svg
            //       xmlns="http://www.w3.org/2000/svg"
            //       viewBox="0 0 24 24"
            //       fill="currentColor"
            //       className="h-12 w-12 text-white/50"
            //     >
            //       <path
            //         fillRule="evenodd"
            //         d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
            //         clipRule="evenodd"
            //       />
            //     </svg>
            //   </div>
            // ) : (
            //   <img
            //     {...getResponsiveImageProps(post.accountId, firstMedia.thumbnailUrl, [300, 600])}
            //     alt={(post.caption ?? '게시물 이미지').slice(0, 40)}
            //     className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            //     loading="lazy"
            //     sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            //   />
            // )
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-900 text-sm text-slate-500">
              미디어 없음
            </div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur">
            {new Intl.DateTimeFormat('ko', {
              month: '2-digit',
              day: '2-digit'
            }).format(new Date(post.postedAt))}
          </span>
          {post.media.length > 1 ? (
            <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-1 text-xs font-semibold text-white backdrop-blur">
              +{post.media.length - 1}
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-2 px-4 py-3">
          <p className="line-clamp-2 text-sm text-slate-200">
            {post.caption || '설명 없음'}
          </p>
          {post.tags?.length ? (
            <div className="flex flex-wrap gap-1">
              {post.tags.map((tag) => (
                <span
                  key={`${post.id}-${tag}`}
                  className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-brand-200"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </button>
    </article>
  );
};

export default PostCard;
