import { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface TuneAnalysis {
  mood: string;
  elements: string[];
  musicRelevance: string;
  suggestedTags: string[];
}

interface TuneItem {
  id: string;
  title: string;
  artist: string;
  description?: string;
  imageURL: string;
  timestamp: any;
  userName: string;
  userPhotoURL?: string;
  userId: string;
  likes: number;
  analysis?: TuneAnalysis;
  tags?: string[];
  analyzed: boolean;
}

const TuneDataViewer = () => {
  const [tunes, setTunes] = useState<TuneItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchTunes = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const tunesCollection = collection(db, 'tunes');
        const tuneSnapshot = await getDocs(tunesCollection);
        
        const tunesList: TuneItem[] = [];
        
        tuneSnapshot.forEach((doc) => {
          tunesList.push({ id: doc.id, ...doc.data() } as TuneItem);
        });
        
        setTunes(tunesList);
      } catch (error) {
        console.error('Error fetching tunes:', error);
        setError('Failed to fetch tunes data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTunes();
  }, []);
  
  // Format timestamp safely
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'No timestamp';
    
    try {
      if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleString();
      } 
      
      if (timestamp.seconds) {
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleString();
      }
      
      return 'Invalid timestamp format';
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Error formatting timestamp';
    }
  };

  if (loading) {
    return <div>Loading tune data...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (tunes.length === 0) {
    return <div>No tunes found in the database.</div>;
  }

  return (
    <div className="tune-data-viewer">
      <h2>Firestore Tunes Data</h2>
      <p>Found {tunes.length} tunes in the database.</p>
      
      <div className="current-user-info">
        <h3>Current User Information</h3>
        <p><strong>User ID:</strong> {currentUser?.uid || 'Not logged in'}</p>
        <p><strong>Email:</strong> {currentUser?.email || 'No email'}</p>
        <p><strong>Display Name:</strong> {currentUser?.displayName || 'No display name'}</p>
      </div>
      
      <div className="tune-data-list">
        {tunes.map((tune) => (
          <div key={tune.id} className="tune-data-item">
            <h3>{tune.title}</h3>
            <div className="tune-data-grid">
              <div className="data-label">ID:</div>
              <div className="data-value">{tune.id}</div>
              
              <div className="data-label">Artist:</div>
              <div className="data-value">{tune.artist}</div>
              
              <div className="data-label">User ID:</div>
              <div className="data-value">{tune.userId}</div>
              
              <div className="data-label">User Name:</div>
              <div className="data-value">{tune.userName}</div>
              
              <div className="data-label">Timestamp:</div>
              <div className="data-value">{formatTimestamp(tune.timestamp)}</div>
              
              <div className="data-label">Likes:</div>
              <div className="data-value">{tune.likes}</div>
              
              <div className="data-label">Analyzed:</div>
              <div className="data-value">{tune.analyzed ? 'Yes' : 'No'}</div>
              
              {tune.description && (
                <>
                  <div className="data-label">Description:</div>
                  <div className="data-value">{tune.description}</div>
                </>
              )}
              
              {tune.analysis && (
                <>
                  <div className="data-label">Analysis:</div>
                  <div className="data-value">
                    <div>Mood: {tune.analysis.mood}</div>
                    {tune.analysis.elements && (
                      <div>Elements: {tune.analysis.elements.join(', ')}</div>
                    )}
                    <div>Music Relevance: {tune.analysis.musicRelevance}</div>
                    {tune.analysis.suggestedTags && (
                      <div>Suggested Tags: {tune.analysis.suggestedTags.join(', ')}</div>
                    )}
                  </div>
                </>
              )}
              
              {tune.tags && tune.tags.length > 0 && (
                <>
                  <div className="data-label">Tags:</div>
                  <div className="data-value">{tune.tags.join(', ')}</div>
                </>
              )}
            </div>
            
            <div className="tune-image">
              <h4>Image URL:</h4>
              <div className="image-url-display">{tune.imageURL}</div>
              <img 
                src={tune.imageURL} 
                alt={tune.title} 
                className="tune-thumbnail" 
              />
            </div>
            
            <hr />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TuneDataViewer; 