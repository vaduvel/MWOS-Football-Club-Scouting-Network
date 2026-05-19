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
        ? 'border-slate-300 bg-slate-50'
        : 'mwos-card-tone-report hover:border-slate-300',
      icon: 'mwos-icon-tone-report',
      badge: 'mwos-chip-tone-report',
    };
  }

  if (day.importReviewState === 'missing_info') {
    return {
      card: selected
        ? 'border-rose-300 bg-rose-50'
        : 'mwos-card-tone-alert hover:border-rose-300',
      icon: 'mwos-icon-tone-alert',
      badge: 'mwos-chip-tone-alert',
    };
  }

  if (day.importReviewState === 'needs_review') {
    return {
      card: selected
        ? 'border-amber-300 bg-amber-50'
        : 'mwos-card-tone-alert hover:border-amber-300',
      icon: 'mwos-icon-tone-alert',
      badge: 'mwos-chip-tone-alert',
    };
  }

  return {
    card: selected
      ? 'border-[var(--color-primary)]/26 bg-[var(--color-primary)]/5'
      : day.dayType === 'training'
        ? 'mwos-card-tone-training hover:border-[var(--color-primary)]/18'
        : 'mwos-card-tone-transport hover:border-emerald-300',
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
      className={cn('rounded-[24px] border p-4 text-left shadow-[0_14px_34px_rgba(49,39,131,0.05)] transition-all', tone.card)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">
            {day.weekday}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-mid)]">{day.date}</p>
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', tone.icon)}>
          <DayIcon dayType={day.dayType} />
        </div>
      </div>

      <h3 className="mt-4 text-base font-black text-[var(--color-dark)]">{typeLabel(day)}</h3>
      <p className="mt-2 min-h-[40px] text-sm font-semibold leading-6 text-[var(--color-mid)]">
        {day.dayType === 'training'
          ? `${day.startTime || '--:--'}${day.location ? ` · ${day.location}` : ''}`
          : day.notes || 'No extra notes added yet.'}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em]">
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
        <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
          <CalendarClock size={12} />
          Reminder sent
        </div>
      ) : day.importReviewState === 'missing_info' ? (
        <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rose-700">
          <AlertTriangle size={12} />
          Needs manual completion
        </div>
      ) : day.importReviewState === 'needs_review' ? (
        <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700">
          <AlertTriangle size={12} />
          Review before publish
        </div>
      ) : day.importReviewState === 'ready' && day.importedExcerpt ? (
        <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
          <CheckCircle2 size={12} />
          Draft extracted
        </div>
      ) : day.dayType === 'training' ? (
        <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-primary)]">
          <CheckCircle2 size={12} />
          Open editor
        </div>
      ) : null}
    </button>
  );
}
