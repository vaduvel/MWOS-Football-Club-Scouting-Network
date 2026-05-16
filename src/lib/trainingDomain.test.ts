import { describe, expect, it } from 'vitest';

import {
  buildTrainingWeek,
  detectMajorScheduleChange,
  normalizeTrainingDay,
  type TrainingDayDraft,
} from './trainingDomain';

describe('buildTrainingWeek', () => {
  it('creates a 7 day microcycle from the supplied week start date', () => {
    const days = buildTrainingWeek('2026-05-18');

    expect(days).toHaveLength(7);
    expect(days[0]?.date).toBe('2026-05-18');
    expect(days[6]?.date).toBe('2026-05-24');
    expect(days.every((day) => day.dayType === 'rest')).toBe(true);
  });
});

describe('detectMajorScheduleChange', () => {
  const baseDay: TrainingDayDraft = {
    dayIndex: 0,
    weekday: 'Monday',
    date: '2026-05-18',
    dayType: 'training',
    sessionTitle: 'Speed work',
    sessionType: 'field',
    startTime: '17:00',
    endTime: '18:30',
    location: 'Main pitch',
    focusTags: ['speed', 'power'],
    intensity: 3,
    volume: 2,
    objectives: 'Acceleration',
    exercises: 'Flying sprints',
    notes: '',
  };

  it('flags location and schedule changes for future training sessions', () => {
    const nextDay: TrainingDayDraft = {
      ...baseDay,
      startTime: '18:00',
      location: 'Gym hall',
    };

    expect(
      detectMajorScheduleChange(baseDay, nextDay, new Date('2026-05-17T08:00:00.000Z')),
    ).toEqual(['startTime', 'location']);
  });

  it('ignores changes for non-training days', () => {
    const nextDay: TrainingDayDraft = {
      ...baseDay,
      dayType: 'rest',
      location: 'Gym hall',
    };

    expect(
      detectMajorScheduleChange(baseDay, nextDay, new Date('2026-05-17T08:00:00.000Z')),
    ).toEqual([]);
  });
});

describe('normalizeTrainingDay', () => {
  const baseDay: TrainingDayDraft = {
    dayIndex: 2,
    weekday: 'Wednesday',
    date: '2026-05-20',
    dayType: 'training',
    sessionTitle: 'Base session',
    sessionType: 'field',
    startTime: '09:00',
    endTime: '10:30',
    location: 'Main pitch',
    focusTags: ['speed'],
    intensity: 3,
    volume: 2,
    objectives: 'Quality work',
    exercises: 'Flying sprints',
    notes: '',
  };

  it('normalizes active recovery days to recovery session type', () => {
    expect(
      normalizeTrainingDay({
        ...baseDay,
        dayType: 'active_recovery',
        sessionType: 'gym',
        intensity: 3,
        volume: 3,
      }),
    ).toMatchObject({
      dayType: 'active_recovery',
      sessionType: 'recovery',
      intensity: 1,
      volume: 1,
      startTime: '09:00',
      endTime: '10:30',
      location: 'Main pitch',
    });
  });

  it('clears timing and uses recovery session type for rest days', () => {
    expect(
      normalizeTrainingDay({
        ...baseDay,
        dayType: 'rest',
        sessionType: 'field',
      }),
    ).toMatchObject({
      dayType: 'rest',
      sessionType: 'recovery',
      startTime: '',
      endTime: '',
      location: '',
      focusTags: [],
      intensity: 1,
      volume: 1,
    });
  });
});
