import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Database, Key, Save, Settings, ShieldCheck, Users } from 'lucide-react';
import AppSidebar from '../components/AppSidebar';
import {
  fetchClubAccessOverview,
  fetchUserSettings,
  saveUserClubAccess,
  saveUserSettings,
  userHasRole,
  type ClubAccessOverview,
} from '../lib/data';
import { useAuthStore } from '../store/auth';
import { useSettingsStore } from '../store/settings';

export default function SettingsPage() {
  const { football_api_provider, football_api_key, setSettings } = useSettingsStore();
  const { user, logout } = useAuthStore();
  const isAdmin = userHasRole(user, 'admin');

  const [localProvider, setLocalProvider] = useState(football_api_provider);
  const [localApiKey, setLocalApiKey] = useState(football_api_key);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  const [clubAccess, setClubAccess] = useState<ClubAccessOverview | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoleSlugs, setSelectedRoleSlugs] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [accessSuccess, setAccessSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        setAccessLoading(isAdmin);
        const [settingsData, clubAccessData] = await Promise.all([
          fetchUserSettings(),
          isAdmin ? fetchClubAccessOverview() : Promise.resolve(null),
        ]);

        if (!isMounted) return;

        setSettings(settingsData);
        setLocalProvider(settingsData.football_api_provider);
        setLocalApiKey(settingsData.football_api_key);

        if (clubAccessData) {
          setClubAccess(clubAccessData);
          const firstUserId = clubAccessData.users[0]?.id || '';
          setSelectedUserId(firstUserId);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load settings.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setAccessLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isAdmin, setSettings]);

  const selectedUser = useMemo(
    () => clubAccess?.users.find((candidate) => candidate.id === selectedUserId) || null,
    [clubAccess, selectedUserId],
  );

  useEffect(() => {
    if (!selectedUser) {
      setSelectedRoleSlugs([]);
      setSelectedTeamIds([]);
      return;
    }

    setSelectedRoleSlugs(selectedUser.roles.map((role) => role.slug));
    setSelectedTeamIds(selectedUser.teams.map((team) => team.id));
  }, [selectedUser]);

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

  const toggleRole = (roleSlug: string) => {
    setSelectedRoleSlugs((current) =>
      current.includes(roleSlug) ? current.filter((item) => item !== roleSlug) : [...current, roleSlug],
    );
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((current) =>
      current.includes(teamId) ? current.filter((item) => item !== teamId) : [...current, teamId],
    );
  };

  const handleSaveAccess = async () => {
    if (!selectedUserId) return;

    setAccessLoading(true);
    setAccessError('');
    setAccessSuccess(false);
    try {
      await saveUserClubAccess(selectedUserId, selectedRoleSlugs, selectedTeamIds);
      const refreshed = await fetchClubAccessOverview();
      setClubAccess(refreshed);
      setAccessSuccess(true);
      setTimeout(() => setAccessSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save club access.', err);
      setAccessError(err.message || 'Failed to save club access.');
    } finally {
      setAccessLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-light)] flex flex-col md:flex-row">
      <AppSidebar current="settings" user={user} onLogout={() => void logout()} />

      <main className="flex-1 overflow-auto p-4 pb-28 md:p-6">
        <div className="mx-auto max-w-6xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                  <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/65">MWOS Club Workspace</p>
                  <h1 className="mt-1 mwos-display text-[2rem] uppercase leading-none tracking-[0.08em] text-white md:text-4xl">
                    Settings
                  </h1>
                  <p className="mt-1.5 text-xs font-semibold text-white/75 md:mt-2 md:text-sm">
                    Manage integrations and, for admins, assign club roles and teams.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.85fr,1.15fr]">
            <section className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/20 bg-white shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
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
            </section>

            <section className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/20 bg-white shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
              <div className="border-b border-[var(--color-mid)]/20 bg-[var(--color-light)]/50 p-4 md:p-5">
                <h2 className="flex items-center text-base font-black uppercase tracking-wider text-[var(--color-dark)]">
                  <ShieldCheck size={18} className="mr-2 text-[var(--color-primary)]" />
                  Club Access
                </h2>
                <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">
                  Assign staff roles and teams from one admin surface.
                </p>
              </div>

              <div className="p-4 md:p-5">
                {!isAdmin ? (
                  <div className="rounded-2xl border border-[var(--color-mid)]/16 bg-[var(--color-light)]/55 p-4 text-sm font-semibold text-[var(--color-mid)]">
                    Club access management is visible only to admin accounts.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {accessError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                        {accessError}
                      </div>
                    )}

                    <div className="grid gap-4 lg:grid-cols-[0.92fr,1.08fr]">
                      <div className="rounded-[24px] border border-[var(--color-mid)]/16 bg-[var(--color-light)]/45 p-4">
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-[var(--color-primary)]" />
                          <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-dark)]">
                            Staff Accounts
                          </p>
                        </div>
                        <div className="mt-4 space-y-2">
                          {clubAccess?.users.map((member) => {
                            const active = member.id === selectedUserId;
                            return (
                              <button
                                key={member.id}
                                onClick={() => setSelectedUserId(member.id)}
                                className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                                  active
                                    ? 'border-[var(--color-primary)]/25 bg-white shadow-sm'
                                    : 'border-transparent bg-white/65 hover:border-[var(--color-primary)]/15'
                                }`}
                              >
                                <p className="text-sm font-black text-[var(--color-dark)]">{member.name}</p>
                                <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">{member.email}</p>
                                <p className="mt-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                                  {member.roles.length > 0
                                    ? member.roles.map((role) => role.label).join(' · ')
                                    : 'Pending access'}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_14px_34px_rgba(49,39,131,0.05)]">
                        {selectedUser ? (
                          <>
                            <p className="text-lg font-black text-[var(--color-dark)]">{selectedUser.name}</p>
                            <p className="mt-1 text-sm font-semibold text-[var(--color-mid)]">{selectedUser.email}</p>
                            <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                              Legacy profile role: {selectedUser.legacyRole}
                            </p>

                            <div className="mt-5">
                              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                                Roles
                              </p>
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {clubAccess?.roles.map((role) => {
                                  const active = selectedRoleSlugs.includes(role.slug);
                                  return (
                                    <button
                                      key={role.slug}
                                      onClick={() => toggleRole(role.slug)}
                                      className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                                        active
                                          ? 'border-[var(--color-primary)]/25 bg-[var(--color-primary)]/6'
                                          : 'border-[var(--color-mid)]/18 bg-[var(--color-light)]/45'
                                      }`}
                                    >
                                      <p className="text-sm font-black text-[var(--color-dark)]">{role.label}</p>
                                      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-mid)]">
                                        {role.description}
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="mt-5">
                              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                                Teams
                              </p>
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {clubAccess?.teams.map((team) => {
                                  const active = selectedTeamIds.includes(team.id);
                                  return (
                                    <button
                                      key={team.id}
                                      onClick={() => toggleTeam(team.id)}
                                      className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                                        active
                                          ? 'border-[var(--color-accent)]/22 bg-[var(--color-accent)]/6'
                                          : 'border-[var(--color-mid)]/18 bg-[var(--color-light)]/45'
                                      }`}
                                    >
                                      <p className="text-sm font-black text-[var(--color-dark)]">{team.name}</p>
                                      <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">
                                        {team.is_active ? 'Active team' : 'Prepared for activation'}
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="mt-5 flex flex-col gap-3 border-t border-[var(--color-mid)]/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                {accessSuccess && (
                                  <span className="flex items-center text-sm font-bold text-green-600">
                                    <CheckCircle size={16} className="mr-1" /> Club access updated
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => void handleSaveAccess()}
                                disabled={accessLoading}
                                className="rounded-2xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-opacity-90 disabled:opacity-50"
                              >
                                <span className="inline-flex items-center gap-2">
                                  <Save size={16} />
                                  {accessLoading ? 'Saving...' : 'Save Club Access'}
                                </span>
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="rounded-2xl border border-[var(--color-mid)]/16 bg-[var(--color-light)]/55 p-4 text-sm font-semibold text-[var(--color-mid)]">
                            {accessLoading ? 'Loading club access…' : 'Select a user to manage club access.'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-mid)]/16 bg-white/96 px-4 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 shadow-[0_-12px_28px_rgba(15,23,42,0.1)] backdrop-blur-xl md:hidden">
        {isAdmin ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--color-primary)]/18 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.08em] text-[var(--color-primary)] shadow-sm disabled:opacity-50"
            >
              <Save size={16} />
              {isSaving ? 'Saving…' : 'Save Settings'}
            </button>
            <button
              onClick={() => void handleSaveAccess()}
              disabled={accessLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-black uppercase tracking-[0.08em] text-white shadow-md disabled:opacity-50"
            >
              <Save size={16} />
              {accessLoading ? 'Saving…' : 'Save Access'}
            </button>
          </div>
        ) : (
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-black uppercase tracking-[0.08em] text-white shadow-md disabled:opacity-50"
          >
            <Save size={16} />
            {isSaving ? 'Saving…' : 'Save Settings'}
          </button>
        )}
      </div>
    </div>
  );
}
