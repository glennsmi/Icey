import { useNavigate, Link } from 'react-router-dom'
import { User } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

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
  likes: number;
  analysis?: TuneAnalysis;
  tags?: string[];
  analyzed?: boolean;
}

interface MyTunesPageProps {
  user: User | null;
}

const MyTunesPage = ({ user }: MyTunesPageProps) => {
  const navigate = useNavigate()
  const [tunes, setTunes] = useState<TuneItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Fetch user's tunes
  useEffect(() => {
    const fetchTunes = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        const tunesRef = collection(db, 'tunes');
        const q = query(
          tunesRef, 
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const tunesList: TuneItem[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          tunesList.push({ id: doc.id, ...data } as TuneItem);
        });
        
        setTunes(tunesList);
      } catch (error) {
        console.error('Error fetching tunes:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTunes();
  }, [user]);

  // Format timestamp safely
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'Unknown date';
    
    try {
      if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString();
      } 
      
      if (timestamp.seconds) {
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleDateString();
      }
      
      return 'Invalid timestamp format';
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Unknown date';
    }
  };

  if (!user) {
    // If no user is logged in, redirect to login page
    navigate('/')
    return null
  }

  return (
    <div className="my-tunes-content">
      <div className="page-header">
        <h1>My Tunes Collection</h1>
        <div className="header-buttons">
          <Link to="/tune-upload" className="action-button">
            <i className="icon">➕</i> Share New Tune
          </Link>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-spinner">Loading your tunes collection...</div>
      ) : tunes.length === 0 ? (
        <div className="empty-collection">
          <p>You haven't shared any tunes yet.</p>
          <Link to="/tune-upload" className="share-tune-button">
            Share Your First Tune
          </Link>
        </div>
      ) : (
        <div className="tunes-grid">
          {tunes.map((tune) => (
            <div className="tune-card" key={tune.id}>
              <div className="tune-image-container">
                <img 
                  src={tune.imageURL} 
                  alt={tune.title} 
                  className="tune-image" 
                />
              </div>
              <div className="tune-info">
                <h3 className="tune-title">{tune.title}</h3>
                <p className="tune-artist">{tune.artist}</p>
                
                {tune.description && (
                  <p className="tune-description">{tune.description}</p>
                )}
                
                {tune.analyzed && tune.analysis && (
                  <div className="tune-analysis">
                    <div className="analysis-item">
                      <span className="analysis-label">Mood:</span>
                      <span className="analysis-value">{tune.analysis.mood || 'Unknown'}</span>
                    </div>
                    
                    <div className="analysis-item">
                      <span className="analysis-label">Elements:</span>
                      <span className="analysis-value">
                        {tune.analysis.elements && Array.isArray(tune.analysis.elements) 
                          ? tune.analysis.elements.join(', ') 
                          : 'None'}
                      </span>
                    </div>
                    
                    {tune.tags && tune.tags.length > 0 && (
                      <div className="tune-tags">
                        {tune.tags.map((tag, index) => (
                          <span key={index} className="tune-tag">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {tune.analyzed === false && (
                  <p className="analyzing-message">AI is analyzing this image...</p>
                )}
                
                <div className="tune-meta">
                  <span className="tune-date">
                    {formatTimestamp(tune.timestamp)}
                  </span>
                  <span className="tune-likes">❤️ {tune.likes}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MyTunesPage 