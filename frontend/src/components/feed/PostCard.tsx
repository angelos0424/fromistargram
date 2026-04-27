import type { Post } from '../../lib/api/types';
import { getResponsiveImageProps } from '../../lib/utils/image';

interface PostCardProps {
  post: Post;
  onOpen: (postId: string) => void;
}

const PostCard = ({ post, onOpen }: PostCardProps) => {
  const firstMedia = post.media[0];
  const caption = post.caption || post.textContent || '설명 없음';

  return (
    <article className="group relative aspect-[4/5] overflow-hidden bg-black transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
      <button
        type="button"
        onClick={() => onOpen(post.id)}
        className="block h-full w-full text-left"
      >
        {firstMedia ? (
          <img
            {...getResponsiveImageProps(post.accountId, firstMedia.thumbnailUrl, [300, 600])}
            alt={caption.slice(0, 40)}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            sizes="(max-width: 768px) 33vw, 290px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-900 text-sm text-neutral-500">
            미디어 없음
          </div>
        )}
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs font-bold text-white backdrop-blur">
          {post.media.length > 1 ? `+${post.media.length - 1}` : post.type}
        </div>
        {firstMedia?.type === 'video' ? (
          <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur">
            ▶
          </div>
        ) : null}
        <div className="absolute bottom-0 left-0 right-0 translate-y-full bg-gradient-to-t from-black via-black/75 to-transparent px-3 pb-3 pt-12 text-white transition-transform duration-300 group-hover:translate-y-0 group-focus-within:translate-y-0">
          <div className="mb-1 text-xs font-bold text-white/80">
            {new Intl.DateTimeFormat('ko', {
              month: '2-digit',
              day: '2-digit'
            }).format(new Date(post.postedAt))}
          </div>
          <p className="line-clamp-4 text-[13px] leading-snug">
            {caption}
          </p>
        </div>
      </button>
    </article>
  );
};

export default PostCard;
