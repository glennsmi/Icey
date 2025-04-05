// Import Firebase functions and admin SDK
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import { onCall } from "firebase-functions/v2/https";
import { genkit, z } from "genkit";
import { googleAI, gemini20Flash } from "@genkit-ai/googleai";

// Define the Google API key
import { GOOGLE_GEMINI_API_KEY } from "../keys";

// Initialize the Genkit AI with Google AI plugin
const ai = genkit({
  plugins: [googleAI({ apiKey: GOOGLE_GEMINI_API_KEY })],
});

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Define the image analysis flow
const analyzeImageFlow = ai.defineFlow({
  name: "analyzeImageFlow",
  inputSchema: z.object({
    imageUrl: z.string().describe("URL of the image to analyze"),
    title: z.string().describe("Song title"),
    description: z.string().optional().describe("User description")
  }),
  outputSchema: z.object({
    mood: z.string().describe("Mood of the image"),
    elements: z.array(z.string()).describe("Key elements in the image"),
    musicRelevance: z.string().describe("How the image relates to the music"),
    suggestedTags: z.array(z.string()).describe("Suggested tags for the image")
  }),
}, async (input) => {
  try {
    // Construct the prompt for Gemini
    const prompt = `
      Analyze this image in the context of the music information provided.
      
      Song Title: ${input.title}
      Description: ${input.description || "None provided"}
      
      Please identify:
      1. The overall mood/emotion conveyed by the image
      2. The key visual elements in the image
      3. How the image might relate to the music (based on title/artist)
      4. Suggest 3-5 tags that could be associated with this image and music
      
      Provide your analysis in a concise, helpful manner.
    `;
    
    // Generate content using Gemini
    const { response } = ai.generateStream({
      model: gemini20Flash,
      prompt: [
        { text: prompt },
        { 
          media: {
            url: input.imageUrl,
            contentType: "image/jpeg"
          }
        }
      ],
      config: {
        temperature: 0.2,
      },
    });

    // Get the response text
    const text = (await response).text;
    
    // Extract insights from the response
    const moodMatch = text.match(/mood\/emotion[^:]*:(.*?)(?=\n\d|\n\n|\n$|$)/i);
    const elementsMatch = text.match(/visual elements[^:]*:(.*?)(?=\n\d|\n\n|\n$|$)/i);
    const relevanceMatch = text.match(/relate to the music[^:]*:(.*?)(?=\n\d|\n\n|\n$|$)/i);
    const tagsMatch = text.match(/tags[^:]*:(.*?)(?=\n\d|\n\n|\n$|$)/i);
    
    // Process extracted data
    const mood = moodMatch ? moodMatch[1].trim() : "Not identified";
    
    const elementsText = elementsMatch ? elementsMatch[1].trim() : "";
    const elements = elementsText
      .split(/[,•-]/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
    
    const musicRelevance = relevanceMatch ? relevanceMatch[1].trim() : "Not identified";
    
    const tagsText = tagsMatch ? tagsMatch[1].trim() : "";
    const suggestedTags = tagsText
      .split(/[,#]/)
      .map(tag => tag.trim().replace(/^#/, ''))
      .filter(tag => tag.length > 0);
    
    return {
      mood,
      elements: elements.length > 0 ? elements : ["Not identified"],
      musicRelevance,
      suggestedTags: suggestedTags.length > 0 ? suggestedTags : ["music", "image"]
    };
  } catch (error) {
    logger.error("Error analyzing image:", error);
    return {
      mood: "Analysis failed",
      elements: ["Error processing image"],
      musicRelevance: "Unable to determine",
      suggestedTags: ["unprocessed"]
    };
  }
});

// Export a callable function for manual analysis
export const analyzeTuneImageManual = onCall({
  region: "us-central1",
  cors: [
    "http://localhost:5173",
    "https://icey-52adb.web.app", 
    "https://icey-52adb.firebaseapp.com"
  ]
}, async (request) => {
  try {
    const { imageUrl, title, artist, description } = request.data;
    
    if (!imageUrl || !title || !artist) {
      throw new Error("Missing required parameters: imageUrl, title, and artist are required");
    }
    
    const result = await analyzeImageFlow({
      imageUrl,
      title,
      description: description || ""
    });
    
    return result;
  } catch (error: any) {
    logger.error("Error in analyzeTuneImageManual function:", error);
    throw new Error(`Failed to analyze image: ${error.message}`);
  }
}); 