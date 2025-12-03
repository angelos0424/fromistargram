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
        return <div className="h-24 w-full animate-pulse bg-white/5" />;
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
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/20 bg-white/5 p-1 transition hover:border-white/40">
                            {highlight.coverMedia?.url ? (
                                <div className="h-full w-full overflow-hidden rounded-full">
                                    <img
                                        src={highlight.coverMedia.url}
                                        alt={highlight.title}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="h-full w-full rounded-full bg-white/10" />
                            )}
                        </div>
                        <span className="text-xs font-medium text-white truncate max-w-[5rem]">
                            {highlight.title}
                        </span>
                    </button>
                ))}
            </div>

            {selectedHighlight && ReactDOM.createPortal(
                <HighlightViewer
                    highlight={selectedHighlight}
                    onClose={() => setSelectedHighlight(null)}
                />,
                document.body
            )}
        </>
    );
};

export default HighlightList;
