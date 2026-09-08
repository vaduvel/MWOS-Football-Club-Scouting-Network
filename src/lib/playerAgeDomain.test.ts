import { describe, expect, it } from 'vitest';
import { buildSquadAgeSummary, getPlayerAge } from './playerAgeDomain';
import { buildClubPlayerSavePayload, createEmptyClubPlayerDraft } from './clubPlayersDomain';

describe('squad age', () => {
  const today = new Date('2026-09-08T12:00:00Z');
  it('uses completed years around the birthday', () => {
    expect(getPlayerAge('2006-09-08', today)).toBe(20);
    expect(getPlayerAge('2006-09-09', today)).toBe(19);
    expect(getPlayerAge('2006-09-07', today)).toBe(20);
  });
  it('handles leap-day birthdays without normalizing invalid dates', () => {
    expect(getPlayerAge('2004-02-29', new Date('2025-02-28T12:00Z'))).toBe(20);
    expect(getPlayerAge('2004-02-29', new Date('2025-03-01T12:00Z'))).toBe(21);
    expect(getPlayerAge('2005-02-29', today)).toBeNull();
  });
  it.each([null, undefined, '', 'invalid', '2026-09-09', '2000-13-01', '2000-02-30'])('excludes missing, invalid and future DOB %s', value => {
    expect(getPlayerAge(value, today)).toBeNull();
  });
  it('averages only active players with valid dates and reports coverage', () => {
    expect(buildSquadAgeSummary([
      { dateOfBirth: '2006-09-08' }, { dateOfBirth: '2007-09-08' },
      { dateOfBirth: null }, { dateOfBirth: '1990-01-01', isActive: false },
    ], today)).toEqual({ averageAge: 19.5, knownAgeCount: 2, totalActivePlayers: 3 });
    expect(buildSquadAgeSummary([], today)).toEqual({ averageAge: null, knownAgeCount: 0, totalActivePlayers: 0 });
  });
  it('preserves a birth date in the save payload and rejects a future date', () => {
    const draft = { ...createEmptyClubPlayerDraft(), firstName: 'QA', dateOfBirth: '2000-01-01' };
    expect(buildClubPlayerSavePayload('team-1', draft).payload?.date_of_birth).toBe('2000-01-01');
    expect(buildClubPlayerSavePayload('team-1', { ...draft, dateOfBirth: '2999-01-01' }).payload).toBeNull();
  });
});
