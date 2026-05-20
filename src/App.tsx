import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PwaStatusDock from './components/PwaStatusDock';
import { useAuthStore } from './store/auth';
const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'));
const ClubHomePage = lazy(() => import('./pages/ClubHomePage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PlayersPage = lazy(() => import('./pages/PlayersPage'));
const ReportEditor = lazy(() => import('./pages/ReportEditor'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const TrainingPage = lazy(() => import('./pages/TrainingPage'));
const TransportPage = lazy(() => import('./pages/TransportPage'));
const OversightPage = lazy(() => import('./pages/OversightPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
import MissingConfigScreen from './components/MissingConfigScreen';
import { getSessionWithProfile, subscribeToAuthChanges } from './lib/data';
import {
  canAccessOversightModule,
  canAccessPlayerHub,
  canAccessScoutingModule,
  canCreateScoutingReports,
  canAccessTrainingModule,
  canAccessTransportModule,
  getDefaultModulePath,
  type AppUser,
} from './lib/data';
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

type AppErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

function isChunkLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError/i.test(message);
}

function recoverFromAppShellError() {
  const reloadKey = 'mwos-app-shell-reload-attempted';

  if (sessionStorage.getItem(reloadKey) !== '1') {
    sessionStorage.setItem(reloadKey, '1');
    window.location.reload();
    return;
  }

  window.location.assign('/');
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, AppErrorBoundaryState> {
  declare props: { children: React.ReactNode };

  state: AppErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('MWOS app route failed.', error, info);

    if (isChunkLoadError(error) && sessionStorage.getItem('mwos-app-shell-reload-attempted') !== '1') {
      sessionStorage.setItem('mwos-app-shell-reload-attempted', '1');
      window.location.reload();
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-dvh items-center justify-center bg-[linear-gradient(180deg,#f7f8fb,#eef1f7)] px-5 py-8">
        <section className="w-full max-w-md rounded-[28px] border border-[var(--color-primary)]/14 bg-white p-5 text-left shadow-[0_30px_80px_rgba(12,16,53,0.14)]">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">MWOS Club Management</p>
          <h1 className="mt-3 text-2xl font-black text-[var(--color-dark)]">Reload your workspace</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-mid)]">
            The app loaded an old or interrupted screen. Reload once and MWOS will reopen the correct workspace.
          </p>
          {this.state.message ? (
            <p className="mt-3 rounded-2xl bg-[var(--color-light)] px-3 py-2 text-xs font-semibold text-[var(--color-mid)]">
              {this.state.message}
            </p>
          ) : null}
          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={recoverFromAppShellError}
              className="rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-black text-white"
            >
              Reload app
            </button>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-3 text-sm font-black text-[var(--color-primary)]"
            >
              Go to home
            </button>
          </div>
        </section>
      </div>
    );
  }
}

function RouteLoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[linear-gradient(180deg,#f7f8fb,#eef1f7)] px-6">
      <div className="w-full max-w-md rounded-[28px] border border-[var(--color-primary)]/10 bg-white/96 p-6 text-center shadow-[0_30px_80px_rgba(12,16,53,0.12)]">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">MWOS Club Management</p>
        <div className="mx-auto mt-4 h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-primary)]/18 border-t-[var(--color-primary)]" />
        <p className="mt-4 text-sm font-semibold text-[var(--color-dark)]/72">Loading your workspace…</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function RoleRoute({
  children,
  canAccess,
}: {
  children: React.ReactNode;
  canAccess: (user: AppUser) => boolean;
}) {
  const { user, token } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccess(user)) {
    return <Navigate to={getDefaultModulePath(user)} replace />;
  }

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

  useEffect(() => {
    const handlePreloadError = (event: Event) => {
      event.preventDefault();

      if (sessionStorage.getItem('mwos-app-shell-reload-attempted') === '1') {
        return;
      }

      sessionStorage.setItem('mwos-app-shell-reload-attempted', '1');
      window.location.reload();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!isChunkLoadError(event.reason)) {
        return;
      }

      event.preventDefault();
      if (sessionStorage.getItem('mwos-app-shell-reload-attempted') !== '1') {
        sessionStorage.setItem('mwos-app-shell-reload-attempted', '1');
        window.location.reload();
      }
    };

    window.addEventListener('vite:preloadError', handlePreloadError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('vite:preloadError', handlePreloadError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

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

  if (loading) return <div className="flex min-h-dvh items-center justify-center">Loading...</div>;
  if (!isSupabaseConfigured) return <MissingConfigScreen />;

  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <PwaStatusDock
          online={online}
          syncDetail={syncDetail}
          installReady={Boolean(installPrompt)}
          updateReady={Boolean(updateRegistration)}
          onInstall={() => void handleInstall()}
          onUpdate={handleUpdate}
        />
        <Suspense fallback={<RouteLoadingScreen />}>
          <Routes>
            <Route path="/login" element={!token ? <Login /> : <Navigate to="/" replace />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/accept-invite" element={<AcceptInvitation />} />
            <Route path="/" element={<ProtectedRoute><ClubHomePage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/training" element={<RoleRoute canAccess={canAccessTrainingModule}><TrainingPage /></RoleRoute>} />
            <Route path="/transport" element={<RoleRoute canAccess={canAccessTransportModule}><TransportPage /></RoleRoute>} />
            <Route path="/scouting" element={<RoleRoute canAccess={canAccessScoutingModule}><Dashboard /></RoleRoute>} />
            <Route path="/players" element={<RoleRoute canAccess={canAccessPlayerHub}><PlayersPage /></RoleRoute>} />
            <Route path="/oversight" element={<RoleRoute canAccess={canAccessOversightModule}><OversightPage /></RoleRoute>} />
            <Route path="/scouting/report/new" element={<RoleRoute canAccess={canCreateScoutingReports}><ReportEditor /></RoleRoute>} />
            <Route path="/scouting/report/:id" element={<RoleRoute canAccess={canAccessScoutingModule}><ReportEditor /></RoleRoute>} />
            <Route path="/report/new" element={<RoleRoute canAccess={canCreateScoutingReports}><ReportEditor /></RoleRoute>} />
            <Route path="/report/:id" element={<RoleRoute canAccess={canAccessScoutingModule}><ReportEditor /></RoleRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to={token ? '/' : '/login'} replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
