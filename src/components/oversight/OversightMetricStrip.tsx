import { Activity, Bus, CalendarRange, Mail, Users } from 'lucide-react';

import type { OversightMetricSummary } from '../../lib/oversightData';

const METRIC_META = [
  {
    key: 'staffAccounts',
    label: 'Staff accounts',
    help: 'People currently inside the club workspace.',
    icon: Users,
  },
  {
    key: 'activeTeams',
    label: 'Active teams',
    help: 'Current club groups tracked inside the system.',
    icon: Activity,
  },
  {
    key: 'trainingCoverage',
    label: 'Training coverage',
    help: 'Teams that already have a current-week training plan.',
    icon: CalendarRange,
  },
  {
    key: 'upcomingTransportPlans',
    label: 'Upcoming trips',
    help: 'Transport plans still ahead of the club this period.',
    icon: Bus,
  },
  {
    key: 'reportsLast7Days',
    label: 'Reports last 7 days',
    help: 'Recent scouting output produced across the club.',
    icon: Activity,
  },
  {
    key: 'pendingInvitations',
    label: 'Pending invites',
    help: 'Staff onboarding items still waiting for activation.',
    icon: Mail,
  },
] as const;

export default function OversightMetricStrip({ metrics }: { metrics: OversightMetricSummary }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {METRIC_META.map((item) => {
        const Icon = item.icon;
        return (
          <article
            key={item.key}
            className="rounded-[22px] border border-[var(--color-mid)]/14 bg-white p-4 shadow-[0_14px_34px_rgba(49,39,131,0.05)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">{item.label}</p>
                <p className="mt-3 text-3xl font-black text-[var(--color-dark)]">{metrics[item.key]}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{item.help}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
                <Icon size={20} />
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
