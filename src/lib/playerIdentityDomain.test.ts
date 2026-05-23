import { describe, expect, it } from 'vitest';

import {
  buildScoutingPlayerIdentityKey,
  suggestClubPlayerMatches,
  type ClubPlayerMatchCandidate,
} from './playerIdentityDomain';

const clubCandidates: ClubPlayerMatchCandidate[] = [
  {
    id: 'club-1',
    displayName: 'Brian Chikudza',
    teamName: 'First Team',
    squadNumber: 7,
  },
  {
    id: 'club-2',
    displayName: 'Blessing Moyo',
    teamName: 'U19',
    squadNumber: 11,
  },
  {
    id: 'club-3',
    displayName: 'Brian Chikudza Junior',
    teamName: 'U17',
    squadNumber: 17,
  },
];

describe('buildScoutingPlayerIdentityKey', () => {
  it('prefers the linked internal player id when one exists', () => {
    expect(
      buildScoutingPlayerIdentityKey({
        clubPlayerId: 'club-1',
        name: 'Brian Chikudza',
        clubLabel: 'MWOS FC',
      }),
    ).toBe('club:club-1');
  });

  it('falls back to the legacy normalized name and club label key', () => {
    expect(
      buildScoutingPlayerIdentityKey({
        clubPlayerId: null,
        name: ' Brian   Chikudza ',
        clubLabel: ' MWOS FC ',
      }),
    ).toBe('brian chikudza::mwos fc');
  });
});

describe('suggestClubPlayerMatches', () => {
  it('prioritizes the exact internal name match for a scouted player', () => {
    const matches = suggestClubPlayerMatches(
      {
        name: 'Brian Chikudza',
        shirtNumber: 7,
      },
      clubCandidates,
    );

    expect(matches[0]).toEqual(
      expect.objectContaining({
        id: 'club-1',
        displayName: 'Brian Chikudza',
      }),
    );
    expect(matches[0]?.matchReason).toContain('Exact name match');
  });

  it('uses the shirt number as a tie-breaker when names are close', () => {
    const matches = suggestClubPlayerMatches(
      {
        name: 'Brian Chikudza',
        shirtNumber: 17,
      },
      clubCandidates,
    );

    expect(matches[0]).toEqual(
      expect.objectContaining({
        id: 'club-3',
        displayName: 'Brian Chikudza Junior',
      }),
    );
    expect(matches[0]?.matchReason).toContain('#17');
  });

  it('returns an empty list when the player name is too weak to match safely', () => {
    expect(
      suggestClubPlayerMatches(
        {
          name: 'B',
          shirtNumber: null,
        },
        clubCandidates,
      ),
    ).toEqual([]);
  });
});
