import { Bus, CalendarDays, Clock3, MapPinned } from 'lucide-react';
import type { TransportPlanSummary } from '../../lib/transportData';

function statusTone(status: TransportPlanSummary['status']) {
  switch (status) {
    case 'published':
      return 'mwos-pill-success';
    case 'updated':
      return 'mwos-pill-alert';
    case 'completed':
      return 'mwos-pill-neutral';
    case 'cancelled':
      return 'mwos-pill-danger';
    default:
      return 'mwos-pill-neutral';
  }
}

export default function TransportPlanList({
  plans,
  selectedPlanId,
  onSelect,
}: {
  plans: TransportPlanSummary[];
  selectedPlanId?: string | null;
  onSelect: (planId: string) => void;
}) {
  if (!plans.length) {
    return (
      <div className="rounded-[24px] border border-dashed border-[var(--color-mid)]/20 bg-white p-5 text-sm font-semibold text-[var(--color-mid)]">
        No transport plans match the current filters yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {plans.map((plan) => {
        const active = plan.id === selectedPlanId;
        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelect(plan.id)}
            className={`w-full rounded-[24px] border p-4 text-left shadow-[0_14px_34px_rgba(49,39,131,0.05)] transition-all ${
              active
                ? 'border-[var(--color-primary)]/24 bg-[var(--color-primary)]/5'
                : 'border-[var(--color-mid)]/14 bg-white hover:border-[var(--color-primary)]/16'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                  {plan.teamName}
                </p>
                <h3 className="mt-2 text-lg font-black text-[var(--color-dark)]">{plan.title}</h3>
              </div>
              <span className={`mwos-pill ${statusTone(plan.status)}`}>
                {plan.status}
              </span>
            </div>

            <div className="mt-4 grid gap-2 text-sm font-semibold text-[var(--color-mid)] sm:grid-cols-2">
              <div className="inline-flex items-center gap-2">
                <CalendarDays size={15} className="text-[var(--color-primary)]" />
                <span>{plan.eventDate}</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <Clock3 size={15} className="text-[var(--color-primary)]" />
                <span>{plan.departureTime || 'Departure TBD'}</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <MapPinned size={15} className="text-[var(--color-primary)]" />
                <span className="truncate">{plan.destination}</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <Bus size={15} className="text-[var(--color-primary)]" />
                <span>{plan.driverName || 'Driver not assigned'}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
