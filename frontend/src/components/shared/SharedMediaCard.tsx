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
			className="group relative aspect-[4/5] overflow-hidden bg-black shadow-[0_10px_26px_rgba(45,55,72,0.10)] ring-1 ring-white/60 transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(126,200,255,0.24)] sm:rounded-[22px]"
		>
			<img
				src={thumbnailUrl}
				alt={media.originalName}
				className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
				loading="lazy"
			/>

			{isVideo && (
				<div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/22 text-white shadow-[0_4px_14px_rgba(0,0,0,0.18)] backdrop-blur">
					▶
				</div>
			)}

			<div className="absolute left-2 top-2 rounded-full bg-gradient-to-r from-[#7EC8FF]/92 to-[#B8A4F0]/92 px-2.5 py-1 text-xs font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,0.18)] backdrop-blur">
				{count > 1 ? `+${count - 1}` : 'Shared'}
			</div>
			<div className="absolute bottom-0 left-0 right-0 translate-y-full bg-gradient-to-t from-[#111827] via-[#111827]/82 to-transparent px-3 pb-3 pt-12 text-white transition-transform duration-300 group-hover:translate-y-0 group-focus:translate-y-0">
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
