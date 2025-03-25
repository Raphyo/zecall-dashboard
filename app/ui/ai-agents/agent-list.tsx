'use client';

import { useEffect, useState } from 'react';
import { PencilIcon, TrashIcon, PlusIcon, PhoneIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { getAIAgents, deleteAIAgent } from '@/app/lib/api';
import { Toast } from '../toast';
import { useSession } from 'next-auth/react';
import { EmptyState } from './empty-state';
import { WebRTCClient } from './webrtc-client';

// Voice display names mapping
const voiceDisplayNames: { [key: string]: string } = {
  'guillaume-11labs': 'Guillaume (H)',
  'lucien-11labs': 'Lucien (H)',
  'audrey-11labs': 'Audrey (F)',
  'jessy-11labs': 'Jessy (F)'
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { data: session, status } = useSession();
  const [isCallLoading, setIsCallLoading] = useState<string | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<string>('');
  const [hasMessages, setHasMessages] = useState(false);

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
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet agent ?')) {
      return;
    }

    try {
      if (!session?.user?.id) {
        throw new Error('User ID not found');
      }
      await deleteAIAgent(agentId, session.user.id);
      setAgents(agents.filter(agent => agent.id !== agentId));
      setToast({
        message: 'Agent supprimé avec succès',
        type: 'success'
      });
    } catch (error: any) {
      console.error('Error deleting agent:', error);
      if (error.message.includes('404')) {
        setToast({
          message: 'L\'agent n\'existe plus dans la base de données',
          type: 'error'
        });
        // Remove the non-existent agent from the UI
        setAgents(agents.filter(agent => agent.id !== agentId));
      } else {
        setToast({
          message: 'Impossible de supprimer l\'agent car il est associé à un ou plusieurs numéros de téléphone',
          type: 'error'
        });
      }
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
        setToast({
          message: 'Veuillez autoriser l\'accès au microphone pour passer un appel',
          type: 'error'
        });
      } else {
        setToast({
          message: error.message || 'Erreur lors de l\'initiation de l\'appel',
          type: 'error'
        });
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
    setToast({
      message: error.message || 'Erreur lors de l\'appel',
      type: 'error'
    });
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
    return <div>Chargement...</div>;
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
                onClick={() => handleDelete(agent.id)}
                className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
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
                  <XMarkIcon className="h-4 w-4" />
                ) : (
                  <PhoneIcon className="h-4 w-4" />
                )}
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

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
} 