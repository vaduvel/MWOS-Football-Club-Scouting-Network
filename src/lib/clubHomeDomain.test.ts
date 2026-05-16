import { describe, expect, it } from 'vitest';

import {
  buildClubHomeHero,
  buildClubHomeMetricCards,
  getClubHomeViewMode,
} from './clubHomeDomain';

describe('getClubHomeViewMode', () => {
  it('prioritizes leadership roles over operational roles', () => {
    expect(getClubHomeViewMode(['scout', 'coach', 'admin'])).toBe('leadership');
    expect(getClubHomeViewMode(['technical_director', 'coach'])).toBe('leadership');
    expect(getClubHomeViewMode(['board_observer', 'driver'])).toBe('leadership');
  });

  it('falls back through coach, driver, scout, then pending', () => {
    expect(getClubHomeViewMode(['coach', 'scout'])).toBe('coach');
    expect(getClubHomeViewMode(['driver'])).toBe('driver');
    expect(getClubHomeViewMode(['scout'])).toBe('scout');
    expect(getClubHomeViewMode([])).toBe('pending');
  });
});

describe('buildClubHomeHero', () => {
  it('gives coaches a training-first message tied to assigned teams', () => {
    expect(buildClubHomeHero('coach', 2)).toEqual(
      expect.objectContaining({
        eyebrow: 'Coach Workspace',
        title: 'Run the week across 2 assigned teams.',
        primaryLabel: 'Open training plans',
        primaryPath: '/training',
      }),
    );
  });

  it('gives drivers a transport-first message', () => {
    expect(buildClubHomeHero('driver', 1)).toEqual(
      expect.objectContaining({
        eyebrow: 'Driver Workspace',
        primaryLabel: 'Open transport plans',
        primaryPath: '/transport',
      }),
    );
  });
});

describe('buildClubHomeMetricCards', () => {
  it('builds leadership metrics from oversight counts', () => {
    const cards = buildClubHomeMetricCards('leadership', {
      assignedTeams: 5,
      unreadNotifications: 3,
      trainingPlansCurrentWeek: 4,
      publishedTrainingPlansCurrentWeek: 3,
      upcomingTransportPlans: 2,
      recentReports: 6,
      pendingInvitations: 1,
    });

    expect(cards.map((card) => card.label)).toEqual([
      'Active Teams',
      'Training Published',
      'Upcoming Transport',
      'Pending Invites',
    ]);
    expect(cards[1]).toEqual(
      expect.objectContaining({
        value: '3 / 4',
      }),
    );
  });

  it('builds coach metrics around assigned teams and current training state', () => {
    const cards = buildClubHomeMetricCards('coach', {
      assignedTeams: 2,
      unreadNotifications: 4,
      trainingPlansCurrentWeek: 2,
      publishedTrainingPlansCurrentWeek: 1,
      upcomingTransportPlans: 1,
      recentReports: 0,
      pendingInvitations: 0,
    });

    expect(cards.map((card) => card.label)).toEqual([
      'Assigned Teams',
      'Plans This Week',
      'Published',
      'Unread Alerts',
    ]);
    expect(cards[3]?.value).toBe('4');
  });
});
