import { describe, expect, it } from 'vitest';

// The Netlify runtime is plain ESM JavaScript; this test exercises its shared reconciliation helper directly.
import {
  fetchExistingUserAccessState,
  fetchRolesAndTeams,
  getInvitationAuthLinkType,
  mergeInvitationAccess,
  requiresInvitationActivation,
} from '../../netlify/functions/_staff-invitations.js';

function fakeAccessCatalog() {
  return {
    from: (table: string) => ({ select: () => ({ in: (_column: string, values: string[]) => Promise.resolve({
      data: values.filter(value => value !== 'missing').map(value => table === 'roles'
        ? { id: `role-${value}`, slug: value, label: value }
        : { id: value, slug: value, name: value, is_active: value !== 'inactive' }), error: null,
    }) }) }),
  };
}

describe('invitation server role/team validation', () => {
  it('accepts a Scout with no team in the actual backend helper', async () => {
    await expect(fetchRolesAndTeams(fakeAccessCatalog(), ['scout'], [])).resolves.toMatchObject({ teams: [], roles: [{ slug: 'scout' }] });
  });
  it.each(['coach', 'team_manager', 'driver'])('rejects missing team for %s, including mixed Scout roles', async (role) => {
    await expect(fetchRolesAndTeams(fakeAccessCatalog(), [role], [])).rejects.toThrow(/team/i);
    await expect(fetchRolesAndTeams(fakeAccessCatalog(), ['scout', role], [])).rejects.toThrow(/team/i);
  });
  it('does not relax selected-role or selected-team validation', async () => {
    await expect(fetchRolesAndTeams(fakeAccessCatalog(), ['missing'], [])).rejects.toThrow(/roles/i);
    await expect(fetchRolesAndTeams(fakeAccessCatalog(), ['scout'], ['missing'])).rejects.toThrow(/teams/i);
    await expect(fetchRolesAndTeams(fakeAccessCatalog(), ['scout'], ['inactive'])).rejects.toThrow(/active teams/i);
  });
});

describe('mergeInvitationAccess', () => {
  it('deduplicates roles and teams across pending invitations for the same account', () => {
    const scoutRole = { id: 'role-scout', slug: 'scout', label: 'Scout' };
    const coachRole = { id: 'role-coach', slug: 'coach', label: 'Coach' };
    const firstTeam = { id: 'team-first', slug: 'first-team', name: 'First Team', is_active: true };
    const under19 = { id: 'team-u19', slug: 'u19', name: 'U19', is_active: true };

    expect(
      mergeInvitationAccess([
        {
          staff_invitation_roles: [{ roles: scoutRole }],
          staff_invitation_teams: [{ teams: firstTeam }],
        },
        {
          staff_invitation_roles: [{ roles: scoutRole }, { roles: coachRole }],
          staff_invitation_teams: [{ teams: firstTeam }, { teams: under19 }],
        },
      ]),
    ).toEqual({
      roles: [scoutRole, coachRole],
      teams: [firstTeam, under19],
    });
  });
});

describe('incomplete existing Auth accounts', () => {
  function fakeAccount({ confirmed, roles }: { confirmed: boolean; roles: string[] }) {
    return {
      from: () => ({ select: () => ({ eq: () => ({ limit: async () => ({ data: roles.map(role_id => ({ role_id })), error: null }) }) }) }),
      auth: { admin: { getUserById: async () => ({
        data: { user: { email: 'scout@example.test', email_confirmed_at: confirmed ? '2026-10-04T00:00:00Z' : null } },
        error: null,
      }) } },
    };
  }

  it('requires an activation link when a confirmed user has no club role', async () => {
    const service = fakeAccount({ confirmed: true, roles: [] });
    const state = await fetchExistingUserAccessState(service, 'user-1', 'scout@example.test');
    expect(requiresInvitationActivation(state)).toBe(true);
    expect(await getInvitationAuthLinkType(service, { resolved_user_id: 'user-1', email: 'scout@example.test' })).toBe('recovery');
  });

  it('uses a new invite link for an unconfirmed existing Auth user', async () => {
    const service = fakeAccount({ confirmed: false, roles: [] });
    const state = await fetchExistingUserAccessState(service, 'user-1', 'scout@example.test');
    expect(requiresInvitationActivation(state)).toBe(true);
    expect(await getInvitationAuthLinkType(service, { resolved_user_id: 'user-1', email: 'scout@example.test' })).toBe('invite');
  });

  it('keeps the immediate-access path for confirmed users who already have a club role', async () => {
    const state = await fetchExistingUserAccessState(fakeAccount({ confirmed: true, roles: ['scout'] }), 'user-1', 'scout@example.test');
    expect(requiresInvitationActivation(state)).toBe(false);
  });
});
