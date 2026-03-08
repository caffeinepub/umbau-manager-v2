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
import { useGetCallerUserProfile, useHasTeamAssociation, useGetAllProjects } from './hooks/useQueries';
import { useProjectSession } from './hooks/useProjectSession';
import { useActor } from './hooks/useActor';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getUrlParameter } from './utils/urlParams';
import LoginPage from './pages/LoginPage';
import ProfileSetupModal from './components/ProfileSetupModal';
import WelcomeScreen from './pages/WelcomeScreen';
import ProjectSelection from './pages/ProjectSelection';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import Roadmap from './pages/Roadmap';
import Tasks from './pages/Tasks';
import Documents from './pages/Documents';
import Media from './pages/Media';
import Contacts from './pages/Contacts';
import Kostenuebersicht from './pages/Kostenuebersicht';
import ApplyInvite from './pages/ApplyInvite';
import { toast } from 'sonner';

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

type Page = 'dashboard' | 'roadmap' | 'tasks' | 'documents' | 'media' | 'contacts' | 'kostenuebersicht' | 'project-selection' | 'welcome';

function AppContent() {
  const { identity, isInitializing, clear } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const { data: hasTeam, isLoading: teamCheckLoading, isFetched: teamCheckFetched } = useHasTeamAssociation();
  const { data: projects, isLoading: projectsLoading } = useGetAllProjects();
  const { lastUsedProjectId, setLastUsedProjectId, clearLastUsedProjectId } = useProjectSession();
  const { actor } = useActor();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [hasInviteToken, setHasInviteToken] = useState(false);
  const [isAutoNavigating, setIsAutoNavigating] = useState(false);
  const [hasNavigatedFromLogin, setHasNavigatedFromLogin] = useState(false);

  const isAuthenticated = !!identity;
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;
  
  // Show welcome screen only if user has no team association AND no existing projects
  const hasProjects = projects && projects.length > 0;
  const showWelcomeScreen = isAuthenticated && !profileLoading && isFetched && userProfile !== null && !teamCheckLoading && teamCheckFetched && !hasTeam && !hasProjects && !projectsLoading;

  // Check for invite token on mount
  useEffect(() => {
    const inviteToken = getUrlParameter('invite');
    if (inviteToken) {
      setHasInviteToken(true);
    }
  }, []);

  // Auto-load last used project on mount (only on direct URL access, not after login)
  useEffect(() => {
    if (
      isAuthenticated &&
      !profileLoading &&
      isFetched &&
      userProfile !== null &&
      !projectsLoading &&
      projects &&
      projects.length > 0 &&
      lastUsedProjectId &&
      !isAutoNavigating &&
      !hasNavigatedFromLogin
    ) {
      setIsAutoNavigating(true);
      
      // Verify user has access to the stored project
      const projectExists = projects.find(p => p.id === lastUsedProjectId);
      
      if (projectExists) {
        setCurrentProjectId(lastUsedProjectId);
        setCurrentPage('dashboard');
      } else {
        // Project not found or no access, clear and show welcome
        clearLastUsedProjectId();
        toast.error('Projekt nicht gefunden oder kein Zugriff');
        setCurrentPage('welcome');
      }
      
      setIsAutoNavigating(false);
    }
  }, [isAuthenticated, profileLoading, isFetched, userProfile, projectsLoading, projects, lastUsedProjectId, isAutoNavigating, hasNavigatedFromLogin, clearLastUsedProjectId]);

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

  // Handle navigation from WelcomeScreen and ProjectSelection
  const handleNavigate = (page: string) => {
    if (page === 'welcome') {
      setHasNavigatedFromLogin(true);
    }
    setCurrentPage(page as Page);
  };

  // Handle project selection
  const handleProjectSelect = (projectId: string | null) => {
    setCurrentProjectId(projectId);
    if (projectId) {
      setLastUsedProjectId(projectId);
      setCurrentPage('dashboard');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await clear();
    queryClient.clear();
    clearLastUsedProjectId();
    setCurrentProjectId(null);
    setCurrentPage('welcome');
    setHasNavigatedFromLogin(false);
  };

  // Handle invite flow
  if (hasInviteToken) {
    return (
      <ApplyInvite
        onSuccess={(projectId) => {
          setHasInviteToken(false);
          if (projectId) {
            setLastUsedProjectId(projectId);
            setCurrentProjectId(projectId);
            setCurrentPage('dashboard');
          } else {
            setCurrentPage('contacts');
          }
        }}
      />
    );
  }

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

  if (showWelcomeScreen) {
    return <WelcomeScreen onNavigate={handleNavigate} />;
  }

  // Handle project selection page
  if (currentPage === 'project-selection') {
    return (
      <ProjectSelection
        onNavigate={handleNavigate}
        onBack={() => setCurrentPage('welcome')}
      />
    );
  }

  // Handle welcome page navigation
  if (currentPage === 'welcome') {
    return <WelcomeScreen onNavigate={handleNavigate} />;
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
    <AppLayout 
      currentPage={currentPage} 
      onNavigate={setCurrentPage}
      currentProjectId={currentProjectId}
      onProjectSelect={handleProjectSelect}
      onLogout={handleLogout}
    >
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
