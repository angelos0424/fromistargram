import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom'; // Import ReactDOM for createPortal
import { listHighlights } from '../../lib/api/client';
import type { Highlight } from '../../lib/api/types';
import HighlightViewer from './HighlightViewer';

interface HighlightListProps {
    accountId: string;
}

const HighlightList = ({ accountId }: HighlightListProps) => {
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHighlights = async () => {
            setIsLoading(true);
            try {
                const data = await listHighlights(accountId);
                setHighlights(data);
            } catch (error) {
                console.error('Failed to fetch highlights', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (accountId) {
            fetchHighlights();
        }
    }, [accountId]);

    if (isLoading) {
        return <div className="h-24 w-full animate-pulse rounded-[18px] bg-gradient-to-r from-white/60 via-[rgba(126,200,255,0.2)] to-white/60 backdrop-blur-[8px] dark:bg-white/5" />;
    }

    if (highlights.length === 0) {
        return null;
    }

    return (
        <>
            <div className="flex gap-4 overflow-x-auto py-4">
                {highlights.map((highlight) => (
                    <button
                        key={highlight.id}
                        type="button"
                        onClick={() => setSelectedHighlight(highlight)}
                        className="flex flex-col items-center gap-2"
                    >
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/90 bg-white/95 p-1 shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition hover:border-[#7EC8FF] hover:shadow-[0_0_12px_rgba(126,200,255,0.4)] backdrop-blur-[8px] dark:border-white/20 dark:bg-white/5 dark:shadow-none dark:hover:border-white/40">
                            {highlight.coverMedia?.url ? (
                                <div className="h-full w-full overflow-hidden rounded-full">
                                    <img
                                        src={highlight.coverUrl}
                                        alt={highlight.title}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="h-full w-full rounded-full bg-white/10" />
                            )}
                        </div>
                        <span className="text-xs font-medium text-[#2D3748] truncate max-w-[5rem] dark:text-white">
                            {highlight.title}
                        </span>
                    </button>
                ))}
            </div>

            {selectedHighlight && ReactDOM.createPortal(
                <HighlightViewer
                    highlight={selectedHighlight}
                    accountId={accountId}
                    onClose={() => setSelectedHighlight(null)}
                />,
                document.body
            )}
        </>
    );
};

export default HighlightList;
