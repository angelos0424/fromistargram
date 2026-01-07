import { useEffect, useState } from 'react';
import type { Highlight } from '../../lib/api/types';

interface HighlightViewerProps {
    highlight: Highlight;
    accountId: string;
    onClose: () => void;
}

const HighlightViewer = ({ highlight, accountId, onClose }: HighlightViewerProps) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const currentMedia = highlight.media[currentIndex];

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') {
                setCurrentIndex((prev) => Math.max(0, prev - 1));
            }
            if (e.key === 'ArrowRight') {
                setCurrentIndex((prev) => Math.min(highlight.media.length - 1, prev + 1));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, highlight.media.length]);

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentIndex < highlight.media.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[rgba(255,212,229,0.4)] via-[rgba(212,228,255,0.4)] to-[rgba(228,212,255,0.4)] backdrop-blur-[12px] dark:bg-black" onClick={onClose}>
            <div className="relative h-full w-full max-w-3xl bg-gradient-to-br from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.02)] dark:bg-black" onClick={(e) => e.stopPropagation()}>
                {/* Progress Bar */}
                <div className="absolute top-4 left-0 right-0 z-10 flex gap-1 px-2">
                    {highlight.media.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1 flex-1 rounded-full transition-colors ${idx <= currentIndex ? 'bg-gradient-to-r from-[#7EC8FF] to-[#B8A4F0] shadow-[0_0_8px_rgba(126,200,255,0.4)] dark:bg-white' : 'bg-white/30'
                                }`}
                        />
                    ))}
                </div>

                {/* Header */}
                <div className="absolute top-8 left-0 right-0 z-10 flex items-center justify-between px-4">
                    <span className="text-sm font-semibold text-[#2D3748] drop-shadow-md dark:text-white">{highlight.title}</span>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-gradient-to-r from-[#FFB8D4] to-[#D4C4FF] text-white shadow-[0_4px_16px_rgba(255,184,212,0.35)] transition hover:shadow-[0_6px_20px_rgba(255,184,212,0.45)] dark:border-0 dark:bg-transparent dark:shadow-none dark:drop-shadow-md">
                        ✕
                    </button>
                </div>

                {/* Media */}
                <div className="flex h-full items-center justify-center">
                    {currentMedia.mime.startsWith('video') ? (
                        <video
                            src={`/api/media/${accountId}/${currentMedia.filename}`}
                            className="max-h-full max-w-full object-contain"
                            autoPlay
                            controls
                            playsInline
                        />
                    ) : (
                        <img
                            src={currentMedia.thumbnailUrl ?? currentMedia.url ?? ''}
                            alt={`Highlight ${currentIndex + 1}`}
                            className="max-h-full max-w-full object-contain"
                        />
                    )}
                </div>

                {/* Navigation Areas */}
                <div className="absolute inset-0 flex">
                    <div className="w-1/3 h-full" onClick={handlePrev} />
                    <div className="w-2/3 h-full" onClick={handleNext} />
                </div>
            </div>
        </div>
    );
};

export default HighlightViewer;
