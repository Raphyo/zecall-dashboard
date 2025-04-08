'use client';

import { useState, useRef, useEffect } from 'react';
import { LanguageIcon, DocumentIcon, UserIcon, CommandLineIcon, SpeakerWaveIcon, MusicalNoteIcon, PlayIcon, PauseIcon, InformationCircleIcon, PlusIcon, PhoneIcon, ArrowPathRoundedSquareIcon, Squares2X2Icon, TrashIcon, PencilIcon, TagIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { createAIAgent, createAgentFunction, updateAgentFunction, removeAgentFunction, getAgentFunctions, ORCHESTRATOR_URL, updateAIAgent, getAIAgents } from '@/app/lib/api';
import { Toast } from '../toast';
import { useSession } from 'next-auth/react';
import { builtInVariables, Variable } from '@/app/lib/constants';

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

// Add these type definitions at the top of the file, near other interfaces
interface BaseConfig {
  name: string;
  description?: string;
  active: boolean;
}

interface ParsedParameters {
  transferTo?: string;
  [key: string]: any;
}

// Update the existing interfaces
interface CustomFunction extends BaseConfig {
  url: string;
  apiTimeout?: number;
  parameters?: string;
  speakDuringExecution: boolean;
  executionMessage?: string;
}

interface TransferFunction extends BaseConfig {
  transferTo: string;
}

interface EndCallFunction extends BaseConfig {
  // No additional properties needed
}

interface AgentFunction {
  id?: string | number;
  type: 'end_call' | 'transfer' | 'custom';
  config: EndCallFunction | TransferFunction | CustomFunction;
}

interface AIAgent {
  id: string;
  name: string;
  voice_name: string;
  background_audio: string;
  language: string;
  llm_prompt: string;
  allow_interruptions: boolean;
  ai_starts_conversation: boolean;
  silence_detection: boolean;
  silence_timeout: number;
  max_retries: number;
  max_call_duration: number;
  knowledge_base_path?: string;
  variables?: Variable[];
  labels?: string[];
}

export function CreateAIAgentForm({ agentId, initialData }: { agentId?: string; initialData?: AIAgent }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agent, setAgent] = useState({
    id: initialData?.id || '',
    name: initialData?.name || '',
    voiceName: initialData?.voice_name || 'guillaume-11labs',
    backgroundAudio: initialData?.background_audio || 'none',
    language: initialData?.language || 'fr-FR',
    knowledgeBase: null as File | null,
    knowledgeBaseType: 'pdf',
    llmPrompt: initialData?.llm_prompt || '',
    allowInterruptions: initialData?.allow_interruptions || false,
    aiStartsConversation: initialData?.ai_starts_conversation || false,
    silenceDetection: initialData?.silence_detection || false,
    silenceTimeout: initialData?.silence_timeout || 5,
    maxRetries: initialData?.max_retries || 3,
    maxCallDuration: initialData?.max_call_duration || 30,
    variables: initialData?.variables || [...builtInVariables],
    labels: initialData?.labels || []
  });
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [toast, setToast] = useState<{
    message: string;
    type: 'error' | 'success';
  } | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [functions, setFunctions] = useState<AgentFunction[]>([]);
  const [showFunctionModal, setShowFunctionModal] = useState(false);
  const [selectedFunctionType, setSelectedFunctionType] = useState<'end_call' | 'transfer' | 'custom' | null>(null);
  const [functionConfig, setFunctionConfig] = useState<EndCallFunction | TransferFunction | CustomFunction | null>(null);
  const [editingFunction, setEditingFunction] = useState<{ index: number; function: AgentFunction } | null>(null);
  const [showVariableModal, setShowVariableModal] = useState(false);
  const [editingVariable, setEditingVariable] = useState<{ index: number; variable: Variable } | null>(null);
  const [showTransferError, setShowTransferError] = useState(false);
  const [showEndCallDescriptionError, setShowEndCallDescriptionError] = useState(false);

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
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', agent.name);
      formData.append('voice_name', agent.voiceName);
      formData.append('language', agent.language);
      formData.append('llm_prompt', agent.llmPrompt);
      formData.append('background_audio', agent.backgroundAudio);
      formData.append('allow_interruptions', agent.allowInterruptions.toString());
      formData.append('ai_starts_conversation', agent.aiStartsConversation.toString());
      formData.append('silence_detection', agent.silenceDetection.toString());
      formData.append('silence_timeout', agent.silenceTimeout.toString());
      formData.append('max_retries', agent.maxRetries.toString());
      formData.append('max_call_duration', agent.maxCallDuration.toString());
      formData.append('labels', JSON.stringify(agent.labels));
      
      // Filter out built-in variables and convert to dynamic_variables
      const dynamicVariables = agent.variables.filter(v => !v.isBuiltIn);
      formData.append('dynamic_variables', JSON.stringify(dynamicVariables));

      if (!session?.user?.id) {
        throw new Error('User ID not found');
      }
      formData.append('user_id', session.user.id);

      if (agent.knowledgeBase) {
        formData.append('knowledge_base', agent.knowledgeBase);
      }

      let savedAgent: AIAgent;
      if (agentId) {
        savedAgent = await updateAIAgent(agentId, formData);
      } else {
        savedAgent = await createAIAgent(formData, session.user.id);
      }

      // Create or update functions for the agent
      if (functions.length > 0) {
        for (const func of functions) {
          let functionData: any = {
            name: func.config.name,
            description: func.config.description || "",
            is_active: func.config.active,
            type: func.type,
            parameters: '{}', // Default empty JSON string
            is_external: false // Default to false
          };

          // Add type-specific data
          if (func.type === 'custom') {
            const customConfig = func.config as CustomFunction;
            functionData.is_external = true;
            try {
              // Parse and re-stringify to ensure valid JSON
              const params = customConfig.parameters ? JSON.parse(customConfig.parameters) : {};
              functionData.parameters = JSON.stringify(params);
            } catch (e) {
              console.error('Error parsing parameters JSON:', e);
              functionData.parameters = '{}';
            }
            functionData.external_config = {
              url: customConfig.url,
              apiTimeout: customConfig.apiTimeout || 120000,
              speakDuringExecution: customConfig.speakDuringExecution,
              executionMessage: customConfig.executionMessage || ''
            };
          } else if (func.type === 'transfer') {
            functionData.parameters = JSON.stringify({
              transferTo: (func.config as TransferFunction).transferTo
            });
          }

          try {
            if (func.id) {
              // If it's a temporary ID (negative number), create as new function instead of updating
              if (typeof func.id === 'number' && func.id < 0) {
                // Create new function instead of trying to update a temporary ID
                await createAgentFunction(savedAgent.id, functionData, session.user.id);
              } else {
                // Update existing function - first update active state, then update other properties
                const functionId = typeof func.id === 'string' ? parseInt(func.id, 10) : func.id;
                await updateAgentFunction(savedAgent.id, functionId, func.config.active, session.user.id);
                // Use createAgentFunction to update other properties (it handles both creation and updates)
                await createAgentFunction(savedAgent.id, functionData, session.user.id);
              }
            } else {
              // Create new function
              await createAgentFunction(savedAgent.id, functionData, session.user.id);
            }
          } catch (error: any) {
            console.error('Error creating/updating function:', error);
            setToast({
              message: `Erreur lors de la création/mise à jour de la fonction ${func.config.name}: ${error.message}`,
              type: 'error'
            });
            // Continue with other functions even if one fails
            continue;
          }
        }
      }

      // Send webhook to update configuration
      try {
        const webhookResponse = await fetch(
          `${ORCHESTRATOR_URL}/webhook/config-update?agent_id=${encodeURIComponent(savedAgent.id)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text();
          console.error('Failed to update agent configuration:', errorText);
          setToast({
            message: `Agent ${agentId ? 'modifié' : 'créé'} mais erreur lors de la configuration: ${errorText}`,
            type: 'error'
          });
          return;
        }
      } catch (error: any) {
        console.error('Error updating agent configuration:', error);
        setToast({
          message: `Agent ${agentId ? 'modifié' : 'créé'} mais erreur lors de la configuration`,
          type: 'error'
        });
        return;
      }

      router.push('/dashboard/ai-agents');
    } catch (error: any) {
      setToast({
        message: `Error: ${error.message || 'An error occurred while saving the agent'}`,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditFunction = (index: number, func: AgentFunction) => {
    // Ensure we have a valid type
    if (!func.type) {
      if (func.config.name === 'end_call') {
        func.type = 'end_call';
      } else if ('transferTo' in func.config) {
        func.type = 'transfer';
      } else {
        func.type = 'custom';
      }
    }
    
    // First set the editing state
    const newEditingState = { index, function: func };
    const newFunctionConfig = { ...func.config };
    
    // Ensure we set all states in the correct order
    setEditingFunction(newEditingState);
    setFunctionConfig(newFunctionConfig);
    setSelectedFunctionType(func.type as 'end_call' | 'transfer' | 'custom');
    setShowFunctionModal(true);
  };

  const handleModalSave = () => {
    // For transfer function, validate phone number and show error if needed
    if (selectedFunctionType === 'transfer' && !(functionConfig as TransferFunction)?.transferTo) {
      setShowTransferError(true);
      return;
    }
    
    // For end_call function, validate description and show error if needed
    if (selectedFunctionType === 'end_call' && !(functionConfig as EndCallFunction)?.description) {
      setShowEndCallDescriptionError(true);
      return;
    }
    
    if (editingFunction) {
      // When editing, use the current function type if selectedFunctionType is not set
      const type = selectedFunctionType || editingFunction.function.type;
      if (functionConfig) {
        handleAddFunction(type as 'end_call' | 'transfer' | 'custom', functionConfig);
      }
    } else if (selectedFunctionType && functionConfig) {
      handleAddFunction(selectedFunctionType, functionConfig);
    }
  };

  const openFunctionModal = () => {
    setShowFunctionModal(true);
    setSelectedFunctionType(null);
    setFunctionConfig(null);
    setEditingFunction(null);
    setShowTransferError(false);
    setShowEndCallDescriptionError(false);
  };

  const handleAddFunction = (type: 'end_call' | 'transfer' | 'custom', config: any) => {
    if (editingFunction !== null) {
      // Update existing function
      setFunctions(prev => prev.map((func, idx) => 
        idx === editingFunction.index ? { type, config, id: func.id } : func
      ));
    } else {
      // Add new function with a temporary ID for new functions
      // Use a negative ID to distinguish from server-assigned IDs (usually positive)
      // Use a smaller negative number to avoid integer overflow issues
      const tempId = -(Math.floor(Math.random() * 1000) + 1);
      setFunctions(prev => [...prev, { type, config, id: tempId }]);
    }
    
    setSelectedFunctionType(null);
    setFunctionConfig(null);
    setShowFunctionModal(false);
    setEditingFunction(null);
  };

  const handleUpdateFunctionStatus = async (functionId: string | number, isActive: boolean) => {
    // Optimistically update UI
    setFunctions(functions.map(func => 
      func.id === functionId 
        ? { ...func, config: { ...func.config, active: isActive } }
        : func
    ));

    try {
      // For temporary IDs (negative numbers), don't make API calls - just update UI
      if (typeof functionId === 'number' && functionId < 0) {
        // Skip API call for temporary functions that haven't been saved yet
        return;
      }

      if (!agentId) {
        throw new Error('Agent ID is required to update function status');
      }

      if (!session?.user?.id) {
        throw new Error('User ID not found');
      }

      // Convert function ID to number if it's a string
      const numericFunctionId = typeof functionId === 'string' ? parseInt(functionId, 10) : functionId;
      // Make the API call in the background
      await updateAgentFunction(agentId, numericFunctionId, isActive, session.user.id);
    } catch (error: any) {
      // If the API call fails, revert the optimistic update
      setFunctions(functions.map(func => 
        func.id === functionId 
          ? { ...func, config: { ...func.config, active: !isActive } }
          : func
      ));

      console.error('Error updating function status:', error);
      setToast({
        message: `Erreur lors de la mise à jour de la fonction: ${error.message}`,
        type: 'error'
      });
    }
  };

  const handleDeleteFunction = async (functionId: string | number) => {
    try {
      // If it's a temporary ID (negative number), just remove from state
      if (typeof functionId === 'number' && functionId < 0) {
        setFunctions(functions.filter(func => func.id !== functionId));
        return;
      }
      
      if (!agentId) {
        throw new Error('Agent ID is required to delete function');
      }

      if (!session?.user?.id) {
        throw new Error('User ID not found');
      }

      // Convert function ID to number if it's a string
      const numericFunctionId = typeof functionId === 'string' ? parseInt(functionId, 10) : functionId;
      await removeAgentFunction(agentId, numericFunctionId, session.user.id);
      
      // Update local state
      setFunctions(functions.filter(func => func.id !== functionId));
    } catch (error: any) {
      console.error('Error deleting function:', error);
      setToast({
        message: `Erreur lors de la suppression de la fonction: ${error.message}`,
        type: 'error'
      });
    }
  };

  // Load existing functions if editing an agent
  useEffect(() => {
    const loadAgentFunctions = async () => {
      if (agentId && session?.user?.id) {
        try {
          const fetchedFunctions = await getAgentFunctions(agentId, session.user.id);
          
          // Transform the fetched functions to match our local format
          const transformedFunctions = fetchedFunctions.map((func: any) => {
            // Safely parse parameters
            let parsedParameters: ParsedParameters = {};
            try {
              if (typeof func.parameters === 'string') {
                parsedParameters = JSON.parse(func.parameters || '{}');
              } else if (func.parameters && typeof func.parameters === 'object') {
                parsedParameters = func.parameters;
              }
            } catch (e) {
              console.warn('Failed to parse parameters for function:', func.name, e);
              parsedParameters = {};
            }
            
            // Determine the function type based on the function's properties
            let type: 'end_call' | 'transfer' | 'custom';
            if (func.name === 'end_call') {
              type = 'end_call';
            } else if (parsedParameters.transferTo) {
              type = 'transfer';
            } else {
              type = 'custom';
            }

            // Create the base config
            const baseConfig: BaseConfig = {
              name: func.name || '',
              description: func.description,
              active: func.is_active || false,
            };

            // Add type-specific properties
            let config: CustomFunction | TransferFunction | EndCallFunction;
            if (type === 'custom') {
              config = {
                ...baseConfig,
                url: func.external_config?.url || '',
                apiTimeout: func.external_config?.apiTimeout || 120000,
                parameters: typeof func.parameters === 'string' ? func.parameters : JSON.stringify(func.parameters),
                speakDuringExecution: func.external_config?.speakDuringExecution || false,
                executionMessage: func.external_config?.executionMessage || '',
              };
            } else if (type === 'transfer') {
              config = {
                ...baseConfig,
                transferTo: parsedParameters.transferTo || '',
              };
            } else {
              config = baseConfig;
            }

            return {
              id: func.id,
              type,
              config
            };
          });

          setFunctions(transformedFunctions);
        } catch (error) {
          console.error('Error loading agent functions:', error);
          setToast({
            message: 'Erreur lors du chargement des fonctions',
            type: 'error'
          });
        }
      }
    };

    loadAgentFunctions();
  }, [agentId, session?.user?.id]);

  // Load agent details when editing
  useEffect(() => {
    if (initialData?.knowledge_base_path) {
      setSelectedFileName(initialData.knowledge_base_path.split('/').pop() || '');
    }
  }, [initialData]);

  useEffect(() => {
    console.log('Modal state changed:', {
      showFunctionModal,
      selectedFunctionType,
      editingFunction,
      functionConfig
    });
  }, [showFunctionModal, selectedFunctionType, editingFunction, functionConfig]);

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if ((selectedFunctionType === 'transfer' && !(functionConfig as TransferFunction)?.transferTo) || 
          (selectedFunctionType === 'custom' && !(functionConfig as CustomFunction)?.name) ||
          (selectedFunctionType === 'end_call' && !(functionConfig as EndCallFunction)?.description)) {
        // Show appropriate error message
        if (selectedFunctionType === 'transfer') {
          setShowTransferError(true);
        } else if (selectedFunctionType === 'end_call') {
          setShowEndCallDescriptionError(true);
        }
        return;
      }
      handleModalSave();
    }
  };

  const handleFunctionInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const handleEditVariable = (index: number, variable: Variable) => {
    if (!variable.isBuiltIn) {
      setEditingVariable({ index, variable: { ...variable } });
      setShowVariableModal(true);
    }
  };

  const handleVariableModalSave = (variable: Variable) => {
    if (editingVariable !== null && editingVariable.index >= 0) {
      // Update existing variable
      setAgent({
        ...agent,
        variables: agent.variables.map((v, i) => 
          i === editingVariable.index ? variable : v
        )
      });
    } else {
      // Add new variable
      setAgent({
        ...agent,
        variables: [...agent.variables, variable]
      });
    }
    setShowVariableModal(false);
    setEditingVariable(null);
  };

  const handleVariableModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingVariable?.variable.name) {
        const variableToSave: Variable = {
          ...editingVariable.variable,
          source: 'CSV input',
          isBuiltIn: false
        };
        handleVariableModalSave(variableToSave);
      }
    }
  };

  const handleAddLabel = (label: string) => {
    if (label && !agent.labels.includes(label)) {
      setAgent(prev => ({
        ...prev,
        labels: [...prev.labels, label]
      }));
    }
  };

  const handleRemoveLabel = (label: string) => {
    setAgent(prev => ({
      ...prev,
      labels: prev.labels.filter(l => l !== label)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-0 max-h-full">
      <div className="flex-1 overflow-y-auto">
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
                      <span className="font-bold text-sm text-gray-700">{agent.silenceTimeout}s</span>
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
                      <span className="font-bold text-sm text-gray-700">{agent.maxRetries}</span>
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

              {/* Max Call Duration Control */}
              <div className="mt-6">
                <div className="flex flex-col space-y-2">
                  <label htmlFor="maxCallDuration" className="text-sm text-gray-700">
                    Durée maximale d'appel
                  </label>
                  <input
                    type="range"
                    id="maxCallDuration"
                    min="1"
                    max="60"
                    value={agent.maxCallDuration}
                    onChange={(e) => setAgent(prev => ({ ...prev, maxCallDuration: Number(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1 min</span>
                    <span className="font-bold text-sm text-gray-700">{agent.maxCallDuration} min</span>
                    <span>60 min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Variables Section */}
          <div className="p-6 border-t border-gray-100">
            <div className="flex items-center mb-6">
              <CommandLineIcon className="h-6 w-6 text-gray-600 mr-2" />
              <h2 className="text-lg font-medium">Variables</h2>
            </div>
            <div>
              <p className="mt-1 text-sm text-gray-500 mb-4">
                Gérez les variables qui seront disponibles pendant l'appel. Les variables intégrées sont automatiquement disponibles.
                Pour utiliser une variable dans le prompt, entourez-la d'accolades, par exemple : {'{from_number}'} ou {'{ma_variable}'}.
              </p>

              {/* Variables List */}
              <div className="space-y-3 mb-4">
                {agent.variables.map((variable, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-3 border rounded-md ${
                      !variable.isBuiltIn ? 'cursor-pointer hover:bg-gray-50' : ''
                    }`}
                    onClick={() => handleEditVariable(index, variable)}
                  >
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium text-sm">{variable.name}</p>
                        <p className="text-xs text-gray-500">Type: {variable.type}</p>
                      </div>
                      {variable.source && (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          variable.source === 'built-in' 
                            ? 'bg-blue-100 text-blue-800'
                            : variable.source === 'CSV input'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {variable.source}
                        </span>
                      )}
                    </div>
                    {!variable.isBuiltIn && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAgent({
                            ...agent,
                            variables: agent.variables.filter((_, i) => i !== index)
                          });
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-full"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Variable Button */}
              <button
                type="button"
                onClick={() => {
                  // Initialize with a default new variable
                  setEditingVariable({
                    index: -1,
                    variable: {
                      name: '',
                      type: 'String',
                      source: 'CSV input',
                      isBuiltIn: false
                    }
                  });
                  setShowVariableModal(true);
                }}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Ajouter une variable
              </button>
            </div>
          </div>

          {/* Labels Section */}
          <div className="p-6 border-t border-gray-100">
            <div className="flex items-center mb-6">
              <TagIcon className="h-6 w-6 text-gray-600 mr-2" />
              <h2 className="text-lg font-medium">Labels</h2>
            </div>
            <div>
              <p className="mt-1 text-sm text-gray-500 mb-4">
                Ajoutez des labels pour catégoriser les transcriptions de conversations.
              </p>
              
              {/* Label Input */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Ajouter un label..."
                  className="block flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      handleAddLabel(input.value.trim());
                      input.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Ajouter un label..."]') as HTMLInputElement;
                    handleAddLabel(input.value.trim());
                    input.value = '';
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Ajouter
                </button>
              </div>

              {/* Labels Display */}
              <div className="flex flex-wrap gap-2">
                {agent.labels.map((label, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
                  >
                    {label}
                    <button
                      type="button"
                      onClick={() => handleRemoveLabel(label)}
                      className="p-0.5 hover:bg-blue-200 rounded-full"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Functions Section */}
          <div className="p-6 border-t border-gray-100">
            <div className="flex items-center mb-6">
              <Squares2X2Icon className="h-6 w-6 text-gray-600 mr-2" />
              <h2 className="text-lg font-medium">Fonctions</h2>
            </div>
            <div>
              <p className="mt-1 text-sm text-gray-500 mb-4">
                Activez votre agent avec des capacités telles que la fin d'appel, le transfert d'appel, etc.
              </p>
              
              {/* Functions List */}
              <div className="space-y-3 mb-4">
                {functions.map((func, index) => (
                  <div key={index} className="flex flex-col p-3 border rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        {func.type === 'end_call' && <PhoneIcon className="h-5 w-5 text-gray-500 mr-2" />}
                        {func.type === 'transfer' && <ArrowPathRoundedSquareIcon className="h-5 w-5 text-gray-500 mr-2" />}
                        {func.type === 'custom' && <Squares2X2Icon className="h-5 w-5 text-gray-500 mr-2" />}
                        <div>
                          <p className="font-medium text-sm">{func.config.name}</p>
                          {func.config.description && (
                            <p className="text-sm text-gray-500">{func.config.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditFunction(index, func)}
                          className="inline-flex items-center p-1.5 border border-gray-300 rounded-full text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          title="Modifier la fonction"
                        >
                          <span className="sr-only">Modifier la fonction</span>
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFunction(func.id !== undefined ? func.id : -1)}
                          className="inline-flex items-center p-1.5 border border-red-300 rounded-full text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          title="Supprimer la fonction"
                        >
                          <span className="sr-only">Supprimer la fonction</span>
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center flex-grow">
                        <span className="text-sm text-gray-500 mr-3">État :</span>
                        <button
                          type="button"
                          onClick={() => {
                            // Toggle active state even for new functions (without server ID)
                            const newActiveState = !func.config.active;
                            
                            if (func.id && typeof func.id === 'number' && func.id > 0) {
                              // For existing functions with valid server ID
                              handleUpdateFunctionStatus(func.id, newActiveState);
                            } else {
                              // For new functions, just update the local state
                              setFunctions(prev => 
                                prev.map((f, i) => i === index ? 
                                  { ...f, config: { ...f.config, active: newActiveState } } : f
                                )
                              );
                            }
                          }}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            func.config.active ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span className="sr-only">
                            {func.config.active ? 'Désactiver la fonction' : 'Activer la fonction'}
                          </span>
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              func.config.active ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className="text-sm text-gray-500 ml-3">
                          {func.config.active ? 'Activée' : 'Désactivée'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Function Button */}
              <button
                type="button"
                onClick={openFunctionModal}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Ajouter une fonction
              </button>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white py-4 px-6 border-t border-gray-200">
          <div className="flex justify-end gap-4">
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
              {isSubmitting 
                ? (agentId ? 'Mise à jour en cours...' : 'Création en cours...') 
                : (agentId ? 'Mettre à jour' : 'Créer l\'agent')}
            </button>
          </div>
        </div>
      </div>

      {/* Variable Modal */}
      {showVariableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onKeyDown={handleVariableModalKeyDown}>
            <div className="p-6 border-b">
              <h3 className="text-lg font-medium">
                {editingVariable && editingVariable.index >= 0 ? 'Modifier la variable' : 'Ajouter une variable'}
              </h3>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingVariable?.variable.name || ''}
                    onChange={(e) => {
                      const newName = e.target.value;
                      if (editingVariable) {
                        setEditingVariable({
                          ...editingVariable,
                          variable: { ...editingVariable.variable, name: newName }
                        });
                      } else {
                        const newVariable: Variable = {
                          name: newName,
                          type: 'String',
                          source: 'CSV input',
                          isBuiltIn: false
                        };
                        setEditingVariable({ index: -1, variable: newVariable });
                      }
                    }}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    placeholder="Nom de la variable"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingVariable?.variable.type || 'String'}
                    onChange={(e) => {
                      const variable = editingVariable?.variable || { name: '', type: 'String', source: 'CSV input', isBuiltIn: false };
                      setEditingVariable({
                        index: editingVariable?.index || -1,
                        variable: { 
                          ...variable,
                          type: e.target.value as 'String' | 'Boolean' | 'Datetime' | 'Number'
                        }
                      });
                    }}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="String">String</option>
                    <option value="Number">Number</option>
                    <option value="Boolean">Boolean</option>
                    <option value="Datetime">Datetime</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Source
                  </label>
                  <input
                    type="text"
                    value="CSV input"
                    disabled
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm bg-gray-50 text-gray-600 cursor-not-allowed sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowVariableModal(false);
                  setEditingVariable(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editingVariable) {
                    const variableToSave: Variable = {
                      ...editingVariable.variable,
                      source: 'CSV input',
                      isBuiltIn: false
                    };
                    handleVariableModalSave(variableToSave);
                  }
                }}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                disabled={!editingVariable?.variable.name}
              >
                {(editingVariable && editingVariable.index >= 0) ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Function Modal */}
      {showFunctionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onKeyDown={handleModalKeyDown}>
            {/* Modal Header */}
            <div className="p-6 border-b">
              <h3 className="text-lg font-medium">
                {editingFunction ? 'Modifier la fonction' : 'Ajouter une fonction'}
              </h3>
            </div>

            {/* Modal Content - Make this section scrollable */}
            <div className="flex-1 overflow-y-auto">
              {/* Function Type Selection */}
              {!selectedFunctionType && !editingFunction && (
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFunctionType('end_call');
                        setFunctionConfig({
                          name: 'end_call',
                          active: true
                        });
                      }}
                      className="flex flex-col items-center p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50"
                    >
                      <PhoneIcon className="h-8 w-8 text-gray-600 mb-2" />
                      <span className="text-sm font-medium">Fin d'appel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFunctionType('transfer');
                        setFunctionConfig({
                          name: 'transfer_call',
                          transferTo: '',
                          active: true
                        });
                      }}
                      className="flex flex-col items-center p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50"
                    >
                      <ArrowPathRoundedSquareIcon className="h-8 w-8 text-gray-600 mb-2" />
                      <span className="text-sm font-medium">Transfert d'appel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFunctionType('custom');
                        setFunctionConfig({
                          name: '',
                          url: '',
                          speakDuringExecution: false,
                          active: true
                        });
                      }}
                      className="flex flex-col items-center p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50"
                    >
                      <Squares2X2Icon className="h-8 w-8 text-gray-600 mb-2" />
                      <span className="text-sm font-medium">Fonction personnalisée</span>
                    </button>
                  </div>
                </div>
              )}

              {/* End Call Configuration */}
              {(selectedFunctionType === 'end_call' || (editingFunction?.function.type === 'end_call' && !selectedFunctionType)) && (
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nom</label>
                      <input
                        type="text"
                        value="end_call"
                        readOnly
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm bg-gray-50 text-gray-600 cursor-not-allowed sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={(functionConfig as EndCallFunction)?.description || ''}
                        onChange={(e) => {
                          setFunctionConfig({ 
                            ...functionConfig as EndCallFunction,
                            description: e.target.value 
                          });
                          // Clear error when user starts typing
                          if (e.target.value) {
                            setShowEndCallDescriptionError(false);
                          }
                        }}
                        onKeyDown={handleFunctionInputKeyDown}
                        className={`mt-1 block w-full rounded-md border ${showEndCallDescriptionError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'} px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 sm:text-sm`}
                        placeholder="Entrez une description"
                        required
                      />
                      {showEndCallDescriptionError && (
                        <p className="mt-2 text-sm text-red-600">Veuillez saisir une description pour la fonction de fin d'appel</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Transfer Call Configuration */}
              {(selectedFunctionType === 'transfer' || (editingFunction?.function.type === 'transfer' && !selectedFunctionType)) && (
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nom</label>
                      <input
                        type="text"
                        value="transfer_call"
                        readOnly
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm bg-gray-50 text-gray-600 cursor-not-allowed sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description (Optionnel)</label>
                      <input
                        type="text"
                        value={(functionConfig as TransferFunction)?.description || ''}
                        onChange={(e) => setFunctionConfig({ 
                          ...functionConfig as TransferFunction,
                          description: e.target.value 
                        })}
                        onKeyDown={handleFunctionInputKeyDown}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        placeholder="Transférer l'appel vers un agent humain"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Numéro de transfert <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={(functionConfig as TransferFunction)?.transferTo || ''}
                        onChange={(e) => {
                          setFunctionConfig({ 
                            ...functionConfig as TransferFunction,
                            transferTo: e.target.value 
                          });
                          // Clear error when user starts typing
                          if (e.target.value) {
                            setShowTransferError(false);
                          }
                        }}
                        onKeyDown={handleFunctionInputKeyDown}
                        className={`mt-1 block w-full rounded-md border ${showTransferError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'} px-3 py-2 shadow-sm focus:outline-none sm:text-sm`}
                        placeholder="+33123456789"
                        required
                      />
                      {showTransferError && (
                        <p className="mt-2 text-sm text-red-600">Veuillez saisir un numéro de téléphone pour le transfert</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Function Configuration */}
              {(selectedFunctionType === 'custom' || (editingFunction?.function.type === 'custom' && !selectedFunctionType)) && (
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nom <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={(functionConfig as CustomFunction)?.name || ''}
                        onChange={(e) => setFunctionConfig({ 
                          ...functionConfig as CustomFunction,
                          name: e.target.value,
                          active: true
                        })}
                        onKeyDown={handleFunctionInputKeyDown}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        placeholder="Entrez le nom de la fonction"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={(functionConfig as CustomFunction)?.description || ''}
                        onChange={(e) => setFunctionConfig({ 
                          ...functionConfig as CustomFunction,
                          description: e.target.value 
                        })}
                        onKeyDown={handleFunctionInputKeyDown}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        placeholder="Entrez une description"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={(functionConfig as CustomFunction)?.url || ''}
                        onChange={(e) => setFunctionConfig({ 
                          ...functionConfig as CustomFunction,
                          url: e.target.value 
                        })}
                        onKeyDown={handleFunctionInputKeyDown}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        placeholder="Entrez l'URL de la fonction"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Délai d'expiration API (Optionnel)</label>
                      <input
                        type="number"
                        value={(functionConfig as CustomFunction)?.apiTimeout || 120000}
                        onChange={(e) => setFunctionConfig({ 
                          ...functionConfig as CustomFunction,
                          apiTimeout: Number(e.target.value) 
                        })}
                        onKeyDown={handleFunctionInputKeyDown}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        placeholder="Délai en millisecondes"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Paramètres (Optionnel)</label>
                      <p className="mt-1 text-sm text-gray-500 mb-2">
                        JSON schema qui définit le format dans lequel le LLM retournera. Veuillez consulter la documentation.
                      </p>
                      <textarea
                        value={(functionConfig as CustomFunction)?.parameters || ''}
                        onChange={(e) => setFunctionConfig({ 
                          ...functionConfig as CustomFunction,
                          parameters: e.target.value 
                        })}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm h-32 bg-gray-900 text-gray-100"
                        placeholder="Enter JSON Schema here..."
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFunctionConfig({ 
                            ...functionConfig as CustomFunction,
                            parameters: JSON.stringify({
                              name: "search_product",
                              description: "Search for a product in the catalog",
                              properties: {
                                query: {
                                  type: "string",
                                  description: "Search query"
                                }
                              },
                              required: ["query"]
                            }, null, 2)
                          })}
                          className="px-3 py-1 text-sm bg-gray-900 text-white rounded-full hover:bg-gray-800"
                        >
                          example
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={(functionConfig as CustomFunction)?.speakDuringExecution}
                          onChange={(e) => setFunctionConfig({ 
                            ...functionConfig as CustomFunction,
                            speakDuringExecution: e.target.checked 
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Parler pendant l'exécution</span>
                      </label>
                      <p className="text-xs text-gray-500 ml-6">
                        Si la fonction prend plus de 2 secondes, l'agent peut dire quelque chose comme : "Je vérifie cela pour vous."
                      </p>
                      
                      {(functionConfig as CustomFunction)?.speakDuringExecution && (
                        <div className="mt-3 ml-6">
                          <label className="block text-sm text-gray-700">Message pendant l'exécution</label>
                          <input
                            type="text"
                            value={(functionConfig as CustomFunction)?.executionMessage || ''}
                            onChange={(e) => setFunctionConfig({ 
                              ...functionConfig as CustomFunction,
                              executionMessage: e.target.value 
                            })}
                            onKeyDown={handleFunctionInputKeyDown}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                            placeholder="Je vérifie cela pour vous..."
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Message personnalisé que l'agent dira pendant l'exécution de la fonction
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer - Keep it fixed at bottom */}
            <div className="p-6 border-t flex justify-end gap-4 bg-white">
              <button
                type="button"
                onClick={() => {
                  setShowFunctionModal(false);
                  setSelectedFunctionType(null);
                  setFunctionConfig(null);
                  setEditingFunction(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {!selectedFunctionType && !editingFunction ? 'Annuler' : 'Annuler'}
              </button>
              {(selectedFunctionType || editingFunction) && (
                <button
                  type="button"
                  onClick={handleModalSave}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  {editingFunction ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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