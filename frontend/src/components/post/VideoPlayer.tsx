import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import type { MediaItem } from '../../lib/api/types';

interface VideoPlayerProps {
  media: MediaItem;
  className?: string;
}

const formatTime = (value: number) => {
  if (!Number.isFinite(value)) {
    return '0:00';
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, '0');

  return `${minutes}:${seconds}`;
};

const VideoPlayer = ({ media, className }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const syncMuted = useCallback(
    (value: boolean) => {
      if (videoRef.current) {
        videoRef.current.muted = value;
      }
    },
    []
  );

  useEffect(() => {
    syncMuted(isMuted);
  }, [isMuted, syncMuted]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsMuted(true);
    videoRef.current?.load();
  }, [media.id]);

  const handlePlayPause = async () => {
    if (!videoRef.current) {
      return;
    }

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await videoRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Failed to play video', error);
      }
    }
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) {
      return;
    }

    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) {
      return;
    }

    setDuration(videoRef.current.duration);
  };

  const handleSeek = (event: ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) {
      return;
    }

    const value = Number(event.target.value);
    const nextTime = (value / 100) * (duration || 1);
    videoRef.current.currentTime = nextTime;
  };

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    const node = videoRef.current;

    const handleEnded = () => {
      setIsPlaying(false);
    };

    node.addEventListener('ended', handleEnded);

    return () => {
      node.removeEventListener('ended', handleEnded);
    };
  }, []);

  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className={`group relative flex h-full w-full items-center justify-center bg-black ${className ?? ''}`}>
      <video
        ref={videoRef}
        className="max-h-full w-full object-contain"
        src={media.mediaUrl}
        poster={media.thumbnailUrl}
        preload="metadata"
        playsInline
        controls={false}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        crossOrigin="anonymous"
        onClick={handlePlayPause}
      />

      {!isPlaying && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/60 bg-white/90 text-white shadow-[0_8px_24px_rgba(126,200,255,0.15)] backdrop-blur-[8px] dark:border-0 dark:bg-black/40 dark:shadow-none dark:backdrop-blur-sm">
            <span className="ml-1 text-3xl text-[#7EC8FF] dark:text-white">►</span>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center gap-3 rounded-full border border-white/60 bg-white/90 px-4 py-2 text-xs text-[#2D3748] opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 data-[playing=false]:opacity-100 backdrop-blur-[8px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-black/60 dark:text-slate-100" data-playing={isPlaying}>
        <button
          type="button"
          onClick={handlePlayPause}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-gradient-to-r from-[#7EC8FF] to-[#B8A4F0] text-sm text-white shadow-[0_0_8px_rgba(126,200,255,0.3)] transition hover:shadow-[0_0_12px_rgba(126,200,255,0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7EC8FF] dark:border-white/10 dark:bg-white/10 dark:shadow-none dark:hover:border-brand-400 dark:hover:text-brand-200 dark:focus-visible:ring-brand-400"
          aria-label={isPlaying ? '일시정지' : '재생'}
        >
          {isPlaying ? '❚❚' : '►'}
        </button>
        <button
          type="button"
          onClick={handleToggleMute}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-gradient-to-r from-[#7EC8FF] to-[#B8A4F0] text-base text-white shadow-[0_0_8px_rgba(126,200,255,0.3)] transition hover:shadow-[0_0_12px_rgba(126,200,255,0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7EC8FF] dark:border-white/10 dark:bg-white/10 dark:shadow-none dark:hover:border-brand-400 dark:hover:text-brand-200 dark:focus-visible:ring-brand-400"
          aria-label={isMuted ? '음소거 해제' : '음소거'}
          aria-pressed={!isMuted}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
        <div className="flex flex-1 items-center gap-2">
          <span className="w-10 text-right font-mono text-[0.7rem] text-[#7B8794] dark:text-slate-300">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={progress}
            onChange={handleSeek}
            className="flex-1 accent-[#7EC8FF] dark:accent-brand-400"
            aria-label="영상 재생 위치"
          />
          <span className="w-10 text-left font-mono text-[0.7rem] text-[#7B8794] dark:text-slate-300">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
