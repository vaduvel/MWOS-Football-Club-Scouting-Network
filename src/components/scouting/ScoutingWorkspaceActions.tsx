import { ArrowRight } from 'lucide-react';
import type { ScoutingWorkspaceAction } from '../../lib/scoutingWorkspaceDomain';

type ScoutingWorkspaceActionsProps = {
  actions: ScoutingWorkspaceAction[];
  onOpen: (path: string) => void;
};

export default function ScoutingWorkspaceActions({ actions, onOpen }: ScoutingWorkspaceActionsProps) {
  return (
    <section className="rounded-[24px] border border-[var(--color-mid)]/14 bg-white p-4 shadow-[0_16px_40px_rgba(49,39,131,0.05)] md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Scouting Flow</p>
          <h3 className="mt-2 text-xl font-black text-[var(--color-dark)]">Next actions</h3>
          <p className="mt-1 text-sm font-semibold text-[var(--color-mid)]">
            Move between reports, player analysis and club follow-up without leaving the scouting module.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => onOpen(action.path)}
            className={`rounded-[22px] border p-4 text-left transition-all hover:-translate-y-0.5 ${
              action.tone === 'solid'
                ? 'border-[var(--color-primary)]/18 bg-[linear-gradient(180deg,rgba(49,39,131,0.06),rgba(255,255,255,1))] shadow-[0_14px_30px_rgba(49,39,131,0.08)]'
                : 'border-[var(--color-mid)]/14 bg-[var(--color-light)]/45 hover:border-[var(--color-primary)]/18'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.08em] text-[var(--color-dark)]">{action.label}</p>
                <p className="mt-2 text-sm font-semibold leading-5 text-[var(--color-mid)]">{action.helper}</p>
              </div>
              <ArrowRight size={18} className="mt-0.5 text-[var(--color-primary)]" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
