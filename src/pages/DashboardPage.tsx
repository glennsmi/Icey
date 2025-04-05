import { useNavigate, Link } from 'react-router-dom'
import { auth, db, functions } from '../firebase'
import { signOut, User } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, limit, getDocs, updateDoc, doc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { analyzeTuneImageDirectly } from '../utils/genkitAnalysis'

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
  imageURL: string;
  description?: string;
  userId: string;
  timestamp: any;
  analysis?: TuneAnalysis;
  analyzed?: boolean;
  tags?: string[];
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
  const [analyzing, setAnalyzing] = useState<boolean>(false)
  const [selectedTune, setSelectedTune] = useState<TuneItem | null>(null)
  const [analysisResult, setAnalysisResult] = useState<TuneAnalysis | null>(null)
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)

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

  // Initialize the user profile image or initials
  useEffect(() => {
    if (user) {
      if (user.photoURL) {
        setPhotoURL(user.photoURL);
      } else if (user.displayName) {
        const initials = user.displayName.charAt(0).toUpperCase();
        setInitial(initials);
      } else if (user.email) {
        const initials = user.email.charAt(0).toUpperCase();
        setInitial(initials);
      }
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleAnalyzeImage = async (tune: TuneItem) => {
    try {
      setAnalyzing(true);
      setSelectedTune(tune);
      setDialogOpen(true);
      
      let analysisData: TuneAnalysis;
      
      try {
        // Try to use direct Gemini API first
        analysisData = await analyzeTuneImageDirectly(
          tune.imageURL,
          tune.title,
          tune.artist,
          tune.description || ''
        );
        
        console.log('Direct Gemini analysis successful:', analysisData);
      } catch (directError) {
        console.warn('Direct Gemini API failed, falling back to Firebase function:', directError);
        
        // Fall back to Firebase function if direct API fails
        const analyzeTuneImageManual = httpsCallable(functions, 'analyzeTuneImageManual');
        const result = await analyzeTuneImageManual({
          imageUrl: tune.imageURL,
          title: tune.title,
          artist: tune.artist,
          description: tune.description || ''
        });
        
        // Extract analysis data from function result
        analysisData = result.data as TuneAnalysis;
      }
      
      // Update the analysis result
      setAnalysisResult(analysisData);
      
      // Optionally update the document in Firestore
      if (user) {
        try {
          const tuneRef = doc(db, 'tunes', tune.id);
          await updateDoc(tuneRef, {
            analysis: analysisData,
            analyzed: true
          });
          
          // Update local state
          setTunes(prevTunes => 
            prevTunes.map(t => 
              t.id === tune.id 
                ? { ...t, analysis: analysisData, analyzed: true } 
                : t
            )
          );
        } catch (updateError) {
          console.error('Error updating tune with analysis result:', updateError);
        }
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  // Handle edge case when user is null
  if (!user) {
    navigate('/login');
    return null;
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
                    
                    <Button 
                      className="analyze-button"
                      onClick={() => handleAnalyzeImage(tune)}
                      disabled={analyzing && selectedTune?.id === tune.id}
                    >
                      {analyzing && selectedTune?.id === tune.id 
                        ? "Analyzing..." 
                        : "Analyze Image"}
                    </Button>
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
      
      {/* Analysis Result Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Image Analysis</DialogTitle>
            <DialogDescription>
              {selectedTune && `Analysis for "${selectedTune.title}" by ${selectedTune.artist}`}
            </DialogDescription>
          </DialogHeader>
          
          {analyzing ? (
            <div className="dialog-loading">Analyzing image...</div>
          ) : analysisResult ? (
            <div className="analysis-results">
              <div className="analysis-result-item">
                <h4>Mood</h4>
                <p>{analysisResult.mood}</p>
              </div>
              
              <div className="analysis-result-item">
                <h4>Elements</h4>
                <ul>
                  {analysisResult.elements.map((element, index) => (
                    <li key={index}>{element}</li>
                  ))}
                </ul>
              </div>
              
              <div className="analysis-result-item">
                <h4>Music Relevance</h4>
                <p>{analysisResult.musicRelevance}</p>
              </div>
              
              <div className="analysis-result-item">
                <h4>Suggested Tags</h4>
                <div className="tags-container">
                  {analysisResult.suggestedTags.map((tag, index) => (
                    <span key={index} className="analysis-tag">#{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="dialog-error">Failed to analyze image. Please try again.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DashboardPage 