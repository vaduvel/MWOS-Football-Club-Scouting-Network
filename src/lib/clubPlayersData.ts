import type { AppTeam } from './data';
import { supabase } from './supabase';
import {
  fetchClubPlayerProfileApi,
  fetchClubRosterOverviewApi,
  fetchClubRosterSeedApi,
  type ClubRosterApiOverviewPlayerRow,
  type ClubRosterApiSeedPlayerRow,
} from './clubRosterApi';
import {
  buildClubPlayerSavePayload,
  formatClubPlayerFoot,
  hasCompleteAnthropometrics,
  normalizeClubPlayerPosition,
  normalizeClubPlayerText,
  type ClubPlayerDraft,
  type ClubPlayerFoot,
} from './clubPlayersDomain';
import type { ClubPlayerMatchCandidate } from './playerIdentityDomain';

type ClubPlayerRow = ClubRosterApiOverviewPlayerRow;

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
  try {
    const response = await fetchClubRosterOverviewApi(teamId);
    const teams = (response.teams || []).filter((team) => team.is_active) as AppTeam[];
    const selectedTeamId = response.selectedTeamId || '';
    const selectedTeamName = response.selectedTeamName || 'Club roster';
    const players = (response.players || []).map((row) => mapPlayer(row, selectedTeamName));

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
      setupNotice: response.setupNotice || '',
    };
  } catch (error) {
    const setupNotice = buildSetupNotice(error);
    if (!setupNotice) {
      throw error;
    }

    return {
      teams: [],
      selectedTeamId: teamId || '',
      selectedTeamName: 'Club roster',
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
}

export async function fetchClubPlayerMatchCandidates(): Promise<ClubPlayerRosterMatchCandidate[]> {
  const response = await fetchClubRosterSeedApi();
  const teamsById = new Map((response.teams || []).map((team) => [team.id, team.name]));

  return ((response.players || []) as ClubRosterApiSeedPlayerRow[]).map((row) => ({
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

  const response = await fetchClubPlayerProfileApi(playerId);

  if (!response.player) {
    return null;
  }

  return mapPlayer(response.player as ClubPlayerRow, response.teamName || 'Club roster');
}

export async function saveClubRosterPlayer(input: {
  teamId: string;
  draft: ClubPlayerDraft;
  playerId?: string;
}) {
  const { payload, errors } = buildClubPlayerSavePayload(input.teamId, input.draft);

  if (!payload) {
    throw new Error(errors.join('\n') || 'Player details are not ready to save.');
  }

  if (input.playerId) {
    const { source_label: _sourceLabel, source_row_number: _sourceRowNumber, ...updatePayload } = payload;
    const { error } = await supabase
      .from('club_players')
      .update(updatePayload)
      .eq('id', input.playerId);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase
    .from('club_players')
    .insert(payload);

  if (error) {
    throw error;
  }
}
