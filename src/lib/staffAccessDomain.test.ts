import { describe, expect, it } from 'vitest';

import {
  buildClubAccessActionLabels,
  isRemovingOwnAdminRole,
  normalizeClubAccessSelection,
  validateClubAccessSelection,
} from './staffAccessDomain';

describe('normalizeClubAccessSelection', () => {
  it('deduplicates roles and teams and clears teams when no roles remain', () => {
    expect(
      normalizeClubAccessSelection({
        roleSlugs: [' Coach ', 'coach', 'SCOUT'],
        teamIds: ['team-1', 'team-1', ' team-2 '],
      }),
    ).toEqual({
      roleSlugs: ['coach', 'scout'],
      teamIds: ['team-1', 'team-2'],
    });

    expect(
      normalizeClubAccessSelection({
        roleSlugs: [],
        teamIds: ['team-1'],
      }),
    ).toEqual({
      roleSlugs: [],
      teamIds: [],
    });
  });
});

describe('validateClubAccessSelection', () => {
  it('allows clearing club access entirely', () => {
    expect(() =>
      validateClubAccessSelection({
        roleSlugs: [],
        teamIds: [],
      }),
    ).not.toThrow();
  });

  it('requires a team when any team-scoped role is selected', () => {
    expect(() =>
      validateClubAccessSelection({
        roleSlugs: ['coach'],
        teamIds: [],
      }),
    ).toThrow('Select at least one team for coach, driver, or scout access.');
  });
});

describe('isRemovingOwnAdminRole', () => {
  it('detects when an admin removes their own admin role', () => {
    expect(
      isRemovingOwnAdminRole({
        actingUserId: 'user-1',
        targetUserId: 'user-1',
        actingUserRoles: ['admin', 'scout'],
        nextRoleSlugs: ['scout'],
      }),
    ).toBe(true);
  });

  it('does not trigger for non-self edits or when admin stays assigned', () => {
    expect(
      isRemovingOwnAdminRole({
        actingUserId: 'user-1',
        targetUserId: 'user-2',
        actingUserRoles: ['admin'],
        nextRoleSlugs: [],
      }),
    ).toBe(false);

    expect(
      isRemovingOwnAdminRole({
        actingUserId: 'user-1',
        targetUserId: 'user-1',
        actingUserRoles: ['admin'],
        nextRoleSlugs: ['admin', 'coach'],
      }),
    ).toBe(false);
  });
});

describe('buildClubAccessActionLabels', () => {
  it('switches button copy when access is being cleared', () => {
    expect(
      buildClubAccessActionLabels({
        roleSlugs: ['coach'],
        teamIds: ['team-1'],
      }),
    ).toEqual({
      saveLabel: 'Save Club Access',
      successLabel: 'Club access updated',
      clearLabel: 'Clear Club Access',
      isClearing: false,
    });

    expect(
      buildClubAccessActionLabels({
        roleSlugs: [],
        teamIds: [],
      }),
    ).toEqual({
      saveLabel: 'Revoke Club Access',
      successLabel: 'Club access revoked',
      clearLabel: 'Access Already Cleared',
      isClearing: true,
    });
  });
});
