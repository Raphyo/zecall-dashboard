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
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
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

  useEffect(() => {
    // Create audio element once and reuse it
    const audioElement = document.createElement('audio');
    audioElement.setAttribute('playsinline', ''); // Important for iOS
    audioElement.setAttribute('webkit-playsinline', ''); // For older iOS
    audioElement.setAttribute('x-webkit-airplay', 'allow'); // For AirPlay support
    audioElement.setAttribute('controls', ''); // Add native controls as fallback
    audioElement.preload = 'metadata'; // Change to metadata for faster initial load
    audioElement.crossOrigin = 'anonymous'; // Add CORS support
    
    // Create event listener functions that we can remove later
    const handleTimeUpdate = () => {
      setCurrentTime(audioElement.currentTime || 0);
    };
    
    const handleEnded = () => {
      setPlayingId(null);
    };
    
    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      const errorMessage = audioElement.error 
        ? `Code: ${audioElement.error.code}, Message: ${audioElement.error.message}`
        : 'Unknown error';
      console.error('Detailed audio error:', errorMessage);
      alert(`Erreur lors du chargement de l'audio: ${errorMessage}`);
    };

    // Debug event listeners
    const handleLoadStart = () => console.log('Audio loading started');
    const handleProgress = () => console.log('Audio download in progress');
    const handleLoadedData = () => console.log('Audio data loaded');
    const handleLoadedMetadata = () => console.log('Audio metadata loaded');
    const handleCanPlay = () => console.log('Audio can start playing');
    const handleCanPlayThrough = () => console.log('Audio can play through');
    
    // Add event listeners
    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('error', handleError);
    audioElement.addEventListener('loadstart', handleLoadStart);
    audioElement.addEventListener('progress', handleProgress);
    audioElement.addEventListener('loadeddata', handleLoadedData);
    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioElement.addEventListener('canplay', handleCanPlay);
    audioElement.addEventListener('canplaythrough', handleCanPlayThrough);
    
    audioElementRef.current = audioElement;
    document.body.appendChild(audioElement); // Add to DOM for iOS
    audioElement.style.display = 'none'; // Hide it
    
    return () => {
      // Remove all event listeners
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('error', handleError);
      audioElement.removeEventListener('loadstart', handleLoadStart);
      audioElement.removeEventListener('progress', handleProgress);
      audioElement.removeEventListener('loadeddata', handleLoadedData);
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.removeEventListener('canplay', handleCanPlay);
      audioElement.removeEventListener('canplaythrough', handleCanPlayThrough);
      
      // Clean up the audio element
      audioElement.pause();
      audioElement.remove();
    };
  }, []);

  const handlePlayAudio = async (url: string, id: string, name: string) => {
    console.log('handlePlayAudio called with:', { url, id, name });
    const call = calls.find(c => c.id === id);
    if (!call || !audioElementRef.current) return;

    try {
      const audio = audioElementRef.current;

      // If clicking the same audio that's currently playing, just pause it
      if (playingId === id) {
        console.log('Pausing current audio');
        audio.pause();
        setPlayingId(null);
        return;
      }

      // Reset the audio element
      audio.pause();
      audio.currentTime = 0;
      
      // Set up new audio source
      console.log('Setting up new audio source');
      
      // Add timestamp to URL to prevent caching issues
      const audioUrl = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
      audio.src = audioUrl;
      
      // Load the audio first
      await new Promise((resolve, reject) => {
        const loadHandler = () => {
          audio.removeEventListener('canplaythrough', loadHandler);
          audio.removeEventListener('error', errorHandler);
          resolve(null);
        };
        const errorHandler = (e: Event) => {
          audio.removeEventListener('canplaythrough', loadHandler);
          audio.removeEventListener('error', errorHandler);
          reject(e);
        };
        audio.addEventListener('canplaythrough', loadHandler, { once: true });
        audio.addEventListener('error', errorHandler, { once: true });
        audio.load();
      });

      setCurrentAudioInfo({ name, duration: call.duration, url });
      setPlayingId(id);

      try {
        console.log('Attempting to play audio');
        // Try to play with user interaction
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          console.log('Audio playing successfully');
        }
      } catch (error: unknown) {
        console.error('Play error:', error);
        if (error instanceof Error) {
          const errorMessage = error.name === 'NotAllowedError'
            ? 'La lecture audio nécessite une interaction utilisateur. Veuillez réessayer.'
            : `Erreur lors de la lecture: ${error.message}`;
          alert(errorMessage);
        }
        setPlayingId(null);
      }
    } catch (error: unknown) {
      console.error('General error:', error);
      setPlayingId(null);
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

      {/* Audio Player */}
      {(playingId || currentAudioInfo.url) && (
        <AudioPlayer
          audioRef={audioElementRef.current}
          currentTime={currentTime}
          currentAudioInfo={currentAudioInfo}
          playingId={playingId}
          handlePlayAudio={handlePlayAudio}
          onClose={() => {
            const audio = audioElementRef.current;
            if (audio) {
              // First pause the audio
              audio.pause();
              // Remove event listeners to prevent errors
              audio.removeEventListener('timeupdate', () => {});
              audio.removeEventListener('ended', () => {});
              // Reset the audio element without changing src
              audio.currentTime = 0;
            }
            // Reset states
            setPlayingId(null);
            setCurrentTime(0);
            setCurrentAudioInfo({ name: '', duration: 0, url: '' });
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