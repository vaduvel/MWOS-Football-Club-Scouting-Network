import { describe, expect, it } from 'vitest';

import {
  buildNotificationWorkspaceStats,
  filterNotificationItems,
  getNotificationCategory,
} from './notificationWorkspaceDomain';
import type { NotificationWorkspaceItem } from './notificationWorkspaceData';

const sampleItems: NotificationWorkspaceItem[] = [
  {
    kind: 'announcement',
    id: 'announcement-1',
    title: 'Queens launch briefing',
    body: 'Please share the updated logistics with the staff group before Friday.',
    teamIds: [],
    teamNames: [],
    scopeLabel: 'Club-wide',
    isPinned: true,
    expiresAt: null,
    authorName: 'Admin',
    authorEmail: 'admin@mwos-hub.com',
    readAt: null,
    createdAt: '2026-05-21T07:00:00.000Z',
    updatedAt: '2026-05-21T07:00:00.000Z',
    canArchive: true,
  },
  {
    kind: 'notification',
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
    kind: 'notification',
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
    kind: 'notification',
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
  it('maps announcements, transport, and training correctly', () => {
    expect(getNotificationCategory(sampleItems[0]!)).toBe('announcement');
    expect(getNotificationCategory(sampleItems[1]!)).toBe('training');
    expect(getNotificationCategory(sampleItems[2]!)).toBe('transport');
  });
});

describe('filterNotificationItems', () => {
  it('returns only unread items for the unread filter', () => {
    expect(filterNotificationItems(sampleItems, 'unread').map((item) => item.id)).toEqual([
      'announcement-1',
      '1',
      '3',
    ]);
  });

  it('returns only announcements for the announcements filter', () => {
    expect(filterNotificationItems(sampleItems, 'announcements').map((item) => item.id)).toEqual([
      'announcement-1',
    ]);
  });

  it('returns only notifications for the notifications filter', () => {
    expect(filterNotificationItems(sampleItems, 'notifications').map((item) => item.id)).toEqual([
      '1',
      '2',
      '3',
    ]);
  });

  it('returns only transport notifications for the transport filter', () => {
    expect(filterNotificationItems(sampleItems, 'transport').map((item) => item.id)).toEqual(['2']);
  });
});

describe('buildNotificationWorkspaceStats', () => {
  it('counts unread, announcements, pinned, operational and emailed items', () => {
    expect(buildNotificationWorkspaceStats(sampleItems)).toEqual({
      total: 4,
      unread: 3,
      announcements: 1,
      notifications: 3,
      training: 2,
      transport: 1,
      pinned: 1,
      emailed: 2,
    });
  });
});
