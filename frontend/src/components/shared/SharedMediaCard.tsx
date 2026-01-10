import type { SharedMedia } from '../../lib/api/types';

interface SharedMediaCardProps {
	media: SharedMedia;
	onClick: () => void;
}

const SharedMediaCard = ({ media, onClick }: SharedMediaCardProps) => {
	const isVideo = media.mime.startsWith('video/');
	const thumbnailUrl = media.thumbnailUrl || media.mediaUrl;

	return (
		<button
			type="button"
			onClick={onClick}
			className="group relative aspect-square overflow-hidden rounded-xl border border-white/60 bg-white/95 shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-all hover:scale-[1.02] hover:shadow-[0_6px_20px_rgba(126,200,255,0.25)] dark:border-white/10 dark:bg-white/5 dark:shadow-none dark:hover:border-white/20 dark:hover:shadow-lg dark:hover:shadow-black/20"
		>
			<img
				src={thumbnailUrl}
				alt={media.originalName}
				className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
				loading="lazy"
			/>

			{isVideo && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/20">
					<div className="rounded-full bg-white/90 p-3 shadow-lg backdrop-blur-sm dark:bg-black/60">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-8 w-8 text-[#2D3748] dark:text-white"
							fill="currentColor"
							viewBox="0 0 24 24"
						>
							<path d="M8 5v14l11-7z" />
						</svg>
					</div>
				</div>
			)}

			{media.caption && (
				<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-12">
					<p className="line-clamp-2 text-left text-sm text-white">
						{media.caption}
					</p>
				</div>
			)}

			<div className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
				{new Date(media.uploadedAt).toLocaleDateString('ko-KR')}
			</div>
		</button>
	);
};

export default SharedMediaCard;
