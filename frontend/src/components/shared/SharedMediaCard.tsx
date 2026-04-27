import type { SharedMedia } from '../../lib/api/types';

interface SharedMediaCardProps {
	mediaGroup: SharedMedia[];
	onClick: () => void;
}

const SharedMediaCard = ({ mediaGroup, onClick }: SharedMediaCardProps) => {
	const media = mediaGroup[0];
	if (!media) return null;

	const thumbnailUrl = media.thumbnailUrl || media.mediaUrl;
	const count = mediaGroup.length;
	const accountName = media.accountName || 'Other';
	const caption = media.caption || media.originalName;
	const uploadedDate = (() => {
		const date = new Date(media.uploadedAt);
		if (Number.isNaN(date.getTime())) {
			return '';
		}

		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}.${month}.${day}`;
	})();

	return (
		<button
			type="button"
			onClick={onClick}
			className="group relative aspect-[4/5] overflow-hidden bg-black shadow-[0_10px_26px_rgba(45,55,72,0.10)] ring-1 ring-white/60 transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(126,200,255,0.24)]"
		>
			<img
				src={thumbnailUrl}
				alt={media.originalName}
				className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
				loading="lazy"
			/>

			<div className="absolute left-2 top-2 max-w-[calc(100%-88px)] truncate rounded-full bg-gradient-to-r from-[#7EC8FF]/92 to-[#B8A4F0]/92 px-2.5 py-1 text-xs font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,0.18)] backdrop-blur">
				{count > 1 ? `+${count - 1}` : 'Shared'}
			</div>
			{uploadedDate ? (
				<div className="absolute right-2 top-2 whitespace-nowrap bg-black/48 px-2 py-1 text-[11px] font-bold leading-none text-white shadow-[0_4px_14px_rgba(0,0,0,0.18)] backdrop-blur">
					{uploadedDate}
				</div>
			) : null}
			<div className="absolute bottom-0 left-0 right-0 translate-y-full bg-gradient-to-t from-[#111827] via-[#111827]/88 to-[#111827]/12 px-3 pb-3 pt-12 text-white transition-transform duration-300 group-hover:translate-y-0 group-focus:translate-y-0">
				<p className="line-clamp-1 text-left text-[13px] font-bold leading-tight text-white">
					{accountName}
				</p>
				<div className="my-2 h-px bg-white/42" />
				<p className="line-clamp-4 text-left text-[13px] leading-snug">
					{caption}
				</p>
			</div>
		</button>
	);
};

export default SharedMediaCard;
