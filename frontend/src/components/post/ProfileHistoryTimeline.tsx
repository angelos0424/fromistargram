import { useMemo } from 'react';
import type { ProfilePicture } from '../../lib/api/types';

interface ProfileHistoryTimelineProps {
  pictures: ProfilePicture[];
  selectedId: string | null;
  onSelect: (pictureId: string) => void;
}

const ProfileHistoryTimeline = ({
  pictures,
  selectedId,
  onSelect
}: ProfileHistoryTimelineProps) => {
  const sortedPictures = useMemo(
    () =>
      [...pictures].sort(
        (a, b) =>
          new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
      ),
    [pictures]
  );

  const activePicture = useMemo(() => {
    if (!sortedPictures.length) {
      return null;
    }

    if (selectedId) {
      return sortedPictures.find((picture) => picture.id === selectedId) ?? null;
    }

    return sortedPictures[0] ?? null;
  }, [sortedPictures, selectedId]);

  if (!sortedPictures.length) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400">
        <p>기록된 프로필 이미지가 없습니다.</p>
        <p className="text-xs text-slate-500">
          새로운 크롤링이 실행되면 자동으로 히스토리가 채워집니다.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="프로필 이미지 히스토리" className="flex flex-col gap-4">
      <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        {activePicture ? (
          <>
            <img
              src={activePicture.url}
              alt="선택된 프로필 이미지"
              className="h-16 w-16 rounded-full border border-white/20 object-cover"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">
                최근 프로필 이미지
              </span>
              <span className="text-xs text-slate-400">
                {new Intl.DateTimeFormat('ko', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                }).format(new Date(activePicture.takenAt))}
              </span>
            </div>
          </>
        ) : null}
      </div>
      <div
        className="flex gap-3 overflow-x-auto"
        role="listbox"
        aria-label="프로필 이미지 타임라인"
      >
        {sortedPictures.map((picture) => {
          const isActive = activePicture?.id === picture.id;

          return (
            <button
              key={picture.id}
              type="button"
              role="option"
              aria-selected={isActive}
              onClick={() => onSelect(picture.id)}
              className={`flex flex-col items-center gap-2 rounded-2xl border px-3 py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                isActive
                  ? 'border-brand-400 bg-brand-400/20 text-white'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <img
                src={picture.url}
                alt={`${new Date(picture.takenAt).toLocaleDateString('ko-KR')}에 촬영된 프로필 이미지`}
                className="h-14 w-14 rounded-full border border-white/10 object-cover"
              />
              <span className="text-[0.65rem] text-slate-400">
                {new Intl.DateTimeFormat('ko', {
                  month: 'short',
                  day: '2-digit'
                }).format(new Date(picture.takenAt))}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default ProfileHistoryTimeline;
