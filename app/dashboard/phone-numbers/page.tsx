'use client';

import { useState, useEffect } from 'react';
import { PhoneIcon } from '@heroicons/react/24/outline';
import { getPhoneNumbers, getAIAgents, type PhoneNumber, type AIAgent } from '@/app/lib/api';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ANALYTICS_URL, ORCHESTRATOR_URL } from '@/app/lib/api';
import { Toast } from '@/app/ui/toast';

// Add list of locked users (copied from nav-links.tsx for consistency)
const LOCKED_USERS = [
  'dcambon.spi@gmail.com',
  'contact@ilcaffeditalia.fr',
  'julien.volkmann@gmail.com'
];

export default function PhoneNumbersPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { data: session } = useSession();

  const isUserLocked = () => {
    const userEmail = session?.user?.email;
    return userEmail && LOCKED_USERS.includes(userEmail);
  };

  const loadPhoneNumbers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (!session?.user?.id) {
        throw new Error('User ID not found');
      }
      const numbers = await getPhoneNumbers(session.user.id);
      setPhoneNumbers(numbers);
    } catch (err) {
      setError('Erreur lors du chargement des numéros');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAIAgents = async () => {
    try {
      setIsLoadingAgents(true);
      if (!session?.user?.id) {
        throw new Error('User ID not found');
      }
      const fetchedAgents = await getAIAgents(session.user.id);
      setAgents(fetchedAgents);
    } catch (err) {
      console.error('Error loading AI agents:', err);
    } finally {
      setIsLoadingAgents(false);
    }
  };

  useEffect(() => {
    loadPhoneNumbers();
    loadAIAgents();
  }, [session]);

  const handleAgentChange = (phoneNumberId: string, agentId: string) => {
    setPendingChanges(prev => ({
      ...prev,
      [phoneNumberId]: agentId
    }));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    const errors: string[] = [];

    try {
      if (!session?.user?.id) {
        throw new Error('User ID not found');
      }
      
      // Process all pending changes
      for (const [phoneNumberId, agentId] of Object.entries(pendingChanges)) {
        try {
          const response = await fetch(`${ANALYTICS_URL}/api/phone-numbers/${phoneNumberId}/agent?user_id=${session.user.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              agent_id: agentId === 'none' ? null : agentId
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to update phone number ${phoneNumberId}`);
          }
        } catch (err) {
          errors.push(`Failed to update phone number ${phoneNumberId}`);
        }
      }

      if (errors.length > 0) {
        setToast({
          message: `Some updates failed: ${errors.join(', ')}`,
          type: 'error'
        });
      } else {
        setToast({
          message: 'All changes saved successfully',
          type: 'success'
        });
        setPendingChanges({});
        loadPhoneNumbers();
      }
    } catch (err) {
      setToast({
        message: 'Failed to save changes',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeLabel = (type: PhoneNumber['type']) => {
    switch (type) {
      case 'local':
        return 'Numéro local';
      case 'mobile':
        return 'Numéro mobile';
      case 'tollfree':
        return 'Numéro vert';
    }
  };

  const getTypeColor = (type: PhoneNumber['type']) => {
    switch (type) {
      case 'local':
        return 'bg-blue-100 text-blue-800';
      case 'mobile':
        return 'bg-green-100 text-green-800';
      case 'tollfree':
        return 'bg-purple-100 text-purple-800';
    }
  };

  const getAssignedAgent = (phoneNumber: PhoneNumber) => {
    if (!phoneNumber.agent_id) return null;
    return agents.find(agent => agent.id === phoneNumber.agent_id);
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Mes numéros</h1>
        {Object.keys(pendingChanges).length > 0 && (
          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[60vh]">
          <p className="text-gray-500">Chargement des numéros...</p>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center min-h-[60vh]">
          <p className="text-red-500">{error}</p>
        </div>
      ) : phoneNumbers.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-6">
            <h2 className="text-xl text-gray-600">Aucun numéro disponible</h2>
            <p className="text-gray-500">Contactez l'administrateur pour obtenir un numéro</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {phoneNumbers.map((number) => (
            <div
              key={number.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <PhoneIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="font-medium">{number.number}</span>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  number.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {number.status === 'active' ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div className="flex flex-col space-y-4">
                <span className={`px-2 py-1 text-xs font-medium rounded-full w-fit ${getTypeColor(number.type)}`}>
                  {getTypeLabel(number.type)}
                </span>
                
                <div className="mt-4">
                  <label htmlFor={`agent-${number.id}`} className="block text-sm font-medium text-gray-700 mb-2">
                    Agent IA assigné
                  </label>
                  {isLoadingAgents ? (
                    <p className="mt-2 text-sm text-gray-500">
                      Chargement des agents...
                    </p>
                  ) : agents.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-500">
                      Aucun agent IA disponible.{' '}
                      {!isUserLocked() && (
                        <Link href="/dashboard/ai-agents/create" className="text-blue-600 hover:text-blue-800">
                          Créer un agent
                        </Link>
                      )}
                    </p>
                  ) : (
                    <select
                      id={`agent-${number.id}`}
                      value={pendingChanges[number.id] || number.agent_id || 'none'}
                      onChange={(e) => handleAgentChange(number.id, e.target.value)}
                      className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 ${
                        pendingChanges[number.id] ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="none">Aucun agent assigné</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {getAssignedAgent(number) && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600">
                        Agent assigné: <span className="font-medium">{getAssignedAgent(number)?.name}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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