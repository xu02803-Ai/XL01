import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import SubscriptionPage from './pages/SubscriptionPage';
import MainApp from './MainApp';

type PageType = 'main' | 'login' | 'profile' | 'subscription';

const AppRouter: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageType>('main');

  useEffect(() => {
    // Parse URL hash for routing
    const hash = window.location.hash.slice(1) || 'main';
    if (hash === 'login' || hash === 'profile' || hash === 'subscription') {
      setCurrentPage(hash as PageType);
    } else {
      setCurrentPage('main');
    }

    // Update URL when page changes
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || 'main';
      if (hash === 'login' || hash === 'profile' || hash === 'subscription') {
        setCurrentPage(hash as PageType);
      } else {
        setCurrentPage('main');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (page: PageType) => {
    setCurrentPage(page);
    window.location.hash = page === 'main' ? '' : page;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated && currentPage !== 'login') {
    return <LoginPage />;
  }

  // If not authenticated and on login page, show it
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Render authenticated pages
  switch (currentPage) {
    case 'login':
      // Redirect to main if already logged in
      return <MainApp onNavigate={navigate} />;
    case 'profile':
      return <ProfilePage onNavigate={navigate} />;
    case 'subscription':
      return <SubscriptionPage onNavigate={navigate} />;
    case 'main':
    default:
      return <MainApp onNavigate={navigate} />;
  }
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
};

export default App;
