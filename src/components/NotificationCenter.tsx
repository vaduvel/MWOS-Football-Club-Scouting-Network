import { useEffect, useMemo, useState, type Attributes } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  canAccessTrainingModule,
  canAccessTransportModule,
} from '../lib/data';
import {
  fetchTrainingNotificationCenter,
  markAllNotificationsRead,
  markNotificationRead,
  type TrainingNotificationItem,
} from '../lib/trainingData';
import { useAuthStore } from '../store/auth';

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

type NotificationRowProps = Attributes & {
  item: TrainingNotificationItem;
  onOpen: (item: TrainingNotificationItem) => void;
};

function NotificationRow({
  item,
  onOpen,
}: NotificationRowProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`w-full rounded-2xl border p-4 text-left transition-colors ${
        item.readAt
          ? 'border-[var(--color-mid)]/12 bg-white'
          : 'border-[var(--color-primary)]/18 bg-[var(--color-primary)]/5'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-mid)]">
            {item.teamName}
          </p>
          <p className="mt-1 text-sm font-black text-[var(--color-dark)]">{item.title}</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{item.message}</p>
        </div>
        {!item.readAt ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" /> : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-mid)]">
          {timeLabel(item.createdAt)}
        </span>
        {item.emailSentAt ? (
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-primary)]">
            email sent
          </span>
        ) : null}
      </div>
    </button>
  );
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<TrainingNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTrainingNotificationCenter();
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch (loadError: any) {
      console.error('Failed to load notification center.', loadError);
      setError(loadError?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();

    const intervalId = window.setInterval(() => {
      void refresh();
    }, 45000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open]);

  const unreadItems = useMemo(() => items.filter((item) => !item.readAt).length, [items]);
  const canOpenNotificationTarget = canAccessTrainingModule(user) || canAccessTransportModule(user);

  const handleOpenItem = async (item: TrainingNotificationItem) => {
    try {
      if (!item.readAt) {
        await markNotificationRead(item.id);
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry,
          ),
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      }
    } catch (markError) {
      console.error('Failed to mark notification as read.', markError);
    } finally {
      setOpen(false);
      navigate(canOpenNotificationTarget ? item.linkPath : '/oversight');
    }
  };

  const handleMarkAll = async () => {
    setBusy(true);
    try {
      await markAllNotificationsRead();
      setItems((current) =>
        current.map((entry) => ({
          ...entry,
          readAt: entry.readAt || new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } catch (markAllError: any) {
      console.error('Failed to mark notifications as read.', markAllError);
      setError(markAllError?.message || 'Failed to mark all notifications as read.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="fixed right-4 top-16 z-[92] hidden h-12 w-12 items-center justify-center rounded-2xl border border-white/14 bg-[rgba(21,18,83,0.94)] text-white shadow-[0_18px_45px_rgba(12,16,53,0.28)] backdrop-blur-xl transition-transform hover:scale-[1.02] md:inline-flex md:right-6 md:top-24"
        aria-label="Open notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-black text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[91] bg-[rgba(15,23,42,0.32)] backdrop-blur-[1px]" onClick={() => setOpen(false)}>
          <aside
            className="absolute right-3 top-32 h-[min(72vh,680px)] w-[min(92vw,420px)] overflow-hidden rounded-[28px] border border-[var(--color-mid)]/16 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.2)] md:right-6 md:top-40"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mwos-ribbon-surface px-5 py-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/70">
                    Club Notifications
                  </p>
                  <h2 className="mt-2 text-xl font-black text-white">Inbox</h2>
                  <p className="mt-1 text-sm font-semibold text-white/78">
                    {unreadCount} unread · training, transport and oversight alerts
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleMarkAll()}
                  disabled={busy || unreadItems === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/12 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white disabled:opacity-50"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
                  Mark all
                </button>
              </div>
            </div>

            <div className="h-[calc(100%-116px)] overflow-y-auto bg-[var(--color-light)]/55 p-4">
              {loading ? (
                <div className="rounded-2xl border border-[var(--color-mid)]/14 bg-white p-5 text-sm font-semibold text-[var(--color-mid)]">
                  Loading notifications…
                </div>
              ) : null}

              {!loading && error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
                  {error}
                </div>
              ) : null}

              {!loading && !error ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate('/notifications');
                    }}
                    className="w-full rounded-2xl border border-[var(--color-mid)]/14 bg-white px-4 py-3 text-left text-sm font-black uppercase tracking-[0.12em] text-[var(--color-primary)] transition hover:border-[var(--color-primary)]/22"
                  >
                    Open full inbox
                  </button>
                  {items.length ? (
                    items.map((item) => <NotificationRow key={item.id} item={item} onOpen={handleOpenItem} />)
                  ) : (
                    <div className="rounded-2xl border border-[var(--color-mid)]/14 bg-white p-6 text-sm font-semibold text-[var(--color-mid)]">
                      No notifications yet. Training plans, transport updates, technical comments and reminders will appear here.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
