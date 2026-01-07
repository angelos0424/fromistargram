import { useMemo } from 'react';
import { AccountProfilePicture } from "../../lib/api/types";

interface ProfileHistoryTimelineProps {
  pictures: AccountProfilePicture[];
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
      <div className="flex flex-col gap-3 rounded-[20px] border border-dashed border-white/60 bg-white/85 p-4 text-sm text-[#7B8794] backdrop-blur-[8px]">
        <p>기록된 프로필 이미지가 없습니다.</p>
        <p className="text-xs text-[#9CA3AF]">
          새로운 크롤링이 실행되면 자동으로 히스토리가 채워집니다.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="프로필 이미지 히스토리" className="flex flex-col gap-4">
      <div className="flex items-center gap-4 rounded-[20px] border border-white/60 bg-white/85 p-4 backdrop-blur-[8px] shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
        {activePicture ? (
          <>
            <img
              src={activePicture.url}
              alt="선택된 프로필 이미지"
              className="h-16 w-16 rounded-full border border-white/60 object-cover shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
            />
            <div className="flex flex-col">
              <span className="text-xs text-[#7B8794]">
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
              className={`flex flex-col items-center gap-2 rounded-[20px] border px-3 py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7EC8FF] ${isActive
                  ? 'border-white/60 bg-gradient-to-br from-[rgba(126,200,255,0.2)] to-[rgba(184,164,240,0.15)] text-[#2D3748] shadow-[0_0_12px_rgba(126,200,255,0.3)] backdrop-blur-[8px]'
                  : 'border-white/60 bg-white/85 text-[#7B8794] hover:shadow-[0_0_16px_rgba(126,200,255,0.2)] backdrop-blur-[8px]'
                }`}
            >
              <img
                src={picture.url}
                alt={`${new Date(picture.takenAt).toLocaleDateString('ko-KR')}에 촬영된 프로필 이미지`}
                className="h-14 w-14 rounded-full border border-white/60 object-cover shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
              />
              <span className="text-[0.65rem] text-[#9CA3AF]">
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
