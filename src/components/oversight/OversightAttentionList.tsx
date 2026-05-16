import { ArrowRight, AlertTriangle, BellRing } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { OversightAttentionItem } from '../../lib/oversightDomain';

export default function OversightAttentionList({ items }: { items: OversightAttentionItem[] }) {
  return (
    <article className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent)]/12 text-[var(--color-accent)]">
          <BellRing size={22} />
        </div>
        <div>
          <h2 className="text-xl font-black text-[var(--color-dark)]">Leadership attention</h2>
          <p className="mt-2 text-sm font-semibold leading-7 text-[var(--color-mid)]">
            The items below are the quickest way for leadership to spot missing planning, staffing gaps and unresolved onboarding.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <Link
              key={item.id}
              to={item.linkPath}
              className="group flex items-start gap-3 rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/65 p-4 transition hover:border-[var(--color-primary)]/22"
            >
              <div
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  item.severity === 'high'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                <AlertTriangle size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-[var(--color-dark)]">{item.title}</p>
                  {item.teamName ? (
                    <span className="rounded-full bg-[var(--color-primary)]/8 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-primary)]">
                      {item.teamName}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{item.detail}</p>
              </div>
              <ArrowRight size={16} className="mt-1 shrink-0 text-[var(--color-mid)] transition group-hover:translate-x-0.5" />
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--color-mid)]/18 bg-[var(--color-light)]/55 p-5">
            <p className="text-sm font-semibold text-[var(--color-mid)]">
              No urgent leadership follow-ups right now.
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
