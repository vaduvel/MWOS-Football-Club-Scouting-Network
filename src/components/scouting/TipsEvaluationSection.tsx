import type { TipsAttributeKey, TipsEvaluation } from '../../lib/tipsEvaluationDomain';
import { createEmptyTipsEvaluation, TIPS_ASSESSMENTS, TIPS_SECTIONS } from '../../lib/tipsEvaluationDomain';

interface Props {
  value: TipsEvaluation | null | undefined;
  onChange: (next: TipsEvaluation) => void;
  disabled: boolean;
}

export default function TipsEvaluationSection({ value, onChange, disabled }: Props) {
  if (!value) return <section className="space-y-3 rounded-2xl bg-white p-4 md:p-6">
    <h2 className="text-lg font-bold text-[var(--color-dark)]">TIPS evaluation (optional)</h2>
    <p className="text-sm">Use the separate 1-10 TIPS methodology when needed. Existing 1-5 scores stay unchanged.</p>
    <button type="button" disabled={disabled} className="mwos-btn-secondary min-h-11" onClick={() => onChange(createEmptyTipsEvaluation())}>Add TIPS evaluation</button>
  </section>;

  const updateText = (key: keyof Pick<TipsEvaluation, 'positions' | 'preferredFoot' | 'nationality' | 'matchObserved' | 'competitionLevel' | 'otherNotes' | 'physicality'>, text: string) => onChange({ ...value, [key]: text });
  const updateAttribute = (key: TipsAttributeKey, changes: Partial<TipsEvaluation['attributes'][TipsAttributeKey]>) => onChange({
    ...value, attributes: { ...value.attributes, [key]: { ...value.attributes[key], ...changes } },
  });

  return <section className="space-y-5 rounded-2xl bg-white p-4 md:p-6" aria-labelledby="tips-heading">
    <div>
      <h2 id="tips-heading" className="text-lg font-bold text-[var(--color-dark)]">TIPS evaluation (optional)</h2>
      <p className="mt-1 text-sm">Technique, Intelligence, Personality and Speed use 1-10 scores. They are stored separately and never converted into the existing 1-5 evaluation.</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      {([
        ['positions', 'Position(s)'], ['preferredFoot', 'Preferred foot'], ['nationality', 'Nationality'],
        ['matchObserved', 'Match observed'], ['competitionLevel', 'Competition / level'],
      ] as const).map(([key, label]) => <label key={key} className="block"><span className="mwos-form-label">{label}</span><input className="mwos-mobile-input" disabled={disabled} value={value[key]} onChange={event => updateText(key, event.target.value)} /></label>)}
    </div>
    {TIPS_SECTIONS.map(section => <details key={section.key} className="rounded-xl border border-[var(--color-mid)]/20 p-3">
      <summary className="min-h-11 cursor-pointer py-2 font-bold">{section.title} · 1-10</summary>
      <div className="space-y-3 pt-2">
        {section.attributes.map(([key, label]) => <div key={key} className="grid gap-2 rounded-xl bg-[var(--color-light)] p-3 sm:grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1.5fr)] sm:items-end">
          <span className="text-sm font-semibold">{label}</span>
          <label className="block"><span className="mwos-form-label">Score</span><input type="number" min="1" max="10" step="1" inputMode="numeric" aria-label={`${label} score out of 10`} className="mwos-mobile-input" disabled={disabled} value={value.attributes[key].score} onChange={event => {
            const next = event.target.value;
            if (next === '' || (/^\d{1,2}$/.test(next) && Number(next) >= 1 && Number(next) <= 10)) updateAttribute(key, { score: next === '' ? '' : Number(next) });
          }} /></label>
          <label className="block"><span className="mwos-form-label">Notes</span><input aria-label={`${label} notes`} className="mwos-mobile-input" disabled={disabled} value={value.attributes[key].notes} onChange={event => updateAttribute(key, { notes: event.target.value })} /></label>
        </div>)}
      </div>
    </details>)}
    <label className="block"><span className="mwos-form-label">Other notes</span><textarea className="mwos-mobile-textarea" rows={3} disabled={disabled} value={value.otherNotes} onChange={event => updateText('otherNotes', event.target.value)} /></label>
    <label className="block"><span className="mwos-form-label">Physicality</span><textarea className="mwos-mobile-textarea" rows={3} disabled={disabled} value={value.physicality} onChange={event => updateText('physicality', event.target.value)} /></label>
    <label className="block"><span className="mwos-form-label">Overall assessment</span><select className="mwos-mobile-input" disabled={disabled} value={value.overallAssessment} onChange={event => onChange({ ...value, overallAssessment: event.target.value as TipsEvaluation['overallAssessment'] })}>
      <option value="">Select after review</option>
      {TIPS_ASSESSMENTS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select></label>
    <p className="text-xs">Choose the overall assessment yourself after reviewing the evidence; the app does not infer it from scores.</p>
  </section>;
}
