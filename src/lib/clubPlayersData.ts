import type { AppTeam } from './data';
import { supabase } from './supabase';
import {
  formatClubPlayerFoot,
  hasCompleteAnthropometrics,
  normalizeClubPlayerPosition,
  normalizeClubPlayerText,
  type ClubPlayerFoot,
} from './clubPlayersDomain';
import type { ClubPlayerMatchCandidate } from './playerIdentityDomain';

interface ClubPlayerRow {
  id: string;
  team_id: string;
  source_label: string;
  source_row_number: number | null;
  squad_number: number | null;
  first_name: string;
  last_name: string;
  display_name: string;
  weight_kg: number | null;
  height_cm: number | null;
  bmi: number | null;
  dominant_foot: ClubPlayerFoot;
  nationality: string | null;
  primary_position: string | null;
  secondary_position: string | null;
  is_active: boolean;
  notes: string | null;
}

export interface ClubRosterPlayer {
  id: string;
  teamId: string;
  teamName: string;
  sourceLabel: string;
  sourceRowNumber: number | null;
  squadNumber: number | null;
  firstName: string;
  lastName: string;
  displayName: string;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
  dominantFoot: ClubPlayerFoot;
  dominantFootLabel: string;
  nationality: string;
  primaryPosition: string;
  secondaryPosition: string;
  isActive: boolean;
  notes: string;
  hasCompleteAnthropometrics: boolean;
}

export interface ClubPlayerProfile extends ClubRosterPlayer {}

export interface ClubRosterOverview {
  teams: AppTeam[];
  selectedTeamId: string;
  selectedTeamName: string;
  players: ClubRosterPlayer[];
  stats: {
    totalPlayers: number;
    completeDataCount: number;
    missingDataCount: number;
    leftFootedCount: number;
    dualFootedCount: number;
  };
  setupNotice: string;
}

export interface ClubPlayerRosterMatchCandidate extends ClubPlayerMatchCandidate {
  teamId: string;
  isActive: boolean;
  primaryPosition: string;
}

function buildSetupNotice(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.toLowerCase();

  if (
    normalized.includes('club_players') &&
    (normalized.includes('schema cache') || normalized.includes('does not exist'))
  ) {
    return 'Club roster schema is not applied yet. Run the latest Supabase schema before using the player database.';
  }

  return '';
}

function mapPlayer(row: ClubPlayerRow, teamName: string): ClubRosterPlayer {
  const nationality = normalizeClubPlayerText(row.nationality);
  const primaryPosition = normalizeClubPlayerPosition(row.primary_position);
  const secondaryPosition = normalizeClubPlayerPosition(row.secondary_position);
  const notes = normalizeClubPlayerText(row.notes);
  const complete = hasCompleteAnthropometrics({
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    bmi: row.bmi,
  });

  return {
    id: row.id,
    teamId: row.team_id,
    teamName,
    sourceLabel: row.source_label,
    sourceRowNumber: row.source_row_number,
    squadNumber: row.squad_number,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name,
    weightKg: row.weight_kg,
    heightCm: row.height_cm,
    bmi: row.bmi,
    dominantFoot: row.dominant_foot,
    dominantFootLabel: formatClubPlayerFoot(row.dominant_foot),
    nationality: nationality || 'Nationality missing',
    primaryPosition: primaryPosition || 'Position missing',
    secondaryPosition,
    isActive: row.is_active,
    notes,
    hasCompleteAnthropometrics: complete,
  };
}

export async function fetchClubRosterOverview(teamId?: string): Promise<ClubRosterOverview> {
  const { data: teamsData, error: teamsError } = await supabase
    .from('teams')
    .select('id, slug, name, age_group, is_active')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (teamsError) {
    throw teamsError;
  }

  const teams = ((teamsData || []) as AppTeam[]).filter((team) => team.is_active);
  const defaultTeam =
    teams.find((team) => team.slug === 'first-team') ||
    teams.find((team) => team.slug === 'queens') ||
    teams[0] ||
    null;
  const selectedTeamId = teamId || defaultTeam?.id || '';
  const selectedTeamName = teams.find((team) => team.id === selectedTeamId)?.name || defaultTeam?.name || 'Club roster';

  if (!selectedTeamId) {
    return {
      teams,
      selectedTeamId: '',
      selectedTeamName,
      players: [],
      stats: {
        totalPlayers: 0,
        completeDataCount: 0,
        missingDataCount: 0,
        leftFootedCount: 0,
        dualFootedCount: 0,
      },
      setupNotice: '',
    };
  }

  const { data, error } = await supabase
    .from('club_players')
    .select(
      'id, team_id, source_label, source_row_number, squad_number, first_name, last_name, display_name, weight_kg, height_cm, bmi, dominant_foot, nationality, primary_position, secondary_position, is_active, notes',
    )
    .eq('team_id', selectedTeamId)
    .order('display_name', { ascending: true });

  if (error) {
    const setupNotice = buildSetupNotice(error);
    if (setupNotice) {
      return {
        teams,
        selectedTeamId,
        selectedTeamName,
        players: [],
        stats: {
          totalPlayers: 0,
          completeDataCount: 0,
          missingDataCount: 0,
          leftFootedCount: 0,
          dualFootedCount: 0,
        },
        setupNotice,
      };
    }

    throw error;
  }

  const players = ((data || []) as ClubPlayerRow[]).map((row) =>
    mapPlayer(row, selectedTeamName),
  );

  const completeDataCount = players.filter((player) => player.hasCompleteAnthropometrics).length;
  const leftFootedCount = players.filter((player) => player.dominantFoot === 'left').length;
  const dualFootedCount = players.filter((player) => player.dominantFoot === 'both').length;

  return {
    teams,
    selectedTeamId,
    selectedTeamName,
    players,
    stats: {
      totalPlayers: players.length,
      completeDataCount,
      missingDataCount: Math.max(0, players.length - completeDataCount),
      leftFootedCount,
      dualFootedCount,
    },
    setupNotice: '',
  };
}

export async function fetchClubPlayerMatchCandidates(): Promise<ClubPlayerRosterMatchCandidate[]> {
  const [teamsResponse, playersResponse] = await Promise.all([
    supabase
      .from('teams')
      .select('id, name, is_active'),
    supabase
      .from('club_players')
      .select('id, team_id, display_name, squad_number, primary_position, is_active')
      .eq('is_active', true)
      .order('display_name', { ascending: true }),
  ]);

  if (teamsResponse.error) {
    throw teamsResponse.error;
  }

  if (playersResponse.error) {
    throw playersResponse.error;
  }

  const teamsById = new Map(
    (((teamsResponse.data || []) as Pick<AppTeam, 'id' | 'name' | 'is_active'>[]) || []).map((team) => [
      team.id,
      team.name,
    ]),
  );

  return ((playersResponse.data || []) as Array<{
    id: string;
    team_id: string;
    display_name: string;
    squad_number: number | null;
    primary_position: string | null;
    is_active: boolean;
  }>).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    teamId: row.team_id,
    teamName: teamsById.get(row.team_id) || 'Club roster',
    squadNumber: row.squad_number,
    isActive: row.is_active,
    primaryPosition: normalizeClubPlayerPosition(row.primary_position),
  }));
}

export async function fetchClubPlayerProfileById(playerId: string): Promise<ClubPlayerProfile | null> {
  if (!playerId) {
    return null;
  }

  const [teamsResponse, playerResponse] = await Promise.all([
    supabase.from('teams').select('id, name'),
    supabase
      .from('club_players')
      .select(
        'id, team_id, source_label, source_row_number, squad_number, first_name, last_name, display_name, weight_kg, height_cm, bmi, dominant_foot, nationality, primary_position, secondary_position, is_active, notes',
      )
      .eq('id', playerId)
      .maybeSingle(),
  ]);

  if (teamsResponse.error) {
    throw teamsResponse.error;
  }

  if (playerResponse.error) {
    throw playerResponse.error;
  }

  if (!playerResponse.data) {
    return null;
  }

  const teamsById = new Map(
    (((teamsResponse.data || []) as Array<{ id: string; name: string }>) || []).map((team) => [team.id, team.name]),
  );

  return mapPlayer(
    playerResponse.data as ClubPlayerRow,
    teamsById.get((playerResponse.data as ClubPlayerRow).team_id) || 'Club roster',
  );
}
