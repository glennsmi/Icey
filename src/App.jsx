import { useState, useEffect } from 'react'
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-2xl text-blue-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center min-h-screen w-full p-5 bg-gray-50">
      {user ? (
        <div className="flex flex-col w-full max-w-3xl bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-blue-500 text-white p-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Welcome!</h1>
            <p>{user.email}</p>
            <div className="flex justify-center mt-4">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profile" 
                  className="w-20 h-20 rounded-full border-4 border-white"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-green-500 text-white flex items-center justify-center text-3xl font-bold border-4 border-white">
                  {user.email.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">You are logged in</h2>
            <p className="text-gray-600 mb-6">This is your protected dashboard.</p>
            <button 
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-center items-center w-full">
          <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
            <h1 className="text-3xl font-bold mb-2 text-gray-800">Welcome</h1>
            <p className="text-gray-600 mb-6">Sign in to continue to the app</p>
            
            <button 
              className="flex items-center justify-center w-full py-3 px-4 bg-white border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors mb-5"
              onClick={handleGoogleSignIn}
            >
              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3">G</span>
              Continue with Google
            </button>
            
            <div className="flex items-center my-5">
              <div className="h-px bg-gray-300 flex-1"></div>
              <span className="px-3 text-sm text-gray-500">OR</span>
              <div className="h-px bg-gray-300 flex-1"></div>
            </div>
            
            <form className="flex flex-col gap-4">
              <input 
                type="email" 
                placeholder="Email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex gap-3 mt-1">
                <button 
                  onClick={handleLogin}
                  className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors"
                >
                  Login
                </button>
                <button 
                  onClick={handleSignUp}
                  className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors"
                >
                  Sign Up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
