import { describe, expect, it } from 'vitest';
import { canAccessMatchDayModule, canAccessTransportModule, canAccessTrainingModule, canAccessPlayerHub, canAccessScoutingModule, canAccessOversightModule } from './roleAccessDomain';
import { getClubHomeViewMode, buildClubHomeHero } from './clubHomeDomain';
import { validateInviteInput } from './inviteDomain';
import { validateClubAccessSelection } from './staffAccessDomain';

describe('Team Manager boundaries', () => {
  it('exposes only logistics modules', () => {
    const user = { roles: ['team_manager'] };
    expect([canAccessMatchDayModule(user), canAccessTransportModule(user)]).toEqual([true, true]);
    expect([canAccessTrainingModule(user), canAccessPlayerHub(user), canAccessScoutingModule(user), canAccessOversightModule(user)]).toEqual([false, false, false, false]);
    expect(getClubHomeViewMode(user.roles)).toBe('team_manager');
    expect(buildClubHomeHero('team_manager', 1).primaryPath).toBe('/match-day');
  });
  it('requires a team both on invitation and subsequent staff edits', () => {
    const input = { fullName: 'QA', email: 'qa@example.test', roleSlugs: ['team_manager'], teamIds: [] };
    expect(() => validateInviteInput(input)).toThrow('Select at least one team');
    expect(() => validateClubAccessSelection(input)).toThrow('Select at least one team');
    expect(validateInviteInput({ ...input, teamIds: ['team-a'] }).roleSlugs).toEqual(['team_manager']);
  });
});
