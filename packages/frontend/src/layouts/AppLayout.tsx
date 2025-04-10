import { ReactNode } from 'react';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

interface AppLayoutProps {
  children: ReactNode;
  isAuthenticated: boolean;
  onLogout: () => void;
}

export default function AppLayout({ children, isAuthenticated, onLogout }: AppLayoutProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden'
    }}>
      <Navbar isAuthenticated={isAuthenticated} onLogout={onLogout} />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        position: 'relative'
      }}>
        {children}
      </div>
      <Footer />
    </div>
  );
}