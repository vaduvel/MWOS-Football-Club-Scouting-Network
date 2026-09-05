import { describe, expect, it } from 'vitest';

import {
  buildOversightAttentionItems,
  buildOversightTeamSnapshot,
} from './oversightDomain';

describe('buildOversightTeamSnapshot', () => {
  it('marks teams with missing coach and missing training as action', () => {
    const snapshot = buildOversightTeamSnapshot({
      teamId: 'u17',
      teamSlug: 'u17',
      teamName: 'U17',
      coachCount: 0,
      training: null,
      transport: null,
    });

    expect(snapshot.readiness).toBe('action');
    expect(snapshot.issues.map((item) => item.title)).toEqual(['No coach assigned', 'Training plan missing']);
    expect(snapshot.trainingStatus).toBe('missing');
  });

  it('marks draft plans as watch when there are no high-severity issues', () => {
    const snapshot = buildOversightTeamSnapshot({
      teamId: 'u15',
      teamSlug: 'u15',
      teamName: 'U15',
      coachCount: 1,
      training: {
        planId: 'plan-1',
        status: 'draft',
        headline: 'Week build',
        weekStart: '2026-05-11',
        updatedAt: '2026-05-12T09:00:00.000Z',
      },
      transport: null,
    });

    expect(snapshot.readiness).toBe('watch');
    expect(snapshot.issues).toHaveLength(1);
    expect(snapshot.issues[0]?.title).toBe('Training plan still draft');
  });

  it('does not describe an existing plan as missing when its headline is empty', () => {
    const snapshot = buildOversightTeamSnapshot({
      teamId: 'u15',
      teamSlug: 'u15',
      teamName: 'U15',
      coachCount: 1,
      training: {
        planId: 'plan-without-headline',
        status: 'published',
        headline: '',
        weekStart: '2026-05-11',
        updatedAt: '2026-05-12T09:00:00.000Z',
      },
      transport: null,
    });

    expect(snapshot.trainingStatus).toBe('published');
    expect(snapshot.trainingHeadline).toBe('Training plan details available');
  });

  it('marks a team as ready when training and transport are covered', () => {
    const snapshot = buildOversightTeamSnapshot({
      teamId: 'first-team',
      teamSlug: 'first-team',
      teamName: 'First Team',
      coachCount: 2,
      training: {
        planId: 'plan-2',
        status: 'published',
        headline: 'Away prep',
        weekStart: '2026-05-11',
        updatedAt: '2026-05-12T09:00:00.000Z',
      },
      transport: {
        planId: 'transport-1',
        status: 'published',
        eventDate: '2026-05-16',
        destination: 'Bulawayo',
        driverAssigned: true,
        driverName: 'Driver One',
      },
    });

    expect(snapshot.readiness).toBe('ready');
    expect(snapshot.issues).toEqual([]);
  });
});

describe('buildOversightAttentionItems', () => {
  it('prioritizes high-severity team issues before pending invites', () => {
    const items = buildOversightAttentionItems({
      teams: [
        buildOversightTeamSnapshot({
          teamId: 'u19',
          teamSlug: 'u19',
          teamName: 'U19',
          coachCount: 0,
          training: null,
          transport: null,
        }),
      ],
      pendingInvitations: [
        {
          id: 'invite-1',
          fullName: 'Coach Invite',
          email: 'coach@example.com',
          createdAt: '2026-05-12T10:00:00.000Z',
        },
      ],
    });

    expect(items[0]?.severity).toBe('high');
    expect(items.some((item) => item.title === 'Pending staff invitation')).toBe(true);
  });
});
