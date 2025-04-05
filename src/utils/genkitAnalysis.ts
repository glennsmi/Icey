import { z } from 'zod';

interface TuneAnalysis {
  mood: string;
  elements: string[];
  musicRelevance: string;
  suggestedTags: string[];
}

/**
 * Analyzes an image using Gemini Flash 2.0 directly from the frontend
 * @param imageUrl URL of the image to analyze
 * @param title Song title
 * @param artist Song artist
 * @param description Optional song description
 * @returns Analysis result
 */
export const analyzeTuneImageDirectly = async (
  imageUrl: string, 
  title: string, 
  artist: string,
  description?: string
): Promise<TuneAnalysis> => {
  try {
    // Use API key from environment variable
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string || '';
    
    if (!apiKey) {
      throw new Error('Gemini API key not found. Please set VITE_GEMINI_API_KEY in your environment.');
    }
    
    // Gemini API endpoint for analyzing images
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    
    // Construct the prompt similar to what's in your Cloud Function
    const prompt = `
      Analyze this image in the context of the music information provided.
      
      Song Title: ${title}
      Artist: ${artist}
      Description: ${description || "None provided"}
      
      Please identify:
      1. The overall mood/emotion conveyed by the image
      2. The key visual elements in the image
      3. How the image might relate to the music (based on title/artist)
      4. Suggest 3-5 tags that could be associated with this image and music
      
      Provide your analysis in a concise, helpful manner.
    `;
    
    // Create request with our prompt
    const requestData = {
      contents: [
        {
          parts: [
            {
              text: prompt
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
        temperature: 0.2,
        max_output_tokens: 800
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
    
    // Process the response to extract analysis data
    return processGeminiResponse(responseData);
    
  } catch (error) {
    console.error('Error analyzing image with Gemini:', error);
    return {
      mood: "Analysis failed",
      elements: ["Error processing image"],
      musicRelevance: "Unable to determine",
      suggestedTags: ["unprocessed"]
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
 * Process Gemini API response to extract analysis data
 */
const processGeminiResponse = (response: any): TuneAnalysis => {
  try {
    const text = response.candidates[0].content.parts[0].text;
    
    // Extract insights from the response using regex, similar to the cloud function
    const moodMatch = text.match(/mood\/emotion[^:]*:(.*?)(?=\n\d|\n\n|\n$|$)/i);
    const elementsMatch = text.match(/visual elements[^:]*:(.*?)(?=\n\d|\n\n|\n$|$)/i);
    const relevanceMatch = text.match(/relate to the music[^:]*:(.*?)(?=\n\d|\n\n|\n$|$)/i);
    const tagsMatch = text.match(/tags[^:]*:(.*?)(?=\n\d|\n\n|\n$|$)/i);
    
    // Process extracted data
    const mood = moodMatch ? moodMatch[1].trim() : "Not identified";
    
    const elementsText = elementsMatch ? elementsMatch[1].trim() : "";
    const elements = elementsText
      .split(/[,•-]/)
      .map((item: string) => item.trim())
      .filter((item: string) => item.length > 0);
    
    const musicRelevance = relevanceMatch ? relevanceMatch[1].trim() : "Not identified";
    
    const tagsText = tagsMatch ? tagsMatch[1].trim() : "";
    const suggestedTags = tagsText
      .split(/[,#]/)
      .map((tag: string) => tag.trim().replace(/^#/, ''))
      .filter((tag: string) => tag.length > 0);
    
    return {
      mood,
      elements: elements.length > 0 ? elements : ["Not identified"],
      musicRelevance,
      suggestedTags: suggestedTags.length > 0 ? suggestedTags : ["music", "image"]
    };
    
  } catch (error) {
    console.error('Error processing Gemini response:', error);
    return {
      mood: "An error occurred",
      elements: ["Processing error"],
      musicRelevance: "Unable to determine",
      suggestedTags: ["error"]
    };
  }
}; 