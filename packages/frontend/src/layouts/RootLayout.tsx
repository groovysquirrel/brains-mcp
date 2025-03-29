import { ReactNode } from 'react';

interface RootLayoutProps {
  children: ReactNode;
  header?: ReactNode;
}

export default function RootLayout({ children, header }: RootLayoutProps) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      overflow: 'hidden'
    }}>
      {header}
      <main style={{ 
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {children}
      </main>
    </div>
  );
} 