import React, { useState, useEffect, useRef } from 'react';
import { Mic, StopCircle, Loader2, Play, Volume2, Keyboard } from 'lucide-react';
import { CartesiaClient, WebPlayer } from '@cartesia/cartesia-js';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

interface SimpleVoiceAgentProps {
  apiKey: string;
  voiceId?: string;
  initialPrompt?: string;
}

type AgentState = 'uninitialized' | 'idle' | 'listening' | 'processing' | 'speaking';

// Define the extracted form fields
interface SongFormData {
  characterName: string;
  musicStyle: string; 
  emotion: string;
  topic: string;
  additionalDetails: string;
}

// Speech queue item
interface SpeechQueueItem {
  text: string;
  onComplete?: () => void;
}

const SimpleVoiceAgent: React.FC<SimpleVoiceAgentProps> = ({
  apiKey,
  voiceId = "a0e99841-438c-4a64-b679-ae501e7d6091", // Default voice
  initialPrompt = "Hey there! I'm TuneGram. Let's create a personalized track that captures your unique style and vibe."
}) => {
  const [agentState, setAgentState] = useState<AgentState>('uninitialized');
  const [conversations, setConversations] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [silenceTimer, setSilenceTimer] = useState<number | null>(null);
  const [formData, setFormData] = useState<SongFormData>({
    characterName: '',
    musicStyle: '',
    emotion: 'happy',
    topic: '',
    additionalDetails: ''
  });
  const [currentQuestion, setCurrentQuestion] = useState<keyof SongFormData | null>(null);
  const [allFieldsCollected, setAllFieldsCollected] = useState(false);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  
  const cartesiaClientRef = useRef<CartesiaClient | null>(null);
  const webPlayerRef = useRef<WebPlayer | null>(null);
  const webSocketRef = useRef<any>(null);
  const initialPromptRef = useRef<string>(initialPrompt);
  const lastTranscriptRef = useRef<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const speechQueueRef = useRef<SpeechQueueItem[]>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const { transcript, resetTranscript, listening, browserSupportsSpeechRecognition } = useSpeechRecognition({
    clearTranscriptOnListen: false
  });
  
  // Add microphone permission check and initialization
  useEffect(() => {
    // Initialize Cartesia when API key is available
    if (apiKey) {
      console.log("Initializing Cartesia with API key");
      const client = new CartesiaClient({ apiKey });
      cartesiaClientRef.current = client;
      
      // Initialize audio context on component mount
      try {
        // Use consistent sample rate with Cartesia
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 44100,
        });
        audioContextRef.current = audioContext;
        console.log("Audio context initialized:", audioContext.state);
      } catch (error) {
        console.error("Failed to initialize audio context:", error);
      }
    }
    
    // Request microphone permission explicitly
    const requestMicPermission = async () => {
      try {
        console.log("Requesting microphone permission");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("Microphone permission granted, got stream:", stream.id);
        
        // Stop the stream immediately, we just needed permission
        stream.getTracks().forEach(track => track.stop());
        
        // Configure speech recognition settings
        console.log("Configuring speech recognition");
        SpeechRecognition.applyPolyfill(window.webkitSpeechRecognition);
        // Set up speech recognition options
        SpeechRecognition.startListening({ continuous: false, language: 'en-US' }).then(() => {
          console.log("Initial mic test successful");
          SpeechRecognition.stopListening();
        }).catch(err => {
          console.error("Initial mic test failed:", err);
        });
      } catch (err) {
        console.error("Error requesting microphone permission:", err);
        window.alert("Microphone access is required for this app to work. Please allow microphone access and reload the page.");
      }
    };
    
    requestMicPermission();
    
    // Cleanup function for component unmount
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current = null;
      }
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      speechQueueRef.current = [];
    };
  }, [apiKey]);
  
  // Process speech queue
  useEffect(() => {
    const processQueue = async () => {
      if (speechQueueRef.current.length > 0 && !isSpeakingRef.current) {
        const item = speechQueueRef.current[0];
        speechQueueRef.current.shift(); // Remove from queue
        
        // Process the speech item
        await speakTextInternal(item.text);
        
        // Call the completion callback if provided
        if (item.onComplete) {
          item.onComplete();
        }
        
        // Process next item in queue if any
        processQueue();
      }
    };
    
    processQueue();
  }, [conversations]); // Dependency on conversations to trigger queue processing after state updates
  
  // Process the transcript whenever it changes while listening
  useEffect(() => {
    console.log("Transcript changed:", transcript, "Listening:", listening);
    
    if (transcript && transcript.trim().length > 0) {
      // Keep updating state while user is speaking
      setAgentState('listening');
      lastTranscriptRef.current = transcript;
      
      // Reset silence detection timer
      if (silenceTimer) {
        window.clearTimeout(silenceTimer);
      }
      
      if (listening) {
        // Set a new timer to detect when user has stopped speaking
        const timer = window.setTimeout(() => {
          console.log("Silence detected, processing input:", transcript);
          SpeechRecognition.stopListening();
          handleConversationTurn();
        }, 1500); // 1.5 seconds of silence triggers processing
        
        setSilenceTimer(timer);
      }
    }
    
    return () => {
      if (silenceTimer) {
        window.clearTimeout(silenceTimer);
      }
    };
  }, [transcript, listening]);
  
  // Initialize speech recognition on component mount
  useEffect(() => {
    if (browserSupportsSpeechRecognition) {
      // Request microphone permission directly
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          console.log("Speech recognition permission granted");
        })
        .catch((err: Error) => {
          console.error("Error getting speech recognition permission:", err);
        });
    }
  }, [browserSupportsSpeechRecognition]);

  // Debug listener status
  useEffect(() => {
    console.log("Speech recognition listening state changed:", listening);
  }, [listening]);
  
  // Handle user clicking the Start button
  const handleStart = async () => {
    if (!isInitialized) {
      setIsInitialized(true);
      setAgentState('idle');
      
      // Resume audio context if it was suspended (needed for Safari)
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
          console.log("Audio context resumed");
        } catch (err) {
          console.error("Failed to resume audio context:", err);
        }
      }
      
      // Request microphone permission explicitly
      try {
        console.log("Requesting microphone permission on start");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("Microphone permission granted on start");
        
        // Stop the stream immediately, we just needed permission
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error("Error accessing microphone on start:", err);
        window.alert("Microphone access is required. Please allow microphone access.");
        return;
      }
      
      // Now it's safe to play audio because we have user interaction
      try {
        // Add to speech queue
        addToSpeechQueue("Hey there! I'm TuneGram. I'll create an awesome personalized track for you. What's your name?", () => {
          setConversations([{ role: 'assistant', content: "Hey there! I'm TuneGram. I'll create an awesome personalized track for you. What's your name?" }]);
          // Start with asking for character name and start listening automatically
          setCurrentQuestion('characterName');
          
          // Slight delay before starting listening
          setTimeout(() => {
            console.log("Starting listening after initial prompt");
            startListening();
          }, 300);
        });
      } catch (error) {
        console.error("Failed to speak initial prompt:", error);
      }
    }
  };
  
  // Add an item to the speech queue
  const addToSpeechQueue = (text: string, onComplete?: () => void) => {
    speechQueueRef.current.push({ text, onComplete });
    
    // Trigger queue processing if not currently speaking
    if (!isSpeakingRef.current && speechQueueRef.current.length === 1) {
      // We need to force a state update to trigger the queue processing effect
      setConversations(prev => [...prev]);
    }
  };
  
  // Update background music based on style
  const getBackgroundMusic = (style: string): string => {
    // These would be paths to actual music files in a real app
    const musicMap: Record<string, string> = {
      'pop': 'https://example.com/pop-backing.mp3',
      'rock': 'https://example.com/rock-backing.mp3',
      'jazz': 'https://example.com/jazz-backing.mp3',
      'country': 'https://example.com/country-backing.mp3',
      'rap': 'https://example.com/hiphop-backing.mp3',
      'classical': 'https://example.com/classical-backing.mp3',
      'lullaby': 'https://example.com/lullaby-backing.mp3',
      'electronic': 'https://example.com/electronic-backing.mp3',
      'reggae': 'https://example.com/reggae-backing.mp3',
      'blues': 'https://example.com/blues-backing.mp3',
      'folk': 'https://example.com/folk-backing.mp3'
    };

    // Default music if style not found
    return musicMap[style.toLowerCase()] || 'https://example.com/default-backing.mp3';
  };

  // Play background music
  const playBackgroundMusic = (style: string) => {
    // First stop any playing music
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current = null;
    }

    const musicUrl = getBackgroundMusic(style);
    const audio = new Audio(musicUrl);
    backgroundMusicRef.current = audio;
    audio.loop = true;
    audio.volume = 0.3; // Lower volume so voice is clear
    setIsPlayingMusic(true);
    
    // In a real app, we'd handle the play promise
    // Just simulating for the demo
    console.log(`Playing ${style} backing track`);
  };

  // Stop background music
  const stopBackgroundMusic = () => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current = null;
    }
    setIsPlayingMusic(false);
  };

  // Update data extraction for music-related fields
  const extractFormFields = (input: string): Partial<SongFormData> => {
    const extracted: Partial<SongFormData> = {};
    const lowercaseInput = input.toLowerCase();
    
    console.log("Extracting from input:", input, "Current question:", currentQuestion);
    
    // Character name extraction (similar to before)
    if (currentQuestion === 'characterName') {
      // First try with basic filter for names
      const nameRegex = /\b[A-Z][a-z]+\b/; // Capitalized words
      const match = input.match(nameRegex);
      
      if (match && match[0]) {
        // Found a capitalized word
        extracted.characterName = match[0];
      } else {
        // Fall back to first word if no capitalized word found
        const words = input.split(/\s+/).filter(w => w.length > 1);
        const nameWord = words[0];
        if (nameWord) {
          // Capitalize first letter of name
          extracted.characterName = nameWord.charAt(0).toUpperCase() + nameWord.slice(1).toLowerCase();
          extracted.characterName = extracted.characterName.replace(/[,.!?;:]/, '');
        }
      }
      
      // Always set characterName to something reasonable if we're on this question
      if (!extracted.characterName && input.trim().length > 0) {
        extracted.characterName = input.trim().charAt(0).toUpperCase() + input.trim().slice(1).split(' ')[0];
      }
      
      console.log("Extracted character name:", extracted.characterName);
    } else {
      // Regular extraction for other cases
      // Extract character name - look for patterns like "name is [name]" or "about [name]"
      const nameMatches = input.match(/(?:(?:name is|about|call me|named|named after)\s+)(\w+)/i) || 
                          input.match(/(\w+)(?:'s story)/i);
      if (nameMatches && nameMatches[1]) {
        extracted.characterName = nameMatches[1].charAt(0).toUpperCase() + nameMatches[1].slice(1);
      }
    }

    // Music style extraction
    if (currentQuestion === 'musicStyle') {
      // Common music styles
      const musicStyles = [
        "pop", "rock", "jazz", "country", "rap", "hip hop", "classical", 
        "lullaby", "electronic", "dance", "reggae", "blues", "folk", 
        "indie", "metal", "r&b", "disco", "techno"
      ];
      
      // Try to find a music style in the input
      for (const style of musicStyles) {
        if (lowercaseInput.includes(style)) {
          switch(style) {
            case "hip hop": extracted.musicStyle = "rap"; break;
            case "dance": extracted.musicStyle = "electronic"; break;
            case "techno": extracted.musicStyle = "electronic"; break;
            case "r&b": extracted.musicStyle = "soul"; break;
            default: extracted.musicStyle = style; break;
          }
          break;
        }
      }
      
      // If no style found, use a default or the input
      if (!extracted.musicStyle && input.trim().length > 0) {
        const words = input.trim().split(/\s+/);
        // Try to get just one word for the style
        extracted.musicStyle = words[0].toLowerCase();
      }
      
      console.log("Extracted music style:", extracted.musicStyle);
    }
    
    // Emotion extraction (similar to mood before)
    if (currentQuestion === 'emotion') {
      // Use first word as emotion if we're asking directly
      extracted.emotion = lowercaseInput.split(/\s+/)[0] || 'happy';
    } else {
      // Extract emotion using keywords
      const emotionKeywords = [
        { keywords: ['happy', 'joyful', 'cheerful', 'upbeat'], emotion: 'happy' },
        { keywords: ['calm', 'peaceful', 'relaxing', 'soothing'], emotion: 'calm' },
        { keywords: ['energetic', 'exciting', 'thrilling', 'pumped'], emotion: 'energetic' },
        { keywords: ['sad', 'emotional', 'touching', 'heartfelt'], emotion: 'sad' },
        { keywords: ['funny', 'hilarious', 'comedy', 'silly'], emotion: 'funny' },
        { keywords: ['romantic', 'love', 'sweet', 'passionate'], emotion: 'romantic' },
        { keywords: ['cool', 'chill', 'smooth', 'groovy'], emotion: 'cool' }
      ];
      
      for (const { keywords, emotion } of emotionKeywords) {
        for (const keyword of keywords) {
          if (lowercaseInput.includes(keyword)) {
            extracted.emotion = emotion;
            break;
          }
        }
        if (extracted.emotion) break;
      }
    }
    
    // Topic extraction
    if (currentQuestion === 'topic') {
      // Get topic from input - could be anything
      if (input.trim().length > 0) {
        // Try to extract a meaningful phrase
        const words = input.trim().split(/\s+/);
        if (words.length > 3) {
          // Get first few words for topic
          extracted.topic = words.slice(0, 3).join(' ');
        } else {
          extracted.topic = input.trim();
        }
      }
      
      console.log("Extracted topic:", extracted.topic);
    }
    
    // Additional details always captured
    extracted.additionalDetails = input;
    
    return extracted;
  };
  
  // Update question prompts for song creation
  const getQuestionForField = (field: keyof SongFormData | null): string => {
    switch(field) {
      case 'characterName':
        return "Who is this track for? Give me a name.";
      case 'musicStyle':
        return `Cool. What style of music are you into for ${formData.characterName}'s track? Hip-hop, rock, electronic, or something else?`;
      case 'emotion':
        return `Nice choice. Should the ${formData.musicStyle} track be upbeat, chill, intense, or have another vibe?`;
      case 'topic':
        return `Got it. What should the track be about? Any specific theme or subject matter?`;
      case 'additionalDetails':
        return "Anything else you want to include in the track?";
      default:
        return "Perfect. I've got everything I need to create your custom track. Ready to hear it?";
    }
  };
  
  // Check which fields are needed for song creation
  const determineNextQuestion = (): keyof SongFormData | null => {
    console.log("Determining next question with form data:", formData);
    
    if (!formData.characterName || formData.characterName === '') return 'characterName';
    
    // Skip other questions and go straight to generating lyrics
    return null;
  };
  
  // Ask the next question in the conversation flow
  const askNextQuestion = async () => {
    console.log("Starting askNextQuestion, current form data:", formData);
    
    const nextField = determineNextQuestion();
    console.log("Next field to ask about:", nextField);
    
    setCurrentQuestion(nextField);
    
    if (nextField) {
      const question = getQuestionForField(nextField);
      console.log("Asking question:", question);
      
      addToSpeechQueue(question, () => {
        setConversations(prev => [...prev, { role: 'assistant', content: question }]);
        // Start listening automatically after asking a question
        setTimeout(() => {
          console.log("Starting listening after asking question");
          startListening();
        }, 100);
      });
    } else {
      console.log("All fields collected, preparing to generate song");
      setAllFieldsCollected(true);
      const song = generateSong();
      
      // Add song to speech queue
      addToSpeechQueue(song, () => {
        setConversations(prev => [...prev, { role: 'assistant', content: song }]);
        
        // After song is complete, prepare for next interaction
        setTimeout(() => {
          console.log("Song complete, ready for next interaction");
          startListening();
        }, 500);
      });
    }
  };
  
  // Public wrapper for speakText that adds to queue
  const speakText = async (text: string): Promise<void> => {
    return new Promise((resolve) => {
      addToSpeechQueue(text, resolve);
    });
  };
  
  // Internal implementation of speech synthesis
  const speakTextInternal = async (text: string) => {
    if (!cartesiaClientRef.current || !text) {
      console.error("Cannot speak text: client or text is undefined");
      return;
    }
    
    try {
      isSpeakingRef.current = true;
      setAgentState('speaking');
      console.log("Starting TTS with Cartesia, text length:", text.length);
      
      // Break long text into chunks if needed
      const chunks = chunkText(text, 1000); // Break into 1000 character chunks
      console.log(`Split text into ${chunks.length} chunks`);
      
      for (const chunk of chunks) {
        console.log(`Processing chunk of length: ${chunk.length}`);
        
        // Using bytes API with improved handling
        const response = await cartesiaClientRef.current.tts.bytes({
          modelId: "sonic-2",
          transcript: chunk,
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
        
        console.log("Received audio data, length:", response.byteLength);
        
        // Create an audio blob and play it
        const blob = new Blob([response], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        const audio = new Audio(url);
        activeAudioRef.current = audio;
        
        // Set up audio handling
        audio.preload = 'auto';  // Preload audio to minimize startup delay
        
        // Force 100ms delay before playing to ensure audio buffer is loaded
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await new Promise<void>((resolve, reject) => {
          audio.onloadeddata = () => console.log("Audio loaded successfully");
          audio.onerror = (e) => {
            console.error("Audio error:", e);
            reject(e);
          };
          audio.onended = () => {
            console.log("Audio chunk playback completed");
            URL.revokeObjectURL(url);
            activeAudioRef.current = null;
            resolve();
          };
          
          console.log("Starting audio chunk playback...");
          
          // Play the audio chunk
          audio.play().catch(err => {
            console.error("Playback failed:", err);
            URL.revokeObjectURL(url);
            activeAudioRef.current = null;
            reject(err);
          });
        });
      }
      
      // All chunks have been played
      setAgentState('idle');
      isSpeakingRef.current = false;
      
    } catch (error) {
      console.error("Error in TTS:", error);
      setAgentState('idle');
      isSpeakingRef.current = false;
      activeAudioRef.current = null;
    }
  };
  
  // Helper to break text into chunks
  const chunkText = (text: string, chunkSize: number): string[] => {
    if (text.length <= chunkSize) {
      return [text];
    }
    
    const chunks: string[] = [];
    let currentChunk = "";
    
    // Split by lines first to avoid cutting in the middle of a line
    const lines = text.split('\n');
    
    for (const line of lines) {
      // If adding this line would exceed chunk size, finish current chunk and start a new one
      if (currentChunk.length + line.length + 1 > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = "";
      }
      
      // If a single line is longer than chunk size, split it
      if (line.length > chunkSize) {
        // If we already have content in the current chunk, finish it
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = "";
        }
        
        // Split the long line into chunks
        let remainingLine = line;
        while (remainingLine.length > 0) {
          // Try to split at a space to avoid cutting words
          let splitPoint = chunkSize;
          if (remainingLine.length > chunkSize) {
            // Find the last space before the chunk size limit
            const lastSpace = remainingLine.substring(0, chunkSize).lastIndexOf(' ');
            if (lastSpace > 0) {
              splitPoint = lastSpace;
            }
          }
          
          chunks.push(remainingLine.substring(0, splitPoint));
          remainingLine = remainingLine.substring(splitPoint).trim();
        }
      } else {
        // Add the line to the current chunk
        currentChunk += (currentChunk.length > 0 ? '\n' : '') + line;
      }
    }
    
    // Add the final chunk if not empty
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  };
  
  // Generate a song instead of a story
  const generateSong = (): string => {
    const { characterName, musicStyle, emotion, topic } = formData;
    
    // Start playing background music when generating the song
    playBackgroundMusic(musicStyle);
    
    // Generate an awesome song for the user
    return `
🎵 "${characterName}'s Epic Anthem" 🎵

[Intro]
The stage is set, the lights go down
${characterName} takes center stage with a crown
This is your moment, your time to shine
These lyrics are yours, this rhythm divine

[Verse 1]
Standing at the edge of a brand new day
${characterName}'s got something powerful to say
The world is listening, they're waiting to hear
Your voice rings out, strong, bold, and clear

Breaking through barriers that once held you back
Finding your power on this musical track
The universe shifts when you enter the room
Your presence electric, dispelling the gloom

[Chorus]
THIS IS YOUR TIME, ${characterName.toUpperCase()}!
(This is your time!)
THE WORLD IS YOURS TO CLAIM!
(The world is yours!)
YOUR FIRE INSIDE CANNOT BE TAMED!
(Cannot be tamed!)
${characterName.toUpperCase()}, YOUR LEGACY WILL REMAIN!

[Verse 2]
Challenges faced, obstacles crushed
Critics silenced, haters hushed
Building your empire one beat at a time
Your journey legendary, your story sublime

The path wasn't easy, but you persevered
Conquered the doubts, all the things that you feared
Now standing triumphant for all to see
Exactly who you were always meant to be

[Bridge]
They never saw you coming
They weren't ready for your rise
Now your name's on everyone's lips
The fire in your eyes

No mountain too high
No river too wide
With every step forward
You're changing the tide

[Final Chorus]
THIS IS YOUR TIME, ${characterName.toUpperCase()}!
(This is your time!)
THE WORLD IS YOURS TO CLAIM!
(The world is yours!)
YOUR FIRE INSIDE CANNOT BE TAMED!
(Cannot be tamed!)
${characterName.toUpperCase()}, YOUR LEGEND WILL REMAIN!

[Outro]
When they write the story of legends untold
${characterName}'s name will be printed in gold
This is just the beginning, your story's not done
The legacy of ${characterName} has only begun...
    `;
  };
  
  // Handle user conversation turn
  const handleConversationTurn = async () => {
    if (!transcript || transcript === '') return;
    
    console.log("Processing conversation turn with transcript:", transcript);
    
    // Add user message to conversation
    setConversations(prev => [...prev, { role: 'user', content: transcript }]);
    
    // Process user input
    setAgentState('processing');
    const userInput = transcript;
    resetTranscript();
    
    // Extract form fields from user input
    const extractedFields = extractFormFields(userInput);
    console.log("Extracted fields:", extractedFields, "Current question:", currentQuestion);
    
    // If we're asking for the character name and got a response
    if (currentQuestion === 'characterName' && userInput.trim().length > 0) {
      // Extract character name from input or use first word
      let name = extractedFields.characterName;
      if (!name) {
        name = userInput.trim().split(/\s+/)[0];
        name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      }
      
      // Update form data
      setFormData(prev => ({
        ...prev,
        characterName: name,
        musicStyle: 'rock',
        emotion: 'energetic',
        topic: 'life'
      }));
      
      // Confirm name
      addToSpeechQueue(`${name}. Got it.`, () => {
        setConversations(prev => [...prev, { role: 'assistant', content: `${name}. Got it.` }]);
        
        // Generate song right away
        setTimeout(() => {
          // Generate and speak confirmation
          addToSpeechQueue(`Great! I've created an awesome track for ${name}. Here it is:`, () => {
            setConversations(prev => [...prev, { role: 'assistant', content: `Great! I've created an awesome track for ${name}. Here it is:` }]);
            
            // Generate song after confirmation
            const song = generateSong();
            
            // Split the song lyric for better TTS handling
            const lyricSectionsMap = splitSongIntoSections(song);
            const lyricSections = Array.from(lyricSectionsMap.entries());
            
            // Add song to displayed conversation first
            setConversations(prev => [...prev, { role: 'assistant', content: song }]);
            
            // Then speak each section with proper pacing
            const speakSections = async (index = 0) => {
              if (index >= lyricSections.length) {
                // All sections have been spoken
                setTimeout(() => {
                  console.log("Song complete, ready for next interaction");
                  setAllFieldsCollected(true);
                  startListening();
                }, 500);
                return;
              }
              
              const [sectionTitle, sectionText] = lyricSections[index];
              console.log(`Speaking section: ${sectionTitle}`);
              
              // Add pause between sections
              if (index > 0) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
              
              // Speak this section then move to next
              addToSpeechQueue(sectionText, () => {
                speakSections(index + 1);
              });
            };
            
            // Start speaking sections
            speakSections();
          });
        }, 100);
      });
      
      return;
    }
    
    // Continue with existing logic for other cases
    // If all fields are collected, generate the song
    if (allFieldsCollected) {
      console.log("All fields collected, responding to follow-up");
      // User is asking a follow-up question after song
      const response = "Would you like to create another song? Just tell me a new character name or theme.";
      setAllFieldsCollected(false);
      setFormData({
        characterName: '',
        musicStyle: '',
        emotion: 'happy',
        topic: '',
        additionalDetails: ''
      });
      
      addToSpeechQueue(response, () => {
        setConversations(prev => [...prev, { role: 'assistant', content: response }]);
        startListening(); // Start listening after response
      });
      return;
    }
    
    // If we're asking about a specific field and got an answer for that field
    if (currentQuestion && extractedFields[currentQuestion]) {
      console.log(`Got answer for ${currentQuestion}:`, extractedFields[currentQuestion]);
      
      // Get the actual value that was extracted
      const extractedValue = extractedFields[currentQuestion];
      
      // Give a natural confirmation response
      let confirmationResponse = "";
      switch(currentQuestion) {
        case 'characterName':
          confirmationResponse = `${extractedValue}. Got it.`;
          break;
        case 'musicStyle':
          confirmationResponse = `${extractedValue}. Solid choice.`;
          break;
        case 'emotion':
          confirmationResponse = `${extractedValue}. That works well.`;
          break;
        default:
          confirmationResponse = "Got it.";
      }
      
      console.log("Confirmation response:", confirmationResponse);
      
      // First confirm, then explicitly mark this question as answered by setting
      // the state and forcing a move to the next question
      const currentField = currentQuestion;
      addToSpeechQueue(confirmationResponse, () => {
        setConversations(prev => [...prev, { role: 'assistant', content: confirmationResponse }]);
        
        // Force the field to be set before moving on
        setFormData(prev => {
          // Make extra sure the field is set
          const forcefulUpdate = { ...prev };
          if (extractedFields[currentField]) {
            forcefulUpdate[currentField] = extractedFields[currentField] as any;
          }
          return forcefulUpdate;
        });
        
        // Wait for state update to settle
        setTimeout(() => {
          // Manually determine the next field to avoid getting stuck
          // Get the next field AFTER updating the form data
          console.log("Form data before determining next field:", formData);
          const nextFieldToAsk = determineNextQuestion();
          console.log("Manually determined next field:", nextFieldToAsk);
          
          // Force a move to the next field
          if (nextFieldToAsk && nextFieldToAsk !== currentField) {
            console.log("Moving to next field:", nextFieldToAsk);
            setCurrentQuestion(nextFieldToAsk);
            
            // Ask the new question
            const nextQuestion = getQuestionForField(nextFieldToAsk);
            addToSpeechQueue(nextQuestion, () => {
              setConversations(prev => [...prev, { role: 'assistant', content: nextQuestion }]);
              startListening();
            });
          } else {
            // No more fields needed, generate the song
            console.log("All fields collected, preparing to generate song");
            setAllFieldsCollected(true);
            askNextQuestion();
          }
        }, 100);
      });
    } else {
      // If we didn't get a specific answer for the current question
      console.log("No specific answer for current question, asking again or moving on");
      
      // Check if we need to ask the same question again or move on
      if (currentQuestion && Object.keys(extractedFields).length === 0) {
        // No fields extracted, ask the same question again with a prompt
        const reprompt = `I didn't quite catch that. ${getQuestionForField(currentQuestion)}`;
        addToSpeechQueue(reprompt, () => {
          setConversations(prev => [...prev, { role: 'assistant', content: reprompt }]);
          startListening();
        });
      } else {
        // We got some fields but not the one we were asking for, try to move on
        askNextQuestion();
      }
    }
  };
  
  // Stop any active audio playback
  const stopPlayback = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    isSpeakingRef.current = false;
    setAgentState('idle');
    // Clear the speech queue
    speechQueueRef.current = [];
  };
  
  // Add helper to start listening
  const startListening = () => {
    if (!listening) {
      console.log("Starting listening...");
      resetTranscript();
      try {
        // First ensure we're not listening
        SpeechRecognition.stopListening();
        
        // Set a small delay before starting
        setTimeout(() => {
          // Use shorter listening periods with autoRestart
          SpeechRecognition.startListening({ 
            continuous: false, 
            language: 'en-US',
            interimResults: true
          }).then(() => {
            setAgentState('listening');
            console.log("Successfully started listening");
          }).catch(err => {
            console.error("Failed to start listening:", err);
            // Try again with setTimeout as a workaround
            setTimeout(() => {
              SpeechRecognition.startListening({ 
                continuous: false,
                language: 'en-US'
              }).catch(e => console.error("Retry failed:", e));
            }, 300);
          });
        }, 100);
      } catch (error) {
        console.error("Error in startListening:", error);
      }
    } else {
      console.log("Already listening, not starting again");
    }
  };
  
  // Toggle the agent's listening state
  const toggleListening = () => {
    console.log("Toggling listening, current state:", listening);
    if (listening) {
      SpeechRecognition.stopListening();
      handleConversationTurn();
    } else {
      startListening();
    }
  };
  
  // Helper to split song into sections for better TTS
  const splitSongIntoSections = (song: string): Map<string, string> => {
    const sections = new Map<string, string>();
    const lines = song.split('\n');
    
    let currentSection = "Title";
    let currentContent = "";
    
    for (const line of lines) {
      // Check if this is a section marker like [Verse 1], [Chorus], etc.
      if (line.match(/^\[.*\]$/)) {
        // Save previous section if it exists
        if (currentContent.trim()) {
          sections.set(currentSection, currentContent.trim());
        }
        
        // Start new section
        currentSection = line.replace(/[\[\]]/g, '').trim();
        currentContent = "";
      } else {
        // Add line to current section
        currentContent += line + "\n";
      }
    }
    
    // Add the last section
    if (currentContent.trim()) {
      sections.set(currentSection, currentContent.trim());
    }
    
    return sections;
  };
  
  // Handle user conversation turn (manual invocation for testing)
  const debugSubmitInput = () => {
    const testName = prompt("Enter a test name:") || "Test";
    console.log("Debug: Manually processing input:", testName);
    
    // Add user message to conversation
    setConversations(prev => [...prev, { role: 'user', content: testName }]);
    
    // Update form data with test name
    setFormData(prev => ({
      ...prev,
      characterName: testName,
      musicStyle: 'rock',
      emotion: 'energetic',
      topic: 'life'
    }));
    
    // Confirm name
    addToSpeechQueue(`${testName}. Got it.`, () => {
      setConversations(prev => [...prev, { role: 'assistant', content: `${testName}. Got it.` }]);
      
      // Generate song right away
      setTimeout(() => {
        // Generate and speak confirmation
        addToSpeechQueue(`Great! I've created an awesome track for ${testName}. Here it is:`, () => {
          setConversations(prev => [...prev, { role: 'assistant', content: `Great! I've created an awesome track for ${testName}. Here it is:` }]);
          
          // Generate song after confirmation
          const song = generateSong();
          
          // Split the song lyric for better TTS handling
          const lyricSectionsMap = splitSongIntoSections(song);
          const lyricSections = Array.from(lyricSectionsMap.entries());
          
          // Add song to displayed conversation first
          setConversations(prev => [...prev, { role: 'assistant', content: song }]);
          
          // Then speak each section with proper pacing
          const speakSections = async (index = 0) => {
            if (index >= lyricSections.length) {
              // All sections have been spoken
              setTimeout(() => {
                console.log("Song complete, ready for next interaction");
                setAllFieldsCollected(true);
                startListening();
              }, 500);
              return;
            }
            
            const [sectionTitle, sectionText] = lyricSections[index];
            console.log(`Speaking section: ${sectionTitle}`);
            
            // Add pause between sections
            if (index > 0) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Speak this section then move to next
            addToSpeechQueue(sectionText, () => {
              speakSections(index + 1);
            });
          };
          
          // Start speaking sections
          speakSections();
        });
      }, 100);
    });
  };
  
  if (!browserSupportsSpeechRecognition) {
    return <div className="text-center p-4 bg-red-100 text-red-700 rounded-lg">Your browser doesn't support speech recognition.</div>;
  }
  
  // Show the start button if not initialized
  if (agentState === 'uninitialized') {
    return (
      <div className="voice-agent-container bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 rounded-3xl shadow-xl p-8 border-4 border-indigo-200 overflow-hidden relative">
        {/* Animated background elements */}
        <div className="absolute top-5 left-5 w-20 h-20 bg-yellow-200 rounded-full opacity-20 animate-float-slow"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-pink-200 rounded-full opacity-20 animate-float"></div>
        <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-blue-200 rounded-full opacity-20 animate-float-delayed"></div>
        
        <div className="mb-6 text-center relative z-10">
          <div className="flex items-center justify-center">
            <span className="text-6xl mb-2">🎵</span>
          </div>
          <h2 className="text-3xl font-bold text-indigo-600 mb-4 font-display">TuneGram</h2>
          <p className="text-lg text-indigo-500 mb-8 font-medium">
            Create your personalized track with a unique sound.
          </p>
          
          <button
            onClick={handleStart}
            className="start-button bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-6 px-10 rounded-full shadow-magic transform transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
          >
            <Play className="w-8 h-8" />
            <span className="text-xl">Start Session</span>
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="voice-agent-container bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 rounded-3xl shadow-xl p-8 border-4 border-indigo-200 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-5 left-5 w-20 h-20 bg-yellow-200 rounded-full opacity-20 animate-float-slow"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-pink-200 rounded-full opacity-20 animate-float"></div>
      <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-blue-200 rounded-full opacity-20 animate-float-delayed"></div>
      
      <div className="mb-6 text-center relative z-10">
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="text-4xl">🎵</span>
          <h2 className="text-2xl font-bold text-indigo-600 font-display">TuneGram</h2>
          <span className="text-4xl">🎵</span>
        </div>
        <div className="status-pill py-2 px-6 rounded-full bg-white/70 shadow-sm inline-block">
          <p className="text-indigo-600 font-medium">
            {agentState === 'idle' && 'Tap the mic and let me know what you want'}
            {agentState === 'listening' && 'Listening to your ideas...'}
            {agentState === 'processing' && 'Creating your track...'}
            {agentState === 'speaking' && 'Playing your custom track...'}
          </p>
        </div>
      </div>
      
      {/* Form data visualization - music themed */}
      <div className="mb-8 p-5 bg-white/80 rounded-2xl border-2 border-indigo-200 shadow-inner relative z-10">
        <h3 className="text-lg font-bold text-center text-indigo-600 mb-4 font-display">Track Details</h3>
        <div className="grid grid-cols-4 gap-3">
          <div className="story-card bg-yellow-100 p-4 rounded-xl text-center">
            <div className="text-3xl mb-1">👤</div>
            <div className="font-medium text-yellow-800 mb-1">For</div>
            <div className="text-lg text-indigo-700 font-bold">{formData.characterName || '?'}</div>
          </div>
          
          <div className="story-card bg-blue-100 p-4 rounded-xl text-center">
            <div className="text-3xl mb-1">🎸</div>
            <div className="font-medium text-blue-800 mb-1">Style</div>
            <div className="text-lg text-indigo-700 font-bold">{formData.musicStyle || '?'}</div>
          </div>
          
          <div className="story-card bg-pink-100 p-4 rounded-xl text-center">
            <div className="text-3xl mb-1">😊</div>
            <div className="font-medium text-pink-800 mb-1">Vibe</div>
            <div className="text-lg text-indigo-700 font-bold">{formData.emotion || '?'}</div>
          </div>
          
          <div className="story-card bg-green-100 p-4 rounded-xl text-center">
            <div className="text-3xl mb-1">💭</div>
            <div className="font-medium text-green-800 mb-1">About</div>
            <div className="text-lg text-indigo-700 font-bold">{formData.topic || '?'}</div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center gap-4 mb-6 relative z-10">
        <button
          onClick={toggleListening}
          disabled={agentState === 'processing' || agentState === 'speaking'}
          className={`voice-button-large rounded-full p-8 shadow-magic transform transition-all duration-300 ${
            listening 
              ? 'bg-gradient-to-r from-red-400 to-red-500 text-white pulsing hover:from-red-500 hover:to-red-600' 
              : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600'
          } ${agentState === 'processing' || agentState === 'speaking' ? 'opacity-70' : 'hover:scale-105 active:scale-95'}`}
        >
          {agentState === 'processing' ? (
            <Loader2 size={56} className="animate-spin" />
          ) : agentState === 'speaking' ? (
            <Volume2 size={56} className="animate-bounce-gentle" />
          ) : listening ? (
            <StopCircle size={56} />
          ) : (
            <Mic size={56} />
          )}
        </button>
        
        {agentState === 'speaking' && (
          <button
            onClick={stopPlayback}
            className="stop-button bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-white rounded-full p-6 shadow-magic transition-all transform hover:scale-105 active:scale-95"
            title="Stop Speaking"
          >
            <StopCircle size={32} />
          </button>
        )}
      </div>
      
      <div className="conversation-display max-h-[40vh] overflow-y-auto rounded-2xl border-2 border-indigo-200 bg-white/80 p-4 shadow-inner relative z-10">
        {conversations.length === 0 ? (
          <div className="text-center p-6">
            <p className="text-gray-500 italic">Your custom track will appear here</p>
            <div className="text-5xl mt-3">🎹</div>
          </div>
        ) : (
          conversations.map((msg, index) => (
            <div 
              key={index} 
              className={`mb-4 p-4 rounded-xl ${
                msg.role === 'assistant' 
                  ? 'bg-indigo-100 text-indigo-800 ml-4 shadow-sm border border-indigo-200' 
                  : 'bg-purple-100 text-purple-800 mr-4 shadow-sm border border-purple-200'
              }`}
            >
              <div className="font-medium mb-1 flex items-center gap-2">
                {msg.role === 'assistant' ? (
                  <>
                    <span className="text-xl">🎵</span>
                    <span>TuneGram:</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">👤</span>
                    <span>You:</span>
                  </>
                )}
              </div>
              <div className="font-medium">{msg.content}</div>
            </div>
          ))
        )}
        
        {listening && transcript && (
          <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-xl border border-green-200 animate-pulse">
            <div className="font-medium mb-1 flex items-center gap-2">
              <span className="text-xl">🎤</span>
              <span>Listening:</span>
            </div>
            <div className="font-medium">{transcript}</div>
          </div>
        )}
      </div>
      
      {/* Bottom controls */}
      <div className="flex items-center justify-center mt-4 space-x-3 relative z-10">
        <button
          onClick={toggleListening}
          className={`mic-button p-4 rounded-full ${
            agentState === 'listening' 
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200' 
          } transition-all duration-300 flex items-center justify-center`}
          title={agentState === 'listening' ? 'Stop Listening' : 'Start Listening'}
          disabled={agentState === 'speaking' || !isInitialized}
        >
          {agentState === 'listening' ? <Mic size={28} /> : <Mic size={24} />}
        </button>
        
        {/* Debug button for testing without microphone */}
        <button
          onClick={debugSubmitInput}
          className="bg-gray-100 text-gray-600 hover:bg-gray-200 p-3 rounded-full transition-colors"
          title="Test without microphone"
        >
          <Keyboard size={20} />
        </button>
      </div>
    </div>
  );
};

export default SimpleVoiceAgent; 