import { format, startOfWeek } from 'date-fns';

import {
  fetchStaffAccessEvents,
  fetchStaffInvitations,
  getCurrentAppUser,
  type AppRole,
  type AppTeam,
  type StaffAccessEventRecord,
  type StaffInvitationRecord,
  userHasAnyRole,
  userHasRole,
} from './data';
import {
  buildOversightAttentionItems,
  buildOversightTeamSnapshot,
  type OversightAttentionItem,
  type OversightTeamSnapshot,
} from './oversightDomain';
import { assertSupabaseConfigured, supabase } from './supabase';
import type { TrainingPlanSummary } from './trainingData';
import type { TransportContextType, TransportPlanStatus } from './transportDomain';

type ProfileRow = {
  id: string;
  email: string;
  name: string | null;
};

type TeamRow = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
};

type UserRoleRow = {
  user_id: string;
  roles:
    | {
        slug: string;
        label: string;
      }
    | {
        slug: string;
        label: string;
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

type TrainingPlanRow = {
  id: string;
  team_id: string;
  week_start: string;
  headline: string | null;
  objective: string | null;
  status: 'draft' | 'published' | 'updated' | 'archived';
  updated_at: string;
  published_at: string | null;
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

type TransportPlanRow = {
  id: string;
  team_id: string;
  title: string;
  context_type: TransportContextType;
  event_date: string;
  departure_time: string | null;
  arrival_target_time: string | null;
  destination: string;
  driver_user_id: string | null;
  status: TransportPlanStatus;
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

type ReportRow = {
  id: string;
  user_id: string;
  competition: string | null;
  date: string | null;
  home_team: string | null;
  away_team: string | null;
  created_at: string;
};

export interface OversightMetricSummary {
  staffAccounts: number;
  activeTeams: number;
  trainingCoverage: number;
  upcomingTransportPlans: number;
  reportsLast7Days: number;
  pendingInvitations: number;
}

export interface OversightRoleSummary {
  admins: number;
  technicalDirectors: number;
  coaches: number;
  drivers: number;
  scouts: number;
  boardObservers: number;
}

export interface OversightStaffingHealth {
  unassignedStaffAccounts: number;
  multiTeamStaff: number;
  pendingInvitations: number;
  recentAccessChanges: number | null;
}

export interface OversightRecentReport {
  id: string;
  fixture: string;
  competition: string;
  date: string;
  ownerName: string;
  createdAt: string;
}

export interface OversightTransportItem {
  id: string;
  teamId: string;
  teamName: string;
  title: string;
  eventDate: string;
  departureTime: string;
  destination: string;
  status: TransportPlanStatus;
  driverName: string;
}

export interface OversightWorkspace {
  weekStart: string;
  metrics: OversightMetricSummary;
  roleSummary: OversightRoleSummary | null;
  teamSnapshots: OversightTeamSnapshot[];
  attentionItems: OversightAttentionItem[];
  currentWeekTrainingPlans: TrainingPlanSummary[];
  upcomingTransport: OversightTransportItem[];
  recentReports: OversightRecentReport[];
  pendingInvitations: StaffInvitationRecord[];
  staffingHealth: OversightStaffingHealth | null;
  recentStaffAccessEvents: StaffAccessEventRecord[];
  canSeeStaffCoverage: boolean;
  canSeeInvitationFeed: boolean;
}

function normalizeRoleSlug(value: string | null | undefined) {
  return (value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function getDisplayName(email: string | null | undefined) {
  return (email || '').split('@')[0] || 'MWOS Staff';
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

function mapRoleSummary(roleAssignments: Map<string, AppRole[]>): OversightRoleSummary {
  const summary: OversightRoleSummary = {
    admins: 0,
    technicalDirectors: 0,
    coaches: 0,
    drivers: 0,
    scouts: 0,
    boardObservers: 0,
  };

  roleAssignments.forEach((roles) => {
    const slugs = new Set(roles.map((role) => normalizeRoleSlug(role.slug)));
    if (slugs.has('admin')) summary.admins += 1;
    if (slugs.has('technical_director')) summary.technicalDirectors += 1;
    if (slugs.has('coach')) summary.coaches += 1;
    if (slugs.has('driver')) summary.drivers += 1;
    if (slugs.has('scout')) summary.scouts += 1;
    if (slugs.has('board_observer')) summary.boardObservers += 1;
  });

  return summary;
}

function toTrainingSummary(row: TrainingPlanRow): TrainingPlanSummary {
  const team = joinedTeam(row.teams);
  return {
    id: row.id,
    teamId: row.team_id,
    teamName: team?.name || 'MWOS Team',
    teamSlug: team?.slug || 'team',
    weekStart: row.week_start,
    headline: (row.headline || '').trim(),
    objective: (row.objective || '').trim(),
    status: row.status,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchOversightWorkspace(): Promise<OversightWorkspace> {
  assertSupabaseConfigured();

  const authUser = await getCurrentAppUser();

  if (!userHasAnyRole(authUser, ['admin', 'technical_director', 'board_observer'])) {
    throw new Error('Oversight access is required.');
  }

  const canSeeStaffCoverage = userHasAnyRole(authUser, ['admin', 'technical_director']);
  const canSeeInvitationFeed = userHasRole(authUser, 'admin');
  const canSeeAccessActivity = userHasRole(authUser, 'admin');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');

  const [
    profilesResponse,
    teamsResponse,
    trainingResponse,
    transportResponse,
    reportsResponse,
    userRolesResponse,
    assignmentsResponse,
    pendingInvitations,
    accessEvents,
  ] = await Promise.all([
    supabase.from('profiles').select('id, email, name'),
    supabase.from('teams').select('id, slug, name, is_active').eq('is_active', true).order('sort_order', { ascending: true }),
    supabase
      .from('training_plans')
      .select('id, team_id, week_start, headline, objective, status, updated_at, published_at, teams(id, slug, name, is_active)')
      .eq('week_start', weekStart)
      .order('updated_at', { ascending: false }),
    supabase
      .from('transport_plans')
      .select('id, team_id, title, context_type, event_date, departure_time, arrival_target_time, destination, driver_user_id, status, published_at, updated_at, teams(id, slug, name, is_active)')
      .gte('event_date', today)
      .neq('status', 'cancelled')
      .neq('status', 'completed')
      .order('event_date', { ascending: true })
      .order('departure_time', { ascending: true, nullsFirst: false }),
    supabase
      .from('reports')
      .select('id, user_id, competition, date, home_team, away_team, created_at')
      .order('created_at', { ascending: false })
      .limit(12),
    canSeeStaffCoverage
      ? supabase.from('user_roles').select('user_id, roles!inner(slug, label)')
      : Promise.resolve({ data: [], error: null }),
    canSeeStaffCoverage
      ? supabase.from('user_team_assignments').select('user_id, team_id, teams!inner(id, slug, name, is_active)')
      : Promise.resolve({ data: [], error: null }),
    canSeeInvitationFeed ? fetchStaffInvitations() : Promise.resolve([]),
    canSeeAccessActivity ? fetchStaffAccessEvents() : Promise.resolve([]),
  ]);

  if (profilesResponse.error) throw profilesResponse.error;
  if (teamsResponse.error) throw teamsResponse.error;
  if (trainingResponse.error) throw trainingResponse.error;
  if (transportResponse.error) throw transportResponse.error;
  if (reportsResponse.error) throw reportsResponse.error;
  if ('error' in userRolesResponse && userRolesResponse.error) throw userRolesResponse.error;
  if ('error' in assignmentsResponse && assignmentsResponse.error) throw assignmentsResponse.error;

  const profiles = (profilesResponse.data || []) as ProfileRow[];
  const teams = ((teamsResponse.data || []) as TeamRow[]).map((team) => ({
    id: team.id,
    slug: team.slug,
    name: team.name,
    is_active: Boolean(team.is_active),
  }));

  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  const roleAssignments = new Map<string, AppRole[]>();
  ((userRolesResponse.data || []) as UserRoleRow[]).forEach((row) => {
    const joined = Array.isArray(row.roles) ? row.roles : row.roles ? [row.roles] : [];
    roleAssignments.set(
      row.user_id,
      joined.map((role) => ({
        slug: normalizeRoleSlug(role.slug),
        label: role.label?.trim() || role.slug,
      })),
    );
  });

  const teamsByUser = new Map<string, AppTeam[]>();
  ((assignmentsResponse.data || []) as UserTeamAssignmentRow[]).forEach((row) => {
    const joined = Array.isArray(row.teams) ? row.teams : row.teams ? [row.teams] : [];
    teamsByUser.set(
      row.user_id,
      joined.map((team) => ({
        id: team.id,
        slug: team.slug,
        name: team.name,
        is_active: Boolean(team.is_active),
      })),
    );
  });

  const coachCountByTeam = new Map<string, number>();
  teamsByUser.forEach((assignedTeams, userId) => {
    const roles = roleAssignments.get(userId) || [];
    if (!roles.some((role) => normalizeRoleSlug(role.slug) === 'coach')) return;
    assignedTeams.forEach((team) => {
      coachCountByTeam.set(team.id, (coachCountByTeam.get(team.id) || 0) + 1);
    });
  });

  const trainingPlans = ((trainingResponse.data || []) as TrainingPlanRow[]).map(toTrainingSummary);
  const latestTrainingByTeam = new Map<string, TrainingPlanSummary>();
  trainingPlans.forEach((plan) => {
    if (!latestTrainingByTeam.has(plan.teamId)) {
      latestTrainingByTeam.set(plan.teamId, plan);
    }
  });

  const transportRows = (transportResponse.data || []) as TransportPlanRow[];
  const driverIds = Array.from(new Set(transportRows.map((row) => row.driver_user_id).filter(Boolean))) as string[];
  let driversById = new Map<string, ProfileRow>();
  if (driverIds.length > 0) {
    const { data: driverProfiles, error: driverProfilesError } = await supabase
      .from('profiles')
      .select('id, email, name')
      .in('id', driverIds);
    if (driverProfilesError) throw driverProfilesError;
    driversById = new Map(((driverProfiles || []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  }

  const upcomingTransport: OversightTransportItem[] = transportRows.map((row) => {
    const team = joinedTeam(row.teams);
    const driver = row.driver_user_id ? driversById.get(row.driver_user_id) : null;
    return {
      id: row.id,
      teamId: row.team_id,
      teamName: team?.name || 'MWOS Team',
      title: row.title,
      eventDate: row.event_date,
      departureTime: row.departure_time || '',
      destination: row.destination,
      status: row.status,
      driverName: driver?.name || getDisplayName(driver?.email) || 'Unassigned',
    };
  });

  const nextTransportByTeam = new Map<
    string,
    {
      planId: string;
      status: TransportPlanStatus;
      eventDate: string;
      destination: string;
      driverAssigned: boolean;
      driverName: string;
    }
  >();

  transportRows.forEach((row) => {
    if (nextTransportByTeam.has(row.team_id)) return;
    const driver = row.driver_user_id ? driversById.get(row.driver_user_id) : null;
    nextTransportByTeam.set(row.team_id, {
      planId: row.id,
      status: row.status,
      eventDate: row.event_date,
      destination: row.destination,
      driverAssigned: Boolean(row.driver_user_id),
      driverName: driver?.name || getDisplayName(driver?.email),
    });
  });

  const reportRows = (reportsResponse.data || []) as ReportRow[];
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentReports: OversightRecentReport[] = reportRows.slice(0, 6).map((report) => {
    const owner = profilesById.get(report.user_id);
    return {
      id: report.id,
      fixture: `${(report.home_team || 'Home').trim() || 'Home'} vs ${(report.away_team || 'Away').trim() || 'Away'}`,
      competition: (report.competition || '').trim() || 'Scouting report',
      date: (report.date || '').trim() || report.created_at.slice(0, 10),
      ownerName: owner?.name || getDisplayName(owner?.email),
      createdAt: report.created_at,
    };
  });

  const teamSnapshots = teams.map((team) =>
    buildOversightTeamSnapshot({
      teamId: team.id,
      teamSlug: team.slug,
      teamName: team.name,
      coachCount: canSeeStaffCoverage ? coachCountByTeam.get(team.id) || 0 : null,
      training: latestTrainingByTeam.get(team.id)
        ? {
            planId: latestTrainingByTeam.get(team.id)!.id,
            status: latestTrainingByTeam.get(team.id)!.status,
            headline: latestTrainingByTeam.get(team.id)!.headline,
            weekStart: latestTrainingByTeam.get(team.id)!.weekStart,
            updatedAt: latestTrainingByTeam.get(team.id)!.updatedAt,
          }
        : null,
      transport: nextTransportByTeam.get(team.id) || null,
    }),
  );

  const pendingInviteRecords = (pendingInvitations as StaffInvitationRecord[]).filter((invite) => invite.status === 'pending');
  const staffAccessEvents = (accessEvents as StaffAccessEventRecord[]) || [];
  const attentionItems = buildOversightAttentionItems({
    teams: teamSnapshots,
    pendingInvitations: canSeeInvitationFeed
      ? pendingInviteRecords.map((invite) => ({
          id: invite.id,
          fullName: invite.fullName,
          email: invite.email,
          createdAt: invite.createdAt,
        }))
      : [],
  });

  return {
    weekStart,
    metrics: {
      staffAccounts: profiles.length,
      activeTeams: teams.length,
      trainingCoverage: teamSnapshots.filter((team) => team.trainingStatus !== 'missing').length,
      upcomingTransportPlans: upcomingTransport.length,
      reportsLast7Days: reportRows.filter((report) => new Date(report.created_at).getTime() >= sevenDaysAgo).length,
      pendingInvitations: pendingInviteRecords.length,
    },
    roleSummary: canSeeStaffCoverage ? mapRoleSummary(roleAssignments) : null,
    teamSnapshots,
    attentionItems,
    currentWeekTrainingPlans: trainingPlans.slice(0, 6),
    upcomingTransport: upcomingTransport.slice(0, 6),
    recentReports,
    pendingInvitations: pendingInviteRecords.slice(0, 6),
    staffingHealth: canSeeStaffCoverage
      ? {
          unassignedStaffAccounts: profiles.filter((profile) => (roleAssignments.get(profile.id) || []).length === 0).length,
          multiTeamStaff: Array.from(teamsByUser.values()).filter((assignedTeams) => assignedTeams.length > 1).length,
          pendingInvitations: pendingInviteRecords.length,
          recentAccessChanges: canSeeAccessActivity
            ? staffAccessEvents.filter((event) => new Date(event.createdAt).getTime() >= sevenDaysAgo).length
            : null,
        }
      : null,
    recentStaffAccessEvents: canSeeAccessActivity ? staffAccessEvents.slice(0, 6) : [],
    canSeeStaffCoverage,
    canSeeInvitationFeed,
  };
}
