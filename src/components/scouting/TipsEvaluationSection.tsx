import type { TipsAttributeKey, TipsEvaluation } from '../../lib/tipsEvaluationDomain';
import { createEmptyTipsEvaluation, TIPS_ASSESSMENTS, TIPS_SECTIONS } from '../../lib/tipsEvaluationDomain';
import { cn } from '../../lib/utils';

const SECTION_SUBTITLES: Record<(typeof TIPS_SECTIONS)[number]['key'], string> = {
  technique: 'Does the ball obey the player?',
  intelligence: 'Football IQ is often invisible',
  personality: 'Talent without character rarely succeeds',
  speed: 'More than just sprinting',
};

const ASSESSMENT_STYLES = {
  not_for_mwos: 'border-[var(--color-accent-border)] bg-[var(--color-accent-muted)] text-[var(--color-accent-deep)]',
  keep_monitoring: 'border-amber-200 bg-amber-50 text-amber-900',
  recommended: 'border-emerald-200 bg-emerald-50 text-emerald-900',
} as const;

interface Props {
  value: TipsEvaluation | null | undefined;
  onChange: (next: TipsEvaluation) => void;
  disabled: boolean;
}

export default function TipsEvaluationSection({ value, onChange, disabled }: Props) {
  if (!value) return <section className="space-y-3 rounded-2xl bg-white p-4 md:p-6">
    <h2 className="text-lg font-bold text-[var(--color-dark)]">TIPS player evaluation</h2>
    <p className="text-sm">Start the current 1–10 evaluation for this historical report. Its existing 1–5 review stays intact.</p>
    <button type="button" disabled={disabled} className="mwos-btn-secondary min-h-11" onClick={() => onChange({ ...createEmptyTipsEvaluation(), legacyReviewEnabled: true })}>Start TIPS evaluation</button>
  </section>;

  const updateText = (key: keyof Pick<TipsEvaluation, 'positions' | 'preferredFoot' | 'nationality' | 'matchObserved' | 'competitionLevel' | 'otherNotes' | 'physicality'>, text: string) => onChange({ ...value, [key]: text });
  const updateAttribute = (key: TipsAttributeKey, changes: Partial<TipsEvaluation['attributes'][TipsAttributeKey]>) => onChange({
    ...value, attributes: { ...value.attributes, [key]: { ...value.attributes[key], ...changes } },
  });

  return <section className="overflow-hidden rounded-xl border border-[var(--color-primary-border)] bg-white" aria-labelledby="tips-heading">
    <header className="mwos-tips-hero mwos-tips-hero-report border-b-2 border-[var(--color-accent)] px-4 py-4 text-white sm:px-6">
      <div className="flex items-center gap-3">
        <img src="/branding/mwos-fc-300-2.png" alt="" className="size-11 shrink-0 rounded-full bg-white object-contain p-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-white/95">Moors World of Sport Football Club</p>
          <h2 id="tips-heading" className="text-balance font-serif text-xl font-bold leading-tight sm:text-2xl">Professional Scouting Report</h2>
          <p className="text-pretty text-xs italic text-white/90">Player Evaluation Profile · TIPS Methodology</p>
        </div>
      </div>
    </header>

    <div className="space-y-6 p-3 sm:p-5 lg:p-6">
      <div>
        <h3 className="mb-2 text-balance text-sm font-black uppercase text-[var(--color-primary-deep)]">Player &amp; report information</h3>
        <div className="grid grid-cols-2 border-l border-t border-[var(--color-primary-border)] lg:grid-cols-5">
          {([
            ['positions', 'Position(s)'], ['preferredFoot', 'Preferred foot'], ['nationality', 'Nationality'],
            ['matchObserved', 'Match observed'], ['competitionLevel', 'Competition / level'],
          ] as const).map(([key, label]) => <label key={key} className="min-w-0 border-b border-r border-[var(--color-primary-border)] px-2 py-2 last:col-span-2 lg:last:col-span-1">
            <span className="block text-[11px] font-bold uppercase text-[var(--color-mid)]">{label}</span>
            <input className="mt-1 h-10 w-full min-w-0 border-0 border-b border-[var(--color-primary-border)] bg-transparent px-1 text-base text-[var(--color-dark)] outline-none focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary-border)] disabled:opacity-60" disabled={disabled} value={value[key]} onChange={event => updateText(key, event.target.value)} />
          </label>)}
        </div>
      </div>

      <div className="grid items-start gap-x-5 gap-y-6 xl:grid-cols-2">
        {TIPS_SECTIONS.map((section, index) => <section key={section.key} aria-labelledby={`tips-${section.key}-heading`}>
          <div className="mb-2 flex items-start gap-2 border-b border-[var(--color-primary-border)] pb-2">
            <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white', index % 2 === 0 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-accent)]')} aria-hidden="true">{section.title[0]}</span>
            <div className="min-w-0">
              <h3 id={`tips-${section.key}-heading`} className="text-balance font-serif text-lg font-bold uppercase leading-tight text-[var(--color-primary-deep)]"><span className="text-[var(--color-accent)]">{index + 1}.</span> {section.title}</h3>
              <p className="text-pretty text-xs italic text-[var(--color-mid)]">{SECTION_SUBTITLES[section.key]}</p>
            </div>
          </div>
          <table className="w-full table-fixed border-collapse text-left text-sm">
            <colgroup><col className="w-[38%]" /><col className="w-[17%]" /><col className="w-[45%]" /></colgroup>
            <thead><tr className="bg-[var(--color-primary-muted)] text-[var(--color-dark)]">
              <th scope="col" className="border border-[var(--color-primary-border)] px-2 py-1.5 text-xs font-bold uppercase">Attribute</th>
              <th scope="col" className="border border-[var(--color-primary-border)] px-1 py-1.5 text-center text-xs font-bold tabular-nums">1–10</th>
              <th scope="col" className="border border-[var(--color-primary-border)] px-2 py-1.5 text-xs font-bold uppercase">Notes</th>
            </tr></thead>
            <tbody>{section.attributes.map(([key, label]) => <tr key={key}>
              <th scope="row" className="break-words border border-[var(--color-primary-border)] bg-[var(--color-primary-muted)] px-2 py-1 text-left text-xs font-bold leading-tight text-[var(--color-dark)] sm:text-sm">{label}</th>
              <td className="border border-[var(--color-primary-border)] p-1 text-center">
                <input type="number" min="1" max="10" step="1" inputMode="numeric" aria-label={`${label} score out of 10`} className="mwos-tips-score h-11 w-full max-w-11 min-w-0 rounded-sm border border-[var(--color-primary-border)] bg-white px-0.5 text-center text-base font-bold tabular-nums text-[var(--color-dark)] outline-none focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary-border)] disabled:bg-[var(--color-light)] disabled:opacity-60" disabled={disabled} value={value.attributes[key].score} onChange={event => {
                  const next = event.target.value;
                  if (next === '' || (/^\d{1,2}$/.test(next) && Number(next) >= 1 && Number(next) <= 10)) updateAttribute(key, { score: next === '' ? '' : Number(next) });
                }} />
              </td>
              <td className="border border-[var(--color-primary-border)] p-1">
                <input aria-label={`${label} notes`} className="h-11 w-full min-w-0 rounded-sm border-0 border-b border-[var(--color-primary-border)] bg-white px-1.5 text-base text-[var(--color-dark)] outline-none focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary-border)] disabled:bg-[var(--color-light)] disabled:opacity-60" disabled={disabled} value={value.attributes[key].notes} onChange={event => updateAttribute(key, { notes: event.target.value })} />
              </td>
            </tr>)}</tbody>
          </table>
        </section>)}
      </div>

      <div className="border-t border-[var(--color-primary-border)] pt-4">
        <h3 className="mb-2 text-balance text-sm font-black uppercase text-[var(--color-primary-deep)]">5. Other notes <span className="font-normal italic normal-case text-[var(--color-mid)]">— injuries, character context, background</span></h3>
        <div className="border border-[var(--color-primary-border)] bg-white">
          <label className="block border-b border-[var(--color-primary-border)] p-2"><span className="block text-xs font-bold uppercase text-[var(--color-primary-deep)]">Other notes</span><textarea className="mt-1 min-h-20 w-full resize-y bg-transparent p-1 text-base text-[var(--color-dark)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-border)] disabled:opacity-60" rows={2} disabled={disabled} value={value.otherNotes} onChange={event => updateText('otherNotes', event.target.value)} /></label>
          <label className="block p-2"><span className="block text-xs font-bold uppercase text-[var(--color-primary-deep)]">Physicality</span><textarea className="mt-1 min-h-20 w-full resize-y bg-transparent p-1 text-base text-[var(--color-dark)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-border)] disabled:opacity-60" rows={2} disabled={disabled} value={value.physicality} onChange={event => updateText('physicality', event.target.value)} /></label>
        </div>
      </div>

      <fieldset className="border-t border-[var(--color-primary-border)] pt-4">
        <legend className="text-balance text-sm font-black uppercase text-[var(--color-primary-deep)]">6. Overall assessment</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {TIPS_ASSESSMENTS.map(option => <label key={option.value} className={cn('flex min-h-14 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold focus-within:ring-2 focus-within:ring-[var(--color-primary)]', ASSESSMENT_STYLES[option.value], value.overallAssessment === option.value && 'ring-2 ring-[var(--color-primary)]')}>
            <input type="radio" name="tips-overall-assessment" disabled={disabled} checked={value.overallAssessment === option.value} onChange={() => onChange({ ...value, overallAssessment: option.value })} className="size-4 shrink-0 accent-[var(--color-primary)]" />
            <span>{option.label}</span>
          </label>)}
        </div>
        <p className="mt-2 text-pretty text-xs text-[var(--color-mid)]">Choose the overall assessment yourself after reviewing the evidence; the app does not infer it from scores.</p>
      </fieldset>
    </div>
  </section>;
}
