import { describe, expect, it } from 'vitest';

import {
  buildLinkedTransportDraft,
  buildMatchDayStatusTotals,
  groupMatchDaySelections,
  linkedTransportBelongsToTeam,
  pickNextRelevantFixture,
  type PlayerMatchDayCandidate,
} from './matchDayDomain';

describe('buildMatchDayStatusTotals', () => {
  it('counts availability and selection totals', () => {
    expect(
      buildMatchDayStatusTotals([
        { availabilityStatus: 'available', selectionStatus: 'starter' },
        { availabilityStatus: 'available', selectionStatus: 'bench' },
        { availabilityStatus: 'doubtful', selectionStatus: 'out' },
        { availabilityStatus: 'unavailable', selectionStatus: 'out' },
      ]),
    ).toEqual({
      totalPlayers: 4,
      availableCount: 2,
      doubtfulCount: 1,
      unavailableCount: 1,
      starterCount: 1,
      benchCount: 1,
      outCount: 2,
    });
  });
});

describe('groupMatchDaySelections', () => {
  it('groups starters, bench, out, and unavailable rows', () => {
    const rows = [
      { id: 'a', availabilityStatus: 'available' as const, selectionStatus: 'starter' as const },
      { id: 'b', availabilityStatus: 'available' as const, selectionStatus: 'bench' as const },
      { id: 'c', availabilityStatus: 'doubtful' as const, selectionStatus: 'out' as const },
      { id: 'd', availabilityStatus: 'unavailable' as const, selectionStatus: 'out' as const },
    ];

    const grouped = groupMatchDaySelections(rows);
    expect(grouped.starters.map((row) => row.id)).toEqual(['a']);
    expect(grouped.bench.map((row) => row.id)).toEqual(['b']);
    expect(grouped.out.map((row) => row.id)).toEqual(['c', 'd']);
    expect(grouped.unavailable.map((row) => row.id)).toEqual(['d']);
  });
});

describe('pickNextRelevantFixture', () => {
  const fixtures: PlayerMatchDayCandidate[] = [
    {
      matchDayId: 'past-published',
      teamId: 'team-1',
      teamName: 'U17',
      opponent: 'Rivals',
      competition: 'League',
      matchDate: '2026-05-18',
      kickoffTime: '14:00',
      venue: 'Away',
      workflowStatus: 'published',
      availabilityStatus: 'available',
      selectionStatus: 'starter',
      notes: '',
    },
    {
      matchDayId: 'next-draft',
      teamId: 'team-1',
      teamName: 'U17',
      opponent: 'Academy',
      competition: 'Cup',
      matchDate: '2026-05-24',
      kickoffTime: '11:00',
      venue: 'Home',
      workflowStatus: 'draft',
      availabilityStatus: 'doubtful',
      selectionStatus: 'bench',
      notes: '',
    },
    {
      matchDayId: 'cancelled',
      teamId: 'team-1',
      teamName: 'U17',
      opponent: 'Ghosts',
      competition: 'Friendly',
      matchDate: '2026-05-23',
      kickoffTime: '18:00',
      venue: 'Away',
      workflowStatus: 'cancelled',
      availabilityStatus: 'available',
      selectionStatus: 'out',
      notes: '',
    },
  ];

  it('prefers the next upcoming non-cancelled fixture', () => {
    const result = pickNextRelevantFixture(fixtures, new Date('2026-05-22T09:00:00.000Z'));
    expect(result?.matchDayId).toBe('next-draft');
  });

  it('falls back to the latest historical fixture when no future fixture exists', () => {
    const result = pickNextRelevantFixture(fixtures, new Date('2026-06-01T09:00:00.000Z'));
    expect(result?.matchDayId).toBe('next-draft');
  });

  it('returns null when every fixture is cancelled', () => {
    const result = pickNextRelevantFixture(
      fixtures.map((fixture) => ({ ...fixture, workflowStatus: 'cancelled' as const })),
      new Date('2026-05-22T09:00:00.000Z'),
    );
    expect(result).toBeNull();
  });
});

describe('buildLinkedTransportDraft', () => {
  it('prefills a transport draft from the fixture context', () => {
    expect(
      buildLinkedTransportDraft({
        opponent: 'Dynamos',
        matchDate: '2026-05-30',
        venue: 'National Sports Stadium',
      }),
    ).toEqual({
      title: 'Match transport · Dynamos',
      contextType: 'match',
      eventDate: '2026-05-30',
      departureTime: '',
      arrivalTargetTime: '',
      meetingPoint: '',
      destination: 'National Sports Stadium',
      driverUserId: '',
      notes: '',
      contactNotes: '',
      status: 'draft',
    });
  });

  it('falls back to opponent when venue is missing', () => {
    expect(
      buildLinkedTransportDraft({
        opponent: 'Highlanders',
        matchDate: '2026-06-06',
        venue: '',
      }).destination,
    ).toBe('Highlanders');
  });
});

describe('linkedTransportBelongsToTeam', () => {
  it('returns true when the linked transport is on the same team', () => {
    expect(linkedTransportBelongsToTeam('team-a', 'team-a')).toBe(true);
  });

  it('returns false when the linked transport belongs to another team', () => {
    expect(linkedTransportBelongsToTeam('team-a', 'team-b')).toBe(false);
  });
});
