// ============================================================================
// CRITICAL: PDF.js Worker Initialization - MUST BE AT THE ABSOLUTE TOP
// This ensures the worker is globally available before any component mounts
// ============================================================================
declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

// CRITICAL FIX: Initialize PDF.js worker globally at the absolute top level
if (typeof window !== 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  script.async = false; // Load synchronously to ensure availability
  script.onload = () => {
    if (window.pdfjsLib) {
      // CRITICAL FIX: Set worker source to CDN (local worker file not available)
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      console.log('PDF.js worker initialized globally with CDN worker');
    }
  };
  script.onerror = () => {
    console.error('Failed to load PDF.js library');
  };
  document.head.appendChild(script);
}

// ============================================================================
// Now safe to import React and other dependencies
// ============================================================================
import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import { ErrorBoundary } from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import ProfileSetupModal from './components/ProfileSetupModal';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import Roadmap from './pages/Roadmap';
import Tasks from './pages/Tasks';
import Documents from './pages/Documents';
import Media from './pages/Media';
import Contacts from './pages/Contacts';
import Kostenuebersicht from './pages/Kostenuebersicht';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

type Page = 'dashboard' | 'roadmap' | 'tasks' | 'documents' | 'media' | 'contacts' | 'kostenuebersicht';

function AppContent() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const isAuthenticated = !!identity;
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  // Listen for navigation events from dashboard stat cards and calendar
  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const customEvent = event as CustomEvent<{ page: Page; filter?: string; projectId?: string; taskId?: string }>;
      if (customEvent.detail?.page) {
        setCurrentPage(customEvent.detail.page);
      }
    };

    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (showProfileSetup) {
    return <ProfileSetupModal />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'roadmap':
        return <Roadmap />;
      case 'tasks':
        return <Tasks />;
      case 'documents':
        return <Documents />;
      case 'media':
        return <Media />;
      case 'contacts':
        return <Contacts />;
      case 'kostenuebersicht':
        return <Kostenuebersicht />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      <ErrorBoundary>
        {renderPage()}
      </ErrorBoundary>
    </AppLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AppContent />
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
