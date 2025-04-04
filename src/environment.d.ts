/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: "AIzaSyCYTMaICFcq8I_LXDmJBrE6Sjh1DCfbEKo";
  // Add other environment variables as needed
  readonly VITE_FIREBASE_API_KEY: "AIzaSyClo1tBcQHdY92Z7ZQr75VogyCsENboBoc";
  readonly VITE_FIREBASE_AUTH_DOMAIN: "icey-52adb.firebaseapp.com";
  readonly VITE_FIREBASE_PROJECT_ID: "icey-52adb";
  readonly VITE_FIREBASE_STORAGE_BUCKET: "icey-52adb.firebasestorage.app";
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: "506578843462";
  readonly VITE_FIREBASE_APP_ID: "1:506578843462:web:93e48e35c0b79fd48e5747";
  readonly VITE_FIREBASE_MEASUREMENT_ID: "G-12NK0Q02G4";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 