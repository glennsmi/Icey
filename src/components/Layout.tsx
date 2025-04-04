import { ReactNode } from 'react';
import { User } from 'firebase/auth';
import Sidebar from './Sidebar';

interface LayoutProps {
  user: User | null;
  children: ReactNode;
}

const Layout = ({ user, children }: LayoutProps) => {
  return (
    <div className="app-layout">
      <Sidebar user={user} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout; 