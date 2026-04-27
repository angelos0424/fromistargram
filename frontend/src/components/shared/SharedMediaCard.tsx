import type { SharedMedia } from '../../lib/api/types';

interface SharedMediaCardProps {
	mediaGroup: SharedMedia[];
	onClick: () => void;
}

const SharedMediaCard = ({ mediaGroup, onClick }: SharedMediaCardProps) => {
	const media = mediaGroup[0];
	if (!media) return null;

	const isVideo = media.mime.startsWith('video/');
	const thumbnailUrl = media.thumbnailUrl || media.mediaUrl;
	const count = mediaGroup.length;

	return (
		<button
			type="button"
			onClick={onClick}
			className="group relative aspect-[4/5] overflow-hidden bg-black transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
		>
			<img
				src={thumbnailUrl}
				alt={media.originalName}
				className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
				loading="lazy"
			/>

			{isVideo && (
				<div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur">
					▶
				</div>
			)}

			<div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-xs font-bold text-white backdrop-blur">
				{count > 1 ? `+${count - 1}` : 'Shared'}
			</div>
			<div className="absolute bottom-0 left-0 right-0 translate-y-full bg-gradient-to-t from-black via-black/75 to-transparent px-3 pb-3 pt-12 text-white transition-transform duration-300 group-hover:translate-y-0 group-focus:translate-y-0">
				<div className="mb-1 text-xs font-bold text-white/80">
					{new Date(media.uploadedAt).toLocaleDateString('ko-KR')}
				</div>
				<p className="line-clamp-4 text-left text-[13px] leading-snug">
					{media.caption || media.accountName || media.originalName}
				</p>
			</div>
		</button>
	);
};

export default SharedMediaCard;
