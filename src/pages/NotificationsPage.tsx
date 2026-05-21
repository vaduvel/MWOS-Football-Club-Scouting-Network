import { format } from 'date-fns';
import {
  Archive,
  Bell,
  CheckCheck,
  Megaphone,
  Mail,
  Pin,
  PlusCircle,
  RefreshCcw,
  Send,
} from 'lucide-react';
import { useEffect, useMemo, useState, type Attributes } from 'react';
import { useNavigate } from 'react-router-dom';

import AppSidebar from '../components/AppSidebar';
import {
  canAccessTrainingModule,
  canAccessTransportModule,
} from '../lib/data';
import {
  archiveClubAnnouncement,
  createClubAnnouncement,
  fetchNotificationWorkspace,
  getFilteredNotificationWorkspaceItems,
  markClubAnnouncementRead,
  markNotificationWorkspaceItemRead,
  markAllNotificationWorkspaceItemsRead,
  type ClubAnnouncementItem,
  type NotificationWorkspaceItem,
} from '../lib/notificationWorkspaceData';
import {
  getNotificationCategory,
  type NotificationWorkspaceFilter,
  type NotificationWorkspaceStats,
} from '../lib/notificationWorkspaceDomain';
import { useAuthStore } from '../store/auth';

const EMPTY_STATS: NotificationWorkspaceStats = {
  total: 0,
  unread: 0,
  announcements: 0,
  notifications: 0,
  training: 0,
  transport: 0,
  pinned: 0,
  emailed: 0,
};

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return format(date, 'dd MMM, HH:mm');
}

function expiryLabel(value: string | null) {
  if (!value) return 'No expiry';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No expiry';
  return `Expires ${format(date, 'dd MMM')}`;
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

function StatCard({
  label,
  value,
  detail,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  detail: string;
  tone: string;
  icon: typeof Bell;
}) {
  return (
    <article className={`mwos-subcard ${tone} md:p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mwos-subcard-kicker">{label}</p>
          <p className="mwos-subcard-value md:text-4xl">{value}</p>
          <p className="mwos-subcard-copy mt-2 hidden sm:block">{detail}</p>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-[var(--color-primary)] shadow-[0_10px_22px_rgba(49,39,131,0.08)]">
          <Icon size={18} />
        </div>
      </div>
      <p className="mwos-subcard-copy mt-2 sm:hidden">{detail}</p>
    </article>
  );
}

function FilterChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-sm font-black uppercase tracking-[0.1em] transition ${
        active
          ? 'bg-[var(--color-primary)] text-white shadow-[0_14px_28px_rgba(49,39,131,0.18)]'
          : 'border border-[var(--color-mid)]/16 bg-white text-[var(--color-dark)]'
      }`}
    >
      {label} · {count}
    </button>
  );
}

type AlertCardProps = Attributes & {
  item: NotificationWorkspaceItem;
  actionBusy: boolean;
  archiveBusy: boolean;
  onOpenNotification: (item: NotificationWorkspaceItem) => void;
  onMarkAnnouncementRead: (item: ClubAnnouncementItem) => void;
  onArchiveAnnouncement: (item: ClubAnnouncementItem) => void;
};

function AlertCard({
  item,
  actionBusy,
  archiveBusy,
  onOpenNotification,
  onMarkAnnouncementRead,
  onArchiveAnnouncement,
}: AlertCardProps) {
  const category = getNotificationCategory(item);
  const isUnread = !item.readAt;
  const notificationToneClass =
    category === 'transport'
      ? 'mwos-subcard-transport'
      : category === 'training'
        ? 'mwos-subcard-training'
        : 'mwos-subcard-report';

  if (item.kind === 'announcement') {
    return (
      <article
        className={`mwos-subcard ${isUnread ? 'mwos-subcard-staff' : 'mwos-subcard-neutral'} p-4 transition ${
          isUnread
            ? 'shadow-[0_16px_35px_rgba(49,39,131,0.08)]'
            : 'shadow-[0_12px_28px_rgba(49,39,131,0.05)]'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mwos-pill mwos-pill-staff">
                Announcement
              </span>
              <span className="mwos-pill mwos-pill-neutral">
                {item.scopeLabel}
              </span>
              {item.isPinned ? (
                <span className="mwos-pill mwos-pill-alert inline-flex items-center gap-1">
                  <Pin size={12} />
                  Pinned
                </span>
              ) : null}
            </div>
            <p className="mwos-subcard-title mt-3">{item.title}</p>
            <p className="mwos-subcard-copy mt-2 whitespace-pre-line">
              {item.body}
            </p>
          </div>
          {isUnread ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" /> : null}
        </div>

        {item.teamNames.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.teamNames.map((teamName) => (
              <span
                key={`${item.id}-${teamName}`}
                className="mwos-pill mwos-pill-neutral"
              >
                {teamName}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="mwos-subcard-meta mt-0">
              {timeLabel(item.createdAt)}
            </p>
            <p className="mwos-subcard-meta mt-0">
              {item.authorName} · {expiryLabel(item.expiresAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isUnread ? (
              <button
                type="button"
                onClick={() => onMarkAnnouncementRead(item)}
                disabled={actionBusy}
                className="mwos-btn mwos-btn-secondary min-h-[2.5rem] px-4 py-2 text-xs uppercase tracking-[0.12em]"
              >
                Mark read
              </button>
            ) : (
              <span className="mwos-pill mwos-pill-neutral">
                Read
              </span>
            )}
            {item.canArchive ? (
              <button
                type="button"
                onClick={() => onArchiveAnnouncement(item)}
                disabled={archiveBusy}
                className="mwos-btn mwos-btn-ghost min-h-[2.5rem] px-2 py-2 text-xs uppercase tracking-[0.12em]"
              >
                <Archive size={14} />
                Archive
              </button>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpenNotification(item)}
      className={`mwos-subcard ${notificationToneClass} ${isUnread ? 'shadow-[0_16px_32px_rgba(49,39,131,0.08)]' : ''} w-full text-left transition`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mwos-subcard-kicker">
              {item.teamName}
            </p>
            <span
              className={`mwos-pill ${
                category === 'transport'
                  ? 'mwos-pill-transport'
                  : 'mwos-pill-training'
              }`}
            >
              {category}
            </span>
          </div>
          <p className="mwos-subcard-title mt-2">{item.title}</p>
          <p className="mwos-subcard-copy mt-2">{item.message}</p>
        </div>
        {isUnread ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" /> : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="mwos-subcard-meta mt-0">
          {timeLabel(item.createdAt)}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {item.emailSentAt ? (
            <span className="mwos-pill mwos-pill-staff">
              email sent
            </span>
          ) : null}
          <span className="mwos-pill mwos-pill-neutral">
            Open
          </span>
        </div>
      </div>
    </button>
  );
}

export default function NotificationsPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<NotificationWorkspaceFilter>('all');
  const [items, setItems] = useState<NotificationWorkspaceItem[]>([]);
  const [stats, setStats] = useState<NotificationWorkspaceStats>(EMPTY_STATS);
  const [composerTeams, setComposerTeams] = useState<Array<{ id: string; name: string; is_active: boolean }>>([]);
  const [canManage, setCanManage] = useState(false);
  const [setupNotice, setSetupNotice] = useState('');
  const [composeTitle, setComposeTitle] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeTeamIds, setComposeTeamIds] = useState<string[]>([]);
  const [composeExpiresAt, setComposeExpiresAt] = useState('');
  const [composePinned, setComposePinned] = useState(false);
  const [composeLoading, setComposeLoading] = useState(false);
  const [composeError, setComposeError] = useState('');
  const [composeSuccess, setComposeSuccess] = useState('');
  const [archiveBusyId, setArchiveBusyId] = useState('');
  const [actionBusyId, setActionBusyId] = useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchNotificationWorkspace();
      setItems(data.items);
      setStats(data.stats);
      setComposerTeams(
        data.composer.teams.map((team) => ({
          id: team.id,
          name: team.name,
          is_active: team.is_active,
        })),
      );
      setCanManage(data.composer.canManage);
      setSetupNotice(data.setupNotice || '');
    } catch (loadError: any) {
      console.error('Failed to load alerts workspace.', loadError);
      setError(loadError?.message || 'Failed to load alerts.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filteredItems = useMemo(
    () => getFilteredNotificationWorkspaceItems(items, filter),
    [items, filter],
  );
  const canOpenNotificationTarget = canAccessTrainingModule(user) || canAccessTransportModule(user);

  async function handleOpenNotification(item: NotificationWorkspaceItem) {
    if (item.kind !== 'notification') return;

    try {
      if (!item.readAt) {
        setActionBusyId(item.id);
        await markNotificationWorkspaceItemRead(item);
        const nextReadAt = new Date().toISOString();
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, readAt: nextReadAt } : entry,
          ),
        );
        setStats((current) => ({
          ...current,
          unread: Math.max(0, current.unread - 1),
        }));
      }
    } catch (markError) {
      console.error('Failed to mark notification as read.', markError);
    } finally {
      setActionBusyId('');
      navigate(canOpenNotificationTarget ? item.linkPath : '/oversight');
    }
  }

  async function handleMarkAnnouncementRead(item: ClubAnnouncementItem) {
    try {
      setActionBusyId(item.id);
      await markClubAnnouncementRead(item.id);
      const nextReadAt = new Date().toISOString();
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, readAt: nextReadAt } : entry,
        ),
      );
      setStats((current) => ({
        ...current,
        unread: Math.max(0, current.unread - 1),
      }));
    } catch (markError) {
      console.error('Failed to mark announcement as read.', markError);
      setError((markError as Error)?.message || 'Failed to update the announcement.');
    } finally {
      setActionBusyId('');
    }
  }

  async function handleArchiveAnnouncement(item: ClubAnnouncementItem) {
    try {
      setArchiveBusyId(item.id);
      await archiveClubAnnouncement(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setStats((current) => ({
        ...current,
        total: Math.max(0, current.total - 1),
        unread: Math.max(0, current.unread - (item.readAt ? 0 : 1)),
        announcements: Math.max(0, current.announcements - 1),
        pinned: Math.max(0, current.pinned - (item.isPinned ? 1 : 0)),
      }));
    } catch (archiveError) {
      console.error('Failed to archive announcement.', archiveError);
      setError((archiveError as Error)?.message || 'Failed to archive the announcement.');
    } finally {
      setArchiveBusyId('');
    }
  }

  async function handleMarkAll() {
    setBusy(true);
    setError('');
    try {
      await markAllNotificationWorkspaceItemsRead(items);
      const nextReadAt = new Date().toISOString();
      setItems((current) =>
        current.map((entry) => ({
          ...entry,
          readAt: entry.readAt || nextReadAt,
        })),
      );
      setStats((current) => ({
        ...current,
        unread: 0,
      }));
    } catch (markError: any) {
      console.error('Failed to mark all alerts as read.', markError);
      setError(markError?.message || 'Failed to mark all alerts as read.');
    } finally {
      setBusy(false);
    }
  }

  async function handlePostAnnouncement() {
    setComposeLoading(true);
    setComposeError('');
    setComposeSuccess('');

    try {
      await createClubAnnouncement({
        title: composeTitle,
        body: composeBody,
        targetTeamIds: composeTeamIds,
        isPinned: composePinned,
        expiresAt: composeExpiresAt,
      });
      setComposeTitle('');
      setComposeBody('');
      setComposeTeamIds([]);
      setComposeExpiresAt('');
      setComposePinned(false);
      setComposeSuccess('Announcement posted.');
      await refresh();
    } catch (postError: any) {
      console.error('Failed to post announcement.', postError);
      setComposeError(postError?.message || 'Failed to post the announcement.');
    } finally {
      setComposeLoading(false);
    }
  }

  function toggleComposeTeam(teamId: string) {
    setComposeTeamIds((current) =>
      current.includes(teamId)
        ? current.filter((entry) => entry !== teamId)
        : [...current, teamId],
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--color-light)] md:flex">
      <AppSidebar current="notifications" user={user} onLogout={() => void logout()} />

      <main className="flex-1 overflow-auto p-4 pb-28 md:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/18 bg-white shadow-[0_20px_55px_rgba(49,39,131,0.08)]">
            <div className="mwos-ribbon-surface px-4 py-4 text-white md:px-8 md:py-8">
              <p className="mwos-hero-kicker text-white/68">Club Alerts</p>
              <div className="mwos-surface-intro mt-4">
                <div className="mwos-surface-intro-icon flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 text-white md:h-12 md:w-12">
                  <Bell size={20} />
                </div>
                <div className="mwos-surface-intro-copy">
                  <h1 className="mwos-display mwos-hero-title text-white">
                    Alerts
                  </h1>
                  <p className="mwos-hero-copy mt-2.5 max-w-3xl text-pretty text-white/82 md:mt-3">
                    Keep internal announcements and operational notifications in one mobile-friendly feed, then jump into training or transport only when action is needed.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard label="All Alerts" value={stats.total} detail="Everything currently visible in the alerts workspace." tone="mwos-subcard-report" icon={Bell} />
            <StatCard label="Unread" value={stats.unread} detail="Announcements or updates that still need attention." tone="mwos-subcard-alert" icon={Mail} />
            <StatCard label="Announcements" value={stats.announcements} detail="Internal posts shared with the club or selected teams." tone="mwos-subcard-staff" icon={Megaphone} />
            <StatCard label="Operational" value={stats.notifications} detail="Training and transport notifications generated by real activity." tone="mwos-subcard-training" icon={Send} />
          </section>

          {setupNotice ? (
            <section className="mwos-card-tone-alert rounded-[28px] border p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
              <p className="text-sm font-semibold text-[var(--color-accent-deep)]">{setupNotice}</p>
            </section>
          ) : null}

          {canManage ? (
            <section className="mwos-card-tone-staff rounded-[28px] border p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
              <div className="mwos-surface-intro">
                <div className="mwos-surface-intro-icon mwos-icon-tone-staff flex h-12 w-12 items-center justify-center rounded-2xl">
                  <Megaphone size={22} />
                </div>
                <div className="mwos-surface-intro-copy">
                  <h2 className="text-xl font-black text-[var(--color-dark)]">Post internal announcement</h2>
                  <p className="mt-2 text-sm font-semibold leading-7 text-[var(--color-mid)]">
                    Use this surface for club-wide notes, team-specific reminders, or important staff updates that should stay inside the app.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
                      Title
                    </label>
                    <input
                      value={composeTitle}
                      onChange={(event) => setComposeTitle(event.target.value)}
                      placeholder="Example: Queens staff briefing"
                      className="mwos-mobile-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
                      Announcement
                    </label>
                    <textarea
                      value={composeBody}
                      onChange={(event) => setComposeBody(event.target.value)}
                      rows={5}
                      placeholder="Write the internal message exactly as staff should read it."
                      className="mwos-mobile-textarea"
                    />
                  </div>
                </div>

                <div className="mwos-subcard mwos-subcard-staff space-y-4">
                  <div>
                    <p className="mwos-subcard-kicker">
                      Audience
                    </p>
                    <p className="mwos-subcard-copy mt-2">
                      Leave it on all staff, or target only the teams that should see it.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setComposeTeamIds([])}
                      className={`mwos-btn min-h-[2.5rem] px-4 py-2 text-xs ${
                        composeTeamIds.length === 0
                          ? 'mwos-btn-primary'
                          : 'mwos-btn-secondary'
                      }`}
                    >
                      All staff
                    </button>
                    {composerTeams.map((team) => {
                      const active = composeTeamIds.includes(team.id);
                      return (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() => toggleComposeTeam(team.id)}
                          className={`mwos-btn min-h-[2.5rem] px-4 py-2 text-xs ${
                            active
                              ? 'mwos-btn-primary'
                              : 'mwos-btn-secondary'
                          }`}
                        >
                          {team.name}
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
                      Expiry date
                    </label>
                    <input
                      type="date"
                      value={composeExpiresAt}
                      onChange={(event) => setComposeExpiresAt(event.target.value)}
                      className="mwos-date-field mwos-mobile-input"
                    />
                  </div>

                  <label className="flex items-center gap-3 rounded-2xl border border-[var(--color-mid)]/14 bg-white px-4 py-3">
                    <input
                      type="checkbox"
                      checked={composePinned}
                      onChange={(event) => setComposePinned(event.target.checked)}
                      className="h-4 w-4 rounded border-[var(--color-mid)]/30 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                    />
                    <span className="text-sm font-semibold text-[var(--color-dark)]">Pin at the top of Alerts</span>
                  </label>
                </div>
              </div>

              {composeError ? (
                <div className="mwos-card-tone-danger mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold text-[var(--color-accent-deep)]">
                  {composeError}
                </div>
              ) : null}

              {composeSuccess ? (
                <div className="mwos-card-tone-training mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold text-[var(--color-primary-deep)]">
                  {composeSuccess}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--color-mid)]">
                  {composeTeamIds.length === 0 ? 'Club-wide post' : `Targeting ${composeTeamIds.length} team${composeTeamIds.length === 1 ? '' : 's'}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setComposeTitle('');
                      setComposeBody('');
                      setComposeTeamIds([]);
                      setComposeExpiresAt('');
                      setComposePinned(false);
                      setComposeError('');
                      setComposeSuccess('');
                    }}
                    className="mwos-btn mwos-btn-ghost text-sm"
                  >
                    <RefreshCcw size={16} />
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePostAnnouncement()}
                    disabled={composeLoading}
                    className="mwos-btn mwos-btn-primary text-sm"
                  >
                    {composeLoading ? <PlusCircle size={16} className="animate-spin" /> : <Send size={16} />}
                    Post announcement
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-[var(--color-dark)]">Feed filters</h2>
                <p className="mt-2 text-sm font-semibold leading-7 text-[var(--color-mid)]">
                  Move between internal announcements and operational notifications without leaving the same surface.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="mwos-btn mwos-btn-ghost text-sm"
                >
                  <RefreshCcw size={16} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => void handleMarkAll()}
                  disabled={busy || stats.unread === 0}
                  className="mwos-btn mwos-btn-secondary text-sm"
                >
                  <CheckCheck size={16} />
                  Mark all read
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <FilterChip active={filter === 'all'} label="All" count={stats.total} onClick={() => setFilter('all')} />
              <FilterChip active={filter === 'unread'} label="Unread" count={stats.unread} onClick={() => setFilter('unread')} />
              <FilterChip active={filter === 'announcements'} label="Announcements" count={stats.announcements} onClick={() => setFilter('announcements')} />
              <FilterChip active={filter === 'notifications'} label="Operational" count={stats.notifications} onClick={() => setFilter('notifications')} />
              <FilterChip active={filter === 'training'} label="Training" count={stats.training} onClick={() => setFilter('training')} />
              <FilterChip active={filter === 'transport'} label="Transport" count={stats.transport} onClick={() => setFilter('transport')} />
            </div>
          </section>

          {error ? (
            <section className="mwos-card-tone-danger rounded-[28px] border p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
              <p className="text-sm font-semibold text-[var(--color-accent-deep)]">{error}</p>
            </section>
          ) : null}

          <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
            <div className="mwos-surface-intro">
              <div className="mwos-surface-intro-icon flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
                <Mail size={22} />
              </div>
              <div className="mwos-surface-intro-copy">
                <h2 className="text-xl font-black text-[var(--color-dark)]">Alerts feed</h2>
                <p className="mt-2 text-sm font-semibold leading-7 text-[var(--color-mid)]">
                  Internal announcements stay visible here alongside the automated training and transport updates generated by the workspace.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                <EmptyState tone="mwos-subcard-report" message="Loading alerts…" />
              ) : null}

              {!loading && filteredItems.length ? (
                filteredItems.map((item) => (
                  <AlertCard
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    actionBusy={actionBusyId === item.id}
                    archiveBusy={archiveBusyId === item.id}
                    onOpenNotification={handleOpenNotification}
                    onMarkAnnouncementRead={handleMarkAnnouncementRead}
                    onArchiveAnnouncement={handleArchiveAnnouncement}
                  />
                ))
              ) : null}

              {!loading && !filteredItems.length ? (
                <EmptyState tone="mwos-subcard-alert" message="No alerts match this filter yet." />
              ) : null}
            </div>

            {!loading && stats.pinned > 0 ? (
              <div className="mwos-mobile-note mwos-card-tone-alert mt-5 border px-4 py-3 text-[var(--color-accent-deep)]">
                {stats.pinned} pinned announcement{stats.pinned === 1 ? '' : 's'} stay at the top of the feed so important staff notes do not get buried by operational updates.
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
