import type { CSSProperties } from 'react';
import type { Post } from '../../lib/api/types';
import PostCard from './PostCard';

interface PostGridProps {
  columns: number;
  posts: Post[];
  isLoading: boolean;
  onOpenPost: (postId: string) => void;
}

const PostGrid = ({
  columns,
  posts,
  isLoading,
  onOpenPost
}: PostGridProps) => {
  const gridStyle = {
    '--archive-columns': columns
  } as CSSProperties;

  if (isLoading) {
    return (
      <div className="archive-grid" style={gridStyle}>
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            key={`post-skeleton-${index}`}
            className="aspect-[4/5] animate-pulse bg-white/58 shadow-[0_10px_26px_rgba(45,55,72,0.08)] ring-1 ring-white/60 sm:rounded-[22px]"
          />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="mx-4 flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-[24px] border border-dashed border-white/70 bg-white/66 p-10 text-center shadow-[0_12px_30px_rgba(45,55,72,0.08)] backdrop-blur sm:mx-0">
        <h3 className="text-lg font-bold text-[#2D3748]">
          표시할 게시물이 없습니다.
        </h3>
        <p className="text-sm text-[#7B8794]">
          다른 계정이나 날짜 범위로 다시 시도해 보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="archive-grid" style={gridStyle}>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onOpen={onOpenPost} />
      ))}
    </div>
  );
};

export default PostGrid;
