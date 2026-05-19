import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bus, CalendarRange, FileText, Info, Share2, ShieldCheck, X } from 'lucide-react';
import { requestPasswordReset, signIn, signUp } from '../lib/data';
import { useAuthStore } from '../store/auth';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('reset') === 'success') {
      setInfo('Password updated. Sign in with your new password.');
      setIsLogin(true);
      setIsRecoveryMode(false);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('reset');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const userAgent = nav.userAgent || '';
    const isIos =
      /iphone|ipad|ipod/i.test(userAgent) ||
      (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
    const isSmallScreen = window.matchMedia('(max-width: 767px)').matches;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;

    setShowInstallGuide((isIos || isSmallScreen) && !isStandalone);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const formData = new FormData(e.currentTarget);
    const submittedEmail = String(formData.get('email') ?? email).trim();
    const submittedPassword = String(formData.get('password') ?? password);
    const submittedName = String(formData.get('name') ?? name).trim();
    const submittedOrganization = String(formData.get('organization') ?? organization).trim();

    setEmail(submittedEmail);
    setPassword(submittedPassword);
    setName(submittedName);
    setOrganization(submittedOrganization);

    try {
      if (isRecoveryMode) {
        await requestPasswordReset(submittedEmail);
        setInfo('Password reset link sent. Check your email and open the link on this device.');
        return;
      }

      if (isLogin) {
        const data = await signIn(submittedEmail, submittedPassword);
        setAuth(data.user, data.session);
        navigate('/');
        return;
      }

      const data = await signUp(submittedEmail, submittedPassword, submittedName, submittedOrganization);

      if (data.emailConfirmationRequired) {
        setInfo('Account created. Confirm your email, then your club admin can assign your access.');
        setIsLogin(true);
        return;
      }

      setAuth(data.user, data.session);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="mwos-auth-shell relative min-h-dvh overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: "url('/branding/att.AGuDIc57f42thGuMeUSyrotRD6Zy0fxGX1rynzNNmWM.JPG')" }}
      />
      <div className="mwos-subtle-grid absolute inset-0 opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(190,23,23,0.24),transparent_28%),linear-gradient(180deg,rgba(16,20,74,0.22),rgba(16,20,74,0.38))]" />

      <main className="relative flex min-h-dvh items-start justify-center px-4 py-6 md:px-6 md:py-10">
        <div className="w-full max-w-6xl">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 lg:gap-6">
            <div className="order-1 mx-auto w-full max-w-xl md:order-2">
              <div className="mb-3 flex items-center justify-center md:hidden">
                <img
                  src="/branding/mwos-fc-300-2.png"
                  alt="MWOS logo"
                  className="h-14 w-14 rounded-full border border-white/20 bg-white/10 p-0.5 shadow-[0_18px_45px_rgba(12,16,53,0.28)]"
                />
              </div>

              <div className="mb-3 text-center text-white md:hidden">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/68">
                  MWOS Football Club
                </p>
                <p className="mt-2 mwos-display text-xl uppercase leading-none tracking-[0.12em] text-white">
                  Club Management
                </p>
              </div>

              <div className="overflow-hidden rounded-[28px] border border-white/12 bg-white/94 shadow-[0_34px_90px_rgba(12,16,53,0.34)] backdrop-blur-xl">
                <div className="p-5 md:p-7">
                  {showInstallGuide ? (
                    <div className="mb-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsInstallGuideOpen(true)}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/16 bg-[var(--color-light)] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--color-primary)] shadow-sm"
                      >
                        <Info size={16} />
                        Install help
                      </button>
                    </div>
                  ) : null}

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

                    {!isLogin && !isRecoveryMode && (
                      <>
                        <div>
                          <label htmlFor="signup-name" className="mb-1 block text-sm font-semibold text-[var(--color-dark)]">Full Name</label>
                          <input
                            id="signup-name"
                            required
                            name="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoComplete="name"
                            className="w-full rounded-2xl border border-[var(--color-mid)]/30 p-3 outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                          />
                        </div>
                        <div>
                          <label htmlFor="signup-organization" className="mb-1 block text-sm font-semibold text-[var(--color-dark)]">Organization</label>
                          <input
                            id="signup-organization"
                            name="organization"
                            type="text"
                            value={organization}
                            onChange={(e) => setOrganization(e.target.value)}
                            autoComplete="organization"
                            className="w-full rounded-2xl border border-[var(--color-mid)]/30 p-3 outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                          />
                        </div>
                        <div className="rounded-2xl bg-[var(--color-light)] p-3 text-xs font-semibold text-[var(--color-mid)]">
                          Club access is assigned after account creation. The same login can later receive one or more roles and team assignments.
                        </div>
                      </>
                    )}

                    <div>
                      <label htmlFor="auth-email" className="mb-1 block text-sm font-semibold text-[var(--color-dark)]">Email</label>
                      <input
                        id="auth-email"
                        required
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        className="w-full rounded-2xl border border-[var(--color-mid)]/30 p-3 outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                      />
                    </div>

                    {!isRecoveryMode && (
                      <div>
                        <label htmlFor="auth-password" className="mb-1 block text-sm font-semibold text-[var(--color-dark)]">Password</label>
                        <input
                          id="auth-password"
                          required
                          name="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete={isLogin ? 'current-password' : 'new-password'}
                          className="w-full rounded-2xl border border-[var(--color-mid)]/30 p-3 outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-[var(--color-primary)] py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-opacity-92"
                    >
                      {isRecoveryMode ? 'Send Reset Link' : isLogin ? 'Log In' : 'Create Account'}
                    </button>
                  </form>

                  <div className="mt-5 text-center">
                    {isLogin && !isRecoveryMode ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsRecoveryMode(true);
                          setError('');
                          setInfo('');
                        }}
                        className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-accent)]"
                      >
                        Forgot password?
                      </button>
                    ) : null}

                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRecoveryMode(false);
                          setIsLogin(!isLogin || isRecoveryMode);
                          setError('');
                          setInfo('');
                        }}
                        className="text-sm font-semibold text-[var(--color-mid)] transition-colors hover:text-[var(--color-primary)]"
                      >
                        {isRecoveryMode
                          ? 'Back to log in'
                          : isLogin
                            ? "Don't have an account? Sign up"
                            : 'Already have an account? Log in'}
                      </button>
                    </div>

                    {isRecoveryMode ? (
                      <p className="mt-3 text-xs font-semibold text-[var(--color-mid)]">
                        Forgot email? Ask your club admin or the person who created the account.
                      </p>
                    ) : null}

                  </div>
                </div>
              </div>

              {showInstallGuide && isInstallGuideOpen ? (
                <div
                  className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 sm:items-center sm:p-4"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="install-guide-title"
                >
                  <div className="w-full max-w-md rounded-[28px] bg-white p-5 text-[var(--color-dark)] shadow-2xl">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
                          Install app
                        </p>
                        <h2 id="install-guide-title" className="mt-2 text-balance text-2xl font-black">
                          Add MWOS to your phone
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsInstallGuideOpen(false)}
                        className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-mid)]/16 bg-[var(--color-light)] text-[var(--color-mid)]"
                        aria-label="Close install help"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="mt-5 space-y-3 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                      <div className="rounded-[20px] border border-[var(--color-primary)]/12 bg-[var(--color-light)] p-4">
                        <p className="font-black text-[var(--color-dark)]">iPhone / Safari</p>
                        <p className="mt-1 text-pretty">
                          Open this site in Safari, tap Share, then choose Add to Home Screen.
                        </p>
                      </div>
                      <div className="rounded-[20px] border border-[var(--color-primary)]/12 bg-white p-4">
                        <p className="font-black text-[var(--color-dark)]">Android / Chrome</p>
                        <p className="mt-1 text-pretty">
                          Tap the browser menu, then choose Install app or Add to Home screen.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsInstallGuideOpen(false)}
                      className="mt-5 w-full rounded-2xl bg-[var(--color-primary)] py-3 text-sm font-black text-white shadow-md"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="order-2 w-full md:order-1">
              <div className="mx-auto max-w-3xl pt-1 text-center text-white lg:pt-2">
                <img
                  src="/branding/mwos-fc-300-2.png"
                  alt="MWOS logo"
                  className="mx-auto hidden h-20 w-20 rounded-full border border-white/20 bg-white/10 p-0.5 shadow-[0_18px_45px_rgba(12,16,53,0.28)] md:block"
                />
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.32em] text-white/68 md:mt-4 md:text-[11px] md:tracking-[0.34em]">
                  MWOS Football Club
                </p>
                <p className="mt-2 mwos-display text-lg uppercase leading-none tracking-[0.12em] text-white md:text-2xl md:tracking-[0.14em]">
                  Club Management
                </p>
                <p className="mt-4 mwos-display text-[2rem] uppercase leading-[0.94] tracking-[0.05em] text-white md:mt-5 md:text-5xl md:tracking-[0.07em]">
                  One workspace for the whole MWOS staff.
                </p>
                <p className="mx-auto mt-3 max-w-xl text-xs font-semibold leading-6 text-white/82 md:text-[15px]">
                  Plan training, coordinate transport, manage scouting reports and keep coaches, drivers and leadership aligned in one branded club system.
                </p>
              </div>

              <div className="mx-auto mt-4 max-w-3xl md:mt-6">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
                  {[
                    { icon: CalendarRange, label: 'Training Schedule' },
                    { icon: Bus, label: 'Transport Plans' },
                    { icon: FileText, label: 'Scouting Reports' },
                    { icon: ShieldCheck, label: 'Admin Oversight' },
                  ].map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center justify-center rounded-[20px] border border-white/12 bg-white/10 p-3.5 text-center text-white shadow-[0_20px_40px_rgba(12,16,53,0.16)] backdrop-blur-sm sm:items-start sm:justify-start sm:text-left lg:rounded-[22px] lg:p-4"
                    >
                      <Icon size={17} />
                      <p className="mt-2.5 text-xs font-black uppercase tracking-[0.15em] text-white/92 lg:mt-3 lg:text-sm lg:tracking-[0.16em]">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
