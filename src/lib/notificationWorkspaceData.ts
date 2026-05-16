import {
  fetchTrainingNotificationCenter,
  type TrainingNotificationItem,
} from './trainingData';
import {
  buildNotificationWorkspaceStats,
  filterNotificationItems,
  type NotificationWorkspaceFilter,
  type NotificationWorkspaceStats,
} from './notificationWorkspaceDomain';

export interface NotificationWorkspaceData {
  items: TrainingNotificationItem[];
  stats: NotificationWorkspaceStats;
}

export async function fetchNotificationWorkspace(limit = 80): Promise<NotificationWorkspaceData> {
  const center = await fetchTrainingNotificationCenter(limit);

  return {
    items: center.items,
    stats: buildNotificationWorkspaceStats(center.items),
  };
}

export function getFilteredNotificationWorkspaceItems(
  items: TrainingNotificationItem[],
  filter: NotificationWorkspaceFilter,
) {
  return filterNotificationItems(items, filter);
}
