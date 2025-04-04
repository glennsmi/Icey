import { Link, useLocation } from 'react-router-dom';
import { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

interface SidebarProps {
  user: User | null;
}

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
              <i className="sidebar-icon">🏠</i>
              <span>Dashboard</span>
            </Link>
          </li>
          {/* <li className={isActive('/my-tunes')}>
            <Link to="/my-tunes">
              <i className="sidebar-icon">🎵</i>
              <span>My Tunes</span>
            </Link>
          </li> */}
          <li className={isActive('/tune-upload')}>
            <Link to="/tune-upload">
              <i className="sidebar-icon">➕</i>
              <span>Share Tune</span>
            </Link>
          </li>
          <li className={isActive('/upload')}>
            <Link to="/upload">
              <i className="sidebar-icon">👤</i>
              <span>Update Profile</span>
            </Link>
          </li>
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        <button className="logout-button" onClick={handleLogout} >
          <i className="sidebar-icon">🚪</i>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 