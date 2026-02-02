interface PreviewGridProps {
	files: File[];
	previews: string[];
	onRemove: (index: number) => void;
	onAddMore: () => void;
}

const PreviewGrid = ({ files, previews, onRemove, onAddMore }: PreviewGridProps) => {
	return (
		<div className="space-y-3">
			<div className="grid grid-cols-3 gap-3">
				{previews.map((preview, index) => (
					<div key={index} className="group relative aspect-square overflow-hidden rounded-lg">
						{files[index].type.startsWith('image/') ? (
							<img
								src={preview}
								alt={`Preview ${index + 1}`}
								className="h-full w-full object-cover"
							/>
						) : (
							<video
								src={preview}
								className="h-full w-full object-cover"
							/>
						)}
						<button
							type="button"
							onClick={() => onRemove(index)}
							className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
				))}
			</div>
			<button
				type="button"
				onClick={onAddMore}
				className="w-full rounded-lg border border-[#7EC8FF] bg-white/50 px-3 py-2 text-sm font-medium text-[#2D3748] transition hover:bg-[#7EC8FF]/10 dark:border-brand-400 dark:bg-white/5 dark:text-white dark:hover:bg-brand-400/10"
			>
				파일 추가
			</button>
		</div>
	);
};

export default PreviewGrid;
