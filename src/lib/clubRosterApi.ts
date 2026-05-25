import type { AppTeam } from './data';
import { supabase } from './supabase';

export interface ClubRosterApiOverviewPlayerRow {
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
  dominant_foot: 'right' | 'left' | 'both' | 'unknown';
  nationality: string | null;
  primary_position: string | null;
  secondary_position: string | null;
  is_active: boolean;
  notes: string | null;
}

export interface ClubRosterApiSeedPlayerRow {
  id: string;
  team_id: string;
  display_name: string;
  squad_number: number | null;
  primary_position: string | null;
  is_active: boolean;
}

interface ClubRosterApiError extends Error {
  status?: number;
}

interface ClubRosterApiOverviewResponse {
  teams: AppTeam[];
  selectedTeamId: string;
  selectedTeamName: string;
  players: ClubRosterApiOverviewPlayerRow[];
  setupNotice?: string;
}

interface ClubRosterApiSeedResponse {
  teams: Array<{ id: string; name: string }>;
  players: ClubRosterApiSeedPlayerRow[];
}

interface ClubRosterApiProfileResponse {
  player: ClubRosterApiOverviewPlayerRow | null;
  teamName: string | null;
}

function buildClubRosterApiUrl(params?: Record<string, string>) {
  const url = new URL('/api/club-roster', window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
}

async function callClubRosterApi<T>(params?: Record<string, string>) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be signed in to use the club roster.');
  }

  const response = await fetch(buildClubRosterApiUrl(params), {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const apiError = new Error(body?.error || `Request failed with status ${response.status}.`) as ClubRosterApiError;
    apiError.status = response.status;
    throw apiError;
  }

  return body as T;
}

export async function fetchClubRosterOverviewApi(teamId?: string) {
  return callClubRosterApi<ClubRosterApiOverviewResponse>(teamId ? { teamId } : undefined);
}

export async function fetchClubRosterSeedApi() {
  return callClubRosterApi<ClubRosterApiSeedResponse>({ mode: 'seed' });
}

export async function fetchClubPlayerProfileApi(playerId: string) {
  return callClubRosterApi<ClubRosterApiProfileResponse>({ playerId });
}
