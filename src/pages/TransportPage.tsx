import { Bus, Clock3, MapPinned, Users2 } from 'lucide-react';
import AppSidebar from '../components/AppSidebar';
import { useAuthStore } from '../store/auth';

export default function TransportPage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-[var(--color-light)] md:flex">
      <AppSidebar current="transport" user={user} onLogout={() => void logout()} />

      <main className="flex-1 overflow-auto p-4 pb-28 md:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/18 bg-white shadow-[0_20px_55px_rgba(49,39,131,0.08)]">
            <div className="mwos-ribbon-surface px-5 py-6 text-white md:px-8 md:py-8">
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/68">
                Club Module
              </p>
              <div className="mt-4 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 text-white">
                  <Bus size={22} />
                </div>
                <div>
                  <h1 className="mwos-display text-[2.2rem] uppercase leading-none tracking-[0.08em] text-white md:text-[3.4rem]">
                    Transport Plans
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/82 md:text-base">
                    This module prepares the workflow for away travel, driver coordination and clear departure timing across the club.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_14px_34px_rgba(49,39,131,0.05)]">
              <Clock3 size={20} className="text-[var(--color-primary)]" />
              <h2 className="mt-4 text-lg font-black text-[var(--color-dark)]">Departure timing</h2>
              <p className="mt-2 text-sm font-semibold leading-7 text-[var(--color-mid)]">
                Drivers and staff will work from a single source of truth for departure hour, arrival expectation and schedule changes.
              </p>
            </article>
            <article className="rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_14px_34px_rgba(49,39,131,0.05)]">
              <Users2 size={20} className="text-[var(--color-primary)]" />
              <h2 className="mt-4 text-lg font-black text-[var(--color-dark)]">Staff coordination</h2>
              <p className="mt-2 text-sm font-semibold leading-7 text-[var(--color-mid)]">
                Admin, technical staff and drivers already land in the correct module shell, so club transport work can be connected without touching auth or navigation again.
              </p>
            </article>
            <article className="rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_14px_34px_rgba(49,39,131,0.05)]">
              <MapPinned size={20} className="text-[var(--color-primary)]" />
              <h2 className="mt-4 text-lg font-black text-[var(--color-dark)]">Match-day logistics</h2>
              <p className="mt-2 text-sm font-semibold leading-7 text-[var(--color-mid)]">
                The production shell is ready for route, destination and travel notices, with the right role boundaries already in place for admin and driver use.
              </p>
            </article>
          </section>

          <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
            <h2 className="text-xl font-black text-[var(--color-dark)]">Current access scope</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-[var(--color-mid)]">
              Your account is already recognized inside the transport module foundation. Driver-facing and admin-facing transport views can now evolve on top of a stable club access model.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
