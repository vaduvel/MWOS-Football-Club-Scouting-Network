import {
  Bus,
  CalendarRange,
  FileText,
  Home,
  LogOut,
  Bell,
  MoreHorizontal,
  Settings,
  Shield,
  Star,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppUser } from '../lib/data';
import NotificationCenter from './NotificationCenter';
import {
  canAccessOversightModule,
  canAccessPlayerHub,
  canAccessScoutingModule,
  canAccessTrainingModule,
  canAccessTransportModule,
  getPrimaryRoleSlug,
  userHasAnyRole,
} from '../lib/data';

export type SidebarSection = 'home' | 'notifications' | 'training' | 'transport' | 'scouting' | 'players' | 'oversight' | 'settings';

type AppSidebarProps = {
  current: SidebarSection;
  user: AppUser | null;
  onLogout: () => void;
};

type SidebarItem = {
  key: SidebarSection;
  label: string;
  mobileLabel?: string;
  path: string;
  icon: LucideIcon;
};

function buildSidebarItems(user: AppUser | null): SidebarItem[] {
  const items: SidebarItem[] = [
    { key: 'home', label: 'Club Home', mobileLabel: 'Home', path: '/', icon: Home },
    { key: 'notifications', label: 'Notifications', mobileLabel: 'Alerts', path: '/notifications', icon: Bell },
  ];

  if (canAccessTrainingModule(user)) {
    items.push({ key: 'training', label: 'Training', mobileLabel: 'Train', path: '/training', icon: CalendarRange });
  }

  if (canAccessTransportModule(user)) {
    items.push({ key: 'transport', label: 'Transport', mobileLabel: 'Trips', path: '/transport', icon: Bus });
  }

  if (canAccessScoutingModule(user)) {
    items.push({ key: 'scouting', label: 'Scouting', mobileLabel: 'Scout', path: '/scouting', icon: FileText });
  }

  if (canAccessPlayerHub(user)) {
    items.push({ key: 'players', label: 'Player Hub', mobileLabel: 'Players', path: '/players', icon: Star });
  }

  if (canAccessOversightModule(user)) {
    items.push({ key: 'oversight', label: 'Oversight', mobileLabel: 'Lead', path: '/oversight', icon: Shield });
  }

  items.push({ key: 'settings', label: 'Settings', mobileLabel: 'Prefs', path: '/settings', icon: Settings });

  return items;
}

function formatRoleHeadline(user: AppUser | null) {
  if (!user) return 'Pending Access';
  return user.role || 'Pending Access';
}

function formatTeamSummary(user: AppUser | null) {
  if (!user || user.teams.length === 0) {
    return userHasAnyRole(user, ['admin', 'technical_director', 'board_observer'])
      ? 'Club-wide access'
      : 'Awaiting team assignment';
  }

  if (user.teams.length === 1) {
    return user.teams[0]?.name || 'Assigned team';
  }

  return `${user.teams.length} assigned teams`;
}

function buildAccessProfileCopy(roleSlug: string) {
  switch (roleSlug) {
    case 'admin':
      return 'Operational access across staffing, planning, transport, and club oversight.';
    case 'technical_director':
      return 'Club-wide review access focused on training quality, transport readiness, and leadership visibility.';
    case 'board_observer':
      return 'Read-only briefing access across oversight and club notifications.';
    case 'coach':
      return 'Your workspace stays centered on planning and team execution.';
    case 'driver':
      return 'Your navigation stays focused on transport actions and departure updates.';
    case 'scout':
      return 'Your workspace stays focused on reports, player tracking, and football follow-up.';
    case 'pending':
    default:
      return 'Your account is waiting for roles or team assignments.';
  }
}

function buildMobilePrimaryKeys(roleSlug: string) {
  switch (roleSlug) {
    case 'admin':
      return ['home', 'training', 'transport', 'oversight'];
    case 'technical_director':
      return ['home', 'training', 'oversight', 'transport'];
    case 'board_observer':
      return ['home', 'oversight', 'notifications'];
    case 'coach':
      return ['home', 'training', 'transport', 'notifications'];
    case 'driver':
      return ['home', 'transport', 'notifications'];
    case 'scout':
      return ['home', 'scouting', 'players', 'notifications'];
    case 'pending':
    default:
      return ['home', 'settings'];
  }
}

export default function AppSidebar({ current, user, onLogout }: AppSidebarProps) {
  const navigate = useNavigate();
  const items = buildSidebarItems(user);
  const baseNavClass =
    'w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all';
  const mobileNavClass =
    'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-black uppercase tracking-[0.08em] transition-all';
  const roleSlug = getPrimaryRoleSlug(user);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const { mobileItems, overflowItems } = useMemo(() => {
    const primaryKeys = buildMobilePrimaryKeys(roleSlug);
    const itemKeys = new Set(items.map((item) => item.key));

    const resolvedKeys = primaryKeys.filter((key) => itemKeys.has(key as SidebarSection));
    const currentKey = itemKeys.has(current) ? current : null;

    if (currentKey && !resolvedKeys.includes(currentKey)) {
      if (resolvedKeys.length >= 4) {
        resolvedKeys[resolvedKeys.length - 1] = currentKey;
      } else {
        resolvedKeys.push(currentKey);
      }
    }

    const uniqueKeys = [...new Set(resolvedKeys)];
    return {
      mobileItems: uniqueKeys
        .map((key) => items.find((item) => item.key === key))
        .filter((item): item is SidebarItem => Boolean(item)),
      overflowItems: items.filter((item) => !uniqueKeys.includes(item.key)),
    };
  }, [current, items, roleSlug]);

  useEffect(() => {
    setMobileMoreOpen(false);
  }, [current]);

  useEffect(() => {
    if (!mobileMoreOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMoreOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [mobileMoreOpen]);

  return (
    <>
      <NotificationCenter />
      <aside className="mwos-auth-shell relative hidden w-[296px] overflow-hidden border-r border-r-white/10 text-white md:block">
        <div className="mwos-subtle-grid absolute inset-0 opacity-30" />
        <div className="relative flex h-full flex-col gap-6 p-6">
          <div className="max-w-[240px]">
            <img
              src="/branding/mwos-fc-300-2.png"
              alt="MWOS logo"
              className="h-16 w-16 rounded-full border border-white/20 bg-white/10 p-0.5 shadow-[0_16px_32px_rgba(15,23,42,0.22)]"
            />
            <p className="mt-4 mwos-display text-2xl uppercase leading-none tracking-[0.12em] text-white">
              Club Management
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-white/70">
              MWOS Football Club
            </p>
          </div>

          <div className="rounded-[24px] border border-white/12 bg-white/10 p-4 shadow-[0_18px_40px_rgba(12,16,53,0.18)] backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-white/60">
              {formatRoleHeadline(user)}
            </p>
            <p className="mt-2 text-lg font-black leading-tight text-white">
              {user?.name || 'MWOS User'}
            </p>
            <p className="mt-1 text-sm font-semibold text-white/70">
              {formatTeamSummary(user)}
            </p>
            {user?.organization ? (
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                {user.organization}
              </p>
            ) : null}
          </div>

          <nav className="space-y-2">
            {items.map((item) => {
              const Icon = item.icon;
              const active = current === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(item.path)}
                  className={`${baseNavClass} ${
                    active
                      ? 'bg-white/16 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/55">
              Access Profile
            </p>
            <p className="mt-2 text-sm font-semibold text-white/80">
              {buildAccessProfileCopy(roleSlug)}
            </p>
            <button
              onClick={onLogout}
              className="mt-4 flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {mobileMoreOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            aria-label="Close more navigation"
            onClick={() => setMobileMoreOpen(false)}
            className="absolute inset-0 bg-[rgba(15,23,42,0.42)]"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            className="absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.2rem)] rounded-[28px] border border-[var(--color-mid)]/14 bg-white p-4 text-[var(--color-dark)] shadow-[0_24px_64px_rgba(15,23,42,0.2)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[var(--color-mid)]">
                  More actions
                </p>
                <h2 className="mt-2 text-lg font-black text-[var(--color-dark)]">Open another workspace</h2>
                <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)]">
                  Keep the main phone nav short. The rest of the club surfaces stay here when you need them.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close more navigation"
                onClick={() => setMobileMoreOpen(false)}
                className="inline-flex size-10 items-center justify-center rounded-2xl border border-[var(--color-mid)]/14 bg-[var(--color-light)]/75 text-[var(--color-dark)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {overflowItems.map((item) => {
                const Icon = item.icon;
                const active = current === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setMobileMoreOpen(false);
                      navigate(item.path);
                    }}
                    className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-[var(--color-primary)]/22 bg-[var(--color-primary)]/6 text-[var(--color-primary)]'
                        : 'border-[var(--color-mid)]/14 bg-white text-[var(--color-dark)]'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-2xl bg-[var(--color-light)] text-[var(--color-mid)]">
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black">{item.label}</span>
                        <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-mid)]">
                          {active ? 'Current view' : 'Open module'}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={onLogout}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-mid)]/14 bg-[var(--color-light)]/75 px-4 py-3 text-sm font-black text-[var(--color-dark)]"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[rgba(21,18,83,0.96)] px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-1.5 text-white shadow-[0_-12px_28px_rgba(12,16,53,0.22)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[22px] border border-white/10 bg-white/5 p-1">
          {mobileItems.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                aria-label={item.label}
                title={item.label}
                className={`${mobileNavClass} ${
                  active ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-white/72'
                }`}
              >
                <Icon size={15} />
                <span>{item.mobileLabel || item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setMobileMoreOpen(true)}
            aria-label="More navigation"
            title="More navigation"
            className={`${mobileNavClass} ${
              overflowItems.some((item) => item.key === current)
                ? 'bg-white text-[var(--color-primary)] shadow-sm'
                : 'text-white/72'
            }`}
          >
            <MoreHorizontal size={15} />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
