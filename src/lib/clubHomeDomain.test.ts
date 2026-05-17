import { describe, expect, it } from 'vitest';

import {
  buildClubHomeHero,
  buildClubHomeMetricCards,
  getClubHomeViewMode,
} from './clubHomeDomain';

describe('getClubHomeViewMode', () => {
  it('gives admin, technical director, and board observer distinct leadership modes', () => {
    expect(getClubHomeViewMode(['scout', 'coach', 'admin'])).toBe('admin');
    expect(getClubHomeViewMode(['technical_director', 'coach'])).toBe('technical_director');
    expect(getClubHomeViewMode(['board_observer', 'driver'])).toBe('board_observer');
  });

  it('falls back through coach, driver, scout, then pending', () => {
    expect(getClubHomeViewMode(['coach', 'scout'])).toBe('coach');
    expect(getClubHomeViewMode(['driver'])).toBe('driver');
    expect(getClubHomeViewMode(['scout'])).toBe('scout');
    expect(getClubHomeViewMode([])).toBe('pending');
  });
});

describe('buildClubHomeHero', () => {
  it('gives admins an operations-first message tied to oversight and staff access', () => {
    expect(buildClubHomeHero('admin', 5)).toEqual(
      expect.objectContaining({
        eyebrow: 'Admin Workspace',
        primaryLabel: 'Open oversight',
        secondaryLabel: 'Manage staff access',
      }),
    );
  });

  it('gives technical director a review-first message tied to training', () => {
    expect(buildClubHomeHero('technical_director', 5)).toEqual(
      expect.objectContaining({
        eyebrow: 'Technical Director Workspace',
        primaryLabel: 'Review training plans',
        secondaryLabel: 'Open oversight',
      }),
    );
  });

  it('gives board observer a read-only briefing message', () => {
    expect(buildClubHomeHero('board_observer', 5)).toEqual(
      expect.objectContaining({
        eyebrow: 'Board Briefing',
        primaryLabel: 'Open oversight',
        secondaryLabel: 'Open notifications',
      }),
    );
  });

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
  it('builds admin metrics from oversight counts and pending invitations', () => {
    const cards = buildClubHomeMetricCards('admin', {
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

  it('builds technical director metrics around planning coverage and alerts', () => {
    const cards = buildClubHomeMetricCards('technical_director', {
      assignedTeams: 5,
      unreadNotifications: 7,
      trainingPlansCurrentWeek: 4,
      publishedTrainingPlansCurrentWeek: 3,
      upcomingTransportPlans: 2,
      recentReports: 6,
      pendingInvitations: 1,
    });

    expect(cards.map((card) => card.label)).toEqual([
      'Active Teams',
      'Plans This Week',
      'Upcoming Transport',
      'Unread Alerts',
    ]);
    expect(cards[3]?.value).toBe('7');
  });

  it('builds board observer metrics as read-only club summary', () => {
    const cards = buildClubHomeMetricCards('board_observer', {
      assignedTeams: 5,
      unreadNotifications: 7,
      trainingPlansCurrentWeek: 4,
      publishedTrainingPlansCurrentWeek: 3,
      upcomingTransportPlans: 2,
      recentReports: 6,
      pendingInvitations: 1,
    });

    expect(cards.map((card) => card.label)).toEqual([
      'Active Teams',
      'Training Published',
      'Reports This Week',
      'Unread Alerts',
    ]);
    expect(cards[2]?.value).toBe('6');
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
