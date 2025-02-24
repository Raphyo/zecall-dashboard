'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { deleteCall, getCalls, updateCampaignStatus } from '@/app/lib/api';
import { PlayCircleIcon, DocumentTextIcon, ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import { TEMP_USER_ID } from '@/app/lib/constants';
import type { Call } from '@/app/ui/calls/types';
import { AudioPlayer } from '@/app/ui/calls/audio-player';
import { TranscriptModal } from '@/app/ui/modals/transcript-modal';
import { Filters, FilterState } from '@/app/ui/calls/filters';
import { useSession } from 'next-auth/react';
import { exportCallsToCSV } from '@/app/lib/utils';
import { Toast } from '@/app/ui/toast';

function CallHistoryContent() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingCalls, setIsDeletingCalls] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedCalls, setSelectedCalls] = useState<string[]>([]);
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
      const matchDirection = !filters.direction ||
        call.direction === filters.direction;
      
      // Date filtering - match calls from the selected date
      const callDate = new Date(call.date);
      const selectedDate = filters.date ? new Date(filters.date) : null;
      
      // If no date is selected, include all calls
      // If a date is selected, match calls from that date (ignoring time)
      const matchDate = !selectedDate || (
        callDate.getFullYear() === selectedDate.getFullYear() &&
        callDate.getMonth() === selectedDate.getMonth() &&
        callDate.getDate() === selectedDate.getDate()
      );
      
      return matchCallerNumber && matchCalleeNumber && matchCategory && 
             matchCampaign && matchDate && matchStatus && matchDirection;
    });
    setFilteredCalls(filtered);
  };

  const getCategoryStyle = (category: string) => {
    // Special case for "inconnue" category
    if (category === 'inconnue') {
      return 'bg-red-50 text-red-700 ring-1 ring-red-600/20';
    }

    // Array of predefined color combinations for other categories
    const colorStyles = [
      'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
      'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20',
      'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
      'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-600/20',
      'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20',
      'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-600/20',
      'bg-teal-50 text-teal-700 ring-1 ring-teal-600/20'
    ];

    // Simple hash function to get consistent index for each category
    const hash = category.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    // Get positive modulo
    const index = Math.abs(hash) % colorStyles.length;
    return colorStyles[index];
  };

  const getStatusStyle = (status: string) => {
    const statusStyles: { [key: string]: string } = {
      'terminé': 'bg-green-50 text-green-700 ring-1 ring-green-600/20',
      'échoué': 'bg-red-50 text-red-700 ring-1 ring-red-600/20',
      'sans réponse': 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20',
      'occupé': 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
      'en-cours': 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
      'sonne': 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/20',
      'initié': 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20'
    };
    return statusStyles[status] || 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20';
  };

  const getDirectionStyle = (direction: string) => {
    const directionStyles: { [key: string]: string } = {
      'entrant': 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/20',
      'sortant': 'bg-green-50 text-green-700 ring-1 ring-green-600/20'
    };
    return directionStyles[direction] || 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20';
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${ids.length > 1 ? 'ces appels' : 'cet appel'} ?`)) return;
    setIsDeletingCalls(true);
    try {
      await deleteCall(ids, session?.user?.email);
      setSelectedCalls([]);
      await loadCalls(); // Refresh the list
      setToast({
        message: ids.length > 1 ? 'Appels supprimés avec succès' : 'Appel supprimé avec succès',
        type: 'success'
      });
    } catch (err) {
      console.error('Error deleting calls:', err);
      setToast({
        message: 'Erreur lors de la suppression des appels',
        type: 'error'
      });
    } finally {
      setIsDeletingCalls(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCalls(filteredCalls.map(call => call.id));
    } else {
      setSelectedCalls([]);
    }
  };

  const handleSelectCall = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedCalls(prev => [...prev, id]);
    } else {
      setSelectedCalls(prev => prev.filter(callId => callId !== id));
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Historique des appels</h1>
        <div className="flex items-center gap-4">
          {selectedCalls.length > 0 && (
            <button
              onClick={() => handleDelete(selectedCalls)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700"
            >
              <TrashIcon className="w-5 h-5" />
              Supprimer ({selectedCalls.length})
            </button>
          )}
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
                      <input
                        type="checkbox"
                        checked={selectedCalls.length === filteredCalls.length && filteredCalls.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
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
                      Email
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
                        <input
                          type="checkbox"
                          checked={selectedCalls.includes(call.id)}
                          onChange={(e) => handleSelectCall(call.id, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
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
                        {call.user_name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {call.user_email}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium ${getDirectionStyle(call.direction)}`}>
                          {call.direction}
                        </span>
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
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium ${getStatusStyle(call.call_status)}`}>
                          {call.call_status}
                        </span>
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
                          {!selectedCalls.length && (
                            <button
                              onClick={() => handleDelete([call.id])}
                              className="p-1 text-red-600 hover:text-red-900 rounded-full hover:bg-red-50 transition-colors"
                              title="Supprimer l'appel"
                            >
                              <TrashIcon className="h-5 w-5" />
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
      
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
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