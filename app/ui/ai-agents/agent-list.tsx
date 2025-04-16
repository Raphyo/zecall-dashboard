'use client';

import { useEffect, useState } from 'react';
import { PencilIcon, TrashIcon, PlusIcon, PhoneIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { getAIAgents, deleteAIAgent, getAgentFunctions, removeAgentFunction } from '@/app/lib/api';
import { useSession } from 'next-auth/react';
import { EmptyState } from './empty-state';
import { WebRTCClient } from './webrtc-client';
import { AgentsListSkeleton } from '../skeletons';
import { toast } from 'sonner';
import ConfirmDialog from '@/app/components/ConfirmDialog';

// Voice display names mapping
const voiceDisplayNames: { [key: string]: string } = {
  'guillaume-11labs': 'Guillaume (H)',
  'lucien-11labs': 'Lucien (H)',
  'audrey-11labs': 'Audrey (F)',
  'jessy-11labs': 'Jessy (F)',
};

interface AIAgent {
  id: string;
  name: string;
  voice_name: string;
  language: string;
  background_audio: string;
  knowledge_base_path?: string;
  knowledge_base_type?: string;
  llm_prompt: string;
  created_at: string;
  user_id: string;
}


export function AgentsList() {
  const router = useRouter();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();
  const [isCallLoading, setIsCallLoading] = useState<string | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<string>('');
  const [hasMessages, setHasMessages] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        if (status === 'authenticated' && session?.user?.id) {
          const fetchedAgents = await getAIAgents(session.user.id);
          console.log('Fetched agents:', fetchedAgents);
          setAgents(fetchedAgents);
        }
      } catch (error) {
        console.error('Error fetching agents:', error);
      } finally {
        setLoading(false);
      }
    };

    if (status !== 'loading') {
      fetchAgents();
    }
  }, [session, status]);

  const handleDelete = async (agentId: string) => {
    setSelectedAgentId(agentId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedAgentId) return;
    console.log('Delete button clicked for agent:', selectedAgentId);
    setIsDeleting(true);

    try {
      if (!session?.user?.id) {
        throw new Error('User ID not found');
      }

      console.log('Starting agent deletion process for agent:', selectedAgentId);

      // First, get all functions for this agent
      console.log('Fetching functions for agent:', selectedAgentId);
      const functions = await getAgentFunctions(selectedAgentId, session.user.id);
      console.log('Found functions:', functions);
      
      // Delete all functions first
      if (functions && functions.length > 0) {
        console.log(`Starting deletion of ${functions.length} functions`);
        for (const func of functions) {
          try {
            console.log('Attempting to delete function:', { functionId: func.id, agentId: selectedAgentId });
            // Convert function ID to number
            const functionId = typeof func.id === 'string' ? parseInt(func.id, 10) : func.id;
            await removeAgentFunction(selectedAgentId, functionId, session.user.id);
            console.log('Successfully deleted function:', func.id);
          } catch (error) {
            console.error(`Failed to delete function ${func.id}:`, error);
            // Continue with other functions even if one fails
          }
        }
        console.log('Completed function deletion process');
      } else {
        console.log('No functions found for agent:', selectedAgentId);
      }

      // Then delete the agent
      console.log('Starting agent deletion');
      const response = await deleteAIAgent(selectedAgentId, session.user.id);
      console.log('Agent deletion response:', response);
      
      // Only update UI if deletion was successful
      if (response && response.message === "Agent deleted successfully") {
        console.log('Agent deletion successful, updating UI');
        setAgents(prev => prev.filter(agent => agent.id !== selectedAgentId));
        toast.success('Agent supprimé avec succès');
        setShowDeleteDialog(false);
      } else {
        console.log('Agent deletion failed:', response);
        throw new Error('La suppression a échoué');
      }
    } catch (error: any) {
      console.error('Error in deletion process:', error);

      if (error.message.includes('404')) {
        toast.error('L\'agent n\'existe plus dans la base de données');
        // Remove from UI if it doesn't exist in database
        setAgents(prev => prev.filter(agent => agent.id !== selectedAgentId));
      } else {
        toast.error('Erreur lors de la suppression de l\'agent');
      }
    } finally {
      setIsDeleting(false);
      setSelectedAgentId(null);
    }
  };

  const handleWebCall = async (agentId: string) => {
    // Prevent multiple calls if already loading or active
    if (isCallLoading || activeCallId) {
      return;
    }

    try {
      setIsCallLoading(agentId);

      // Find the agent details
      const agent = agents.find(a => a.id === agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream after permission
      
      // Show WebRTC client
      setActiveCallId(agentId);

    } catch (error: any) {
      console.error('Error initiating web call:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Veuillez autoriser l\'accès au microphone pour passer un appel');
      } else {
        toast.error(error.message || 'Erreur lors de l\'initiation de l\'appel');
      }
      // Reset active call ID if there was an error
      setActiveCallId(null);
    } finally {
      setIsCallLoading(null);
    }
  };

  // Add WebRTC client component
  const handleCallStatus = (status: string) => {
    console.log('Call status changed:', { status, previousStatus: callStatus });
    setCallStatus(status);
    
    // Set hasMessages to true when bot is ready or we get a transcript
    if (status === 'Bot ready' || status === 'Transport: ready' || status.includes('transcript')) {
      console.log('Setting hasMessages to true because of status:', status);
      setHasMessages(true);
    }
    
    if (status === 'Disconnected') {
      // Only reset states after a short delay to ensure smooth transition
      setTimeout(() => {
        setActiveCallId(null);
        setCallStatus('');
        setHasMessages(false);
      }, 500);
    }
  };

  const handleCallError = (error: Error) => {
    console.error('Call error:', error);
    toast.error(error.message || 'Erreur lors de l\'appel');
    // Only reset states after a short delay to ensure smooth transition
    setTimeout(() => {
      setActiveCallId(null);
      setCallStatus('');
      setHasMessages(false);
    }, 500);
  };

  const handleHangup = async () => {
    // Prevent multiple hangup requests
    if (!activeCallId) {
      return;
    }
    // First set loading state to prevent multiple clicks
    setIsCallLoading(activeCallId);
    try {
      // Let the WebRTCClient handle the disconnection first
      setCallStatus('Disconnecting');
      setTimeout(() => {
        setActiveCallId(null);
        setCallStatus('');
        setHasMessages(false);
      }, 500);
    } finally {
      setIsCallLoading(null);
    }
  };

  const handleTranscript = (text: string, isBot: boolean) => {
    setHasMessages(true);
  };

  if (status === 'loading' || loading) {
    return <AgentsListSkeleton />;
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center bg-gray-50 rounded-lg">
        <EmptyState />
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
              <button
                onClick={() => hasMessages ? handleHangup() : handleWebCall(agent.id)}
                disabled={isCallLoading === agent.id || (activeCallId === agent.id && !hasMessages)}
                className={`inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                  hasMessages && activeCallId === agent.id
                    ? 'text-red-700 bg-red-100 hover:bg-red-200'
                    : 'text-green-700 bg-green-100 hover:bg-green-200'
                } disabled:opacity-50`}
              >
                {(isCallLoading === agent.id || (activeCallId === agent.id && !hasMessages)) ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : hasMessages && activeCallId === agent.id ? (
                  <>
                    <XMarkIcon className="h-4 w-4 mr-2" />
                    Raccrocher
                  </>
                ) : (
                  <>
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    Appeler l'agent
                  </>
                )}
              </button>
            </div>

            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 flex-grow">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Voix</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {voiceDisplayNames[agent.voice_name] || agent.voice_name || 'Non définie'}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Langue</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {agent.language === 'fr' ? 'Français' : 'English'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Son d'ambiance</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {agent.background_audio === 'none' && 'Aucun'}
                  {agent.background_audio === 'metro' && 'Métro Parisien'}
                  {agent.background_audio === 'office1' && 'Bureau 1'}
                  {agent.background_audio === 'office2' && 'Bureau 2'}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => router.push(`/dashboard/ai-agents/${agent.id}/edit`)}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Modifier
              </button>
              <button
                onClick={() => {
                  console.log('Delete button clicked in UI for agent:', agent.id);
                  handleDelete(agent.id);
                }}
                className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {activeCallId && (
        <WebRTCClient
          agentId={activeCallId}
          onStatusChange={handleCallStatus}
          onError={handleCallError}
          onDisconnect={() => {
            setActiveCallId(null);
            setCallStatus('');
            setHasMessages(false);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedAgentId(null);
        }}
        onConfirm={confirmDelete}
        title="Supprimer l'agent"
        message="Êtes-vous sûr de vouloir supprimer cet agent ? Cette action est irréversible."
        confirmLabel="Supprimer"
        isLoading={isDeleting}
        isDanger
      />
    </>
  );
} 