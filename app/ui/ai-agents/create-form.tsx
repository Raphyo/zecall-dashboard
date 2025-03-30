'use client';

import { useState, useRef, useEffect } from 'react';
import { LanguageIcon, DocumentIcon, UserIcon, CommandLineIcon, SpeakerWaveIcon, MusicalNoteIcon, PlayIcon, PauseIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { createAIAgent } from '@/app/lib/api';
import { Toast } from '../toast';
import { useSession } from 'next-auth/react';

// Import audio files
const metroAudio = '/api/audio?file=backgrounds%2FAlmost-Empty-Metro-Station-in-Paris.mp3';
const office1Audio = '/api/audio?file=backgrounds%2FOffice-Ambience.mp3';
const office2Audio = '/api/audio?file=backgrounds%2FOffice-Ambience-2.mp3';

// Voice samples
const voiceSamples = [
  { id: 'guillaume-11labs', name: 'Guillaume (H)', gender: 'male', url: '/api/audio?file=voices%2FGuillaume-11labs.mp3' },
  { id: 'lucien-11labs', name: 'Lucien (H)', gender: 'male', url: '/api/audio?file=voices%2FLucien-11labs.mp3' },
  { id: 'audrey-11labs', name: 'Audrey (F)', gender: 'female', url: '/api/audio?file=voices%2FAudrey-11labs.mp3' },
  { id: 'jessy-11labs', name: 'Jessy (F)', gender: 'female', url: '/api/audio?file=voices%2FJessy-11labs.mp3' },
];

export function CreateAIAgentForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agent, setAgent] = useState({
    name: '',
    voiceName: 'guillaume-11labs',
    backgroundAudio: 'none',
    language: 'fr-FR',
    knowledgeBase: null as File | null,
    knowledgeBaseType: 'pdf',
    llmPrompt: '',
    allowInterruptions: false,
    aiStartsConversation: false,
    silenceDetection: false,
    silenceTimeout: 5,
    maxRetries: 3
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
    console.log('Starting form submission...');

    try {
      if (!session?.user?.id) {
        setToast({
          message: 'Vous devez être connecté pour créer un agent',
          type: 'error'
        });
        return;
      }

      const formData = new FormData();
      formData.append('name', agent.name);
      formData.append('voice_name', agent.voiceName);
      formData.append('background_audio', agent.backgroundAudio);
      formData.append('language', agent.language);
      formData.append('llm_prompt', agent.llmPrompt);
      formData.append('allow_interruptions', agent.allowInterruptions.toString());
      formData.append('ai_starts_conversation', agent.aiStartsConversation.toString());
      formData.append('silence_detection', agent.silenceDetection.toString());
      formData.append('silence_timeout', agent.silenceTimeout.toString());
      formData.append('max_retries', agent.maxRetries.toString());

      if (agent.knowledgeBase) {
        formData.append('knowledge_base', agent.knowledgeBase);
      }

      console.log('Form data prepared:', {
        name: agent.name,
        voice_name: agent.voiceName,
        background_audio: agent.backgroundAudio,
        language: agent.language,
        hasFile: !!agent.knowledgeBase
      });

      await createAIAgent(formData, session.user.id);
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
                  agent.voiceName === voice.id
                    ? 'bg-blue-50 border-2 border-blue-200'
                    : 'bg-white border border-gray-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setAgent({ ...agent, voiceName: voice.id })}
                  className={`text-sm font-medium flex-grow text-left ${
                    agent.voiceName === voice.id
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

        {/* Conversation Settings Section */}
        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center mb-6">
            <CommandLineIcon className="h-6 w-6 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium">Paramètres de conversation</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center group relative">
              <input
                type="checkbox"
                id="allowInterruptions"
                checked={agent.allowInterruptions}
                onChange={(e) => setAgent(prev => ({ ...prev, allowInterruptions: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="allowInterruptions" className="ml-2 block text-sm text-gray-900">
                Avec interruptions
              </label>
              <div className="relative inline-block ml-2">
                <InformationCircleIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-sm rounded-lg p-2 shadow-lg">
                  <div className="relative">
                    <div className="text-xs">
                      Lorsque cette option est activée, l'utilisateur peut interrompre l'agent IA pendant qu'il parle. 
                      Cela permet une conversation plus naturelle mais peut affecter la cohérence des réponses.
                    </div>
                    <div className="absolute w-3 h-3 bg-gray-900 transform rotate-45 left-1/2 -translate-x-1/2 -bottom-1.5"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center group relative">
              <input
                type="checkbox"
                id="silenceDetection"
                checked={agent.silenceDetection}
                onChange={(e) => setAgent(prev => ({ ...prev, silenceDetection: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="silenceDetection" className="ml-2 block text-sm text-gray-900">
                Détection de silence
              </label>
              <div className="relative inline-block ml-2">
                <InformationCircleIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-sm rounded-lg p-2 shadow-lg">
                  <div className="relative">
                    <div className="text-xs">
                      Nombre de secondes que l'IA attendra avant de parler lorsqu'elle détecte un silence. 
                      Nombre maximum de tentatives de relance avant de raccrocher.
                    </div>
                    <div className="absolute w-3 h-3 bg-gray-900 transform rotate-45 left-1/2 -translate-x-1/2 -bottom-1.5"></div>
                  </div>
                </div>
              </div>
            </div>

            {agent.silenceDetection && (
              <div className="ml-6 space-y-4">
                <div className="flex flex-col space-y-2">
                  <label htmlFor="silenceTimeout" className="text-sm text-gray-700">
                    Délai d'attente (secondes)
                  </label>
                  <input
                    type="range"
                    id="silenceTimeout"
                    min="5"
                    max="45"
                    value={agent.silenceTimeout}
                    onChange={(e) => setAgent(prev => ({ ...prev, silenceTimeout: Number(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>5s</span>
                    <span>{agent.silenceTimeout}s</span>
                    <span>45s</span>
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  <label htmlFor="maxRetries" className="text-sm text-gray-700">
                    Nombre maximum de tentatives
                  </label>
                  <input
                    type="range"
                    id="maxRetries"
                    min="1"
                    max="5"
                    value={agent.maxRetries}
                    onChange={(e) => setAgent(prev => ({ ...prev, maxRetries: Number(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1</span>
                    <span>{agent.maxRetries}</span>
                    <span>5</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="aiStartsConversation"
                checked={agent.aiStartsConversation}
                onChange={(e) => setAgent(prev => ({ ...prev, aiStartsConversation: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="aiStartsConversation" className="ml-2 block text-sm text-gray-900">
                L'IA commence la conversation
              </label>
            </div>
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