import { useEffect, useState } from 'react';
import { Activity, FileText, Shield, Users } from 'lucide-react';
import AppSidebar from '../components/AppSidebar';
import {
  fetchAdminDashboardOverview,
  userHasAnyRole,
  type AdminDashboardOverview,
} from '../lib/data';
import { useAuthStore } from '../store/auth';

function MetricCard({
  label,
  value,
  help,
  icon: Icon,
}: {
  label: string;
  value: number;
  help: string;
  icon: typeof Users;
}) {
  return (
    <article className="rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_35px_rgba(49,39,131,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">{label}</p>
          <p className="mt-4 text-4xl font-black text-[var(--color-dark)]">{value}</p>
          <p className="mt-2 text-sm font-semibold leading-7 text-[var(--color-mid)]">{help}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
          <Icon size={20} />
        </div>
      </div>
    </article>
  );
}

export default function OversightPage() {
  const { user, logout } = useAuthStore();
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userHasAnyRole(user, ['admin', 'technical_director', 'board_observer'])) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    void (async () => {
      try {
        const data = await fetchAdminDashboardOverview();
        if (!isMounted) return;
        setOverview(data);
      } catch (loadError: any) {
        if (!isMounted) return;
        console.error('Failed to load oversight data.', loadError);
        setError(loadError.message || 'Failed to load oversight data.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-[var(--color-light)] md:flex">
      <AppSidebar current="oversight" user={user} onLogout={() => void logout()} />

      <main className="flex-1 overflow-auto p-4 pb-28 md:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/18 bg-white shadow-[0_20px_55px_rgba(49,39,131,0.08)]">
            <div className="mwos-ribbon-surface px-5 py-6 text-white md:px-8 md:py-8">
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/68">
                Club Module
              </p>
              <div className="mt-4 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 text-white">
                  <Shield size={22} />
                </div>
                <div>
                  <h1 className="mwos-display text-[2.2rem] uppercase leading-none tracking-[0.08em] text-white md:text-[3.4rem]">
                    Admin Oversight
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/82 md:text-base">
                    Club-wide visibility for leadership roles. This view is role-aware and read-only unless your account is assigned administrative access.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {!userHasAnyRole(user, ['admin', 'technical_director', 'board_observer']) ? (
            <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
              <p className="text-sm font-semibold text-[var(--color-mid)]">
                Your account does not currently have oversight access.
              </p>
            </section>
          ) : null}

          {loading ? (
            <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
              <p className="text-sm font-semibold text-[var(--color-mid)]">Loading oversight data…</p>
            </section>
          ) : null}

          {!loading && error ? (
            <section className="rounded-[28px] border border-red-200 bg-red-50 p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
              <p className="text-sm font-semibold text-red-700">{error}</p>
            </section>
          ) : null}

          {!loading && !error && overview ? (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Staff Accounts" value={overview.totalUsers} help="People currently active in the club workspace." icon={Users} />
                <MetricCard label="Reports" value={overview.totalReports} help="Saved scouting outputs currently available to leadership." icon={FileText} />
                <MetricCard label="Last 7 Days" value={overview.reportsLast7Days} help="Reports created recently across the club." icon={Activity} />
                <MetricCard label="Active Scouts" value={overview.activeScouts} help="Users who already produced at least one report." icon={Shield} />
              </section>

              <section className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
                <article className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
                  <h2 className="text-xl font-black text-[var(--color-dark)]">Recent reports</h2>
                  <div className="mt-4 space-y-3">
                    {overview.recentReports.length > 0 ? (
                      overview.recentReports.map((report) => (
                        <div
                          key={report.id}
                          className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/65 p-4"
                        >
                          <p className="text-sm font-black text-[var(--color-dark)]">
                            {report.home_team} vs {report.away_team}
                          </p>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-mid)]">
                            {report.competition} · {report.date || 'No date'}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-[var(--color-mid)]">
                            {report.owner_name || report.owner_email}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm font-semibold text-[var(--color-mid)]">No reports available yet.</p>
                    )}
                  </div>
                </article>

                <article className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
                  <h2 className="text-xl font-black text-[var(--color-dark)]">Staff roster snapshot</h2>
                  <div className="mt-4 space-y-3">
                    {overview.users.slice(0, 8).map((member) => (
                      <div
                        key={member.id}
                        className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/65 p-4"
                      >
                        <p className="text-sm font-black text-[var(--color-dark)]">{member.name}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-mid)]">
                          {member.role}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[var(--color-mid)]">
                          {member.reportCount} report{member.reportCount === 1 ? '' : 's'}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
