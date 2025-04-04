// import { Storage } from 'firebase/storage';

interface GeminiAnalysisResult {
  description: string;
  madLib: {
    sentence: string;
    blank: string;
    original: string;
  };
}

/**
 * Analyzes an image using Gemini Flash 2.0 API
 * @param imageUrl URL of the image to analyze
 * @returns Analysis result with description and mad-lib
 */
export const analyzeImageWithGemini = async (imageUrl: string): Promise<GeminiAnalysisResult> => {
  try {
    // Use API key from environment variable
    // Vite exposes env variables on import.meta.env
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string || '';
    
    if (!apiKey) {
      throw new Error('Gemini API key not found. Please set VITE_GEMINI_API_KEY in your environment.');
    }
    
    // Gemini API endpoint for analyzing images
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-2.0:generateContent';
    
    // Create request with our prompt
    const requestData = {
      contents: [
        {
          parts: [
            {
              text: "Analyse the uploaded photo, describe in a simple sentence what you observe is happening, and then turn one of the verbs or nouns in that sentence into a blank, so the user can enter the blank, mad-libs style."
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: await fetchImageAsBase64(imageUrl)
              }
            }
          ]
        }
      ],
      generation_config: {
        temperature: 0.4,
        max_output_tokens: 150
      }
    };
    
    // Make the API call
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }
    
    const responseData = await response.json();
    
    // Process the response to extract description and mad-lib
    return processGeminiResponse(responseData);
    
  } catch (error) {
    console.error('Error analyzing image with Gemini:', error);
    return {
      description: 'Failed to analyze image',
      madLib: {
        sentence: 'A person is doing ____ in the image.',
        blank: 'something',
        original: 'something'
      }
    };
  }
};

/**
 * Fetches an image as base64 encoded string
 */
const fetchImageAsBase64 = async (imageUrl: string): Promise<string> => {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Process Gemini API response to extract description and mad-lib
 */
const processGeminiResponse = (response: any): GeminiAnalysisResult => {
  try {
    const text = response.candidates[0].content.parts[0].text;
    
    // Split the response into lines
    const lines = text.split('\n').filter((line: string) => line.trim() !== '');
    
    // First line or paragraph should be the description
    let description = lines[0];
    
    // Find the mad lib sentence (contains an underscore or blank)
    const madLibLine = lines.find((line: string) => 
      line.includes('____') || 
      line.includes('___') || 
      line.includes('[blank]') ||
      line.includes('(blank)') ||
      line.toLowerCase().includes('mad lib') ||
      line.toLowerCase().includes('mad-lib')
    );
    
    // Extract or create the mad lib components
    let madLib = {
      sentence: '',
      blank: '',
      original: ''
    };
    
    if (madLibLine) {
      // Extract the sentence with the blank
      const sentence = madLibLine.replace(/Mad[- ]lib:?\s*/i, '').trim();
      
      // Try to find what word was replaced
      const originalWordMatch = text.match(/(?:replaced|blank for|blank is|original word is|word is)[:\s]+["']?([a-zA-Z]+)["']?/i);
      const original = originalWordMatch ? originalWordMatch[1] : 'activity';
      
      madLib = {
        sentence,
        blank: '____',
        original
      };
    } else {
      // If no mad lib found, create a basic one from the description
      const words = description.split(' ');
      if (words.length > 3) {
        // Pick a noun or verb (usually 4th or 5th word might be good)
        const wordIndex = Math.min(4, words.length - 1);
        const word = words[wordIndex];
        words[wordIndex] = '____';
        
        madLib = {
          sentence: words.join(' '),
          blank: '____',
          original: word
        };
      } else {
        // Fallback
        madLib = {
          sentence: description + ' ____',
          blank: '____',
          original: 'activity'
        };
      }
    }
    
    return {
      description: description || 'An image was analyzed',
      madLib
    };
    
  } catch (error) {
    console.error('Error processing Gemini response:', error);
    return {
      description: 'An image was analyzed',
      madLib: {
        sentence: 'A person is doing ____ in the image.',
        blank: 'something',
        original: 'something'
      }
    };
  }
}; 