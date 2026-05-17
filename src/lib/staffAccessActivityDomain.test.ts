import { describe, expect, it } from 'vitest';

import { buildStaffAccessEventSummary, buildStaffingHealthCards } from './staffAccessActivityDomain';

describe('buildStaffAccessEventSummary', () => {
  it('formats revoke events clearly', () => {
    expect(
      buildStaffAccessEventSummary({
        actionType: 'access_revoked',
        roleLabels: [],
        teamNames: [],
      }),
    ).toEqual({
      title: 'Club access revoked',
      detail: 'All club roles and team assignments were removed.',
      tone: 'warning',
    });
  });

  it('formats update events with roles and teams', () => {
    expect(
      buildStaffAccessEventSummary({
        actionType: 'access_updated',
        roleLabels: ['Coach', 'Scout'],
        teamNames: ['U19', 'First Team'],
      }),
    ).toEqual({
      title: 'Club access updated',
      detail: 'Roles: Coach, Scout · Teams: U19, First Team',
      tone: 'success',
    });
  });

  it('formats invitation actions for audit display', () => {
    expect(
      buildStaffAccessEventSummary({
        actionType: 'invite_cancelled',
        roleLabels: ['Coach'],
        teamNames: ['U17'],
      }),
    ).toEqual({
      title: 'Invitation cancelled',
      detail: 'Roles: Coach · Teams: U17',
      tone: 'warning',
    });

    expect(
      buildStaffAccessEventSummary({
        actionType: 'invite_applied_existing',
        roleLabels: ['Driver'],
        teamNames: ['First Team'],
      }),
    ).toEqual({
      title: 'Existing account updated',
      detail: 'Roles: Driver · Teams: First Team',
      tone: 'success',
    });

    expect(
      buildStaffAccessEventSummary({
        actionType: 'invite_expired',
        roleLabels: ['Coach'],
        teamNames: ['U17'],
      }),
    ).toEqual({
      title: 'Invitation expired',
      detail: 'Roles: Coach · Teams: U17',
      tone: 'warning',
    });
  });
});

describe('buildStaffingHealthCards', () => {
  it('formats staffing health cards with admin activity when available', () => {
    expect(
      buildStaffingHealthCards({
        unassignedStaffAccounts: 2,
        multiTeamStaff: 1,
        pendingInvitations: 3,
        recentAccessChanges: 4,
      }),
    ).toEqual([
      expect.objectContaining({
        label: 'Unassigned accounts',
        value: '2',
      }),
      expect.objectContaining({
        label: 'Multi-team staff',
        value: '1',
      }),
      expect.objectContaining({
        label: 'Pending invites',
        value: '3',
      }),
      expect.objectContaining({
        label: 'Recent access changes',
        value: '4',
      }),
    ]);
  });

  it('hides recent access changes when the role should not see activity', () => {
    expect(
      buildStaffingHealthCards({
        unassignedStaffAccounts: 0,
        multiTeamStaff: 2,
        pendingInvitations: 1,
        recentAccessChanges: null,
      }),
    ).toEqual([
      expect.objectContaining({ label: 'Unassigned accounts', value: '0' }),
      expect.objectContaining({ label: 'Multi-team staff', value: '2' }),
      expect.objectContaining({ label: 'Pending invites', value: '1' }),
    ]);
  });
});
