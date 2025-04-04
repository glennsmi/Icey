import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import LoginPage from './LoginPage'

const LandingPage = () => {
  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState('')
  const ctaRef = useRef<HTMLDivElement>(null)
  
  const scrollToCta = () => {
    ctaRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleStartNow = () => {
    setShowLogin(true)
  }

  return (
    <div className="landing-container">
      {/* Gradient Background */}
      <div className="hero-background">
        <div className="gradient-bg"></div>
        <div className="overlay"></div>
      </div>
      
      <div className="landing-content">
        <header className="landing-header">
          <div className="logo-container">
            <h1 className="app-logo">Tunegram</h1>
          </div>
          
          <nav className="landing-nav">
            <button 
              className="login-button"
              onClick={() => setShowLogin(true)}
            >
              Log In
            </button>
          </nav>
        </header>
        
        <main className="hero-section">
          <div className="hero-content">
            <h2 className="hero-title">
              Turn Your Photos Into <span className="highlight">Hilarious Songs</span>
            </h2>
            
            <p className="hero-subtitle">
              10,000+ users are already creating funny, shareable songs from their photos
            </p>
            
            <div className="action-row">
              <div className="email-capture">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="email-input"
                />
                <button 
                  className="cta-button pulse"
                  onClick={handleStartNow}
                >
                  Start Free
                </button>
              </div>
              
              <p className="no-credit-card">No credit card required • Instant access</p>
            </div>
            
            <div className="trust-badges">
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
          </div>
          
          <div className="hero-visual">
            {showLogin ? (
              <div className="login-modal">
                <button 
                  className="close-login"
                  onClick={() => setShowLogin(false)}
                >
                  &times;
                </button>
                <LoginPage />
              </div>
            ) : (
              <div className="app-preview">
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
            )}
          </div>
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
              <div className="email-capture">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="email-input"
                />
                <button 
                  className="cta-button pulse"
                  onClick={handleStartNow}
                >
                  Start Free
                </button>
              </div>
            </div>
            
            <div className="guarantee">
              <span className="guarantee-icon">✓</span> 
              <span>Free forever • No credit card required • Instant access</span>
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