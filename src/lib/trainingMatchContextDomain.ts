import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

import type { TrainingDayType } from './trainingDomain';

export type TrainingMatchContextFixtureCandidate = {
  id: string;
  opponent: string;
  competition: string;
  matchDate: string;
  kickoffTime: string;
  venue: string;
  status: 'draft' | 'published' | 'completed' | 'cancelled';
};

type TrainingMatchContextDayBase = {
  date: string;
  dayType: TrainingDayType;
};

function toValidDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function buildMatchDayOffsetLabel(dayDate: string, matchDate: string) {
  const day = toValidDate(dayDate);
  const match = toValidDate(matchDate);

  if (!day || !match) return null;

  const offset = differenceInCalendarDays(day, match);
  if (offset === 0) return 'MD';
  if (offset < 0) return `MD${offset}`;
  return `MD+${offset}`;
}

export function pickRelevantWeeklyFixture(
  fixtures: TrainingMatchContextFixtureCandidate[],
  weekStart: string,
) {
  const start = toValidDate(weekStart);
  if (!start) return null;

  const end = addDays(start, 6);

  return fixtures
    .filter((fixture) => fixture.status !== 'cancelled')
    .filter((fixture) => {
      const date = toValidDate(fixture.matchDate);
      if (!date) return false;
      return date >= start && date <= end;
    })
    .sort((left, right) => {
      const dateCompare = left.matchDate.localeCompare(right.matchDate);
      if (dateCompare !== 0) return dateCompare;
      return (left.kickoffTime || '').localeCompare(right.kickoffTime || '');
    })[0] || null;
}

export function annotateTrainingDaysWithMatchContext<T extends TrainingMatchContextDayBase>(
  days: T[],
  matchDate: string | null | undefined,
): Array<T & { matchContextLabel: string; isMatchDay: boolean }> {
  return days.map((day) => {
    const label = matchDate ? buildMatchDayOffsetLabel(day.date, matchDate) : null;
    return {
      ...day,
      matchContextLabel: label || '',
      isMatchDay: label === 'MD',
    };
  });
}

export function summarizeTrainingWeekAroundFixture<T extends TrainingMatchContextDayBase>(
  days: T[],
  matchDate: string,
) {
  const match = toValidDate(matchDate);
  if (!match) {
    return {
      preMatchSessionCount: 0,
      postMatchSessionCount: 0,
      postMatchRecoveryCount: 0,
      matchDayIndex: -1,
    };
  }

  let preMatchSessionCount = 0;
  let postMatchSessionCount = 0;
  let postMatchRecoveryCount = 0;
  let matchDayIndex = -1;

  days.forEach((day, index) => {
    const current = toValidDate(day.date);
    if (!current) return;

    const offset = differenceInCalendarDays(current, match);
    if (offset === 0) {
      matchDayIndex = index;
      return;
    }

    if (day.dayType === 'training' || day.dayType === 'active_recovery') {
      if (offset < 0) preMatchSessionCount += 1;
      if (offset > 0) postMatchSessionCount += 1;
    }

    if (offset > 0 && day.dayType === 'active_recovery') {
      postMatchRecoveryCount += 1;
    }
  });

  return {
    preMatchSessionCount,
    postMatchSessionCount,
    postMatchRecoveryCount,
    matchDayIndex,
  };
}

export function getTrainingWeekRange(weekStart: string) {
  const start = toValidDate(weekStart);
  if (!start) return null;

  const end = addDays(start, 6);
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  };
}
