'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { deleteCall, getCalls, updateCampaignStatus } from '@/app/lib/api';
import { PlayCircleIcon, DocumentTextIcon, ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { Call } from '@/app/ui/calls/types';
import { TranscriptModal } from '@/app/ui/modals/transcript-modal';
import { Filters, FilterState } from '@/app/ui/calls/filters';
import { useSession } from 'next-auth/react';
import { exportCallsToCSV, calculateCallCost } from '@/app/lib/utils';
import { Toast } from '@/app/ui/toast';
import { CALL_COST_PER_MINUTE } from '@/app/lib/constants';

function CallHistoryContent() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [setIsDeletingCalls] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedCalls, setSelectedCalls] = useState<string[]>([]);
  const [currentFilters, setCurrentFilters] = useState<FilterState>({
    callerNumber: '',
    calleeNumber: '',
    category: '',
    date: '',
    campaignId: '',
    callStatus: '',
    direction: '',
  });
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('campaign');
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState({ transcript: '', summary: '' });
  const [currentAudioInfo, setCurrentAudioInfo] = useState({ name: '', duration: 0, url: '' });
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { data: session } = useSession();

  const loadCalls = async () => {
    try {
      setIsLoading(true);
      const fetchedCalls = await getCalls(session?.user?.email, campaignId);
      setCalls(fetchedCalls);
      
      // Reapply current filters after loading new data
      const filtered = fetchedCalls.filter(call => {
        const matchCallerNumber = !currentFilters.callerNumber || 
          call.caller_number.toLowerCase().includes(currentFilters.callerNumber.toLowerCase());
        const matchCalleeNumber = !currentFilters.calleeNumber || 
          call.callee_number.toLowerCase().includes(currentFilters.calleeNumber.toLowerCase());
        const matchCategory = !currentFilters.category || 
          call.call_category === currentFilters.category;
        const matchCampaign = !currentFilters.campaignId ||
          call.campaign_id === currentFilters.campaignId;
        const matchStatus = !currentFilters.callStatus ||
          call.call_status === currentFilters.callStatus;
        const matchDirection = !currentFilters.direction ||
          call.direction === currentFilters.direction;
        
        // Date filtering - match calls from the selected date
        const callDate = new Date(call.date);
        const selectedDate = currentFilters.date ? new Date(currentFilters.date) : null;
        
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
        setIsPlaying(false);
      });
      audioRef.current.addEventListener('play', () => {
        setIsPlaying(true);
      });
      audioRef.current.addEventListener('pause', () => {
        setIsPlaying(false);
      });
    }

    if (playingId === id && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (playingId !== id) {
        audioRef.current.src = url;
        setCurrentAudioInfo({ name, duration: call.duration, url });
      }
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setPlayingId(id);
      }).catch(error => {
        console.error('Error playing audio:', error);
        setIsPlaying(false);
      });
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
    setCurrentFilters(filters); // Store current filters
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

  const handleSeek = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!audioRef.current || !currentAudioInfo.duration) return;
    
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = x / width;
    const newTime = percentage * currentAudioInfo.duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
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
                      Coût
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
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {calculateCallCost(call.duration)}€
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
                              {playingId === call.id && isPlaying ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                                  <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <PlayCircleIcon className="h-5 w-5" />
                              )}
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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4 flex-1 max-w-4xl mx-auto">
            <button
              onClick={() => {
                if (audioRef.current) {
                  if (audioRef.current.paused) {
                    audioRef.current.play().then(() => setIsPlaying(true));
                  } else {
                    audioRef.current.pause();
                    setIsPlaying(false);
                  }
                }
              }}
              className="p-2 text-blue-600 hover:text-blue-900 rounded-full hover:bg-blue-50 transition-colors"
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                </svg>
              ) : (
                <PlayCircleIcon className="h-6 w-6" />
              )}
            </button>
            <div className="flex-1">
              <div className="text-sm text-gray-600 mb-1">{currentAudioInfo.name || 'Audio en cours'}</div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500">{formatDuration(Math.floor(currentTime))}</div>
                <div 
                  className="flex-1 h-1 bg-gray-200 rounded cursor-pointer relative group"
                  onClick={handleSeek}
                >
                  <div 
                    className="absolute inset-y-0 left-0 bg-blue-600 rounded group-hover:bg-blue-700 transition-colors" 
                    style={{ 
                      width: `${currentAudioInfo.duration ? (currentTime / currentAudioInfo.duration) * 100 : 0}%` 
                    }}
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-blue-600 rounded-full group-hover:bg-blue-700 transition-colors shadow-md"
                    style={{ 
                      left: `${currentAudioInfo.duration ? (currentTime / currentAudioInfo.duration) * 100 : 0}%` 
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500">{formatDuration(currentAudioInfo.duration)}</div>
              </div>
            </div>
            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.pause();
                  setPlayingId(null);
                  setIsPlaying(false);
                }
              }}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
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