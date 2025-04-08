'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { deleteCall, getCalls, updateCampaignStatus } from '@/app/lib/api';
import { PlayCircleIcon, DocumentTextIcon, ArrowDownTrayIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Call } from '@/app/ui/calls/types';
import { TranscriptModal } from '@/app/ui/modals/transcript-modal';
import { Filters, FilterState } from '@/app/ui/calls/filters';
import { useSession } from 'next-auth/react';
import { exportCallsToCSV, calculateCallCost } from '@/app/lib/utils';
import { Toast } from '@/app/ui/toast';

function CallHistoryContent() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingCalls, setIsDeletingCalls] = useState(false);
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
  const [expandedText, setExpandedText] = useState<{ 
    text: string; 
    position: { x: number; y: number }; 
    colorClass?: string 
  } | null>(null);
  const REFRESH_INTERVAL = 60000; // Refresh every 60 seconds
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Add a ref to track if we're on a touch device
  const isTouchDevice = useRef(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout>();

  // Detect touch device on mount
  useEffect(() => {
    isTouchDevice.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  const loadCalls = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setIsLoading(true);
      }

      if (!session?.user?.id) {
        throw new Error('User ID not found');
      }
      const fetchedCalls = await getCalls(session.user.id, campaignId);
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
      console.error('Error loading call data - please check server logs');
    } finally {
      if (!isRefresh) {
        setIsLoading(false);
      }
      setIsInitialLoad(false);
    }
  };

  // Set up auto-refresh
  useEffect(() => {
    // Initial load
    loadCalls(false);

    // Set up interval for periodic refresh
    refreshIntervalRef.current = setInterval(() => {
      loadCalls(true); // Pass true to indicate this is a refresh
    }, REFRESH_INTERVAL);

    // Cleanup function
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [session, campaignId, currentFilters]); // Added currentFilters to dependencies

  // Add a separate effect to handle filter changes
  useEffect(() => {
    if (!isInitialLoad) {
      loadCalls(true);
    }
  }, [currentFilters]);

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
        console.error('Error playing audio - please check server logs');
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
      if (!session?.user?.id) {
        throw new Error('User ID not found');
      }
      await deleteCall(ids, session.user.id);
      setSelectedCalls([]);
      await loadCalls(); // Refresh the list
      setToast({
        message: ids.length > 1 ? 'Appels supprimés avec succès' : 'Appel supprimé avec succès',
        type: 'success'
      });
    } catch (err) {
      console.error('Error deleting calls - please check server logs');
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

  // Close expanded text when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (expandedText && !(event.target as Element).closest('.expanded-text-popup')) {
        setExpandedText(null);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expandedText]);

  const handleTextExpand = (text: string, event: React.MouseEvent, colorClass?: string) => {
    event.preventDefault(); // Prevent default to handle both click and touch
    event.stopPropagation();
    
    // If already showing this text, close it
    if (expandedText?.text === text) {
      setExpandedText(null);
      return;
    }
    
    // Calculate position based on click/touch location
    const rect = event.currentTarget.getBoundingClientRect();
    
    // Get viewport width to handle mobile positioning
    const viewportWidth = window.innerWidth;
    
    // Calculate x position - ensure popup stays within viewport
    let x = rect.left;
    
    // For mobile (small screens), center the popup
    if (viewportWidth < 640) { // sm breakpoint in Tailwind
      x = Math.max(20, Math.min(viewportWidth - 220, x)); // Keep 20px from edges minimum
    } else {
      // For desktop, keep popup aligned with the clicked element
      x = Math.max(10, Math.min(viewportWidth - 280, x));
    }
    
    const y = rect.bottom + window.scrollY;
    
    setExpandedText({ 
      text, 
      position: { x, y },
      colorClass
    });
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
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full py-2 align-middle">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead>
                  <tr className="bg-gray-50">
                    <th scope="col" className="relative py-3.5 pl-4 pr-3 sm:pr-0 w-24">
                      <span className="sr-only">Actions</span>
                    </th>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 w-20">
                      ID Appel
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-28">
                      Appelant
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-28">
                      Destinataire
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-28">
                      Nom
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-24">
                      Direction
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-28">
                      Catégorie
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-28">
                      Date
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-20">
                      Durée
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-20">
                      Coût
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-24">
                      Statut
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-28">
                      Campagne
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredCalls.map((call) => (
                    <tr key={call.id} className="hover:bg-gray-50 transition-colors">
                      <td className="relative whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium">
                        <div className="flex gap-2">
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
                        </div>
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
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span 
                          className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium ${getDirectionStyle(call.direction)}`}
                          title={call.direction}
                        >
                          <span className="truncate max-w-[100px] block">
                            {call.direction}
                          </span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span 
                          className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium ${getCategoryStyle(call.call_category)} cursor-pointer active:opacity-80`}
                          title={call.call_category}
                          onClick={(e) => handleTextExpand(call.call_category, e, getCategoryStyle(call.call_category))}
                          onTouchEnd={(e) => {
                            // Convert TouchEvent to MouseEvent-like object for our handler
                            const mouseEvent = {
                              currentTarget: e.currentTarget,
                              preventDefault: () => e.preventDefault(),
                              stopPropagation: () => e.stopPropagation(),
                              clientX: e.changedTouches[0].clientX,
                              clientY: e.changedTouches[0].clientY
                            } as unknown as React.MouseEvent;
                            
                            handleTextExpand(call.call_category, mouseEvent, getCategoryStyle(call.call_category));
                          }}
                        >
                          <span className="truncate max-w-[120px] block">
                            {call.call_category}
                          </span>
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
                        <span 
                          className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium ${getStatusStyle(call.call_status)} cursor-pointer active:opacity-80`}
                          title={call.call_status}
                          onClick={(e) => handleTextExpand(call.call_status, e, getStatusStyle(call.call_status))}
                          onTouchEnd={(e) => {
                            // Convert TouchEvent to MouseEvent-like object for our handler
                            const mouseEvent = {
                              currentTarget: e.currentTarget,
                              preventDefault: () => e.preventDefault(),
                              stopPropagation: () => e.stopPropagation(),
                              clientX: e.changedTouches[0].clientX,
                              clientY: e.changedTouches[0].clientY
                            } as unknown as React.MouseEvent;
                            
                            handleTextExpand(call.call_status, mouseEvent, getStatusStyle(call.call_status));
                          }}
                        >
                          <span className="truncate max-w-[100px] block">
                            {call.call_status}
                          </span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {call.campaign_name ? (
                          <span 
                            className="truncate max-w-[120px] block cursor-pointer active:opacity-80" 
                            title={call.campaign_name}
                            onClick={(e) => handleTextExpand(call.campaign_name || '', e)}
                            onTouchEnd={(e) => {
                              // Convert TouchEvent to MouseEvent-like object for our handler
                              const mouseEvent = {
                                currentTarget: e.currentTarget,
                                preventDefault: () => e.preventDefault(),
                                stopPropagation: () => e.stopPropagation(),
                                clientX: e.changedTouches[0].clientX,
                                clientY: e.changedTouches[0].clientY
                              } as unknown as React.MouseEvent;
                              
                              handleTextExpand(call.campaign_name || '', mouseEvent);
                            }}
                          >
                            {call.campaign_name}
                          </span>
                        ) : '-'}
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

      {/* Expanded Text Popup */}
      {expandedText && (
        <div 
          className={`expanded-text-popup fixed z-50 rounded-lg shadow-lg border border-gray-200 p-3 max-w-xs ${expandedText.colorClass || 'bg-white'} sm:max-w-xs max-w-[calc(100vw-40px)]`}
          style={{ 
            left: `${expandedText.position.x}px`, 
            top: `${expandedText.position.y + 10}px` 
          }}
        >
          <div className="flex justify-between items-start">
            <p className="text-sm break-words pr-6">{expandedText.text}</p>
            <button 
              onClick={() => setExpandedText(null)}
              className="absolute top-2 right-2 text-current opacity-70 hover:opacity-100 p-1"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
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