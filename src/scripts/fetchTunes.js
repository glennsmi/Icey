// Utility script to fetch tunes from Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Your Firebase configuration from src/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyClo1tBcQHdY92Z7ZQr75VogyCsENboBoc",
  authDomain: "icey-52adb.firebaseapp.com",
  projectId: "icey-52adb",
  storageBucket: "icey-52adb.appspot.com",
  messagingSenderId: "506578843462",
  appId: "1:506578843462:web:93e48e35c0b79fd48e5747",
  measurementId: "G-12NK0Q02G4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Fetch all tunes
async function fetchAllTunes() {
  try {
    const tunesCollection = collection(db, 'tunes');
    const tuneSnapshot = await getDocs(tunesCollection);
    
    console.log(`Found ${tuneSnapshot.size} tunes in Firestore:\n`);
    
    tuneSnapshot.forEach((doc) => {
      const tuneData = doc.data();
      console.log(`Tune ID: ${doc.id}`);
      console.log(`Title: ${tuneData.title}`);
      console.log(`Artist: ${tuneData.artist}`);
      console.log(`User ID: ${tuneData.userId}`);
      console.log(`Image URL: ${tuneData.imageURL}`);
      console.log(`Timestamp: ${tuneData.timestamp?.toDate()}`);
      console.log(`Likes: ${tuneData.likes}`);
      console.log(`Analyzed: ${tuneData.analyzed}`);
      
      if (tuneData.description) {
        console.log(`Description: ${tuneData.description}`);
      }
      
      if (tuneData.analysis) {
        console.log('Analysis:');
        console.log(`  - Mood: ${tuneData.analysis.mood}`);
        console.log(`  - Elements: ${tuneData.analysis.elements?.join(', ')}`);
        console.log(`  - Music Relevance: ${tuneData.analysis.musicRelevance}`);
        
        if (tuneData.analysis.suggestedTags) {
          console.log(`  - Suggested Tags: ${tuneData.analysis.suggestedTags.join(', ')}`);
        }
      }
      
      if (tuneData.tags) {
        console.log(`Tags: ${tuneData.tags.join(', ')}`);
      }
      
      console.log('-----------------------------------');
    });
  } catch (error) {
    console.error('Error fetching tunes:', error);
  }
}

// Run the fetch function
fetchAllTunes(); 