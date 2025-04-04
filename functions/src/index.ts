/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Import our simple test function
export { helloWorld } from './simpleTest';

// Import our image analysis function (commented out for now)
// export { analyzeTuneImage } from './imageAnalysis';
// export { analyzeTuneImageManual } from './imageAnalysis';
// Optional: If you want to use the genkit sample as well
// export { menuSuggestion } from './genkit-sample';

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
