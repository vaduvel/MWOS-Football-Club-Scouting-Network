import { createServiceSupabaseClient, json, requireAuthenticatedUser } from './_shared.js';

const GLOBAL_ROSTER_VIEW_ROLES = new Set([
  'admin',
  'executive_director',
  'technical_director',
  'board_observer',
  'scout',
]);

function normalizeRoleSlug(value) {
  return String(value || '').trim().toLowerCase();
}

function forbidden(message = 'You do not have access to this club roster view.') {
  return json(403, { error: message });
}

async function fetchViewerAccess(serviceSupabase, userId) {
  const [rolesResponse, teamAssignmentsResponse] = await Promise.all([
    serviceSupabase
      .from('user_roles')
      .select('roles!inner(slug)')
      .eq('user_id', userId),
    serviceSupabase
      .from('user_team_assignments')
      .select('team_id')
      .eq('user_id', userId),
  ]);

  if (rolesResponse.error) {
    throw rolesResponse.error;
  }

  if (teamAssignmentsResponse.error) {
    throw teamAssignmentsResponse.error;
  }

  const roles = new Set();
  for (const row of rolesResponse.data || []) {
    const joined = Array.isArray(row.roles) ? row.roles : row.roles ? [row.roles] : [];
    for (const role of joined) {
      const slug = normalizeRoleSlug(role?.slug);
      if (slug) {
        roles.add(slug);
      }
    }
  }

  const teamIds = new Set(
    (teamAssignmentsResponse.data || [])
      .map((row) => String(row.team_id || '').trim())
      .filter(Boolean),
  );

  return { roles, teamIds };
}

function canViewRosterTeam(access, teamId) {
  if (!teamId) {
    return false;
  }

  for (const role of GLOBAL_ROSTER_VIEW_ROLES) {
    if (access.roles.has(role)) {
      return true;
    }
  }

  return access.roles.has('coach') && access.teamIds.has(teamId);
}

function filterTeamsForViewer(teams, access) {
  return teams.filter((team) => canViewRosterTeam(access, team.id));
}

function pickDefaultTeam(teams) {
  return (
    teams.find((team) => team.slug === 'first-team') ||
    teams.find((team) => team.slug === 'queens') ||
    teams[0] ||
    null
  );
}

async function fetchActiveTeams(serviceSupabase) {
  const { data, error } = await serviceSupabase
    .from('teams')
    .select('id, slug, name, age_group, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

async function fetchSeedPlayersForTeams(serviceSupabase, teamIds) {
  if (!teamIds.length) {
    return [];
  }

  let query = serviceSupabase
    .from('club_players')
    .select('id, team_id, display_name, squad_number, primary_position, is_active')
    .eq('is_active', true)
    .order('display_name', { ascending: true });

  query = teamIds.length === 1 ? query.eq('team_id', teamIds[0]) : query.in('team_id', teamIds);

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data || [];
}

async function buildOverviewResponse(serviceSupabase, access, requestedTeamId) {
  const teams = await fetchActiveTeams(serviceSupabase);
  const availableTeams = filterTeamsForViewer(teams, access);
  const defaultTeam = pickDefaultTeam(availableTeams);
  const selectedTeam = requestedTeamId
    ? availableTeams.find((team) => team.id === requestedTeamId) || null
    : defaultTeam;

  if (requestedTeamId && !selectedTeam) {
    throw new Error('forbidden_team');
  }

  if (!selectedTeam) {
    return {
      teams: availableTeams,
      selectedTeamId: '',
      selectedTeamName: 'Club roster',
      players: [],
    };
  }

  const { data, error } = await serviceSupabase
    .from('club_players')
    .select(
      'id, team_id, source_label, source_row_number, squad_number, first_name, last_name, display_name, weight_kg, height_cm, bmi, dominant_foot, nationality, primary_position, secondary_position, is_active, notes',
    )
    .eq('team_id', selectedTeam.id)
    .order('display_name', { ascending: true });

  if (error) {
    throw error;
  }

  return {
    teams: availableTeams,
    selectedTeamId: selectedTeam.id,
    selectedTeamName: selectedTeam.name,
    players: data || [],
  };
}

async function buildSeedResponse(serviceSupabase, access) {
  const teams = await fetchActiveTeams(serviceSupabase);
  const availableTeams = filterTeamsForViewer(teams, access);
  const players = await fetchSeedPlayersForTeams(
    serviceSupabase,
    availableTeams.map((team) => team.id),
  );

  return {
    teams: availableTeams.map((team) => ({ id: team.id, name: team.name })),
    players,
  };
}

async function buildProfileResponse(serviceSupabase, access, playerId) {
  const { data, error } = await serviceSupabase
    .from('club_players')
    .select(
      'id, team_id, source_label, source_row_number, squad_number, first_name, last_name, display_name, weight_kg, height_cm, bmi, dominant_foot, nationality, primary_position, secondary_position, is_active, notes',
    )
    .eq('id', playerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return { player: null, teamName: null };
  }

  if (!canViewRosterTeam(access, data.team_id)) {
    throw new Error('forbidden_team');
  }

  const { data: teamRow, error: teamError } = await serviceSupabase
    .from('teams')
    .select('name')
    .eq('id', data.team_id)
    .maybeSingle();

  if (teamError) {
    throw teamError;
  }

  return {
    player: data,
    teamName: teamRow?.name || 'Club roster',
  };
}

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed.' });
  }

  const auth = await requireAuthenticatedUser(event);
  if (auth.error) {
    return auth.error;
  }

  try {
    const serviceSupabase = createServiceSupabaseClient();
    const access = await fetchViewerAccess(serviceSupabase, auth.user.id);

    if (![...GLOBAL_ROSTER_VIEW_ROLES, 'coach'].some((role) => access.roles.has(role))) {
      return forbidden();
    }

    const mode = String(event.queryStringParameters?.mode || '').trim().toLowerCase();
    const teamId = String(event.queryStringParameters?.teamId || '').trim();
    const playerId = String(event.queryStringParameters?.playerId || '').trim();

    if (playerId) {
      return json(200, await buildProfileResponse(serviceSupabase, access, playerId));
    }

    if (mode === 'seed') {
      return json(200, await buildSeedResponse(serviceSupabase, access));
    }

    return json(200, await buildOverviewResponse(serviceSupabase, access, teamId));
  } catch (error) {
    if (error?.message === 'forbidden_team') {
      return forbidden('You do not have access to this team roster.');
    }

    return json(500, { error: error?.message || 'Failed to load club roster.' });
  }
}
