import { describe, expect, it } from 'vitest';

import {
  buildStaffMaintenanceSummary,
  buildStaffOperationsMetrics,
  filterClubAccessUsers,
  filterStaffAccessEvents,
  filterStaffInvitations,
} from './staffOperationsDomain';

const users = [
  {
    id: 'user-1',
    name: 'Lloyd Mutasa',
    email: 'lloyd@mwosfc.com',
    roles: [{ slug: 'coach', label: 'Coach' }],
    teams: [{ id: 'team-1', slug: 'first-team', name: 'First Team', is_active: true }],
  },
  {
    id: 'user-2',
    name: 'Wonder Ngoko',
    email: 'wonder@mwosfc.com',
    roles: [
      { slug: 'coach', label: 'Coach' },
      { slug: 'scout', label: 'Scout' },
    ],
    teams: [
      { id: 'team-2', slug: 'u19', name: 'U19', is_active: true },
      { id: 'team-3', slug: 'u17', name: 'U17', is_active: true },
    ],
  },
  {
    id: 'user-3',
    name: 'Board Guest',
    email: 'board@mwosfc.com',
    roles: [],
    teams: [],
  },
  {
    id: 'user-4',
    name: 'QA Driver Smoke',
    email: 'danielvaduva994+qa-driver@gmail.com',
    roles: [{ slug: 'driver', label: 'Driver' }],
    teams: [{ id: 'team-1', slug: 'first-team', name: 'First Team', is_active: true }],
  },
] as const;

const invitations = [
  {
    id: 'invite-1',
    fullName: 'Peter Driver',
    email: 'driver@mwosfc.com',
    status: 'pending',
    roles: [{ slug: 'driver', label: 'Driver' }],
    teams: [{ id: 'team-1', slug: 'first-team', name: 'First Team', is_active: true }],
    createdAt: '2026-05-17T08:00:00.000Z',
    updatedAt: '2026-05-17T08:00:00.000Z',
    expiresAt: '2026-05-16T08:00:00.000Z',
  },
  {
    id: 'invite-2',
    fullName: 'TD Reviewer',
    email: 'td@mwosfc.com',
    status: 'accepted',
    roles: [{ slug: 'technical_director', label: 'Technical Director' }],
    teams: [],
    createdAt: '2026-05-10T08:00:00.000Z',
    updatedAt: '2026-05-11T08:00:00.000Z',
    expiresAt: '2026-05-17T08:00:00.000Z',
  },
  {
    id: 'invite-3',
    fullName: 'Invite Smoke',
    email: 'danielvaduva994+slice65@gmail.com',
    status: 'pending',
    roles: [{ slug: 'coach', label: 'Coach' }],
    teams: [{ id: 'team-1', slug: 'first-team', name: 'First Team', is_active: true }],
    createdAt: '2026-05-17T07:00:00.000Z',
    updatedAt: '2026-05-17T09:00:00.000Z',
    expiresAt: '2026-05-24T07:00:00.000Z',
  },
] as const;

const events = [
  {
    id: 'event-1',
    targetName: 'Peter Driver',
    targetEmail: 'driver@mwosfc.com',
    actorName: 'Daniel',
    title: 'Invitation created',
    detail: 'Roles: Driver · Teams: First Team',
    tone: 'info',
    roleLabels: ['Driver'],
    teamNames: ['First Team'],
    createdAt: '2026-05-16T10:00:00.000Z',
  },
  {
    id: 'event-2',
    targetName: 'Wonder Ngoko',
    targetEmail: 'wonder@mwosfc.com',
    actorName: 'Daniel',
    title: 'Club access revoked',
    detail: 'All club roles and team assignments were removed.',
    tone: 'warning',
    roleLabels: ['Coach', 'Scout'],
    teamNames: ['U19', 'U17'],
    createdAt: '2026-05-02T10:00:00.000Z',
  },
] as const;

describe('filterClubAccessUsers', () => {
  it('filters by search, role and team together', () => {
    expect(
      filterClubAccessUsers(users, {
        query: 'wonder',
        roleSlug: 'coach',
        teamName: 'U19',
      }).map((user) => user.id),
    ).toEqual(['user-2']);
  });

  it('keeps users with pending access visible through search', () => {
    expect(
      filterClubAccessUsers(users, {
        query: 'board',
        roleSlug: 'all',
        teamName: 'all',
      }).map((user) => user.id),
    ).toEqual(['user-3']);
  });
});

describe('filterStaffInvitations', () => {
  it('filters pending invitations by status scope and role', () => {
    expect(
      filterStaffInvitations(invitations, {
        query: '',
        roleSlug: 'driver',
        teamName: 'all',
        statusScope: 'pending',
      }).map((invite) => invite.id),
    ).toEqual(['invite-1']);
  });

  it('filters invitation history by search', () => {
    expect(
      filterStaffInvitations(invitations, {
        query: 'reviewer',
        roleSlug: 'all',
        teamName: 'all',
        statusScope: 'history',
      }).map((invite) => invite.id),
    ).toEqual(['invite-2']);
  });
});

describe('filterStaffAccessEvents', () => {
  it('filters events by query, role and tone', () => {
    expect(
      filterStaffAccessEvents(events, {
        query: 'driver',
        roleSlug: 'driver',
        teamName: 'First Team',
        tone: 'info',
      }).map((event) => event.id),
    ).toEqual(['event-1']);
  });
});

describe('buildStaffOperationsMetrics', () => {
  it('summarizes the current staff operations state', () => {
    expect(
      buildStaffOperationsMetrics(
        { users, invitations, events },
        { nowIso: '2026-05-17T12:00:00.000Z' },
      ),
    ).toEqual({
      activeStaffCount: 3,
      pendingInvitationCount: 2,
      stalePendingInvitationCount: 1,
      multiTeamStaffCount: 1,
      recentChangesCount: 1,
    });
  });
});

describe('buildStaffMaintenanceSummary', () => {
  it('flags likely test accounts and invitations without deleting anything', () => {
    expect(
      buildStaffMaintenanceSummary({
        users,
        invitations,
      }),
    ).toEqual({
      likelyTestUserCount: 1,
      likelyTestInvitationCount: 1,
      likelyTestUsers: [
        {
          id: 'user-4',
          source: 'user',
          name: 'QA Driver Smoke',
          email: 'danielvaduva994+qa-driver@gmail.com',
          reasonLabels: ['Test alias in email', 'QA marker in name', 'Smoke marker in name'],
          roleLabels: ['Driver'],
          teamNames: ['First Team'],
        },
      ],
      likelyTestInvitations: [
        {
          id: 'invite-3',
          source: 'invitation',
          name: 'Invite Smoke',
          email: 'danielvaduva994+slice65@gmail.com',
          reasonLabels: ['Test alias in email', 'Smoke marker in name'],
          roleLabels: ['Coach'],
          teamNames: ['First Team'],
          statusLabel: 'pending',
          updatedAt: '2026-05-17T09:00:00.000Z',
        },
      ],
    });
  });
});
