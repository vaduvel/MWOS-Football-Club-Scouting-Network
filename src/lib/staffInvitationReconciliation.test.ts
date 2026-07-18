import { describe, expect, it } from 'vitest';

// The Netlify runtime is plain ESM JavaScript; this test exercises its shared reconciliation helper directly.
import { mergeInvitationAccess } from '../../netlify/functions/_staff-invitations.js';

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
