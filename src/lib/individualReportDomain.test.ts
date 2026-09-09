import { describe, it, expect } from 'vitest';
import { createIndividualReport, validateIndividualReport } from './individualReportDomain';
import { canAccessInternalRoster } from './roleAccessDomain';
describe('individual scouting', () => {
  it('creates one external player and a linked evaluation without match requirements', () => {
    const report = createIndividualReport('QA Scout');
    expect(validateIndividualReport(report)).toContain('player name');
    report.players[0].name = 'QA External';
    expect(validateIndividualReport(report)).toBeNull();
    expect(report.home_team).toBe('');
    expect(report.away_team).toBe('');
  });
  it('rejects internal roster links', () => {
    const report = createIndividualReport('QA');
    report.players[0].name='QA External'; report.players[0].club_player_id='internal';
    expect(validateIndividualReport(report)).toContain('external');
  });
  it('does not grant internal roster access for the Scout role', () => {
    expect(canAccessInternalRoster({roles:['scout']})).toBe(false);
    expect(canAccessInternalRoster({roles:['admin','scout']})).toBe(true);
    expect(canAccessInternalRoster({roles:['team_manager']})).toBe(true);
  });
});
