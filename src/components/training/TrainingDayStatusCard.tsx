import type { Attributes } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Dumbbell, MoonStar, RefreshCcw } from 'lucide-react';

import type { TrainingPlanDay } from '../../lib/trainingData';
import { cn } from '../../lib/utils';

function typeLabel(day: TrainingPlanDay) {
  if (day.dayType === 'training') {
    return day.sessionTitle || 'Training session';
  }

  if (day.dayType === 'active_recovery') {
    return day.sessionTitle || 'Active recovery';
  }

  return day.sessionTitle || 'Rest';
}

function DayIcon({ dayType }: { dayType: TrainingPlanDay['dayType'] }) {
  if (dayType === 'training') return <Dumbbell size={18} />;
  if (dayType === 'active_recovery') return <RefreshCcw size={18} />;
  return <MoonStar size={18} />;
}

function getReviewTone(day: TrainingPlanDay, selected: boolean) {
  if (day.dayType === 'rest') {
    return {
      card: selected
        ? 'border-[var(--color-border-report)] bg-white'
        : 'mwos-card-tone-report hover:border-[var(--color-border-report)]',
      icon: 'mwos-icon-tone-report',
      badge: 'mwos-chip-tone-report',
    };
  }

  if (day.importReviewState === 'missing_info') {
    return {
      card: selected
        ? 'mwos-card-tone-danger border-[var(--color-accent)]/26'
        : 'mwos-card-tone-danger hover:border-[var(--color-accent)]/32',
      icon: 'mwos-icon-tone-alert',
      badge: 'mwos-chip-tone-alert',
    };
  }

  if (day.importReviewState === 'needs_review') {
    return {
      card: selected
        ? 'mwos-card-tone-alert border-[var(--color-accent)]/18'
        : 'mwos-card-tone-alert hover:border-[var(--color-accent)]/28',
      icon: 'mwos-icon-tone-alert',
      badge: 'mwos-chip-tone-alert',
    };
  }

  return {
    card: selected
      ? 'border-[var(--color-primary)]/26 bg-[var(--color-primary)]/5'
      : day.dayType === 'training'
        ? 'mwos-card-tone-training hover:border-[var(--color-primary)]/18'
        : 'mwos-card-tone-transport hover:border-[var(--color-primary)]/18',
    icon: day.dayType === 'training'
      ? 'mwos-icon-tone-training'
      : 'mwos-icon-tone-transport',
    badge: day.dayType === 'training'
      ? 'mwos-chip-tone-training'
      : 'mwos-chip-tone-transport',
  };
}

function reviewLabel(day: TrainingPlanDay) {
  if (day.importReviewState === 'missing_info') return 'Missing info';
  if (day.importReviewState === 'needs_review') return 'Needs review';
  if (day.importReviewState === 'ready' && day.importedExcerpt) return 'Ready';
  return 'Structured';
}

type TrainingDayStatusCardProps = Attributes & {
  day: TrainingPlanDay;
  selected: boolean;
  onSelect: () => void;
};

export default function TrainingDayStatusCard({
  day,
  selected,
  onSelect,
}: TrainingDayStatusCardProps) {
  const tone = getReviewTone(day, selected);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn('rounded-[22px] border p-3.5 text-left shadow-[0_14px_34px_rgba(49,39,131,0.05)] transition-all md:rounded-[24px] md:p-4', tone.card)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)] md:text-[11px] md:tracking-[0.2em]">
            {day.weekday}
          </p>
          <p className="mt-1 text-xs font-semibold text-[var(--color-mid)] md:text-sm">{day.date}</p>
        </div>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-2xl md:h-10 md:w-10', tone.icon)}>
          <DayIcon dayType={day.dayType} />
        </div>
      </div>

      <h3 className="mt-3 text-sm font-black text-[var(--color-dark)] md:mt-4 md:text-base">{typeLabel(day)}</h3>
      <p className="mt-1.5 min-h-[32px] text-sm font-semibold leading-5 text-[var(--color-mid)] md:mt-2 md:min-h-[40px] md:leading-6">
        {day.dayType === 'training'
          ? `${day.startTime || '--:--'}${day.location ? ` · ${day.location}` : ''}`
          : day.notes || 'No extra notes added yet.'}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] md:mt-4 md:gap-2 md:text-[11px] md:tracking-[0.14em]">
        <span className={cn('rounded-full px-2 py-1', tone.badge)}>
          {day.importReviewState ? reviewLabel(day) : 'Structured'}
        </span>
        {day.dayType === 'training' ? (
          <>
            <span className="rounded-full bg-[var(--color-light)] px-2 py-1 text-[var(--color-mid)]">
              Intensity {day.intensity}
            </span>
            <span className="rounded-full bg-[var(--color-light)] px-2 py-1 text-[var(--color-mid)]">Volume {day.volume}</span>
          </>
        ) : null}
      </div>

      {day.reminderSentAt ? (
        <div className="mwos-pill mwos-pill-success mt-3 inline-flex items-center gap-1 md:mt-4">
          <CalendarClock size={12} />
          Reminder sent
        </div>
      ) : day.importReviewState === 'missing_info' ? (
        <div className="mwos-pill mwos-pill-danger mt-3 inline-flex items-center gap-1 md:mt-4">
          <AlertTriangle size={12} />
          Needs manual completion
        </div>
      ) : day.importReviewState === 'needs_review' ? (
        <div className="mwos-pill mwos-pill-alert mt-3 inline-flex items-center gap-1 md:mt-4">
          <AlertTriangle size={12} />
          Review before publish
        </div>
      ) : day.importReviewState === 'ready' && day.importedExcerpt ? (
        <div className="mwos-pill mwos-pill-success mt-3 inline-flex items-center gap-1 md:mt-4">
          <CheckCircle2 size={12} />
          Draft extracted
        </div>
      ) : day.dayType === 'training' ? (
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-primary)] md:mt-4">
          <CheckCircle2 size={12} />
          Open editor
        </div>
      ) : null}
    </button>
  );
}
