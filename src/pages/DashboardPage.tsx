import { useNavigate, Link } from 'react-router-dom'
import { auth, db } from '../firebase'
import { signOut, User } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'

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

interface DashboardProps {
  user: User | null;
}

const DashboardPage = ({ user }: DashboardProps) => {
  const navigate = useNavigate()
  const [initial, setInitial] = useState<string>('U')
  const [imageError, setImageError] = useState<boolean>(false)
  const [photoURL, setPhotoURL] = useState<string>('')
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
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        
        const querySnapshot = await getDocs(q);
        const tunesList: TuneItem[] = [];
        
        querySnapshot.forEach((doc) => {
          tunesList.push({ id: doc.id, ...doc.data() } as TuneItem);
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

  useEffect(() => {
    if (!user) return;
    
    // Set initial for avatar placeholder
    if (user.email && user.email.length > 0) {
      setInitial(user.email.charAt(0).toUpperCase())
    }
    
    // Process and set photoURL
    if (user.photoURL) {
      let url = user.photoURL;
      
      // Handle special Google photo URLs
      if (url.includes('googleusercontent.com')) {
        // Remove size restrictions to get full-size image
        url = url.replace(/=s\d+-c/, '=s400-c');
      }
      
      // Ensure URL uses HTTPS
      if (url.startsWith('http:')) {
        url = 'https:' + url.substring(5);
      }
      
      setPhotoURL(url);
      setImageError(false);
      
      console.log('Using profile photo URL:', url);
    }
    
    // Log user information for debugging
    console.log('User data:', {
      displayName: user.displayName,
      email: user.email,
      providerId: user.providerId,
      photoURL: user.photoURL,
      uid: user.uid
    });
  }, [user])

  if (!user) {
    // If no user is logged in, redirect to login page
    navigate('/')
    return null
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/')
    } catch (error) {
      console.error("Error logging out:", error instanceof Error ? error.message : String(error))
    }
  }

  const handleImageError = () => {
    console.error('Image failed to load:', photoURL);
    setImageError(true)
  }

  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h1>Welcome, {user.displayName || user.email?.split('@')[0] || 'User'}</h1>
        <p>Check out your tune collection below</p>
      </div>
      
      {/* Recent Tunes Gallery */}
      <div className="tunes-section">
        <div className="section-header">
          <h2>Your Tunes Collection</h2>
          <Link to="/tune-upload" className="action-button">
            <i className="icon">➕</i> Share New Tune
          </Link>
        </div>
        
        {loading ? (
          <div className="loading-spinner">Loading your tunes...</div>
        ) : tunes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-content">
              <h3>No tunes yet</h3>
              <p>You haven't shared any tunes yet. Start by uploading your first tune!</p>
              <Link to="/tune-upload" className="action-button">
                <i className="icon">➕</i> Share Your First Tune
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="dashboard-tunes-grid">
              {tunes.map((tune) => (
                <div className="dashboard-tune-card" key={tune.id}>
                  <div className="tune-image-container">
                    <img 
                      src={tune.imageURL} 
                      alt={tune.title} 
                      className="tune-image" 
                    />
                  </div>
                  <div className="tune-info">
                    <h4>{tune.title}</h4>
                    <p className="tune-artist">{tune.artist}</p>
                    
                    {tune.analyzed && tune.analysis && (
                      <div className="tune-analysis">
                        <div className="analysis-item">
                          <span className="analysis-label">Mood:</span>
                          <span className="analysis-value">{tune.analysis.mood}</span>
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
                  </div>
                </div>
              ))}
            </div>
            
            {tunes.length > 0 && (
              <div className="view-all-container">
                <button 
                  className="view-all-button"
                  onClick={() => navigate('/my-tunes')}
                >
                  View All Tunes
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default DashboardPage 