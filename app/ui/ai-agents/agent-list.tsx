'use client';

import { useEffect, useState } from 'react';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { getAIAgents, deleteAIAgent } from '@/app/lib/api';
import { Toast } from '../toast';
import { useSession } from 'next-auth/react';
import { EmptyState } from './empty-state';

interface AIAgent {
  id: string;
  name: string;
  voice: string;
  language: string;
  personality: string;
  speed: number;
  call_type: string;
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

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        if (status === 'authenticated' && session?.user?.email) {
          const fetchedAgents = await getAIAgents(session.user.email);
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
      await deleteAIAgent(agentId, session?.user?.email);
      setAgents(agents.filter(agent => agent.id !== agentId));
      setToast({
        message: 'Agent supprimé avec succès',
        type: 'success'
      });
    } catch (error) {
      console.error('Error deleting agent:', error);
      setToast({
        message: 'Impossible de supprimer l\'agent car il est associé à un ou plusieurs numéros de téléphone',
        type: 'error'
      });
    }
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
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => (
        <div
          key={agent.id}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col"
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              agent.call_type === 'inbound'
                ? 'bg-green-100 text-green-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {agent.call_type === 'inbound' ? 'Entrant' : 'Sortant'}
            </span>
          </div>

          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 flex-grow">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Voix</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {agent.voice === 'male' ? 'Masculine' : 'Féminine'}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Langue</dt>
              <dd className="mt-1 text-sm text-gray-900">{agent.language}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Personnalité</dt>
              <dd className="mt-1 text-sm text-gray-900">{agent.personality}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Vitesse</dt>
              <dd className="mt-1 text-sm text-gray-900">{agent.speed}x</dd>
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
          </div>
        </div>
      ))}

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