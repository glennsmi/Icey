import { useState, useEffect } from 'react'
import './App.css'
import { auth, googleProvider } from './firebase'
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup
} from 'firebase/auth'

function App() {
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const handleSignUp = async (e) => {
    e.preventDefault()
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      setEmail('')
      setPassword('')
    } catch (error) {
      console.error("Error signing up:", error.message)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      await signInWithEmailAndPassword(auth, email, password)
      setEmail('')
      setPassword('')
    } catch (error) {
      console.error("Error logging in:", error.message)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      console.error("Error signing in with Google:", error.message)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Error logging out:", error.message)
    }
  }

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    )
  }

  return (
    <div className="app-container">
      {user ? (
        <div className="dashboard">
          <div className="user-welcome">
            <h1>Welcome!</h1>
            <p>{user.email}</p>
            <div className="user-avatar">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" />
              ) : (
                <div className="avatar-placeholder">
                  {user.email.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div className="user-content">
            <h2>You are logged in</h2>
            <p>This is your protected dashboard.</p>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      ) : (
        <div className="auth-container">
          <div className="auth-card">
            <h1>Welcome</h1>
            <p>Sign in to continue to the app</p>
            
            <button 
              className="google-sign-in-button" 
              onClick={handleGoogleSignIn}
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
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
              <div className="auth-buttons">
                <button onClick={handleLogin}>Login</button>
                <button onClick={handleSignUp}>Sign Up</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
