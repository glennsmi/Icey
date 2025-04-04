import React, { useState, useEffect, useRef } from 'react';
import { CartesiaClient, WebPlayer } from '@cartesia/cartesia-js';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

type ConversationState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

type VoiceCommand = {
  command: string;
  callback: (params?: any) => void;
  matchInterim?: boolean;
};

interface VoiceAgentProps {
  apiKey: string;
  commands?: VoiceCommand[];
  onTranscriptChange?: (transcript: string) => void;
  onStateChange?: (state: ConversationState) => void;
  welcomeMessage?: string;
  voiceId?: string;
  children?: React.ReactNode;
}

const VoiceAgent: React.FC<VoiceAgentProps> = ({
  apiKey,
  commands = [],
  onTranscriptChange,
  onStateChange,
  welcomeMessage = "Hello! I'm your voice assistant. How can I help you today?",
  voiceId = "a0e99841-438c-4a64-b679-ae501e7d6091", // Default voice
  children,
}) => {
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversation, setConversation] = useState<{role: 'agent' | 'user', content: string}[]>([]);
  const webSocketRef = useRef<any>(null);
  const webPlayerRef = useRef<WebPlayer | null>(null);
  const cartesiaClientRef = useRef<CartesiaClient | null>(null);
  
  // Speech recognition setup
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition({ commands });

  // Initialize Cartesia client
  useEffect(() => {
    cartesiaClientRef.current = new CartesiaClient({ 
      apiKey 
    });
    
    webPlayerRef.current = new WebPlayer({ bufferDuration: 1.0 });
    
    // Cleanup function
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.disconnect();
      }
    };
  }, [apiKey]);

  // Update the conversation state based on the speech recognition state
  useEffect(() => {
    if (listening) {
      setConversationState('listening');
    } else if (conversationState === 'listening') {
      setConversationState('processing');
    }
    
    if (onStateChange) {
      onStateChange(conversationState);
    }
  }, [listening, conversationState, onStateChange]);

  // Handle transcript changes
  useEffect(() => {
    if (transcript && onTranscriptChange) {
      onTranscriptChange(transcript);
    }
  }, [transcript, onTranscriptChange]);

  // Speak the welcome message on mount
  useEffect(() => {
    if (welcomeMessage && cartesiaClientRef.current) {
      speakText(welcomeMessage);
      addToConversation('agent', welcomeMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [welcomeMessage]);

  // Add message to conversation history
  const addToConversation = (role: 'agent' | 'user', content: string) => {
    setConversation(prev => [...prev, { role, content }]);
  };

  // Start listening for speech
  const startListening = () => {
    resetTranscript();
    SpeechRecognition.startListening({ continuous: true });
  };

  // Stop listening for speech
  const stopListening = () => {
    SpeechRecognition.stopListening();
    if (transcript) {
      addToConversation('user', transcript);
    }
  };

  // Speak text using Cartesia TTS
  const speakText = async (text: string) => {
    if (!cartesiaClientRef.current) return;
    
    try {
      setIsSpeaking(true);
      setConversationState('speaking');
      
      // Using Cartesia's websocket for streaming audio
      if (!webSocketRef.current) {
        webSocketRef.current = cartesiaClientRef.current.tts.websocket({
          container: "raw",
          encoding: "pcm_f32le",
          sampleRate: 44100,
        });
        
        try {
          await webSocketRef.current.connect();
        } catch (error) {
          console.error("Failed to connect to Cartesia:", error);
          setConversationState('error');
          return;
        }
      }
      
      const response = await webSocketRef.current.send({
        modelId: "sonic-2",
        voice: {
          mode: "id",
          id: voiceId,
        },
        transcript: text,
      });
      
      if (webPlayerRef.current) {
        await webPlayerRef.current.play(response.source);
      }
      
      setIsSpeaking(false);
      setConversationState('idle');
    } catch (error) {
      console.error("Error speaking text:", error);
      setIsSpeaking(false);
      setConversationState('error');
    }
  };

  // Alternative method using bytes API for simpler cases
  const speakTextBytes = async (text: string) => {
    if (!cartesiaClientRef.current) return;
    
    try {
      setIsSpeaking(true);
      setConversationState('speaking');
      
      const response = await cartesiaClientRef.current.tts.bytes({
        modelId: "sonic-2",
        transcript: text,
        voice: {
          mode: "id",
          id: voiceId,
        },
        language: "en",
        outputFormat: {
          container: "wav",
          sampleRate: 44100,
          encoding: "pcm_f32le",
        },
      });
      
      const blob = new Blob([response], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      
      const audio = new Audio(url);
      audio.onended = () => {
        setIsSpeaking(false);
        setConversationState('idle');
        URL.revokeObjectURL(url);
      };
      audio.play();
    } catch (error) {
      console.error("Error speaking text:", error);
      setIsSpeaking(false);
      setConversationState('error');
    }
  };

  // Process user input and generate response
  const processUserInput = async (userInput: string) => {
    // This function would typically call an LLM or other backend service
    // to process the user's input and generate a response
    
    // For demo purposes, we'll just echo the input
    const response = `I heard you say: ${userInput}`;
    await speakText(response);
    addToConversation('agent', response);
  };

  // Handle conversation turn
  const handleConversationTurn = async () => {
    stopListening();
    if (transcript) {
      await processUserInput(transcript);
    }
    resetTranscript();
    startListening();
  };

  if (!browserSupportsSpeechRecognition) {
    return <div>Your browser doesn't support speech recognition.</div>;
  }

  return (
    <div className="voice-agent">
      <div className="voice-agent-status">
        <div className={`status-indicator ${conversationState}`}>
          {conversationState === 'idle' && 'Ready'}
          {conversationState === 'listening' && 'Listening...'}
          {conversationState === 'processing' && 'Processing...'}
          {conversationState === 'speaking' && 'Speaking...'}
          {conversationState === 'error' && 'Error'}
        </div>
      </div>
      
      <div className="voice-agent-controls">
        <button 
          onClick={startListening}
          disabled={listening || isSpeaking}
          className="listen-button"
        >
          Start Listening
        </button>
        <button 
          onClick={stopListening}
          disabled={!listening || isSpeaking}
          className="stop-button"
        >
          Stop Listening
        </button>
        <button 
          onClick={handleConversationTurn}
          disabled={!transcript || isSpeaking}
          className="process-button"
        >
          Process Input
        </button>
      </div>
      
      <div className="current-transcript">
        {listening && <p>Current: {transcript}</p>}
      </div>
      
      <div className="conversation-history">
        {conversation.map((entry, index) => (
          <div key={index} className={`conversation-entry ${entry.role}`}>
            <strong>{entry.role === 'agent' ? 'Assistant:' : 'You:'}</strong> {entry.content}
          </div>
        ))}
      </div>
      
      {children}
    </div>
  );
};

export default VoiceAgent; 