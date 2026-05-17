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
  admin: ['oversight', 'training', 'transport', 'scouting', 'players', 'home'],
  technical_director: ['training', 'oversight', 'transport', 'home', 'scouting', 'players'],
  board_observer: ['oversight', 'home', 'training', 'transport', 'scouting', 'players'],
  coach: ['training', 'transport', 'oversight', 'scouting', 'players', 'home'],
  driver: ['transport', 'training', 'oversight', 'home', 'scouting', 'players'],
  scout: ['scouting', 'players', 'training', 'oversight', 'transport', 'home'],
  pending: ['home', 'training', 'transport', 'scouting', 'players', 'oversight'],
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-mid)]/18 bg-[var(--color-light)]/60 p-5">
      <p className="text-sm font-semibold text-[var(--color-mid)]">{message}</p>
    </div>
  );
}

function MetricStrip({ items }: { items: ClubHomeWorkspace['metrics'] }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.label}
          className="rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_35px_rgba(49,39,131,0.06)]"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">
            {item.label}
          </p>
          <p className="mt-4 text-4xl font-black text-[var(--color-dark)]">{item.value}</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{item.detail}</p>
        </article>
      ))}
    </section>
  );
}

function SectionShell({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <article className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
          <Icon size={22} />
        </div>
        <div>
          <h2 className="text-xl font-black text-[var(--color-dark)]">{title}</h2>
          <p className="mt-2 text-sm font-semibold leading-7 text-[var(--color-mid)]">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
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
    >
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 px-4 py-3">
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
              className={`group flex items-start gap-3 rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/65 p-4 transition ${
                interactive ? 'hover:border-[var(--color-primary)]/22' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-black text-[var(--color-dark)]">{item.title}</p>
                  {!item.readAt ? (
                    <span className="rounded-full bg-[var(--color-accent)]/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-accent)]">
                      New
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{item.message}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-mid)]">
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
          <EmptyState message="No notifications yet. They will appear here as training, transport, and staff updates happen." />
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
    >
      <div className="space-y-3">
        {plans.length ? (
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
          <EmptyState message="No current-week training plans are visible from this account yet." />
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
    >
      <div className="space-y-3">
        {plans.length ? (
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
                  <span className="rounded-full bg-[var(--color-accent)]/8 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-accent)]">
                    {plan.status}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{plan.title}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-mid)]">
                  {formatIsoDate(plan.eventDate)} · {formatTimeValue(plan.departureTime)} · {plan.destination}
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--color-mid)]">Driver: {plan.driverName}</p>
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
          <EmptyState message="No active transport plans are visible from this account yet." />
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
    >
      <div className="space-y-3">
        {items.length ? (
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
          <EmptyState message="No recent reports are visible from this account yet." />
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
    >
      <div className="space-y-3">
        {workspace.attentionItems.length ? (
          workspace.attentionItems.map((item) => (
            <Link
              key={item.id}
              to={item.linkPath}
              className="group block rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/65 p-4 transition hover:border-[var(--color-primary)]/22"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-[var(--color-dark)]">{item.title}</p>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                        item.severity === 'high'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {item.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{item.detail}</p>
                  {item.teamName ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-mid)]">
                      {item.teamName}
                    </p>
                  ) : null}
                </div>
                <ArrowRight size={16} className="mt-1 shrink-0 text-[var(--color-mid)] transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))
        ) : (
          <EmptyState message="No critical club attention items right now." />
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
    >
      <div className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <Link
              key={item.id}
              to="/settings"
              className="group block rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/65 p-4 transition hover:border-[var(--color-primary)]/22"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[var(--color-dark)]">{item.fullName || item.email}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{item.email}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-mid)]">
                    {item.roles.map((role) => role.label).join(', ') || 'Pending roles'} · {formatIsoDate(item.createdAt)}
                  </p>
                </div>
                <ArrowRight size={16} className="mt-1 shrink-0 text-[var(--color-mid)] transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))
        ) : (
          <EmptyState message="No pending invitations right now." />
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

  return (
    <SectionShell
      title="Staffing health"
      description="Quick signals on onboarding, unassigned accounts, and where staff load is spread across the club."
      icon={Shield}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/65 p-4"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">{card.label}</p>
            <p className="mt-2 text-lg font-black text-[var(--color-dark)]">{card.value}</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-mid)]">{card.detail}</p>
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
    >
      <div className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <Link
              key={item.id}
              to="/settings"
              className="group block rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/65 p-4 transition hover:border-[var(--color-primary)]/22"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-[var(--color-dark)]">{item.targetName}</p>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                        item.tone === 'warning'
                          ? 'bg-amber-100 text-amber-700'
                          : item.tone === 'success'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-white text-[var(--color-dark)]'
                      }`}
                    >
                      {item.title}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{item.detail}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-mid)]">
                    {item.targetEmail} · {formatIsoDate(item.createdAt)}
                  </p>
                </div>
                <ArrowRight size={16} className="mt-1 shrink-0 text-[var(--color-mid)] transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))
        ) : (
          <EmptyState message="No recent staff access activity yet." />
        )}
      </div>
    </SectionShell>
  );
}

function LeadershipModeCallout({ view }: { view: ClubHomeViewMode }) {
  if (view === 'technical_director') {
    return (
      <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
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
      <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-primary)]">
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
    <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
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
        return (
          <button
            key={module.key}
            onClick={() => navigate(module.path)}
            className="group rounded-[26px] border border-[var(--color-mid)]/16 bg-white p-6 text-left shadow-[0_18px_45px_rgba(49,39,131,0.06)] transition-all hover:-translate-y-0.5 hover:border-[var(--color-primary)]/28"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
                <Icon size={22} />
              </div>
              <ArrowRight size={18} className="mt-1 text-[var(--color-mid)] transition-transform group-hover:translate-x-1" />
            </div>
            <h2 className="mt-5 text-xl font-black text-[var(--color-dark)]">{module.label}</h2>
            <p className="mt-2 text-sm font-semibold leading-7 text-[var(--color-mid)]">{module.description}</p>
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
  const isTechnicalDirectorView = workspace?.view === 'technical_director';
  const isBoardObserverView = workspace?.view === 'board_observer';
  const isLeadershipView = isAdminView || isTechnicalDirectorView || isBoardObserverView;
  const canOpenTraining = canAccessTrainingModule(user);
  const canOpenTransport = canAccessTransportModule(user);
  const canOpenScouting = canAccessScoutingModule(user);
  const canOpenNotifications = canOpenTraining || canOpenTransport;

  return (
    <div className="min-h-screen bg-[var(--color-light)] md:flex">
      <AppSidebar current="home" user={user} onLogout={() => void logout()} />

      <main className="flex-1 overflow-auto p-4 pb-28 md:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/18 bg-white shadow-[0_20px_55px_rgba(49,39,131,0.08)]">
            <div className="mwos-ribbon-surface relative overflow-hidden px-5 py-6 text-white md:px-8 md:py-8">
              <div className="max-w-4xl">
                <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/70">
                  MWOS Football Club
                </p>
                <h1 className="mt-3 mwos-display text-[2.4rem] uppercase leading-none tracking-[0.08em] text-white md:text-[4rem]">
                  Club Home
                </h1>
                <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/82 md:text-base">
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
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {loading ? (
            <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
              <p className="text-sm font-semibold text-[var(--color-mid)]">Loading club home…</p>
            </section>
          ) : null}

          {!loading && error ? (
            <section className="rounded-[28px] border border-red-200 bg-red-50 p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
              <p className="text-sm font-semibold text-red-700">{error}</p>
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
                    <TransportFeed plans={workspace.upcomingTransport} />
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
