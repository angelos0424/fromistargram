import type { CSSProperties } from 'react';
import type { SharedMedia } from '../../lib/api/types';
import SharedMediaCard from './SharedMediaCard';

interface SharedMediaGridProps {
	columns: number;
	mediaGroups: SharedMedia[][];
	isLoading?: boolean;
	onGroupClick: (group: SharedMedia[]) => void;
}

const SharedMediaGrid = ({ columns, mediaGroups, isLoading, onGroupClick }: SharedMediaGridProps) => {
	const gridStyle = {
		'--archive-columns': columns
	} as CSSProperties;

	if (isLoading) {
		return (
			<div className="archive-grid" style={gridStyle}>
				{Array.from({ length: 12 }).map((_, index) => (
					<div
						key={`skeleton-${index}`}
						className="aspect-[4/5] animate-pulse bg-neutral-200"
					/>
				))}
			</div>
		);
	}

	if (mediaGroups.length === 0) {
		return (
			<div className="mx-4 flex w-auto flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white px-6 py-16 sm:mx-0">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="mb-4 h-16 w-16 text-neutral-300"
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
				<p className="text-sm font-bold text-neutral-950">
					아직 업로드된 미디어가 없습니다
				</p>
				<p className="mt-1 text-xs text-neutral-500">
					업로드 버튼을 클릭하여 첫 미디어를 추가해보세요
				</p>
			</div>
		);
	}

	return (
		<div className="archive-grid" style={gridStyle}>
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
