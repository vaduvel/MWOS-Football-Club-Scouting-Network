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

export default function TrainingDayEditor({ day, canEdit, onChange }: TrainingDayEditorProps) {
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
    <article className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
            Selected day
          </p>
          <h2 className="mt-2 text-2xl font-black text-[var(--color-dark)]">
            {day.weekday}
          </h2>
          <p className="mt-1 text-sm font-semibold text-[var(--color-mid)]">{day.date}</p>
        </div>
        <div className="rounded-full border border-[var(--color-mid)]/14 bg-[var(--color-light)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-dark)]">
          {day.dayType.replace('_', ' ')}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
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
        <>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

          <div className="mt-4 grid gap-4 md:grid-cols-3">
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
        </>
      ) : null}

      <div className="mt-4 grid gap-4">
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
    </article>
  );
}
