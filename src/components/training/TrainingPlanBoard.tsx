import { CalendarClock, Dumbbell, MoonStar, RefreshCcw } from 'lucide-react';
import type { TrainingPlanDay } from '../../lib/trainingData';

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

export default function TrainingPlanBoard({
  days,
  selectedDayIndex,
  onSelect,
}: {
  days: TrainingPlanDay[];
  selectedDayIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {days.map((day) => {
        const active = day.dayIndex === selectedDayIndex;
        return (
          <button
            key={`${day.dayIndex}-${day.date}`}
            type="button"
            onClick={() => onSelect(day.dayIndex)}
            className={`rounded-[24px] border p-4 text-left shadow-[0_14px_34px_rgba(49,39,131,0.05)] transition-all ${
              active
                ? 'border-[var(--color-primary)]/26 bg-[var(--color-primary)]/5'
                : 'border-[var(--color-mid)]/14 bg-white hover:border-[var(--color-primary)]/18'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">
                  {day.weekday}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-mid)]">{day.date}</p>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                  day.dayType === 'training'
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : day.dayType === 'active_recovery'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-700'
                }`}
              >
                <DayIcon dayType={day.dayType} />
              </div>
            </div>

            <h3 className="mt-4 text-base font-black text-[var(--color-dark)]">{typeLabel(day)}</h3>
            <p className="mt-2 min-h-[40px] text-sm font-semibold leading-6 text-[var(--color-mid)]">
              {day.dayType === 'training'
                ? `${day.startTime || '--:--'}${day.location ? ` · ${day.location}` : ''}`
                : day.notes || 'No extra notes added yet.'}
            </p>

            {day.dayType === 'training' ? (
              <div className="mt-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-mid)]">
                <span className="rounded-full bg-[var(--color-light)] px-2 py-1">
                  Intensity {day.intensity}
                </span>
                <span className="rounded-full bg-[var(--color-light)] px-2 py-1">Volume {day.volume}</span>
              </div>
            ) : null}

            {day.reminderSentAt ? (
              <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
                <CalendarClock size={12} />
                Reminder sent
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
