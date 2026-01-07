import type { Post } from '../../lib/api/types';
import PostCard from './PostCard';

interface PostGridProps {
  posts: Post[];
  isLoading: boolean;
  onOpenPost: (postId: string) => void;
}

const PostGrid = ({
  posts,
  isLoading,
  onOpenPost
}: PostGridProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`post-skeleton-${index}`}
            className="aspect-square animate-pulse rounded-[20px] bg-gradient-to-r from-white/60 via-[rgba(126,200,255,0.2)] to-white/60 backdrop-blur-[8px]"
          />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-white/60 bg-white/85 p-10 text-center backdrop-blur-[8px]">
        <h3 className="text-lg font-semibold text-[#2D3748]">
          표시할 게시물이 없습니다.
        </h3>
        <p className="text-sm text-[#7B8794]">
          다른 계정이나 날짜 범위로 다시 시도해 보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onOpen={onOpenPost} />
      ))}
    </div>
  );
};

export default PostGrid;
