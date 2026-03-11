import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PwaStatusDock from './components/PwaStatusDock';
import { useAuthStore } from './store/auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PlayersPage from './pages/PlayersPage';
import ReportEditor from './pages/ReportEditor';
import SettingsPage from './pages/SettingsPage';
import MissingConfigScreen from './components/MissingConfigScreen';
import { getSessionWithProfile, subscribeToAuthChanges } from './lib/data';
import {
  DRAFT_SYNC_EVENT,
  SERVICE_WORKER_UPDATE_EVENT,
  type DraftSyncDetail,
} from './lib/pwaEvents';
import { isSupabaseConfigured } from './lib/supabase';

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  const { token, setAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<DeferredPromptEvent | null>(null);
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [syncDetail, setSyncDetail] = useState<DraftSyncDetail | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    void (async () => {
      try {
        const authState = await getSessionWithProfile();
        if (!isMounted) return;
        setAuth(authState.user, authState.session);
      } catch (error) {
        console.error('Failed to initialize Supabase session.', error);
        if (!isMounted) return;
        setAuth(null, null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    const unsubscribe = subscribeToAuthChanges(({ session, user }) => {
      if (!isMounted) return;
      setAuth(user, session);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [setAuth]);

  useEffect(() => {
    const handleOnlineChange = () => {
      const nextOnline = navigator.onLine;
      setOnline(nextOnline);

      if (!nextOnline) {
        setSyncDetail({
          state: 'offline',
          message: 'Offline mode active. Drafts stay on this device until connection returns.',
          timestamp: Date.now(),
        });
      } else if (syncDetail?.state === 'offline') {
        setSyncDetail({
          state: 'synced',
          message: 'Connection restored.',
          timestamp: Date.now(),
        });
      }
    };

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as DeferredPromptEvent);
    };

    const handleUpdateReady = (event: Event) => {
      const detail = (event as CustomEvent<{ registration: ServiceWorkerRegistration }>).detail;
      if (detail?.registration) {
        setUpdateRegistration(detail.registration);
      }
    };

    const handleDraftSync = (event: Event) => {
      const detail = (event as CustomEvent<DraftSyncDetail>).detail;
      if (detail) {
        setSyncDetail(detail);
      }
    };

    handleOnlineChange();
    window.addEventListener('online', handleOnlineChange);
    window.addEventListener('offline', handleOnlineChange);
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener(SERVICE_WORKER_UPDATE_EVENT, handleUpdateReady);
    window.addEventListener(DRAFT_SYNC_EVENT, handleDraftSync);

    return () => {
      window.removeEventListener('online', handleOnlineChange);
      window.removeEventListener('offline', handleOnlineChange);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener(SERVICE_WORKER_UPDATE_EVENT, handleUpdateReady);
      window.removeEventListener(DRAFT_SYNC_EVENT, handleDraftSync);
    };
  }, [syncDetail?.state]);

  useEffect(() => {
    if (!syncDetail || ['offline', 'syncing'].includes(syncDetail.state)) {
      return;
    }

    const timeoutId = window.setTimeout(() => setSyncDetail(null), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [syncDetail]);

  const handleInstall = async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } finally {
      setInstallPrompt(null);
    }
  };

  const handleUpdate = () => {
    if (!updateRegistration?.waiting) return;

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        window.location.reload();
      },
      { once: true },
    );

    updateRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    setUpdateRegistration(null);
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!isSupabaseConfigured) return <MissingConfigScreen />;

  return (
    <BrowserRouter>
      <PwaStatusDock
        online={online}
        syncDetail={syncDetail}
        installReady={Boolean(installPrompt)}
        updateReady={Boolean(updateRegistration)}
        onInstall={() => void handleInstall()}
        onUpdate={handleUpdate}
      />
      <Routes>
        <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/players" element={<ProtectedRoute><PlayersPage /></ProtectedRoute>} />
        <Route path="/report/new" element={<ProtectedRoute><ReportEditor /></ProtectedRoute>} />
        <Route path="/report/:id" element={<ProtectedRoute><ReportEditor /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
