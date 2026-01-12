import type { SharedMedia } from '../../lib/api/types';
import SharedMediaCard from './SharedMediaCard';

interface SharedMediaGridProps {
	mediaGroups: SharedMedia[][];
	isLoading?: boolean;
	onGroupClick: (group: SharedMedia[]) => void;
}

const SharedMediaGrid = ({ mediaGroups, isLoading, onGroupClick }: SharedMediaGridProps) => {
	if (isLoading) {
		return (
			<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
				{Array.from({ length: 8 }).map((_, index) => (
					<div
						key={`skeleton-${index}`}
						className="aspect-square animate-pulse rounded-xl bg-gradient-to-r from-white/60 via-[rgba(126,200,255,0.2)] to-white/60 dark:from-white/5 dark:via-white/10 dark:to-white/5"
					/>
				))}
			</div>
		);
	}

	if (mediaGroups.length === 0) {
		return (
			<div className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/60 bg-white/85 px-6 py-16 backdrop-blur-[8px] dark:border-white/10 dark:bg-white/5">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="mb-4 h-16 w-16 text-[#7EC8FF]/50 dark:text-brand-400/50"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
				<p className="text-sm font-medium text-[#2D3748] dark:text-white">
					아직 업로드된 미디어가 없습니다
				</p>
				<p className="mt-1 text-xs text-[#7B8794] dark:text-slate-400">
					업로드 버튼을 클릭하여 첫 미디어를 추가해보세요
				</p>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
			{mediaGroups.map((group) => (
				<SharedMediaCard
					key={group[0].id}
					mediaGroup={group}
					onClick={() => onGroupClick(group)}
				/>
			))}
		</div>
	);
};

export default SharedMediaGrid;
