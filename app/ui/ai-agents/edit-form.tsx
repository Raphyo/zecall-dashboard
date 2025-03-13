'use client';

import { useEffect, useState, useRef } from 'react';
import { LanguageIcon, DocumentIcon, UserIcon, CommandLineIcon, SpeakerWaveIcon, MusicalNoteIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { getAIAgents, updateAIAgent, deleteAIAgentFile } from '@/app/lib/api';
import { Toast } from '../toast';
import { useSession } from 'next-auth/react';
import { getUserIdFromEmail } from '@/app/lib/user-mapping';

// Import audio files
const metroAudio = '/api/audio?file=Almost-Empty-Metro-Station-in-Paris.mp3';
const office1Audio = '/api/audio?file=Office-Ambience.mp3';
const office2Audio = '/api/audio?file=Office-Ambience-2.mp3';

// Voice samples
const voiceSamples = [
  { id: 'guillaume-11labs', name: 'Guillaume (H)', gender: 'male', url: '/api/audio?file=voices%2FGuillaume-11labs.mp3' },
  { id: 'jessy-11labs', name: 'Lucien (H)', gender: 'male', url: '/api/audio?file=voices%2FLucien-11labs.mp3' },
  { id: 'audrey-11labs', name: 'Audrey (F)', gender: 'female', url: '/api/audio?file=voices%2FAudrey-11labs.mp3' },
  { id: 'lucien-11labs', name: 'Jessy (F)', gender: 'female', url: '/api/audio?file=voices%2FJessy-11labs.mp3' },

interface AIAgent {
  id: string;
  name: string;
  voice: string;
  language: string;
  background_audio: string;
  knowledge_base_path?: string;
  knowledge_base_type?: string;
  llm_prompt: string;
  created_at: string;
  user_id: string;
}

export function EditAIAgentForm({ agentId }: { agentId: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState({
    name: '',
    voice: 'Guillaume',
    backgroundAudio: 'none',
    language: 'fr-FR',
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
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const ambientSounds = [
    { id: 'none', name: 'Aucun', url: null },
    { id: 'metro', name: 'Métro Parisien', url: metroAudio },
    { id: 'office1', name: 'Bureau 1', url: office1Audio },
    { id: 'office2', name: 'Bureau 2', url: office2Audio },
  ];

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        if (!session?.user?.email) return;
        const agents = await getAIAgents(session.user.email);
        const currentAgent = agents.find((a: AIAgent) => a.id === agentId);
        if (currentAgent) {
          setAgent({
            name: currentAgent.name,
            voice: currentAgent.voice,
            backgroundAudio: currentAgent.background_audio || 'none',
            language: currentAgent.language,
            knowledgeBase: null,
            knowledgeBaseType: currentAgent.knowledge_base_type || 'pdf',
            llmPrompt: currentAgent.llm_prompt || ''
          });
          if (currentAgent.knowledge_base_path) {
            setSelectedFileName(currentAgent.knowledge_base_path.split('/').pop() || '');
          }
        }
      } catch (error) {
        console.error('Failed to fetch agent:', error);
        setToast({
          message: 'Une erreur est survenue lors du chargement de l\'agent',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [agentId, session?.user?.email]);

  const handlePlayPreview = async (soundId: string, url: string | null) => {
    if (!url) return;

    try {
      // If currently playing this sound, stop it
      if (currentlyPlaying === soundId) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        setCurrentlyPlaying(null);
        return;
      }

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Create new Audio element
      const audio = new Audio(url);
      
      // Set up error handling
      audio.onerror = () => {
        setToast({
          message: 'Erreur lors de la lecture du son',
          type: 'error'
        });
        setCurrentlyPlaying(null);
        audioRef.current = null;
      };

      // Add ended event listener
      audio.addEventListener('ended', () => {
        setCurrentlyPlaying(null);
        audioRef.current = null;
      });

      // Play the audio
      audioRef.current = audio;
      await audio.play();
      setCurrentlyPlaying(soundId);
    } catch (error) {
      setToast({
        message: 'Erreur lors de l\'initialisation du son',
        type: 'error'
      });
      setCurrentlyPlaying(null);
      audioRef.current = null;
    }
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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

    try {
      console.log('Starting form submission with data:', agent);

      const formData = new FormData();
      formData.append('name', agent.name);
      formData.append('voice', agent.voice);
      formData.append('language', agent.language);
      formData.append('llmPrompt', agent.llmPrompt);
      formData.append('backgroundAudio', agent.backgroundAudio);

      const userId = getUserIdFromEmail(session?.user?.email);
      console.log('User ID from email:', userId);
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      formData.append('userId', userId);

      if (agent.knowledgeBase) {
        console.log('Adding knowledge base file:', agent.knowledgeBase.name);
        formData.append('knowledgeBase', agent.knowledgeBase);
      }

      console.log('Submitting form data to API...');
      const result = await updateAIAgent(agentId, formData);
      console.log('API response:', result);

      router.push('/dashboard/ai-agents');
      router.refresh();
    } catch (error: any) {
      console.error('Detailed error in handleSubmit:', {
        error,
        message: error.message,
        stack: error.stack
      });
      setToast({
        message: `Erreur: ${error.message || 'Une erreur est survenue lors de la mise à jour de l\'agent'}`,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFile = async () => {
    try {
      if (!session?.user?.email) return;
      await deleteAIAgentFile(agentId, session.user.email);
      setAgent(prev => ({ ...prev, knowledgeBase: null }));
      setSelectedFileName('');
      const input = document.getElementById('knowledgeBase') as HTMLInputElement;
      if (input) input.value = '';
    } catch (error) {
      console.error('Failed to delete file:', error);
      setToast({
        message: 'Une erreur est survenue lors de la suppression du fichier',
        type: 'error'
      });
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
        {/* Basic Information */}
        <div className="p-6">
          <div className="flex items-center mb-6">
            <UserIcon className="h-6 w-6 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium">Nom de l'agent <span className="text-red-500">*</span></h2>
          </div>
          <div>
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

        {/* Voice Selection Section */}
        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center mb-6">
            <SpeakerWaveIcon className="h-6 w-6 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium">Voix <span className="text-red-500">*</span></h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {voiceSamples.map((voice) => (
              <div
                key={voice.id}
                className={`flex items-center justify-between px-4 py-3 rounded-md ${
                  agent.voice === voice.id
                    ? 'bg-blue-50 border-2 border-blue-200'
                    : 'bg-white border border-gray-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setAgent({ ...agent, voice: voice.id })}
                  className={`text-sm font-medium flex-grow text-left ${
                    agent.voice === voice.id
                      ? 'text-blue-700'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  {voice.name}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPreview(voice.id, voice.url);
                  }}
                  className={`p-1.5 rounded-full ml-2 ${
                    currentlyPlaying === voice.id
                      ? 'text-blue-600 bg-blue-100 hover:bg-blue-200'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {currentlyPlaying === voice.id ? (
                    <PauseIcon className="h-4 w-4" />
                  ) : (
                    <PlayIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Sélectionnez la voix que votre agent utilisera pour les appels. Cliquez sur le bouton de lecture pour écouter un exemple.
          </p>
        </div>

        {/* Background Audio Section */}
        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center mb-6">
            <MusicalNoteIcon className="h-6 w-6 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium">Son d'ambiance <span className="text-red-500">*</span></h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ambientSounds.map((sound) => (
              <div
                key={sound.id}
                className={`flex items-center justify-between px-4 py-3 rounded-md ${
                  agent.backgroundAudio === sound.id
                    ? 'bg-blue-50 border-2 border-blue-200'
                    : 'bg-white border border-gray-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setAgent({ ...agent, backgroundAudio: sound.id })}
                  className={`text-sm font-medium flex-grow text-left ${
                    agent.backgroundAudio === sound.id
                      ? 'text-blue-700'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  {sound.name}
                </button>
                {sound.url && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPreview(sound.id, sound.url);
                    }}
                    className={`p-1.5 rounded-full ml-2 ${
                      currentlyPlaying === sound.id
                        ? 'text-blue-600 bg-blue-100 hover:bg-blue-200'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {currentlyPlaying === sound.id ? (
                      <PauseIcon className="h-4 w-4" />
                    ) : (
                      <PlayIcon className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Sélectionnez un son d'ambiance pour créer une atmosphère plus immersive
          </p>
        </div>

        {/* Knowledge Base Section */}
        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center mb-6">
            <DocumentIcon className="h-6 w-6 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium">Base de connaissances</h2>
          </div>
          <div>
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
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Choisissez la langue principale de l'agent
            </p>
          </div>
        </div>

        {/* LLM Prompt Section */}
        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center mb-6">
            <CommandLineIcon className="h-6 w-6 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium">Prompt LLM <span className="text-red-500">*</span></h2>
          </div>
          <div>
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
          {isSubmitting ? 'Mise à jour en cours...' : 'Mettre à jour'}
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