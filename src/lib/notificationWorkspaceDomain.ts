import type { NotificationWorkspaceItem } from './notificationWorkspaceData';
import type { TrainingNotificationType } from './trainingData';

export type NotificationWorkspaceCategory = 'announcement' | 'training' | 'transport' | 'scouting';
export type NotificationWorkspaceFilter =
  | 'all'
  | 'unread'
  | 'announcements'
  | 'notifications'
  | 'training'
  | 'transport'
  | 'scouting';

export interface NotificationWorkspaceStats {
  total: number;
  unread: number;
  announcements: number;
  notifications: number;
  training: number;
  transport: number;
  scouting: number;
  pinned: number;
  emailed: number;
}

function getNotificationTypeCategory(type: TrainingNotificationType): NotificationWorkspaceCategory {
  if (type === 'transport_plan_updated') {
    return 'transport';
  }

  if (type === 'scouting_report_created') {
    return 'scouting';
  }

  return 'training';
}

export function getNotificationCategory(item: NotificationWorkspaceItem): NotificationWorkspaceCategory {
  if (item.kind === 'announcement') {
    return 'announcement';
  }

  return getNotificationTypeCategory(item.type);
}

export function filterNotificationItems(
  items: NotificationWorkspaceItem[],
  filter: NotificationWorkspaceFilter,
) {
  switch (filter) {
    case 'unread':
      return items.filter((item) => !item.readAt);
    case 'announcements':
      return items.filter((item) => item.kind === 'announcement');
    case 'notifications':
      return items.filter((item) => item.kind === 'notification');
    case 'training':
      return items.filter((item) => getNotificationCategory(item) === 'training');
    case 'transport':
      return items.filter((item) => getNotificationCategory(item) === 'transport');
    case 'scouting':
      return items.filter((item) => getNotificationCategory(item) === 'scouting');
    case 'all':
    default:
      return items;
  }
}

export function buildNotificationWorkspaceStats(items: NotificationWorkspaceItem[]): NotificationWorkspaceStats {
  return items.reduce<NotificationWorkspaceStats>(
    (acc, item) => {
      const category = getNotificationCategory(item);
      acc.total += 1;
      if (!item.readAt) acc.unread += 1;

      if (category === 'announcement') {
        acc.announcements += 1;
        if (item.kind === 'announcement' && item.isPinned) {
          acc.pinned += 1;
        }
        return acc;
      }

      acc.notifications += 1;
      if (category === 'training') acc.training += 1;
      if (category === 'transport') acc.transport += 1;
      if (category === 'scouting') acc.scouting += 1;
      if (item.kind === 'notification' && item.emailSentAt) acc.emailed += 1;
      return acc;
    },
    {
      total: 0,
      unread: 0,
      announcements: 0,
      notifications: 0,
      training: 0,
      transport: 0,
      scouting: 0,
      pinned: 0,
      emailed: 0,
    },
  );
}
