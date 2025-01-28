'use client';

import { useState } from 'react';
import { SpeakerWaveIcon, LanguageIcon, UserGroupIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { createAIAgent } from '@/app/lib/api';
import { Toast } from '../toast';
import { useSession } from 'next-auth/react';

export function CreateAIAgentForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agent, setAgent] = useState({
    name: '',
    voice: 'female',
    language: 'fr-FR',
    personality: 'professional',
    speed: 1,
    callType: 'inbound',
    knowledgeBase: null as File | null,
    knowledgeBaseType: 'pdf',
    llmPrompt: ''
  });
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [toast, setToast] = useState<{
    message: string;
    type: 'error' | 'success';
  } | null>(null);

  const personalities = [
    { id: 'professional', name: 'Professionnel', description: 'Formel et efficace' },
    { id: 'friendly', name: 'Amical', description: 'Chaleureux et accessible' },
    { id: 'casual', name: 'Décontracté', description: 'Naturel et détendu' },
  ];

  const validateFile = (file: File): boolean => {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (file.size > MAX_FILE_SIZE) {
      setFileError('Le fichier ne doit pas dépasser 5MB');
      return false;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError('Format de fichier non supporté. Utilisez PDF, TXT ou DOCX');
      return false;
    }

    setFileError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    console.log('Starting form submission...');

    try {
        const formData = new FormData();
        // Log form data being sent
        formData.append('name', agent.name);
        formData.append('voice', agent.voice);
        formData.append('language', agent.language);
        formData.append('personality', agent.personality);
        formData.append('speed', agent.speed.toString());
        formData.append('callType', agent.callType);
        formData.append('llmPrompt', agent.llmPrompt);

        if (agent.knowledgeBase) {
            formData.append('knowledgeBase', agent.knowledgeBase);
        }

        console.log('Form data prepared:', {
            name: agent.name,
            voice: agent.voice,
            language: agent.language,
            personality: agent.personality,
            speed: agent.speed,
            callType: agent.callType,
            hasFile: !!agent.knowledgeBase
        });

        await createAIAgent(formData, session?.user?.email);
        router.push('/dashboard/ai-agents');
    } catch (error) {
        console.error('Form submission error:', error);
        setToast({
            message: 'Une erreur est survenue lors de la création de l\'agent',
            type: 'error'
        });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
        {/* Basic Information */}
        <div className="p-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nom de l'agent <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={agent.name}
              onChange={(e) => setAgent({ ...agent, name: e.target.value })}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              placeholder="Ex: Agent Commercial"
              required
            />
          </div>
        </div>

        {/* Call Type Selection */}
        <div className="p-6 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Type d'appels <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setAgent({ ...agent, callType: 'inbound' })}
              className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                agent.callType === 'inbound'
                  ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Appels entrants
            </button>
            <button
              type="button"
              onClick={() => setAgent({ ...agent, callType: 'outbound' })}
              className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                agent.callType === 'outbound'
                  ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Appels sortants
            </button>
          </div>
        </div>

        {/* Knowledge Base Section */}
        <div className="p-6 border-t border-gray-100">
          <div>
            <label htmlFor="knowledgeBase" className="block text-sm font-medium text-gray-700 mb-2">
              Base de connaissances
            </label>
            <p className="mt-1 text-sm text-gray-500 mb-4">
              La base de connaissances permettra à l'agent IA d'intégrer le contexte spécifique de votre entreprise,
              de vos services ou de vos produits, afin de répondre avec précision et pertinence aux questions de vos utilisateurs.
              Importez un fichier contenant les informations nécessaires à votre agent (PDF, TXT, DOCX - Max 5MB)
            </p>
            <input
              type="file"
              id="knowledgeBase"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (validateFile(file)) {
                    setAgent({ ...agent, knowledgeBase: file });
                    setSelectedFileName(file.name);
                  }
                }
              }}
              accept=".pdf,.txt,.docx"
              className="hidden"
            />
            <div className="flex items-center gap-4">
              <label
                htmlFor="knowledgeBase"
                className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <DocumentIcon className="h-5 w-5 mr-2" />
                Choisir un fichier
              </label>
              {selectedFileName && (
                <span className="text-sm text-gray-500">{selectedFileName}</span>
              )}
            </div>
            {fileError && (
              <p className="mt-2 text-sm text-red-600">{fileError}</p>
            )}
          </div>
        </div>

        {/* Voice Settings */}
        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center mb-6">
            <SpeakerWaveIcon className="h-6 w-6 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium">Paramètres vocaux <span className="text-red-500">*</span></h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Genre de la voix <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setAgent({ ...agent, voice: 'male' })}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${
                    agent.voice === 'male'
                      ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Masculine
                </button>
                <button
                  type="button"
                  onClick={() => setAgent({ ...agent, voice: 'female' })}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${
                    agent.voice === 'female'
                      ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Féminine
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="speed" className="block text-sm font-medium text-gray-700 mb-2">
                Vitesse de parole ({agent.speed}x) <span className="text-red-500">*</span>
              </label>
              <input
                type="range"
                id="speed"
                min="0.5"
                max="2"
                step="0.1"
                value={agent.speed}
                onChange={(e) => setAgent({ ...agent, speed: parseFloat(e.target.value) })}
                className="w-full"
                required
              />
            </div>
          </div>
        </div>

        {/* Language Settings */}
        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center mb-6">
            <LanguageIcon className="h-6 w-6 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium">Langue <span className="text-red-500">*</span></h2>
          </div>

          <div>
            <select
              value={agent.language}
              onChange={(e) => setAgent({ ...agent, language: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              required
            >
              <option value="">Sélectionner une langue</option>
              <optgroup label="Europe de l'Ouest">
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="pt">Português</option>
                <option value="it">Italiano</option>
                <option value="de">Deutsch</option>
                <option value="nl">Nederlands</option>
              </optgroup>
              <optgroup label="Europe de l'Est">
                <option value="ro">Română</option>
                <option value="pl">Polski</option>
                <option value="cs">Čeština</option>
                <option value="hu">Magyar</option>
              </optgroup>
              <optgroup label="Europe du Nord">
                <option value="sv">Svenska</option>
                <option value="da">Dansk</option>
                <option value="no">Norsk</option>
                <option value="fi">Suomi</option>
              </optgroup>
              <optgroup label="Amériques">
                <option value="pt-BR">Português (Brasil)</option>
                <option value="es-MX">Español (México)</option>
                <option value="en-US">English (US)</option>
              </optgroup>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Choisissez la langue principale de l'agent
            </p>
          </div>
        </div>

        {/* Personality Settings */}
        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center mb-6">
            <UserGroupIcon className="h-6 w-6 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium">Personnalité <span className="text-red-500">*</span></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {personalities.map((personality) => (
              <button
                type="button"
                key={personality.id}
                onClick={() => setAgent({ ...agent, personality: personality.id })}
                className={`p-4 rounded-lg border text-left ${
                  agent.personality === personality.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-200'
                }`}
              >
                <h3 className="font-medium mb-1">{personality.name}</h3>
                <p className="text-sm text-gray-500">{personality.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* LLM Prompt Section */}
        <div className="p-6 border-t border-gray-100">
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
              Prompt LLM <span className="text-red-500">*</span>
            </label>
            <p className="mt-1 text-sm text-gray-500 mb-4">
              Le prompt vous permettra de guider votre agent IA dans le déroulement de l'appel.
            </p>
            <textarea
              id="prompt"
              name="prompt"
              rows={4}
              value={agent.llmPrompt}
              onChange={(e) => setAgent(prev => ({ ...prev, llmPrompt: e.target.value }))}
              className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              placeholder="Entrez votre prompt ici..."
              required
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.push('/dashboard/ai-agents')}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Création en cours...' : 'Créer l\'agent'}
        </button>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </form>
  );
} 