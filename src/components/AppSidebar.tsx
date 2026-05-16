import {
  Bus,
  CalendarRange,
  FileText,
  Home,
  LogOut,
  Bell,
  Settings,
  Shield,
  Star,
  type LucideIcon,
} from 'lucide-react';
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
  path: string;
  icon: LucideIcon;
};

function buildSidebarItems(user: AppUser | null): SidebarItem[] {
  const items: SidebarItem[] = [
    { key: 'home', label: 'Club Home', path: '/', icon: Home },
    { key: 'notifications', label: 'Notifications', path: '/notifications', icon: Bell },
  ];

  if (canAccessTrainingModule(user)) {
    items.push({ key: 'training', label: 'Training', path: '/training', icon: CalendarRange });
  }

  if (canAccessTransportModule(user)) {
    items.push({ key: 'transport', label: 'Transport', path: '/transport', icon: Bus });
  }

  if (canAccessScoutingModule(user)) {
    items.push({ key: 'scouting', label: 'Scouting', path: '/scouting', icon: FileText });
  }

  if (canAccessPlayerHub(user)) {
    items.push({ key: 'players', label: 'Player Hub', path: '/players', icon: Star });
  }

  if (canAccessOversightModule(user)) {
    items.push({ key: 'oversight', label: 'Oversight', path: '/oversight', icon: Shield });
  }

  items.push({ key: 'settings', label: 'Settings', path: '/settings', icon: Settings });

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

export default function AppSidebar({ current, user, onLogout }: AppSidebarProps) {
  const navigate = useNavigate();
  const items = buildSidebarItems(user);
  const baseNavClass =
    'w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all';
  const mobileNavClass =
    'flex min-w-[74px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[8px] font-black uppercase tracking-[0.12em] transition-all';
  const roleSlug = getPrimaryRoleSlug(user);

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
              {roleSlug === 'pending'
                ? 'Your account is waiting for roles or team assignments.'
                : 'Your navigation and dashboards adapt automatically to your club role.'}
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

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[rgba(21,18,83,0.96)] px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-1.5 text-white shadow-[0_-12px_28px_rgba(12,16,53,0.22)] backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-[22px] border border-white/10 bg-white/5 p-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className={`${mobileNavClass} ${
                  active ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-white/72'
                }`}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            onClick={onLogout}
            className={`${mobileNavClass} text-white/72`}
          >
            <LogOut size={15} />
            <span>Account</span>
          </button>
        </div>
      </nav>
    </>
  );
}
