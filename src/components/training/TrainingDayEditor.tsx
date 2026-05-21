import type { ChangeEvent, ReactNode } from 'react';
import { CalendarRange, ClipboardList, FileText, Loader2, PenSquare, Save, ScanLine, Sparkles } from 'lucide-react';
import type { TrainingPlanDay } from '../../lib/trainingData';

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mwos-form-label text-[var(--color-mid)]/92">
      {children}
    </label>
  );
}

function SectionIntro({
  step,
  title,
  description,
  icon,
}: {
  step: string;
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-4 md:mb-5">
      <div className="mwos-surface-intro">
        {icon ? (
          <div className="mwos-surface-intro-icon flex size-9 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
            {icon}
          </div>
        ) : null}
        <div className="mwos-surface-intro-copy">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-primary)]/72">
            {step}
          </p>
          <h3 className="mt-1 text-balance text-lg font-black text-[var(--color-dark)] md:text-[1.15rem]">
            {title}
          </h3>
          <p className="mt-1.5 max-w-2xl text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)]">
            {description}
          </p>
        </div>
      </div>
    </div>
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
    <article className="mwos-mobile-panel border-[var(--color-primary)]/18 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="mwos-pill bg-[var(--color-primary)] text-white shadow-none">
            Training plan
          </p>
          <h2 className="mt-3 text-balance text-2xl font-black text-[var(--color-dark)]">
            Add today&apos;s session
          </h2>
          <p className="mt-2 max-w-2xl text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)]">
            Start from a WhatsApp screenshot, a PDF, a paper photo, or write the session manually in the form below.
          </p>
        </div>
        <span className="mwos-pill mwos-pill-neutral w-fit">
          {reviewLabel(day)}
        </span>
      </div>

      {canEdit && (onScanPhoto || onImportPdf || onTypeManual) ? (
        <section className="mwos-mobile-panel-soft mt-5 border-[var(--color-primary)]/12 md:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-primary)]/72">
                Choose input
              </p>
              <h3 className="mt-1 text-base font-black text-[var(--color-dark)]">
                Start from an existing plan or write from scratch
              </h3>
              <p className="mt-1.5 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                If the coach already wrote it, import it. If not, type it below.
              </p>
            </div>
            {issueDayCount ? (
              <span className="mwos-pill mwos-pill-alert w-fit">
                {issueDayCount} to review
              </span>
            ) : null}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {onScanPhoto ? (
              <button
                type="button"
                onClick={onScanPhoto}
                className="mwos-btn mwos-btn-tertiary w-full"
              >
                <ScanLine size={17} />
                Scan photo
              </button>
            ) : null}
            {onImportPdf ? (
              <button
                type="button"
                onClick={onImportPdf}
                className="mwos-btn mwos-btn-secondary w-full"
              >
                <FileText size={17} />
                Import PDF
              </button>
            ) : null}
            {onTypeManual ? (
              <button
                type="button"
                onClick={onTypeManual}
                className="mwos-btn mwos-btn-primary w-full"
              >
                <PenSquare size={17} />
                Write manually
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="mt-4 grid gap-4 md:mt-6">
        <section className="mwos-mobile-panel-soft">
          <SectionIntro
            step="Step 1"
            title="Team and day"
            description="Choose the team, week and exact day before you fill the session details."
            icon={<CalendarRange size={18} />}
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="min-w-0">
              <FieldLabel>Team</FieldLabel>
              {teams.length > 0 && teamId && onSelectTeam ? (
                <select
                  value={teamId}
                  onChange={(event) => onSelectTeam(event.target.value)}
                  disabled={!canEdit}
                  className="mwos-select-field mwos-mobile-input block w-full min-w-0 max-w-full font-black sm:text-base"
                >
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mwos-mobile-input flex min-h-[52px] items-center font-black sm:text-base">
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
                className="mwos-date-field mwos-mobile-input block w-full min-w-0 max-w-full font-black sm:text-base"
              />
              {weekLabel ? (
                <p className="mwos-form-helper mt-2 text-[var(--color-mid)]">{weekLabel}</p>
              ) : null}
            </div>

            <div className="min-w-0">
              <FieldLabel>Day</FieldLabel>
              <select
                value={day.dayIndex}
                onChange={(event) => onSelectDay?.(Number(event.target.value))}
                disabled={!canEdit || !onSelectDay}
                className="mwos-select-field mwos-mobile-input block w-full min-w-0 max-w-full font-black sm:text-base"
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
                className="mwos-select-field mwos-mobile-input block w-full min-w-0 max-w-full font-black sm:text-base"
              >
                <option value="training">Training</option>
                <option value="active_recovery">Active recovery</option>
                <option value="rest">Rest / no training</option>
              </select>
            </div>
          </div>
        </section>

        <section className="mwos-mobile-panel border-[var(--color-mid)]/12 shadow-sm">
          <SectionIntro
            step="Step 2"
            title="Session details"
            description={
              trainingLikeDay
                ? 'Add the title, timing, objective and plan for this session.'
                : 'Name the rest day and only add notes if staff or players need a recovery instruction.'
            }
            icon={<ClipboardList size={18} />}
          />

          <div className="grid gap-4">
            <div>
              <FieldLabel>{trainingLikeDay ? 'Session title' : 'Rest day label'}</FieldLabel>
              <input
                value={day.sessionTitle}
                onChange={(event) => update('sessionTitle', event.target.value)}
                disabled={!canEdit}
                placeholder={day.dayType === 'training' ? 'Training starts @ 9:00am' : dayTypeLabel(day.dayType)}
                className="mwos-mobile-input"
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
                    className="mwos-mobile-input"
                  />
                </div>
                <div>
                  <FieldLabel>Venue</FieldLabel>
                  <input
                    value={day.location}
                    onChange={(event) => update('location', event.target.value)}
                    disabled={!canEdit}
                    placeholder="Ngoni Stadium / Main pitch"
                    className="mwos-mobile-input"
                  />
                </div>
              </div>
            ) : (
              <p className="mwos-mobile-note">
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
                  className="mwos-mobile-textarea"
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
                  className="mwos-mobile-textarea"
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
                className="mwos-mobile-textarea"
              />
            </div>
          </div>
        </section>

        {trainingLikeDay || day.importedExcerpt ? (
          <details className="mwos-mobile-panel-soft border-[var(--color-mid)]/12">
            <summary className="cursor-pointer list-none">
              <div className="mwos-surface-intro">
                <div className="mwos-surface-intro-icon mt-0.5 flex size-9 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
                  <Sparkles size={18} />
                </div>
                <div className="mwos-surface-intro-copy">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-primary)]/72">
                    Step 3
                  </p>
                  <h3 className="mt-1 text-base font-black text-[var(--color-primary)]">
                    Optional details
                  </h3>
                  <p className="mt-1.5 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                    Open this only if you need extra session metadata like focus tags, end time or imported text review.
                  </p>
                </div>
              </div>
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
                        className="mwos-mobile-input"
                      />
                    </div>
                    <div>
                      <FieldLabel>Session format</FieldLabel>
                      <select
                        value={day.sessionType}
                        onChange={(event) => update('sessionType', event.target.value as TrainingPlanDay['sessionType'])}
                        disabled={!canEdit}
                        className="mwos-select-field mwos-mobile-input"
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
                      className="mwos-mobile-input"
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
                <div className="mwos-subcard mwos-subcard-alert">
                  <p className="mwos-subcard-kicker text-[var(--color-accent)]">Text extracted from the source</p>
                  <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-dark)]">{day.importedExcerpt}</p>
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
          className="mwos-btn mwos-btn-secondary mt-4 hidden w-full uppercase tracking-[0.14em] md:inline-flex md:w-auto md:px-6"
        >
          {isSavingDraft ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
          Save this day
        </button>
      ) : null}
    </article>
  );
}
