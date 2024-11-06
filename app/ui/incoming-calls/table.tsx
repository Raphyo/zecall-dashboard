'use client'

import { formatDateToLocal, formatDuration } from '@/app/lib/utils';
import { IncomingCallsTable } from '@/app/lib/definitions';
import { PlayCircleIcon, PauseCircleIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

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

const AudioPlayer = dynamic(
  () => import('./audio-player').then(mod => mod.AudioPlayer),
  { ssr: false }
);

export default function Table({ calls }: { calls: IncomingCallsTable[] }) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentAudioInfo, setCurrentAudioInfo] = useState<{
    name: string;
    duration: number;
    url: string;
  } | null>(null);

  useEffect(() => {
    if (audioRef) {
      const handleTimeUpdate = () => {
        setCurrentTime(audioRef.currentTime);
      };
      audioRef.addEventListener('timeupdate', handleTimeUpdate);
      return () => {
        audioRef.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [audioRef]);

  const handlePlayAudio = async (recordingUrl: string, callId: string, callerName: string) => {
    try {
      if (audioRef) {
        if (playingId === callId) {
          // Toggle play/pause for same audio
          if (audioRef.paused) {
            await audioRef.play();
          } else {
            audioRef.pause();
          }
          return;
        }
        // Stop previous audio
        audioRef.pause();
        audioRef.currentTime = 0;
      }

      const audio = new Audio(recordingUrl);
      
      audio.addEventListener('loadedmetadata', () => {
        setCurrentAudioInfo({
          name: callerName,
          duration: audio.duration,
          url: recordingUrl
        });
      });

      audio.addEventListener('ended', () => {
        setPlayingId(null);
        setAudioRef(null);
        setCurrentAudioInfo(null);
        setCurrentTime(0);
      });

      await audio.play();
      setPlayingId(callId);
      setAudioRef(audio);

    } catch (error) {
      console.error('Error playing audio:', error);
      setPlayingId(null);
      setAudioRef(null);
      setCurrentAudioInfo(null);
      setCurrentTime(0);
    }
  };

  return (
    <>
      <div className="mt-6 flow-root">
        <div className="inline-block min-w-full align-middle">
          <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
            <div className="md:hidden">
              {calls?.map((call) => (
                <div
                  key={call.id}
                  className="mb-2 w-full rounded-md bg-white p-4"
                >
                  {/* Mobile view content */}
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <div className="mb-2 flex items-center">
                        <p className="font-semibold">{call.caller_name}</p>
                      </div>
                      <p className="text-sm text-gray-500">{call.caller_number}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                      call.call_category === 'New booking' ? 'bg-green-100 text-green-700' :
                      call.call_category === 'Booking modification' ? 'bg-blue-100 text-blue-700' :
                      call.call_category === 'Booking cancellation' ? 'bg-red-100 text-red-700' :
                      call.call_category === 'Information' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {call.call_category}
                    </span>
                  </div>
                  <div className="flex w-full items-center justify-between pt-4">
                    <div>
                      <p>{formatDateToLocal(call.date)}</p>
                      <p className="text-sm text-gray-500">{call.hour}</p>
                      <p className="text-sm text-gray-500">{formatDuration(call.duration)}</p>
                    </div>
                    <PlayPauseButton
                      isPlaying={!!(playingId === call.id && audioRef && !audioRef.paused)}
                      onClick={() => handlePlayAudio(call.recording_url, call.id, call.caller_name)}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Desktop table view */}
            <table className="hidden min-w-full text-gray-900 md:table">
              <thead className="rounded-lg text-left text-sm font-normal">
                <tr>
                  <th scope="col" className="px-4 py-5 font-medium">Caller Name</th>
                  <th scope="col" className="px-3 py-5 font-medium">Phone Number</th>
                  <th scope="col" className="px-3 py-5 font-medium">Category</th>
                  <th scope="col" className="px-3 py-5 font-medium">Date</th>
                  <th scope="col" className="px-3 py-5 font-medium">Hour</th>
                  <th scope="col" className="px-3 py-5 font-medium">Duration</th>
                  <th scope="col" className="px-3 py-5 font-medium">Recording</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {calls?.map((call) => (
                  <tr key={call.id} className="w-full border-b py-3 text-sm last-of-type:border-none">
                    <td className="whitespace-nowrap px-3 py-3">{call.caller_name}</td>
                    <td className="whitespace-nowrap px-3 py-3">{call.caller_number}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                        call.call_category === 'New booking' ? 'bg-green-100 text-green-700' :
                        call.call_category === 'Booking modification' ? 'bg-blue-100 text-blue-700' :
                        call.call_category === 'Booking cancellation' ? 'bg-red-100 text-red-700' :
                        call.call_category === 'Information' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {call.call_category}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">{formatDateToLocal(call.date)}</td>
                    <td className="whitespace-nowrap px-3 py-3">{call.hour}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {formatDuration(call.duration)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <PlayPauseButton
                        isPlaying={!!(playingId === call.id && audioRef && !audioRef.paused)}
                        onClick={() => handlePlayAudio(call.recording_url, call.id, call.caller_name)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    {/* Audio Player */}
    {currentAudioInfo && (
      <AudioPlayer
        audioRef={audioRef}
        currentTime={currentTime}
        currentAudioInfo={currentAudioInfo}
        playingId={playingId}
        handlePlayAudio={handlePlayAudio}
      />
    )}
    </>
  );
}