import { format } from 'date-fns';
import {
  Bell,
  Bus,
  CalendarRange,
  CheckCheck,
  Mail,
  RefreshCcw,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Attributes } from 'react';
import { useNavigate } from 'react-router-dom';

import AppSidebar from '../components/AppSidebar';
import {
  canAccessTrainingModule,
  canAccessTransportModule,
} from '../lib/data';
import {
  fetchNotificationWorkspace,
  getFilteredNotificationWorkspaceItems,
} from '../lib/notificationWorkspaceData';
import {
  getNotificationCategory,
  type NotificationWorkspaceFilter,
} from '../lib/notificationWorkspaceDomain';
import {
  markAllNotificationsRead,
  markNotificationRead,
  type TrainingNotificationItem,
} from '../lib/trainingData';
import { useAuthStore } from '../store/auth';

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return format(date, 'dd MMM, HH:mm');
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-mid)]/18 bg-[var(--color-light)]/60 p-5">
      <p className="text-sm font-semibold text-[var(--color-mid)]">{message}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_35px_rgba(49,39,131,0.06)]">
      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">{label}</p>
      <p className="mt-4 text-4xl font-black text-[var(--color-dark)]">{value}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{detail}</p>
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

type NotificationRowProps = Attributes & {
  item: TrainingNotificationItem;
  onOpen: (item: TrainingNotificationItem) => void;
};

function NotificationRow({
  item,
  onOpen,
}: NotificationRowProps) {
  const category = getNotificationCategory(item.type);

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`w-full rounded-[24px] border p-4 text-left transition ${
        item.readAt
          ? 'border-[var(--color-mid)]/12 bg-white'
          : 'border-[var(--color-primary)]/18 bg-[var(--color-primary)]/5'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-mid)]">
              {item.teamName}
            </p>
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                category === 'transport'
                  ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                  : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
              }`}
            >
              {category}
            </span>
          </div>
          <p className="mt-2 text-sm font-black text-[var(--color-dark)]">{item.title}</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{item.message}</p>
        </div>
        {!item.readAt ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" /> : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-mid)]">
          {timeLabel(item.createdAt)}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {item.emailSentAt ? (
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-primary)]">
              email sent
            </span>
          ) : null}
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-mid)]">
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
  const [items, setItems] = useState<TrainingNotificationItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    training: 0,
    transport: 0,
    emailed: 0,
  });

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchNotificationWorkspace();
      setItems(data.items);
      setStats(data.stats);
    } catch (loadError: any) {
      console.error('Failed to load notifications workspace.', loadError);
      setError(loadError?.message || 'Failed to load notifications.');
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

  async function handleOpen(item: TrainingNotificationItem) {
    try {
      if (!item.readAt) {
        await markNotificationRead(item.id);
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry,
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
      navigate(canOpenNotificationTarget ? item.linkPath : '/oversight');
    }
  }

  async function handleMarkAll() {
    setBusy(true);
    setError('');
    try {
      await markAllNotificationsRead();
      setItems((current) =>
        current.map((entry) => ({
          ...entry,
          readAt: entry.readAt || new Date().toISOString(),
        })),
      );
      setStats((current) => ({
        ...current,
        unread: 0,
      }));
    } catch (markError: any) {
      console.error('Failed to mark all notifications as read.', markError);
      setError(markError?.message || 'Failed to mark all notifications as read.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-light)] md:flex">
      <AppSidebar current="notifications" user={user} onLogout={() => void logout()} />

      <main className="flex-1 overflow-auto p-4 pb-28 md:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/18 bg-white shadow-[0_20px_55px_rgba(49,39,131,0.08)]">
            <div className="mwos-ribbon-surface px-5 py-6 text-white md:px-8 md:py-8">
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/68">Club Alerts</p>
              <div className="mt-4 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 text-white">
                  <Bell size={22} />
                </div>
                <div>
                  <h1 className="mwos-display text-[2.2rem] uppercase leading-none tracking-[0.08em] text-white md:text-[3.4rem]">
                    Notifications
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/82 md:text-base">
                    Review training, transport, and club alerts in one inbox. Open the right module directly from the event that needs your attention.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total" value={stats.total} detail="Recent notifications loaded into the workspace." />
            <StatCard label="Unread" value={stats.unread} detail="Items that still need your attention." />
            <StatCard label="Training" value={stats.training} detail="Training plans, reminders, and TD feedback." />
            <StatCard label="Transport" value={stats.transport} detail="Trip updates, timing changes, and logistics alerts." />
          </section>

          <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-[var(--color-dark)]">Inbox filters</h2>
                <p className="mt-2 text-sm font-semibold leading-7 text-[var(--color-mid)]">
                  Focus on unread items or the module that matters right now.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-mid)]/16 bg-white px-4 py-2 text-sm font-bold text-[var(--color-dark)]"
                >
                  <RefreshCcw size={16} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => void handleMarkAll()}
                  disabled={busy || stats.unread === 0}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCheck size={16} />
                  Mark all read
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <FilterChip active={filter === 'all'} label="All" count={stats.total} onClick={() => setFilter('all')} />
              <FilterChip active={filter === 'unread'} label="Unread" count={stats.unread} onClick={() => setFilter('unread')} />
              <FilterChip active={filter === 'training'} label="Training" count={stats.training} onClick={() => setFilter('training')} />
              <FilterChip active={filter === 'transport'} label="Transport" count={stats.transport} onClick={() => setFilter('transport')} />
            </div>
          </section>

          {error ? (
            <section className="rounded-[28px] border border-red-200 bg-red-50 p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
              <p className="text-sm font-semibold text-red-700">{error}</p>
            </section>
          ) : null}

          <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
                <Mail size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-[var(--color-dark)]">Notification feed</h2>
                <p className="mt-2 text-sm font-semibold leading-7 text-[var(--color-mid)]">
                  Important emails remain optional in settings, but in-app notifications always live here.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-[var(--color-mid)]/14 bg-[var(--color-light)]/55 p-5 text-sm font-semibold text-[var(--color-mid)]">
                  Loading notifications…
                </div>
              ) : null}

              {!loading && filteredItems.length ? (
                filteredItems.map((item) => <NotificationRow key={item.id} item={item} onOpen={handleOpen} />)
              ) : null}

              {!loading && !filteredItems.length ? (
                <EmptyState message="No notifications match this filter yet." />
              ) : null}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
