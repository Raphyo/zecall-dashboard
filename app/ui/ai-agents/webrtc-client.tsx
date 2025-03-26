import { useEffect, useRef, useState } from 'react';
import { RTVIClient, RTVIEvent } from '@pipecat-ai/client-js';
import { DailyTransport } from '@pipecat-ai/daily-transport';
import { ORCHESTRATOR_URL } from '@/app/lib/api';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface WebRTCClientProps {
  agentId: string;
  onStatusChange?: (status: string) => void;
  onError?: (error: Error) => void;
  onDisconnect?: () => void;
}

export function WebRTCClient({ agentId, onStatusChange, onError, onDisconnect }: WebRTCClientProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const rtviClientRef = useRef<RTVIClient | null>(null);
  const botAudioRef = useRef<HTMLAudioElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const isConnectingRef = useRef(false);
  
  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  const disconnect = async () => {
    if (rtviClientRef.current) {
      try {
        // Disconnect the RTVI client
        await rtviClientRef.current.disconnect();
        rtviClientRef.current = null;
        isConnectingRef.current = false;

        // Clean up audio
        if (botAudioRef.current?.srcObject) {
          (botAudioRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
          botAudioRef.current.srcObject = null;
        }

        onDisconnect?.();
      } catch (error) {
        console.error('Error disconnecting:', error);
        onError?.(error as Error);
      }
    }
  };

  useEffect(() => {
    const setupClient = async () => {
      // Prevent multiple connection attempts
      if (rtviClientRef.current || isConnectingRef.current) {
        return;
      }

      isConnectingRef.current = true;

      try {
        // Create a new Daily transport for WebRTC communication
        const transport = new DailyTransport();

        // Initialize the RTVI client
        const client = new RTVIClient({
          transport,
          params: {
            baseUrl: ORCHESTRATOR_URL || 'http://localhost:5000',
            endpoints: {
              connect: `/voice-webhook?agent_id=${agentId}&ai_provider=daily_webrtc`,
            },
          },
          enableMic: true,
          enableCam: false,
          callbacks: {
            onConnected: () => {
              console.log('WebRTC: Connected successfully');
              setIsConnected(true);
              onStatusChange?.('Connected');
            },
            onDisconnected: () => {
              console.log('WebRTC: Disconnected');
              setIsConnected(false);
              onStatusChange?.('Disconnected');
              // Clear messages when disconnected
              setMessages([]);
              isConnectingRef.current = false;
            },
            onTransportStateChanged: (state) => {
              console.log('WebRTC: Transport state changed:', state);
              onStatusChange?.(`Transport: ${state}`);
              if (state === 'ready') {
                setupMediaTracks();
              }
            },
            onBotConnected: (participant) => {
              console.log('WebRTC: Bot connected:', participant);
            },
            onBotDisconnected: (participant) => {
              console.log('WebRTC: Bot disconnected:', participant);
            },
            onBotReady: (data) => {
              console.log('WebRTC: Bot ready:', data);
              setupMediaTracks();
            },
            onUserTranscript: (data) => {
              if (data.final) {
                console.log('User:', data.text);
                setMessages(prev => [...prev, {
                  text: data.text,
                  sender: 'user',
                  timestamp: new Date()
                }]);
              }
            },
            onBotTranscript: (data) => {
              console.log('Bot:', data.text);
              setMessages(prev => [...prev, {
                text: data.text,
                sender: 'bot',
                timestamp: new Date()
              }]);
            },
            onError: (error) => {
              console.error('RTVI error:', error);
              onError?.(new Error(error.toString()));
            }
          }
        });

        // Set up track listeners
        client.on(RTVIEvent.TrackStarted, (track, participant) => {
          if (!participant?.local && track.kind === 'audio') {
            setupAudioTrack(track);
          }
        });

        // Initialize and connect
        await client.initDevices();
        await client.connect();

        rtviClientRef.current = client;
      } catch (error) {
        console.error('Error setting up WebRTC client:', error);
        isConnectingRef.current = false;
        onError?.(error as Error);
      }
    };

    setupClient();

    // Cleanup on unmount or when agentId changes
    return () => {
      disconnect();
    };
  }, [agentId]); // Only re-run if agentId changes

  const setupMediaTracks = () => {
    const client = rtviClientRef.current;
    if (!client) return;

    const tracks = client.tracks();
    if (tracks.bot?.audio) {
      setupAudioTrack(tracks.bot.audio);
    }
  };

  const setupAudioTrack = (track: MediaStreamTrack) => {
    if (!botAudioRef.current) return;

    if (botAudioRef.current.srcObject) {
      const oldTrack = (botAudioRef.current.srcObject as MediaStream).getAudioTracks()[0];
      if (oldTrack?.id === track.id) return;
    }

    botAudioRef.current.srcObject = new MediaStream([track]);
  };

  return (
    <div className="flex">
      <div className="hidden">
        <audio ref={botAudioRef} autoPlay playsInline />
      </div>
      
      <div className="fixed right-4 top-20 w-80 bg-white rounded-lg shadow-lg border border-gray-200 max-h-[calc(100vh-6rem)] flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Transcription</h3>
          <p className="text-sm text-gray-500">
            {isConnected ? 'Connected' : 'Disconnected'}
          </p>
        </div>
        
        <div 
          ref={transcriptRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{ maxHeight: 'calc(100vh - 12rem)' }}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] ${
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <p className="text-xs mt-1 opacity-75">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 