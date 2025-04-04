// Utility script to fetch tunes from Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, Timestamp } from 'firebase/firestore';

// Define types for Tune data
interface TuneAnalysis {
  mood: string;
  elements: string[];
  musicRelevance: string;
  suggestedTags: string[];
}

interface TuneData {
  id?: string;
  title: string;
  artist: string;
  description?: string;
  imageURL: string;
  timestamp: Timestamp | any; // Make timestamp more flexible
  userName: string;
  userPhotoURL?: string;
  userId: string;
  likes: number;
  analysis?: TuneAnalysis;
  tags?: string[];
  analyzed: boolean;
}

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Format timestamp safely
function formatTimestamp(timestamp: any): string {
  if (!timestamp) return 'No timestamp';
  
  try {
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toString();
    } 
    
    if (timestamp.seconds && timestamp.nanoseconds) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toString();
    }
    
    return 'Invalid timestamp format';
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Error formatting timestamp';
  }
}

// Fetch all tunes
async function fetchAllTunes(): Promise<void> {
  try {
    const tunesCollection = collection(db, 'tunes');
    const tuneSnapshot = await getDocs(tunesCollection);
    
    console.log(`Found ${tuneSnapshot.size} tunes in Firestore:\n`);
    
    tuneSnapshot.forEach((doc) => {
      try {
        const tuneData = doc.data() as TuneData;
        console.log(`Tune ID: ${doc.id}`);
        console.log(`Title: ${tuneData.title || 'No title'}`);
        console.log(`Artist: ${tuneData.artist || 'No artist'}`);
        console.log(`User ID: ${tuneData.userId || 'No user ID'}`);
        console.log(`User Name: ${tuneData.userName || 'No user name'}`);
        console.log(`Image URL: ${tuneData.imageURL || 'No image URL'}`);
        console.log(`Timestamp: ${formatTimestamp(tuneData.timestamp)}`);
        console.log(`Likes: ${tuneData.likes !== undefined ? tuneData.likes : 'No likes data'}`);
        console.log(`Analyzed: ${tuneData.analyzed !== undefined ? tuneData.analyzed : 'Not analyzed'}`);
        
        if (tuneData.description) {
          console.log(`Description: ${tuneData.description}`);
        }
        
        if (tuneData.analysis) {
          console.log('Analysis:');
          console.log(`  - Mood: ${tuneData.analysis.mood || 'No mood'}`);
          
          if (tuneData.analysis.elements && Array.isArray(tuneData.analysis.elements)) {
            console.log(`  - Elements: ${tuneData.analysis.elements.join(', ')}`);
          } else {
            console.log('  - Elements: None');
          }
          
          console.log(`  - Music Relevance: ${tuneData.analysis.musicRelevance || 'No data'}`);
          
          if (tuneData.analysis.suggestedTags && Array.isArray(tuneData.analysis.suggestedTags)) {
            console.log(`  - Suggested Tags: ${tuneData.analysis.suggestedTags.join(', ')}`);
          }
        }
        
        if (tuneData.tags && Array.isArray(tuneData.tags)) {
          console.log(`Tags: ${tuneData.tags.join(', ')}`);
        }
      } catch (docError) {
        console.error(`Error processing document ${doc.id}:`, docError);
      }
      
      console.log('-----------------------------------');
    });
  } catch (error) {
    console.error('Error fetching tunes:', error);
  }
}

// Run the fetch function
fetchAllTunes().then(() => {
  console.log('Fetch complete');
}).catch(error => {
  console.error('Fatal error:', error);
}); 