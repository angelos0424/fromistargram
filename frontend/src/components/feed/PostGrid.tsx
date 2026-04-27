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
            className="aspect-[4/5] animate-pulse bg-neutral-200"
          />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="mx-4 flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center sm:mx-0">
        <h3 className="text-lg font-bold text-neutral-950">
          표시할 게시물이 없습니다.
        </h3>
        <p className="text-sm text-neutral-500">
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
