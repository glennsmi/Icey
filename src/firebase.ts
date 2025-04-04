// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// Replace these with your actual Firebase project config
const firebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSyClo1tBcQHdY92Z7ZQr75VogyCsENboBoc",
  authDomain: "icey-52adb.firebaseapp.com",
  projectId: "icey-52adb",
  storageBucket: "icey-52adb.firebasestorage.app",
  messagingSenderId: "506578843462",
  appId: "1:506578843462:web:93e48e35c0b79fd48e5747",
  measurementId: "G-12NK0Q02G4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Create and configure Google provider
export const googleProvider = new GoogleAuthProvider();
// Add scopes for profile info
googleProvider.addScope('profile');
googleProvider.addScope('email');
// Set custom parameters
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default app; 