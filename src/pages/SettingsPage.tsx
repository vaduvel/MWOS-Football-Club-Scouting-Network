import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Database, Key, Save, Settings } from 'lucide-react';
import AppSidebar from '../components/AppSidebar';
import { fetchUserSettings, saveUserSettings } from '../lib/data';
import { useAuthStore } from '../store/auth';
import { useSettingsStore } from '../store/settings';

export default function SettingsPage() {
  const { football_api_provider, football_api_key, setSettings } = useSettingsStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = (user?.role || '').trim().toLowerCase() === 'admin';

  const [localProvider, setLocalProvider] = useState(football_api_provider);
  const [localApiKey, setLocalApiKey] = useState(football_api_key);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const data = await fetchUserSettings();
        if (!isMounted) return;
        setSettings(data);
        setLocalProvider(data.football_api_provider);
        setLocalApiKey(data.football_api_key);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [setSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setError('');
    try {
      const nextSettings = {
        football_api_provider: localProvider,
        football_api_key: localApiKey,
      };
      await saveUserSettings(nextSettings);
      setSettings(nextSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-light)] flex flex-col md:flex-row">
      <AppSidebar
        current="settings"
        isAdmin={isAdmin}
        userName={user?.name}
        organization={user?.organization}
        onNavigateReports={() => navigate('/')}
        onNavigatePlayers={() => navigate('/players')}
        onNavigateSettings={() => navigate('/settings')}
        onLogout={() => void logout()}
      />

      <main className="flex-1 overflow-auto p-4 pb-28 md:p-6">
        <div className="mx-auto max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/18 bg-white shadow-[0_20px_55px_rgba(49,39,131,0.08)]">
            <div className="mwos-ribbon-surface relative overflow-hidden px-4 py-4 text-white md:px-6 md:py-5">
              <div className="flex items-center gap-3 border-b border-white/10 pb-3 md:gap-4 md:pb-4">
                <img
                  src="/branding/mwos-fc-300-2.png"
                  alt="MWOS logo"
                  className="h-10 w-10 rounded-full border border-white/20 bg-white/10 p-0.5 md:h-12 md:w-12"
                />
              </div>
              <div className="mt-4 flex items-center gap-3 md:mt-5 md:gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white md:h-11 md:w-11">
                  <Settings size={22} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/65">MWOS Integrations</p>
                  <h1 className="mt-1 mwos-display text-[2rem] uppercase leading-none tracking-[0.08em] text-white md:text-4xl">
                    Settings
                  </h1>
                  <p className="mt-1.5 text-xs font-semibold text-white/75 md:mt-2 md:text-sm">
                    Connect imports and keep your scouting tools ready.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/20 bg-white shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
            <div className="border-b border-[var(--color-mid)]/20 bg-[var(--color-light)]/50 p-4 md:p-5">
              <h2 className="flex items-center text-base font-black uppercase tracking-wider text-[var(--color-dark)]">
                <Database size={18} className="mr-2 text-[var(--color-primary)]" />
                Data Provider Integration
              </h2>
              <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">
                Choose how squad data is imported for reports.
              </p>
            </div>

            <div className="space-y-4 p-4 md:space-y-5 md:p-5">
              {isLoading && (
                <div className="rounded-xl border border-[var(--color-mid)]/20 bg-[var(--color-light)] p-4 text-sm font-semibold text-[var(--color-mid)]">
                  Loading settings...
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-mid)]">
                  Football Data Provider
                </label>
                <select
                  value={localProvider}
                  onChange={(e) => setLocalProvider(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--color-mid)]/30 bg-white p-3 font-bold outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                >
                  <option value="api-football">API-Football (api-football.com)</option>
                  <option value="none">None (Manual Entry Only)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 md:hidden">
                <div className="rounded-2xl border border-[var(--color-primary)]/12 bg-[var(--color-primary)]/5 px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">Mode</p>
                  <p className="mt-2 text-sm font-black text-[var(--color-dark)]">
                    {localProvider === 'api-football' ? 'Connected' : 'Manual'}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--color-mid)]/18 bg-[var(--color-light)]/60 px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">API Key</p>
                  <p className="mt-2 text-sm font-black text-[var(--color-dark)]">
                    {localApiKey ? 'Saved' : 'Missing'}
                  </p>
                </div>
              </div>

              {localProvider === 'api-football' && (
                <div>
                  <label className="mb-2 flex items-center text-xs font-bold uppercase tracking-wider text-[var(--color-mid)]">
                    <Key size={14} className="mr-1" /> API Key
                  </label>
                  <input
                    type="password"
                    value={localApiKey}
                    onChange={(e) => setLocalApiKey(e.target.value)}
                    placeholder="Enter your API-Football key"
                    className="w-full rounded-2xl border border-[var(--color-mid)]/30 bg-white p-3 font-mono text-sm outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                  <p className="mt-2 text-xs text-[var(--color-mid)]">
                    Get your API key from{' '}
                    <a href="https://dashboard.api-football.com/" target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">
                      dashboard.api-football.com
                    </a>
                    .
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-[var(--color-mid)]/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {saveSuccess && (
                    <span className="flex items-center text-sm font-bold text-green-600">
                      <CheckCircle size={16} className="mr-1" /> Settings saved successfully
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving || isLoading}
                  className="rounded-2xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-opacity-90 disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <Save size={16} />
                    {isSaving ? 'Saving...' : 'Save Settings'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-mid)]/16 bg-white/96 px-4 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 shadow-[0_-12px_28px_rgba(15,23,42,0.1)] backdrop-blur-xl md:hidden">
        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-black uppercase tracking-[0.08em] text-white shadow-md disabled:opacity-50"
        >
          <Save size={16} />
          {isSaving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
