import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  acceptStaffInvitation,
  fetchInvitationSummary,
  getSessionWithProfile,
  updatePassword,
  type AcceptInvitationSummary,
} from '../lib/data';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';

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
  const [info, setInfo] = useState('');
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

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
        setError('This activation session is missing or expired. Open the latest invitation link on this device, or ask an admin to send you a fresh activation link.');
        setCheckingSession(false);
        return;
      }

      try {
        const summary = await fetchInvitationSummary(invitationToken);
        if (!mounted) return;
        setInvitation(summary);
        setReady(summary.status === 'pending');
        if (summary.status === 'accepted' || summary.status === 'applied_existing') {
          setInfo('This invitation was already completed. Sign in with your password to enter the club workspace.');
        } else if (summary.status === 'cancelled') {
          setInfo('This invitation was cancelled by an admin. Ask for a new invite if you still need access.');
        } else if (summary.status === 'expired') {
          setInfo('This invitation expired. Ask an admin to resend it.');
        }
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message || 'Failed to load the invitation.');
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
    setInfo('');

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
      const result = await acceptStaffInvitation(invitationToken);
      const authState = await getSessionWithProfile();
      setAuth(authState.user, authState.session);
      if (result.message) {
        setInfo(result.message);
      }
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Could not activate the invitation.');
    } finally {
      setSubmitting(false);
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

      <main className="relative flex min-h-screen items-center justify-center px-4 py-6 md:px-6 md:py-10">
        <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/12 bg-white/94 shadow-[0_34px_90px_rgba(12,16,53,0.34)] backdrop-blur-xl">
          <div className="p-5 md:p-7">
            <div className="mb-6 text-center">
              <img
                src="/branding/mwos-fc-300-2.png"
                alt="MWOS logo"
                className="mx-auto h-14 w-14 rounded-full border border-white/20 bg-[var(--color-primary)]/5 p-0.5 shadow-[0_18px_45px_rgba(12,16,53,0.18)]"
              />
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-mid)]">
                MWOS Football Club
              </p>
              <h1 className="mt-2 mwos-display text-3xl uppercase tracking-[0.06em] text-[var(--color-dark)]">
                Accept Invitation
              </h1>
              <p className="mt-3 text-sm font-semibold text-[var(--color-mid)]">
                Complete your club access and set the password for this account.
              </p>
            </div>

            {checkingSession ? (
              <div className="flex items-center justify-center gap-3 rounded-2xl bg-[var(--color-light)] px-4 py-5 text-sm font-semibold text-[var(--color-mid)]">
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
                {info && (
                  <div className="mb-4 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                    {info}
                  </div>
                )}

                {invitation ? (
                  <div className="mb-5 rounded-[24px] border border-[var(--color-mid)]/16 bg-[var(--color-light)]/45 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
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
                      <label className="mb-1 block text-sm font-semibold text-[var(--color-dark)]">New Password</label>
                      <input
                        required
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="new-password"
                        className="w-full rounded-2xl border border-[var(--color-mid)]/30 p-3 outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-[var(--color-dark)]">Confirm Password</label>
                      <input
                        required
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        autoComplete="new-password"
                        className="w-full rounded-2xl border border-[var(--color-mid)]/30 p-3 outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-opacity-92 disabled:opacity-60"
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
                      className="rounded-2xl bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-opacity-92"
                    >
                      {invitation?.status === 'accepted' || invitation?.status === 'applied_existing' ? 'Open Login' : 'Back to Login'}
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
