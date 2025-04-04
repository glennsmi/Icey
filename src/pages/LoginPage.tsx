import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, googleProvider } from '../firebase'
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  updateProfile
} from 'firebase/auth'

const LoginPage = () => {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const navigate = useNavigate()

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      setEmail('')
      setPassword('')
      navigate('/dashboard')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error("Error signing up:", errorMessage)
      setError(`Sign up failed: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      await signInWithEmailAndPassword(auth, email, password)
      setEmail('')
      setPassword('')
      navigate('/dashboard')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error("Error logging in:", errorMessage)
      setError(`Login failed: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)
    
    try {
      // Using Google sign-in with custom parameters
      const result = await signInWithPopup(auth, googleProvider)
      
      // Extract user info, including profile picture
      const { user } = result;
      const { displayName, photoURL, email } = user;
      
      console.log("Google sign-in successful", {
        email,
        photoURL,
        displayName
      });
      
      // Make sure profile photo is properly saved to the user profile
      if (user && !user.photoURL && result.user.photoURL) {
        try {
          await updateProfile(user, {
            photoURL: result.user.photoURL
          });
          console.log("Updated user profile with photo URL");
        } catch (profileError) {
          console.error("Failed to update profile:", profileError);
        }
      }
      
      navigate('/dashboard')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error("Error signing in with Google:", errorMessage)
      setError(`Google sign-in failed: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-container">
      <div className="auth-container">
        <div className="auth-card">
          <h1>Welcome</h1>
          <p>Sign in to continue to the app</p>
          
          {error && <div className="auth-error">{error}</div>}
          
          <button 
            className="google-sign-in-button" 
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <span className="google-icon">G</span>
            Continue with Google
          </button>
          
          <div className="divider">
            <span>OR</span>
          </div>
          
          <form className="auth-form">
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <div className="auth-buttons">
              <button 
                onClick={handleLogin}
                disabled={loading}
              >
                Login
              </button>
              <button 
                onClick={handleSignUp}
                disabled={loading}
              >
                Sign Up
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage 