import { Plus, Search } from 'lucide-react';
import type { ScoutingWorkspaceHero as HeroMeta } from '../../lib/scoutingWorkspaceDomain';

type ScoutingWorkspaceHeroProps = {
  hero: HeroMeta;
  search: string;
  onSearchChange: (value: string) => void;
  onCreateReport: () => void;
  secondaryCtaLabel: string;
  onSecondaryCta: () => void;
};

export default function ScoutingWorkspaceHero({
  hero,
  search,
  onSearchChange,
  onCreateReport,
  secondaryCtaLabel,
  onSecondaryCta,
}: ScoutingWorkspaceHeroProps) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/18 bg-white shadow-[0_20px_55px_rgba(49,39,131,0.08)]">
      <div className="mwos-ribbon-surface relative overflow-hidden px-4 py-4 text-white md:px-6 md:py-5">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-4 xl:flex-row xl:items-start xl:justify-between xl:gap-5 xl:pb-5">
          <div className="flex items-center gap-3">
            <img
              src="/branding/mwos-fc-300-2.png"
              alt="MWOS logo"
              className="h-9 w-9 rounded-full border border-white/20 bg-white/10 p-0.5 md:h-12 md:w-12"
            />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/68 md:text-[11px] md:tracking-[0.32em]">
                {hero.eyebrow}
              </p>
              <h2 className="mt-1 mwos-display text-[2rem] uppercase leading-none tracking-[0.05em] text-white md:mt-2 md:text-4xl xl:text-5xl">
                {hero.title}
              </h2>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2.5 xl:max-w-[760px] xl:items-end">
            <div className="flex w-full items-center rounded-2xl border border-white/12 bg-white/10 px-3.5 py-3 shadow-[0_12px_24px_rgba(12,16,53,0.12)] backdrop-blur-sm">
              <Search className="mr-3 text-white/68" size={18} />
              <input
                type="text"
                placeholder={hero.searchPlaceholder}
                className="w-full bg-transparent text-sm font-semibold text-white placeholder:text-white/60 outline-none"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </div>
            <div className="grid w-full grid-cols-2 gap-2 xl:w-auto xl:min-w-[360px]">
              <button
                onClick={onSecondaryCta}
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black text-white shadow-[0_12px_24px_rgba(12,16,53,0.12)] backdrop-blur-sm transition-all hover:bg-white/16"
              >
                {secondaryCtaLabel}
              </button>
              <button
                onClick={onCreateReport}
                className="rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-[var(--color-primary)] shadow-[0_16px_32px_rgba(12,16,53,0.22)] transition-all hover:-translate-y-0.5"
              >
                <span className="inline-flex items-center gap-2">
                  <Plus size={18} />
                  New Report
                </span>
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 max-w-3xl text-sm font-semibold text-white/76">
          {hero.description}
        </p>
      </div>
    </div>
  );
}
