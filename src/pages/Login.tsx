import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ShieldCheck, Users } from 'lucide-react';
import { signIn, signUp } from '../lib/data';
import { useAuthStore } from '../store/auth';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [requestedRole, setRequestedRole] = useState<'Scout' | 'Admin'>('Scout');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    try {
      if (isLogin) {
        const data = await signIn(email, password);
        setAuth(data.user, data.session);
        navigate('/');
        return;
      }

      const data = await signUp(email, password, name, organization, requestedRole);

      if (data.emailConfirmationRequired) {
        setInfo(
          requestedRole === 'Admin'
            ? 'Account created as Scout. Confirm the email, then ask an existing admin to promote this account.'
            : 'Account created. Confirm the email in Supabase, then sign in.',
        );
        setIsLogin(true);
        return;
      }

      if (requestedRole === 'Admin') {
        setInfo('Account created as Scout. Ask an existing admin to grant Admin access after your first sign in.');
      }

      setAuth(data.user, data.session);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="mwos-auth-shell relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: "url('/branding/att.AGuDIc57f42thGuMeUSyrotRD6Zy0fxGX1rynzNNmWM.JPG')" }}
      />
      <div className="mwos-subtle-grid absolute inset-0 opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(190,23,23,0.24),transparent_28%),linear-gradient(180deg,rgba(16,20,74,0.22),rgba(16,20,74,0.38))]" />

      <main className="relative flex min-h-screen items-start justify-center px-4 py-8 md:px-6 md:py-10">
        <div className="w-full max-w-6xl">
          <div className="mx-auto max-w-3xl pt-4 text-center text-white md:pt-2">
            <img
              src="/branding/mwos-fc-300-2.png"
              alt="MWOS logo"
              className="mx-auto h-20 w-20 rounded-full border border-white/20 bg-white/10 p-0.5 shadow-[0_18px_45px_rgba(12,16,53,0.28)]"
            />
            <p className="mt-4 text-[11px] font-black uppercase tracking-[0.34em] text-white/68">
              MWOS Football Club
            </p>
            <p className="mt-2 mwos-display text-2xl uppercase leading-none tracking-[0.14em] text-white">
              Scouting Network
            </p>
            <p className="mt-5 mwos-display text-4xl uppercase leading-[0.92] tracking-[0.07em] text-white md:text-5xl">
              Elite match reporting for MWOS scouts.
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-white/82 md:text-[15px]">
              Build structured reports, review players, attach handwritten notes and keep the full scouting workflow in one branded workspace.
            </p>
          </div>

          <div className="mx-auto mt-6 max-w-3xl">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { icon: FileText, label: 'Match Reports' },
                { icon: Users, label: 'Team Sheets' },
                { icon: ShieldCheck, label: 'Admin Oversight' },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="rounded-[22px] border border-white/12 bg-white/10 p-4 text-white shadow-[0_20px_40px_rgba(12,16,53,0.16)] backdrop-blur-sm"
                >
                  <Icon size={18} />
                  <p className="mt-3 text-sm font-black uppercase tracking-[0.16em] text-white/92">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-5 w-full max-w-xl">
            <div className="overflow-hidden rounded-[32px] border border-white/12 bg-white/94 shadow-[0_34px_90px_rgba(12,16,53,0.34)] backdrop-blur-xl">
              <div className="p-6 md:p-7">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-2xl bg-[var(--color-accent)]/10 p-3 text-sm font-semibold text-[var(--color-accent)]">
                      {error}
                    </div>
                  )}
                  {info && (
                    <div className="rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                      {info}
                    </div>
                  )}

                  {!isLogin && (
                    <>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-[var(--color-dark)]">Full Name</label>
                        <input
                          required
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full rounded-2xl border border-[var(--color-mid)]/30 p-3 outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-[var(--color-dark)]">Organization</label>
                        <input
                          type="text"
                          value={organization}
                          onChange={(e) => setOrganization(e.target.value)}
                          className="w-full rounded-2xl border border-[var(--color-mid)]/30 p-3 outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-[var(--color-dark)]">Account Type</label>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setRequestedRole('Scout')}
                            className={`rounded-2xl border p-4 text-left transition-all ${
                              requestedRole === 'Scout'
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                                : 'border-[var(--color-mid)]/20 bg-white hover:border-[var(--color-primary)]/40'
                            }`}
                          >
                            <p className="text-sm font-black uppercase tracking-wider text-[var(--color-dark)]">Scout</p>
                            <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">
                              Standard account for creating and managing your own reports.
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRequestedRole('Admin')}
                            className={`rounded-2xl border p-4 text-left transition-all ${
                              requestedRole === 'Admin'
                                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                                : 'border-[var(--color-mid)]/20 bg-white hover:border-[var(--color-accent)]/40'
                            }`}
                          >
                            <p className="text-sm font-black uppercase tracking-wider text-[var(--color-dark)]">Admin</p>
                            <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">
                              Visible here, but granted later by an existing admin.
                            </p>
                          </button>
                        </div>
                        <div className="mt-3 rounded-2xl bg-[var(--color-light)] p-3 text-xs font-semibold text-[var(--color-mid)]">
                          {requestedRole === 'Admin'
                            ? 'New sign-ups are still created as Scout for security. An existing admin must promote the account later.'
                            : 'Scout accounts can create and manage their own reports immediately after sign up.'}
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[var(--color-dark)]">Email</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border border-[var(--color-mid)]/30 p-3 outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[var(--color-dark)]">Password</label>
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-[var(--color-mid)]/30 p-3 outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-[var(--color-primary)] py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-opacity-92"
                  >
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError('');
                      setInfo('');
                      setRequestedRole('Scout');
                    }}
                    className="text-sm font-semibold text-[var(--color-mid)] transition-colors hover:text-[var(--color-primary)]"
                  >
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                </div>

                {isLogin && (
                  <div className="mt-4 rounded-2xl bg-[var(--color-light)] p-4 text-center text-xs text-[var(--color-mid)]">
                    <p>Authentication is handled by Supabase.</p>
                    <p className="mt-1">If sign-up does not log you in instantly, disable email confirmation or confirm the email first.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
