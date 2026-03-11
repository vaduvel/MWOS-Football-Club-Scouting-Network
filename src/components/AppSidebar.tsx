import { FileText, LogOut, Settings, Star } from 'lucide-react';

type AppSidebarProps = {
  current: 'reports' | 'players' | 'settings';
  isAdmin: boolean;
  userName?: string;
  organization?: string;
  onNavigateReports: () => void;
  onNavigatePlayers: () => void;
  onNavigateSettings: () => void;
  onLogout: () => void;
};

export default function AppSidebar({
  current,
  isAdmin,
  userName,
  organization,
  onNavigateReports,
  onNavigatePlayers,
  onNavigateSettings,
  onLogout,
}: AppSidebarProps) {
  const baseNavClass =
    'w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all';

  const mobileNavClass =
    'flex flex-1 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition-all';

  return (
    <>
      <aside className="mwos-auth-shell relative hidden w-[288px] overflow-hidden border-r border-r-white/10 text-white md:block">
        <div className="mwos-subtle-grid absolute inset-0 opacity-30" />
        <div className="relative flex h-full flex-col gap-6 p-6">
          <div className="max-w-[230px]">
            <img
              src="/branding/mwos-fc-300-2.png"
              alt="MWOS logo"
              className="h-16 w-16 rounded-full border border-white/20 bg-white/10 p-0.5 shadow-[0_16px_32px_rgba(15,23,42,0.22)]"
            />
            <p className="mt-4 mwos-display text-2xl uppercase leading-none tracking-[0.12em] text-white">
              {isAdmin ? 'Admin Console' : 'Scouting Network'}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-white/70">
              Moors World of Sport Football Club
            </p>
          </div>

          <div className="rounded-[24px] border border-white/12 bg-white/10 p-4 shadow-[0_18px_40px_rgba(12,16,53,0.18)] backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-white/60">
              {isAdmin ? 'Admin' : 'Scout'}
            </p>
            <p className="mt-2 text-lg font-black leading-tight text-white">
              {userName || 'MWOS User'}
            </p>
            <p className="mt-1 text-sm font-semibold text-white/70">
              {organization || 'Moors World of Sport'}
            </p>
          </div>

          <nav className="space-y-2">
            <button
              onClick={onNavigateReports}
              className={`${baseNavClass} ${
                current === 'reports'
                  ? 'bg-white/16 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <FileText size={18} />
              <span>{isAdmin ? 'Admin Dashboard' : 'My Reports'}</span>
            </button>

            <button
              onClick={onNavigatePlayers}
              className={`${baseNavClass} ${
                current === 'players'
                  ? 'bg-white/16 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Star size={18} />
              <span>Player Hub</span>
            </button>

            <button
              onClick={onNavigateSettings}
              className={`${baseNavClass} ${
                current === 'settings'
                  ? 'bg-white/16 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Settings size={18} />
              <span>Settings</span>
            </button>
          </nav>

          <button
            onClick={onLogout}
            className="mt-auto flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[rgba(21,18,83,0.92)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 text-white shadow-[0_-18px_44px_rgba(12,16,53,0.34)] backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2 rounded-[28px] border border-white/10 bg-white/5 p-2">
          <button
            onClick={onNavigateReports}
            className={`${mobileNavClass} ${
              current === 'reports' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-white/72'
            }`}
          >
            <FileText size={18} />
            <span>Reports</span>
          </button>

          <button
            onClick={onNavigatePlayers}
            className={`${mobileNavClass} ${
              current === 'players' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-white/72'
            }`}
          >
            <Star size={18} />
            <span>Players</span>
          </button>

          <button
            onClick={onNavigateSettings}
            className={`${mobileNavClass} ${
              current === 'settings' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-white/72'
            }`}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>

          <button
            onClick={onLogout}
            className={`${mobileNavClass} text-white/72`}
          >
            <LogOut size={18} />
            <span>Exit</span>
          </button>
        </div>
      </nav>
    </>
  );
}
