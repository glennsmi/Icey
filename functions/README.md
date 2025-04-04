# Tunegram AI Image Analysis

This Firebase Cloud Function uses Google's Gemini 2.0 Flash model to analyze images uploaded to your Tunegram app. When a user uploads an image with tune information, the AI will:

1. Analyze the mood and visual elements of the image
2. Connect those visual elements to the music information
3. Generate tags related to both the image and music
4. Store the analysis back in Firestore

## Setup Instructions

### 1. Get a Google AI API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the API key to use in the next step

### 2. Set up the Secret in Firebase

```bash
# Install Firebase CLI if you haven't already
npm install -g firebase-tools

# Login to Firebase
firebase login

# Add the secret to your project
firebase functions:secrets:set GOOGLE_GENAI_API_KEY
# When prompted, paste your API key
```

### 3. Install Dependencies and Deploy

```bash
# Navigate to the functions directory
cd functions

# Install dependencies
npm install

# Build the functions
npm run build

# Deploy the functions
npm run deploy
```

## How It Works

1. When a user uploads an image through the TuneUploadPage, it's stored in Firebase Storage
2. The `analyzeTuneImage` function is triggered by the Cloud Storage finalized event
3. The function retrieves the corresponding tune data from Firestore
4. It sends the image and tune information to Gemini 2.0 Flash for analysis
5. The analysis results are stored back in the Firestore document

## Viewing the Analysis

The dashboard displays each tune with its AI-generated analysis, including:
- Mood of the image
- Generated tags
- A "processing" indicator for images not yet analyzed

## Troubleshooting

If the AI analysis isn't working:

1. Check the Firebase Functions logs for errors
2. Verify that your API key is correctly set up
3. Make sure you have billing enabled for the Firebase project
4. Confirm that the Firestore and Storage security rules allow the function to read/write

## Testing the Function Manually

You can also test the function manually by calling the `analyzeTuneImageManual` function directly:

```javascript
// From your frontend code
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();
const analyzeImage = httpsCallable(functions, 'analyzeTuneImageManual');

// Call with an image URL and tune information
analyzeImage({
  imageUrl: "https://example.com/your-image.jpg",
  title: "Song Title",
  artist: "Artist Name",
  description: "Optional description"
})
.then((result) => {
  console.log("Analysis result:", result.data);
})
.catch((error) => {
  console.error("Error analyzing image:", error);
});
``` 