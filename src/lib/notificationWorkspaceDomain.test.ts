import { describe, expect, it } from 'vitest';

import {
  buildNotificationWorkspaceStats,
  filterNotificationItems,
  getNotificationCategory,
} from './notificationWorkspaceDomain';
import type { TrainingNotificationItem } from './trainingData';

const sampleItems: TrainingNotificationItem[] = [
  {
    id: '1',
    type: 'training_plan_published',
    title: 'U17 training plan published',
    message: 'Plan published',
    linkPath: '/training?team=u17',
    teamName: 'U17',
    planId: 'plan-1',
    dayId: null,
    emailEnabled: true,
    emailSentAt: '2026-05-13T07:00:00.000Z',
    readAt: null,
    createdAt: '2026-05-13T07:00:00.000Z',
  },
  {
    id: '2',
    type: 'transport_plan_updated',
    title: 'U19 transport updated',
    message: 'Departure moved',
    linkPath: '/transport?team=u19',
    teamName: 'U19',
    planId: 'trip-1',
    dayId: null,
    emailEnabled: true,
    emailSentAt: null,
    readAt: '2026-05-13T08:00:00.000Z',
    createdAt: '2026-05-13T07:30:00.000Z',
  },
  {
    id: '3',
    type: 'training_td_comment',
    title: 'Technical Director comment',
    message: 'Please adjust the second session.',
    linkPath: '/training?team=first-team',
    teamName: 'First Team',
    planId: 'plan-2',
    dayId: 'day-1',
    emailEnabled: true,
    emailSentAt: '2026-05-13T08:30:00.000Z',
    readAt: null,
    createdAt: '2026-05-13T08:20:00.000Z',
  },
];

describe('getNotificationCategory', () => {
  it('maps transport events to transport and training events to training', () => {
    expect(getNotificationCategory('transport_plan_updated')).toBe('transport');
    expect(getNotificationCategory('training_plan_published')).toBe('training');
    expect(getNotificationCategory('training_td_comment')).toBe('training');
  });
});

describe('filterNotificationItems', () => {
  it('returns only unread notifications for the unread filter', () => {
    expect(filterNotificationItems(sampleItems, 'unread').map((item) => item.id)).toEqual(['1', '3']);
  });

  it('returns only transport notifications for the transport filter', () => {
    expect(filterNotificationItems(sampleItems, 'transport').map((item) => item.id)).toEqual(['2']);
  });
});

describe('buildNotificationWorkspaceStats', () => {
  it('counts unread, training, transport, and emailed notifications', () => {
    expect(buildNotificationWorkspaceStats(sampleItems)).toEqual({
      total: 3,
      unread: 2,
      training: 2,
      transport: 1,
      emailed: 2,
    });
  });
});
