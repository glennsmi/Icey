import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { auth } from './firebase'
import { onAuthStateChanged, User } from 'firebase/auth'

// Import Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UploadPage from './pages/UploadPage'

// Import Components
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
        <div className="loading-spinner">Loading...</div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* Public Route - Login Page */}
        <Route 
          path="/" 
          element={user ? <Navigate to="/dashboard" /> : <LoginPage />} 
        />
        
        {/* Protected Route - Dashboard Page */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute user={user}>
              <DashboardPage user={user} />
            </ProtectedRoute>
          } 
        />
        
        {/* Protected Route - Upload Page */}
        <Route 
          path="/upload" 
          element={
            <ProtectedRoute user={user}>
              <UploadPage user={user} />
            </ProtectedRoute>
          } 
        />
        
        {/* Catch-all route - Redirect to Login or Dashboard */}
        <Route 
          path="*" 
          element={user ? <Navigate to="/dashboard" /> : <Navigate to="/" />} 
        />
      </Routes>
    </Router>
  )
}

export default App 