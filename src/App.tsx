import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { auth } from './firebase'
import { onAuthStateChanged, User } from 'firebase/auth'

// Import Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UploadPage from './pages/UploadPage'
import TuneUploadPage from './pages/TuneUploadPage'
import MyTunesPage from './pages/MyTunesPage'
import LandingPage from './pages/LandingPage'

// Import Components
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-spinner">
          <div className="spinner-inner"></div>
          <div className="loading-text">Tuning in...</div>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* Public Route - Landing Page */}
        <Route 
          path="/" 
          element={<LandingPage />} 
        />
        
        {/* Separate login page for direct access */}
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" /> : <LoginPage />}
        />
        
        {/* Public Route - Tune Upload Page (no login required) */}
        <Route 
          path="/tune-upload" 
          element={<TuneUploadPage user={user} />}
        />
        
        {/* Protected Routes - With Layout */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute user={user}>
              <Layout user={user}>
                <DashboardPage user={user} />
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/upload" 
          element={
            <ProtectedRoute user={user}>
              <Layout user={user}>
                <UploadPage user={user} />
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/my-tunes" 
          element={
            <ProtectedRoute user={user}>
              <Layout user={user}>
                <MyTunesPage user={user} />
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        {/* Catch-all route - Redirect to Landing Page */}
        <Route 
          path="*" 
          element={<Navigate to="/" />} 
        />
      </Routes>
    </Router>
  )
}

export default App 