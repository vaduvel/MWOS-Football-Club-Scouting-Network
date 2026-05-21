import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bus, CalendarRange, FileText, Info, Share2, ShieldCheck, X } from 'lucide-react';
import BrandSplashScreen from '../components/BrandSplashScreen';
import { requestPasswordReset, signIn, signUp } from '../lib/data';
import { useAuthStore } from '../store/auth';

const LOGIN_ENTRY_SPLASH_MS = 1800;

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [showEntrySplash, setShowEntrySplash] = useState(false);
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

  useEffect(() => {
    setShowEntrySplash(true);

    const timeoutId = window.setTimeout(() => {
      setShowEntrySplash(false);
    }, LOGIN_ENTRY_SPLASH_MS);

    return () => window.clearTimeout(timeoutId);
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
        sessionStorage.setItem('mwos-post-login-splash', '1');
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

      sessionStorage.setItem('mwos-post-login-splash', '1');
      setAuth(data.user, data.session);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (showEntrySplash) {
    return (
      <BrandSplashScreen
        eyebrow="MWOS Football Club"
        message="Preparing your club workspace…"
      />
    );
  }

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
                        className="mwos-pill mwos-pill-training shadow-sm"
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
                      <div className="mwos-card-tone-training rounded-2xl border p-3 text-sm font-semibold text-[var(--color-primary-deep)]">
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
                            className="mwos-mobile-input"
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
                            className="mwos-mobile-input"
                          />
                        </div>
                        <div className="mwos-mobile-note text-xs">
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
                        className="mwos-mobile-input"
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
                          className="mwos-mobile-input"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      className="mwos-btn mwos-btn-primary w-full"
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
                <p className="mwos-hero-kicker mt-3 text-white/68 md:mt-4">
                  MWOS Football Club
                </p>
                <p className="mt-2 mwos-display text-lg uppercase leading-none tracking-[0.12em] text-white md:text-2xl md:tracking-[0.14em]">
                  Club Management
                </p>
                <p className="mwos-display mwos-hero-title mt-4 text-white md:mt-5">
                  One workspace for the whole MWOS staff.
                </p>
                <p className="mwos-hero-copy mx-auto mt-3 max-w-xl text-white/82">
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
