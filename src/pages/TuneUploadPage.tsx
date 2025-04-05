import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User } from 'firebase/auth'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { storage, db } from '../firebase'
import { analyzeImageWithGemini } from '../utils/geminiAnalysis'
import cartesiaService from '../utils/cartesiaService'

interface TuneUploadPageProps {
  user: User | null;
}

// New interface to include analysis data
interface GeminiAnalysis {
  description: string;
  madLib: {
    sentence: string;
    blank: string;
    original: string;
  };
}

// Sample funny genre names that will be dynamically generated later based on image analysis
const sampleGenres = [
  "Beach Party Rap",
  "Cat Disco Fever",
  "Office Cubicle Metal",
  "Birthday Cake Reggae",
  "Hiking Trail Ballad",
  "Coffee Shop Jazz",
  "Selfie Pop Rock",
  "Pet Portrait Blues",
  "Food Plate Funk"
];

const TuneUploadPage = ({ user }: TuneUploadPageProps) => {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('')
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)
  const [isGeneratingSong, setIsGeneratingSong] = useState<boolean>(false)
  const [email, setEmail] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [showPremiumFeatures, setShowPremiumFeatures] = useState<boolean>(false)
  
  // Mad Libs inputs
  const [madLibs, setMadLibs] = useState({
    adjective1: '',
    noun1: '',
    verbIng: '',
    emotion: '',
    place: '',
    adjective2: '',
    celebrity: '',
    animalPlural: '',
    sillyWord: '',
    exclamation: ''
  })
  
  // Generated genres based on image (simulated for now)
  const [generatedGenres, setGeneratedGenres] = useState<string[]>([])
  const [selectedGenre, setSelectedGenre] = useState<string>('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Simulate genre generation after image analysis
  useEffect(() => {
    if (isAnalyzing && uploadedImageUrl) {
      const timer = setTimeout(() => {
        // In a real implementation, these would be generated based on image analysis
        const randomGenres = [...sampleGenres].sort(() => 0.5 - Math.random()).slice(0, 3);
        setGeneratedGenres(randomGenres);
        setIsAnalyzing(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isAnalyzing, uploadedImageUrl]);
  
  // Simulate song generation process
  useEffect(() => {
    if (isGeneratingSong) {
      const timer = setTimeout(() => {
        setIsGeneratingSong(false);
        setCurrentStep(4); // Move to result step
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isGeneratingSong]);
  
  // Add useEffect to initialize audio context
  useEffect(() => {
    // Initialize audio context on component mount
    // This is necessary for iOS Safari and other browsers that require user interaction
    const initAudio = () => {
      // Create and immediately discard an audio context to prompt browser to allow audio
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      try {
        const audioContext = new AudioContext();
        // Suspend it immediately to save resources
        audioContext.suspend();
        console.log('Audio context initialized for TuneUploadPage');
      } catch (error) {
        console.error('Failed to initialize audio context:', error);
      }
    };

    // Initialize audio on component mount
    initAudio();
    
    // Add event listeners to ensure audio works after user interaction
    const handleUserInteraction = () => {
      initAudio();
      // Remove the event listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
    
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    
    // Clean up event listeners on component unmount
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setError('')
    
    if (!file) {
      setSelectedFile(null)
      setImagePreview('')
      return
    }
    
    // Check if file is an image
    if (!file.type.match('image.*')) {
      setError('Please select an image file (JPG, PNG, etc.)')
      setSelectedFile(null)
      setImagePreview('')
      return
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      setSelectedFile(null)
      setImagePreview('')
      return
    }
    
    setSelectedFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }
  
  const handleMadLibChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMadLibs(prev => ({
      ...prev,
      [name]: value
    }));
  }
  
  const handleGenreSelect = (genre: string) => {
    setSelectedGenre(genre);
  }
  
  const handleUploadImage = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setError('');
    
    try {
      // Create a unique ID for anonymous uploads
      const anonymousId = 'anon_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
      const userId = user ? user.uid : anonymousId;
      
      // Create a reference to the storage location
      const storageRef = ref(storage, `photos/${userId}/${Date.now()}_${selectedFile.name}`);
      
      // Upload the file
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Observe state change events such as progress
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          // Handle unsuccessful uploads
          console.error('Upload error:', error);
          setError('Failed to upload image. Please try again.');
          setIsUploading(false);
        },
        async () => {
          // Handle successful upload
          try {
            // Get the download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            setUploadedImageUrl(downloadURL);
            setIsUploading(false);
            setCurrentStep(2);
            setIsAnalyzing(true);
            
          } catch (error) {
            console.error('Error getting download URL:', error);
            setError('Failed to process image. Please try again.');
            setIsUploading(false);
          }
        }
      );
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload image. Please try again.');
      setIsUploading(false);
    }
  }
  
  const handleGenerateSong = async () => {
    if (!uploadedImageUrl || !selectedGenre) {
      setError('Missing required information');
      return;
    }
    
    // Check if all Mad Libs fields are filled
    const madLibsComplete = Object.values(madLibs).every(val => val.trim() !== '');
    if (!madLibsComplete) {
      setError('Please fill in all the blanks in the Mad Libs section');
      return;
    }
    
    // Play Rob's Scottish phrase before generating the song
    try {
      await cartesiaService.speakRobSignaturePhrase();
    } catch (error) {
      console.error("Error playing Rob's Scottish phrase:", error);
      // Continue with song generation even if voice fails
    }
    
    setIsGeneratingSong(true);
    setError('');
    
    try {
      // Create a unique ID for anonymous uploads
      const anonymousId = 'anon_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
      const userId = user ? user.uid : anonymousId;
      
      // In a real implementation, this would call your AI service to generate the song
      // For now, we'll just save the data to Firestore
      await addDoc(collection(db, 'tune_requests'), {
        imageUrl: uploadedImageUrl,
        madLibs: madLibs,
        genre: selectedGenre,
        userId: userId,
        userDisplayName: user ? (user.displayName || 'Unknown User') : 'Anonymous',
        userPhotoURL: user ? user.photoURL : null,
        status: 'generating',
        createdAt: serverTimestamp()
      });
      
    } catch (error) {
      console.error('Error creating tune request:', error);
      setError('Failed to create tune request. Please try again.');
      setIsGeneratingSong(false);
    }
  }
  
  const handleSaveAndShare = async () => {
    if (!email.trim()) {
      setError('Please enter your email address to save your song');
      return;
    }
    
    try {
      // Create a unique ID for anonymous uploads
      const anonymousId = 'anon_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
      const userId = user ? user.uid : anonymousId;
      
      // In a real implementation, this would save email with the song
      await addDoc(collection(db, 'email_subscriptions'), {
        email: email,
        userId: userId,
        createdAt: serverTimestamp()
      });
      
      setSuccess('Your hilarious song has been saved! Check your email for the shareable link.');
      setShowPremiumFeatures(true);
      
    } catch (error) {
      console.error('Error saving email:', error);
      setError('Failed to save your information. Please try again.');
    }
  }
  
  const handleUnlockPremium = () => {
    // In a real implementation, this would redirect to a payment page
    // For now, just show a message
    window.alert('This would redirect to a payment page in the real implementation.');
  }
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Photo Upload
        return (
          <div className="upload-step">
            <div className="step-rob-image">
              <img src="/images/rob1.png" alt="Rob the Taxi Driver" className="rob-image" />
            </div>
            
            <h2>Step 1: Upload a Photo</h2>
            <p>Choose a fun photo to transform into a hilarious song</p>
            
            {imagePreview && (
              <div className="image-preview-container">
                <img src={imagePreview} alt="Preview" className="image-preview" />
              </div>
            )}
            
            <div className="file-input-container">
              <label htmlFor="file-upload" className="file-input-label">
                {selectedFile ? 'Change Photo' : 'Select Photo'}
              </label>
              <input 
                id="file-upload"
                type="file" 
                accept="image/*"
                onChange={handleFileChange}
                className="file-input"
                ref={fileInputRef}
                disabled={isUploading}
              />
              
              {selectedFile && (
                <div className="selected-file">
                  Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </div>
              )}
            </div>
            
            <button 
              className="upload-button"
              onClick={handleUploadImage}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Continue'}
            </button>
            
            {isUploading && (
              <div className="progress-container">
                <div 
                  className="progress-bar" 
                  style={{ width: `${uploadProgress}%` }}
                />
                <div className="progress-text">{Math.round(uploadProgress)}%</div>
              </div>
            )}
          </div>
        );
        
      case 2: // Mad Libs
        return (
          <div className="mad-libs-step">
            <div className="step-rob-image">
              <img src="/images/rob2.png" alt="Rob the Taxi Driver" className="rob-image" />
            </div>
            
            <h2>Step 2: Fill in the Blanks</h2>
            <p>Help us create hilarious lyrics by completing this Mad Libs-style form</p>
            
            {isAnalyzing ? (
              <div className="analyzing-container">
                <div className="analyzing-spinner"></div>
                <p>Analyzing your photo to create personalized prompts...</p>
              </div>
            ) : (
              <>
                <div className="image-small-preview">
                  <img src={imagePreview} alt="Your photo" />
                </div>
                
                <div className="mad-libs-form">
                  <div className="mad-libs-intro">
                    Our AI has analyzed your photo and created this custom story template.
                    Fill in the blanks to create your unique song lyrics!
                  </div>
                  
                  <div className="mad-libs-container">
                    <div className="mad-lib-row">
                      <label>A funny adjective:</label>
                      <input 
                        type="text" 
                        name="adjective1" 
                        value={madLibs.adjective1}
                        onChange={handleMadLibChange}
                        placeholder="e.g. squishy"
                      />
                    </div>
                    
                    <div className="mad-lib-row">
                      <label>A random noun:</label>
                      <input 
                        type="text" 
                        name="noun1" 
                        value={madLibs.noun1}
                        onChange={handleMadLibChange}
                        placeholder="e.g. banana"
                      />
                    </div>
                    
                    <div className="mad-lib-row">
                      <label>An action ending in 'ing':</label>
                      <input 
                        type="text" 
                        name="verbIng" 
                        value={madLibs.verbIng}
                        onChange={handleMadLibChange}
                        placeholder="e.g. dancing"
                      />
                    </div>
                    
                    <div className="mad-lib-row">
                      <label>An emotion:</label>
                      <input 
                        type="text" 
                        name="emotion" 
                        value={madLibs.emotion}
                        onChange={handleMadLibChange}
                        placeholder="e.g. ecstatic"
                      />
                    </div>
                    
                    <div className="mad-lib-row">
                      <label>A place:</label>
                      <input 
                        type="text" 
                        name="place" 
                        value={madLibs.place}
                        onChange={handleMadLibChange}
                        placeholder="e.g. Mars"
                      />
                    </div>
                    
                    <div className="mad-lib-row">
                      <label>Another adjective:</label>
                      <input 
                        type="text" 
                        name="adjective2" 
                        value={madLibs.adjective2}
                        onChange={handleMadLibChange}
                        placeholder="e.g. sparkly"
                      />
                    </div>
                    
                    <div className="mad-lib-row">
                      <label>A celebrity name:</label>
                      <input 
                        type="text" 
                        name="celebrity" 
                        value={madLibs.celebrity}
                        onChange={handleMadLibChange}
                        placeholder="e.g. Brad Pitt"
                      />
                    </div>
                    
                    <div className="mad-lib-row">
                      <label>Animals (plural):</label>
                      <input 
                        type="text" 
                        name="animalPlural" 
                        value={madLibs.animalPlural}
                        onChange={handleMadLibChange}
                        placeholder="e.g. penguins"
                      />
                    </div>
                    
                    <div className="mad-lib-row">
                      <label>A made-up silly word:</label>
                      <input 
                        type="text" 
                        name="sillyWord" 
                        value={madLibs.sillyWord}
                        onChange={handleMadLibChange}
                        placeholder="e.g. flibbertigibbet"
                      />
                    </div>
                    
                    <div className="mad-lib-row">
                      <label>An exclamation:</label>
                      <input 
                        type="text" 
                        name="exclamation" 
                        value={madLibs.exclamation}
                        onChange={handleMadLibChange}
                        placeholder="e.g. Holy moly!"
                      />
                    </div>
                  </div>
                  
                  <div className="preview-example">
                    <h4>Preview snippet:</h4>
                    <p className="preview-text">
                      {madLibs.adjective1 ? `"${madLibs.adjective1} ${madLibs.noun1 || '_____'} ${madLibs.verbIng || '_____'} with ${madLibs.emotion || '_____'} at the ${madLibs.place || '_____'}..."` : 'Fill in the blanks to see a preview of your lyrics!'}
                    </p>
                  </div>
                  
                  <div className="form-buttons">
                    <button 
                      className="back-button"
                      onClick={() => setCurrentStep(1)}
                    >
                      Back
                    </button>
                    <button 
                      className="next-button"
                      onClick={() => {
                        const allFilled = Object.values(madLibs).every(val => val.trim() !== '');
                        if (allFilled) {
                          setCurrentStep(3);
                        } else {
                          setError('Please fill in all the blanks');
                        }
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        );
        
      case 3: // Genre Selection
        return (
          <div className="genre-selection-step">
            <div className="step-rob-image">
              <img src="/images/rob3.png" alt="Rob the Taxi Driver" className="rob-image" />
            </div>
            
            <h2>Step 3: Choose a Music Genre</h2>
            <p>Select one of these AI-generated genre suggestions for your song</p>
            
            <div className="image-small-preview">
              <img src={imagePreview} alt="Your photo" />
            </div>
            
            <div className="genres-container">
              {generatedGenres.map((genre, index) => (
                <div 
                  key={index}
                  className={`genre-card ${selectedGenre === genre ? 'selected' : ''}`}
                  onClick={() => handleGenreSelect(genre)}
                >
                  <div className="genre-icon">🎵</div>
                  <h3>{genre}</h3>
                  <div className="genre-description">
                    A unique blend of sounds that will perfectly match your photo
                  </div>
                  <div className="genre-badge">AI-Generated</div>
                </div>
              ))}
            </div>
            
            <div className="form-buttons">
              <button 
                className="back-button"
                onClick={() => setCurrentStep(2)}
              >
                Back
              </button>
              <button 
                className="create-button"
                disabled={!selectedGenre || isGeneratingSong}
                onClick={handleGenerateSong}
              >
                {isGeneratingSong ? 'Creating...' : 'Create My Hilarious Song!'}
              </button>
            </div>
          </div>
        );
        
      case 4: // Result & Email Collection (only at the end)
        return (
          <div className="song-result-step">
            <div className="step-rob-image">
              <img src="/images/rob4.png" alt="Rob the Taxi Driver" className="rob-image" />
            </div>
            
            <h2>Your Hilarious Song is Ready!</h2>
            <p>Check out the amazing song we've created from your photo</p>
            
            {isGeneratingSong ? (
              <div className="generating-container">
                <div className="generating-animation">
                  <div className="generating-waveform">
                    <div className="waveform-bar"></div>
                    <div className="waveform-bar"></div>
                    <div className="waveform-bar"></div>
                    <div className="waveform-bar"></div>
                    <div className="waveform-bar"></div>
                  </div>
                </div>
                <p>Generating your hilarious song...</p>
                <p className="generating-subtitle">This takes about 30 seconds</p>
              </div>
            ) : (
              <div className="result-container">
                <div className="result-preview">
                  <div className="result-image-container">
                    <img src={imagePreview} alt="Your photo" className="result-image" />
                  </div>
                  
                  <div className="result-audio-player">
                    <div className="player-header">
                      <h3>{selectedGenre}</h3>
                      <span className="duration">0:32</span>
                    </div>
                    
                    <div className="player-controls">
                      <button className="play-control">▶</button>
                      <div className="player-progress">
                        <div className="progress-bg"></div>
                        <div className="progress-fill" style={{ width: "0%" }}></div>
                      </div>
                    </div>
                    
                    <div className="player-waveform">
                      <div className="waveform-display"></div>
                    </div>
                  </div>
                </div>
                
                {!showPremiumFeatures ? (
                  <div className="share-section">
                    <h3>Ready to share your masterpiece?</h3>
                    <p>Enter your email to save this song and get a shareable link</p>
                    
                    <div className="email-capture">
                      <input 
                        type="email" 
                        placeholder="Your email address" 
                        className="email-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <button 
                        className="share-button"
                        onClick={handleSaveAndShare}
                      >
                        Save & Share
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="premium-features-section">
                    <h3>Unlock Premium Features</h3>
                    <p>Get access to exclusive features with our premium plan:</p>
                    
                    <div className="premium-features-list">
                      <div className="premium-feature">
                        <span className="premium-icon">⭐</span>
                        <div className="premium-feature-text">
                          <h4>High-Quality Audio</h4>
                          <p>Get full-length, high-definition songs without watermarks</p>
                        </div>
                      </div>
                      
                      <div className="premium-feature">
                        <span className="premium-icon">🎵</span>
                        <div className="premium-feature-text">
                          <h4>Multiple Versions</h4>
                          <p>Generate up to 5 different versions of your song</p>
                        </div>
                      </div>
                      
                      <div className="premium-feature">
                        <span className="premium-icon">📱</span>
                        <div className="premium-feature-text">
                          <h4>Dedicated Sharing Page</h4>
                          <p>Get a custom URL to share your songs on social media</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="premium-cta">
                      <button 
                        className="premium-button"
                        onClick={handleUnlockPremium}
                      >
                        Unlock Premium - $9.99
                      </button>
                      <p className="premium-note">One-time payment • Lifetime access • 100% satisfaction guarantee</p>
                    </div>
                    
                    <div className="create-new-link">
                      <button 
                        className="create-new-button"
                        onClick={() => {
                          setCurrentStep(1);
                          setSelectedFile(null);
                          setImagePreview('');
                          setShowPremiumFeatures(false);
                          setMadLibs({
                            adjective1: '',
                            noun1: '',
                            verbIng: '',
                            emotion: '',
                            place: '',
                            adjective2: '',
                            celebrity: '',
                            animalPlural: '',
                            sillyWord: '',
                            exclamation: ''
                          });
                        }}
                      >
                        Create Another Song
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  }
  
  return (
    <div className="tune-upload-container">
      <div className="tune-upload-card">
        <h1>Create Your Hilarious Song</h1>
        
        {error && <div className="upload-error">{error}</div>}
        {success && <div className="upload-success">{success}</div>}
        
        <div className="steps-indicator">
          <div className={`step-dot ${currentStep >= 1 ? 'active' : ''}`}>1</div>
          <div className="step-line"></div>
          <div className={`step-dot ${currentStep >= 2 ? 'active' : ''}`}>2</div>
          <div className="step-line"></div>
          <div className={`step-dot ${currentStep >= 3 ? 'active' : ''}`}>3</div>
          <div className="step-line"></div>
          <div className={`step-dot ${currentStep >= 4 ? 'active' : ''}`}>4</div>
        </div>
        
        <form className="tune-upload-form" onSubmit={(e) => e.preventDefault()}>
          {renderStepContent()}
        </form>
      </div>
    </div>
  )
}

export default TuneUploadPage 