import { format, parseISO } from 'date-fns';
import {
  ArrowRight,
  Bus,
  CalendarRange,
  ClipboardList,
  FileText,
  Mail,
  Shield,
  Users,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import AppSidebar from '../components/AppSidebar';
import OversightAttentionList from '../components/oversight/OversightAttentionList';
import OversightMetricStrip from '../components/oversight/OversightMetricStrip';
import OversightTeamMatrix from '../components/oversight/OversightTeamMatrix';
import {
  fetchOversightWorkspace,
  type OversightRecentReport,
  type OversightRoleSummary,
  type OversightStaffingHealth,
  type OversightTransportItem,
  type OversightWorkspace,
} from '../lib/oversightData';
import {
  canManageOversightTransport,
  canManageStaffAccess,
  canSeeStaffCoverage,
  getLeadershipWorkspaceMode,
  getOversightHeroCopy,
} from '../lib/leadershipWorkspaceDomain';
import {
  type StaffAccessEventRecord,
  canAccessScoutingModule,
  canAccessTrainingModule,
  canAccessTransportModule,
  cancelStaffInvitation,
  resendStaffInvitation,
  userHasAnyRole,
  type StaffInvitationRecord,
} from '../lib/data';
import { buildStaffingHealthCards } from '../lib/staffAccessActivityDomain';
import type { TrainingPlanSummary } from '../lib/trainingData';
import { changeTransportPlanStatus } from '../lib/transportData';
import { useAuthStore } from '../store/auth';

type FeedTone = 'neutral' | 'training' | 'transport' | 'reports' | 'alerts' | 'staff';

function formatIsoDate(value: string | null | undefined) {
  if (!value) return 'Not scheduled';

  try {
    return format(parseISO(value), 'EEE, d MMM');
  } catch {
    return value;
  }
}

function formatTimeValue(value: string | null | undefined) {
  return value?.trim() ? value : 'Time not set';
}

function formatRoleLabelCount(label: string, count: number) {
  return `${count} ${label}${count === 1 ? '' : 's'}`;
}

function FeedShell({
  title,
  description,
  icon: Icon,
  tone = 'neutral',
  children,
}: {
  title: string;
  description: string;
  icon: typeof CalendarRange;
  tone?: FeedTone;
  children: ReactNode;
}) {
  const shellTone =
    tone === 'training'
      ? 'mwos-card-tone-training'
      : tone === 'transport'
        ? 'mwos-card-tone-transport'
        : tone === 'reports'
          ? 'mwos-card-tone-report'
          : tone === 'alerts'
            ? 'mwos-card-tone-alert'
            : tone === 'staff'
              ? 'mwos-card-tone-staff'
              : 'border-[var(--color-mid)]/16 bg-white';
  const iconTone =
    tone === 'training'
      ? 'mwos-icon-tone-training'
      : tone === 'transport'
        ? 'mwos-icon-tone-transport'
        : tone === 'reports'
          ? 'mwos-icon-tone-report'
          : tone === 'alerts'
            ? 'mwos-icon-tone-alert'
            : tone === 'staff'
              ? 'mwos-icon-tone-staff'
              : 'bg-[var(--color-primary)]/8 text-[var(--color-primary)]';

  return (
    <article className={`rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5 ${shellTone}`}>
      <div className="flex items-start gap-3 md:gap-4">
        <div className={`flex size-10 items-center justify-center rounded-2xl md:size-12 ${iconTone}`}>
          <Icon size={22} />
        </div>
        <div>
          <h2 className="text-lg font-black text-[var(--color-dark)] md:text-xl">{title}</h2>
          <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)] md:leading-7">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </article>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-mid)]/18 bg-[var(--color-light)]/55 p-5">
      <p className="text-sm font-semibold text-[var(--color-mid)]">{message}</p>
    </div>
  );
}

function RoleCoverageCard({ summary }: { summary: OversightRoleSummary }) {
  const items = [
    { label: 'Admin', value: summary.admins },
    { label: 'Technical Director', value: summary.technicalDirectors },
    { label: 'Coach', value: summary.coaches },
    { label: 'Driver', value: summary.drivers },
    { label: 'Scout', value: summary.scouts },
    { label: 'Board Observer', value: summary.boardObservers },
  ];

  return (
    <article className="mwos-card-tone-staff rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
      <div className="flex items-start gap-3 md:gap-4">
        <div className="mwos-icon-tone-staff flex size-10 items-center justify-center rounded-2xl md:size-12">
          <Users size={22} />
        </div>
        <div>
          <h2 className="text-lg font-black text-[var(--color-dark)] md:text-xl">Staff coverage</h2>
          <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)] md:leading-7">
            A quick view of role distribution across the club workspace.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/60 p-4"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">{item.label}</p>
            <p className="mt-2 text-lg font-black text-[var(--color-dark)]">{formatRoleLabelCount(item.label, item.value)}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function StaffingHealthCard({ summary }: { summary: OversightStaffingHealth }) {
  const cards = buildStaffingHealthCards(summary);

  return (
    <article className="mwos-card-tone-staff rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
      <div className="flex items-start gap-3 md:gap-4">
        <div className="mwos-icon-tone-staff flex size-10 items-center justify-center rounded-2xl md:size-12">
          <Shield size={22} />
        </div>
        <div>
          <h2 className="text-lg font-black text-[var(--color-dark)] md:text-xl">Staffing health</h2>
          <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)] md:leading-7">
            A quick read on access coverage, pending onboarding, and how much staff load is spread across teams.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/60 p-4"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">{card.label}</p>
            <p className="mt-2 text-lg font-black text-[var(--color-dark)]">{card.value}</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-mid)]">{card.detail}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function StaffAccessActivityFeed({ items }: { items: StaffAccessEventRecord[] }) {
  return (
    <FeedShell
      title="Recent staff access activity"
      description="The latest invite, access, and revocation actions from the admin surface."
      icon={ClipboardList}
      tone="staff"
    >
      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/65 p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black text-[var(--color-dark)]">{item.targetName}</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">{item.targetEmail}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] shadow-sm ${
                    item.tone === 'warning'
                      ? 'bg-amber-100 text-amber-800'
                      : item.tone === 'success'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-white text-[var(--color-dark)]'
                  }`}
                >
                  {item.title}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-dark)]">{item.detail}</p>
              <p className="mt-2 text-[11px] font-semibold text-[var(--color-mid)]">
                By {item.actorName} · {formatIsoDate(item.createdAt)}
              </p>
            </div>
          ))
        ) : (
          <EmptyState message="No recent access activity yet." />
        )}
      </div>
    </FeedShell>
  );
}

function TrainingFeed({ plans, interactive = true }: { plans: TrainingPlanSummary[]; interactive?: boolean }) {
  return (
    <FeedShell
      title="Current-week training"
      description="Published or in-progress weekly plans that leadership can review without entering the editor first."
      icon={CalendarRange}
      tone="training"
    >
      <div className="space-y-3">
        {plans.length > 0 ? (
          plans.map((plan) => (
            <div
              key={plan.id}
              className={`group flex items-start gap-3 rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/65 p-4 transition ${
                interactive ? 'hover:border-[var(--color-primary)]/22' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-black text-[var(--color-dark)]">{plan.teamName}</p>
                  <span className="rounded-full bg-[var(--color-primary)]/8 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-primary)]">
                    {plan.status}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                  {plan.headline || 'Training plan without headline yet.'}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-mid)]">
                  Week of {formatIsoDate(plan.weekStart)}
                </p>
              </div>
              {interactive ? (
                <ArrowRight size={16} className="mt-1 shrink-0 text-[var(--color-mid)] transition group-hover:translate-x-0.5" />
              ) : (
                <span className="mt-1 shrink-0 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-mid)]">
                  Read-only
                </span>
              )}
            </div>
          ))
        ) : (
          <EmptyState message="No current-week training plans yet." />
        )}
      </div>
    </FeedShell>
  );
}

function ReportsFeed({ items, interactive = true }: { items: OversightRecentReport[]; interactive?: boolean }) {
  return (
    <FeedShell
      title="Recent scouting activity"
      description="The latest reports produced across the club, so leadership can see where scouting output is active."
      icon={FileText}
      tone="reports"
    >
      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className={`group flex items-start gap-3 rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/65 p-4 transition ${
                interactive ? 'hover:border-[var(--color-primary)]/22' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-[var(--color-dark)]">{item.fixture}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{item.competition}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-mid)]">
                  {formatIsoDate(item.date)} · {item.ownerName}
                </p>
              </div>
              {interactive ? (
                <ArrowRight size={16} className="mt-1 shrink-0 text-[var(--color-mid)] transition group-hover:translate-x-0.5" />
              ) : (
                <span className="mt-1 shrink-0 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-mid)]">
                  Read-only
                </span>
              )}
            </div>
          ))
        ) : (
          <EmptyState message="No recent scouting reports available yet." />
        )}
      </div>
    </FeedShell>
  );
}

function InvitationFeedWithActions({
  items,
  busyKey,
  onResend,
  onCancel,
}: {
  items: StaffInvitationRecord[];
  busyKey: string | null;
  onResend: (invitationId: string) => void;
  onCancel: (invitationId: string) => void;
}) {
  return (
    <FeedShell
      title="Pending invitations"
      description="A quick admin-only view of staff invites that still need activation or follow-up."
      icon={Mail}
      tone="staff"
    >
      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/65 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[var(--color-dark)]">{item.fullName || item.email}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{item.email}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-mid)]">
                    Sent {formatIsoDate(item.createdAt)} · expires {formatIsoDate(item.expiresAt)}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-mid)]">
                    {item.roles.map((role) => role.label).join(', ') || 'No roles selected yet'}
                  </p>
                </div>
                <Link
                  to="/settings"
                  className="mt-1 shrink-0 text-[var(--color-mid)] transition hover:text-[var(--color-primary)]"
                >
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onResend(item.id)}
                  disabled={busyKey === `invite:resend:${item.id}`}
                  className="rounded-2xl border border-[var(--color-primary)]/18 bg-white px-3 py-2 text-sm font-bold text-[var(--color-primary)] transition hover:border-[var(--color-primary)]/32 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyKey === `invite:resend:${item.id}` ? 'Sending…' : 'Resend'}
                </button>
                <button
                  type="button"
                  onClick={() => onCancel(item.id)}
                  disabled={busyKey === `invite:cancel:${item.id}`}
                  className="rounded-2xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-700 transition hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyKey === `invite:cancel:${item.id}` ? 'Cancelling…' : 'Cancel'}
                </button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState message="No pending invitations right now." />
        )}
      </div>
    </FeedShell>
  );
}

function TransportFeedWithActions({
  items,
  canManage,
  interactive = true,
  busyKey,
  onComplete,
  onCancel,
}: {
  items: OversightTransportItem[];
  canManage: boolean;
  interactive?: boolean;
  busyKey: string | null;
  onComplete: (planId: string) => void;
  onCancel: (planId: string) => void;
}) {
  return (
    <FeedShell
      title="Upcoming transport"
      description="Trips that leadership may need to monitor for timing, destination, and driver coverage."
      icon={Bus}
      tone="transport"
    >
      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/65 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-[var(--color-dark)]">{item.teamName}</p>
                    <span className="rounded-full bg-[var(--color-accent)]/8 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-accent)]">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{item.title}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-mid)]">
                    {formatIsoDate(item.eventDate)} · {formatTimeValue(item.departureTime)} · {item.destination}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-mid)]">
                    Driver: {item.driverName}
                  </p>
                </div>
                {interactive ? (
                  <Link
                    to={`/transport?team=${item.teamId}`}
                    className="mt-1 shrink-0 text-[var(--color-mid)] transition hover:text-[var(--color-primary)]"
                  >
                    <ArrowRight size={16} />
                  </Link>
                ) : (
                  <span className="mt-1 shrink-0 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-mid)]">
                    Read-only
                  </span>
                )}
              </div>

              {canManage ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onComplete(item.id)}
                    disabled={busyKey === `transport:complete:${item.id}`}
                    className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-emerald-700 transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyKey === `transport:complete:${item.id}` ? 'Updating…' : 'Mark completed'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onCancel(item.id)}
                    disabled={busyKey === `transport:cancel:${item.id}`}
                    className="rounded-2xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-700 transition hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyKey === `transport:cancel:${item.id}` ? 'Cancelling…' : 'Cancel trip'}
                  </button>
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <EmptyState message="No upcoming transport plans right now." />
        )}
      </div>
    </FeedShell>
  );
}

function LeadershipReadOnlyNote() {
  return (
    <article className="mwos-card-tone-report rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
      <div className="flex items-start gap-3 md:gap-4">
        <div className="mwos-icon-tone-report flex size-10 items-center justify-center rounded-2xl md:size-12">
          <ClipboardList size={22} />
        </div>
        <div>
          <h2 className="text-lg font-black text-[var(--color-dark)] md:text-xl">Leadership read-only view</h2>
          <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)] md:leading-7">
            This role can review club readiness, transport and scouting output without touching staffing assignments or invitation handling.
          </p>
        </div>
      </div>
    </article>
  );
}

function OversightModeNote({ mode }: { mode: ReturnType<typeof getLeadershipWorkspaceMode> }) {
  if (mode === 'technical_director') {
    return (
      <article className="mwos-card-tone-training rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
        <div className="flex items-start gap-3 md:gap-4">
          <div className="mwos-icon-tone-training flex size-10 items-center justify-center rounded-2xl md:size-12">
            <ClipboardList size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-[var(--color-dark)] md:text-xl">Technical review mode</h2>
            <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)] md:leading-7">
              Use this leadership view to review training publication, transport readiness, and activity across all teams, then move into the planning modules when coaches need feedback or direction.
            </p>
          </div>
        </div>
      </article>
    );
  }

  if (mode === 'board_observer') {
    return (
      <article className="mwos-card-tone-alert rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
        <div className="flex items-start gap-3 md:gap-4">
          <div className="mwos-icon-tone-alert flex size-10 items-center justify-center rounded-2xl md:size-12">
            <ClipboardList size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-[var(--color-dark)] md:text-xl">Board briefing mode</h2>
            <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)] md:leading-7">
              This view stays read-only by design. It surfaces club progress, transport readiness, and recent football activity without exposing staffing or planning controls.
            </p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="mwos-card-tone-staff rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
      <div className="flex items-start gap-3 md:gap-4">
        <div className="mwos-icon-tone-staff flex size-10 items-center justify-center rounded-2xl md:size-12">
          <ClipboardList size={22} />
        </div>
        <div>
          <h2 className="text-lg font-black text-[var(--color-dark)] md:text-xl">Admin operations mode</h2>
          <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)] md:leading-7">
            Staff access, invitation follow-up, and transport interventions stay available here so club operations can be unblocked quickly.
          </p>
        </div>
      </div>
    </article>
  );
}

export default function OversightPage() {
  const { user, logout } = useAuthStore();
  const [workspace, setWorkspace] = useState<OversightWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function loadWorkspace() {
    const nextWorkspace = await fetchOversightWorkspace();
    setWorkspace(nextWorkspace);
  }

  useEffect(() => {
    if (!userHasAnyRole(user, ['admin', 'technical_director', 'board_observer'])) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    void (async () => {
      try {
        const nextWorkspace = await fetchOversightWorkspace();
        if (!isMounted) return;
        setWorkspace(nextWorkspace);
      } catch (loadError: any) {
        if (!isMounted) return;
        console.error('Failed to load oversight workspace.', loadError);
        setError(loadError.message || 'Failed to load oversight workspace.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const leadershipMode = getLeadershipWorkspaceMode(user?.roles || []);
  const heroCopy = getOversightHeroCopy(leadershipMode);
  const hasAccess = leadershipMode !== 'none';
  const canManageTransport = canManageOversightTransport(leadershipMode);
  const canSeeCoverage = canSeeStaffCoverage(leadershipMode);
  const canManageAccess = canManageStaffAccess(leadershipMode);
  const canOpenTraining = canAccessTrainingModule(user);
  const canOpenTransport = canAccessTransportModule(user);
  const canOpenScouting = canAccessScoutingModule(user);

  async function runAction(actionKey: string, work: () => Promise<string>) {
    setActionError('');
    setActionMessage('');
    setBusyKey(actionKey);

    try {
      const message = await work();
      await loadWorkspace();
      setActionMessage(message);
    } catch (mutationError: any) {
      console.error('Oversight action failed.', mutationError);
      setActionError(mutationError.message || 'The requested oversight action failed.');
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--color-light)] md:flex">
      <AppSidebar current="oversight" user={user} onLogout={() => void logout()} />

      <main className="flex-1 overflow-auto p-3 pb-28 md:p-6">
        <div className="mx-auto max-w-7xl space-y-5 md:space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/18 bg-white shadow-[0_20px_55px_rgba(49,39,131,0.08)]">
            <div className="mwos-ribbon-surface px-4 py-5 text-white md:px-8 md:py-8">
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/68">{heroCopy.eyebrow}</p>
              <div className="mt-4 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 text-white">
                  <Shield size={22} />
                </div>
                <div>
                  <h1 className="mwos-display text-balance text-[2rem] uppercase leading-none tracking-[0.08em] text-white md:text-[3.4rem]">
                    {heroCopy.title}
                  </h1>
                  <p className="mt-3 max-w-3xl text-pretty text-sm font-semibold leading-6 text-white/82 md:text-base md:leading-7">
                    {heroCopy.description}
                  </p>
                  {workspace ? (
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/62">
                      Current leadership week starts {formatIsoDate(workspace.weekStart)}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {!hasAccess ? (
            <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
              <p className="text-sm font-semibold text-[var(--color-mid)]">
                Your account does not currently have oversight access.
              </p>
            </section>
          ) : null}

          {loading ? (
            <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
              <p className="text-sm font-semibold text-[var(--color-mid)]">Loading leadership workspace…</p>
            </section>
          ) : null}

          {!loading && error ? (
            <section className="rounded-[28px] border border-red-200 bg-red-50 p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
              <p className="text-sm font-semibold text-red-700">{error}</p>
            </section>
          ) : null}

          {!loading && !error && actionMessage ? (
            <section className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
              <p className="text-sm font-semibold text-emerald-700">{actionMessage}</p>
            </section>
          ) : null}

          {!loading && !error && actionError ? (
            <section className="rounded-[28px] border border-red-200 bg-red-50 p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
              <p className="text-sm font-semibold text-red-700">{actionError}</p>
            </section>
          ) : null}

          {!loading && !error && workspace ? (
            <>
              <OversightMetricStrip metrics={workspace.metrics} />

              <OversightModeNote mode={leadershipMode} />

              <section className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
                <OversightAttentionList items={workspace.attentionItems} />
                {canSeeCoverage && workspace.roleSummary && workspace.staffingHealth ? (
                  <div className="grid gap-4">
                    <RoleCoverageCard summary={workspace.roleSummary} />
                    <StaffingHealthCard summary={workspace.staffingHealth} />
                  </div>
                ) : (
                  <LeadershipReadOnlyNote />
                )}
              </section>

              <OversightTeamMatrix teams={workspace.teamSnapshots} />

              <section className="grid gap-4 xl:grid-cols-2">
                <TrainingFeed plans={workspace.currentWeekTrainingPlans} interactive={canOpenTraining} />
                <TransportFeedWithActions
                  items={workspace.upcomingTransport}
                  canManage={canManageTransport}
                  interactive={canOpenTransport}
                  busyKey={busyKey}
                  onComplete={(planId) =>
                    void runAction(`transport:complete:${planId}`, async () => {
                      await changeTransportPlanStatus(planId, 'complete');
                      return 'Transport plan marked as completed.';
                    })}
                  onCancel={(planId) =>
                    void runAction(`transport:cancel:${planId}`, async () => {
                      await changeTransportPlanStatus(planId, 'cancel');
                      return 'Transport plan cancelled from leadership workspace.';
                    })}
                />
                <ReportsFeed items={workspace.recentReports} interactive={canOpenScouting} />
                {canManageAccess && workspace.canSeeInvitationFeed ? (
                  <InvitationFeedWithActions
                    items={workspace.pendingInvitations}
                    busyKey={busyKey}
                    onResend={(invitationId) =>
                      void runAction(`invite:resend:${invitationId}`, async () => {
                        const response = await resendStaffInvitation(invitationId);
                        return response.message || 'Invitation resent.';
                      })}
                    onCancel={(invitationId) =>
                      void runAction(`invite:cancel:${invitationId}`, async () => {
                        const response = await cancelStaffInvitation(invitationId);
                        return response.message || 'Invitation cancelled.';
                      })}
                  />
                ) : (
                  <LeadershipReadOnlyNote />
                )}
                {canManageAccess ? (
                  <StaffAccessActivityFeed items={workspace.recentStaffAccessEvents} />
                ) : (
                  <LeadershipReadOnlyNote />
                )}
              </section>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
