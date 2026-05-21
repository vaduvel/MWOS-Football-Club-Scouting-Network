import type { Attributes } from 'react';
import type { ScoutingWorkspaceMetric } from '../../lib/scoutingWorkspaceDomain';

const TONE_CLASSES: Record<ScoutingWorkspaceMetric['tone'], string> = {
  primary: 'border-[var(--color-primary)]/15 bg-[linear-gradient(135deg,rgba(49,39,131,0.10),rgba(255,255,255,0.96))]',
  accent: 'border-[var(--color-accent)]/12 bg-[linear-gradient(135deg,rgba(190,23,23,0.08),rgba(255,255,255,0.96))]',
  gold: 'border-[var(--color-primary-deep)]/16 bg-[linear-gradient(135deg,rgba(34,27,102,0.12),rgba(255,255,255,0.96))]',
  success: 'border-[var(--color-primary-border)] bg-[linear-gradient(135deg,rgba(49,39,131,0.08),rgba(255,255,255,0.96))]',
};

type ScoutingWorkspaceMetricsProps = {
  metrics: ScoutingWorkspaceMetric[];
};

type MetricCardProps = Attributes & {
  metric: ScoutingWorkspaceMetric;
};

function MetricCard({ metric }: MetricCardProps) {
  return (
    <div
      className={`rounded-[22px] border p-4 shadow-[0_12px_28px_rgba(49,39,131,0.06)] ${TONE_CLASSES[metric.tone]}`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--color-mid)] md:text-[11px] md:tracking-[0.28em]">
        {metric.label}
      </p>
      <p className="mt-2 text-3xl font-black text-[var(--color-dark)]">{metric.value}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-mid)] md:text-sm">{metric.detail}</p>
    </div>
  );
}

export default function ScoutingWorkspaceMetrics({ metrics }: ScoutingWorkspaceMetricsProps) {
  return (
    <>
      <section className="md:hidden">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {metrics.map((metric) => (
            <div key={metric.label} className="min-w-[148px]">
              <MetricCard metric={metric} />
            </div>
          ))}
        </div>
      </section>

      <section className="hidden gap-3 md:grid md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>
    </>
  );
}
