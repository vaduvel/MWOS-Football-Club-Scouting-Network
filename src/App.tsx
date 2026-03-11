import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PlayersPage from './pages/PlayersPage';
import ReportEditor from './pages/ReportEditor';
import SettingsPage from './pages/SettingsPage';
import MissingConfigScreen from './components/MissingConfigScreen';
import { getSessionWithProfile, subscribeToAuthChanges } from './lib/data';
import { isSupabaseConfigured } from './lib/supabase';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  const { token, setAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!isSupabaseConfigured) return <MissingConfigScreen />;

  return (
    <BrowserRouter>
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
