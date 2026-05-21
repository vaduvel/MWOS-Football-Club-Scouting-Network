import { Activity, Bus, CalendarRange, Mail, Users } from 'lucide-react';

import type { OversightMetricSummary } from '../../lib/oversightData';

const METRIC_META = [
  {
    key: 'staffAccounts',
    label: 'Staff accounts',
    help: 'People currently inside the club workspace.',
    icon: Users,
    shell: 'mwos-card-tone-staff',
    iconTone: 'mwos-icon-tone-staff',
  },
  {
    key: 'activeTeams',
    label: 'Active teams',
    help: 'Current club groups tracked inside the system.',
    icon: Activity,
    shell: 'mwos-card-tone-report',
    iconTone: 'mwos-icon-tone-report',
  },
  {
    key: 'trainingCoverage',
    label: 'Training coverage',
    help: 'Teams that already have a current-week training plan.',
    icon: CalendarRange,
    shell: 'mwos-card-tone-training',
    iconTone: 'mwos-icon-tone-training',
  },
  {
    key: 'upcomingTransportPlans',
    label: 'Upcoming trips',
    help: 'Transport plans still ahead of the club this period.',
    icon: Bus,
    shell: 'mwos-card-tone-transport',
    iconTone: 'mwos-icon-tone-transport',
  },
  {
    key: 'reportsLast7Days',
    label: 'Reports last 7 days',
    help: 'Recent scouting output produced across the club.',
    icon: Activity,
    shell: 'mwos-card-tone-report',
    iconTone: 'mwos-icon-tone-report',
  },
  {
    key: 'pendingInvitations',
    label: 'Pending invites',
    help: 'Staff onboarding items still waiting for activation.',
    icon: Mail,
    shell: 'mwos-card-tone-alert',
    iconTone: 'mwos-icon-tone-alert',
  },
] as const;

export default function OversightMetricStrip({ metrics }: { metrics: OversightMetricSummary }) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
      {METRIC_META.map((item) => {
        const Icon = item.icon;
        return (
          <article
            key={item.key}
            className={`rounded-[22px] border p-4 shadow-[0_14px_34px_rgba(49,39,131,0.05)] ${item.shell}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)] md:text-[11px] md:tracking-[0.2em]">{item.label}</p>
                <p className="mt-2 text-2xl font-black leading-none text-[var(--color-dark)] md:mt-3 md:text-3xl">{metrics[item.key]}</p>
                <p className="mt-2 hidden text-sm font-semibold leading-6 text-[var(--color-mid)] sm:block">{item.help}</p>
              </div>
              <div className={`flex size-9 items-center justify-center rounded-2xl md:size-11 ${item.iconTone}`}>
                <Icon size={18} />
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
