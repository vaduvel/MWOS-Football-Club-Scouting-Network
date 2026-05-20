import type { ChangeEvent, ReactNode } from 'react';
import { FileText, Loader2, PenSquare, Save, ScanLine } from 'lucide-react';
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
  teams?: Array<{ id: string; name: string }>;
  teamId?: string;
  days?: TrainingPlanDay[];
  teamName?: string;
  weekStart?: string;
  weekLabel?: string;
  onSelectTeam?: (teamId: string) => void;
  onSelectWeek?: (weekStart: string) => void;
  onSelectDay?: (dayIndex: number) => void;
  onSaveDraft?: () => void;
  isSavingDraft?: boolean;
  onScanPhoto?: () => void;
  onImportPdf?: () => void;
  onTypeManual?: () => void;
  issueDayCount?: number;
};

function dayTypeLabel(dayType: TrainingPlanDay['dayType']) {
  if (dayType === 'training') return 'Training';
  if (dayType === 'active_recovery') return 'Active recovery';
  return 'Rest / no training';
}

function reviewLabel(day: TrainingPlanDay) {
  if (day.importReviewState === 'missing_info') return 'Needs manual completion';
  if (day.importReviewState === 'needs_review') return 'Review imported details';
  if (day.importedExcerpt) return 'Imported draft';
  return 'Manual entry';
}

function intensityCopy(value: number) {
  if (value === 3) return 'High';
  if (value === 2) return 'Medium';
  return 'Low';
}

function volumeCopy(value: number) {
  if (value === 3) return 'High';
  if (value === 2) return 'Medium';
  return 'Low';
}

export default function TrainingDayEditor({
  day,
  canEdit,
  onChange,
  teams = [],
  teamId,
  days = [],
  teamName,
  weekStart,
  weekLabel,
  onSelectTeam,
  onSelectWeek,
  onSelectDay,
  onSaveDraft,
  isSavingDraft,
  onScanPhoto,
  onImportPdf,
  onTypeManual,
  issueDayCount = 0,
}: TrainingDayEditorProps) {
  const update = <K extends keyof TrainingPlanDay>(field: K, value: TrainingPlanDay[K]) => {
    onChange({
      ...day,
      [field]: value,
    });
  };

  const handleDayTypeChange = (nextDayType: TrainingPlanDay['dayType']) => {
    if (nextDayType === day.dayType) return;

    if (nextDayType === 'training') {
      onChange({
        ...day,
        dayType: nextDayType,
        sessionTitle: day.sessionTitle || 'Training session',
        sessionType: day.sessionType === 'recovery' ? 'field' : day.sessionType,
        importReviewState: 'ready',
      });
      return;
    }

    onChange({
      ...day,
      dayType: nextDayType,
      sessionType: 'recovery',
      intensity: 1,
      volume: 1,
      importReviewState: 'ready',
      ...(nextDayType === 'rest'
        ? {
            startTime: '',
            endTime: '',
            location: '',
            focusTags: [],
            objectives: '',
            exercises: '',
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

  const trainingLikeDay = day.dayType === 'training' || day.dayType === 'active_recovery';

  return (
    <article className="rounded-[28px] border border-[var(--color-primary)]/18 bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.07)] md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex rounded-full bg-[var(--color-primary)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
            Training plan
          </p>
          <h2 className="mt-3 text-balance text-2xl font-black text-[var(--color-dark)]">
            Add today&apos;s session
          </h2>
          <p className="mt-2 max-w-2xl text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)]">
            Start from a WhatsApp screenshot, a PDF, a paper photo, or write the session manually in the form below.
          </p>
        </div>
        <span className="w-fit rounded-full bg-[var(--color-light)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-mid)]">
          {reviewLabel(day)}
        </span>
      </div>

      {canEdit && (onScanPhoto || onImportPdf || onTypeManual) ? (
        <section className="mt-5 rounded-[24px] border border-[var(--color-primary)]/12 bg-[var(--color-light)]/54 p-3 md:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">
                Choose input
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                If the coach already wrote it, import it. If not, type it below.
              </p>
            </div>
            {issueDayCount ? (
              <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-amber-800">
                {issueDayCount} to review
              </span>
            ) : null}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {onScanPhoto ? (
              <button
                type="button"
                onClick={onScanPhoto}
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-white px-3 py-3 text-sm font-black text-[var(--color-primary)] shadow-sm"
              >
                <ScanLine size={17} />
                Scan photo
              </button>
            ) : null}
            {onImportPdf ? (
              <button
                type="button"
                onClick={onImportPdf}
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-white px-3 py-3 text-sm font-black text-[var(--color-primary)] shadow-sm"
              >
                <FileText size={17} />
                Import PDF
              </button>
            ) : null}
            {onTypeManual ? (
              <button
                type="button"
                onClick={onTypeManual}
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-3 py-3 text-sm font-black text-white shadow-[0_14px_28px_rgba(4,120,87,0.18)]"
              >
                <PenSquare size={17} />
                Write manually
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="mt-4 grid gap-4 md:mt-6">
        <section className="rounded-[24px] bg-[var(--color-light)]/50 p-4">
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">
            1. Team and day
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="min-w-0">
              <FieldLabel>Team</FieldLabel>
              {teams.length > 0 && teamId && onSelectTeam ? (
                <select
                  value={teamId}
                  onChange={(event) => onSelectTeam(event.target.value)}
                  disabled={!canEdit}
                  className="block h-14 w-full min-w-0 max-w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-4 py-3 text-sm font-black text-[var(--color-dark)] outline-none focus:border-[var(--color-primary)] sm:text-base"
                >
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="min-h-[52px] rounded-2xl border border-[var(--color-mid)]/16 bg-white px-4 py-3 text-sm font-black text-[var(--color-dark)] sm:text-base">
                  {teamName || 'Assigned team'}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <FieldLabel>Week</FieldLabel>
              <input
                type="date"
                value={weekStart || ''}
                onChange={(event) => onSelectWeek?.(event.target.value)}
                disabled={!canEdit || !onSelectWeek}
                className="block h-14 w-full min-w-0 max-w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-4 py-3 text-sm font-black text-[var(--color-dark)] outline-none focus:border-[var(--color-primary)] sm:text-base"
              />
              {weekLabel ? (
                <p className="mt-2 text-xs font-semibold text-[var(--color-mid)]">{weekLabel}</p>
              ) : null}
            </div>

            <div className="min-w-0">
              <FieldLabel>Day</FieldLabel>
              <select
                value={day.dayIndex}
                onChange={(event) => onSelectDay?.(Number(event.target.value))}
                disabled={!canEdit || !onSelectDay}
                className="block h-14 w-full min-w-0 max-w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-4 py-3 text-sm font-black text-[var(--color-dark)] outline-none focus:border-[var(--color-primary)] sm:text-base"
              >
                {(days.length ? days : [day]).map((option) => (
                  <option key={option.dayIndex} value={option.dayIndex}>
                    {option.weekday} · {option.date}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <FieldLabel>Day type</FieldLabel>
              <select
                value={day.dayType}
                onChange={(event) => handleDayTypeChange(event.target.value as TrainingPlanDay['dayType'])}
                disabled={!canEdit}
                className="block h-14 w-full min-w-0 max-w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-4 py-3 text-sm font-black text-[var(--color-dark)] outline-none focus:border-[var(--color-primary)] sm:text-base"
              >
                <option value="training">Training</option>
                <option value="active_recovery">Active recovery</option>
                <option value="rest">Rest / no training</option>
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-[var(--color-mid)]/12 bg-white p-4 shadow-sm">
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">
            2. Session details
          </p>

          <div className="grid gap-4">
            <div>
              <FieldLabel>{trainingLikeDay ? 'Session title' : 'Rest day label'}</FieldLabel>
              <input
                value={day.sessionTitle}
                onChange={(event) => update('sessionTitle', event.target.value)}
                disabled={!canEdit}
                placeholder={day.dayType === 'training' ? 'Training starts @ 9:00am' : dayTypeLabel(day.dayType)}
                className="w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-4 py-3 text-base font-semibold outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            {trainingLikeDay ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Start time</FieldLabel>
                  <input
                    type="time"
                    value={day.startTime}
                    onChange={(event) => update('startTime', event.target.value)}
                    disabled={!canEdit}
                    className="w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-4 py-3 text-base font-semibold outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <FieldLabel>Venue</FieldLabel>
                  <input
                    value={day.location}
                    onChange={(event) => update('location', event.target.value)}
                    disabled={!canEdit}
                    placeholder="Ngoni Stadium / Main pitch"
                    className="w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-4 py-3 text-base font-semibold outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>
            ) : (
              <p className="rounded-2xl bg-[var(--color-light)]/64 px-4 py-3 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                Rest days stay light. Add a note only if players or staff need a recovery instruction.
              </p>
            )}

            {trainingLikeDay ? (
              <div>
                <FieldLabel>Main objective</FieldLabel>
                <textarea
                  value={day.objectives}
                  onChange={(event) => update('objectives', event.target.value)}
                  disabled={!canEdit}
                  rows={3}
                  placeholder="Example: improve transition speed, finishing, recovery load, or match preparation."
                  className="w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-4 py-3 text-base font-semibold leading-7 outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            ) : null}

            {trainingLikeDay ? (
              <div>
                <FieldLabel>Session plan</FieldLabel>
                <textarea
                  value={day.exercises}
                  onChange={(event) => update('exercises', event.target.value)}
                  disabled={!canEdit}
                  rows={6}
                  placeholder="Write it like a WhatsApp plan: warm-up, technical work, small-sided game, finishing, cooldown."
                  className="w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-4 py-3 text-base font-semibold leading-7 outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            ) : null}

            <div>
              <FieldLabel>Notes for staff</FieldLabel>
              <textarea
                value={day.notes}
                onChange={(event) => update('notes', event.target.value)}
                disabled={!canEdit}
                rows={3}
                placeholder="Bring water bottles, recovery instruction, transport note, or coach context."
                className="w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-4 py-3 text-base font-semibold leading-7 outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
        </section>

        {trainingLikeDay || day.importedExcerpt ? (
          <details className="rounded-[24px] border border-[var(--color-mid)]/12 bg-[var(--color-light)]/45 p-4">
            <summary className="cursor-pointer list-none text-sm font-black text-[var(--color-primary)]">
              Optional details
            </summary>
            <div className="mt-4 grid gap-4">
              {trainingLikeDay ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>End time</FieldLabel>
                      <input
                        type="time"
                        value={day.endTime}
                        onChange={(event) => update('endTime', event.target.value)}
                        disabled={!canEdit}
                        className="w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-4 py-3 text-base font-semibold outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <FieldLabel>Session format</FieldLabel>
                      <select
                        value={day.sessionType}
                        onChange={(event) => update('sessionType', event.target.value as TrainingPlanDay['sessionType'])}
                        disabled={!canEdit}
                        className="w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-4 py-3 text-base font-semibold outline-none focus:border-[var(--color-primary)]"
                      >
                        <option value="field">Field</option>
                        <option value="gym">Gym</option>
                        <option value="conditioning">Conditioning</option>
                        <option value="recovery">Recovery</option>
                        <option value="video">Video</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Focus tags</FieldLabel>
                    <input
                      value={day.focusTags.join(', ')}
                      onChange={handleFocusTags}
                      disabled={!canEdit}
                      placeholder="Speed, finishing, lower body"
                      className="w-full rounded-2xl border border-[var(--color-mid)]/24 bg-white px-4 py-3 text-base font-semibold outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Intensity · {intensityCopy(day.intensity)}</FieldLabel>
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={1}
                        value={day.intensity}
                        onChange={(event) => update('intensity', Number(event.target.value) as 1 | 2 | 3)}
                        disabled={!canEdit}
                        className="mt-3 w-full accent-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <FieldLabel>Volume · {volumeCopy(day.volume)}</FieldLabel>
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={1}
                        value={day.volume}
                        onChange={(event) => update('volume', Number(event.target.value) as 1 | 2 | 3)}
                        disabled={!canEdit}
                        className="mt-3 w-full accent-[var(--color-primary)]"
                      />
                    </div>
                  </div>
                </>
              ) : null}

              {day.importedExcerpt ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm font-black text-amber-800">Text extracted from the source</p>
                  <p className="mt-3 text-sm font-semibold leading-6 text-amber-900">{day.importedExcerpt}</p>
                </div>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>

      {canEdit && onSaveDraft ? (
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSavingDraft}
          className="mt-4 hidden w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-4 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_14px_28px_rgba(49,39,131,0.18)] disabled:opacity-60 md:inline-flex md:w-auto md:px-6"
        >
          {isSavingDraft ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
          Save this day
        </button>
      ) : null}
    </article>
  );
}
