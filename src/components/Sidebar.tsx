import { Link, useLocation } from 'react-router-dom';
import { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

interface SidebarProps {
  user: User | null;
}

// SVG outlined icons
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

const MusicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
    <path d="M9 18V5l12-2v13"></path>
    <circle cx="6" cy="18" r="3"></circle>
    <circle cx="18" cy="16" r="3"></circle>
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const Sidebar = ({ user }: SidebarProps) => {
  const location = useLocation();
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };
  
  if (!user) {
    return null; // Don't render sidebar if user is not logged in
  }
  
  const initial = user.email ? user.email.charAt(0).toUpperCase() : 'U';
  
  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };
  
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" />
            ) : (
              <div className="avatar-placeholder">
                {initial}
              </div>
            )}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-name">{user.displayName || user.email}</div>
          </div>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <ul>
          <li className={isActive('/dashboard')}>
            <Link to="/dashboard">
              <HomeIcon />
              <span>Dashboard</span>
            </Link>
          </li>
          <li className={isActive('/my-tunes')}>
            <Link to="/my-tunes">
              <MusicIcon />
              <span>My Tunes</span>
            </Link>
          </li>
          <li className={isActive('/tune-upload')}>
            <Link to="/tune-upload">
              <PlusIcon />
              <span>Share Tune</span>
            </Link>
          </li>
          <li className={isActive('/upload')}>
            <Link to="/upload">
              <UserIcon />
              <span>Update Profile</span>
            </Link>
          </li>
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        <button className="logout-button" onClick={handleLogout}>
          <LogoutIcon />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 