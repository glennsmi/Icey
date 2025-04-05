import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LoginPage from './LoginPage'
import cartesiaService from '../utils/cartesiaService'

const LandingPage = () => {
  const [showLogin, setShowLogin] = useState(false)
  const ctaRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [logoError, setLogoError] = useState(false)
  
  // Add state to track if the audio is playing
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  
  // Initialize audio context for browser compatibility
  useEffect(() => {
    // Initialize audio context on component mount
    const initAudio = () => {
      // Create and immediately discard an audio context to prompt browser to allow audio
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      try {
        const audioContext = new AudioContext();
        // Suspend it immediately to save resources
        audioContext.suspend();
        console.log('Audio context initialized for LandingPage');
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
  
  const scrollToCta = () => {
    ctaRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleStartNow = async () => {
    // Prevent double-clicks
    if (isPlayingAudio) return;
    
    setIsPlayingAudio(true);
    
    try {
      // Play Rob's Scottish phrase
      await cartesiaService.speakRobSignaturePhrase();
      // Navigate to the tune upload page after the phrase is done
      navigate('/tune-upload');
    } catch (error) {
      console.error("Error playing Rob's Scottish phrase:", error);
      // Navigate anyway if there's an error with the audio
      navigate('/tune-upload');
    } finally {
      setIsPlayingAudio(false);
    }
  }

  const handleLogoError = () => {
    setLogoError(true)
  }

  return (
    <div className="landing-container">
      {/* Gradient Background */}
      <div className="hero-background">
        <div className="gradient-bg"></div>
        <div className="overlay"></div>
      </div>
      
      <div className="landing-content">
        <header className="landing-header centered-header">
          <nav className="landing-nav">
            <button 
              className="login-button"
              onClick={() => setShowLogin(true)}
            >
              Log In
            </button>
          </nav>
          
          <div className="logo-container centered-logo">
            {logoError ? (
              <h1 className="app-logo">Tunegram</h1>
            ) : (
              <img 
                src="/images/tunegramrob.png" 
                alt="Tunegram Logo" 
                className="logo-image large-logo" 
                width="350" 
                onError={handleLogoError}
              />
            )}
          </div>
          
          {/* Hero headline directly below logo */}
          <div className="hero-header">
            <h2 className="hero-title">
              Turn Your Photos Into <span className="highlight">Hilarious Songs</span>
            </h2>
            
            <p className="hero-subtitle">
              10,000+ users are already creating funny, shareable songs from their photos
            </p>
          </div>
          
          {/* Call to action directly below headline */}
          <div className="action-row centered-cta">
            <button 
              className="cta-button pulse"
              onClick={handleStartNow}
              disabled={isPlayingAudio}
            >
              {isPlayingAudio ? 'Starting...' : 'Create Your Song'}
            </button>
            
            <p className="no-credit-card">No signup required • Free to create</p>
          </div>
          
          <div className="trust-badges centered-badges">
            <div className="trust-item">
              <span className="trust-icon">⭐</span>
              <span>50K+ Songs Generated</span>
            </div>
            <div className="trust-item">
              <span className="trust-icon">🔊</span>
              <span>Viral-Ready Audio</span>
            </div>
            <div className="trust-item">
              <span className="trust-icon">🚀</span>
              <span>AI-Powered</span>
            </div>
          </div>
        </header>
        
        <main className="hero-section">
          <div className="app-preview centered-preview">
            <div className="mockup-container">
              <div className="photo-to-song-mockup">
                <div className="photo-side">
                  <div className="photo-frame">
                    <div className="photo-placeholder">
                      <span className="emoji-placeholder">📸</span>
                    </div>
                    <div className="arrow">→</div>
                  </div>
                </div>
                <div className="song-side">
                  <div className="song-result">
                    <div className="song-waveform">
                      <div className="waveform-bar"></div>
                      <div className="waveform-bar"></div>
                      <div className="waveform-bar"></div>
                      <div className="waveform-bar"></div>
                      <div className="waveform-bar"></div>
                    </div>
                    <div className="song-title">Beach Party Rap</div>
                    <div className="play-button">▶</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="floating-reviews">
              <div className="review-card">
                "My friends can't stop laughing!"
                <div className="review-stars">★★★★★</div>
              </div>
              <div className="review-card delay-1">
                "Went viral on TikTok!"
                <div className="review-stars">★★★★★</div>
              </div>
              <div className="review-card delay-2">
                "The AI songs are hilarious"
                <div className="review-stars">★★★★★</div>
              </div>
            </div>
          </div>
          
          {showLogin && (
            <div className="login-modal-overlay">
              <div className="login-modal">
                <button 
                  className="close-login"
                  onClick={() => setShowLogin(false)}
                >
                  &times;
                </button>
                <LoginPage />
              </div>
            </div>
          )}
        </main>
        
        <section className="how-it-works">
          <h2 className="section-heading">How It Works</h2>
          <div className="steps-container">
            <div className="step-box">
              <div className="step-number">1</div>
              <div className="step-icon">📸</div>
              <h3>Upload a Photo</h3>
              <p>Select any photo - your pet, a party, or a vacation snapshot</p>
            </div>
            <div className="step-box">
              <div className="step-number">2</div>
              <div className="step-icon">✏️</div>
              <h3>Fill Mad Libs</h3>
              <p>Answer fun prompts about your photo for personalized lyrics</p>
            </div>
            <div className="step-box">
              <div className="step-number">3</div>
              <div className="step-icon">🎵</div>
              <h3>Pick a Genre</h3>
              <p>Choose from AI-generated quirky music genres</p>
            </div>
            <div className="step-box">
              <div className="step-number">4</div>
              <div className="step-icon">🔥</div>
              <h3>Share & Go Viral</h3>
              <p>Instantly share your hilarious music video with friends</p>
            </div>
          </div>
        </section>
        
        <section className="features-section">
          <h2 className="section-heading">Tunegram Features</h2>
          <div className="features-grid">
            <div className="feature-box">
              <div className="feature-icon">🤣</div>
              <h3>Hilarious Results</h3>
              <p>Our AI creates personalized funny songs that will make you and your friends laugh out loud.</p>
            </div>
            <div className="feature-box">
              <div className="feature-icon">🤖</div>
              <h3>Smart Photo Analysis</h3>
              <p>Our AI detects elements in your photos to create relevant and personalized song content.</p>
            </div>
            <div className="feature-box">
              <div className="feature-icon">🎭</div>
              <h3>Funny Genre Mashups</h3>
              <p>From "Cat Disco" to "Beach Party Rap" - get unexpected genre combinations every time.</p>
            </div>
            <div className="feature-box">
              <div className="feature-icon">📱</div>
              <h3>Easy Social Sharing</h3>
              <p>One-click sharing to TikTok, Instagram, and more to help your content go viral.</p>
            </div>
          </div>
        </section>
        
        <section className="testimonial-section">
          <div className="testimonial-card main-testimonial">
            <div className="quote-marks">"</div>
            <p className="testimonial-text">
              I uploaded a photo of my cat sitting on my keyboard and got a hilarious heavy metal song about computer-hacking felines. My TikTok blew up overnight with 50K+ views!
            </p>
            <div className="testimonial-author">
              <img src="/images/user1.jpg" alt="Alex T." className="author-image" />
              <div>
                <div className="author-name">Alex T.</div>
                <div className="author-title">TikTok Creator</div>
              </div>
            </div>
          </div>
        </section>
        
        <section className="final-cta" ref={ctaRef}>
          <div className="cta-box">
            <h2>Create Your First Hilarious Song</h2>
            <p>Upload a photo and get a shareable song in seconds</p>
            
            <div className="action-row centered">
              <button 
                className="cta-button pulse"
                onClick={handleStartNow}
                disabled={isPlayingAudio}
              >
                {isPlayingAudio ? 'Starting...' : 'Create Now - It\'s Free!'}
              </button>
            </div>
            
            <div className="guarantee">
              <span className="guarantee-icon">✓</span> 
              <span>Free to create • Premium features available • No signup required</span>
            </div>
          </div>
        </section>
      </div>
      
      <footer className="landing-footer">
        <div className="footer-content">
          <p className="copyright">© {new Date().getFullYear()} Tunegram. All rights reserved.</p>
          <div className="footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage 