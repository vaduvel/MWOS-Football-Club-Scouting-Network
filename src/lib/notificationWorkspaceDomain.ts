import type { TrainingNotificationItem, TrainingNotificationType } from './trainingData';

export type NotificationWorkspaceCategory = 'training' | 'transport';
export type NotificationWorkspaceFilter = 'all' | 'unread' | 'training' | 'transport';

export interface NotificationWorkspaceStats {
  total: number;
  unread: number;
  training: number;
  transport: number;
  emailed: number;
}

export function getNotificationCategory(type: TrainingNotificationType): NotificationWorkspaceCategory {
  if (type === 'transport_plan_updated') {
    return 'transport';
  }

  return 'training';
}

export function filterNotificationItems(
  items: TrainingNotificationItem[],
  filter: NotificationWorkspaceFilter,
) {
  switch (filter) {
    case 'unread':
      return items.filter((item) => !item.readAt);
    case 'training':
      return items.filter((item) => getNotificationCategory(item.type) === 'training');
    case 'transport':
      return items.filter((item) => getNotificationCategory(item.type) === 'transport');
    case 'all':
    default:
      return items;
  }
}

export function buildNotificationWorkspaceStats(items: TrainingNotificationItem[]): NotificationWorkspaceStats {
  return items.reduce<NotificationWorkspaceStats>(
    (acc, item) => {
      acc.total += 1;
      if (!item.readAt) acc.unread += 1;
      if (getNotificationCategory(item.type) === 'training') acc.training += 1;
      if (getNotificationCategory(item.type) === 'transport') acc.transport += 1;
      if (item.emailSentAt) acc.emailed += 1;
      return acc;
    },
    {
      total: 0,
      unread: 0,
      training: 0,
      transport: 0,
      emailed: 0,
    },
  );
}
