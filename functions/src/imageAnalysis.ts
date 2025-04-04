// Import Firebase functions and admin SDK
import * as admin from "firebase-admin";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { onCallGenkit } from "firebase-functions/https";
import { genkit, z } from "genkit";
import { googleAI, gemini20Flash } from "@genkit-ai/googleai";

// Define the Google API key secret
const apiKey = defineSecret("GOOGLE_GENAI_API_KEY");

// Initialize the Genkit AI with Google AI plugin
const ai = genkit({
  plugins: [googleAI()],
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
    artist: z.string().describe("Artist name"),
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
      Artist: ${input.artist}
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

// Create a Cloud Function triggered when an image is uploaded to the tune_images folder
export const analyzeTuneImage = onObjectFinalized({
  secrets: [apiKey],
  region: "us-central1",
  maxInstances: 10,
}, async (event) => {
  // Check if the uploaded file is in the tune_images folder
  if (!event.data.name.startsWith("tune_images/")) {
    logger.info(`Skipping analysis for ${event.data.name} as it's not in tune_images folder`);
    return;
  }

  try {
    // Get the file details
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType || "";

    // Verify it's an image
    if (!contentType.startsWith("image/")) {
      logger.info(`File ${filePath} is not an image (${contentType}), skipping analysis`);
      return;
    }

    // Extract the user ID and tune ID from the path structure
    // Expected format: tune_images/{userId}/{timestamp}_{originalFilename}
    const pathParts = filePath.split("/");
    if (pathParts.length < 3) {
      logger.error(`Invalid file path structure: ${filePath}`);
      return;
    }
    
    const userId = pathParts[1];
    // We don't need the timestamp but we extract it from the filename for log purposes
    // const timestamp = fileNameParts[0];

    // Generate a signed URL for the image (expires in 30 minutes)
    const bucket = admin.storage().bucket(fileBucket);
    const file = bucket.file(filePath);
    
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 30 * 60 * 1000, // 30 minutes
    });

    // Find the corresponding Firestore document
    const tunesRef = admin.firestore().collection("tunes");
    const querySnapshot = await tunesRef
      .where("userId", "==", userId)
      .where("imageURL", "!=", null)
      .orderBy("imageURL")
      .orderBy("timestamp", "desc")
      .limit(5)
      .get();

    // Find the document that matches our uploaded image
    let tuneDoc: {
      id: string;
      title?: string;
      artist?: string;
      description?: string;
      imageURL?: string;
      [key: string]: any;
    } | null = null;
    
    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      if (data.imageURL && data.imageURL.includes(filePath)) {
        tuneDoc = { id: doc.id, ...data };
        break;
      }
    }

    if (!tuneDoc) {
      logger.error(`Could not find Firestore document for image: ${filePath}`);
      return;
    }

    // Call the analysis function
    const analysisResult = await analyzeImageFlow({
      imageUrl: signedUrl,
      title: tuneDoc.title || "Unknown",
      artist: tuneDoc.artist || "Unknown",
      description: tuneDoc.description || ""
    });

    // Update the Firestore document with the analysis results
    await tunesRef.doc(tuneDoc.id).update({
      analysis: analysisResult,
      tags: analysisResult.suggestedTags,
      analyzed: true,
      analyzedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info(`Successfully analyzed image ${filePath} and updated Firestore`);
  } catch (error) {
    logger.error("Error in analyzeTuneImage function:", error);
  }
});

// Export a callable function for manual analysis
export const analyzeTuneImageManual = onCallGenkit({
  secrets: [apiKey],
}, analyzeImageFlow); 