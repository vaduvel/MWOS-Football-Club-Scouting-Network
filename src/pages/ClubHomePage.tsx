import { ArrowRight, Bus, CalendarRange, FileText, Shield, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppSidebar from '../components/AppSidebar';
import {
  canAccessOversightModule,
  canAccessPlayerHub,
  canAccessScoutingModule,
  canAccessTrainingModule,
  canAccessTransportModule,
  getDefaultModulePath,
  userHasRole,
} from '../lib/data';
import { useAuthStore } from '../store/auth';

const MODULE_META = [
  {
    key: 'training',
    label: 'Training Schedule',
    description: 'Plan microcycles, manage weekly rhythm and keep coaches aligned across assigned teams.',
    path: '/training',
    icon: CalendarRange,
    visible: canAccessTrainingModule,
  },
  {
    key: 'transport',
    label: 'Transport Plans',
    description: 'Coordinate departures, driver responsibility and travel timing for each club movement.',
    path: '/transport',
    icon: Bus,
    visible: canAccessTransportModule,
  },
  {
    key: 'scouting',
    label: 'Scouting Reports',
    description: 'Create reports, manage players, collect comments and keep scouting operations in one place.',
    path: '/scouting',
    icon: FileText,
    visible: canAccessScoutingModule,
  },
  {
    key: 'oversight',
    label: 'Admin Oversight',
    description: 'See staff access, club activity and high-level operational visibility without leaving the workspace.',
    path: '/oversight',
    icon: Shield,
    visible: canAccessOversightModule,
  },
];

export default function ClubHomePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const visibleModules = MODULE_META.filter((module) => module.visible(user));
  const startPath = getDefaultModulePath(user);

  return (
    <div className="min-h-screen bg-[var(--color-light)] md:flex">
      <AppSidebar current="home" user={user} onLogout={() => void logout()} />

      <main className="flex-1 overflow-auto p-4 pb-28 md:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/18 bg-white shadow-[0_20px_55px_rgba(49,39,131,0.08)]">
            <div className="mwos-ribbon-surface relative overflow-hidden px-5 py-6 text-white md:px-8 md:py-8">
              <div className="max-w-3xl">
                <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/70">
                  MWOS Football Club
                </p>
                <h1 className="mt-3 mwos-display text-[2.4rem] uppercase leading-none tracking-[0.08em] text-white md:text-[4rem]">
                  Club Management
                </h1>
                <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/82 md:text-base">
                  One workspace for coaching, transport, scouting and oversight. Your access adapts to the role and teams assigned to your account.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate(startPath)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.08em] text-[var(--color-primary)] shadow-sm"
                  >
                    Open my workspace
                    <ArrowRight size={16} />
                  </button>
                  {userHasRole(user, 'admin') ? (
                    <button
                      onClick={() => navigate('/settings')}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-black uppercase tracking-[0.08em] text-white"
                    >
                      Manage staff access
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_35px_rgba(49,39,131,0.06)]">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">
                Active Roles
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(user?.roleLabels || ['Pending Access']).map((roleLabel) => (
                  <span
                    key={roleLabel}
                    className="rounded-full border border-[var(--color-primary)]/18 bg-[var(--color-primary)]/8 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-primary)]"
                  >
                    {roleLabel}
                  </span>
                ))}
              </div>
            </article>

            <article className="rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_35px_rgba(49,39,131,0.06)]">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">
                Assigned Teams
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {user?.teams.length ? (
                  user.teams.map((team) => (
                    <span
                      key={team.id}
                      className="rounded-full border border-[var(--color-mid)]/18 bg-[var(--color-light)] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-dark)]"
                    >
                      {team.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm font-semibold text-[var(--color-mid)]">
                    No teams assigned yet.
                  </span>
                )}
              </div>
            </article>

            <article className="rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_35px_rgba(49,39,131,0.06)]">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">
                Module Access
              </p>
              <p className="mt-4 text-4xl font-black text-[var(--color-dark)]">
                {visibleModules.length}
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--color-mid)]">
                Club workspaces are unlocked based on your current staff responsibilities.
              </p>
            </article>
          </section>

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
                  <p className="mt-2 text-sm font-semibold leading-7 text-[var(--color-mid)]">
                    {module.description}
                  </p>
                </button>
              );
            })}

            {canAccessPlayerHub(user) ? (
              <button
                onClick={() => navigate('/players')}
                className="group rounded-[26px] border border-[var(--color-mid)]/16 bg-white p-6 text-left shadow-[0_18px_45px_rgba(49,39,131,0.06)] transition-all hover:-translate-y-0.5 hover:border-[var(--color-primary)]/28"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent)]/8 text-[var(--color-accent)]">
                    <Star size={22} />
                  </div>
                  <ArrowRight size={18} className="mt-1 text-[var(--color-mid)] transition-transform group-hover:translate-x-1" />
                </div>
                <h2 className="mt-5 text-xl font-black text-[var(--color-dark)]">Player Hub</h2>
                <p className="mt-2 text-sm font-semibold leading-7 text-[var(--color-mid)]">
                  Review tracked players, watchlist decisions and recent reports from one shared football intelligence surface.
                </p>
              </button>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
