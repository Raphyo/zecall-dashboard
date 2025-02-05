'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCalls, updateCampaignStatus } from '@/app/lib/api';
import { PlayCircleIcon, DocumentTextIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { TEMP_USER_ID } from '@/app/lib/constants';
import type { Call } from '@/app/ui/calls/types';
import { AudioPlayer } from '@/app/ui/calls/audio-player';
import { TranscriptModal } from '@/app/ui/modals/transcript-modal';
import { Filters, FilterState } from '@/app/ui/calls/filters';
import { useSession } from 'next-auth/react';
import { exportCallsToCSV } from '@/app/lib/utils';

function CallHistoryContent() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('campaign');
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState({ transcript: '', summary: '' });
  const [currentAudioInfo, setCurrentAudioInfo] = useState({ name: '', duration: 0, url: '' });
  const [currentTime, setCurrentTime] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { data: session } = useSession();

  const loadCalls = async () => {
    try {
      setIsLoading(true);
      const fetchedCalls = await getCalls(session?.user?.email, campaignId);
      setCalls(fetchedCalls);
      setFilteredCalls(fetchedCalls);

      if (campaignId && fetchedCalls.length > 0) {
        const allCallsCompleted = fetchedCalls.every(call => 
          call.call_status === 'completed'
        );
        
        if (allCallsCompleted) {
          try {
            await updateCampaignStatus(campaignId, 'terminée');
          } catch (error) {
            console.error('Error updating campaign status:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading calls:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCalls();
  }, [session, campaignId]);

  const handlePlayAudio = (url: string, id: string, name: string) => {
    // Find the call to get its duration from the database
    const call = calls.find(c => c.id === id);
    if (!call) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      });
      audioRef.current.addEventListener('ended', () => {
        setPlayingId(null);
      });
    }

    if (playingId === id && !audioRef.current.paused) {
      audioRef.current.pause();
    } else {
      if (playingId !== id) {
        audioRef.current.src = url;
        setCurrentAudioInfo({ name, duration: call.duration, url });
      }
      audioRef.current.play();
      setPlayingId(id);
    }
  };

  const handleViewTranscript = (transcript: string, summary: string) => {
    setSelectedTranscript({ transcript, summary });
    setIsTranscriptOpen(true);
  };

  const formatCallCategory = (category: string) => {
    const categories = {
      'New booking': 'Nouvelle réservation',
      'Booking modification': 'Modification',
      'Booking cancellation': 'Annulation',
      'Information': 'Information',
      'Outbound': 'Sortant',
      'Inbound': 'Entrant',
      'unknown': 'Inconnu'
    };
    return categories[category as keyof typeof categories] || category;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFilterChange = (filters: FilterState) => {
    const filtered = calls.filter(call => {
      const matchCallerNumber = !filters.callerNumber || 
        call.caller_number.toLowerCase().includes(filters.callerNumber.toLowerCase());
      const matchCalleeNumber = !filters.calleeNumber || 
        call.callee_number.toLowerCase().includes(filters.calleeNumber.toLowerCase());
      const matchCategory = !filters.category || 
        call.call_category === filters.category;
      const matchCampaign = !filters.campaignId ||
        call.campaign_id === filters.campaignId;
      const matchStatus = !filters.callStatus ||
        call.call_status === filters.callStatus;
      
      // Date filtering
      const callDate = new Date(call.date);
      const startDate = filters.startDate ? new Date(filters.startDate) : null;
      const endDate = filters.endDate ? new Date(filters.endDate) : null;
      
      const matchDates = (!startDate || callDate >= startDate) && 
                        (!endDate || callDate <= endDate);
      
      return matchCallerNumber && matchCalleeNumber && matchCategory && 
             matchCampaign && matchDates && matchStatus;
    });
    setFilteredCalls(filtered);
  };

  const getCategoryStyle = (category: string) => {
    // Array of predefined color combinations
    const colorStyles = [
      'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
      'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20',
      'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
      'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20',
      'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-600/20',
      'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20',
      'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-600/20'
    ];

    // Simple hash function to get consistent index for each category
    const hash = category.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    // Get positive modulo
    const index = Math.abs(hash) % colorStyles.length;
    return colorStyles[index];
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Historique des appels</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => exportCallsToCSV(filteredCalls)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Exporter CSV
          </button>
        </div>
      </div>

      <Filters onFilterChange={handleFilterChange} />

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                      ID Appel
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Appelant
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Destinataire
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Nom
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Direction
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Catégorie
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Date
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Durée
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Statut
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Campagne
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredCalls.map((call) => (
                    <tr key={call.id} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                        {call.id.substring(0, 7)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {call.caller_number}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {call.callee_number}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {call.caller_name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {call.direction}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium ${getCategoryStyle(call.call_category)}`}>
                          {call.call_category}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {new Date(call.date).toLocaleDateString()} {call.hour}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {formatDuration(call.duration)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {call.call_status}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {call.campaign_name || '-'}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {call.recording_url && (
                            <button
                              onClick={() => handlePlayAudio(
                                call.recording_url,
                                call.id,
                                `Appel ${call.caller_number}`
                              )}
                              className="p-1 text-blue-600 hover:text-blue-900 rounded-full hover:bg-blue-50 transition-colors"
                              title="Écouter l'enregistrement"
                            >
                              <PlayCircleIcon className="h-5 w-5" />
                            </button>
                          )}
                          {(call.ai_transcript || call.ai_summary) && (
                            <button
                              onClick={() => handleViewTranscript(
                                call.ai_transcript,
                                call.ai_summary
                              )}
                              className="p-1 text-blue-600 hover:text-blue-900 rounded-full hover:bg-blue-50 transition-colors"
                              title="Voir la transcription"
                            >
                              <DocumentTextIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCalls.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Aucun appel trouvé</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {playingId && (
        <AudioPlayer
          audioRef={audioRef.current}
          currentTime={currentTime}
          currentAudioInfo={currentAudioInfo}
          playingId={playingId}
          handlePlayAudio={handlePlayAudio}
          onClose={() => {
            audioRef.current?.pause();
            setPlayingId(null);
          }}
        />
      )}
      
      <TranscriptModal
        isOpen={isTranscriptOpen}
        onClose={() => setIsTranscriptOpen(false)}
        transcript={selectedTranscript.transcript}
        summary={selectedTranscript.summary}
      />
    </div>
  );
}

export default function CallHistoryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CallHistoryContent />
    </Suspense>
  );
}