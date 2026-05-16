import {
  type AppTeam,
  getCurrentAppUser,
  userHasAnyRole,
  userHasRole,
} from './data';
import { assertSupabaseConfigured, supabase } from './supabase';
import {
  buildTransportDraft,
  detectMajorTransportChange,
  normalizeTransportPlan,
  validateTransportPlan,
  type TransportContextType,
  type TransportPlanDraft,
  type TransportPlanStatus,
} from './transportDomain';

type TransportPlanRow = {
  id: string;
  team_id: string;
  title: string;
  context_type: TransportContextType;
  event_date: string;
  departure_time: string | null;
  arrival_target_time: string | null;
  meeting_point: string | null;
  destination: string;
  driver_user_id: string | null;
  contact_notes: string | null;
  travel_notes: string | null;
  status: TransportPlanStatus;
  created_by: string;
  updated_by: string;
  published_by: string | null;
  published_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
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

type TransportPlanCommentRow = {
  id: string;
  plan_id: string;
  author_id: string;
  author_name: string;
  author_role_label: string;
  content: string;
  created_at: string;
};

type ProfileLiteRow = {
  id: string;
  email: string;
  name: string | null;
};

type UserRoleRow = {
  user_id: string;
  roles:
    | {
        slug: string;
      }
    | {
        slug: string;
      }[]
    | null;
};

type UserTeamAssignmentRow = {
  user_id: string;
  team_id: string;
  teams:
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

type NotifyTransportEventPayload = {
  type: 'transport_plan_updated';
  teamId: string;
  planId?: string | null;
  linkPath: string;
  detail?: string;
  eventKey?: string | null;
};

const NOTIFY_FUNCTION_NAME = 'notify-email';

function toStringValue(value: string | null | undefined) {
  return value ?? '';
}

function toNullableText(value: string | null | undefined) {
  const trimmed = (value || '').trim();
  return trimmed.length > 0 ? trimmed : null;
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

function getDisplayName(email: string | null | undefined) {
  return (email || '').split('@')[0] || 'MWOS Staff';
}

function toTeamRecord(value: AppTeam) {
  return {
    id: value.id,
    slug: value.slug,
    name: value.name,
    is_active: value.is_active,
  };
}

async function resolveTransportTeams() {
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

async function fetchProfileMap(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map<string, ProfileLiteRow>();
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name')
    .in('id', uniqueIds);

  if (error) {
    throw error;
  }

  return new Map(((data || []) as ProfileLiteRow[]).map((profile) => [profile.id, profile]));
}

async function callNotificationFunction(body: Record<string, unknown>) {
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
    throw new Error(payload?.error || `Transport notification request failed with status ${response.status}.`);
  }

  return payload;
}

async function triggerTransportEvents(events: NotifyTransportEventPayload[]): Promise<string | null> {
  if (events.length === 0) {
    return null;
  }

  try {
    const response = await callNotificationFunction({
      mode: 'emit-training-events',
      events,
    });
    return response?.warning || null;
  } catch (error: any) {
    console.error('Transport notifications failed.', error);
    return error?.message || 'Notifications could not be delivered right now.';
  }
}

function resolveTransportManagePermission(
  user: Awaited<ReturnType<typeof getCurrentAppUser>>,
  plan: TransportPlanRow | null,
) {
  if (userHasAnyRole(user, ['admin', 'technical_director'])) {
    return true;
  }

  return Boolean(plan?.driver_user_id && plan.driver_user_id === user.id);
}

function resolveTransportCommentPermission(
  user: Awaited<ReturnType<typeof getCurrentAppUser>>,
  plan: TransportPlanRow | null,
) {
  if (!plan) return false;
  if (resolveTransportManagePermission(user, plan)) return true;
  return userHasRole(user, 'coach') && user.teams.some((team) => team.id === plan.team_id);
}

function resolveCanCreateTransport(user: Awaited<ReturnType<typeof getCurrentAppUser>>) {
  return userHasAnyRole(user, ['admin', 'technical_director']);
}

function rowToDraft(row: TransportPlanRow): TransportPlanDraft {
  return {
    title: row.title,
    contextType: row.context_type,
    eventDate: row.event_date,
    departureTime: toStringValue(row.departure_time),
    arrivalTargetTime: toStringValue(row.arrival_target_time),
    meetingPoint: toStringValue(row.meeting_point),
    destination: row.destination,
    driverUserId: toStringValue(row.driver_user_id),
    notes: toStringValue(row.travel_notes),
    contactNotes: toStringValue(row.contact_notes),
    status: row.status,
  };
}

function buildTransportDetail(changes: string[], next: TransportPlanDraft) {
  if (changes.length === 0) {
    return `${next.title} · ${next.eventDate}${next.departureTime ? ` · ${next.departureTime}` : ''}${next.destination ? ` · ${next.destination}` : ''}`;
  }

  const labels: Record<string, string> = {
    eventDate: next.eventDate,
    departureTime: next.departureTime || 'departure time updated',
    arrivalTargetTime: next.arrivalTargetTime || 'arrival target updated',
    destination: next.destination || 'destination updated',
    driverUserId: next.driverUserId ? 'driver reassigned' : 'driver removed',
  };

  return changes.map((change) => labels[change] || change).join(' · ');
}

function buildTransportLinkPath(teamId: string, planId?: string | null) {
  const params = new URLSearchParams({ team: teamId });
  if (planId) params.set('plan', planId);
  return `/transport?${params.toString()}`;
}

export interface TransportDriverOption {
  userId: string;
  name: string;
  email: string;
  teamNames: string[];
}

export interface TransportPlanSummary {
  id: string;
  teamId: string;
  teamName: string;
  teamSlug: string;
  title: string;
  contextType: TransportContextType;
  eventDate: string;
  departureTime: string;
  arrivalTargetTime: string;
  destination: string;
  driverUserId: string;
  driverName: string;
  status: TransportPlanStatus;
  publishedAt: string | null;
  updatedAt: string;
}

export interface TransportPlanComment {
  id: string;
  planId: string;
  authorId: string;
  authorName: string;
  authorRoleLabel: string;
  content: string;
  createdAt: string;
  isAuthor: boolean;
}

export interface TransportWorkspace extends TransportPlanDraft {
  id?: string;
  team: AppTeam;
  driverName: string;
  comments: TransportPlanComment[];
  publishedAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  canCreate: boolean;
  canManage: boolean;
  canComment: boolean;
  canAssignDriver: boolean;
}

export interface SaveTransportPlanInput extends TransportPlanDraft {
  id?: string;
  teamId: string;
}

export interface TransportMutationResult {
  workspace: TransportWorkspace;
  warning?: string | null;
}

export async function fetchTransportTeams() {
  const { teams } = await resolveTransportTeams();
  return teams;
}

export async function fetchTransportDriverOptions(): Promise<TransportDriverOption[]> {
  const authUser = await getCurrentAppUser();
  if (!userHasAnyRole(authUser, ['admin', 'technical_director'])) {
    return [];
  }

  const { data: roleRows, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, roles!inner(slug)')
    .eq('roles.slug', 'driver');

  if (rolesError) {
    throw rolesError;
  }

  const driverIds = Array.from(
    new Set(
      ((roleRows || []) as UserRoleRow[]).flatMap((row) => {
        const joined = Array.isArray(row.roles) ? row.roles : row.roles ? [row.roles] : [];
        return joined.some((role) => role.slug === 'driver') ? [row.user_id] : [];
      }),
    ),
  );

  if (driverIds.length === 0) {
    return [];
  }

  const [profilesMap, assignmentsResponse] = await Promise.all([
    fetchProfileMap(driverIds),
    supabase
      .from('user_team_assignments')
      .select('user_id, team_id, teams(id, slug, name, is_active)')
      .in('user_id', driverIds),
  ]);

  if (assignmentsResponse.error) {
    throw assignmentsResponse.error;
  }

  const teamNamesByUser = new Map<string, string[]>();
  ((assignmentsResponse.data || []) as UserTeamAssignmentRow[]).forEach((row) => {
    const current = teamNamesByUser.get(row.user_id) || [];
    const joined = Array.isArray(row.teams) ? row.teams : row.teams ? [row.teams] : [];
    joined.forEach((team) => {
      if (!current.includes(team.name)) {
        current.push(team.name);
      }
    });
    teamNamesByUser.set(row.user_id, current);
  });

  return driverIds
    .map((driverId) => {
      const profile = profilesMap.get(driverId);
      return {
        userId: driverId,
        name: profile?.name || getDisplayName(profile?.email),
        email: profile?.email || '',
        teamNames: (teamNamesByUser.get(driverId) || []).sort((left, right) => left.localeCompare(right)),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function fetchTransportPlanSummaries(filters: {
  teamId?: string;
  status?: TransportPlanStatus | 'all';
}): Promise<TransportPlanSummary[]> {
  const authUser = await getCurrentAppUser();
  if (!userHasAnyRole(authUser, ['admin', 'technical_director', 'coach', 'driver'])) {
    return [];
  }

  let query = supabase
    .from('transport_plans')
    .select(
      'id, team_id, title, context_type, event_date, departure_time, arrival_target_time, destination, driver_user_id, status, published_at, updated_at, teams(id, slug, name, is_active)',
    )
    .order('event_date', { ascending: true })
    .order('departure_time', { ascending: true, nullsFirst: false });

  if (filters.teamId) {
    query = query.eq('team_id', filters.teamId);
  }

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const rows = (data || []) as TransportPlanRow[];
  const profilesMap = await fetchProfileMap(rows.map((row) => row.driver_user_id || '').filter(Boolean));

  return rows.map((row) => {
    const team = joinedTeam(row.teams);
    const driverProfile = row.driver_user_id ? profilesMap.get(row.driver_user_id) : null;
    return {
      id: row.id,
      teamId: row.team_id,
      teamName: team?.name || 'MWOS Team',
      teamSlug: team?.slug || 'team',
      title: row.title,
      contextType: row.context_type,
      eventDate: row.event_date,
      departureTime: toStringValue(row.departure_time),
      arrivalTargetTime: toStringValue(row.arrival_target_time),
      destination: row.destination,
      driverUserId: toStringValue(row.driver_user_id),
      driverName: driverProfile?.name || getDisplayName(driverProfile?.email) || 'Unassigned',
      status: row.status,
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
    };
  });
}

export async function fetchTransportWorkspace(teamId?: string | null, planId?: string | null): Promise<TransportWorkspace | null> {
  const { user, teams } = await resolveTransportTeams();
  const canCreate = resolveCanCreateTransport(user);
  const canAssignDriver = canCreate;

  if (!planId) {
    if (!teamId) return null;
    const selectedTeam = teams.find((team) => team.id === teamId);
    if (!selectedTeam || !canCreate) return null;

    const draft = buildTransportDraft();
    return {
      ...draft,
      team: selectedTeam,
      driverName: '',
      comments: [],
      publishedAt: null,
      updatedAt: null,
      completedAt: null,
      cancelledAt: null,
      canCreate,
      canManage: canCreate,
      canComment: false,
      canAssignDriver,
    };
  }

  const { data: planData, error: planError } = await supabase
    .from('transport_plans')
    .select(
      'id, team_id, title, context_type, event_date, departure_time, arrival_target_time, meeting_point, destination, driver_user_id, contact_notes, travel_notes, status, created_by, updated_by, published_by, published_at, completed_at, cancelled_at, created_at, updated_at, teams(id, slug, name, is_active)',
    )
    .eq('id', planId)
    .single();

  if (planError) {
    throw planError;
  }

  const plan = planData as TransportPlanRow;
  const [commentsResponse, profilesMap] = await Promise.all([
    supabase
      .from('transport_plan_comments')
      .select('id, plan_id, author_id, author_name, author_role_label, content, created_at')
      .eq('plan_id', plan.id)
      .order('created_at', { ascending: false }),
    fetchProfileMap(plan.driver_user_id ? [plan.driver_user_id] : []),
  ]);

  if (commentsResponse.error) {
    throw commentsResponse.error;
  }

  const driverProfile = plan.driver_user_id ? profilesMap.get(plan.driver_user_id) : null;
  const selectedTeam =
    joinedTeam(plan.teams) ||
    teams.find((team) => team.id === plan.team_id) || {
      id: plan.team_id,
      slug: 'team',
      name: 'MWOS Team',
      is_active: true,
    };

  return {
    ...rowToDraft(plan),
    id: plan.id,
    team: selectedTeam,
    driverName: driverProfile?.name || getDisplayName(driverProfile?.email),
    comments: ((commentsResponse.data || []) as TransportPlanCommentRow[]).map((comment) => ({
      id: comment.id,
      planId: comment.plan_id,
      authorId: comment.author_id,
      authorName: comment.author_name,
      authorRoleLabel: comment.author_role_label,
      content: comment.content,
      createdAt: comment.created_at,
      isAuthor: comment.author_id === user.id,
    })),
    publishedAt: plan.published_at,
    updatedAt: plan.updated_at,
    completedAt: plan.completed_at,
    cancelledAt: plan.cancelled_at,
    canCreate,
    canManage: resolveTransportManagePermission(user, plan),
    canComment: resolveTransportCommentPermission(user, plan),
    canAssignDriver,
  };
}

export async function saveTransportPlan(
  input: SaveTransportPlanInput,
  action: 'draft' | 'publish' | 'complete' | 'cancel',
): Promise<TransportMutationResult> {
  const authUser = await getCurrentAppUser();
  const canCreate = resolveCanCreateTransport(authUser);
  const canAssignDriver = canCreate;

  const existingPlan = input.id
    ? await supabase
        .from('transport_plans')
        .select(
          'id, team_id, title, context_type, event_date, departure_time, arrival_target_time, meeting_point, destination, driver_user_id, contact_notes, travel_notes, status, created_by, updated_by, published_by, published_at, completed_at, cancelled_at, created_at, updated_at',
        )
        .eq('id', input.id)
        .maybeSingle()
    : { data: null, error: null };

  if (existingPlan.error) {
    throw existingPlan.error;
  }

  const currentPlan = existingPlan.data as TransportPlanRow | null;
  const canManageExisting = currentPlan ? resolveTransportManagePermission(authUser, currentPlan) : canCreate;

  if (!canManageExisting) {
    throw new Error('You do not have permission to update this transport plan.');
  }

  if (!currentPlan && !canCreate) {
    throw new Error('Only admin or technical staff can create a new transport plan.');
  }

  if ((action === 'publish' || action === 'cancel') && !canCreate) {
    throw new Error('Only admin or technical staff can publish or cancel transport plans.');
  }

  const normalized = normalizeTransportPlan({
    title: input.title,
    contextType: input.contextType,
    eventDate: input.eventDate,
    departureTime: input.departureTime,
    arrivalTargetTime: input.arrivalTargetTime,
    meetingPoint: input.meetingPoint,
    destination: input.destination,
    driverUserId:
      currentPlan && !canAssignDriver ? toStringValue(currentPlan.driver_user_id) : input.driverUserId,
    notes: input.notes,
    contactNotes: input.contactNotes,
    status: input.status,
  });

  const teamId = currentPlan && !canCreate ? currentPlan.team_id : input.teamId;
  const effectiveDriverUserId =
    currentPlan && !canAssignDriver ? toStringValue(currentPlan.driver_user_id) : normalized.driverUserId;

  const validationMode = action === 'draft' ? 'draft' : 'publish';
  const errors = validateTransportPlan(
    {
      ...normalized,
      driverUserId: effectiveDriverUserId,
    },
    validationMode,
  );

  if (errors.length) {
    throw new Error(errors[0]);
  }

  const nowIso = new Date().toISOString();
  const nextStatus: TransportPlanStatus =
    action === 'cancel'
      ? 'cancelled'
      : action === 'complete'
        ? 'completed'
        : action === 'publish'
          ? currentPlan && currentPlan.status !== 'draft'
            ? 'updated'
            : 'published'
          : currentPlan && ['published', 'updated'].includes(currentPlan.status)
            ? 'updated'
            : 'draft';

  const payload = {
    team_id: teamId,
    title: normalized.title,
    context_type: normalized.contextType,
    event_date: normalized.eventDate,
    departure_time: toNullableText(normalized.departureTime),
    arrival_target_time: toNullableText(normalized.arrivalTargetTime),
    meeting_point: toNullableText(normalized.meetingPoint),
    destination: normalized.destination,
    driver_user_id: effectiveDriverUserId || null,
    contact_notes: toNullableText(normalized.contactNotes),
    travel_notes: toNullableText(normalized.notes),
    status: nextStatus,
    updated_by: authUser.id,
    published_by:
      action === 'publish'
        ? currentPlan?.published_by || authUser.id
        : currentPlan?.published_by || null,
    published_at:
      action === 'publish'
        ? currentPlan?.published_at || nowIso
        : currentPlan?.published_at || null,
    completed_at: action === 'complete' ? nowIso : currentPlan?.completed_at || null,
    cancelled_at: action === 'cancel' ? nowIso : currentPlan?.cancelled_at || null,
  };

  const savedPlanId = currentPlan?.id || globalThis.crypto?.randomUUID?.() || `transport-${Date.now()}`;
  const mutationError = currentPlan
    ? (
        await supabase
          .from('transport_plans')
          .update(payload)
          .eq('id', currentPlan.id)
      ).error
    : (
        await supabase
          .from('transport_plans')
          .insert({
            ...payload,
            id: savedPlanId,
            created_by: authUser.id,
          })
      ).error;

  if (mutationError) {
    throw mutationError;
  }

  const { data: savedData, error: readSavedError } = await supabase
    .from('transport_plans')
    .select(
      'id, team_id, title, context_type, event_date, departure_time, arrival_target_time, meeting_point, destination, driver_user_id, contact_notes, travel_notes, status, created_by, updated_by, published_by, published_at, completed_at, cancelled_at, created_at, updated_at, teams(id, slug, name, is_active)',
    )
    .eq('id', savedPlanId)
    .single();

  if (readSavedError) {
    throw readSavedError;
  }

  const savedPlan = savedData as TransportPlanRow;
  const previousDraft = currentPlan ? rowToDraft(currentPlan) : buildTransportDraft();
  const nextDraft = rowToDraft(savedPlan);
  const majorChanges = currentPlan ? detectMajorTransportChange(previousDraft, nextDraft, new Date()) : [];
  const events: NotifyTransportEventPayload[] = [];

  if (action === 'publish') {
    if (!currentPlan || currentPlan.status === 'draft') {
      events.push({
        type: 'transport_plan_updated',
        teamId: savedPlan.team_id,
        planId: savedPlan.id,
        linkPath: buildTransportLinkPath(savedPlan.team_id, savedPlan.id),
        detail: `Published · ${buildTransportDetail([], nextDraft)}`,
        eventKey: `transport-plan-published:${savedPlan.id}:${savedPlan.published_at || nowIso}`,
      });
    } else if (majorChanges.length > 0) {
      events.push({
        type: 'transport_plan_updated',
        teamId: savedPlan.team_id,
        planId: savedPlan.id,
        linkPath: buildTransportLinkPath(savedPlan.team_id, savedPlan.id),
        detail: `Major update · ${buildTransportDetail(majorChanges, nextDraft)}`,
        eventKey: `transport-plan-major-update:${savedPlan.id}:${savedPlan.updated_at}`,
      });
    }
  } else if (action === 'draft' && currentPlan && majorChanges.length > 0) {
    events.push({
      type: 'transport_plan_updated',
      teamId: savedPlan.team_id,
      planId: savedPlan.id,
      linkPath: buildTransportLinkPath(savedPlan.team_id, savedPlan.id),
      detail: `Major update · ${buildTransportDetail(majorChanges, nextDraft)}`,
      eventKey: `transport-plan-major-update:${savedPlan.id}:${savedPlan.updated_at}`,
    });
  } else if (action === 'cancel' && currentPlan?.status !== 'cancelled') {
    events.push({
      type: 'transport_plan_updated',
      teamId: savedPlan.team_id,
      planId: savedPlan.id,
      linkPath: buildTransportLinkPath(savedPlan.team_id, savedPlan.id),
      detail: `Cancelled · ${buildTransportDetail([], nextDraft)}`,
      eventKey: `transport-plan-cancelled:${savedPlan.id}:${savedPlan.cancelled_at || nowIso}`,
    });
  }

  const warning = await triggerTransportEvents(events);
  const workspace = await fetchTransportWorkspace(savedPlan.team_id, savedPlan.id);

  if (!workspace) {
    throw new Error('The transport plan was saved but could not be reloaded.');
  }

  return {
    workspace,
    warning,
  };
}

export async function addTransportPlanComment(planId: string, content: string): Promise<TransportMutationResult> {
  const authUser = await getCurrentAppUser();
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error('Comment cannot be empty.');
  }

  const roleLabel = userHasRole(authUser, 'technical_director')
    ? 'Technical Director'
    : userHasRole(authUser, 'admin')
      ? 'Admin'
      : userHasRole(authUser, 'driver')
        ? 'Driver'
        : 'Coach';

  const { error } = await supabase
    .from('transport_plan_comments')
    .insert({
      plan_id: planId,
      author_id: authUser.id,
      author_name: authUser.name,
      author_role_label: roleLabel,
      content: trimmedContent,
    });

  if (error) {
    throw error;
  }

  const { data: planResponse, error: planError } = await supabase
    .from('transport_plans')
    .select('team_id')
    .eq('id', planId)
    .single();

  if (planError) {
    throw planError;
  }

  const workspace = await fetchTransportWorkspace(planResponse.team_id, planId);
  if (!workspace) {
    throw new Error('The transport plan comment was saved but the workspace could not be reloaded.');
  }

  return {
    workspace,
    warning: null,
  };
}

function transportWorkspaceToSaveInput(workspace: TransportWorkspace): SaveTransportPlanInput {
  return {
    id: workspace.id,
    teamId: workspace.team.id,
    title: workspace.title,
    contextType: workspace.contextType,
    eventDate: workspace.eventDate,
    departureTime: workspace.departureTime,
    arrivalTargetTime: workspace.arrivalTargetTime,
    meetingPoint: workspace.meetingPoint,
    destination: workspace.destination,
    driverUserId: workspace.driverUserId,
    notes: workspace.notes,
    contactNotes: workspace.contactNotes,
    status: workspace.status,
  };
}

export async function changeTransportPlanStatus(
  planId: string,
  action: 'complete' | 'cancel',
): Promise<TransportMutationResult> {
  const workspace = await fetchTransportWorkspace(null, planId);

  if (!workspace?.id) {
    throw new Error('The selected transport plan could not be loaded.');
  }

  return saveTransportPlan(transportWorkspaceToSaveInput(workspace), action);
}
