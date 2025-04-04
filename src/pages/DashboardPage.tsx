import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import { signOut, User } from 'firebase/auth'
import { useEffect, useState } from 'react'

interface DashboardProps {
  user: User | null;
}

const DashboardPage = ({ user }: DashboardProps) => {
  const navigate = useNavigate()
  const [initial, setInitial] = useState<string>('U')
  const [imageError, setImageError] = useState<boolean>(false)
  const [photoURL, setPhotoURL] = useState<string>('')

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
    <div className="app-container">
      <div className="dashboard">
        <div className="user-welcome">
          <h1>Welcome!</h1>
          <p>{user.displayName || user.email}</p>
          <div className="user-avatar">
            {photoURL && !imageError ? (
              <img 
                src={photoURL} 
                alt=""
                onError={handleImageError}
                crossOrigin="anonymous"
              />
            ) : (
              <div className="avatar-placeholder">
                {initial}
              </div>
            )}
          </div>
        </div>
        <div className="user-content">
          <h2>You are logged in</h2>
          <p>This is your protected dashboard.</p>
          <div className="dashboard-buttons">
            <button className="upload-image-button" onClick={() => navigate('/upload')}>
              Upload Profile Picture
            </button>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage 