import { format, parseISO } from 'date-fns';
import {
  ArrowRight,
  Bell,
  Bus,
  CalendarRange,
  ClipboardList,
  FileText,
  Home,
  Mail,
  Shield,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import AppSidebar from '../components/AppSidebar';
import {
  canAccessOversightModule,
  canAccessMatchDayModule,
  canAccessPlayerHub,
  canAccessScoutingModule,
  canAccessTrainingModule,
  canAccessTransportModule,
  type AppUser,
  type StaffAccessEventRecord,
} from '../lib/data';
import {
  fetchClubHomeWorkspace,
  type ClubHomeTransportItem,
  type ClubHomeWorkspace,
} from '../lib/clubHomeData';
import type { ClubHomeViewMode } from '../lib/clubHomeDomain';
import { buildStaffingHealthCards } from '../lib/staffAccessActivityDomain';
import type { TrainingNotificationItem, TrainingPlanSummary } from '../lib/trainingData';
import { useAuthStore } from '../store/auth';

type ModuleCard = {
  key: string;
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
  visible: (user: AppUser | null) => boolean;
};

type SectionTone = 'neutral' | 'training' | 'transport' | 'reports' | 'alerts' | 'staff';

const MODULE_META: ModuleCard[] = [
  {
    key: 'home',
    label: 'Club Home',
    description: 'Return to your role-aware landing page with the latest club updates and next steps.',
    path: '/',
    icon: Home,
    visible: () => true,
  },
  {
    key: 'training',
    label: 'Training Schedule',
    description: 'Plan weekly microcycles, publish sessions, and keep coaches aligned across the club.',
    path: '/training',
    icon: CalendarRange,
    visible: canAccessTrainingModule,
  },
  {
    key: 'match-day',
    label: 'Match Day',
    description: 'Prepare fixtures, squad availability, player selection, and match-day operations.',
    path: '/match-day',
    icon: ClipboardList,
    visible: canAccessMatchDayModule,
  },
  {
    key: 'transport',
    label: 'Transport Plans',
    description: 'Coordinate departures, drivers, and travel timing for every club movement.',
    path: '/transport',
    icon: Bus,
    visible: canAccessTransportModule,
  },
  {
    key: 'scouting',
    label: 'Scouting Reports',
    description: 'Capture reports, comments, and scouting momentum in one shared football workflow.',
    path: '/scouting',
    icon: FileText,
    visible: canAccessScoutingModule,
  },
  {
    key: 'players',
    label: 'Player Hub',
    description: 'Review tracked players, shortlist decisions, and recent player intelligence.',
    path: '/players',
    icon: Star,
    visible: canAccessPlayerHub,
  },
  {
    key: 'oversight',
    label: 'Oversight',
    description: 'See club-wide readiness, staffing, and operational attention items.',
    path: '/oversight',
    icon: Shield,
    visible: canAccessOversightModule,
  },
];

const MODULE_ORDER: Record<ClubHomeViewMode, string[]> = {
  admin: ['oversight', 'training', 'match-day', 'transport', 'scouting', 'players', 'home'],
  executive_director: ['players', 'scouting', 'oversight', 'match-day', 'training', 'transport', 'home'],
  technical_director: ['training', 'match-day', 'oversight', 'transport', 'home', 'scouting', 'players'],
  board_observer: ['oversight', 'match-day', 'home', 'training', 'transport', 'scouting', 'players'],
  coach: ['training', 'match-day', 'transport', 'oversight', 'scouting', 'players', 'home'],
  driver: ['transport', 'training', 'match-day', 'oversight', 'home', 'scouting', 'players'],
  scout: ['scouting', 'players', 'match-day', 'training', 'oversight', 'transport', 'home'],
  pending: ['home', 'training', 'match-day', 'transport', 'scouting', 'players', 'oversight'],
};

const SECTION_TONE_CLASSES: Record<
  SectionTone,
  {
    shell: string;
    icon: string;
    accent: string;
  }
> = {
  neutral: {
    shell: 'border-[var(--color-mid)]/16 bg-white',
    icon: 'bg-[var(--color-primary)]/8 text-[var(--color-primary)]',
    accent: 'text-[var(--color-primary)]',
  },
  training: {
    shell: 'mwos-card-tone-training',
    icon: 'mwos-icon-tone-training',
    accent: 'text-[var(--color-primary)]',
  },
  transport: {
    shell: 'mwos-card-tone-transport',
    icon: 'mwos-icon-tone-transport',
    accent: 'text-[var(--color-primary-deep)]',
  },
  reports: {
    shell: 'mwos-card-tone-report',
    icon: 'mwos-icon-tone-report',
    accent: 'text-[var(--color-primary-deep)]',
  },
  alerts: {
    shell: 'mwos-card-tone-alert',
    icon: 'mwos-icon-tone-alert',
    accent: 'text-[var(--color-accent)]',
  },
  staff: {
    shell: 'mwos-card-tone-staff',
    icon: 'mwos-icon-tone-staff',
    accent: 'text-[var(--color-primary)]',
  },
};

const MODULE_TONE_CLASSES: Record<
  string,
  {
    shell: string;
    icon: string;
    accent: string;
  }
> = {
  home: SECTION_TONE_CLASSES.neutral,
  training: SECTION_TONE_CLASSES.training,
  transport: SECTION_TONE_CLASSES.transport,
  scouting: SECTION_TONE_CLASSES.reports,
  players: SECTION_TONE_CLASSES.staff,
  'match-day': SECTION_TONE_CLASSES.training,
  oversight: SECTION_TONE_CLASSES.alerts,
};

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

function MetricStrip({ items }: { items: ClubHomeWorkspace['metrics'] }) {
  const toneClasses = [
    'mwos-card-tone-training',
    'mwos-card-tone-transport',
    'mwos-card-tone-alert',
    'mwos-card-tone-report',
  ];

  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {items.map((item, index) => (
        <article
          key={item.label}
          className={`rounded-[22px] border p-4 shadow-[0_14px_30px_rgba(49,39,131,0.06)] md:rounded-[24px] md:p-5 md:shadow-[0_16px_35px_rgba(49,39,131,0.06)] ${toneClasses[index % toneClasses.length]}`}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)] md:text-[11px] md:tracking-[0.28em]">
            {item.label}
          </p>
          <p className="mt-3 text-3xl font-black leading-none text-[var(--color-dark)] md:mt-4 md:text-4xl">{item.value}</p>
          <p className="mt-2 hidden text-sm font-semibold leading-6 text-[var(--color-mid)] sm:block">{item.detail}</p>
        </article>
      ))}
    </section>
  );
}

function SectionShell({
  title,
  description,
  icon: Icon,
  tone = 'neutral',
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  tone?: SectionTone;
  children: ReactNode;
}) {
  const toneClasses = SECTION_TONE_CLASSES[tone];

  return (
    <article className={`rounded-[24px] border p-3.5 shadow-[0_16px_36px_rgba(49,39,131,0.06)] md:rounded-[28px] md:p-5 md:shadow-[0_18px_45px_rgba(49,39,131,0.06)] ${toneClasses.shell}`}>
      <div className="mwos-surface-intro">
        <div className={`mwos-surface-intro-icon flex size-9 items-center justify-center rounded-2xl md:size-12 ${toneClasses.icon}`}>
          <Icon size={18} />
        </div>
        <div className="mwos-surface-intro-copy">
          <h2 className="text-base font-black text-[var(--color-dark)] md:text-xl">{title}</h2>
          <p className="mt-2 line-clamp-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)] md:line-clamp-none md:leading-7">{description}</p>
        </div>
      </div>
      <div className="mt-4 md:mt-5">{children}</div>
    </article>
  );
}

function NotificationsFeed({
  items,
  unreadCount,
  interactive = true,
}: {
  items: TrainingNotificationItem[];
  unreadCount: number;
  interactive?: boolean;
}) {
  return (
    <SectionShell
      title="Notifications"
      description="Recent app notifications from training, transport, and other club actions that affect your work."
      icon={Bell}
      tone="alerts"
    >
      <div className="mwos-inline-strip mwos-inline-strip-alert mb-4">
        <p className="text-sm font-semibold text-[var(--color-mid)]">Unread updates</p>
        <span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[var(--color-primary)]">
          {unreadCount}
        </span>
      </div>
      <div className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <div
              key={item.id}
              className={`mwos-subcard mwos-subcard-alert ${interactive ? 'mwos-subcard-interactive' : ''} group flex items-start gap-3 ${
                interactive ? 'hover:border-[var(--color-primary)]/22' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="mwos-subcard-head">
                  <p className="mwos-subcard-title mt-0">{item.title}</p>
                  {!item.readAt ? (
                    <div className="mwos-subcard-badges">
                      <span className="mwos-pill mwos-pill-alert">New</span>
                    </div>
                  ) : null}
                </div>
                <p className="mwos-subcard-copy mt-2">{item.message}</p>
                <p className="mwos-subcard-meta mt-2">
                  {item.teamName} · {formatIsoDate(item.createdAt)}
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
          <EmptyState tone="mwos-subcard-alert" message="No notifications yet. They will appear here as training, transport, and staff updates happen." />
        )}
      </div>
    </SectionShell>
  );
}

function TrainingFeed({ plans, interactive = true }: { plans: TrainingPlanSummary[]; interactive?: boolean }) {
  return (
    <SectionShell
      title="Training this week"
      description="Current-week plans visible from your access, ready to review or continue."
      icon={CalendarRange}
      tone="training"
    >
      <div className="space-y-3">
        {plans.length ? (
          plans.map((plan) => (
            <div
              key={plan.id}
              className={`mwos-subcard mwos-subcard-training ${interactive ? 'mwos-subcard-interactive' : ''} group flex items-start gap-3 ${
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
          <EmptyState tone="mwos-subcard-training" message="No current-week training plans are visible from this account yet." />
        )}
      </div>
    </SectionShell>
  );
}

function TransportFeed({ plans, interactive = true }: { plans: ClubHomeTransportItem[]; interactive?: boolean }) {
  return (
    <SectionShell
      title="Upcoming transport"
      description="Active trips and departures that are still relevant to your workflow."
      icon={Bus}
      tone="transport"
    >
      <div className="space-y-3">
        {plans.length ? (
          plans.map((plan) => (
            <div
              key={plan.id}
              className={`mwos-subcard mwos-subcard-transport ${interactive ? 'mwos-subcard-interactive' : ''} group flex items-start gap-3 ${
                interactive ? 'hover:border-[var(--color-primary)]/22' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="mwos-subcard-head">
                  <p className="mwos-subcard-title mt-0">{plan.teamName}</p>
                  <div className="mwos-subcard-badges">
                    <span className="mwos-pill mwos-pill-transport">{plan.status}</span>
                  </div>
                </div>
                <p className="mwos-subcard-copy mt-2">{plan.title}</p>
                <p className="mwos-subcard-meta mt-2">
                  {formatIsoDate(plan.eventDate)} · {formatTimeValue(plan.departureTime)} · {plan.destination}
                </p>
                <p className="mwos-subcard-copy mt-2">Driver: {plan.driverName}</p>
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
          <EmptyState tone="mwos-subcard-transport" message="No active transport plans are visible from this account yet." />
        )}
      </div>
    </SectionShell>
  );
}

function ReportsFeed({
  items,
  interactive = true,
}: {
  items: ClubHomeWorkspace['recentReports'];
  interactive?: boolean;
}) {
  return (
    <SectionShell
      title="Recent scouting reports"
      description="The most recent scouting output visible to this account."
      icon={FileText}
      tone="reports"
    >
      <div className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <div
              key={item.id}
              className={`mwos-subcard mwos-subcard-report ${interactive ? 'mwos-subcard-interactive' : ''} group flex items-start gap-3 ${
                interactive ? 'hover:border-[var(--color-primary)]/22' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="mwos-subcard-title mt-0">{item.fixture}</p>
                <p className="mwos-subcard-copy mt-2">{item.competition}</p>
                <p className="mwos-subcard-meta mt-2">
                  {formatIsoDate(item.date || item.createdAt)}
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
          <EmptyState tone="mwos-subcard-report" message="No recent reports are visible from this account yet." />
        )}
      </div>
    </SectionShell>
  );
}

function AttentionFeed({ workspace }: { workspace: ClubHomeWorkspace }) {
  return (
    <SectionShell
      title="Leadership attention"
      description="The highest-priority club issues surfaced from training, transport, and staff access."
      icon={Shield}
      tone="alerts"
    >
      <div className="space-y-3">
        {workspace.attentionItems.length ? (
          workspace.attentionItems.map((item) => (
            <Link
              key={item.id}
              to={item.linkPath}
              className={`mwos-subcard ${item.severity === 'high' ? 'mwos-subcard-danger' : 'mwos-subcard-alert'} mwos-subcard-interactive group block transition hover:border-[var(--color-primary)]/22`}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mwos-subcard-head">
                    <p className="mwos-subcard-title mt-0">{item.title}</p>
                    <div className="mwos-subcard-badges">
                      <span className={`mwos-pill ${item.severity === 'high' ? 'mwos-pill-danger' : 'mwos-pill-alert'}`}>
                        {item.severity}
                      </span>
                      {item.teamName ? (
                        <span className="mwos-pill mwos-pill-training">
                          {item.teamName}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="mwos-subcard-copy mt-2">{item.detail}</p>
                </div>
                <ArrowRight size={16} className="mt-1 shrink-0 text-[var(--color-mid)] transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))
        ) : (
          <EmptyState tone="mwos-subcard-alert" message="No critical club attention items right now." />
        )}
      </div>
    </SectionShell>
  );
}

function PendingInvitesFeed({ items }: { items: ClubHomeWorkspace['pendingInvitations'] }) {
  return (
    <SectionShell
      title="Pending invitations"
      description="Staff invitations still waiting for activation or follow-up."
      icon={Mail}
      tone="staff"
    >
      <div className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <Link
              key={item.id}
              to="/settings"
              className="mwos-subcard mwos-subcard-staff mwos-subcard-interactive group block transition hover:border-[var(--color-primary)]/22"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="mwos-subcard-title mt-0">{item.fullName || item.email}</p>
                  <p className="mwos-subcard-copy mt-2">{item.email}</p>
                  <p className="mwos-subcard-meta mt-2">
                    {item.roles.map((role) => role.label).join(', ') || 'Pending roles'} · {formatIsoDate(item.createdAt)}
                  </p>
                </div>
                <ArrowRight size={16} className="mt-1 shrink-0 text-[var(--color-mid)] transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))
        ) : (
          <EmptyState tone="mwos-subcard-staff" message="No pending invitations right now." />
        )}
      </div>
    </SectionShell>
  );
}

function StaffingHealthFeed({ workspace }: { workspace: ClubHomeWorkspace }) {
  if (!workspace.staffingHealth) {
    return null;
  }

  const cards = buildStaffingHealthCards(workspace.staffingHealth);
  const toneClasses = ['mwos-subcard-staff', 'mwos-subcard-training', 'mwos-subcard-alert', 'mwos-subcard-report'];

  return (
    <SectionShell
      title="Staffing health"
      description="Quick signals on onboarding, unassigned accounts, and where staff load is spread across the club."
      icon={Shield}
      tone="staff"
    >
      <div className="grid gap-3 sm:grid-cols-2">
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
    </SectionShell>
  );
}

function StaffAccessActivityFeed({ items }: { items: StaffAccessEventRecord[] }) {
  return (
    <SectionShell
      title="Recent access activity"
      description="The latest invite and access changes flowing through the admin workspace."
      icon={ClipboardList}
      tone="staff"
    >
      <div className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <Link
              key={item.id}
              to="/settings"
              className={`mwos-subcard ${
                item.tone === 'warning'
                  ? 'mwos-subcard-alert'
                  : item.tone === 'success'
                    ? 'mwos-subcard-success'
                    : 'mwos-subcard-staff'
              } mwos-subcard-interactive group block transition hover:border-[var(--color-primary)]/22`}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mwos-subcard-head">
                    <p className="mwos-subcard-title mt-0">{item.targetName}</p>
                    <div className="mwos-subcard-badges">
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
                  </div>
                  <p className="mwos-subcard-copy mt-2">{item.detail}</p>
                  <p className="mwos-subcard-meta mt-2">
                    {item.targetEmail} · {formatIsoDate(item.createdAt)}
                  </p>
                </div>
                <ArrowRight size={16} className="mt-1 shrink-0 text-[var(--color-mid)] transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))
        ) : (
          <EmptyState tone="mwos-subcard-staff" message="No recent staff access activity yet." />
        )}
      </div>
    </SectionShell>
  );
}

function LeadershipModeCallout({ view }: { view: ClubHomeViewMode }) {
  if (view === 'executive_director') {
    return (
      <section className="mwos-card-tone-report rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-primary)]">
          Executive Development Mode
        </p>
        <p className="mt-3 text-lg font-black text-[var(--color-dark)]">
          Strategic visibility into talent, scouting momentum, and club readiness.
        </p>
        <p className="mt-3 text-pretty text-sm font-semibold leading-7 text-[var(--color-mid)]">
          Use this workspace to follow players worth attention, reviewed football activity, and the operational signals that matter before partnership or pathway decisions.
        </p>
      </section>
    );
  }

  if (view === 'technical_director') {
    return (
      <section className="mwos-card-tone-training rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-primary)]">
          Technical Director Mode
        </p>
        <p className="mt-3 text-lg font-black text-[var(--color-dark)]">
          Club-wide review with comment-oriented follow-up.
        </p>
        <p className="mt-3 text-sm font-semibold leading-7 text-[var(--color-mid)]">
          Use this workspace to review training publication, transport readiness, and club activity across every team, then step into the planning modules when coaches need direction or comments.
        </p>
      </section>
    );
  }

  if (view === 'board_observer') {
    return (
      <section className="mwos-card-tone-alert rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-accent)]">
          Board Briefing Mode
        </p>
        <p className="mt-3 text-lg font-black text-[var(--color-dark)]">
          Read-only visibility into how the club is moving this week.
        </p>
        <p className="mt-3 text-sm font-semibold leading-7 text-[var(--color-mid)]">
          Everything here is optimized for summary and awareness. You can review the latest club activity without editing plans, staffing, or transport actions.
        </p>
      </section>
    );
  }

  return (
    <section className="mwos-card-tone-staff rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-primary)]">
        Admin Operations Mode
      </p>
      <p className="mt-3 text-lg font-black text-[var(--color-dark)]">
        Full club visibility with operational control.
      </p>
      <p className="mt-3 text-sm font-semibold leading-7 text-[var(--color-mid)]">
        Use this surface to keep staffing, planning, transport, and reporting aligned without switching between disconnected tools.
      </p>
    </section>
  );
}

function ModuleGrid({
  view,
  user,
}: {
  view: ClubHomeViewMode;
  user: AppUser | null;
}) {
  const navigate = useNavigate();
  const visibleModules = MODULE_META.filter((module) => module.visible(user)).sort((left, right) => {
    const ordering = MODULE_ORDER[view];
    return ordering.indexOf(left.key) - ordering.indexOf(right.key);
  });

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {visibleModules.map((module) => {
        const Icon = module.icon;
        const toneClasses = MODULE_TONE_CLASSES[module.key] || MODULE_TONE_CLASSES.home;
        return (
          <button
            key={module.key}
            onClick={() => navigate(module.path)}
            className={`group rounded-[26px] border p-4 text-left shadow-[0_18px_45px_rgba(49,39,131,0.06)] transition-all hover:-translate-y-0.5 md:p-5 ${toneClasses.shell}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className={`flex size-10 items-center justify-center rounded-2xl md:size-12 ${toneClasses.icon}`}>
                <Icon size={22} />
              </div>
              <ArrowRight size={18} className={`mt-1 transition-transform group-hover:translate-x-1 ${toneClasses.accent}`} />
            </div>
            <h2 className="mt-5 text-lg font-black text-[var(--color-dark)] md:text-xl">{module.label}</h2>
            <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)] md:leading-7">{module.description}</p>
          </button>
        );
      })}
    </section>
  );
}

export default function ClubHomePage() {
  const { user, logout } = useAuthStore();
  const [workspace, setWorkspace] = useState<ClubHomeWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const nextWorkspace = await fetchClubHomeWorkspace();
        if (!isMounted) return;
        setWorkspace(nextWorkspace);
      } catch (loadError: any) {
        if (!isMounted) return;
        console.error('Failed to load club home workspace.', loadError);
        setError(loadError.message || 'Failed to load club home workspace.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const teamsLabel = useMemo(() => {
    if (!user?.teams?.length) return 'No team assignments yet';
    return user.teams.map((team) => team.name).join(' · ');
  }, [user]);

  const isAdminView = workspace?.view === 'admin';
  const isExecutiveDirectorView = workspace?.view === 'executive_director';
  const isTechnicalDirectorView = workspace?.view === 'technical_director';
  const isBoardObserverView = workspace?.view === 'board_observer';
  const isLeadershipView = isAdminView || isExecutiveDirectorView || isTechnicalDirectorView || isBoardObserverView;
  const canOpenTraining = canAccessTrainingModule(user);
  const canOpenTransport = canAccessTransportModule(user);
  const canOpenScouting = canAccessScoutingModule(user);
  const canOpenNotifications = canOpenTraining || canOpenTransport;

  return (
    <div className="min-h-dvh bg-[var(--color-light)] md:flex">
      <AppSidebar current="home" user={user} onLogout={() => void logout()} />

      <main className="flex-1 overflow-auto p-3 pb-28 md:p-6">
        <div className="mx-auto max-w-7xl space-y-5 md:space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/18 bg-white shadow-[0_20px_55px_rgba(49,39,131,0.08)]">
            <div className="mwos-ribbon-surface relative overflow-hidden px-4 py-4 text-white md:px-8 md:py-8">
              <div className="max-w-4xl">
                <p className="mwos-hero-kicker text-white/70">
                  MWOS Football Club
                </p>
                <h1 className="mwos-display mwos-hero-title mt-2.5 text-white md:mt-3">
                  Club Home
                </h1>
                <p className="mwos-hero-copy mt-3 max-w-3xl text-pretty text-white/82 md:mt-4">
                  {workspace?.hero.description ||
                    'Your workspace adapts to the teams, roles, and modules currently assigned to your account.'}
                </p>
                {workspace ? (
                  <div className="mt-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/65">
                      {workspace.hero.eyebrow}
                    </p>
                    <p className="mt-2 text-2xl font-black text-white md:text-3xl">{workspace.hero.title}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                      {teamsLabel}
                    </p>
                    <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
                      <Link
                        to={workspace.hero.primaryPath}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[var(--color-primary)] shadow-[0_14px_32px_rgba(15,23,42,0.18)] sm:w-auto"
                      >
                        {workspace.hero.primaryLabel}
                        <ArrowRight size={16} />
                      </Link>
                      {workspace.hero.secondaryLabel && workspace.hero.secondaryPath ? (
                        <Link
                          to={workspace.hero.secondaryPath}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/18 bg-white/10 px-4 py-3 text-sm font-black text-white sm:w-auto"
                        >
                          {workspace.hero.secondaryLabel}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {loading ? (
            <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
              <p className="text-sm font-semibold text-[var(--color-mid)]">Loading club home…</p>
            </section>
          ) : null}

          {!loading && error ? (
            <section className="mwos-card-tone-danger rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5">
              <p className="text-sm font-semibold text-[var(--color-accent-deep)]">{error}</p>
            </section>
          ) : null}

          {!loading && !error && workspace ? (
            <>
              <MetricStrip items={workspace.metrics} />

              {isLeadershipView ? (
                <>
                  <LeadershipModeCallout view={workspace.view} />

                  <section className="grid gap-4 xl:grid-cols-2">
                    <AttentionFeed workspace={workspace} />
                    <NotificationsFeed
                      items={workspace.notifications}
                      unreadCount={workspace.unreadNotificationCount}
                      interactive={canOpenNotifications}
                    />
                  </section>

                  {isAdminView ? (
                    <>
                      <section className="grid gap-4 xl:grid-cols-3">
                        <TrainingFeed plans={workspace.trainingPlans} interactive={canOpenTraining} />
                        <TransportFeed plans={workspace.upcomingTransport} interactive={canOpenTransport} />
                        <PendingInvitesFeed items={workspace.pendingInvitations} />
                      </section>

                      <section className="grid gap-4 xl:grid-cols-3">
                        <StaffingHealthFeed workspace={workspace} />
                        <StaffAccessActivityFeed items={workspace.recentStaffAccessEvents} />
                        <ReportsFeed items={workspace.recentReports} interactive={canOpenScouting} />
                      </section>

                      <ModuleGrid view={workspace.view} user={user} />
                    </>
                  ) : null}

                  {isTechnicalDirectorView ? (
                    <>
                      <section className="grid gap-4 xl:grid-cols-2">
                        <TrainingFeed plans={workspace.trainingPlans} interactive={canOpenTraining} />
                        <TransportFeed plans={workspace.upcomingTransport} interactive={canOpenTransport} />
                      </section>

                      <section className="grid gap-4 xl:grid-cols-2">
                        <ReportsFeed items={workspace.recentReports} interactive={canOpenScouting} />
                        <ModuleGrid view={workspace.view} user={user} />
                      </section>
                    </>
                  ) : null}

                  {isBoardObserverView ? (
                    <>
                      <section className="grid gap-4 xl:grid-cols-2">
                        <TrainingFeed plans={workspace.trainingPlans} interactive={canOpenTraining} />
                        <TransportFeed plans={workspace.upcomingTransport} interactive={canOpenTransport} />
                      </section>

                      <section className="grid gap-4 xl:grid-cols-2">
                        <ReportsFeed items={workspace.recentReports} interactive={canOpenScouting} />
                        <ModuleGrid view={workspace.view} user={user} />
                      </section>
                    </>
                  ) : null}
                </>
              ) : null}

              {workspace.view === 'coach' ? (
                <>
                  <section className="grid gap-4 xl:grid-cols-2">
                    <TrainingFeed plans={workspace.trainingPlans} />
                    {canOpenTransport ? <TransportFeed plans={workspace.upcomingTransport} /> : null}
                  </section>

                  <section className="grid gap-4 xl:grid-cols-2">
                    <NotificationsFeed items={workspace.notifications} unreadCount={workspace.unreadNotificationCount} />
                    <ModuleGrid view={workspace.view} user={user} />
                  </section>
                </>
              ) : null}

              {workspace.view === 'driver' ? (
                <>
                  <section className="grid gap-4 xl:grid-cols-2">
                    <TransportFeed plans={workspace.upcomingTransport} />
                    <NotificationsFeed items={workspace.notifications} unreadCount={workspace.unreadNotificationCount} />
                  </section>

                  <ModuleGrid view={workspace.view} user={user} />
                </>
              ) : null}

              {workspace.view === 'scout' ? (
                <>
                  <section className="grid gap-4 xl:grid-cols-2">
                    <ReportsFeed items={workspace.recentReports} />
                    <NotificationsFeed items={workspace.notifications} unreadCount={workspace.unreadNotificationCount} />
                  </section>

                  <ModuleGrid view={workspace.view} user={user} />
                </>
              ) : null}

              {workspace.view === 'pending' ? (
                <>
                  <NotificationsFeed items={workspace.notifications} unreadCount={workspace.unreadNotificationCount} />
                  <ModuleGrid view={workspace.view} user={user} />
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
