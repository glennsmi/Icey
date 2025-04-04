import * as functions from "firebase-functions";

// A simple HTTP function using the legacy v1 API
export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase Functions!");
}); 