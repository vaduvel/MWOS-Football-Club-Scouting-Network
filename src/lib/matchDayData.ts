import { format, startOfWeek } from 'date-fns';

import { fetchClubRosterOverview, type ClubRosterPlayer } from './clubPlayersData';
import { getCurrentAppUser, type AppTeam, userHasAnyRole, userHasRole } from './data';
import {
  buildLinkedTransportDraft,
  buildMatchDayStatusTotals,
  linkedTransportBelongsToTeam,
  pickNextRelevantFixture,
  type MatchDayLinkedTransportStatus,
  type MatchDayAvailabilityStatus,
  type MatchDaySelectionStatus,
  type MatchDayWorkflowStatus,
  type PlayerMatchDayCandidate,
} from './matchDayDomain';
import { summarizeTrainingWeekAroundFixture } from './trainingMatchContextDomain';
import { supabase } from './supabase';
import { buildTransportLinkPath } from './transportData';

type MatchDayRow = {
  id: string;
  team_id: string;
  transport_plan_id: string | null;
  opponent: string;
  competition: string | null;
  match_date: string;
  kickoff_time: string | null;
  venue: string | null;
  status: MatchDayWorkflowStatus;
  published_by: string | null;
  published_at: string | null;
  updated_at: string;
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

type TransportPlanLiteRow = {
  id: string;
  team_id: string;
  title: string;
  context_type: 'match' | 'training' | 'other';
  event_date: string;
  departure_time: string | null;
  destination: string;
  driver_user_id: string | null;
  status: MatchDayLinkedTransportStatus;
};

type TransportDriverProfileRow = {
  id: string;
  email: string;
  name: string | null;
};

type MatchDayPlayerRow = {
  match_day_id: string;
  club_player_id: string;
  availability_status: MatchDayAvailabilityStatus;
  selection_status: MatchDaySelectionStatus;
  notes: string | null;
};

type TrainingPlanLiteRow = {
  id: string;
  team_id: string;
  week_start: string;
  status: 'draft' | 'published' | 'updated' | 'archived';
  headline: string | null;
};

type TrainingPlanDayLiteRow = {
  calendar_date: string;
  day_type: 'training' | 'active_recovery' | 'rest';
};

type PlayerMatchDayRow = MatchDayPlayerRow & {
  match_days:
    | ({
        id: string;
        team_id: string;
        opponent: string;
        competition: string | null;
        match_date: string;
        kickoff_time: string | null;
        venue: string | null;
        status: MatchDayWorkflowStatus;
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
      } | null)
    | ({
        id: string;
        team_id: string;
        opponent: string;
        competition: string | null;
        match_date: string;
        kickoff_time: string | null;
        venue: string | null;
        status: MatchDayWorkflowStatus;
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
      }[]) | null;
};

export interface MatchDaySummary {
  id: string;
  teamId: string;
  teamName: string;
  teamSlug: string;
  opponent: string;
  competition: string;
  matchDate: string;
  kickoffTime: string;
  venue: string;
  status: MatchDayWorkflowStatus;
  publishedAt: string | null;
  updatedAt: string;
  starterCount: number;
  benchCount: number;
  unavailableCount: number;
}

export interface MatchDayPlayerSelection {
  clubPlayerId: string;
  playerName: string;
  squadNumber: number | null;
  primaryPosition: string;
  isActive: boolean;
  availabilityStatus: MatchDayAvailabilityStatus;
  selectionStatus: MatchDaySelectionStatus;
  notes: string;
}

export interface MatchDayLinkedTransportSummary {
  id: string;
  teamId: string;
  title: string;
  contextType: 'match' | 'training' | 'other';
  eventDate: string;
  departureTime: string;
  destination: string;
  driverUserId: string;
  driverName: string;
  status: MatchDayLinkedTransportStatus;
  linkPath: string;
}

export interface MatchDayWorkspace {
  id?: string;
  team: AppTeam;
  opponent: string;
  competition: string;
  matchDate: string;
  kickoffTime: string;
  venue: string;
  status: MatchDayWorkflowStatus;
  transportPlan: MatchDayLinkedTransportSummary | null;
  trainingContext: MatchDayTrainingContextSummary | null;
  players: MatchDayPlayerSelection[];
  publishedAt: string | null;
  updatedAt: string | null;
  canManage: boolean;
  rosterSetupNotice: string;
}

export interface MatchDayTrainingContextSummary {
  weekStart: string;
  planId: string;
  status: 'draft' | 'published' | 'updated' | 'archived';
  headline: string;
  linkPath: string;
  preMatchSessionCount: number;
  postMatchSessionCount: number;
  postMatchRecoveryCount: number;
  matchDayIndex: number;
}

export interface SaveMatchDayFixtureInput {
  id?: string;
  teamId: string;
  opponent: string;
  competition: string;
  matchDate: string;
  kickoffTime: string;
  venue: string;
  status: MatchDayWorkflowStatus;
}

export interface MatchDayMutationResult {
  workspace: MatchDayWorkspace;
}

export interface MatchDayTransportMutationResult extends MatchDayMutationResult {
  transportLinkPath: string;
}

export interface PlayerMatchDayStatus {
  matchDayId: string;
  teamId: string;
  teamName: string;
  opponent: string;
  competition: string;
  matchDate: string;
  kickoffTime: string;
  venue: string;
  workflowStatus: MatchDayWorkflowStatus;
  availabilityStatus: MatchDayAvailabilityStatus;
  selectionStatus: MatchDaySelectionStatus;
  notes: string;
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

function toStringValue(value: string | null | undefined) {
  return value ?? '';
}

function toNullableText(value: string | null | undefined) {
  const trimmed = String(value || '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getDisplayName(email: string | null | undefined) {
  return (email || '').split('@')[0] || 'MWOS Staff';
}

function buildTrainingLinkPath(teamId: string, weekStart: string, dayIndex?: number) {
  const params = new URLSearchParams({
    team: teamId,
    week: weekStart,
  });

  if (typeof dayIndex === 'number' && dayIndex >= 0) {
    params.set('day', String(dayIndex));
  }

  return `/training?${params.toString()}`;
}

function buildDefaultMatchDayPlayer(player: ClubRosterPlayer): MatchDayPlayerSelection {
  return {
    clubPlayerId: player.id,
    playerName: player.displayName,
    squadNumber: player.squadNumber,
    primaryPosition: player.primaryPosition,
    isActive: player.isActive,
    availabilityStatus: 'available',
    selectionStatus: 'out',
    notes: '',
  };
}

function sortRosterPlayers(players: MatchDayPlayerSelection[]) {
  return [...players].sort((left, right) => {
    if (left.isActive !== right.isActive) {
      return left.isActive ? -1 : 1;
    }

    const leftNumber = left.squadNumber ?? Number.POSITIVE_INFINITY;
    const rightNumber = right.squadNumber ?? Number.POSITIVE_INFINITY;
    if (leftNumber !== rightNumber) {
      return leftNumber - rightNumber;
    }

    return left.playerName.localeCompare(right.playerName);
  });
}

function mapRosterSelection(
  player: ClubRosterPlayer,
  rowByPlayerId: Map<string, MatchDayPlayerRow>,
): MatchDayPlayerSelection {
  const current = rowByPlayerId.get(player.id);
  if (!current) {
    return buildDefaultMatchDayPlayer(player);
  }

  return {
    clubPlayerId: player.id,
    playerName: player.displayName,
    squadNumber: player.squadNumber,
    primaryPosition: player.primaryPosition,
    isActive: player.isActive,
    availabilityStatus: current.availability_status,
    selectionStatus: current.selection_status,
    notes: toStringValue(current.notes),
  };
}

async function resolveMatchDayTeams() {
  const authUser = await getCurrentAppUser();

  if (userHasAnyRole(authUser, ['admin', 'executive_director', 'technical_director', 'board_observer'])) {
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

function resolveCanManageMatchDay(user: Awaited<ReturnType<typeof getCurrentAppUser>>, teamId: string) {
  if (userHasAnyRole(user, ['admin', 'technical_director'])) {
    return true;
  }

  return userHasRole(user, 'coach') && user.teams.some((team) => team.id === teamId);
}

function buildMatchDayWorkspaceLink(teamId: string, matchDayId?: string | null) {
  const params = new URLSearchParams({
    team: teamId,
  });

  if (matchDayId) {
    params.set('match', matchDayId);
  }

  return `/match-day?${params.toString()}`;
}

function resolveTrainingWeekStart(matchDate: string) {
  return format(startOfWeek(new Date(`${matchDate}T09:00:00`), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

async function fetchTrainingContextSummary(teamId: string, matchDay: MatchDayRow | null) {
  if (!matchDay?.match_date) {
    return null;
  }

  const weekStart = resolveTrainingWeekStart(matchDay.match_date);
  const linkPath = buildTrainingLinkPath(teamId, weekStart);
  const { data, error } = await supabase
    .from('training_plans')
    .select('id, team_id, week_start, status, headline')
    .eq('team_id', teamId)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return {
      weekStart,
      planId: '',
      status: 'draft' as const,
      headline: '',
      linkPath,
      preMatchSessionCount: 0,
      postMatchSessionCount: 0,
      postMatchRecoveryCount: 0,
      matchDayIndex: -1,
    };
  }

  const trainingPlan = data as TrainingPlanLiteRow;
  const { data: daysData, error: daysError } = await supabase
    .from('training_plan_days')
    .select('calendar_date, day_type')
    .eq('plan_id', trainingPlan.id)
    .order('calendar_date', { ascending: true });

  if (daysError) {
    throw daysError;
  }

  const summary = summarizeTrainingWeekAroundFixture(
    ((daysData || []) as TrainingPlanDayLiteRow[]).map((day) => ({
      date: day.calendar_date,
      dayType: day.day_type,
    })),
    matchDay.match_date,
  );

  return {
    weekStart,
    planId: trainingPlan.id,
    status: trainingPlan.status,
    headline: toStringValue(trainingPlan.headline),
    linkPath,
    preMatchSessionCount: summary.preMatchSessionCount,
    postMatchSessionCount: summary.postMatchSessionCount,
    postMatchRecoveryCount: summary.postMatchRecoveryCount,
    matchDayIndex: summary.matchDayIndex,
  };
}

function mapSummary(row: MatchDayRow, rowsByMatchDayId: Map<string, MatchDayPlayerRow[]>) {
  const team = joinedTeam(row.teams);
  const totals = buildMatchDayStatusTotals(
    (rowsByMatchDayId.get(row.id) || []).map((selection) => ({
      availabilityStatus: selection.availability_status,
      selectionStatus: selection.selection_status,
    })),
  );

  return {
    id: row.id,
    teamId: row.team_id,
    teamName: team?.name || 'MWOS Team',
    teamSlug: team?.slug || 'team',
    opponent: row.opponent,
    competition: toStringValue(row.competition),
    matchDate: row.match_date,
    kickoffTime: toStringValue(row.kickoff_time),
    venue: toStringValue(row.venue),
    status: row.status,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    starterCount: totals.starterCount,
    benchCount: totals.benchCount,
    unavailableCount: totals.unavailableCount,
  } satisfies MatchDaySummary;
}

function normalizeMatchDayFixture(input: SaveMatchDayFixtureInput) {
  return {
    opponent: String(input.opponent || '').trim(),
    competition: String(input.competition || '').trim(),
    matchDate: String(input.matchDate || '').trim(),
    kickoffTime: String(input.kickoffTime || '').trim(),
    venue: String(input.venue || '').trim(),
  };
}

async function fetchTransportDriverMap(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map<string, TransportDriverProfileRow>();
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name')
    .in('id', uniqueIds);

  if (error) {
    throw error;
  }

  return new Map(((data || []) as TransportDriverProfileRow[]).map((profile) => [profile.id, profile]));
}

async function fetchLinkedTransportSummary(
  planId: string | null | undefined,
  matchDayTeamId: string,
): Promise<MatchDayLinkedTransportSummary | null> {
  if (!planId) {
    return null;
  }

  const { data, error } = await supabase
    .from('transport_plans')
    .select('id, team_id, title, context_type, event_date, departure_time, destination, driver_user_id, status')
    .eq('id', planId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as TransportPlanLiteRow;
  if (!linkedTransportBelongsToTeam(matchDayTeamId, row.team_id)) {
    throw new Error('The linked transport plan belongs to another team.');
  }

  const driverMap = await fetchTransportDriverMap(row.driver_user_id ? [row.driver_user_id] : []);
  const driverProfile = row.driver_user_id ? driverMap.get(row.driver_user_id) : null;

  return {
    id: row.id,
    teamId: row.team_id,
    title: row.title,
    contextType: row.context_type,
    eventDate: row.event_date,
    departureTime: toStringValue(row.departure_time),
    destination: row.destination,
    driverUserId: toStringValue(row.driver_user_id),
    driverName: driverProfile?.name || getDisplayName(driverProfile?.email) || 'Unassigned',
    status: row.status,
    linkPath: buildTransportLinkPath(row.team_id, row.id),
  };
}

function validateMatchDayFixture(input: ReturnType<typeof normalizeMatchDayFixture>) {
  if (!input.opponent) {
    return 'Opponent is required.';
  }

  if (!input.matchDate) {
    return 'Match date is required.';
  }

  return '';
}

async function buildWorkspaceFromRoster(
  selectedTeam: AppTeam,
  matchDay: MatchDayRow | null,
  playerRows: MatchDayPlayerRow[],
  canManage: boolean,
) {
  const rosterOverview = await fetchClubRosterOverview(selectedTeam.id);
  const rowsByPlayerId = new Map(playerRows.map((row) => [row.club_player_id, row]));
  const [transportPlan, trainingContext] = await Promise.all([
    fetchLinkedTransportSummary(matchDay?.transport_plan_id, selectedTeam.id),
    fetchTrainingContextSummary(selectedTeam.id, matchDay),
  ]);

  return {
    id: matchDay?.id,
    team: selectedTeam,
    opponent: matchDay?.opponent || '',
    competition: toStringValue(matchDay?.competition),
    matchDate: matchDay?.match_date || '',
    kickoffTime: toStringValue(matchDay?.kickoff_time),
    venue: toStringValue(matchDay?.venue),
    status: matchDay?.status || 'draft',
    transportPlan,
    trainingContext,
    players: sortRosterPlayers(rosterOverview.players.map((player) => mapRosterSelection(player, rowsByPlayerId))),
    publishedAt: matchDay?.published_at || null,
    updatedAt: matchDay?.updated_at || null,
    canManage,
    rosterSetupNotice: rosterOverview.setupNotice,
  } satisfies MatchDayWorkspace;
}

export async function fetchMatchDayTeams() {
  const { teams } = await resolveMatchDayTeams();
  return teams;
}

export async function fetchMatchDaySummaries(teamId?: string | null): Promise<MatchDaySummary[]> {
  const authUser = await getCurrentAppUser();
  if (!userHasAnyRole(authUser, ['admin', 'executive_director', 'technical_director', 'board_observer', 'coach'])) {
    return [];
  }

  let query = supabase
    .from('match_days')
    .select('id, team_id, transport_plan_id, opponent, competition, match_date, kickoff_time, venue, status, published_by, published_at, updated_at, teams(id, slug, name, is_active)')
    .order('match_date', { ascending: true })
    .order('kickoff_time', { ascending: true, nullsFirst: false });

  if (teamId) {
    query = query.eq('team_id', teamId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const rows = (data || []) as MatchDayRow[];
  if (rows.length === 0) {
    return [];
  }

  const { data: selectionData, error: selectionError } = await supabase
    .from('match_day_players')
    .select('match_day_id, club_player_id, availability_status, selection_status, notes')
    .in('match_day_id', rows.map((row) => row.id));

  if (selectionError) {
    throw selectionError;
  }

  const rowsByMatchDayId = new Map<string, MatchDayPlayerRow[]>();
  ((selectionData || []) as MatchDayPlayerRow[]).forEach((row) => {
    const current = rowsByMatchDayId.get(row.match_day_id) || [];
    current.push(row);
    rowsByMatchDayId.set(row.match_day_id, current);
  });

  return rows.map((row) => mapSummary(row, rowsByMatchDayId));
}

export async function fetchMatchDayWorkspace(teamId?: string | null, matchDayId?: string | null): Promise<MatchDayWorkspace | null> {
  const { user, teams } = await resolveMatchDayTeams();

  if (!matchDayId) {
    if (!teamId) return null;
    const selectedTeam = teams.find((team) => team.id === teamId);
    if (!selectedTeam) {
      throw new Error('You do not have access to this team.');
    }

    const canManage = resolveCanManageMatchDay(user, selectedTeam.id);
    if (!canManage) {
      return null;
    }

    return buildWorkspaceFromRoster(selectedTeam, null, [], canManage);
  }

  const { data, error } = await supabase
    .from('match_days')
    .select('id, team_id, transport_plan_id, opponent, competition, match_date, kickoff_time, venue, status, published_by, published_at, updated_at, teams(id, slug, name, is_active)')
    .eq('id', matchDayId)
    .single();

  if (error) {
    throw error;
  }

  const matchDay = data as MatchDayRow;
  const selectedTeam =
    teams.find((team) => team.id === matchDay.team_id) ||
    joinedTeam(matchDay.teams) || {
      id: matchDay.team_id,
      slug: 'team',
      name: 'MWOS Team',
      is_active: true,
    };

  const { data: selectionData, error: selectionError } = await supabase
    .from('match_day_players')
    .select('match_day_id, club_player_id, availability_status, selection_status, notes')
    .eq('match_day_id', matchDay.id);

  if (selectionError) {
    throw selectionError;
  }

  return buildWorkspaceFromRoster(
    selectedTeam,
    matchDay,
    (selectionData || []) as MatchDayPlayerRow[],
    resolveCanManageMatchDay(user, matchDay.team_id),
  );
}

export async function saveMatchDayFixture(
  input: SaveMatchDayFixtureInput,
  action: 'draft' | 'publish' | 'complete' | 'cancel',
): Promise<MatchDayMutationResult> {
  const authUser = await getCurrentAppUser();
  const normalized = normalizeMatchDayFixture(input);
  const validationError = validateMatchDayFixture(normalized);

  if (validationError) {
    throw new Error(validationError);
  }

  const existingResponse = input.id
    ? await supabase
        .from('match_days')
        .select('id, team_id, transport_plan_id, opponent, competition, match_date, kickoff_time, venue, status, published_by, published_at, updated_at')
        .eq('id', input.id)
        .maybeSingle()
    : { data: null, error: null };

  if (existingResponse.error) {
    throw existingResponse.error;
  }

  const current = existingResponse.data as MatchDayRow | null;
  const teamId = current?.team_id || input.teamId;

  if (!resolveCanManageMatchDay(authUser, teamId)) {
    throw new Error('You do not have permission to manage this match day.');
  }

  const nowIso = new Date().toISOString();
  const nextStatus: MatchDayWorkflowStatus =
    action === 'publish'
      ? 'published'
      : action === 'complete'
        ? 'completed'
        : action === 'cancel'
          ? 'cancelled'
          : 'draft';

  const payload = {
    team_id: teamId,
    opponent: normalized.opponent,
    competition: toNullableText(normalized.competition),
    match_date: normalized.matchDate,
    kickoff_time: toNullableText(normalized.kickoffTime),
    venue: toNullableText(normalized.venue),
    status: nextStatus,
    updated_by: authUser.id,
    published_by: action === 'publish' ? current?.published_by || authUser.id : current?.published_by || null,
    published_at: action === 'publish' ? current?.published_at || nowIso : current?.published_at || null,
  };

  const matchDayId = current?.id || globalThis.crypto?.randomUUID?.() || `match-day-${Date.now()}`;
  const mutationError = current
    ? (
        await supabase
          .from('match_days')
          .update(payload)
          .eq('id', current.id)
      ).error
    : (
        await supabase
          .from('match_days')
          .insert({
            ...payload,
            id: matchDayId,
            created_by: authUser.id,
          })
      ).error;

  if (mutationError) {
    throw mutationError;
  }

  const workspace = await fetchMatchDayWorkspace(teamId, matchDayId);
  if (!workspace) {
    throw new Error('The match day was saved but could not be reloaded.');
  }

  return {
    workspace,
  };
}

export async function createLinkedTransportPlan(matchDayId: string): Promise<MatchDayTransportMutationResult> {
  const authUser = await getCurrentAppUser();
  const { data: matchDayData, error: matchDayError } = await supabase
    .from('match_days')
    .select('id, team_id, transport_plan_id, opponent, competition, match_date, kickoff_time, venue, status')
    .eq('id', matchDayId)
    .single();

  if (matchDayError) {
    throw matchDayError;
  }

  const matchDay = matchDayData as MatchDayRow;
  if (!resolveCanManageMatchDay(authUser, matchDay.team_id)) {
    throw new Error('You do not have permission to create transport from this match day.');
  }

  if (matchDay.transport_plan_id) {
    const existingTransport = await fetchLinkedTransportSummary(matchDay.transport_plan_id, matchDay.team_id);
    if (!existingTransport) {
      throw new Error('The linked transport plan could not be loaded.');
    }

    const workspace = await fetchMatchDayWorkspace(matchDay.team_id, matchDay.id);
    if (!workspace) {
      throw new Error('The match day could not be reloaded.');
    }

    return {
      workspace,
      transportLinkPath: existingTransport.linkPath,
    };
  }

  const draft = buildLinkedTransportDraft({
    opponent: matchDay.opponent,
    matchDate: matchDay.match_date,
    venue: toStringValue(matchDay.venue),
  });

  const transportPlanId = globalThis.crypto?.randomUUID?.() || `transport-${Date.now()}`;
  const { error: insertError } = await supabase.from('transport_plans').insert({
    id: transportPlanId,
    team_id: matchDay.team_id,
    title: draft.title,
    context_type: draft.contextType,
    event_date: draft.eventDate,
    departure_time: null,
    arrival_target_time: null,
    meeting_point: null,
    destination: draft.destination,
    driver_user_id: null,
    contact_notes: null,
    travel_notes: null,
    status: draft.status,
    created_by: authUser.id,
    updated_by: authUser.id,
  });

  if (insertError) {
    throw insertError;
  }

  const { error: updateError } = await supabase
    .from('match_days')
    .update({
      transport_plan_id: transportPlanId,
      updated_by: authUser.id,
    })
    .eq('id', matchDay.id);

  if (updateError) {
    await supabase.from('transport_plans').delete().eq('id', transportPlanId);
    throw updateError;
  }

  const workspace = await fetchMatchDayWorkspace(matchDay.team_id, matchDay.id);
  if (!workspace) {
    throw new Error('The linked transport plan was created but the match day could not be reloaded.');
  }

  return {
    workspace,
    transportLinkPath: buildTransportLinkPath(matchDay.team_id, transportPlanId),
  };
}

export async function saveMatchDayPlayerSelections(
  matchDayId: string,
  selections: MatchDayPlayerSelection[],
): Promise<MatchDayMutationResult> {
  const authUser = await getCurrentAppUser();
  const { data: matchDayData, error: matchDayError } = await supabase
    .from('match_days')
    .select('team_id')
    .eq('id', matchDayId)
    .single();

  if (matchDayError) {
    throw matchDayError;
  }

  const teamId = String(matchDayData.team_id || '');
  if (!resolveCanManageMatchDay(authUser, teamId)) {
    throw new Error('You do not have permission to update this squad board.');
  }

  const payload = selections.map((selection) => ({
    match_day_id: matchDayId,
    club_player_id: selection.clubPlayerId,
    availability_status: selection.availabilityStatus,
    selection_status: selection.selectionStatus,
    notes: toNullableText(selection.notes),
  }));

  const { error } = await supabase
    .from('match_day_players')
    .upsert(payload, { onConflict: 'match_day_id,club_player_id' });

  if (error) {
    throw error;
  }

  const workspace = await fetchMatchDayWorkspace(teamId, matchDayId);
  if (!workspace) {
    throw new Error('The squad board was saved but could not be reloaded.');
  }

  return {
    workspace,
  };
}

export async function fetchPlayerMatchDayStatus(clubPlayerId: string): Promise<PlayerMatchDayStatus | null> {
  const authUser = await getCurrentAppUser();
  if (!userHasAnyRole(authUser, ['admin', 'executive_director', 'technical_director', 'board_observer', 'coach'])) {
    return null;
  }

  const { data, error } = await supabase
    .from('match_day_players')
    .select(
      'match_day_id, club_player_id, availability_status, selection_status, notes, match_days(id, team_id, opponent, competition, match_date, kickoff_time, venue, status, teams(id, slug, name, is_active))',
    )
    .eq('club_player_id', clubPlayerId);

  if (error) {
    throw error;
  }

  const candidates = ((data || []) as PlayerMatchDayRow[])
    .map((row) => {
      const matchDay = Array.isArray(row.match_days) ? row.match_days[0] || null : row.match_days;
      if (!matchDay) return null;
      const team = joinedTeam(matchDay.teams);

      return {
        matchDayId: matchDay.id,
        teamId: matchDay.team_id,
        teamName: team?.name || 'MWOS Team',
        opponent: matchDay.opponent,
        competition: toStringValue(matchDay.competition),
        matchDate: matchDay.match_date,
        kickoffTime: toStringValue(matchDay.kickoff_time),
        venue: toStringValue(matchDay.venue),
        workflowStatus: matchDay.status,
        availabilityStatus: row.availability_status,
        selectionStatus: row.selection_status,
        notes: toStringValue(row.notes),
      } satisfies PlayerMatchDayCandidate;
    })
    .filter((candidate): candidate is PlayerMatchDayCandidate => Boolean(candidate));

  const next = pickNextRelevantFixture(candidates);
  if (!next) {
    return null;
  }

  return {
    matchDayId: next.matchDayId,
    teamId: next.teamId,
    teamName: next.teamName,
    opponent: next.opponent,
    competition: next.competition,
    matchDate: next.matchDate,
    kickoffTime: next.kickoffTime,
    venue: next.venue,
    workflowStatus: next.workflowStatus,
    availabilityStatus: next.availabilityStatus,
    selectionStatus: next.selectionStatus,
    notes: next.notes,
  };
}

export function buildMatchDayLinkPath(teamId: string, matchDayId?: string | null) {
  return buildMatchDayWorkspaceLink(teamId, matchDayId);
}
