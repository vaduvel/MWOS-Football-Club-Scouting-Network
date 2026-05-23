import { describe, expect, it } from 'vitest';

import {
  annotateTrainingDaysWithMatchContext,
  buildMatchDayOffsetLabel,
  pickRelevantWeeklyFixture,
  summarizeTrainingWeekAroundFixture,
  type TrainingMatchContextFixtureCandidate,
} from './trainingMatchContextDomain';

describe('buildMatchDayOffsetLabel', () => {
  it('returns MD for the fixture date', () => {
    expect(buildMatchDayOffsetLabel('2026-05-24', '2026-05-24')).toBe('MD');
  });

  it('returns MD-n for sessions before the fixture', () => {
    expect(buildMatchDayOffsetLabel('2026-05-22', '2026-05-24')).toBe('MD-2');
  });

  it('returns MD+n for sessions after the fixture', () => {
    expect(buildMatchDayOffsetLabel('2026-05-26', '2026-05-24')).toBe('MD+2');
  });

  it('returns null for invalid dates', () => {
    expect(buildMatchDayOffsetLabel('invalid', '2026-05-24')).toBeNull();
  });
});

describe('pickRelevantWeeklyFixture', () => {
  const fixtures: TrainingMatchContextFixtureCandidate[] = [
    {
      id: 'cancelled',
      opponent: 'Ghosts',
      competition: 'Friendly',
      matchDate: '2026-05-20',
      kickoffTime: '14:00',
      venue: 'Away',
      status: 'cancelled',
    },
    {
      id: 'later',
      opponent: 'Dynamos',
      competition: 'League',
      matchDate: '2026-05-24',
      kickoffTime: '16:00',
      venue: 'Home',
      status: 'published',
    },
    {
      id: 'earlier',
      opponent: 'Highlanders',
      competition: 'Cup',
      matchDate: '2026-05-21',
      kickoffTime: '11:00',
      venue: 'Away',
      status: 'draft',
    },
  ];

  it('picks the earliest non-cancelled fixture inside the week window', () => {
    expect(pickRelevantWeeklyFixture(fixtures, '2026-05-18')?.id).toBe('earlier');
  });

  it('returns null when there is no valid fixture in the week', () => {
    expect(pickRelevantWeeklyFixture(fixtures, '2026-05-26')).toBeNull();
  });
});

describe('annotateTrainingDaysWithMatchContext', () => {
  it('adds MD labels to each day relative to the fixture', () => {
    const days = [
      { date: '2026-05-18', dayType: 'rest' as const },
      { date: '2026-05-19', dayType: 'training' as const },
      { date: '2026-05-20', dayType: 'training' as const },
    ];

    expect(
      annotateTrainingDaysWithMatchContext(days, '2026-05-19').map((day) => ({
        label: day.matchContextLabel,
        isMatchDay: day.isMatchDay,
      })),
    ).toEqual([
      { label: 'MD-1', isMatchDay: false },
      { label: 'MD', isMatchDay: true },
      { label: 'MD+1', isMatchDay: false },
    ]);
  });
});

describe('summarizeTrainingWeekAroundFixture', () => {
  it('counts build-up, recovery and total session windows around the match', () => {
    const summary = summarizeTrainingWeekAroundFixture(
      [
        { date: '2026-05-18', dayType: 'training' },
        { date: '2026-05-19', dayType: 'training' },
        { date: '2026-05-20', dayType: 'rest' },
        { date: '2026-05-21', dayType: 'training' },
        { date: '2026-05-22', dayType: 'active_recovery' },
        { date: '2026-05-23', dayType: 'training' },
        { date: '2026-05-24', dayType: 'rest' },
      ],
      '2026-05-21',
    );

    expect(summary).toEqual({
      preMatchSessionCount: 2,
      postMatchSessionCount: 2,
      postMatchRecoveryCount: 1,
      matchDayIndex: 3,
    });
  });
});
