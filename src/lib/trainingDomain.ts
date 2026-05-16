import { addDays, format, parseISO } from 'date-fns';

export type TrainingPlanStatus = 'draft' | 'published' | 'updated' | 'archived';
export type TrainingDayType = 'training' | 'active_recovery' | 'rest';
export type TrainingSessionType = 'field' | 'gym' | 'conditioning' | 'recovery' | 'video' | 'hybrid';

export type TrainingDayDraft = {
  dayIndex: number;
  weekday: string;
  date: string;
  dayType: TrainingDayType;
  sessionTitle: string;
  sessionType: TrainingSessionType;
  startTime: string;
  endTime: string;
  location: string;
  focusTags: string[];
  intensity: 1 | 2 | 3;
  volume: 1 | 2 | 3;
  objectives: string;
  exercises: string;
  notes: string;
  reminderSentAt?: string | null;
  lastImportantChangeAt?: string | null;
};

const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export function buildTrainingWeek(weekStart: string): TrainingDayDraft[] {
  const start = parseISO(weekStart);

  return WEEKDAY_LABELS.map((weekday, dayIndex) => ({
    dayIndex,
    weekday,
    date: format(addDays(start, dayIndex), 'yyyy-MM-dd'),
    dayType: 'rest',
    sessionTitle: '',
    sessionType: 'field',
    startTime: '',
    endTime: '',
    location: '',
    focusTags: [],
    intensity: 1,
    volume: 1,
    objectives: '',
    exercises: '',
    notes: '',
    reminderSentAt: null,
    lastImportantChangeAt: null,
  }));
}

export function normalizeTrainingDay(day: TrainingDayDraft): TrainingDayDraft {
  if (day.dayType === 'training') {
    return day;
  }

  if (day.dayType === 'active_recovery') {
    return {
      ...day,
      sessionType: 'recovery',
      intensity: 1,
      volume: 1,
    };
  }

  return {
    ...day,
    sessionType: 'recovery',
    startTime: '',
    endTime: '',
    location: '',
    focusTags: [],
    intensity: 1,
    volume: 1,
  };
}

function toSessionDateTime(day: TrainingDayDraft) {
  const time = day.startTime || '00:00';
  return new Date(`${day.date}T${time}:00.000Z`);
}

export function detectMajorScheduleChange(
  previous: TrainingDayDraft,
  next: TrainingDayDraft,
  now = new Date(),
): Array<'date' | 'startTime' | 'endTime' | 'location'> {
  if (previous.dayType !== 'training' || next.dayType !== 'training') {
    return [];
  }

  if (toSessionDateTime(next) <= now) {
    return [];
  }

  const changed: Array<'date' | 'startTime' | 'endTime' | 'location'> = [];
  if (previous.date !== next.date) changed.push('date');
  if (previous.startTime !== next.startTime) changed.push('startTime');
  if (previous.endTime !== next.endTime) changed.push('endTime');
  if ((previous.location || '').trim() !== (next.location || '').trim()) changed.push('location');

  return changed;
}
