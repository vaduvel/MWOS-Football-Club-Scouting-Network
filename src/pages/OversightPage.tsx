import { format, parseISO } from 'date-fns';
import {
  ArrowRight,
  Bus,
  CalendarRange,
  ClipboardList,
  FileText,
  Mail,
  Shield,
  Target,
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
      <div className="mwos-surface-intro">
        <div className={`mwos-surface-intro-icon flex size-10 items-center justify-center rounded-2xl md:size-12 ${iconTone}`}>
          <Icon size={22} />
        </div>
        <div className="mwos-surface-intro-copy">
          <h2 className="text-lg font-black text-[var(--color-dark)] md:text-xl">{title}</h2>
          <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)] md:leading-7">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </article>
  );
}

function EmptyState({
  message,
  tone = 'mwos-subcard-neutral',
}: {
  message: string;
  tone?: string;
}) {
  return (
    <div className={`mwos-subcard ${tone} border-dashed p-5`}>
      <p className="mwos-subcard-copy mt-0">{message}</p>
    </div>
  );
}

function RoleCoverageCard({ summary }: { summary: OversightRoleSummary }) {
  const items = [
    { label: 'Admin', value: summary.admins },
    { label: 'Executive Director', value: summary.executiveDirectors },
    { label: 'Technical Director', value: summary.technicalDirectors },
    { label: 'Coach', value: summary.coaches },
    { label: 'Driver', value: summary.drivers },
    { label: 'Scout', value: summary.scouts },
    { label: 'Board Observer', value: summary.boardObservers },
  ];
  const toneClasses = [
    'mwos-subcard-staff',
    'mwos-subcard-report',
    'mwos-subcard-training',
    'mwos-subcard-alert',
    'mwos-subcard-transport',
    'mwos-subcard-report',
    'mwos-subcard-neutral',
  ];

  return (
    <article className="mwos-card-tone-staff rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
      <div className="mwos-surface-intro">
        <div className="mwos-surface-intro-icon mwos-icon-tone-staff flex size-10 items-center justify-center rounded-2xl md:size-12">
          <Users size={22} />
        </div>
        <div className="mwos-surface-intro-copy">
          <h2 className="text-lg font-black text-[var(--color-dark)] md:text-xl">Staff coverage</h2>
          <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)] md:leading-7">
            A quick view of role distribution across the club workspace.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map((item, index) => (
          <div
            key={item.label}
            className={`mwos-subcard ${toneClasses[index % toneClasses.length]}`}
          >
            <p className="mwos-subcard-kicker">{item.label}</p>
            <p className="mwos-subcard-title mt-3">{formatRoleLabelCount(item.label, item.value)}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function StaffingHealthCard({ summary }: { summary: OversightStaffingHealth }) {
  const cards = buildStaffingHealthCards(summary);
  const toneClasses = ['mwos-subcard-staff', 'mwos-subcard-training', 'mwos-subcard-alert', 'mwos-subcard-report'];

  return (
    <article className="mwos-card-tone-staff rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
      <div className="mwos-surface-intro">
        <div className="mwos-surface-intro-icon mwos-icon-tone-staff flex size-10 items-center justify-center rounded-2xl md:size-12">
          <Shield size={22} />
        </div>
        <div className="mwos-surface-intro-copy">
          <h2 className="text-lg font-black text-[var(--color-dark)] md:text-xl">Staffing health</h2>
          <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)] md:leading-7">
            A quick read on access coverage, pending onboarding, and how much staff load is spread across teams.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {cards.map((card, index) => (
          <div
            key={card.label}
            className={`mwos-subcard ${toneClasses[index % toneClasses.length]}`}
          >
            <p className="mwos-subcard-kicker">{card.label}</p>
            <p className="mwos-subcard-value text-lg md:text-[1.75rem]">{card.value}</p>
            <p className="mwos-subcard-copy mt-2 text-sm leading-6">{card.detail}</p>
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
              className={`mwos-subcard ${
                item.tone === 'warning'
                  ? 'mwos-subcard-alert'
                  : item.tone === 'success'
                    ? 'mwos-subcard-success'
                    : 'mwos-subcard-staff'
              }`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="mwos-subcard-title mt-0">{item.targetName}</p>
                  <p className="mwos-subcard-meta mt-1 normal-case tracking-normal">{item.targetEmail}</p>
                </div>
                <span
                  className={`mwos-pill ${
                    item.tone === 'warning'
                      ? 'mwos-pill-alert'
                      : item.tone === 'success'
                        ? 'mwos-pill-success'
                        : 'mwos-pill-neutral'
                  }`}
                >
                  {item.title}
                </span>
              </div>
              <p className="mwos-subcard-copy mt-3 text-[var(--color-dark)]">{item.detail}</p>
              <p className="mwos-subcard-meta mt-2 normal-case tracking-normal">
                By {item.actorName} · {formatIsoDate(item.createdAt)}
              </p>
            </div>
          ))
        ) : (
          <EmptyState tone="mwos-subcard-staff" message="No recent access activity yet." />
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
              className={`mwos-subcard mwos-subcard-training ${interactive ? 'mwos-subcard-interactive' : ''} group flex items-start gap-3 transition ${
                interactive ? 'hover:border-[var(--color-primary)]/22' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="mwos-subcard-head">
                  <p className="mwos-subcard-title mt-0">{plan.teamName}</p>
                  <div className="mwos-subcard-badges">
                    <span className="mwos-pill mwos-pill-training">{plan.status}</span>
                  </div>
                </div>
                <p className="mwos-subcard-copy mt-2">
                  {plan.headline || 'Training plan without headline yet.'}
                </p>
                <p className="mwos-subcard-meta mt-2">
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
          <EmptyState tone="mwos-subcard-training" message="No current-week training plans yet." />
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
              className={`mwos-subcard mwos-subcard-report ${interactive ? 'mwos-subcard-interactive' : ''} group flex items-start gap-3 transition ${
                interactive ? 'hover:border-[var(--color-primary)]/22' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="mwos-subcard-title mt-0">{item.fixture}</p>
                <p className="mwos-subcard-copy mt-2">{item.competition}</p>
                <p className="mwos-subcard-meta mt-2">
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
          <EmptyState tone="mwos-subcard-report" message="No recent scouting reports available yet." />
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
              className="mwos-subcard mwos-subcard-staff"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="mwos-subcard-title mt-0">{item.fullName || item.email}</p>
                  <p className="mwos-subcard-copy mt-2">{item.email}</p>
                  <p className="mwos-subcard-meta mt-2">
                    Sent {formatIsoDate(item.createdAt)} · expires {formatIsoDate(item.expiresAt)}
                  </p>
                  <p className="mwos-subcard-copy mt-2">
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
                  className="mwos-btn mwos-btn-danger min-h-[2.5rem] px-3 py-2 text-sm"
                >
                  {busyKey === `invite:cancel:${item.id}` ? 'Cancelling…' : 'Cancel'}
                </button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState tone="mwos-subcard-staff" message="No pending invitations right now." />
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
              className="mwos-subcard mwos-subcard-transport"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mwos-subcard-head">
                    <p className="mwos-subcard-title mt-0">{item.teamName}</p>
                    <div className="mwos-subcard-badges">
                      <span className="mwos-pill mwos-pill-transport">{item.status}</span>
                    </div>
                  </div>
                  <p className="mwos-subcard-copy mt-2">{item.title}</p>
                  <p className="mwos-subcard-meta mt-2">
                    {formatIsoDate(item.eventDate)} · {formatTimeValue(item.departureTime)} · {item.destination}
                  </p>
                  <p className="mwos-subcard-copy mt-2">
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
                    className="mwos-btn mwos-btn-success min-h-[2.5rem] px-3 py-2 text-sm"
                  >
                    {busyKey === `transport:complete:${item.id}` ? 'Updating…' : 'Mark completed'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onCancel(item.id)}
                    disabled={busyKey === `transport:cancel:${item.id}`}
                    className="mwos-btn mwos-btn-danger min-h-[2.5rem] px-3 py-2 text-sm"
                  >
                    {busyKey === `transport:cancel:${item.id}` ? 'Cancelling…' : 'Cancel trip'}
                  </button>
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <EmptyState tone="mwos-subcard-transport" message="No upcoming transport plans right now." />
        )}
      </div>
    </FeedShell>
  );
}

function LeadershipReadOnlyNote() {
  return (
    <article className="mwos-card-tone-report rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
      <div className="mwos-surface-intro">
        <div className="mwos-surface-intro-icon mwos-icon-tone-report flex size-10 items-center justify-center rounded-2xl md:size-12">
          <ClipboardList size={22} />
        </div>
        <div className="mwos-surface-intro-copy">
          <h2 className="text-lg font-black text-[var(--color-dark)] md:text-xl">Leadership read-only view</h2>
          <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)] md:leading-7">
            This role can review club readiness, transport and scouting output without touching staffing assignments or invitation handling.
          </p>
        </div>
      </div>
    </article>
  );
}

function PlayerDevelopmentCard({ summary }: { summary: NonNullable<OversightWorkspace['playerDevelopment']> }) {
  const cards = [
    {
      label: 'Roster profiles',
      value: summary.internalRosterProfiles,
      helper: 'Internal players visible in Player Hub.',
    },
    {
      label: 'Linked scouting',
      value: summary.linkedScoutingProfiles,
      helper: 'Reports connected to real club players.',
    },
    {
      label: 'Roster gaps',
      value: summary.rosterWithoutScouting,
      helper: 'Players still waiting for a first report.',
    },
    {
      label: 'Executive shortlist',
      value: summary.executiveShortlist,
      helper: 'High-potential or trial-ready profiles.',
    },
  ];

  return (
    <section className="rounded-[28px] border border-[var(--color-primary)]/16 bg-[linear-gradient(180deg,rgba(49,39,131,0.06),rgba(255,255,255,1))] p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="mwos-surface-intro">
          <div className="mwos-surface-intro-icon mwos-icon-tone-report flex size-10 items-center justify-center rounded-2xl md:size-12">
            <Users size={22} />
          </div>
          <div className="mwos-surface-intro-copy">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-primary)]">
              Player development intelligence
            </p>
            <h2 className="mt-1 text-lg font-black text-[var(--color-dark)] md:text-xl">
              Roster, scouting and shortlist coverage
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">
              Wilson sees technical gaps in the roster record. Adrian sees which validated profiles are ready for strategic follow-up.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-primary)]/14 bg-white/82 px-4 py-3 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">Coverage</p>
          <p className="mt-1 text-2xl font-black text-[var(--color-primary)]">{summary.scoutingCoverageRate}%</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-[var(--color-mid)]/12 bg-white/84 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">{card.label}</p>
            <p className="mt-2 text-2xl font-black text-[var(--color-dark)]">{card.value}</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-mid)]">{card.helper}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function getPipelineToneClasses(tone: NonNullable<OversightWorkspace['globalScoutingPipeline']>['stageRows'][number]['tone']) {
  switch (tone) {
    case 'ready':
      return {
        card: 'border-[var(--color-primary)]/24 bg-[linear-gradient(180deg,rgba(49,39,131,0.12),rgba(255,255,255,0.92))]',
        pill: 'mwos-pill-success',
        bar: 'bg-[var(--color-primary)]',
      };
    case 'shortlist':
      return {
        card: 'border-[var(--color-primary)]/20 bg-[linear-gradient(180deg,rgba(49,39,131,0.10),rgba(255,255,255,0.94))]',
        pill: 'mwos-pill-staff',
        bar: 'bg-[var(--color-primary)]',
      };
    case 'review':
      return {
        card: 'border-[var(--color-accent)]/24 bg-[linear-gradient(180deg,rgba(190,23,23,0.10),rgba(255,255,255,0.94))]',
        pill: 'mwos-pill-alert',
        bar: 'bg-[var(--color-accent)]',
      };
    default:
      return {
        card: 'border-[var(--color-mid)]/14 bg-white/88',
        pill: 'mwos-pill-neutral',
        bar: 'bg-[var(--color-mid)]',
      };
  }
}

function GlobalScoutingPipelineCard({
  pipeline,
  canOpenScouting,
}: {
  pipeline: NonNullable<OversightWorkspace['globalScoutingPipeline']>;
  canOpenScouting: boolean;
}) {
  const trialReady = pipeline.stageRows.find((stage) => stage.key === 'trial_ready')?.count || 0;
  const shortlist = pipeline.stageRows.find((stage) => stage.key === 'executive_shortlist')?.count || 0;

  return (
    <section className="rounded-[28px] border border-[var(--color-primary)]/16 bg-[linear-gradient(180deg,rgba(49,39,131,0.07),rgba(255,255,255,0.96))] p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="mwos-surface-intro">
          <div className="mwos-surface-intro-icon mwos-icon-tone-report flex size-10 items-center justify-center rounded-2xl md:size-12">
            <Target size={22} />
          </div>
          <div className="mwos-surface-intro-copy">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-primary)]">
              Global scouting pipeline
            </p>
            <h2 className="mt-1 text-lg font-black text-[var(--color-dark)] md:text-xl">
              From local reports to executive action
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">
              Wilson can validate technical signals first. Adrian gets the candidates already moving toward shortlist or trial follow-up.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[20rem]">
          {[
            { label: 'Candidates', value: pipeline.totalCandidates },
            { label: 'Shortlist', value: shortlist },
            { label: 'Trial ready', value: trialReady },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-[var(--color-primary)]/14 bg-white/84 px-3 py-2">
              <p className="text-lg font-black text-[var(--color-dark)]">{item.value}</p>
              <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-mid)]">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--color-primary)]/12 bg-white/72 p-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
          {pipeline.executiveSignalLabel}
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {pipeline.priorityCandidates.length > 0 ? (
            pipeline.priorityCandidates.map((candidate) => (
              <div key={candidate.playerKey} className="rounded-2xl border border-[var(--color-mid)]/12 bg-white/86 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--color-dark)]">{candidate.name}</p>
                    <p className="mt-1 text-xs font-bold text-[var(--color-mid)]">{candidate.clubLabel}</p>
                  </div>
                  <span className="mwos-pill mwos-pill-staff shrink-0">{candidate.signalLabel}</span>
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-mid)]">
                  {candidate.bestPotential} · {candidate.averageScore.toFixed(1)} avg · {candidate.reportCount} reports
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm font-semibold text-[var(--color-mid)]">
              No high-priority candidate yet. New reports will appear here automatically.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-4">
        {pipeline.stageRows.map((stage) => {
          const tone = getPipelineToneClasses(stage.tone);

          return (
            <article key={stage.key} className={`rounded-3xl border p-3 ${tone.card}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">{stage.label}</p>
                  <p className="mt-1 text-2xl font-black text-[var(--color-dark)]">{stage.count}</p>
                </div>
                <span className={`mwos-pill ${tone.pill}`}>{stage.percent}%</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-mid)]/12">
                <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${stage.barPercent}%` }} />
              </div>
              <p className="mt-3 text-xs font-semibold leading-5 text-[var(--color-mid)]">{stage.description}</p>

              <div className="mt-3 space-y-2">
                {stage.candidates.length > 0 ? (
                  stage.candidates.map((candidate) => (
                    <div key={candidate.playerKey} className="rounded-2xl border border-white/70 bg-white/78 p-3">
                      <p className="truncate text-sm font-black text-[var(--color-dark)]">{candidate.name}</p>
                      <p className="mt-1 text-xs font-bold text-[var(--color-mid)]">
                        {candidate.clubLabel} · {candidate.bestPotential} · {candidate.averageScore.toFixed(1)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Link
                          to={`/players/${encodeURIComponent(candidate.playerKey)}`}
                          className="mwos-btn mwos-btn-tertiary min-h-[2rem] px-3 py-1.5 text-xs"
                        >
                          Profile
                        </Link>
                        {canOpenScouting && candidate.latestReportId ? (
                          <Link
                            to={`/scouting/report/${candidate.latestReportId}`}
                            className="mwos-btn mwos-btn-secondary min-h-[2rem] px-3 py-1.5 text-xs"
                          >
                            Report
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-[var(--color-mid)]/16 bg-white/58 p-3 text-xs font-semibold leading-5 text-[var(--color-mid)]">
                    No players in this stage yet.
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function OversightModeNote({ mode }: { mode: ReturnType<typeof getLeadershipWorkspaceMode> }) {
  if (mode === 'executive_director') {
    return (
      <article className="mwos-card-tone-report rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
        <div className="mwos-surface-intro">
          <div className="mwos-surface-intro-icon mwos-icon-tone-report flex size-10 items-center justify-center rounded-2xl md:size-12">
            <FileText size={22} />
          </div>
          <div className="mwos-surface-intro-copy">
            <h2 className="text-lg font-black text-[var(--color-dark)] md:text-xl">Executive development mode</h2>
            <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)] md:leading-7">
              This view keeps player intelligence, scouting activity, training coverage, and club readiness close together so strategic decisions are based on live football context.
            </p>
          </div>
        </div>
      </article>
    );
  }

  if (mode === 'technical_director') {
    return (
      <article className="mwos-card-tone-training rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
        <div className="mwos-surface-intro">
          <div className="mwos-surface-intro-icon mwos-icon-tone-training flex size-10 items-center justify-center rounded-2xl md:size-12">
            <ClipboardList size={22} />
          </div>
          <div className="mwos-surface-intro-copy">
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
        <div className="mwos-surface-intro">
          <div className="mwos-surface-intro-icon mwos-icon-tone-alert flex size-10 items-center justify-center rounded-2xl md:size-12">
            <ClipboardList size={22} />
          </div>
          <div className="mwos-surface-intro-copy">
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
      <div className="mwos-surface-intro">
        <div className="mwos-surface-intro-icon mwos-icon-tone-staff flex size-10 items-center justify-center rounded-2xl md:size-12">
          <ClipboardList size={22} />
        </div>
        <div className="mwos-surface-intro-copy">
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
    if (!userHasAnyRole(user, ['admin', 'executive_director', 'technical_director', 'board_observer'])) {
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
            <div className="mwos-ribbon-surface px-4 py-4 text-white md:px-8 md:py-8">
              <p className="mwos-hero-kicker text-white/68">{heroCopy.eyebrow}</p>
              <div className="mwos-surface-intro mt-4">
                <div className="mwos-surface-intro-icon flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 text-white md:h-12 md:w-12">
                  <Shield size={20} />
                </div>
                <div className="mwos-surface-intro-copy">
                  <h1 className="mwos-display mwos-hero-title text-white">
                    {heroCopy.title}
                  </h1>
                  <p className="mwos-hero-copy mt-2.5 max-w-3xl text-pretty text-white/82 md:mt-3">
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
            <section className="mwos-card-tone-danger rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
              <p className="text-sm font-semibold text-[var(--color-accent-deep)]">{error}</p>
            </section>
          ) : null}

          {!loading && !error && actionMessage ? (
            <section className="mwos-card-tone-training rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
              <p className="text-sm font-semibold text-[var(--color-primary-deep)]">{actionMessage}</p>
            </section>
          ) : null}

          {!loading && !error && actionError ? (
            <section className="mwos-card-tone-danger rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
              <p className="text-sm font-semibold text-[var(--color-accent-deep)]">{actionError}</p>
            </section>
          ) : null}

          {!loading && !error && workspace ? (
            <>
              <OversightMetricStrip metrics={workspace.metrics} />

              <OversightModeNote mode={leadershipMode} />

              {workspace.playerDevelopment ? (
                <PlayerDevelopmentCard summary={workspace.playerDevelopment} />
              ) : null}

              {workspace.globalScoutingPipeline ? (
                <GlobalScoutingPipelineCard
                  pipeline={workspace.globalScoutingPipeline}
                  canOpenScouting={canOpenScouting}
                />
              ) : null}

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
