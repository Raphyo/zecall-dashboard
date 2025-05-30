'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

type AIAgent = {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  createdAt: string;
};

export default function AIAgentsPage() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // In a real application, you would fetch the agents from an API
    // For now, we'll use local storage
    const storedAgents = localStorage.getItem('emailAIAgents');
    if (storedAgents) {
      setAgents(JSON.parse(storedAgents));
    }
  }, []);

  const saveAgents = (updatedAgents: AIAgent[]) => {
    setAgents(updatedAgents);
    localStorage.setItem('emailAIAgents', JSON.stringify(updatedAgents));
  };

  const handleCreateAgent = () => {
    if (!name || !systemPrompt) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const newAgent: AIAgent = {
      id: Date.now().toString(),
      name,
      description,
      systemPrompt,
      createdAt: new Date().toISOString(),
    };

    const updatedAgents = [...agents, newAgent];
    saveAgents(updatedAgents);

    // Reset form
    setName('');
    setDescription('');
    setSystemPrompt('');
    setError(null);
    setIsCreating(false);
  };

  const handleUpdateAgent = () => {
    if (!name || !systemPrompt || !isEditing) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const updatedAgents = agents.map(agent => {
      if (agent.id === isEditing) {
        return {
          ...agent,
          name,
          description,
          systemPrompt,
        };
      }
      return agent;
    });

    saveAgents(updatedAgents);

    // Reset form
    setName('');
    setDescription('');
    setSystemPrompt('');
    setError(null);
    setIsEditing(null);
  };

  const handleEditAgent = (agent: AIAgent) => {
    setName(agent.name);
    setDescription(agent.description);
    setSystemPrompt(agent.systemPrompt);
    setIsEditing(agent.id);
    setIsCreating(false);
  };

  const handleDeleteAgent = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet agent IA ?')) {
      const updatedAgents = agents.filter(agent => agent.id !== id);
      saveAgents(updatedAgents);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agents IA pour Email</h1>
          <p className="mt-2 text-sm text-gray-500">
            Créez des agents IA personnalisés pour vos réponses d'email
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreating(true);
            setIsEditing(null);
            setName('');
            setDescription('');
            setSystemPrompt('');
          }}
          className="mt-4 sm:mt-0 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Nouvel Agent IA
        </button>
      </div>

      {/* Agent Form */}
      {(isCreating || isEditing) && (
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900">
            {isCreating ? 'Créer un nouvel agent IA' : 'Modifier l\'agent IA'}
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nom *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Ex: Assistant Commercial"
                  required
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Ex: Répond aux demandes commerciales"
                />
              </div>
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-700">
                Instructions système (prompt) *
              </label>
              <div className="mt-1">
                <textarea
                  id="systemPrompt"
                  rows={5}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Vous êtes un assistant qui aide à rédiger des emails commerciaux. Votre ton est professionnel et concis..."
                  required
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Ces instructions définissent le comportement et le style de l'agent IA lorsqu'il génère des réponses.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setIsEditing(null);
                setError(null);
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={isCreating ? handleCreateAgent : handleUpdateAgent}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isCreating ? 'Créer' : 'Mettre à jour'}
            </button>
          </div>
        </div>
      )}

      {/* Agents List */}
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Nom
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Description
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Créé le
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {agents.length === 0 && !isCreating ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                        <SparklesIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 font-semibold text-gray-900">Aucun agent IA</p>
                        <p className="mt-1">Créez votre premier agent IA pour commencer</p>
                        <button
                          onClick={() => {
                            setIsCreating(true);
                            setIsEditing(null);
                          }}
                          className="mt-4 inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Créer un agent
                        </button>
                      </td>
                    </tr>
                  ) : (
                    agents.map((agent) => (
                      <tr key={agent.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {agent.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {agent.description || '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {formatDate(agent.createdAt)}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleEditAgent(agent)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <PencilIcon className="h-5 w-5" />
                              <span className="sr-only">Modifier</span>
                            </button>
                            <button
                              onClick={() => handleDeleteAgent(agent.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-5 w-5" />
                              <span className="sr-only">Supprimer</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 