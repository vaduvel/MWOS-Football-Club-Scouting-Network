import {
  canManageAnnouncements,
  getCurrentAppUser,
  type AppTeam,
} from './data';
import {
  fetchTrainingNotificationCenter,
  markAllNotificationsRead,
  markNotificationRead,
  type TrainingNotificationItem,
} from './trainingData';
import {
  buildNotificationWorkspaceStats,
  filterNotificationItems,
  type NotificationWorkspaceFilter,
  type NotificationWorkspaceStats,
} from './notificationWorkspaceDomain';
import { assertSupabaseConfigured, supabase } from './supabase';

type ClubAnnouncementRow = {
  id: string;
  title: string;
  body: string;
  target_team_ids: string[] | null;
  is_pinned: boolean;
  expires_at: string | null;
  archived_at: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

type ClubAnnouncementReadRow = {
  announcement_id: string;
  read_at: string;
};

type ProfileSummaryRow = {
  id: string;
  email: string;
  name: string | null;
};

export interface ClubAnnouncementItem {
  kind: 'announcement';
  id: string;
  title: string;
  body: string;
  teamIds: string[];
  teamNames: string[];
  scopeLabel: string;
  isPinned: boolean;
  expiresAt: string | null;
  authorName: string;
  authorEmail: string;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  canArchive: boolean;
}

export type NotificationWorkspaceItem =
  | (TrainingNotificationItem & { kind: 'notification' })
  | ClubAnnouncementItem;

export interface NotificationWorkspaceComposerContext {
  canManage: boolean;
  teams: AppTeam[];
}

export interface NotificationWorkspaceData {
  items: NotificationWorkspaceItem[];
  announcements: ClubAnnouncementItem[];
  notifications: Array<TrainingNotificationItem & { kind: 'notification' }>;
  stats: NotificationWorkspaceStats;
  composer: NotificationWorkspaceComposerContext;
  setupNotice: string | null;
}

export interface CreateClubAnnouncementInput {
  title: string;
  body: string;
  targetTeamIds: string[];
  isPinned?: boolean;
  expiresAt?: string | null;
}

function toAnnouncementExpiryIso(value: string | null | undefined) {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  const localDate = new Date(`${trimmed}T23:59:59.999`);
  if (Number.isNaN(localDate.getTime())) {
    return null;
  }
  return localDate.toISOString();
}

function normalizeTeamIds(teamIds: string[]) {
  return Array.from(new Set(teamIds.map((teamId) => teamId.trim()).filter(Boolean)));
}

function getDisplayName(profile: Pick<ProfileSummaryRow, 'email' | 'name'> | null | undefined) {
  if (profile?.name?.trim()) return profile.name.trim();
  const email = profile?.email || '';
  return email.split('@')[0] || 'MWOS Staff';
}

function buildScopeLabel(teamNames: string[]) {
  if (teamNames.length === 0) return 'Club-wide';
  if (teamNames.length === 1) return teamNames[0] || 'Selected team';
  if (teamNames.length === 2) return teamNames.join(' + ');
  return `${teamNames.length} teams`;
}

function toNotificationWorkspaceNotificationItem(
  item: TrainingNotificationItem,
): TrainingNotificationItem & { kind: 'notification' } {
  return {
    ...item,
    kind: 'notification',
  };
}

function toAnnouncementItem(
  row: ClubAnnouncementRow,
  readByAnnouncementId: Map<string, string>,
  teamById: Map<string, AppTeam>,
  profileById: Map<string, ProfileSummaryRow>,
  canManage: boolean,
): ClubAnnouncementItem {
  const teamIds = row.target_team_ids || [];
  const teamNames = teamIds
    .map((teamId) => teamById.get(teamId)?.name || '')
    .filter(Boolean);
  const author = profileById.get(row.created_by);

  return {
    kind: 'announcement',
    id: row.id,
    title: row.title,
    body: row.body,
    teamIds,
    teamNames,
    scopeLabel: buildScopeLabel(teamNames),
    isPinned: Boolean(row.is_pinned),
    expiresAt: row.expires_at,
    authorName: getDisplayName(author),
    authorEmail: author?.email || '',
    readAt: readByAnnouncementId.get(row.id) || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    canArchive: canManage,
  };
}

function getItemCreatedAt(item: NotificationWorkspaceItem) {
  return item.createdAt;
}

function isPinnedAnnouncement(item: NotificationWorkspaceItem) {
  return item.kind === 'announcement' && item.isPinned;
}

function sortWorkspaceItems(items: NotificationWorkspaceItem[]) {
  return [...items].sort((left, right) => {
    const leftPinned = isPinnedAnnouncement(left) ? 1 : 0;
    const rightPinned = isPinnedAnnouncement(right) ? 1 : 0;
    if (leftPinned !== rightPinned) {
      return rightPinned - leftPinned;
    }

    const leftTime = new Date(getItemCreatedAt(left)).getTime();
    const rightTime = new Date(getItemCreatedAt(right)).getTime();
    return rightTime - leftTime;
  });
}

function isMissingAnnouncementSchemaError(error: any) {
  const message = String(error?.message || '');
  return (
    message.includes("public.club_announcements") ||
    message.includes("public.club_announcement_reads")
  );
}

async function fetchAnnouncementComposerTeams(): Promise<AppTeam[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('id, slug, name, is_active')
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return ((data || []) as AppTeam[]).map((team) => ({
    id: team.id,
    slug: team.slug,
    name: team.name,
    is_active: Boolean(team.is_active),
  }));
}

async function fetchAnnouncements(limit = 40): Promise<{
  items: ClubAnnouncementItem[];
  setupNotice: string | null;
}> {
  const authUser = await getCurrentAppUser();
  const canManage = canManageAnnouncements(authUser);

  const [announcementsResponse, teamsResponse] = await Promise.all([
    supabase
      .from('club_announcements')
      .select('id, title, body, target_team_ids, is_pinned, expires_at, archived_at, created_by, updated_by, created_at, updated_at')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit),
    fetchAnnouncementComposerTeams(),
  ]);

  if (announcementsResponse.error) {
    if (isMissingAnnouncementSchemaError(announcementsResponse.error)) {
      return {
        items: [],
        setupNotice: 'Apply the latest Supabase schema to enable internal announcements in Alerts.',
      };
    }
    throw announcementsResponse.error;
  }

  const rows = (announcementsResponse.data || []) as ClubAnnouncementRow[];
  if (rows.length === 0) {
    return {
      items: [],
      setupNotice: null,
    };
  }

  const creatorIds = Array.from(new Set(rows.map((row) => row.created_by).filter(Boolean)));
  const announcementIds = rows.map((row) => row.id);
  const [profilesResponse, readsResponse] = await Promise.all([
    creatorIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, email, name')
          .in('id', creatorIds)
      : Promise.resolve({ data: [], error: null }),
    announcementIds.length > 0
      ? supabase
          .from('club_announcement_reads')
          .select('announcement_id, read_at')
          .eq('user_id', authUser.id)
          .in('announcement_id', announcementIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesResponse.error) {
    throw profilesResponse.error;
  }

  if (readsResponse.error) {
    if (isMissingAnnouncementSchemaError(readsResponse.error)) {
      const teamById = new Map(teamsResponse.map((team) => [team.id, team]));
      const profileById = new Map(
        ((profilesResponse.data || []) as ProfileSummaryRow[]).map((profile) => [profile.id, profile]),
      );

      return {
        items: rows.map((row) =>
          toAnnouncementItem(row, new Map<string, string>(), teamById, profileById, canManage),
        ),
        setupNotice: 'Apply the latest Supabase schema to enable announcement read tracking in Alerts.',
      };
    }
    throw readsResponse.error;
  }

  const teamById = new Map(teamsResponse.map((team) => [team.id, team]));
  const profileById = new Map(
    ((profilesResponse.data || []) as ProfileSummaryRow[]).map((profile) => [profile.id, profile]),
  );
  const readByAnnouncementId = new Map(
    ((readsResponse.data || []) as ClubAnnouncementReadRow[]).map((row) => [row.announcement_id, row.read_at]),
  );

  return {
    items: rows.map((row) =>
      toAnnouncementItem(row, readByAnnouncementId, teamById, profileById, canManage),
    ),
    setupNotice: null,
  };
}

export async function fetchNotificationWorkspace(limit = 80): Promise<NotificationWorkspaceData> {
  assertSupabaseConfigured();

  const authUser = await getCurrentAppUser();
  const canManage = canManageAnnouncements(authUser);

  const [center, announcementsResult, teams] = await Promise.all([
    fetchTrainingNotificationCenter(limit),
    fetchAnnouncements(Math.max(18, Math.min(limit, 40))),
    canManage ? fetchAnnouncementComposerTeams() : Promise.resolve([] as AppTeam[]),
  ]);

  const announcements = announcementsResult.items;
  const notifications = center.items.map(toNotificationWorkspaceNotificationItem);
  const items = sortWorkspaceItems([...announcements, ...notifications]);

  return {
    items,
    announcements,
    notifications,
    stats: buildNotificationWorkspaceStats(items),
    composer: {
      canManage: canManage && !announcementsResult.setupNotice,
      teams,
    },
    setupNotice: announcementsResult.setupNotice,
  };
}

export function getFilteredNotificationWorkspaceItems(
  items: NotificationWorkspaceItem[],
  filter: NotificationWorkspaceFilter,
) {
  return filterNotificationItems(items, filter);
}

export async function createClubAnnouncement(input: CreateClubAnnouncementInput) {
  assertSupabaseConfigured();
  const authUser = await getCurrentAppUser();

  if (!canManageAnnouncements(authUser)) {
    throw new Error('Admin or Technical Director access is required to post announcements.');
  }

  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) {
    throw new Error('Add a title for the announcement.');
  }
  if (!body) {
    throw new Error('Add the announcement details.');
  }

  const { error } = await supabase.from('club_announcements').insert({
    title,
    body,
    target_team_ids: normalizeTeamIds(input.targetTeamIds),
    is_pinned: Boolean(input.isPinned),
    expires_at: toAnnouncementExpiryIso(input.expiresAt),
    created_by: authUser.id,
    updated_by: authUser.id,
  });

  if (error) {
    throw error;
  }
}

export async function archiveClubAnnouncement(announcementId: string) {
  assertSupabaseConfigured();
  const authUser = await getCurrentAppUser();

  if (!canManageAnnouncements(authUser)) {
    throw new Error('Admin or Technical Director access is required to archive announcements.');
  }

  const { error } = await supabase
    .from('club_announcements')
    .update({
      archived_at: new Date().toISOString(),
      updated_by: authUser.id,
    })
    .eq('id', announcementId)
    .is('archived_at', null);

  if (error) {
    throw error;
  }
}

export async function markClubAnnouncementRead(announcementId: string) {
  assertSupabaseConfigured();
  const authUser = await getCurrentAppUser();

  const { error } = await supabase.from('club_announcement_reads').upsert(
    {
      announcement_id: announcementId,
      user_id: authUser.id,
      read_at: new Date().toISOString(),
    },
    {
      onConflict: 'announcement_id,user_id',
    },
  );

  if (error) {
    throw error;
  }
}

export async function markAllClubAnnouncementsRead(announcementIds: string[]) {
  const uniqueIds = Array.from(new Set(announcementIds.map((id) => id.trim()).filter(Boolean)));
  if (uniqueIds.length === 0) return;

  assertSupabaseConfigured();
  const authUser = await getCurrentAppUser();
  const readAt = new Date().toISOString();

  const { error } = await supabase.from('club_announcement_reads').upsert(
    uniqueIds.map((announcementId) => ({
      announcement_id: announcementId,
      user_id: authUser.id,
      read_at: readAt,
    })),
    {
      onConflict: 'announcement_id,user_id',
    },
  );

  if (error) {
    throw error;
  }
}

export async function markNotificationWorkspaceItemRead(item: NotificationWorkspaceItem) {
  if (item.kind === 'announcement') {
    await markClubAnnouncementRead(item.id);
    return;
  }

  await markNotificationRead(item.id);
}

export async function markAllNotificationWorkspaceItemsRead(items: NotificationWorkspaceItem[]) {
  const unreadAnnouncements = items
    .filter((item): item is ClubAnnouncementItem => item.kind === 'announcement' && !item.readAt)
    .map((item) => item.id);
  const hasUnreadNotifications = items.some((item) => item.kind === 'notification' && !item.readAt);

  await Promise.all([
    unreadAnnouncements.length > 0 ? markAllClubAnnouncementsRead(unreadAnnouncements) : Promise.resolve(),
    hasUnreadNotifications ? markAllNotificationsRead() : Promise.resolve(),
  ]);
}
