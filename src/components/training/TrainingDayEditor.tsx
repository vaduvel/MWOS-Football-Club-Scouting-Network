import type { ChangeEvent, ReactNode } from 'react';
import type { TrainingPlanDay } from '../../lib/trainingData';

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
      {children}
    </label>
  );
}

type TrainingDayEditorProps = {
  day: TrainingPlanDay;
  canEdit: boolean;
  onChange: (next: TrainingPlanDay) => void;
};

function reviewBadge(day: TrainingPlanDay) {
  if (day.importReviewState === 'missing_info') {
    return {
      label: 'Missing info',
      className: 'bg-rose-100 text-rose-700',
    };
  }

  if (day.importReviewState === 'needs_review') {
    return {
      label: 'Needs review',
      className: 'bg-amber-100 text-amber-700',
    };
  }

  if (day.importReviewState === 'ready' && day.importedExcerpt) {
    return {
      label: 'Imported draft',
      className: 'bg-emerald-100 text-emerald-700',
    };
  }

  return {
    label: 'Structured day',
    className: 'bg-[var(--color-light)] text-[var(--color-dark)]',
  };
}

function joinNonEmpty(values: Array<string | null | undefined>) {
  return values.map((value) => (value || '').trim()).filter(Boolean).join(' · ');
}

function describeTimeBlock(day: TrainingPlanDay) {
  if (day.startTime && day.endTime) {
    return `${day.startTime} - ${day.endTime}`;
  }

  if (day.startTime) {
    return `${day.startTime} start`;
  }

  return day.dayType === 'training' ? 'Time missing' : 'No timed block';
}

function missingFieldCount(day: TrainingPlanDay) {
  if (day.dayType !== 'training') {
    return 0;
  }

  const required = [
    day.startTime,
    day.endTime,
    day.location,
    day.objectives,
    day.exercises,
  ];

  return required.filter((value) => !(value || '').trim()).length;
}

function reviewHint(day: TrainingPlanDay) {
  const missingCount = missingFieldCount(day);

  if (day.importReviewState === 'missing_info') {
    return {
      tone: 'mwos-card-tone-alert',
      iconTone: 'mwos-icon-tone-alert',
      title: 'This imported day still needs manual completion',
      detail:
        missingCount > 0
          ? `${missingCount} key field${missingCount === 1 ? '' : 's'} still need attention before publishing.`
          : 'Double-check the imported details before publishing.',
    };
  }

  if (day.importReviewState === 'needs_review') {
    return {
      tone: 'mwos-card-tone-alert',
      iconTone: 'mwos-icon-tone-alert',
      title: 'Review the imported details',
      detail:
        missingCount > 0
          ? `${missingCount} key field${missingCount === 1 ? '' : 's'} could not be fully confirmed from the source.`
          : 'The import looks usable, but it should still be checked before publishing.',
    };
  }

  if (day.importReviewState === 'ready' && day.importedExcerpt) {
    return {
      tone: 'mwos-card-tone-training',
      iconTone: 'mwos-icon-tone-training',
      title: 'Imported draft looks ready',
      detail: 'You can still adjust wording, times, or venue before publishing this day.',
    };
  }

  return null;
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'training' | 'transport' | 'alerts' | 'report';
}) {
  const shellTone =
    tone === 'training'
      ? 'mwos-card-tone-training'
      : tone === 'transport'
        ? 'mwos-card-tone-transport'
        : tone === 'alerts'
          ? 'mwos-card-tone-alert'
          : 'mwos-card-tone-report';

  return (
    <div className={`rounded-[20px] border p-3 ${shellTone}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">{label}</p>
      <p className="mt-2 text-sm font-black text-[var(--color-dark)]">{value}</p>
    </div>
  );
}

function SectionShell({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-[var(--color-mid)]/14 bg-[var(--color-light)]/48 p-4">
      <div className="mb-4">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">{title}</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{caption}</p>
      </div>
      {children}
    </section>
  );
}

export default function TrainingDayEditor({ day, canEdit, onChange }: TrainingDayEditorProps) {
  const badge = reviewBadge(day);
  const hint = reviewHint(day);
  const focusLabel = day.focusTags.length ? day.focusTags.join(', ') : 'No focus tags yet';
  const missingFields = missingFieldCount(day);
  const reviewValue =
    day.importReviewState === 'missing_info'
      ? missingFields > 0
        ? `${missingFields} field${missingFields === 1 ? '' : 's'} missing`
        : 'Needs completion'
      : day.importReviewState === 'needs_review'
        ? 'Review before publish'
        : 'Ready to publish';

  const update = <K extends keyof TrainingPlanDay>(field: K, value: TrainingPlanDay[K]) => {
    onChange({
      ...day,
      [field]: value,
    });
  };

  const handleDayTypeChange = (nextDayType: TrainingPlanDay['dayType']) => {
    if (nextDayType === day.dayType) {
      return;
    }

    if (nextDayType === 'training') {
      onChange({
        ...day,
        dayType: nextDayType,
        sessionType: day.sessionType === 'recovery' ? 'field' : day.sessionType,
      });
      return;
    }

    onChange({
      ...day,
      dayType: nextDayType,
      sessionType: 'recovery',
      intensity: 1,
      volume: 1,
      ...(nextDayType === 'rest'
        ? {
            startTime: '',
            endTime: '',
            location: '',
            focusTags: [],
          }
        : {}),
    });
  };

  const handleFocusTags = (event: ChangeEvent<HTMLInputElement>) => {
    const tags = event.target.value
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean);
    update('focusTags', tags);
  };

  return (
    <article className="mwos-card-tone-training rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
            Selected day
          </p>
          <h2 className="mt-2 text-balance text-xl font-black text-[var(--color-dark)] md:text-2xl">
            {day.weekday}
          </h2>
          <p className="mt-1 text-sm font-semibold text-[var(--color-mid)]">{day.date}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          <div className="mwos-chip-tone-report rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em]">
            {day.dayType.replace('_', ' ')}
          </div>
          <div className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${badge.className}`}>
            {badge.label}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard label="Time" value={describeTimeBlock(day)} tone="training" />
        <SummaryCard
          label="Location"
          value={(day.location || '').trim() || (day.dayType === 'training' ? 'Venue missing' : 'No venue needed')}
          tone="transport"
        />
        <SummaryCard
          label="Focus"
          value={day.dayType === 'training' ? focusLabel : 'Recovery / rest'}
          tone="report"
        />
        <SummaryCard label="Review" value={reviewValue} tone="alerts" />
      </div>

      {hint ? (
        <section className={`mt-5 rounded-[24px] border p-4 ${hint.tone}`}>
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${hint.iconTone}`}>
              {day.importReviewState === 'missing_info' ? '!' : '?'}
            </div>
            <div>
              <p className="text-sm font-black text-[var(--color-dark)]">{hint.title}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{hint.detail}</p>
            </div>
          </div>
        </section>
      ) : null}

      {day.importedExcerpt ? (
        <section className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50/70 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
            Imported excerpt
          </p>
          <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-amber-900">
            {day.importedExcerpt}
          </p>
        </section>
      ) : null}

      <SectionShell
        title="Day basics"
        caption="Confirm the day type, label, and the session essentials staff need to see first."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel>Day type</FieldLabel>
            <select
              value={day.dayType}
              onChange={(event) => handleDayTypeChange(event.target.value as TrainingPlanDay['dayType'])}
              disabled={!canEdit}
              className="w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-[var(--color-primary)]"
            >
              <option value="training">Training</option>
              <option value="active_recovery">Active recovery</option>
              <option value="rest">Rest</option>
            </select>
          </div>

          <div>
            <FieldLabel>Session title</FieldLabel>
            <input
              value={day.sessionTitle}
              onChange={(event) => update('sessionTitle', event.target.value)}
              disabled={!canEdit}
              placeholder={day.dayType === 'training' ? 'Match prep · Upper body · Recovery' : 'Optional label'}
              className="w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>

        {day.dayType === 'training' ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <FieldLabel>Session type</FieldLabel>
              <select
                value={day.sessionType}
                onChange={(event) => update('sessionType', event.target.value as TrainingPlanDay['sessionType'])}
                disabled={!canEdit}
                className="w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-[var(--color-primary)]"
              >
                <option value="field">Field</option>
                <option value="gym">Gym</option>
                <option value="conditioning">Conditioning</option>
                <option value="recovery">Recovery</option>
                <option value="video">Video</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <FieldLabel>Start time</FieldLabel>
              <input
                type="time"
                value={day.startTime}
                onChange={(event) => update('startTime', event.target.value)}
                disabled={!canEdit}
                className="w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <FieldLabel>End time</FieldLabel>
              <input
                type="time"
                value={day.endTime}
                onChange={(event) => update('endTime', event.target.value)}
                disabled={!canEdit}
                className="w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <FieldLabel>Location</FieldLabel>
              <input
                value={day.location}
                onChange={(event) => update('location', event.target.value)}
                disabled={!canEdit}
                placeholder="Main pitch · Gym · Away venue"
                className="w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-mid)]">
            Non-training days stay lightweight. You can still add a label, objective, and notes below for visibility.
          </p>
        )}
      </SectionShell>

      {day.dayType === 'training' ? (
        <SectionShell
          title="Training load"
          caption="Use focus, intensity, and volume to make the weekly microcycle easy to review later."
        >
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <FieldLabel>Focus tags</FieldLabel>
              <input
                value={day.focusTags.join(', ')}
                onChange={handleFocusTags}
                disabled={!canEdit}
                placeholder="Speed, Power, Lower body"
                className="w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <FieldLabel>Intensity</FieldLabel>
              <input
                type="range"
                min={1}
                max={3}
                step={1}
                value={day.intensity}
                onChange={(event) => update('intensity', Number(event.target.value) as 1 | 2 | 3)}
                disabled={!canEdit}
                className="mt-2 w-full accent-[var(--color-primary)]"
              />
              <p className="mt-1 text-sm font-black text-[var(--color-dark)]">{day.intensity}</p>
            </div>
            <div>
              <FieldLabel>Volume</FieldLabel>
              <input
                type="range"
                min={1}
                max={3}
                step={1}
                value={day.volume}
                onChange={(event) => update('volume', Number(event.target.value) as 1 | 2 | 3)}
                disabled={!canEdit}
                className="mt-2 w-full accent-[var(--color-primary)]"
              />
              <p className="mt-1 text-sm font-black text-[var(--color-dark)]">{day.volume}</p>
            </div>
          </div>
        </SectionShell>
      ) : null}

      <SectionShell
        title="Session content"
        caption="This is the part other staff will rely on when they need the plan details or a WhatsApp-ready summary."
      >
        <div className="grid gap-4">
          <div>
            <FieldLabel>Objectives</FieldLabel>
            <textarea
              value={day.objectives}
              onChange={(event) => update('objectives', event.target.value)}
              disabled={!canEdit}
              rows={3}
              placeholder="What should the team get from this day?"
              className="w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-3 py-3 text-sm font-semibold leading-6 outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div>
            <FieldLabel>Exercises / content</FieldLabel>
            <textarea
              value={day.exercises}
              onChange={(event) => update('exercises', event.target.value)}
              disabled={!canEdit}
              rows={5}
              placeholder="List the exercises, sets, intervals, game formats or key session blocks."
              className="w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-3 py-3 text-sm font-semibold leading-6 outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div>
            <FieldLabel>Coach notes</FieldLabel>
            <textarea
              value={day.notes}
              onChange={(event) => update('notes', event.target.value)}
              disabled={!canEdit}
              rows={3}
              placeholder="Extra instructions, live updates or context for staff."
              className="w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-3 py-3 text-sm font-semibold leading-6 outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>
      </SectionShell>
    </article>
  );
}
