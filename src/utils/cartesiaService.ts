import { CartesiaClient } from '@cartesia/cartesia-js';

// API key provided by the user
const CARTESIA_API_KEY = "sk_car_YycSrZrf1x8qbmZzchYaUb";

// Rob's specific voice ID
const ROB_VOICE_ID = "48a74a93-28e5-4d02-b281-f421244dd88d";

// Initialize the CartesiaClient
const cartesiaClient = new CartesiaClient({ apiKey: CARTESIA_API_KEY });

class CartesiaService {
  private activeAudio: HTMLAudioElement | null = null;
  
  constructor() {
    this.initializeAudioContext();
  }
  
  private initializeAudioContext() {
    // Initialize audio context on service creation
    try {
      // Create an audio context with a consistent sample rate
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      new AudioContext({ sampleRate: 44100 });
      console.log("Audio context initialized for Cartesia");
    } catch (error) {
      console.error("Failed to initialize audio context:", error);
    }
  }
  
  /**
   * Speaks the provided text with Rob's voice
   */
  async speakRobPhrase(text: string): Promise<void> {
    try {
      // Stop any currently playing audio
      if (this.activeAudio) {
        this.activeAudio.pause();
        this.activeAudio = null;
      }
      
      console.log("Creating speech with Cartesia using Rob voice...");
      
      // Use the bytes API which is more consistent with the CartesiaClient SDK
      const response = await cartesiaClient.tts.bytes({
        modelId: "sonic-2",
        transcript: text,
        voice: {
          mode: "id",
          id: ROB_VOICE_ID, // Using the exact Rob voice ID provided
        },
        language: "en",
        outputFormat: {
          container: "wav",
          sampleRate: 44100,
          encoding: "pcm_f32le",
        },
      });
      
      console.log("Speech data received, creating audio...");
      
      // Create a blob and play it
      const blob = new Blob([response], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      
      console.log("Playing audio with Rob voice...");
      
      // Create and play audio element
      const audio = new Audio(url);
      this.activeAudio = audio;
      
      // Return a promise that resolves when audio finishes playing
      return new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(url); // Clean up the URL object
          this.activeAudio = null;
          resolve();
        };
        
        audio.onerror = (error) => {
          URL.revokeObjectURL(url); // Clean up the URL object
          console.error("Error playing audio:", error);
          this.activeAudio = null;
          reject(error);
        };
        
        // Play the audio with a small delay to ensure buffer is loaded
        setTimeout(() => {
          audio.play().catch(error => {
            URL.revokeObjectURL(url); // Clean up the URL object
            console.error("Error starting audio playback:", error);
            reject(error);
          });
        }, 100);
      });
    } catch (error) {
      console.error("Error in speakRobPhrase:", error);
      throw error;
    }
  }
  
  /**
   * Speaks Rob's signature Scottish phrase
   */
  async speakRobSignaturePhrase(): Promise<void> {
    const robPhrase = "Awright ya wee daftie! Whit in the name o' mah gran's knitted bloomers d'ye think yer daein'? Dinnae press buttons like yer maw's microwave's stuck on defcon one! Ye press one mair time an' I'll come roarin' doon yer street in me taxi wi' the boot wide open, tossin' haggis oot the back an' shoutin' 'Freedom!' like a caffeinated Braveheart! Yer uncle Rab once did that, ended up wedged in a wheelie bin shoutin' at pigeons for three days. Now dae yersel a favour — gie that button a proper poke an' let's cause some musical mayhem, ya rocket!";
    return this.speakRobPhrase(robPhrase);
  }
}

// Create a singleton instance
const cartesiaService = new CartesiaService();
export default cartesiaService; 