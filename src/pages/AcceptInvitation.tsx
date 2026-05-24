import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  acceptStaffInvitation,
  fetchInvitationSummary,
  getPrimaryRoleSlug,
  getSessionWithProfile,
  updatePassword,
  type AcceptInvitationSummary,
} from '../lib/data';
import {
  getInvitationStatusNotice,
  mapAcceptInvitationError,
  parseAcceptInvitationHash,
  type AcceptInvitationNotice,
} from '../lib/acceptInvitationDomain';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';

const DEFAULT_INVITATION_BACKGROUND = '/branding/att.AGuDIc57f42thGuMeUSyrotRD6Zy0fxGX1rynzNNmWM.JPG';

function getInvitationBackground(invitation: AcceptInvitationSummary | null) {
  const primaryRole = getPrimaryRoleSlug({
    roles: invitation?.roles.map((role) => role.slug) || [],
  });

  switch (primaryRole) {
    case 'coach':
      return '/branding/onboarding/coach.jpg';
    case 'driver':
      return '/branding/onboarding/driver.jpg';
    case 'admin':
    case 'executive_director':
    case 'technical_director':
    case 'board_observer':
      return '/branding/onboarding/admin.jpg';
    case 'scout':
      return '/branding/onboarding/players.jpg';
    default:
      return DEFAULT_INVITATION_BACKGROUND;
  }
}

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('invitation') || '';
  const [invitation, setInvitation] = useState<AcceptInvitationSummary | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<AcceptInvitationNotice | null>(null);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const invitationBackground = getInvitationBackground(invitation);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      if (!invitationToken) {
        if (mounted) {
          setError('This invitation link is missing the invitation token.');
          setCheckingSession(false);
        }
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (sessionError) {
        setError(sessionError.message);
        setCheckingSession(false);
        return;
      }

      if (!session) {
        const hashNotice = typeof window !== 'undefined' ? parseAcceptInvitationHash(window.location.hash) : null;
        setError('This activation session is missing or expired. Open the latest invitation link on this device, or ask an admin to send you a fresh activation link.');
        if (hashNotice) {
          setNotice(hashNotice);
          setError('');
        }
        setCheckingSession(false);
        return;
      }

      try {
        const summary = await fetchInvitationSummary(invitationToken);
        if (!mounted) return;
        setInvitation(summary);
        setReady(summary.status === 'pending');
        setNotice(getInvitationStatusNotice(summary.status));
      } catch (err: any) {
        if (!mounted) return;
        setError(mapAcceptInvitationError(err.message || 'Failed to load the invitation.'));
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [invitationToken]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice(null);

    if (password.length < 8) {
      setError('Use at least 8 characters for the new password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      await updatePassword(password);
      await acceptStaffInvitation(invitationToken);
      const authState = await getSessionWithProfile();
      setAuth(authState.user, authState.session);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Could not activate the invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mwos-auth-shell relative min-h-dvh overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url('${invitationBackground}')` }}
      />
      <div className="mwos-subtle-grid absolute inset-0 opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(190,23,23,0.24),transparent_28%),linear-gradient(180deg,rgba(16,20,74,0.22),rgba(16,20,74,0.38))]" />

      <main className="relative flex min-h-dvh items-center justify-center px-4 py-6 md:px-6 md:py-10">
        <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/12 bg-white/94 shadow-[0_34px_90px_rgba(12,16,53,0.34)] backdrop-blur-xl">
          <div className="p-5 md:p-7">
            <div className="mb-6 text-center">
              <img
                src="/branding/mwos-fc-300-2.png"
                alt="MWOS logo"
                className="mx-auto h-14 w-14 rounded-full border border-white/20 bg-[var(--color-primary)]/5 p-0.5 shadow-[0_18px_45px_rgba(12,16,53,0.18)]"
              />
              <p className="mwos-hero-kicker mt-4 text-[var(--color-mid)]">
                MWOS Football Club
              </p>
              <h1 className="mwos-display mwos-hero-title mt-2 text-[var(--color-dark)]">
                Accept Invitation
              </h1>
              <p className="mwos-hero-copy mt-3 text-[var(--color-mid)]">
                Complete your club access and set the password for this account.
              </p>
            </div>

            {checkingSession ? (
              <div className="mwos-mobile-note flex items-center justify-center gap-3 border-0 bg-[var(--color-light)] text-sm font-semibold text-[var(--color-mid)]">
                <Loader2 size={18} className="animate-spin" />
                Preparing your invitation...
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 rounded-2xl bg-[var(--color-accent)]/10 p-3 text-sm font-semibold text-[var(--color-accent)]">
                    {error}
                  </div>
                )}
                {notice && (
                  <div
                    className={`mb-4 rounded-2xl border p-4 text-sm ${
                      notice.tone === 'success'
                        ? 'mwos-card-tone-training text-[var(--color-primary-deep)]'
                        : notice.tone === 'warning'
                          ? 'mwos-card-tone-alert text-[var(--color-accent-deep)]'
                          : 'border-[var(--color-mid)]/16 bg-[var(--color-light)] text-[var(--color-dark)]'
                    }`}
                  >
                    <p className="font-black">{notice.title}</p>
                    <p className="mt-1 font-semibold leading-6">{notice.message}</p>
                  </div>
                )}

                {invitation ? (
                  <div className="mwos-mobile-panel-soft mb-5">
                    <p className="mwos-subcard-kicker">
                      Invitation Summary
                    </p>
                    <div className="mt-3 space-y-2 text-sm font-semibold text-[var(--color-dark)]">
                      <p><span className="text-[var(--color-mid)]">Email:</span> {invitation.email}</p>
                      <p><span className="text-[var(--color-mid)]">Name:</span> {invitation.fullName}</p>
                      <p><span className="text-[var(--color-mid)]">Status:</span> {invitation.statusLabel}</p>
                      <p><span className="text-[var(--color-mid)]">Roles:</span> {invitation.roles.map((role) => role.label).join(', ') || 'None'}</p>
                      <p><span className="text-[var(--color-mid)]">Teams:</span> {invitation.teams.map((team) => team.name).join(', ') || 'Club-wide'}</p>
                    </div>
                  </div>
                ) : null}

                {ready ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="invite-password" className="mb-1 block text-sm font-semibold text-[var(--color-dark)]">New Password</label>
                      <input
                        id="invite-password"
                        required
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="new-password"
                        className="mwos-mobile-input"
                      />
                    </div>

                    <div>
                      <label htmlFor="invite-confirm-password" className="mb-1 block text-sm font-semibold text-[var(--color-dark)]">Confirm Password</label>
                      <input
                        id="invite-confirm-password"
                        required
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        autoComplete="new-password"
                        className="mwos-mobile-input"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="mwos-btn mwos-btn-primary w-full disabled:opacity-60"
                    >
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                      Activate Account
                    </button>
                  </form>
                ) : (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => navigate('/login', { replace: true })}
                      className="mwos-btn mwos-btn-primary px-5"
                    >
                      {notice?.ctaLabel || (invitation?.status === 'accepted' || invitation?.status === 'applied_existing' ? 'Open Login' : 'Back to Login')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
