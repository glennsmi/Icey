import { Navigate } from 'react-router-dom'
import { User } from 'firebase/auth'

interface ProtectedRouteProps {
  user: User | null;
  children: React.ReactNode;
}

const ProtectedRoute = ({ user, children }: ProtectedRouteProps) => {
  if (!user) {
    // User is not authenticated, redirect to login page
    return <Navigate to="/" replace />
  }

  // User is authenticated, render the children
  return <>{children}</>
}

export default ProtectedRoute 