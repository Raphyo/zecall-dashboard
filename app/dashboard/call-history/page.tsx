'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { deleteCall, getCalls, updateCampaignStatus } from '@/app/lib/api';
import { PlayCircleIcon, DocumentTextIcon, ArrowDownTrayIcon, TrashIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import type { Call } from '@/app/ui/calls/types';
import { Filters, FilterState } from '@/app/ui/calls/filters';
import { useSession } from 'next-auth/react';
import { exportCallsToCSV, calculateCallCost } from '@/app/lib/utils';
import { toast } from 'sonner';
import ConfirmDialog from '@/app/components/ConfirmDialog';

function CallHistoryContent() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingCalls, setIsDeletingCalls] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCalls, setSelectedCalls] = useState<string[]>([]);
  const [selectedCallDetails, setSelectedCallDetails] = useState<Call | null>(null);
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
  const [selectedTranscript, setSelectedTranscript] = useState<{ transcript: string; summary: string }>({ transcript: '', summary: '' });
  const [currentAudioInfo, setCurrentAudioInfo] = useState({ name: '', duration: 0, url: '' });
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { data: session } = useSession();
  const [expandedText, setExpandedText] = useState<{
    text: string;
    position: { x: number; y: number };
    colorClass?: string;
  } | null>(null);
  const REFRESH_INTERVAL = 30000; // Refresh every 30 seconds
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCallIds, setSelectedCallIds] = useState<string[]>([]);

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
      } else {
        setIsRefreshing(true);
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
      console.error('Error loading call data:', error);
      toast.error('Failed to refresh call data. Please try again.');
    } finally {
      if (!isRefresh) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
      setIsInitialLoad(false);
    }
  };

  // Manual refresh function
  const handleManualRefresh = () => {
    loadCalls(true);
  };

  // Set up auto-refresh
  useEffect(() => {
    // Initial load
    loadCalls(false);

    // Set up interval for periodic refresh
    refreshIntervalRef.current = setInterval(() => {
      loadCalls(true);
    }, REFRESH_INTERVAL);

    // Cleanup function
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [session, campaignId]); // Removed currentFilters from dependencies to prevent too frequent refreshes

  // Separate effect for filter changes
  useEffect(() => {
    if (!isInitialLoad) {
      const filtered = calls.filter(call => {
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
        
        const callDate = new Date(call.date);
        const selectedDate = currentFilters.date ? new Date(currentFilters.date) : null;
        
        const matchDate = !selectedDate || (
          callDate.getFullYear() === selectedDate.getFullYear() &&
          callDate.getMonth() === selectedDate.getMonth() &&
          callDate.getDate() === selectedDate.getDate()
        );
        
        return matchCallerNumber && matchCalleeNumber && matchCategory && 
               matchCampaign && matchDate && matchStatus && matchDirection;
      });
      setFilteredCalls(filtered);
    }
  }, [currentFilters, calls]);

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

  const handleDeleteCalls = async (callIds: string[]) => {
    if (!session?.user?.id) {
      toast.error('Session utilisateur non trouvée');
      return;
    }
    try {
      setIsDeletingCalls(true);
      await deleteCall(callIds, session.user.id);
      await loadCalls();
      toast.success('Appel(s) supprimé(s) avec succès');
    } catch (error) {
      console.error('Error deleting calls:', error);
      toast.error('Une erreur est survenue lors de la suppression des appels');
    } finally {
      setIsDeletingCalls(false);
      setShowDeleteDialog(false);
      setSelectedCallIds([]);
      setSelectedCalls([]);
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
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {isRefreshing ? 'Actualisation...' : 'Actualiser'}
          </button>
          {selectedCalls.length > 0 && (
            <button
              onClick={() => {
                setSelectedCallIds(selectedCalls);
                setShowDeleteDialog(true);
              }}
              disabled={isDeletingCalls}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeletingCalls ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <TrashIcon className="h-4 w-4" />
              )}
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
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full py-2 align-middle">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead>
                  <tr className="bg-gray-50">
                    <th scope="col" className="relative py-3.5 pl-4 pr-3 sm:pr-0 w-12">
                      <input
                        type="checkbox"
                        className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                        checked={selectedCalls.length === filteredCalls.length && filteredCalls.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 w-20">
                      ID
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-28">
                      Date
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-20">
                      Durée
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-24">
                      Statut
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-28">
                      Catégorie
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-24">
                      Direction
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-20">
                      Coût
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-28">
                      Campagne
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-28">
                      Appelant
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-28">
                      Destinataire
                    </th>
                    <th scope="col" className="relative py-3.5 pl-4 pr-3 sm:pr-0 w-12">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredCalls.map((call) => (
                    <tr 
                      key={call.id} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedCallDetails(call)}
                    >
                      <td className="relative whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                          checked={selectedCalls.includes(call.id)}
                          onChange={(e) => handleSelectCall(call.id, e.target.checked)}
                          onClick={e => e.stopPropagation()}
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {call.id.substring(0, 7)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {new Date(call.date).toLocaleDateString()} {call.hour}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {formatDuration(call.duration)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span 
                          className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium ${getStatusStyle(call.call_status)} cursor-pointer active:opacity-80`}
                          title={call.call_status}
                          onClick={(e) => handleTextExpand(call.call_status, e, getStatusStyle(call.call_status))}
                          onTouchEnd={(e) => {
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
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <div className="relative group/category">
                          <span 
                            className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium ${getCategoryStyle(call.call_category)} cursor-pointer`}
                          >
                            <span className="truncate max-w-[120px] block">
                              {call.call_category}
                            </span>
                          </span>
                          <div 
                            className={`absolute left-0 -top-1 -translate-y-full px-2.5 py-1.5 rounded-md text-xs font-medium ${getCategoryStyle(call.call_category)} whitespace-nowrap opacity-0 group-hover/category:opacity-100 z-50 shadow-lg transition-opacity duration-200`}
                          >
                            {call.call_category}
                          </div>
                        </div>
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
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {calculateCallCost(call.duration)}€
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {call.campaign_name ? (
                          <span 
                            className="truncate max-w-[120px] block cursor-pointer active:opacity-80" 
                            title={call.campaign_name}
                            onClick={(e) => handleTextExpand(call.campaign_name || '', e)}
                            onTouchEnd={(e) => {
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
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {call.caller_number}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {call.callee_number}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCallIds([call.id]);
                            setShowDeleteDialog(true);
                          }}
                          disabled={isDeletingCalls}
                          className="p-1 text-red-600 hover:text-red-900 rounded-full hover:bg-red-50 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
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

      {selectedCallDetails && (
        <div className="fixed inset-y-0 right-0 w-[600px] bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50">
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Détails de l'appel</h2>
                <p className="text-sm text-gray-500">{selectedCallDetails.id}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCallDetails(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Call Info */}
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Informations</h3>
                  <dl className="mt-3 space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-sm font-medium text-gray-500">Date</dt>
                      <dd className="text-sm text-gray-900 col-span-2">
                        {new Date(selectedCallDetails.date).toLocaleDateString()} {selectedCallDetails.hour}
                      </dd>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-sm font-medium text-gray-500">Durée</dt>
                      <dd className="text-sm text-gray-900 col-span-2">
                        {formatDuration(selectedCallDetails.duration)}
                      </dd>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-sm font-medium text-gray-500">Coût</dt>
                      <dd className="text-sm text-gray-900 col-span-2">
                        {calculateCallCost(selectedCallDetails.duration)}€
                      </dd>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-sm font-medium text-gray-500">Appelant</dt>
                      <dd className="text-sm text-gray-900 col-span-2">{selectedCallDetails.caller_number}</dd>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-sm font-medium text-gray-500">Destinataire</dt>
                      <dd className="text-sm text-gray-900 col-span-2">{selectedCallDetails.callee_number}</dd>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-sm font-medium text-gray-500">Statut</dt>
                      <dd className="text-sm col-span-2">
                        <span className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium ${getStatusStyle(selectedCallDetails.call_status)}`}>
                          {selectedCallDetails.call_status}
                        </span>
                      </dd>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-sm font-medium text-gray-500">Catégorie</dt>
                      <dd className="text-sm col-span-2">
                        <span className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium ${getCategoryStyle(selectedCallDetails.call_category)}`}>
                          {selectedCallDetails.call_category}
                        </span>
                      </dd>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-sm font-medium text-gray-500">Direction</dt>
                      <dd className="text-sm col-span-2">
                        <span className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium ${getDirectionStyle(selectedCallDetails.direction)}`}>
                          {selectedCallDetails.direction}
                        </span>
                      </dd>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-sm font-medium text-gray-500">Nom</dt>
                      <dd className="text-sm text-gray-900 col-span-2">{selectedCallDetails.user_name || '-'}</dd>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="text-sm text-gray-900 col-span-2">{selectedCallDetails.user_email || '-'}</dd>
                    </div>
                    {selectedCallDetails.campaign_name && (
                      <div className="grid grid-cols-3 gap-4">
                        <dt className="text-sm font-medium text-gray-500">Campagne</dt>
                        <dd className="text-sm text-gray-900 col-span-2">{selectedCallDetails.campaign_name}</dd>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-sm font-medium text-gray-500">Session ID</dt>
                      <dd className="text-sm text-gray-900 col-span-2">{selectedCallDetails.session_id || '-'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Recording */}
                {selectedCallDetails.recording_url && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Enregistrement</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <audio 
                        src={selectedCallDetails.recording_url} 
                        controls 
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {/* Transcript */}
                {(selectedCallDetails.ai_transcript || selectedCallDetails.ai_summary) && (
                  <div>
                    {selectedCallDetails.ai_summary && (
                      <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Résumé</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {selectedCallDetails.ai_summary}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedCallDetails.ai_transcript && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Transcription</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          {selectedCallDetails.ai_transcript.split('\n').map((line, index) => {
                            const isAssistant = line.startsWith('Assistant:');
                            const isUser = line.startsWith('User:');
                            return (
                              <p 
                                key={index} 
                                className={`text-sm text-gray-700 whitespace-pre-wrap py-1 px-2 rounded my-1 ${
                                  isAssistant ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20' : 
                                  isUser ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20' : ''
                                }`}
                              >
                                {line}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
      
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedCallIds([]);
        }}
        onConfirm={() => handleDeleteCalls(selectedCallIds)}
        title={`Supprimer ${selectedCallIds.length > 1 ? 'les appels' : 'l\'appel'}`}
        message={`Êtes-vous sûr de vouloir supprimer ${selectedCallIds.length > 1 ? 'ces appels' : 'cet appel'} ?`}
        confirmLabel="Supprimer"
        isLoading={isDeletingCalls}
        isDanger
      />

      {expandedText && (
        <div
          className={`fixed z-50 p-2 rounded-md shadow-lg expanded-text-popup text-xs ${
            expandedText.colorClass || 'bg-white text-gray-900'
          }`}
          style={{
            top: `${expandedText.position.y + 10}px`,
            left: `${expandedText.position.x}px`,
            maxWidth: '280px'
          }}
        >
          {expandedText.text}
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