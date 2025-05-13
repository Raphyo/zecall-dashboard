'use client';

import { useState, useRef, useEffect } from 'react';
import { LanguageIcon, DocumentIcon, UserIcon, CommandLineIcon, SpeakerWaveIcon, MusicalNoteIcon, PlayIcon, PauseIcon, InformationCircleIcon, PlusIcon, PhoneIcon, ArrowPathRoundedSquareIcon, Squares2X2Icon, TrashIcon, PencilIcon, TagIcon, XMarkIcon, EnvelopeIcon, BellIcon, LockClosedIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { createAIAgent, createAgentFunction, updateAgentFunction, removeAgentFunction, getAgentFunctions, ORCHESTRATOR_URL, updateAIAgent, getAIAgents } from '@/app/lib/api';
import { Toast } from '../toast';
import { useSession } from 'next-auth/react';
import { builtInVariables, Variable } from '@/app/lib/constants';

const metroAudio = '/api/audio?file=backgrounds%2FAlmost-Empty-Metro-Station-in-Paris.mp3';
const office1Audio = '/api/audio?file=backgrounds%2FOffice-Ambience.mp3';
const office2Audio = '/api/audio?file=backgrounds%2FOffice-Ambience-2.mp3';

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
interface Parameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

interface CustomFunction extends BaseConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  contentType: string;
  apiTimeout?: number;
  parameters?: string;
  params: Parameter[];
  speakDuringExecution: boolean;
  executionMessage?: string;
}

interface TransferFunction extends BaseConfig {
  transferTo: string;
}

interface EndCallFunction extends BaseConfig {
  // No additional properties needed
}

// Add new interfaces for post-call actions
interface PostCallAction extends BaseConfig {
  type: 'sms' | 'email' | 'api' | 'notification';
  config: SMSConfig | EmailConfig | APIConfig | NotificationConfig;
}

interface SMSConfig {
  phoneNumber: string;
  message: string;
  variables?: string[];
}

interface EmailConfig {
  to: string;
  subject: string;
  body: string;
  variables?: string[];
}

interface APIConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  variables?: string[];
}

interface NotificationConfig {
  type: 'sms' | 'email' | 'both';
  phoneNumber?: string;
  email?: string;
  message: string;
  variables?: string[];
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
  labels?: { name: string; description: string }[];
  vad_stop_secs?: number;
  post_call_actions?: PostCallAction[];
  wake_phrase_detection?: {
    enabled: boolean;
    phrases: string[];
    keepalive_timeout: number;
  };
  with_tools?: boolean;  // Add the new field
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
    labels: Array.isArray(initialData?.labels) ? initialData.labels : [],
    postCallActions: initialData?.post_call_actions || [],
    vadStopSecs: initialData?.vad_stop_secs || 0.8,
    wakePhraseDetection: initialData?.wake_phrase_detection || {
      enabled: false,
      phrases: [],
      keepalive_timeout: 30
    }
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
  const [showPostCallActionModal, setShowPostCallActionModal] = useState(false);
  const [selectedPostCallActionType, setSelectedPostCallActionType] = useState<'sms' | 'email' | 'api' | 'notification' | null>(null);
  const [postCallActionConfig, setPostCallActionConfig] = useState<SMSConfig | EmailConfig | APIConfig | NotificationConfig | null>(null);
  const [editingPostCallAction, setEditingPostCallAction] = useState<{ index: number; action: PostCallAction } | null>(null);
  const [newLabel, setNewLabel] = useState({ name: '', description: '' });

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
      console.log('Debug - Initial vad_stop_secs value:', agent.vadStopSecs);
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
      formData.append('vad_stop_secs', agent.vadStopSecs.toString());
      formData.append('wake_phrase_detection', JSON.stringify(agent.wakePhraseDetection));
      
      // Add with_tools field based on whether there are any functions
      const hasTools = functions.length > 0;
      formData.append('with_tools', hasTools.toString());

      console.log('Debug - FormData after appending vad_stop_secs:');
      for (const [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }

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
        setToast({
          message: 'Agent mis à jour avec succès',
          type: 'success'
        });
      } else {
        savedAgent = await createAIAgent(formData, session.user.id);
        setToast({
          message: 'Agent créé avec succès',
          type: 'success'
        });
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
              // Construct parameters JSON without the type field
              const paramsSchema = {
                properties: Object.fromEntries(
                  (customConfig.params || []).map(param => [
                    param.name,
                    {
                      type: param.type,
                      description: param.description
                    }
                  ])
                ),
                required: (customConfig.params || [])
                  .filter(param => param.required)
                  .map(param => param.name)
              };
              
              functionData.parameters = JSON.stringify(paramsSchema);
              functionData.external_config = {
                url: customConfig.url,
                method: customConfig.method || 'POST',
                contentType: customConfig.contentType,
                apiTimeout: customConfig.apiTimeout || 120000,
                speakDuringExecution: customConfig.speakDuringExecution,
                executionMessage: customConfig.executionMessage || ''
              };
            } catch (e: any) {
              console.error('Error constructing parameters JSON:', e);
              setToast({
                message: `Erreur de format JSON pour la fonction ${func.config.name}: ${e.message}`,
                type: 'error'
              });
              setIsSubmitting(false);
              return;
            }
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
          `${ORCHESTRATOR_URL}/webhook/config-update?agent_id=${encodeURIComponent(savedAgent.id)}&user_id=${encodeURIComponent(session.user.id)}`,
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
      console.error('Error saving agent:', error);
      setToast({
        message: `Erreur: ${error.message || 'Une erreur est survenue lors de l\'enregistrement de l\'agent'}`,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditFunction = (index: number, func: AgentFunction) => {
    console.log('Editing function:', { index, func });
    
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
    
    console.log('Setting function edit state:', {
      editingState: newEditingState,
      functionConfig: newFunctionConfig,
      type: func.type
    });
    
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
          console.log('Fetched functions from API:', JSON.stringify(fetchedFunctions, null, 2));
          
          // Transform the fetched functions to match our local format
          const transformedFunctions = fetchedFunctions.map((func: any) => {
            console.log('\nProcessing function:', func.name);
            console.log('Raw function data:', {
              is_external: func.is_external,
              parameters: func.parameters,
              external_config: func.external_config
            });
            
            // Safely parse parameters
            let parsedParameters: any = {};
            let params: Parameter[] = [];
            try {
              // Handle both string and object parameters
              if (typeof func.parameters === 'string') {
                console.log('Raw parameters string:', func.parameters);
                parsedParameters = JSON.parse(func.parameters || '{}');
              } else if (typeof func.parameters === 'object') {
                console.log('Raw parameters object:', func.parameters);
                parsedParameters = func.parameters;
              }
              console.log('Parsed parameters object:', parsedParameters);
              
              // Convert parameters schema to params array for custom functions
              if (func.is_external && parsedParameters.properties) {
                console.log('Properties found:', parsedParameters.properties);
                console.log('Required fields:', parsedParameters.required);
                
                params = Object.entries(parsedParameters.properties).map(([name, prop]: [string, any]) => {
                  const param = {
                    name,
                    type: prop.type,
                    description: prop.description,
                    required: parsedParameters.required?.includes(name) || false
                  };
                  console.log('Created parameter:', param);
                  return param;
                });
                
                console.log('Final params array:', params);
              } else {
                console.log('No properties found or function is not external');
              }
            } catch (e) {
              console.error('Error processing parameters:', e);
              console.error('Failed parameters data:', func.parameters);
            }

            // Create the base config
            const baseConfig: BaseConfig = {
              name: func.name || '',
              description: func.description,
              active: func.is_active || false,
            };

            // Add type-specific properties
            let config: CustomFunction | TransferFunction | EndCallFunction;
            if (func.type === 'custom' || func.is_external) {
              config = {
                ...baseConfig,
                url: func.external_config?.url || '',
                method: func.external_config?.method || 'POST',
                contentType: func.external_config?.contentType || 'application/json',
                apiTimeout: func.external_config?.apiTimeout || 120000,
                parameters: func.parameters,
                params: params, // Add the parsed params array
                speakDuringExecution: func.external_config?.speakDuringExecution || false,
                executionMessage: func.external_config?.executionMessage || '',
              };
              console.log('Created custom function config:', {
                ...config,
                parameters: typeof config.parameters === 'string' ? JSON.parse(config.parameters) : config.parameters,
                params: config.params
              });
            } else if (func.type === 'transfer' || parsedParameters.transferTo) {
              config = {
                ...baseConfig,
                transferTo: parsedParameters.transferTo || '',
              };
            } else {
              config = baseConfig;
            }

            return {
              id: func.id,
              type: func.type || (func.is_external ? 'custom' : 'end_call'),
              config
            };
          });

          console.log('\nFinal transformed functions:', JSON.stringify(transformedFunctions, null, 2));
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
          name: editingVariable.variable.name,
          type: editingVariable.variable.type,
          source: 'CSV input',
          isBuiltIn: false
        };
        handleVariableModalSave(variableToSave);
      }
    }
  };

  const handleAddLabel = (labelData: { name: string; description: string }) => {
    if (labelData.name && labelData.description && !agent.labels.some(l => l.name === labelData.name)) {
      setAgent(prev => ({
        ...prev,
        labels: [...prev.labels, labelData]
      }));
      setNewLabel({ name: '', description: '' }); // Reset the form
    }
  };

  const handleRemoveLabel = (labelName: string) => {
    setAgent(prev => ({
      ...prev,
      labels: prev.labels.filter(l => l.name !== labelName)
    }));
  };

  const handleEditPostCallAction = (index: number, action: PostCallAction) => {
    setEditingPostCallAction({ index, action });
    setSelectedPostCallActionType(action.type);
    setPostCallActionConfig(action.config);
    setShowPostCallActionModal(true);
  };

  const handleDeletePostCallAction = (index: number) => {
    setAgent(prev => ({
      ...prev,
      postCallActions: prev.postCallActions.filter((_, i) => i !== index)
    }));
  };

  const handleTogglePostCallAction = (index: number) => {
    setAgent(prev => ({
      ...prev,
      postCallActions: prev.postCallActions.map((action, i) =>
        i === index ? { ...action, active: !action.active } : action
      )
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/dashboard/ai-agents')}
              className="mr-4 text-gray-400 hover:text-gray-600"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">
              {agentId ? 'Modifier l\'agent' : 'Créer un agent'}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard/ai-agents')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting 
                ? (agentId ? 'Mise à jour en cours...' : 'Création en cours...') 
                : (agentId ? 'Mettre à jour' : 'Créer l\'agent')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Main Settings */}
          <div className="col-span-8 space-y-6">
            {/* Basic Information */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center mb-6">
                <UserIcon className="h-6 w-6 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Informations de base</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nom de l'agent <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={agent.name}
                    onChange={(e) => setAgent({ ...agent, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                    placeholder="Ex: Agent Commercial"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Langue <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={agent.language}
                    onChange={(e) => setAgent({ ...agent, language: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="fr-FR">Français</option>
                    <option value="en-US">English</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Prompt Section */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <CommandLineIcon className="h-6 w-6 text-gray-400 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">Prompt</h2>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setAgent(prev => ({ ...prev, llmPrompt: '' }))}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <XMarkIcon className="h-4 w-4 mr-1.5" />
                    Réinitialiser
                  </button>
                  <button 
                    onClick={() => {
                      if (agent.llmPrompt) {
                        localStorage.setItem('lastSavedPrompt', agent.llmPrompt);
                        setToast({
                          message: 'Prompt sauvegardé avec succès',
                          type: 'success'
                        });
                      }
                    }}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <DocumentIcon className="h-4 w-4 mr-1.5" />
                    Sauvegarder
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute right-2 top-2 flex items-center space-x-2">
                    <button 
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      onClick={() => {
                        const textarea = document.querySelector('textarea');
                        if (textarea) {
                          textarea.style.height = '400px';
                        }
                      }}
                      title="Agrandir"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                      </svg>
                    </button>
                  </div>
                  <textarea
                    value={agent.llmPrompt}
                    onChange={(e) => setAgent({ ...agent, llmPrompt: e.target.value })}
                    className="block w-full h-64 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm font-mono resize-none"
                    placeholder="[Objectif]&#10;Vous êtes un agent vocal IA francophone qui engage une conversation vocale humaine avec l'utilisateur..."
                  />
                  
                  {/* Quick Access Variables */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-700">Variables disponibles</h3>
                      <button
                        onClick={() => setShowVariableModal(true)}
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Gérer les variables
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {agent.variables.map((variable, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                            if (textarea) {
                              const cursorPos = textarea.selectionStart;
                              const textBefore = textarea.value.substring(0, cursorPos);
                              const textAfter = textarea.value.substring(cursorPos);
                              const newValue = textBefore + '{' + variable.name + '}' + textAfter;
                              setAgent(prev => ({ ...prev, llmPrompt: newValue }));
                            }
                          }}
                          className={`inline-flex items-center px-2.5 py-1.5 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                            variable.isBuiltIn 
                              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-blue-500'
                              : 'bg-green-50 text-green-700 hover:bg-green-100 focus:ring-green-500'
                          }`}
                        >
                          <TagIcon className="h-3.5 w-3.5 mr-1" />
                          <span>{variable.name}</span>
                          <span className={`ml-1 text-xs ${variable.isBuiltIn ? 'text-blue-500' : 'text-green-500'}`}>
                            ({variable.type})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Voice and Audio Section */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center mb-6">
                <SpeakerWaveIcon className="h-6 w-6 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Voix et Audio</h2>
              </div>
              
              <div className="space-y-6">
                {/* Voice Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Voix <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {voiceSamples.map((voice) => (
                      <div
                        key={voice.id}
                        className={`relative flex items-center justify-between p-4 rounded-lg border transition-all ${
                          agent.voiceName === voice.id
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-opacity-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setAgent({ ...agent, voiceName: voice.id })}
                          className="flex items-center flex-grow text-left focus:outline-none"
                        >
                          <div className="flex flex-col">
                            <span className={`text-sm font-medium ${
                              agent.voiceName === voice.id ? 'text-blue-700' : 'text-gray-900'
                            }`}>{voice.name}</span>
                            <span className="text-xs text-gray-500">{voice.gender === 'male' ? 'Voix masculine' : 'Voix féminine'}</span>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePlayPreview(voice.id, voice.url)}
                          className={`ml-4 p-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                            currentlyPlaying === voice.id
                              ? 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                          }`}
                          title={currentlyPlaying === voice.id ? "Arrêter la lecture" : "Écouter l'exemple"}
                        >
                          {currentlyPlaying === voice.id ? (
                            <PauseIcon className="h-5 w-5" />
                          ) : (
                            <PlayIcon className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Background Audio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Son d'ambiance
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {ambientSounds.map((sound) => (
                      <div
                        key={sound.id}
                        className={`relative flex items-center justify-between p-4 rounded-lg border transition-all ${
                          agent.backgroundAudio === sound.id
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-opacity-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setAgent({ ...agent, backgroundAudio: sound.id })}
                          className="flex items-center flex-grow text-left focus:outline-none"
                        >
                          <div className="flex flex-col">
                            <span className={`text-sm font-medium ${
                              agent.backgroundAudio === sound.id ? 'text-blue-700' : 'text-gray-900'
                            }`}>{sound.name}</span>
                            {sound.id !== 'none' && (
                              <span className="text-xs text-gray-500">Son d'ambiance</span>
                            )}
                          </div>
                        </button>
                        {sound.url && (
                          <button
                            type="button"
                            onClick={() => handlePlayPreview(sound.id, sound.url)}
                            className={`ml-4 p-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                              currentlyPlaying === sound.id
                                ? 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                            }`}
                            title={currentlyPlaying === sound.id ? "Arrêter la lecture" : "Écouter l'exemple"}
                          >
                            {currentlyPlaying === sound.id ? (
                              <PauseIcon className="h-5 w-5" />
                            ) : (
                              <PlayIcon className="h-5 w-5" />
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Additional Settings */}
          <div className="col-span-4 space-y-6">
            {/* Settings Panel */}
            <div className="bg-white shadow-sm rounded-lg divide-y divide-gray-200">
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900">Paramètres</h3>
              </div>

              {/* Functions */}
              <div className="p-4">
                <button
                  type="button"
                  onClick={openFunctionModal}
                  className="flex items-center justify-between w-full text-left group hover:bg-gray-50 rounded-md p-2 -m-2 transition-colors"
                >
                  <div className="flex items-center">
                    <CommandLineIcon className="h-5 w-5 text-gray-400 group-hover:text-gray-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900 group-hover:text-gray-900">Fonctions</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 group-hover:text-gray-700">{functions.length}</span>
                    <PlusIcon className="h-5 w-5 text-gray-400 group-hover:text-gray-500 ml-2" />
                  </div>
                </button>
              </div>

              {/* Knowledge Base */}
              <div className="p-4">
                <button
                  type="button"
                  onClick={() => document.getElementById('knowledgeBase')?.click()}
                  className="flex items-center justify-between w-full text-left group hover:bg-gray-50 rounded-md p-2 -m-2 transition-colors"
                >
                  <div className="flex items-center">
                    <DocumentIcon className="h-5 w-5 text-gray-400 group-hover:text-gray-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900 group-hover:text-gray-900">Base de connaissances</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 group-hover:text-gray-700 truncate max-w-[150px]">
                      {selectedFileName || 'Aucun fichier'}
                    </span>
                    <PlusIcon className="h-5 w-5 text-gray-400 group-hover:text-gray-500 ml-2" />
                  </div>
                </button>
                <input
                  type="file"
                  id="knowledgeBase"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && validateFile(file)) {
                      setAgent({ ...agent, knowledgeBase: file });
                      setSelectedFileName(file.name);
                    }
                  }}
                  accept=".pdf,.txt,.docx"
                />
              </div>

              {/* Variables */}
              <div className="p-4">
                <button
                  type="button"
                  onClick={() => setShowVariableModal(true)}
                  className="flex items-center justify-between w-full text-left group hover:bg-gray-50 rounded-md p-2 -m-2 transition-colors"
                >
                  <div className="flex items-center">
                    <TagIcon className="h-5 w-5 text-gray-400 group-hover:text-gray-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900 group-hover:text-gray-900">Variables</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 group-hover:text-gray-700">{agent.variables.length}</span>
                    <PlusIcon className="h-5 w-5 text-gray-400 group-hover:text-gray-500 ml-2" />
                  </div>
                </button>
              </div>

              {/* Conversation Settings */}
              <div className="p-4 space-y-4">
                <h4 className="text-sm font-medium text-gray-900">Paramètres de conversation</h4>
                
                <div className="space-y-3">
                  <label className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={agent.allowInterruptions}
                      onChange={(e) => setAgent(prev => ({ ...prev, allowInterruptions: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                    />
                    <span className="ml-2 text-sm text-gray-700">Permettre les interruptions</span>
                  </label>

                  <label className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={agent.aiStartsConversation}
                      onChange={(e) => setAgent(prev => ({ ...prev, aiStartsConversation: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                    />
                    <span className="ml-2 text-sm text-gray-700">L'IA commence la conversation</span>
                  </label>

                  <label className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={agent.silenceDetection}
                      onChange={(e) => setAgent(prev => ({ ...prev, silenceDetection: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                    />
                    <span className="ml-2 text-sm text-gray-700">Détection du silence</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showFunctionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingFunction ? 'Modifier la fonction' : 'Ajouter une fonction'}
                </h3>
                <button
                  onClick={() => {
                    setShowFunctionModal(false);
                    setSelectedFunctionType(null);
                    setFunctionConfig(null);
                    setEditingFunction(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Function Type Selection */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type de fonction</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedFunctionType('end_call')}
                      className={`p-4 text-sm font-medium rounded-lg border transition-all ${
                        selectedFunctionType === 'end_call'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <PhoneIcon className="h-5 w-5 mx-auto mb-2" />
                      Fin d'appel
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFunctionType('transfer')}
                      className={`p-4 text-sm font-medium rounded-lg border transition-all ${
                        selectedFunctionType === 'transfer'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <ArrowPathRoundedSquareIcon className="h-5 w-5 mx-auto mb-2" />
                      Transfert
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFunctionType('custom')}
                      className={`p-4 text-sm font-medium rounded-lg border transition-all ${
                        selectedFunctionType === 'custom'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <CommandLineIcon className="h-5 w-5 mx-auto mb-2" />
                      Personnalisée
                    </button>
                  </div>
                </div>

                {/* Function Configuration */}
                {selectedFunctionType && (
                  <div className="space-y-6">
                    {/* Common Fields */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={functionConfig?.name || ''}
                        onChange={(e) => setFunctionConfig(prev => ({ ...prev!, name: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="Nom de la fonction"
                        onKeyDown={handleFunctionInputKeyDown}
                      />
                    </div>

                    {/* Type-specific Fields */}
                    {selectedFunctionType === 'transfer' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Numéro de transfert <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={(functionConfig as TransferFunction)?.transferTo || ''}
                          onChange={(e) => setFunctionConfig(prev => ({ ...prev!, transferTo: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          placeholder="+33123456789"
                          onKeyDown={handleFunctionInputKeyDown}
                        />
                        {showTransferError && (
                          <p className="mt-1 text-sm text-red-600">Le numéro de transfert est requis</p>
                        )}
                      </div>
                    )}

                    {selectedFunctionType === 'custom' && (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            URL <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="url"
                            value={(functionConfig as CustomFunction)?.url || ''}
                            onChange={(e) => setFunctionConfig(prev => ({ ...prev!, url: e.target.value }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            placeholder="https://api.example.com/endpoint"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Méthode <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={(functionConfig as CustomFunction)?.method || 'POST'}
                              onChange={(e) => setFunctionConfig(prev => ({ ...prev!, method: e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE' }))}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            >
                              <option value="GET">GET</option>
                              <option value="POST">POST</option>
                              <option value="PUT">PUT</option>
                              <option value="DELETE">DELETE</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Content Type <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={(functionConfig as CustomFunction)?.contentType || 'application/json'}
                              onChange={(e) => setFunctionConfig(prev => ({ ...prev!, contentType: e.target.value }))}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            >
                              <option value="application/json">application/json</option>
                              <option value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</option>
                              <option value="multipart/form-data">multipart/form-data</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Timeout (ms)
                          </label>
                          <input
                            type="number"
                            value={(functionConfig as CustomFunction)?.apiTimeout || 120000}
                            onChange={(e) => setFunctionConfig(prev => ({ ...prev!, apiTimeout: parseInt(e.target.value) }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            min="1000"
                            step="1000"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Paramètres</label>
                          <div className="space-y-2">
                            {((functionConfig as CustomFunction)?.params || []).map((param, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={param.name}
                                  onChange={(e) => {
                                    const newParams = [...((functionConfig as CustomFunction).params || [])];
                                    newParams[index] = { ...newParams[index], name: e.target.value };
                                    setFunctionConfig(prev => ({ ...prev!, params: newParams }));
                                  }}
                                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                  placeholder="Nom du paramètre"
                                />
                                <select
                                  value={param.type}
                                  onChange={(e) => {
                                    const newParams = [...((functionConfig as CustomFunction).params || [])];
                                    newParams[index] = { ...newParams[index], type: e.target.value };
                                    setFunctionConfig(prev => ({ ...prev!, params: newParams }));
                                  }}
                                  className="w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                >
                                  <option value="string">Texte</option>
                                  <option value="number">Nombre</option>
                                  <option value="boolean">Booléen</option>
                                </select>
                                <input
                                  type="text"
                                  value={param.description}
                                  onChange={(e) => {
                                    const newParams = [...((functionConfig as CustomFunction).params || [])];
                                    newParams[index] = { ...newParams[index], description: e.target.value };
                                    setFunctionConfig(prev => ({ ...prev!, params: newParams }));
                                  }}
                                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                  placeholder="Description"
                                />
                                <label className="inline-flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={param.required}
                                    onChange={(e) => {
                                      const newParams = [...((functionConfig as CustomFunction).params || [])];
                                      newParams[index] = { ...newParams[index], required: e.target.checked };
                                      setFunctionConfig(prev => ({ ...prev!, params: newParams }));
                                    }}
                                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                  />
                                  <span className="ml-2 text-sm text-gray-600">Requis</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newParams = [...((functionConfig as CustomFunction).params || [])];
                                    newParams.splice(index, 1);
                                    setFunctionConfig(prev => ({ ...prev!, params: newParams }));
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600"
                                >
                                  <XMarkIcon className="h-5 w-5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const newParam: Parameter = {
                                  name: '',
                                  type: 'string',
                                  description: '',
                                  required: false
                                };
                                const newParams = [...((functionConfig as CustomFunction)?.params || []), newParam];
                                setFunctionConfig(prev => ({ ...prev!, params: newParams }));
                              }}
                              className="mt-2 inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                            >
                              <PlusIcon className="h-4 w-4 mr-1.5" />
                              Ajouter un paramètre
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={(functionConfig as CustomFunction)?.speakDuringExecution || false}
                              onChange={(e) => setFunctionConfig(prev => ({ ...prev!, speakDuringExecution: e.target.checked }))}
                              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Parler pendant l'exécution</span>
                          </label>
                        </div>

                        {(functionConfig as CustomFunction)?.speakDuringExecution && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Message pendant l'exécution
                            </label>
                            <input
                              type="text"
                              value={(functionConfig as CustomFunction)?.executionMessage || ''}
                              onChange={(e) => setFunctionConfig(prev => ({ ...prev!, executionMessage: e.target.value }))}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                              placeholder="Un moment s'il vous plaît..."
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Description Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description {selectedFunctionType === 'end_call' && <span className="text-red-500">*</span>}
                      </label>
                      <textarea
                        value={functionConfig?.description || ''}
                        onChange={(e) => setFunctionConfig(prev => ({ ...prev!, description: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        rows={3}
                        placeholder="Description de la fonction"
                      />
                      {showEndCallDescriptionError && (
                        <p className="mt-1 text-sm text-red-600">La description est requise pour une fonction de fin d'appel</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showVariableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingVariable ? 'Modifier la variable' : 'Ajouter une variable'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingVariable?.variable.name || ''}
                    onChange={(e) => setEditingVariable(prev => prev ? {
                      ...prev,
                      variable: { ...prev.variable, name: e.target.value }
                    } : null)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Nom de la variable"
                    onKeyDown={handleVariableModalKeyDown}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingVariable?.variable.type || 'String'}
                    onChange={(e) => setEditingVariable(prev => prev ? {
                      ...prev,
                      variable: { ...prev.variable, type: e.target.value as "String" | "Number" | "Boolean" | "Datetime" }
                    } : null)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="String">Texte</option>
                    <option value="Number">Nombre</option>
                    <option value="Boolean">Booléen</option>
                    <option value="Datetime">Date</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowVariableModal(false);
                  setEditingVariable(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editingVariable?.variable.name) {
                    const variableToSave: Variable = {
                      name: editingVariable.variable.name,
                      type: editingVariable.variable.type,
                      source: 'CSV input',
                      isBuiltIn: false
                    };
                    handleVariableModalSave(variableToSave);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
              >
                {editingVariable ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPostCallActionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          {/* ... existing post-call action modal content ... */}
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