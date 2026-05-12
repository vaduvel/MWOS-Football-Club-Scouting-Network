import { CalendarRange, Clock3, MessageSquareMore, RefreshCcw } from 'lucide-react';
import AppSidebar from '../components/AppSidebar';
import { userHasAnyRole } from '../lib/data';
import { useAuthStore } from '../store/auth';

export default function TrainingPage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-[var(--color-light)] md:flex">
      <AppSidebar current="training" user={user} onLogout={() => void logout()} />

      <main className="flex-1 overflow-auto p-4 pb-28 md:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/18 bg-white shadow-[0_20px_55px_rgba(49,39,131,0.08)]">
            <div className="mwos-ribbon-surface px-5 py-6 text-white md:px-8 md:py-8">
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/68">
                Club Module
              </p>
              <div className="mt-4 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 text-white">
                  <CalendarRange size={22} />
                </div>
                <div>
                  <h1 className="mwos-display text-[2.2rem] uppercase leading-none tracking-[0.08em] text-white md:text-[3.4rem]">
                    Training Schedule
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/82 md:text-base">
                    This workspace is prepared for weekly microcycle planning, coach coordination and technical director review across assigned teams.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_14px_34px_rgba(49,39,131,0.05)]">
              <Clock3 size={20} className="text-[var(--color-primary)]" />
              <h2 className="mt-4 text-lg font-black text-[var(--color-dark)]">Planning cadence</h2>
              <p className="mt-2 text-sm font-semibold leading-7 text-[var(--color-mid)]">
                Coaches should prepare the next training week in advance, while still being able to adjust sessions live when reality changes.
              </p>
            </article>
            <article className="rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_14px_34px_rgba(49,39,131,0.05)]">
              <RefreshCcw size={20} className="text-[var(--color-primary)]" />
              <h2 className="mt-4 text-lg font-black text-[var(--color-dark)]">Weekly rhythm</h2>
              <p className="mt-2 text-sm font-semibold leading-7 text-[var(--color-mid)]">
                The foundation already supports a club-wide training shell, so every assigned coach and club leader lands in the right planning workspace for the teams they cover.
              </p>
            </article>
            <article className="rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_14px_34px_rgba(49,39,131,0.05)]">
              <MessageSquareMore size={20} className="text-[var(--color-primary)]" />
              <h2 className="mt-4 text-lg font-black text-[var(--color-dark)]">Technical feedback</h2>
              <p className="mt-2 text-sm font-semibold leading-7 text-[var(--color-mid)]">
                Technical Director access is already modeled in the foundation, so club review and planning feedback can be layered on top without rebuilding permissions or navigation.
              </p>
            </article>
          </section>

          <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
            <h2 className="text-xl font-black text-[var(--color-dark)]">Assigned access in this slice</h2>
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
                <span className="text-sm font-semibold text-[var(--color-mid)]">No team assignments yet.</span>
              )}
            </div>

            <p className="mt-5 text-sm font-semibold leading-7 text-[var(--color-mid)]">
              {userHasAnyRole(user, ['coach', 'admin', 'technical_director'])
                ? 'Your account is already mapped to the right teams and staff role, so the training workspace can stay team-aware from day one.'
                : 'This page is visible because your role can monitor or support the training module foundation.'}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
