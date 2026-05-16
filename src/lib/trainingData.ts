import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import {
  getCurrentAppUser,
  type AppTeam,
  userHasAnyRole,
  userHasRole,
} from './data';
import { assertSupabaseConfigured, supabase } from './supabase';
import {
  buildTrainingWeek,
  detectMajorScheduleChange,
  normalizeTrainingDay,
  type TrainingDayDraft,
  type TrainingDayType,
  type TrainingPlanStatus,
  type TrainingSessionType,
} from './trainingDomain';

type TrainingPlanRow = {
  id: string;
  team_id: string;
  week_start: string;
  headline: string | null;
  objective: string | null;
  status: TrainingPlanStatus;
  created_by: string;
  updated_by: string;
  published_by: string | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  teams?:
    | {
        id: string;
        slug: string;
        name: string;
        is_active: boolean;
      }
    | {
        id: string;
        slug: string;
        name: string;
        is_active: boolean;
      }[]
    | null;
};

type TrainingPlanDayRow = {
  id: string;
  plan_id: string;
  day_index: number;
  weekday_label: string;
  calendar_date: string;
  day_type: TrainingDayType;
  session_title: string | null;
  session_type: TrainingSessionType;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  focus_tags: string[] | null;
  intensity: number;
  volume: number;
  objectives: string | null;
  exercises: string | null;
  notes: string | null;
  reminder_sent_at: string | null;
  last_major_change_at: string | null;
  created_at: string;
  updated_at: string;
};

type TrainingPlanCommentRow = {
  id: string;
  plan_id: string;
  day_id: string | null;
  author_id: string;
  author_name: string;
  author_role_label: string;
  content: string;
  created_at: string;
};

type AppNotificationRow = {
  id: string;
  type:
    | 'training_plan_published'
    | 'training_td_comment'
    | 'training_session_reminder'
    | 'training_schedule_changed'
    | 'transport_plan_updated';
  title: string;
  message: string;
  link_path: string | null;
  team_id: string | null;
  training_plan_id: string | null;
  training_day_id: string | null;
  email_enabled: boolean;
  email_sent_at: string | null;
  read_at: string | null;
  created_at: string;
  teams?:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

export type TrainingNotificationType =
  | 'training_plan_published'
  | 'training_td_comment'
  | 'training_session_reminder'
  | 'training_schedule_changed'
  | 'transport_plan_updated';

export interface TrainingPlanDay extends TrainingDayDraft {
  id?: string;
  planId?: string;
  updatedAt?: string;
}

export interface TrainingPlanComment {
  id: string;
  planId: string;
  dayId: string | null;
  authorId: string;
  authorName: string;
  authorRoleLabel: string;
  content: string;
  createdAt: string;
  isAuthor: boolean;
}

export interface TrainingPlanSummary {
  id: string;
  teamId: string;
  teamName: string;
  teamSlug: string;
  weekStart: string;
  headline: string;
  objective: string;
  status: TrainingPlanStatus;
  publishedAt: string | null;
  updatedAt: string;
}

export interface TrainingWorkspace {
  planId?: string;
  team: AppTeam;
  weekStart: string;
  headline: string;
  objective: string;
  status: TrainingPlanStatus;
  days: TrainingPlanDay[];
  comments: TrainingPlanComment[];
  publishedAt: string | null;
  updatedAt: string | null;
  archivedAt: string | null;
  canManage: boolean;
  canComment: boolean;
}

export interface TrainingNotificationItem {
  id: string;
  type: TrainingNotificationType;
  title: string;
  message: string;
  linkPath: string;
  teamName: string;
  planId: string | null;
  dayId: string | null;
  emailEnabled: boolean;
  emailSentAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface TrainingNotificationCenterData {
  unreadCount: number;
  items: TrainingNotificationItem[];
}

export interface SaveTrainingPlanInput {
  teamId: string;
  weekStart: string;
  headline: string;
  objective: string;
  days: TrainingPlanDay[];
}

export interface TrainingMutationResult {
  workspace: TrainingWorkspace;
  warning?: string | null;
}

interface NotifyTrainingEventPayload {
  type: TrainingNotificationType;
  teamId: string;
  planId?: string | null;
  dayId?: string | null;
  linkPath: string;
  detail?: string;
  eventKey?: string | null;
}

const NOTIFY_FUNCTION_NAME = 'notify-email';

function toStringValue(value: string | null | undefined) {
  return value ?? '';
}

function toNullableText(value: string | null | undefined) {
  const trimmed = (value || '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toTeamRecord(value: AppTeam) {
  return {
    id: value.id,
    slug: value.slug,
    name: value.name,
    is_active: value.is_active,
  };
}

function joinedTeam(
  value:
    | {
        id: string;
        slug: string;
        name: string;
        is_active: boolean;
      }
    | {
        id: string;
        slug: string;
        name: string;
        is_active: boolean;
      }[]
    | null
    | undefined,
) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
}

function joinedTeamName(
  value:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null
    | undefined,
) {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value[0]?.name || '';
  }
  return value.name || '';
}

function getDefaultWeekStart(reference = new Date()) {
  return format(startOfWeek(reference, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function getTrainingWeekStart(date = new Date()) {
  return getDefaultWeekStart(date);
}

export function buildTrainingLinkPath(teamId: string, weekStart: string, dayIndex?: number) {
  const params = new URLSearchParams({
    team: teamId,
    week: weekStart,
  });

  if (typeof dayIndex === 'number') {
    params.set('day', String(dayIndex));
  }

  return `/training?${params.toString()}`;
}

function mapTrainingDay(row: TrainingPlanDayRow): TrainingPlanDay {
  return {
    id: row.id,
    planId: row.plan_id,
    dayIndex: row.day_index,
    weekday: row.weekday_label,
    date: row.calendar_date,
    dayType: row.day_type,
    sessionTitle: toStringValue(row.session_title),
    sessionType: row.session_type,
    startTime: toStringValue(row.start_time),
    endTime: toStringValue(row.end_time),
    location: toStringValue(row.location),
    focusTags: row.focus_tags || [],
    intensity: (row.intensity || 1) as 1 | 2 | 3,
    volume: (row.volume || 1) as 1 | 2 | 3,
    objectives: toStringValue(row.objectives),
    exercises: toStringValue(row.exercises),
    notes: toStringValue(row.notes),
    reminderSentAt: row.reminder_sent_at,
    lastImportantChangeAt: row.last_major_change_at,
    updatedAt: row.updated_at,
  };
}

function mapTrainingComment(row: TrainingPlanCommentRow, currentUserId: string): TrainingPlanComment {
  return {
    id: row.id,
    planId: row.plan_id,
    dayId: row.day_id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorRoleLabel: row.author_role_label,
    content: row.content,
    createdAt: row.created_at,
    isAuthor: row.author_id === currentUserId,
  };
}

function mapNotification(row: AppNotificationRow): TrainingNotificationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    linkPath: row.link_path || '/training',
    teamName: joinedTeamName(row.teams) || 'MWOS Team',
    planId: row.training_plan_id,
    dayId: row.training_day_id,
    emailEnabled: row.email_enabled,
    emailSentAt: row.email_sent_at,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

async function resolveTrainingTeams() {
  const authUser = await getCurrentAppUser();

  if (userHasAnyRole(authUser, ['admin', 'technical_director'])) {
    const { data, error } = await supabase
      .from('teams')
      .select('id, slug, name, is_active')
      .order('sort_order', { ascending: true });

    if (error) {
      throw error;
    }

    return {
      user: authUser,
      teams: ((data || []) as AppTeam[]).map(toTeamRecord),
    };
  }

  return {
    user: authUser,
    teams: authUser.teams.map(toTeamRecord),
  };
}

async function callTrainingFunction(body: Record<string, unknown>) {
  assertSupabaseConfigured();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be signed in to continue.');
  }

  const baseUrl = (import.meta.env.VITE_NETLIFY_FUNCTIONS_BASE_URL || '/.netlify/functions').replace(/\/$/, '');
  const url = new URL(`${baseUrl}/${NOTIFY_FUNCTION_NAME}`, window.location.origin).toString();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  let payload: { warning?: string; error?: string } | null = null;
  try {
    payload = (await response.json()) as { warning?: string; error?: string };
  } catch (_error) {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Training notification request failed with status ${response.status}.`);
  }

  return payload;
}

async function triggerTrainingEvents(
  events: NotifyTrainingEventPayload[],
): Promise<string | null> {
  if (events.length === 0) {
    return null;
  }

  try {
    const response = await callTrainingFunction({
      mode: 'emit-training-events',
      events,
    });
    return response?.warning || null;
  } catch (error: any) {
    console.error('Training notifications failed.', error);
    return error?.message || 'Notifications could not be delivered right now.';
  }
}

function resolveManagePermission(user: Awaited<ReturnType<typeof getCurrentAppUser>>) {
  return userHasAnyRole(user, ['admin', 'coach']);
}

function resolveCommentPermission(user: Awaited<ReturnType<typeof getCurrentAppUser>>) {
  return userHasAnyRole(user, ['admin', 'coach', 'technical_director']);
}

export async function fetchTrainingTeams() {
  const { teams } = await resolveTrainingTeams();
  return teams;
}

export async function fetchTrainingPlanSummaries(weekStart: string): Promise<TrainingPlanSummary[]> {
  const normalizedWeekStart = weekStart || getDefaultWeekStart();
  const { data, error } = await supabase
    .from('training_plans')
    .select('id, team_id, week_start, headline, objective, status, published_at, updated_at, teams(id, slug, name, is_active)')
    .eq('week_start', normalizedWeekStart)
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ((data || []) as TrainingPlanRow[]).map((row) => {
    const team = joinedTeam(row.teams);
    return {
      id: row.id,
      teamId: row.team_id,
      teamName: team?.name || 'MWOS Team',
      teamSlug: team?.slug || 'team',
      weekStart: row.week_start,
      headline: toStringValue(row.headline),
      objective: toStringValue(row.objective),
      status: row.status,
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
    };
  });
}

export async function fetchTrainingWorkspace(teamId: string, weekStart: string): Promise<TrainingWorkspace> {
  const normalizedWeekStart = weekStart || getDefaultWeekStart();
  const { user, teams } = await resolveTrainingTeams();
  const selectedTeam = teams.find((candidate) => candidate.id === teamId);

  if (!selectedTeam) {
    throw new Error('You do not have access to this team.');
  }

  const { data: planData, error: planError } = await supabase
    .from('training_plans')
    .select('id, team_id, week_start, headline, objective, status, published_at, archived_at, updated_at, teams(id, slug, name, is_active)')
    .eq('team_id', teamId)
    .eq('week_start', normalizedWeekStart)
    .maybeSingle();

  if (planError) {
    throw planError;
  }

  const plan = planData as TrainingPlanRow | null;

  if (!plan) {
    return {
      team: selectedTeam,
      weekStart: normalizedWeekStart,
      headline: '',
      objective: '',
      status: 'draft',
      days: buildTrainingWeek(normalizedWeekStart),
      comments: [],
      publishedAt: null,
      updatedAt: null,
      archivedAt: null,
      canManage: resolveManagePermission(user),
      canComment: resolveCommentPermission(user),
    };
  }

  const [daysResponse, commentsResponse] = await Promise.all([
    supabase
      .from('training_plan_days')
      .select(
        'id, plan_id, day_index, weekday_label, calendar_date, day_type, session_title, session_type, start_time, end_time, location, focus_tags, intensity, volume, objectives, exercises, notes, reminder_sent_at, last_major_change_at, created_at, updated_at',
      )
      .eq('plan_id', plan.id)
      .order('day_index', { ascending: true }),
    supabase
      .from('training_plan_comments')
      .select('id, plan_id, day_id, author_id, author_name, author_role_label, content, created_at')
      .eq('plan_id', plan.id)
      .order('created_at', { ascending: false }),
  ]);

  if (daysResponse.error) {
    throw daysResponse.error;
  }

  if (commentsResponse.error) {
    throw commentsResponse.error;
  }

  return {
    planId: plan.id,
    team: joinedTeam(plan.teams) || selectedTeam,
    weekStart: plan.week_start,
    headline: toStringValue(plan.headline),
    objective: toStringValue(plan.objective),
    status: plan.status,
    days: ((daysResponse.data || []) as TrainingPlanDayRow[]).map(mapTrainingDay),
    comments: ((commentsResponse.data || []) as TrainingPlanCommentRow[]).map((comment) =>
      mapTrainingComment(comment, user.id),
    ),
    publishedAt: plan.published_at,
    updatedAt: plan.updated_at,
    archivedAt: plan.archived_at,
    canManage: resolveManagePermission(user),
    canComment: resolveCommentPermission(user),
  };
}

function buildDayDetail(day: TrainingPlanDay) {
  const typeLabel =
    day.dayType === 'training'
      ? `${day.sessionTitle || 'Training'}${day.startTime ? ` at ${day.startTime}` : ''}${day.location ? ` · ${day.location}` : ''}`
      : day.dayType === 'active_recovery'
        ? `Active recovery on ${day.weekday}`
        : `Rest day on ${day.weekday}`;

  return typeLabel;
}

function buildScheduleChangeDetail(day: TrainingPlanDay, changedFields: string[]) {
  const labels: Record<string, string> = {
    date: day.date,
    startTime: day.startTime || 'unspecified start time',
    endTime: day.endTime || 'unspecified end time',
    location: day.location || 'location update',
  };

  const fragments = changedFields.map((field) => labels[field] || field);
  return `${day.weekday}: ${fragments.join(' · ')}`;
}

export async function saveTrainingPlan(
  input: SaveTrainingPlanInput,
  action: 'draft' | 'publish' | 'archive',
): Promise<TrainingMutationResult> {
  const authUser = await getCurrentAppUser();
  const nowIso = new Date().toISOString();
  const { data: existingPlanData, error: existingPlanError } = await supabase
    .from('training_plans')
    .select('id, team_id, week_start, headline, objective, status, created_by, published_at, published_by, archived_at, updated_at')
    .eq('team_id', input.teamId)
    .eq('week_start', input.weekStart)
    .maybeSingle();

  if (existingPlanError) {
    throw existingPlanError;
  }

  const existingPlan = existingPlanData as
    | (TrainingPlanRow & {
        published_by: string | null;
      })
    | null;

  const { data: existingDaysData, error: existingDaysError } = existingPlan
    ? await supabase
        .from('training_plan_days')
        .select(
          'id, plan_id, day_index, weekday_label, calendar_date, day_type, session_title, session_type, start_time, end_time, location, focus_tags, intensity, volume, objectives, exercises, notes, reminder_sent_at, last_major_change_at, created_at, updated_at',
        )
        .eq('plan_id', existingPlan.id)
    : { data: [], error: null };

  if (existingDaysError) {
    throw existingDaysError;
  }

  const existingDays = ((existingDaysData || []) as TrainingPlanDayRow[]).map(mapTrainingDay);
  const existingDaysByIndex = new Map(existingDays.map((day) => [day.dayIndex, day]));

  const nextStatus: TrainingPlanStatus =
    action === 'archive'
      ? 'archived'
      : action === 'publish'
        ? existingPlan && existingPlan.status !== 'draft'
          ? 'updated'
          : 'published'
        : existingPlan && ['published', 'updated'].includes(existingPlan.status)
          ? 'updated'
          : 'draft';

  const planPayload = {
    team_id: input.teamId,
    week_start: input.weekStart,
    headline: toNullableText(input.headline),
    objective: toNullableText(input.objective),
    status: nextStatus,
    updated_by: authUser.id,
    published_by:
      action === 'publish' && !existingPlan?.published_at
        ? authUser.id
        : existingPlan?.published_by || null,
    published_at:
      action === 'publish'
        ? existingPlan?.published_at || nowIso
        : existingPlan?.published_at || null,
    archived_at: action === 'archive' ? nowIso : null,
  };

  const planResponse = existingPlan
    ? await supabase
        .from('training_plans')
        .update(planPayload)
        .eq('id', existingPlan.id)
        .select('id, team_id, week_start, headline, objective, status, published_at, archived_at, updated_at, teams(id, slug, name, is_active)')
        .single()
    : await supabase
        .from('training_plans')
        .insert({
          ...planPayload,
          created_by: authUser.id,
        })
        .select('id, team_id, week_start, headline, objective, status, published_at, archived_at, updated_at, teams(id, slug, name, is_active)')
        .single();

  if (planResponse.error) {
    throw planResponse.error;
  }

  const savedPlan = planResponse.data as TrainingPlanRow;
  const daysPayload = input.days.map((rawDay) => {
    const day = normalizeTrainingDay(rawDay);

    return {
      plan_id: savedPlan.id,
      day_index: day.dayIndex,
      weekday_label: day.weekday,
      calendar_date: day.date,
      day_type: day.dayType,
      session_title: toNullableText(day.sessionTitle),
      session_type: day.sessionType,
      start_time: toNullableText(day.startTime),
      end_time: toNullableText(day.endTime),
      location: toNullableText(day.location),
      focus_tags: day.focusTags,
      intensity: day.intensity,
      volume: day.volume,
      objectives: toNullableText(day.objectives),
      exercises: toNullableText(day.exercises),
      notes: toNullableText(day.notes),
      reminder_sent_at: day.reminderSentAt || null,
      last_major_change_at: day.lastImportantChangeAt || null,
    };
  });

  const { error: upsertDaysError } = await supabase
    .from('training_plan_days')
    .upsert(daysPayload, { onConflict: 'plan_id,day_index' });

  if (upsertDaysError) {
    throw upsertDaysError;
  }

  const warningEvents: NotifyTrainingEventPayload[] = [];
  if (action === 'publish' && (!existingPlan || existingPlan.status === 'draft')) {
    warningEvents.push({
      type: 'training_plan_published',
      teamId: input.teamId,
      planId: savedPlan.id,
      linkPath: buildTrainingLinkPath(input.teamId, input.weekStart),
      detail: input.headline.trim() || 'A new weekly microcycle is ready.',
      eventKey: `training-plan-published:${savedPlan.id}:${savedPlan.published_at || nowIso}`,
    });
  }

  if (existingPlan && ['published', 'updated'].includes(existingPlan.status) && action !== 'archive') {
    input.days.forEach((day) => {
      const previousDay = existingDaysByIndex.get(day.dayIndex);
      if (!previousDay) {
        return;
      }

      const changedFields = detectMajorScheduleChange(previousDay, day);
      if (changedFields.length === 0) {
        return;
      }

      warningEvents.push({
        type: 'training_schedule_changed',
        teamId: input.teamId,
        planId: savedPlan.id,
        dayId: previousDay.id || null,
        linkPath: buildTrainingLinkPath(input.teamId, input.weekStart, day.dayIndex),
        detail: buildScheduleChangeDetail(day, changedFields),
        eventKey: `training-schedule-changed:${previousDay.id || day.dayIndex}:${nowIso}`,
      });
    });
  }

  const warning = await triggerTrainingEvents(warningEvents);
  const workspace = await fetchTrainingWorkspace(input.teamId, input.weekStart);
  return { workspace, warning };
}

export async function addTrainingPlanComment(
  planId: string,
  content: string,
  dayId?: string | null,
): Promise<{ comment: TrainingPlanComment; warning?: string | null }> {
  const authUser = await getCurrentAppUser();
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    throw new Error('Comment cannot be empty.');
  }

  const { data: planData, error: planError } = await supabase
    .from('training_plans')
    .select('id, team_id, week_start')
    .eq('id', planId)
    .single();

  if (planError) {
    throw planError;
  }

  const { data, error } = await supabase
    .from('training_plan_comments')
    .insert({
      plan_id: planId,
      day_id: dayId || null,
      author_id: authUser.id,
      author_name: authUser.name || authUser.email,
      author_role_label: authUser.role,
      content: trimmedContent,
    })
    .select('id, plan_id, day_id, author_id, author_name, author_role_label, content, created_at')
    .single();

  if (error) {
    throw error;
  }

  let warning: string | null = null;
  if (userHasRole(authUser, 'technical_director')) {
    warning = await triggerTrainingEvents([
      {
        type: 'training_td_comment',
        teamId: planData.team_id,
        planId,
        dayId: dayId || null,
        linkPath: buildTrainingLinkPath(planData.team_id, planData.week_start),
        detail: trimmedContent.slice(0, 160),
        eventKey: `training-td-comment:${data.id}`,
      },
    ]);
  }

  return {
    comment: mapTrainingComment(data as TrainingPlanCommentRow, authUser.id),
    warning,
  };
}

export async function fetchTrainingNotificationCenter(limit = 18): Promise<TrainingNotificationCenterData> {
  const authUser = await getCurrentAppUser();
  const [itemsResponse, unreadResponse] = await Promise.all([
    supabase
      .from('app_notifications')
      .select(
        'id, type, title, message, link_path, team_id, training_plan_id, training_day_id, email_enabled, email_sent_at, read_at, created_at, teams(name)',
      )
      .eq('recipient_user_id', authUser.id)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('app_notifications')
      .select('id', { head: true, count: 'exact' })
      .eq('recipient_user_id', authUser.id)
      .is('read_at', null),
  ]);

  if (itemsResponse.error) {
    throw itemsResponse.error;
  }

  if (unreadResponse.error) {
    throw unreadResponse.error;
  }

  return {
    unreadCount: unreadResponse.count || 0,
    items: ((itemsResponse.data || []) as AppNotificationRow[]).map(mapNotification),
  };
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from('app_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .is('read_at', null);

  if (error) {
    throw error;
  }
}

export async function markAllNotificationsRead() {
  const authUser = await getCurrentAppUser();
  const { error } = await supabase
    .from('app_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_user_id', authUser.id)
    .is('read_at', null);

  if (error) {
    throw error;
  }
}

export function getTrainingWeekRangeLabel(weekStart: string) {
  const start = parseISO(weekStart);
  const end = addDays(start, 6);
  return `${format(start, 'd MMM')} - ${format(end, 'd MMM yyyy')}`;
}
