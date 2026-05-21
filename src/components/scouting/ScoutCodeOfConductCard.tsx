import { ArrowUpRight, BadgeCheck, FileText, ShieldCheck } from 'lucide-react';

import {
  SCOUT_CODE_OF_CONDUCT_PDF_PATH,
  scoutCodeMustNots,
  scoutCodeMusts,
  scoutCodePrinciples,
} from '../../lib/scoutCodeOfConduct';

function ConductList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'positive' | 'warning';
}) {
  const toneClasses =
    tone === 'positive'
      ? 'border-[var(--color-primary-border)] bg-[var(--color-primary-soft)]/70 text-[var(--color-primary-deep)]'
      : 'border-[var(--color-accent-border)] bg-[var(--color-accent-soft)]/75 text-[var(--color-accent-deep)]';

  const bulletClasses = tone === 'positive' ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-accent)]';

  return (
    <div className={`rounded-[24px] border p-4 shadow-[0_14px_34px_rgba(49,39,131,0.05)] ${toneClasses}`}>
      <h3 className="text-sm font-black uppercase tracking-[0.18em]">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm font-semibold leading-6">
            <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${bulletClasses}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ScoutCodeOfConductCard() {
  return (
    <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6">
      <div className="mwos-surface-intro">
        <div className="mwos-surface-intro-icon flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <ShieldCheck size={22} />
        </div>
        <div className="mwos-surface-intro-copy">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Scout compliance</p>
          <h2 className="mt-2 text-xl font-black text-[var(--color-dark)] md:text-2xl">Scout Code of Conduct</h2>
          <p className="mt-2 max-w-4xl text-sm font-semibold leading-7 text-[var(--color-mid)]">
            This is the working conduct reference for MWOS scouts. Keep it close whenever you observe players, speak with officials,
            or prepare follow-up after a match.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-3">
        {scoutCodePrinciples.map((principle) => (
          <article
            key={principle.title}
            className="rounded-[22px] border border-[var(--color-primary)]/12 bg-[linear-gradient(180deg,rgba(49,39,131,0.05),rgba(255,255,255,0.98))] p-4 shadow-[0_14px_34px_rgba(49,39,131,0.05)]"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <BadgeCheck size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--color-dark)]">{principle.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{principle.detail}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        <ConductList title="Scouts must" items={scoutCodeMusts} tone="positive" />
        <ConductList title="Scouts must not" items={scoutCodeMustNots} tone="warning" />
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-[24px] border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 p-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-black text-[var(--color-dark)]">Original signed reference</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-mid)]">
            Open the original PDF if a scout needs the full wording, meeting copy, or printable reference.
          </p>
        </div>
        <a
          href={SCOUT_CODE_OF_CONDUCT_PDF_PATH}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-[var(--color-primary)]/16 bg-white px-4 py-3 text-sm font-black text-[var(--color-primary)] shadow-[0_12px_28px_rgba(49,39,131,0.08)] transition hover:-translate-y-0.5"
        >
          <FileText size={16} />
          Open PDF
          <ArrowUpRight size={16} />
        </a>
      </div>
    </section>
  );
}
