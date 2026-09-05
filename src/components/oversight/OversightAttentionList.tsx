import { ArrowRight, AlertTriangle, BellRing } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { OversightAttentionItem } from '../../lib/oversightDomain';

export default function OversightAttentionList({
  items,
  canOpenPath = () => true,
}: {
  items: OversightAttentionItem[];
  canOpenPath?: (path: string) => boolean;
}) {
  return (
    <article className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
      <div className="mwos-surface-intro">
        <div className="mwos-surface-intro-icon flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent)]/12 text-[var(--color-accent)]">
          <BellRing size={22} />
        </div>
        <div className="mwos-surface-intro-copy">
          <h2 className="text-xl font-black text-[var(--color-dark)]">Leadership attention</h2>
          <p className="mt-2 text-sm font-semibold leading-7 text-[var(--color-mid)]">
            The items below are the quickest way for leadership to spot missing planning, staffing gaps and unresolved onboarding.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {items.length > 0 ? (
          items.map((item) => {
            const accessible = canOpenPath(item.linkPath);
            const content = (
              <>
              <div
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  item.severity === 'high'
                    ? 'mwos-icon-tone-danger'
                    : 'mwos-icon-tone-alert'
                }`}
              >
                <AlertTriangle size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mwos-subcard-head">
                  <p className="mwos-subcard-title mt-0">{item.title}</p>
                  <div className="mwos-subcard-badges">
                    <span className={`mwos-pill ${item.severity === 'high' ? 'mwos-pill-danger' : 'mwos-pill-alert'}`}>
                      {item.severity}
                    </span>
                    {item.teamName ? (
                      <span className="mwos-pill mwos-pill-training">{item.teamName}</span>
                    ) : null}
                  </div>
                </div>
                <p className="mwos-subcard-copy mt-2">{item.detail}</p>
              </div>
              {accessible ? (
                <ArrowRight size={16} className="mt-1 shrink-0 text-[var(--color-mid)] transition group-hover:translate-x-0.5" />
              ) : (
                <span className="mt-1 shrink-0 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-mid)]">Read only</span>
              )}
              </>
            );

            return accessible ? (
              <Link
                key={item.id}
                to={item.linkPath}
                className={`mwos-subcard ${item.severity === 'high' ? 'mwos-subcard-danger' : 'mwos-subcard-alert'} mwos-subcard-interactive group flex items-start gap-3 transition hover:border-[var(--color-primary)]/22`}
              >
                {content}
              </Link>
            ) : (
              <div
                key={item.id}
                className={`mwos-subcard ${item.severity === 'high' ? 'mwos-subcard-danger' : 'mwos-subcard-alert'} flex items-start gap-3`}
              >
                {content}
              </div>
            );
          })
        ) : (
          <div className="mwos-subcard mwos-subcard-alert border-dashed p-5">
            <p className="mwos-subcard-copy mt-0">No urgent leadership follow-ups right now.</p>
          </div>
        )}
      </div>
    </article>
  );
}
