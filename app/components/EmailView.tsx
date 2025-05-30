'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  ArrowUturnLeftIcon, 
  ArrowUturnRightIcon, 
  ForwardIcon,
  UserIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline';

type EmailPart = {
  mimeType: string;
  content: string;
};

type Attachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
};

type EmailMessage = {
  id: string;
  threadId?: string;
  subject: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  date: string;
  messageId?: string;
  inReplyTo?: string;
  parts: EmailPart[];
  attachments: Attachment[];
  thread: ThreadMessage[];
  snippet?: string;
};

type ThreadMessage = {
  id: string;
  threadId?: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  parts: EmailPart[];
  isRead: boolean;
};

// Type for the email actions
type EmailAction = 'reply' | 'replyAll' | 'forward' | 'compose';

export default function EmailView({ messageId }: { messageId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState<EmailMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showThread, setShowThread] = useState(true);
  const [action, setAction] = useState<EmailAction | null>(null);
  const [recipientTo, setRecipientTo] = useState('');
  const [recipientCc, setRecipientCc] = useState('');
  const [recipientBcc, setRecipientBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [aiContent, setAiContent] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showBcc, setShowBcc] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [isImproving, setIsImproving] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [aiAgents, setAiAgents] = useState<Array<{id: string, name: string, systemPrompt: string}>>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Load AI agents from localStorage
  useEffect(() => {
    const storedAgents = localStorage.getItem('emailAIAgents');
    if (storedAgents) {
      const agents = JSON.parse(storedAgents);
      setAiAgents(agents);
      // Set default agent if available
      if (agents.length > 0 && !selectedAgentId) {
        setSelectedAgentId(agents[0].id);
      }
    }
  }, []);

  // Fetch email on component mount
  useEffect(() => {
    const fetchEmail = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/gmail/${messageId}`);
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch email');
        }
        
        const data = await response.json();
        setEmail(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching email:', err);
      } finally {
        setLoading(false);
      }
    };

    if (messageId === 'new') {
      // If this is a new email composition, set action to 'compose'
      setAction('compose');
      setLoading(false);
    } else if (messageId) {
      fetchEmail();
    }
  }, [messageId]);

  // Initialize form fields when starting an action
  const handleAction = (selectedAction: EmailAction) => {
    if (!email) return;
    
    let newTo = '';
    let newSubject = '';
    let newContent = '';

    switch (selectedAction) {
      case 'reply':
        // Extract sender email address from the "From" field
        const fromMatch = email.from.match(/<([^>]+)>/) || [null, email.from];
        newTo = fromMatch[1] || email.from;
        newSubject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`;
        break;
        
      case 'replyAll':
        // Extract sender and add all recipients (except self)
        const fromMatchAll = email.from.match(/<([^>]+)>/) || [null, email.from];
        newTo = fromMatchAll[1] || email.from;
        
        // Add other recipients from To field
        const userEmail = email.to.match(/<([^>]+)>/) || [null, email.to];
        const allRecipients = email.to.split(',')
          .map(recipient => recipient.trim())
          .filter(recipient => {
            const match = recipient.match(/<([^>]+)>/) || [null, recipient];
            return match[1] !== userEmail[1];
          });
        
        if (allRecipients.length > 0) {
          newTo += `, ${allRecipients.join(', ')}`;
        }
        
        setRecipientCc(email.cc || '');
        setShowCc(!!email.cc);
        
        newSubject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`;
        break;
        
      case 'forward':
        newSubject = email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`;
        newContent = `-------- Forwarded Message --------\nFrom: ${email.from}\nDate: ${new Date(email.date).toLocaleString()}\nTo: ${email.to}\n${email.cc ? `Cc: ${email.cc}\n` : ''}\n`;
        break;
        
      case 'compose':
        // Just start with blank fields
        break;
    }

    // Only add quoted content for forwards
    if (selectedAction === 'forward') {
      const plainTextPart = email.parts.find(part => part.mimeType === 'text/plain');
      if (plainTextPart) {
        newContent += plainTextPart.content;
      } else {
        const htmlPart = email.parts.find(part => part.mimeType === 'text/html');
        if (htmlPart) {
          // Create a temporary element to strip HTML tags
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlPart.content;
          newContent += tempDiv.textContent || tempDiv.innerText || '';
        }
      }
    }

    setAction(selectedAction);
    setRecipientTo(newTo);
    setSubject(newSubject);
    setContent(newContent);
    
    // Focus the editor after state updates
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        editorRef.current.setSelectionRange(0, 0);
      }
    }, 100);
  };

  // Handle file attachment
  const handleFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
      
      // Reset the input to allow attaching the same file multiple times
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove an attachment
  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  // Handle sending email with attachments
  const handleSend = async () => {
    try {
      // Clean up the content - remove any extra line breaks
      const cleanedContent = content.trim();
      
      // The content already includes AI content (it's directly inserted into the textarea)
      // so we don't need to append aiContent again, which was causing duplication
      const finalContent = cleanedContent;
      
      // Check if content contains HTML tags
      const containsHtml = /<[a-z][\s\S]*>/i.test(finalContent);
      
      // Create FormData for handling attachments
      const formData = new FormData();
      
      // Handle different scenarios (new email vs reply/forward)
      if (messageId === 'new') {
        formData.append('action', 'compose');
      } else if (email && action) {
        formData.append('action', action);
        formData.append('messageId', email.id);
        if (email.threadId) formData.append('threadId', email.threadId);
      } else {
        throw new Error('Information insuffisante pour envoyer l\'email');
      }
      
      formData.append('to', recipientTo);
      if (recipientCc) formData.append('cc', recipientCc);
      if (recipientBcc) formData.append('bcc', recipientBcc);
      formData.append('subject', subject);
      formData.append('content', finalContent);
      formData.append('isHtml', containsHtml ? 'true' : 'false');
      
      // Add file attachments
      attachments.forEach((file, index) => {
        formData.append(`attachment-${index}`, file);
      });
      
      // If using FormData, we need to use fetch directly
      const response = await fetch('/api/gmail/actions', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Échec de l\'envoi de l\'email');
      }
      
      // Reset the action form and attachments
      setAction(null);
      setAiContent('');
      setAttachments([]);
      
      // Redirect back to inbox after successful send
      router.push('/dashboard/emails');
    } catch (err) {
      console.error('Erreur lors de l\'envoi de l\'email:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de l\'envoi de l\'email');
    }
  };

  // Handle cancel action
  const handleCancel = () => {
    if (messageId === 'new') {
      // If canceling a new email, go back to inbox
      router.push('/dashboard/emails');
      return;
    }
    
    setAction(null);
    setAiContent('');
    setIsGeneratingAI(false);
    setAiError(null);
  };

  // Generate AI response
  const handleGenerateAI = async () => {
    try {
      setIsGeneratingAI(true);
      setAiError(null);
      
      // Keep track of original content
      const originalContent = content;
      
      // Get the selected agent prompt or use a default
      const selectedAgent = aiAgents.find(agent => agent.id === selectedAgentId);
      const systemPrompt = selectedAgent?.systemPrompt || 
        "Vous êtes un assistant professionnel qui aide à rédiger des emails. Votre style est clair, concis et professionnel.";
      
      // Build the prompt
      let prompt = `${systemPrompt}\n\n`;
      
      if (messageId === 'new') {
        // For new emails, we need a different prompt
        prompt += `Veuillez générer un email professionnel`;
        if (subject) prompt += ` sur le sujet: ${subject}`;
        if (recipientTo) prompt += ` destiné à: ${recipientTo}`;
        prompt += '.\n\n';
        
        // If user has already started writing content, include it
        if (originalContent) {
          prompt += `Voici le début du message: ${originalContent}\n\n`;
          prompt += `Veuillez compléter ou améliorer ce message.`;
        } else {
          prompt += `Veuillez rédiger un message clair et concis.`;
        }
      } else if (email) {
        // For replies/forwards, include original email context
        prompt += `Veuillez générer une réponse professionnelle à l'email suivant:\n\n`;
        prompt += `Sujet: ${email.subject}\n`;
        prompt += `De: ${email.from}\n\n`;
        
        // Add the email content to the prompt
        const plainTextPart = email.parts.find(part => part.mimeType === 'text/plain');
        if (plainTextPart) {
          prompt += plainTextPart.content;
        } else {
          const htmlPart = email.parts.find(part => part.mimeType === 'text/html');
          if (htmlPart) {
            // Create a temporary element to strip HTML tags
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlPart.content;
            prompt += tempDiv.textContent || tempDiv.innerText || '';
          }
        }
      } else {
        throw new Error('Impossible de générer une réponse IA sans contexte');
      }
      
      // Create EventSource for streaming response
      const eventSource = new EventSource(`/api/openai?prompt=${encodeURIComponent(prompt)}`);
      
      // Prepare for tracking complete response
      const initialResponse = { role: 'assistant' as const, content: '' };
      // Start with empty AI content
      setAiContent('');
      
      // Set a temporary placeholder
      setContent('Génération de la réponse IA...');
      
      eventSource.onmessage = (event) => {
        try {
          if (event.data === '[DONE]') {
            // Add the complete initial response to chat history (hidden from user)
            setAiChatHistory([{ role: 'assistant', content: initialResponse.content }]);
            eventSource.close();
            setIsGeneratingAI(false);
            return;
          }
          
          const data = JSON.parse(event.data);
          if (data.content) {
            // Update both the displayed content and our tracking variable
            setAiContent(prevContent => {
              const updatedContent = prevContent + data.content;
              initialResponse.content = updatedContent;
              
              // Update the textarea content directly
              setContent(originalContent ? `${originalContent}\n\n${updatedContent}` : updatedContent);
              
              return updatedContent;
            });
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err);
        }
      };
      
      eventSource.onerror = (err) => {
        console.error('EventSource error:', err);
        eventSource.close();
        setIsGeneratingAI(false);
        setAiError('Échec de la génération de la réponse IA');
        // Restore original content if there was an error
        setContent(originalContent);
      };
    } catch (err) {
      console.error('Error generating AI response:', err);
      setIsGeneratingAI(false);
      setAiError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la génération de la réponse IA');
    }
  };

  // Improve AI-generated response based on user feedback
  const handleImproveAI = async () => {
    if (!aiChatInput.trim()) return;
    
    try {
      setIsImproving(true);
      
      // Save current content for reference
      const currentContent = content;
      
      // Add user message to chat history (hidden from user)
      const userMessage = { role: 'user' as const, content: aiChatInput };
      setAiChatHistory(prev => [...prev, userMessage]);
      setAiChatInput('');
      
      // Get the selected agent prompt or use a default
      const selectedAgent = aiAgents.find(agent => agent.id === selectedAgentId);
      const systemPrompt = selectedAgent?.systemPrompt || 
        "Vous êtes un assistant professionnel qui aide à rédiger des emails. Votre style est clair, concis et professionnel.";
      
      // Build the prompt with previous AI content and user feedback
      let prompt = `${systemPrompt}\n\n`;
      
      if (messageId === 'new') {
        // For new emails
        prompt += `Contexte: Rédaction d'un nouveau message\n`;
        if (subject) prompt += `Sujet: ${subject}\n`;
        if (recipientTo) prompt += `Destinataire: ${recipientTo}\n\n`;
      } else if (email) {
        // For replies/forwards
        prompt += `Contexte original de l'email:\nSujet: ${email.subject}\nDe: ${email.from}\n\n`;
        
        // Add email content to context
        const plainTextPart = email.parts.find(part => part.mimeType === 'text/plain');
        if (plainTextPart) {
          prompt += plainTextPart.content;
        } else {
          const htmlPart = email.parts.find(part => part.mimeType === 'text/html');
          if (htmlPart) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlPart.content;
            prompt += tempDiv.textContent || tempDiv.innerText || '';
          }
        }
      }
      
      // Add current message content and user feedback
      prompt += `\n\nBrouillon actuel du message:\n${currentContent}\n\nRetour de l'utilisateur: ${userMessage.content}\n\nVeuillez améliorer le message en fonction de ce retour.`;
      
      // Create EventSource for streaming response
      const eventSource = new EventSource(`/api/openai?prompt=${encodeURIComponent(prompt)}`);
      
      // Show improvement in progress
      setContent(currentContent + '\n\nAmélioration en cours...');
      
      // Track the new content
      const newAiContent = { role: 'assistant' as const, content: '' };
      setAiContent('');
      
      eventSource.onmessage = (event) => {
        try {
          if (event.data === '[DONE]') {
            // Add the complete AI response to chat history (hidden from user)
            setAiChatHistory(prev => [...prev, { role: 'assistant', content: newAiContent.content }]);
            eventSource.close();
            setIsImproving(false);
            return;
          }
          
          const data = JSON.parse(event.data);
          if (data.content) {
            // Update both the stored AI content and directly update the textarea
            setAiContent(prevContent => {
              const updatedContent = prevContent + data.content;
              newAiContent.content = updatedContent;
              
              // Replace entire content with improved version
              setContent(updatedContent);
              
              return updatedContent;
            });
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err);
        }
      };
      
      eventSource.onerror = (err) => {
        console.error('EventSource error:', err);
        eventSource.close();
        setIsImproving(false);
        setAiError('Échec de l\'amélioration de la réponse IA');
        // Restore original content
        setContent(currentContent);
      };
      
      // Focus the input for next feedback
      setTimeout(() => {
        if (chatInputRef.current) {
          chatInputRef.current.focus();
        }
      }, 100);
    } catch (err) {
      console.error('Error improving AI response:', err);
      setIsImproving(false);
      setAiError(err instanceof Error ? err.message : 'Une erreur est survenue lors de l\'amélioration de la réponse IA');
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Extract email parts for display
  const getEmailContent = () => {
    if (!email) return <p>Aucun contenu disponible</p>;
    
    // Prefer HTML content if available
    const htmlPart = email.parts.find(part => part.mimeType === 'text/html');
    if (htmlPart) {
      return (
        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlPart.content }} 
        />
      );
    }
    
    // Fall back to plain text
    const plainTextPart = email.parts.find(part => part.mimeType === 'text/plain');
    if (plainTextPart) {
      return (
        <pre className="whitespace-pre-wrap text-sm font-sans">
          {plainTextPart.content}
        </pre>
      );
    }
    
    return <p>Aucun contenu disponible</p>;
  };

  if (loading) {
    return (
      <div className="animate-pulse p-8 bg-white rounded-xl shadow-sm">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-white rounded-xl shadow-sm">
        <p className="text-red-500 mb-4">Error: {error}</p>
        <Link href="/dashboard/emails">
          <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
            Back to Inbox
          </span>
        </Link>
      </div>
    );
  }

  // If we're in an action mode (reply, forward, etc.) or creating a new email, show the compose form
  if (action || messageId === 'new') {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-3 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">
            {action === 'reply' ? 'Répondre' : 
             action === 'replyAll' ? 'Répondre à tous' : 
             action === 'forward' ? 'Transférer' : 
             'Nouveau message'}
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Form fields for email composition */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">To</label>
              <input
                type="text"
                value={recipientTo}
                onChange={(e) => setRecipientTo(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="exemple@email.com"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex space-x-4">
                <button 
                  onClick={() => setShowCc(!showCc)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {showCc ? 'Masquer Cc' : 'Afficher Cc'}
                </button>
                <button 
                  onClick={() => setShowBcc(!showBcc)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {showBcc ? 'Masquer Cci' : 'Afficher Cci'}
                </button>
              </div>
            </div>
            
            {showCc && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Cc</label>
                <input
                  type="text"
                  value={recipientCc}
                  onChange={(e) => setRecipientCc(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="exemple@email.com"
                />
              </div>
            )}
            
            {showBcc && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Cci</label>
                <input
                  type="text"
                  value={recipientBcc}
                  onChange={(e) => setRecipientBcc(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="exemple@email.com"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Sujet</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Objet de l'email"
              />
            </div>
            
            {/* Show historical thread messages above the composition area - only if we have an email */}
            {email && (action === 'reply' || action === 'replyAll') && email.thread && email.thread.length > 0 && (
              <div className="border-t border-b border-gray-200 py-3 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Message original</h3>
                  <button
                    onClick={() => setShowThread(!showThread)}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
                  >
                    {showThread ? (
                      <>Masquer <ChevronUpIcon className="h-4 w-4 ml-1" /></>
                    ) : (
                      <>Afficher <ChevronDownIcon className="h-4 w-4 ml-1" /></>
                    )}
                  </button>
                </div>
                
                {showThread && email && (
                  <div className="space-y-4 bg-gray-50 p-3 rounded-md max-h-96 overflow-y-auto">
                    {/* Current message */}
                    <div className="border-b border-gray-200 pb-3">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                            <UserIcon className="h-4 w-4 text-indigo-500" />
                          </div>
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">{email.from}</p>
                            <p className="text-xs text-gray-500">{formatDate(email.date)}</p>
                          </div>
                          <div className="mt-1">
                            {email.parts.find(part => part.mimeType === 'text/html') ? (
                              <div 
                                className="prose max-w-none text-sm text-gray-700 max-h-36 overflow-y-auto"
                                dangerouslySetInnerHTML={{ 
                                  __html: email.parts.find(part => part.mimeType === 'text/html')?.content || '' 
                                }} 
                              />
                            ) : (
                              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans max-h-36 overflow-y-auto">
                                {email.parts.find(part => part.mimeType === 'text/plain')?.content || email.snippet || ''}
                              </pre>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Previous messages in thread */}
                    {email.thread
                      .filter(msg => msg.id !== email.id)
                      .map(msg => (
                        <div key={msg.id} className="border-b border-gray-200 pb-3 last:border-b-0 last:pb-0">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                <UserIcon className="h-4 w-4 text-gray-500" />
                              </div>
                            </div>
                            <div className="ml-3 flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900">{msg.from}</p>
                                <p className="text-xs text-gray-500">{formatDate(msg.date)}</p>
                              </div>
                              <div className="mt-1">
                                {msg.parts.find(part => part.mimeType === 'text/html') ? (
                                  <div 
                                    className="prose max-w-none text-sm text-gray-700 max-h-36 overflow-y-auto"
                                    dangerouslySetInnerHTML={{ 
                                      __html: msg.parts.find(part => part.mimeType === 'text/html')?.content || '' 
                                    }} 
                                  />
                                ) : (
                                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans max-h-36 overflow-y-auto">
                                    {msg.parts.find(part => part.mimeType === 'text/plain')?.content || msg.snippet}
                                  </pre>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="sr-only">Message</label>
                <div className="flex items-center space-x-2">
                  {aiAgents.length > 0 && (
                    <select
                      value={selectedAgentId || ''}
                      onChange={(e) => setSelectedAgentId(e.target.value || null)}
                      className="text-xs rounded-md border-gray-300 py-1 px-2 focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Assistant par défaut</option>
                      {aiAgents.map(agent => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={handleGenerateAI}
                    disabled={isGeneratingAI}
                    className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${isGeneratingAI ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <SparklesIcon className="h-3 w-3 mr-1" />
                    {isGeneratingAI ? 'Génération...' : "M'aider à écrire"}
                  </button>
                </div>
              </div>
              <textarea
                ref={editorRef}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  // If user manually edits, keep AI content in sync to allow further improvements
                  if (aiContent) {
                    setAiContent(e.target.value);
                  }
                }}
                rows={10}
                className="mt-0 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            
            {/* File attachment section */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <label className="cursor-pointer">
                  <div className="flex items-center space-x-1 text-gray-600 hover:text-gray-800">
                    <PaperClipIcon className="h-5 w-5" />
                    <span className="text-sm">Joindre un fichier</span>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    onChange={handleFileAttachment}
                    multiple
                  />
                </label>
              </div>
              
              {/* Show attached files */}
              {attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-gray-500">{attachments.length} fichier(s) joint(s)</p>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((file, index) => (
                      <div 
                        key={index} 
                        className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-md px-2 py-1"
                      >
                        <PaperClipIcon className="h-4 w-4 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                        <button 
                          onClick={() => handleRemoveAttachment(index)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* AI Improvement Chat Interface - hidden from main view but still functional */}
            {aiContent && (
              <div className="border border-indigo-100 rounded-md p-2 bg-indigo-50">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">
                    Besoin d'améliorations ? Demandez à l'IA d'affiner la réponse.
                  </p>
                  <button
                    onClick={() => setAiContent('')}
                    className="text-xs text-gray-400 hover:text-red-500"
                    title="Effacer le retour IA"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Chat input */}
                <div className="flex mt-1">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={aiChatInput}
                    onChange={(e) => setAiChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleImproveAI()}
                    placeholder="Donnez des instructions (ex: 'Rendre plus formel')"
                    className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs"
                    disabled={isImproving}
                  />
                  <button
                    onClick={handleImproveAI}
                    disabled={isImproving || !aiChatInput.trim()}
                    className={`inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-r-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${(isImproving || !aiChatInput.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isImproving ? (
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <span>Améliorer</span>
                    )}
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex justify-between pt-4">
              <div className="flex space-x-3">
                <button
                  onClick={handleSend}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <PaperAirplaneIcon className="h-4 w-4 mr-1" />
                  Envoyer
                </button>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If no email data was found at this point, show an error
  if (!email) {
    return (
      <div className="p-8 text-center bg-white rounded-xl shadow-sm">
        <p className="text-gray-500 mb-4">Email non trouvé</p>
        <Link href="/dashboard/emails">
          <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
            Retour à la boîte de réception
          </span>
        </Link>
      </div>
    );
  }

  // Regular email view
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Link href="/dashboard/emails">
            <span className="inline-flex items-center text-gray-500 hover:text-gray-700">
              <ArrowLeftIcon className="h-5 w-5" />
            </span>
          </Link>
          <h1 className="text-lg font-medium text-gray-900 truncate max-w-md">{email.subject}</h1>
        </div>
      </div>
      
      {/* Thread section - show previous messages first, collapsed by default */}
      {email.thread && email.thread.length > 1 && (
        <div className="px-4 py-2 border-b border-gray-100">
          <button
            onClick={() => setShowThread(!showThread)}
            className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            {showThread ? (
              <>
                <ChevronUpIcon className="h-5 w-5 mr-1 text-gray-400" />
                <span>Masquer les messages précédents</span>
              </>
            ) : (
              <>
                <ChevronDownIcon className="h-5 w-5 mr-1 text-gray-400" />
                <span>
                  {email.thread.length - 1} message{email.thread.length > 2 ? 's' : ''} précédent{email.thread.length > 2 ? 's' : ''}
                </span>
              </>
            )}
          </button>
          
          {showThread && (
            <div className="space-y-0 mt-2">
              {email.thread
                .filter(msg => msg.id !== email.id) // Filter out the current message
                .map((msg, index, array) => (
                  <div 
                    key={msg.id} 
                    className={`border-l-4 border-l-gray-200 pl-3 py-2 ${
                      index === array.length - 1 ? 'mb-4' : ''
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-2">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-gray-500" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{msg.from}</p>
                          <p className="text-xs text-gray-500 ml-2 whitespace-nowrap">{formatDate(msg.date)}</p>
                        </div>
                        <div className="text-sm text-gray-700 prose-sm max-w-none">
                          {msg.parts.find(part => part.mimeType === 'text/html') ? (
                            <div 
                              className="prose-sm max-w-none max-h-36 overflow-hidden"
                              dangerouslySetInnerHTML={{ 
                                __html: msg.parts.find(part => part.mimeType === 'text/html')?.content || '' 
                              }} 
                            />
                          ) : (
                            <pre className="whitespace-pre-wrap text-sm font-sans max-h-36 overflow-hidden">
                              {msg.parts.find(part => part.mimeType === 'text/plain')?.content || msg.snippet}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
      
      {/* Current message - displayed more prominently */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-3">
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
              <UserIcon className="h-6 w-6 text-gray-500" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{email.from}</p>
                <p className="text-xs text-gray-500">
                  To: {email.to}
                  {email.cc && <span className="ml-1">• Cc: {email.cc}</span>}
                </p>
              </div>
              <p className="text-xs text-gray-500">{formatDate(email.date)}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pl-13">
          {getEmailContent()}
          
          {email.attachments && email.attachments.length > 0 && (
            <div className="mt-6 border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Pièces jointes ({email.attachments.length})</h3>
              <div className="space-y-2">
                {email.attachments.map(attachment => (
                  <div key={attachment.id} className="flex items-center p-2 border border-gray-200 rounded-md">
                    <PaperClipIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{attachment.filename}</p>
                      <p className="text-xs text-gray-500">{Math.round(attachment.size / 1024)} KB</p>
                    </div>
                    {/* Attachment actions would go here */}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Reply buttons below content */}
      <div className="px-4 py-3 flex space-x-4">
        <button
          onClick={() => handleAction('reply')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <ArrowUturnLeftIcon className="h-5 w-5 mr-2" />
          Répondre
        </button>
        
        {/* Only show Reply All if there are multiple recipients */}
        {(email.to.split(',').length > 1 || email.cc) && (
          <button
            onClick={() => handleAction('replyAll')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowUturnRightIcon className="h-5 w-5 mr-2" />
            Répondre à tous
          </button>
        )}
        
        <button
          onClick={() => handleAction('forward')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <ForwardIcon className="h-5 w-5 mr-2" />
          Transférer
        </button>
      </div>
    </div>
  );
} 