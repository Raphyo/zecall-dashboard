'use client'

import { PlayCircleIcon, PauseCircleIcon } from '@heroicons/react/24/outline';
import { formatDuration } from '@/app/lib/utils';

interface AudioPlayerProps {
  audioRef: HTMLAudioElement | null;
  currentTime: number;
  currentAudioInfo: {
    name: string;
    duration: number;
    url: string;
  };
  playingId: string | null;
  handlePlayAudio: (url: string, id: string, name: string) => void;
}

const PlayPauseButton = ({ isPlaying, onClick }: { isPlaying: boolean; onClick: () => void }) => {
  return (
    <button
      onClick={onClick}
      className="rounded-full p-2 hover:bg-gray-100"
    >
      {isPlaying ? (
        <PauseCircleIcon className="w-6 h-6 text-blue-600" />
      ) : (
        <PlayCircleIcon className="w-6 h-6 text-gray-600" />
      )}
    </button>
  );
};

export function AudioPlayer({ audioRef, currentTime, currentAudioInfo, playingId, handlePlayAudio }: AudioPlayerProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
      <div className="max-w-7xl mx-auto flex items-center gap-4">
        <PlayPauseButton 
          isPlaying={!!(audioRef && !audioRef.paused)}
          onClick={() => audioRef && handlePlayAudio(currentAudioInfo.url, playingId!, currentAudioInfo.name)}
        />
        <div className="flex-1">
          <p className="font-medium mb-2">{currentAudioInfo.name}</p>
          <div className="relative">
            <input
              type="range"
              min="0"
              max={currentAudioInfo.duration || 0}
              value={currentTime}
              onChange={(e) => {
                if (audioRef) {
                  audioRef.currentTime = Number(e.target.value);
                }
              }}
              className="w-full"
              style={{
                background: `linear-gradient(to right, #3b82f6 ${(currentTime / (currentAudioInfo.duration || 1)) * 100}%, #e5e7eb ${(currentTime / (currentAudioInfo.duration || 1)) * 100}%)`
              }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-500 mt-1">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(currentAudioInfo.duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}