import type { Session, User } from '@supabase/supabase-js';
import type { Player, PlayerReview, Report } from '../store/report';
import type { AppSettings } from '../store/settings';
import { createId } from './ids';
import { assertSupabaseConfigured, supabase } from './supabase';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  organization: string;
  role: string;
}

interface ProfileRow {
  id: string;
  email: string;
  name: string | null;
  organization: string | null;
  role: string | null;
}

interface ReportRow {
  id: string;
  user_id: string;
  competition: string | null;
  date: string | null;
  venue: string | null;
  kickoff: string | null;
  weather: string | null;
  pitch: string | null;
  home_team: string | null;
  home_score: number | null;
  away_team: string | null;
  away_score: number | null;
  scout_name: string | null;
  focus: string | null;
  general_notes: string | null;
  home_manager: string | null;
  away_manager: string | null;
  formation_home: string | null;
  formation_away: string | null;
  video_url: string | null;
  created_at: string;
  updated_at: string;
}

interface PlayerRow {
  id: string;
  report_id: string;
  team_side: 'home' | 'away';
  shirt_number: number | null;
  name: string | null;
  subbed: string | null;
  goal: string | null;
  rating: number | null;
  position_x: number | null;
  position_y: number | null;
  sort_order: number;
}

interface PlayerReviewRow {
  id: string;
  report_id: string;
  player_id: string | null;
  overview: string | null;
  strengths: string | null;
  areas_to_improve: string | null;
  pace: number | null;
  strength: number | null;
  stamina: number | null;
  agility: number | null;
  decision_making: number | null;
  composure: number | null;
  work_rate: number | null;
  positioning: number | null;
  recommendation_verdict: string | null;
  potential_level: string | null;
  sort_order: number;
}

interface WatchlistPlayerRow {
  id: string;
  user_id: string;
  player_key: string;
  player_name: string;
  club_label: string | null;
  source_player_id: string | null;
  source_report_id: string | null;
  notes: string | null;
  created_at: string;
}

interface ReportCommentRow {
  id: string;
  report_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface OcrReportSuggestions {
  competition?: string;
  date?: string;
  venue?: string;
  kickoff?: string;
  weather?: string;
  pitch?: string;
  home_team?: string;
  home_score?: number;
  away_team?: string;
  away_score?: number;
  home_manager?: string;
  away_manager?: string;
  focus?: string;
}

export interface OcrReportResult {
  text: string;
  suggestions: OcrReportSuggestions;
  fileName: string;
  mimeType: string;
  lineCount: number;
}

export interface AdminDashboardUser {
  id: string;
  email: string;
  name: string;
  organization: string;
  role: string;
  reportCount: number;
  lastReportDate: string;
}

export interface AdminDashboardReport {
  id: string;
  competition: string;
  date: string;
  home_team: string;
  away_team: string;
  owner_name: string;
  owner_email: string;
  created_at: string;
}

export interface AdminDashboardNote {
  id: string;
  title: string;
  owner_name: string;
  report_date: string;
  excerpt: string;
}

export interface AdminDashboardTopPlayer {
  player_id: string;
  name: string;
  shirt_number: number | '';
  team_side: 'home' | 'away';
  report_id: string;
  fixture: string;
  report_date: string;
  potential_level: string;
  verdict: string;
  average_score: number;
  mentions: number;
}

export interface AdminInsightItem {
  title: string;
  rationale: string;
  action: string;
}

export interface AdminAiInsights {
  headline: string;
  suggestions: AdminInsightItem[];
  watchouts: string[];
}

export interface AdminChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AdminAiContext {
  summary: {
    totalUsers: number;
    totalAdmins: number;
    totalReports: number;
    reportsLast7Days: number;
    competitionsTracked: number;
    activeScouts: number;
  };
  topPlayers: Array<{
    name: string;
    potentialLevel: string;
    verdict: string;
    averageScore: number;
    mentions: number;
    fixture: string;
    reportDate: string;
  }>;
  recentReports: Array<{
    competition: string;
    fixture: string;
    owner: string;
    date: string;
  }>;
  quickNotes: Array<{
    title: string;
    owner: string;
    excerpt: string;
  }>;
  users: Array<{
    name: string;
    role: string;
    reportCount: number;
  }>;
}

export interface AdminDashboardOverview {
  totalUsers: number;
  totalAdmins: number;
  totalReports: number;
  reportsLast7Days: number;
  competitionsTracked: number;
  activeScouts: number;
  users: AdminDashboardUser[];
  recentReports: AdminDashboardReport[];
  quickNotes: AdminDashboardNote[];
  topPlayers: AdminDashboardTopPlayer[];
}

export interface PlayerTrendPoint {
  reportId: string;
  date: string;
  fixture: string;
  score: number;
  potentialLevel: string;
  verdict: string;
}

export interface PlayerMetricsAverages {
  pace: number;
  strength: number;
  stamina: number;
  agility: number;
  decision_making: number;
  composure: number;
  work_rate: number;
  positioning: number;
}

export interface PlayerHubEntry {
  playerKey: string;
  name: string;
  clubLabel: string;
  latestReportId: string;
  latestPlayerId: string;
  latestReportDate: string;
  latestFixture: string;
  latestCompetition: string;
  reportCount: number;
  mentionCount: number;
  averageScore: number;
  latestScore: number;
  averageRating: number;
  bestPotential: string;
  latestVerdict: string;
  overview: string;
  strengths: string;
  improvementAreas: string;
  trend: 'up' | 'steady' | 'down';
  trendDelta: number;
  metrics: PlayerMetricsAverages;
  trendPoints: PlayerTrendPoint[];
  isWatchlisted: boolean;
  watchlistId?: string;
}

export interface PlayerHubOverview {
  totalTrackedPlayers: number;
  watchlistCount: number;
  highPotentialCount: number;
  reportedWellCount: number;
  pendingReviewCount: number;
  reportsThisWeek: number;
  entries: PlayerHubEntry[];
  topReported: PlayerHubEntry[];
  watchlist: PlayerHubEntry[];
  recentReports: Array<{
    id: string;
    competition: string;
    date: string;
    fixture: string;
    venue: string;
    focus: string;
    scoutName: string;
    createdAt: string;
  }>;
}

export interface ReportComment {
  id: string;
  reportId: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  createdAt: string;
  isAuthor: boolean;
}

const DEFAULT_FORMATION = '4-3-3';
const PLAYER_ATTRIBUTE_FIELDS = [
  'pace',
  'strength',
  'stamina',
  'agility',
  'decision_making',
  'composure',
  'work_rate',
  'positioning',
] as const;

export const DEFAULT_SETTINGS: AppSettings = {
  football_api_provider: 'api-football',
  football_api_key: '',
};

function getDisplayName(email: string | null | undefined) {
  if (!email) return 'Scout User';
  return email.split('@')[0] || 'Scout User';
}

function toAppUser(profile: ProfileRow): AppUser {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name || getDisplayName(profile.email),
    organization: profile.organization || '',
    role: profile.role || 'Scout',
  };
}

function toStringValue(value: string | null | undefined) {
  return value ?? '';
}

function toNullableText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableNumber(value: number | '' | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function mapPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    team_side: row.team_side,
    shirt_number: row.shirt_number ?? '',
    name: toStringValue(row.name),
    subbed: toStringValue(row.subbed),
    goal: toStringValue(row.goal),
    rating: row.rating ?? '',
    position_x: row.position_x ?? 50,
    position_y: row.position_y ?? 50,
  };
}

function mapReview(row: PlayerReviewRow): PlayerReview {
  return {
    id: row.id,
    player_id: row.player_id ?? '',
    overview: toStringValue(row.overview),
    strengths: toStringValue(row.strengths),
    areas_to_improve: toStringValue(row.areas_to_improve),
    pace: row.pace ?? 3,
    strength: row.strength ?? 3,
    stamina: row.stamina ?? 3,
    agility: row.agility ?? 3,
    decision_making: row.decision_making ?? 3,
    composure: row.composure ?? 3,
    work_rate: row.work_rate ?? 3,
    positioning: row.positioning ?? 3,
    recommendation_verdict: toStringValue(row.recommendation_verdict),
    potential_level: row.potential_level || 'Academy',
  };
}

function mapReport(row: ReportRow, players: PlayerRow[] = [], reviews: PlayerReviewRow[] = []): Report {
  return {
    id: row.id,
    owner_id: row.user_id,
    competition: toStringValue(row.competition),
    date: toStringValue(row.date),
    venue: toStringValue(row.venue),
    kickoff: toStringValue(row.kickoff),
    weather: toStringValue(row.weather),
    pitch: toStringValue(row.pitch),
    home_team: toStringValue(row.home_team),
    home_score: row.home_score ?? '',
    away_team: toStringValue(row.away_team),
    away_score: row.away_score ?? '',
    scout_name: toStringValue(row.scout_name),
    focus: toStringValue(row.focus),
    general_notes: toStringValue(row.general_notes),
    home_manager: toStringValue(row.home_manager),
    away_manager: toStringValue(row.away_manager),
    formation_home: row.formation_home || DEFAULT_FORMATION,
    formation_away: row.formation_away || DEFAULT_FORMATION,
    video_url: row.video_url ?? undefined,
    players: players.map(mapPlayer),
    reviews: reviews.map(mapReview),
  };
}

function isAdminRole(role: string | null | undefined) {
  return (role || '').trim().toLowerCase() === 'admin';
}

function buildShortExcerpt(...values: Array<string | null | undefined>) {
  const raw = values
    .map((value) => toStringValue(value).replace(/\s+/g, ' ').trim())
    .find((value) => value.length > 0);

  if (!raw) {
    return 'No summary note added yet.';
  }

  return raw.length > 160 ? `${raw.slice(0, 157).trimEnd()}...` : raw;
}

function getPotentialRank(level: string | null | undefined) {
  switch ((level || '').trim().toLowerCase()) {
    case 'elite':
      return 4;
    case 'pro':
      return 3;
    case 'semi-pro':
      return 2;
    case 'academy':
      return 1;
    default:
      return 0;
  }
}

function calculateReviewAverage(review: PlayerReviewRow) {
  const values = [
    review.pace,
    review.strength,
    review.stamina,
    review.agility,
    review.decision_making,
    review.composure,
    review.work_rate,
    review.positioning,
  ].filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function averageNumbers(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function roundOneDecimal(value: number) {
  return Number(value.toFixed(1));
}

function normalizePlayerToken(value: string | null | undefined) {
  return toStringValue(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildPlayerKey(name: string | null | undefined, clubLabel: string | null | undefined) {
  const normalizedName = normalizePlayerToken(name);
  const normalizedClub = normalizePlayerToken(clubLabel);
  return `${normalizedName}::${normalizedClub}`;
}

function getPlayerClubLabel(player: PlayerRow, report: ReportRow) {
  const value = player.team_side === 'home' ? report.home_team : report.away_team;
  return toStringValue(value) || 'Scouted Club';
}

function buildFixtureLabel(report: ReportRow) {
  return `${toStringValue(report.home_team) || 'Home'} vs ${toStringValue(report.away_team) || 'Away'}`;
}

function getTrendState(points: PlayerTrendPoint[]) {
  if (points.length < 2) {
    return { trend: 'steady' as const, delta: 0 };
  }

  const firstScore = points[0]?.score || 0;
  const lastScore = points[points.length - 1]?.score || 0;
  const delta = roundOneDecimal(lastScore - firstScore);

  if (delta >= 0.35) {
    return { trend: 'up' as const, delta };
  }

  if (delta <= -0.35) {
    return { trend: 'down' as const, delta };
  }

  return { trend: 'steady' as const, delta };
}

async function getCurrentAuthUser() {
  assertSupabaseConfigured();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error('You must be signed in to continue.');
  }

  return user;
}

async function getCurrentAppUser() {
  const user = await getCurrentAuthUser();
  return upsertProfile(user);
}

async function upsertProfile(user: User) {
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, email, name, organization, role')
    .eq('id', user.id)
    .maybeSingle();

  const metadata = user.user_metadata || {};
  const payload = {
    id: user.id,
    email: user.email || '',
    name: metadata.name || getDisplayName(user.email),
    organization: metadata.organization || '',
    role: existingProfile?.role || metadata.role || 'Scout',
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload)
    .select('id, email, name, organization, role')
    .single();

  if (error) {
    throw error;
  }

  return toAppUser(data as ProfileRow);
}

export async function getSessionWithProfile(): Promise<{ session: Session | null; user: AppUser | null }> {
  assertSupabaseConfigured();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session) {
    return { session: null, user: null };
  }

  const user = await upsertProfile(session.user);
  return { session, user };
}

export function subscribeToAuthChanges(
  callback: (payload: { session: Session | null; user: AppUser | null }) => void,
) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_, session) => {
    void (async () => {
      if (!session) {
        callback({ session: null, user: null });
        return;
      }

      try {
        const user = await upsertProfile(session.user);
        callback({ session, user });
      } catch (error) {
        console.error('Failed to hydrate profile after auth change.', error);
        callback({ session: null, user: null });
      }
    })();
  });

  return () => subscription.unsubscribe();
}

export async function signIn(email: string, password: string) {
  assertSupabaseConfigured();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  if (!data.session) {
    throw new Error('Sign-in succeeded but no session was returned.');
  }

  const user = await upsertProfile(data.user);
  return { session: data.session, user };
}

export async function signUp(
  email: string,
  password: string,
  name: string,
  organization: string,
  requestedRole: 'Scout' | 'Admin' = 'Scout',
) {
  assertSupabaseConfigured();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        organization,
        requested_role: requestedRole,
      },
    },
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Account creation failed. Please try again.');
  }

  if (!data.session) {
    return {
      session: null,
      user: null,
      emailConfirmationRequired: true,
    };
  }

  const user = await upsertProfile(data.user);
  return {
    session: data.session,
    user,
    emailConfirmationRequired: false,
  };
}

export async function signOut() {
  assertSupabaseConfigured();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function fetchReports() {
  const authUser = await getCurrentAppUser();
  const { data, error } = await supabase
    .from('reports')
    .select(
      'id, user_id, competition, date, venue, kickoff, weather, pitch, home_team, home_score, away_team, away_score, scout_name, focus, general_notes, home_manager, away_manager, formation_home, formation_away, created_at, updated_at',
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const mappedReports = (data as ReportRow[]).map((row) => mapReport(row));

  if (!isAdminRole(authUser.role) || mappedReports.length === 0) {
    return mappedReports;
  }

  const ownerIds = Array.from(new Set(mappedReports.map((report) => report.owner_id).filter(Boolean))) as string[];

  if (ownerIds.length === 0) {
    return mappedReports;
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, name, organization, role')
    .in('id', ownerIds);

  if (profilesError) {
    throw profilesError;
  }

  const profilesById = new Map((profiles as ProfileRow[]).map((profile) => [profile.id, profile]));

  return mappedReports.map((report) => {
    const owner = report.owner_id ? profilesById.get(report.owner_id) : null;
    return {
      ...report,
      owner_name: owner?.name || getDisplayName(owner?.email),
      owner_email: owner?.email || '',
    };
  });
}

export async function fetchAdminDashboardOverview(): Promise<AdminDashboardOverview> {
  const authUser = await getCurrentAppUser();

  if (!isAdminRole(authUser.role)) {
    throw new Error('Admin access is required.');
  }

  const [profilesResponse, reportsResponse, playersResponse, reviewsResponse] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, name, organization, role'),
    supabase
      .from('reports')
      .select(
        'id, user_id, competition, date, venue, kickoff, weather, pitch, home_team, home_score, away_team, away_score, scout_name, focus, general_notes, home_manager, away_manager, formation_home, formation_away, created_at, updated_at',
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('players')
      .select(
        'id, report_id, team_side, shirt_number, name, subbed, goal, rating, position_x, position_y, sort_order',
      ),
    supabase
      .from('player_reviews')
      .select(
        'id, report_id, player_id, overview, strengths, areas_to_improve, pace, strength, stamina, agility, decision_making, composure, work_rate, positioning, recommendation_verdict, potential_level, sort_order',
      ),
  ]);

  if (profilesResponse.error) {
    throw profilesResponse.error;
  }

  if (reportsResponse.error) {
    throw reportsResponse.error;
  }

  if (playersResponse.error) {
    throw playersResponse.error;
  }

  if (reviewsResponse.error) {
    throw reviewsResponse.error;
  }

  const profiles = (profilesResponse.data || []) as ProfileRow[];
  const reports = (reportsResponse.data || []) as ReportRow[];
  const players = (playersResponse.data || []) as PlayerRow[];
  const reviews = (reviewsResponse.data || []) as PlayerReviewRow[];
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const reportsById = new Map(reports.map((report) => [report.id, report]));
  const playersById = new Map(players.map((player) => [player.id, player]));
  const reportCountsByUser = new Map<string, number>();
  const lastReportByUser = new Map<string, string>();

  reports.forEach((report) => {
    const currentCount = reportCountsByUser.get(report.user_id) || 0;
    reportCountsByUser.set(report.user_id, currentCount + 1);

    const existingLastDate = lastReportByUser.get(report.user_id);
    if (!existingLastDate || new Date(report.created_at).getTime() > new Date(existingLastDate).getTime()) {
      lastReportByUser.set(report.user_id, report.created_at);
    }
  });

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const competitionsTracked = new Set(
    reports
      .map((report) => toStringValue(report.competition).trim().toLowerCase())
      .filter(Boolean),
  ).size;

  const users = profiles
    .map((profile) => ({
      id: profile.id,
      email: profile.email,
      name: profile.name || getDisplayName(profile.email),
      organization: profile.organization || '',
      role: profile.role || 'Scout',
      reportCount: reportCountsByUser.get(profile.id) || 0,
      lastReportDate: lastReportByUser.get(profile.id) || '',
    }))
    .sort((left, right) => {
      if (Number(isAdminRole(left.role)) !== Number(isAdminRole(right.role))) {
        return Number(isAdminRole(right.role)) - Number(isAdminRole(left.role));
      }

      if (left.reportCount !== right.reportCount) {
        return right.reportCount - left.reportCount;
      }

      return left.name.localeCompare(right.name);
    });

  const recentReports = reports.slice(0, 6).map((report) => {
    const owner = profilesById.get(report.user_id);

    return {
      id: report.id,
      competition: toStringValue(report.competition) || 'Friendly',
      date: toStringValue(report.date),
      home_team: toStringValue(report.home_team) || 'Home',
      away_team: toStringValue(report.away_team) || 'Away',
      owner_name: owner?.name || getDisplayName(owner?.email),
      owner_email: owner?.email || '',
      created_at: report.created_at,
    };
  });

  const quickNotes = reports
    .filter((report) => toStringValue(report.focus).trim() || toStringValue(report.general_notes).trim())
    .slice(0, 5)
    .map((report) => {
      const owner = profilesById.get(report.user_id);
      return {
        id: report.id,
        title: `${toStringValue(report.home_team) || 'Home'} vs ${toStringValue(report.away_team) || 'Away'}`,
        owner_name: owner?.name || getDisplayName(owner?.email),
        report_date: toStringValue(report.date),
        excerpt: buildShortExcerpt(report.focus, report.general_notes),
      };
    });

  const topPlayersMap = new Map<
    string,
    {
      player: PlayerRow;
      report: ReportRow;
      totalScore: number;
      mentions: number;
      bestPotential: string;
      bestPotentialRank: number;
      verdict: string;
    }
  >();

  reviews.forEach((review) => {
    const playerId = review.player_id || '';
    const player = playersById.get(playerId);
    const report = reportsById.get(review.report_id);

    if (!player || !report || !toStringValue(player.name).trim()) {
      return;
    }

    const reviewAverage = calculateReviewAverage(review);
    const potentialRank = getPotentialRank(review.potential_level);
    const verdict = toStringValue(review.recommendation_verdict);
    const existing = topPlayersMap.get(playerId);

    if (!existing) {
      topPlayersMap.set(playerId, {
        player,
        report,
        totalScore: reviewAverage,
        mentions: 1,
        bestPotential: toStringValue(review.potential_level) || 'Academy',
        bestPotentialRank: potentialRank,
        verdict,
      });
      return;
    }

    existing.totalScore += reviewAverage;
    existing.mentions += 1;

    if (potentialRank > existing.bestPotentialRank) {
      existing.bestPotentialRank = potentialRank;
      existing.bestPotential = toStringValue(review.potential_level) || existing.bestPotential;
    }

    if (verdict.length > existing.verdict.length) {
      existing.verdict = verdict;
    }
  });

  const topPlayers: AdminDashboardTopPlayer[] = Array.from(topPlayersMap.values())
    .map((entry): AdminDashboardTopPlayer => ({
      player_id: entry.player.id,
      name: toStringValue(entry.player.name),
      shirt_number: typeof entry.player.shirt_number === 'number' ? entry.player.shirt_number : '',
      team_side: entry.player.team_side,
      report_id: entry.report.id,
      fixture: `${toStringValue(entry.report.home_team) || 'Home'} vs ${toStringValue(entry.report.away_team) || 'Away'}`,
      report_date: toStringValue(entry.report.date),
      potential_level: entry.bestPotential,
      verdict: entry.verdict || 'Positive report entry',
      average_score: Number((entry.totalScore / entry.mentions).toFixed(1)),
      mentions: entry.mentions,
    }))
    .filter((entry) => entry.average_score >= 3.2 || getPotentialRank(entry.potential_level) >= 3)
    .sort((left, right) => {
      if (right.average_score !== left.average_score) {
        return right.average_score - left.average_score;
      }

      if (getPotentialRank(right.potential_level) !== getPotentialRank(left.potential_level)) {
        return getPotentialRank(right.potential_level) - getPotentialRank(left.potential_level);
      }

      return right.mentions - left.mentions;
    })
    .slice(0, 6);

  return {
    totalUsers: profiles.length,
    totalAdmins: profiles.filter((profile) => isAdminRole(profile.role)).length,
    totalReports: reports.length,
    reportsLast7Days: reports.filter((report) => new Date(report.created_at).getTime() >= sevenDaysAgo).length,
    competitionsTracked,
    activeScouts: users.filter((user) => user.reportCount > 0).length,
    users,
    recentReports,
    quickNotes,
    topPlayers,
  };
}

export async function deleteReport(reportId: string) {
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', reportId);

  if (error) {
    throw error;
  }
}

export async function fetchReport(reportId: string) {
  const authUser = await getCurrentAppUser();
  const [reportResponse, playersResponse, reviewsResponse] = await Promise.all([
    supabase
      .from('reports')
      .select(
        'id, user_id, competition, date, venue, kickoff, weather, pitch, home_team, home_score, away_team, away_score, scout_name, focus, general_notes, home_manager, away_manager, formation_home, formation_away, created_at, updated_at',
      )
      .eq('id', reportId)
      .single(),
    supabase
      .from('players')
      .select(
        'id, report_id, team_side, shirt_number, name, subbed, goal, rating, position_x, position_y, sort_order',
      )
      .eq('report_id', reportId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('player_reviews')
      .select(
        'id, report_id, player_id, overview, strengths, areas_to_improve, pace, strength, stamina, agility, decision_making, composure, work_rate, positioning, recommendation_verdict, potential_level, sort_order',
      )
      .eq('report_id', reportId)
      .order('sort_order', { ascending: true }),
  ]);

  if (reportResponse.error) {
    throw reportResponse.error;
  }

  if (playersResponse.error) {
    throw playersResponse.error;
  }

  if (reviewsResponse.error) {
    throw reviewsResponse.error;
  }

  const mappedReport = mapReport(
    reportResponse.data as ReportRow,
    (playersResponse.data || []) as PlayerRow[],
    (reviewsResponse.data || []) as PlayerReviewRow[],
  );

  if (!isAdminRole(authUser.role) || !mappedReport.owner_id) {
    return mappedReport;
  }

  const { data: ownerProfile, error: ownerError } = await supabase
    .from('profiles')
    .select('id, email, name, organization, role')
    .eq('id', mappedReport.owner_id)
    .maybeSingle();

  if (ownerError) {
    throw ownerError;
  }

  return {
    ...mappedReport,
    owner_name: ownerProfile?.name || getDisplayName(ownerProfile?.email),
    owner_email: ownerProfile?.email || '',
  };
}

export async function saveReport(report: Report) {
  const authUser = await getCurrentAppUser();
  const reportId = report.id || createId();
  const reportPayload = {
    id: reportId,
    user_id: report.owner_id || authUser.id,
    competition: toNullableText(report.competition),
    date: toNullableText(report.date),
    venue: toNullableText(report.venue),
    kickoff: toNullableText(report.kickoff),
    weather: toNullableText(report.weather),
    pitch: toNullableText(report.pitch),
    home_team: toNullableText(report.home_team),
    home_score: toNullableNumber(report.home_score),
    away_team: toNullableText(report.away_team),
    away_score: toNullableNumber(report.away_score),
    scout_name: toNullableText(report.scout_name),
    focus: toNullableText(report.focus),
    general_notes: toNullableText(report.general_notes),
    home_manager: toNullableText(report.home_manager),
    away_manager: toNullableText(report.away_manager),
    formation_home: toNullableText(report.formation_home) || DEFAULT_FORMATION,
    formation_away: toNullableText(report.formation_away) || DEFAULT_FORMATION,
    video_url: report.video_url ?? null,
  };

  let savedReportId = reportId;

  if (report.id) {
    const { data: updatedReport, error: updateError } = await supabase
      .from('reports')
      .update(reportPayload)
      .eq('id', reportId)
      .select('id')
      .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    if (updatedReport?.id) {
      savedReportId = updatedReport.id;
    } else {
      const { data: insertedReport, error: insertError } = await supabase
        .from('reports')
        .insert(reportPayload)
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      savedReportId = (insertedReport as { id: string }).id;
    }
  } else {
    const { data: insertedReport, error: insertError } = await supabase
      .from('reports')
      .insert(reportPayload)
      .select('id')
      .single();

    if (insertError) {
      throw insertError;
    }

    savedReportId = (insertedReport as { id: string }).id;
  }

  const playerIdMap = new Map<string, string>();
  const playersPayload = report.players.map((player, index) => {
    const originalId = String(player.id || '');
    const playerId = originalId || createId();

    if (originalId) {
      playerIdMap.set(originalId, playerId);
    }

    playerIdMap.set(playerId, playerId);

    return {
      id: playerId,
      report_id: savedReportId,
      team_side: player.team_side,
      shirt_number: toNullableNumber(player.shirt_number),
      name: toNullableText(player.name),
      subbed: toNullableText(player.subbed),
      goal: toNullableText(player.goal),
      rating: toNullableNumber(player.rating),
      position_x: player.position_x,
      position_y: player.position_y,
      sort_order: index,
    };
  });

  const reviewsPayload = report.reviews.map((review, index) => {
    const originalReviewId = String(review.id || '');
    const resolvedReviewId = originalReviewId || createId();
    const originalPlayerId = String(review.player_id || '');

    return {
      id: resolvedReviewId,
      report_id: savedReportId,
      player_id: playerIdMap.get(originalPlayerId) || null,
      overview: toNullableText(review.overview),
      strengths: toNullableText(review.strengths),
      areas_to_improve: toNullableText(review.areas_to_improve),
      pace: review.pace,
      strength: review.strength,
      stamina: review.stamina,
      agility: review.agility,
      decision_making: review.decision_making,
      composure: review.composure,
      work_rate: review.work_rate,
      positioning: review.positioning,
      recommendation_verdict: toNullableText(review.recommendation_verdict),
      potential_level: toNullableText(review.potential_level),
      sort_order: index,
    };
  });

  const { error: deleteReviewsError } = await supabase
    .from('player_reviews')
    .delete()
    .eq('report_id', savedReportId);

  if (deleteReviewsError) {
    throw deleteReviewsError;
  }

  const { error: deletePlayersError } = await supabase
    .from('players')
    .delete()
    .eq('report_id', savedReportId);

  if (deletePlayersError) {
    throw deletePlayersError;
  }

  if (playersPayload.length > 0) {
    const { error: insertPlayersError } = await supabase.from('players').insert(playersPayload);
    if (insertPlayersError) {
      throw insertPlayersError;
    }
  }

  if (reviewsPayload.length > 0) {
    const { error: insertReviewsError } = await supabase.from('player_reviews').insert(reviewsPayload);
    if (insertReviewsError) {
      throw insertReviewsError;
    }
  }

  return savedReportId;
}

export async function fetchPlayerHubData(): Promise<PlayerHubOverview> {
  const authUser = await getCurrentAppUser();

  const [reportsResponse, playersResponse, reviewsResponse, watchlistResponse] = await Promise.all([
    supabase
      .from('reports')
      .select(
        'id, user_id, competition, date, venue, kickoff, weather, pitch, home_team, home_score, away_team, away_score, scout_name, focus, general_notes, home_manager, away_manager, formation_home, formation_away, created_at, updated_at',
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('players')
      .select(
        'id, report_id, team_side, shirt_number, name, subbed, goal, rating, position_x, position_y, sort_order',
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('player_reviews')
      .select(
        'id, report_id, player_id, overview, strengths, areas_to_improve, pace, strength, stamina, agility, decision_making, composure, work_rate, positioning, recommendation_verdict, potential_level, sort_order',
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('watchlist_players')
      .select('id, user_id, player_key, player_name, club_label, source_player_id, source_report_id, notes, created_at')
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false }),
  ]);

  if (reportsResponse.error) {
    throw reportsResponse.error;
  }

  if (playersResponse.error) {
    throw playersResponse.error;
  }

  if (reviewsResponse.error) {
    throw reviewsResponse.error;
  }

  if (watchlistResponse.error) {
    throw watchlistResponse.error;
  }

  const reports = (reportsResponse.data || []) as ReportRow[];
  const players = (playersResponse.data || []) as PlayerRow[];
  const reviews = (reviewsResponse.data || []) as PlayerReviewRow[];
  const watchlistRows = (watchlistResponse.data || []) as WatchlistPlayerRow[];
  const reportsById = new Map(reports.map((report) => [report.id, report]));
  const reviewsByPlayerId = new Map<string, PlayerReviewRow[]>();
  const watchlistByKey = new Map(watchlistRows.map((row) => [row.player_key, row]));
  const playerMap = new Map<
    string,
    {
      playerKey: string;
      name: string;
      clubLabel: string;
      latestReportId: string;
      latestPlayerId: string;
      latestReportDate: string;
      latestFixture: string;
      latestCompetition: string;
      latestVerdict: string;
      overview: string;
      strengths: string;
      improvementAreas: string;
      reportIds: Set<string>;
      mentionCount: number;
      scoreValues: number[];
      ratingValues: number[];
      bestPotential: string;
      bestPotentialRank: number;
      metricTotals: Record<(typeof PLAYER_ATTRIBUTE_FIELDS)[number], number>;
      metricCounts: Record<(typeof PLAYER_ATTRIBUTE_FIELDS)[number], number>;
      trendPoints: PlayerTrendPoint[];
    }
  >();

  reviews.forEach((review) => {
    const key = review.player_id || '';
    if (!key) return;
    const current = reviewsByPlayerId.get(key) || [];
    current.push(review);
    reviewsByPlayerId.set(key, current);
  });

  players.forEach((player) => {
    const playerName = toStringValue(player.name).trim();
    if (!playerName) {
      return;
    }

    const report = reportsById.get(player.report_id);
    if (!report) {
      return;
    }

    const clubLabel = getPlayerClubLabel(player, report);
    const playerKey = buildPlayerKey(playerName, clubLabel);
    const playerReviews = reviewsByPlayerId.get(player.id) || [];
    const reviewScores = playerReviews
      .map((review) => calculateReviewAverage(review))
      .filter((value) => value > 0);
    const ratingValue = typeof player.rating === 'number' ? Number(player.rating) : 0;
    const scoreCandidates = ratingValue > 0 ? [...reviewScores, ratingValue] : reviewScores;
    const occurrenceScore = roundOneDecimal(averageNumbers(scoreCandidates));
    const latestDate = toStringValue(report.date) || report.created_at;
    const fixture = buildFixtureLabel(report);
    const bestReview = playerReviews.reduce<PlayerReviewRow | null>((current, review) => {
      if (!current) return review;
      return calculateReviewAverage(review) >= calculateReviewAverage(current) ? review : current;
    }, null);
    const potentialLevel = toStringValue(bestReview?.potential_level) || 'Academy';
    const potentialRank = getPotentialRank(potentialLevel);
    const currentEntry = playerMap.get(playerKey);

    if (!currentEntry) {
      const metricTotals = Object.fromEntries(
        PLAYER_ATTRIBUTE_FIELDS.map((field) => [field, 0]),
      ) as Record<(typeof PLAYER_ATTRIBUTE_FIELDS)[number], number>;
      const metricCounts = Object.fromEntries(
        PLAYER_ATTRIBUTE_FIELDS.map((field) => [field, 0]),
      ) as Record<(typeof PLAYER_ATTRIBUTE_FIELDS)[number], number>;

      playerMap.set(playerKey, {
        playerKey,
        name: playerName,
        clubLabel,
        latestReportId: report.id,
        latestPlayerId: player.id,
        latestReportDate: latestDate,
        latestFixture: fixture,
        latestCompetition: toStringValue(report.competition) || 'Friendly',
        latestVerdict: toStringValue(bestReview?.recommendation_verdict),
        overview: toStringValue(bestReview?.overview),
        strengths: toStringValue(bestReview?.strengths),
        improvementAreas: toStringValue(bestReview?.areas_to_improve),
        reportIds: new Set([report.id]),
        mentionCount: 1,
        scoreValues: occurrenceScore > 0 ? [occurrenceScore] : [],
        ratingValues: ratingValue > 0 ? [ratingValue] : [],
        bestPotential: potentialLevel,
        bestPotentialRank: potentialRank,
        metricTotals,
        metricCounts,
        trendPoints: [
          {
            reportId: report.id,
            date: latestDate,
            fixture,
            score: occurrenceScore,
            potentialLevel,
            verdict: toStringValue(bestReview?.recommendation_verdict),
          },
        ],
      });
    } else {
      currentEntry.reportIds.add(report.id);
      currentEntry.mentionCount += 1;
      if (occurrenceScore > 0) {
        currentEntry.scoreValues.push(occurrenceScore);
      }
      if (ratingValue > 0) {
        currentEntry.ratingValues.push(ratingValue);
      }
      currentEntry.trendPoints.push({
        reportId: report.id,
        date: latestDate,
        fixture,
        score: occurrenceScore,
        potentialLevel,
        verdict: toStringValue(bestReview?.recommendation_verdict),
      });

      const existingTime = new Date(currentEntry.latestReportDate).getTime();
      const incomingTime = new Date(latestDate).getTime();
      if (!Number.isNaN(incomingTime) && (Number.isNaN(existingTime) || incomingTime >= existingTime)) {
        currentEntry.latestReportId = report.id;
        currentEntry.latestPlayerId = player.id;
        currentEntry.latestReportDate = latestDate;
        currentEntry.latestFixture = fixture;
        currentEntry.latestCompetition = toStringValue(report.competition) || 'Friendly';
        currentEntry.latestVerdict = toStringValue(bestReview?.recommendation_verdict) || currentEntry.latestVerdict;
        currentEntry.overview = toStringValue(bestReview?.overview) || currentEntry.overview;
        currentEntry.strengths = toStringValue(bestReview?.strengths) || currentEntry.strengths;
        currentEntry.improvementAreas =
          toStringValue(bestReview?.areas_to_improve) || currentEntry.improvementAreas;
      }

      if (potentialRank > currentEntry.bestPotentialRank) {
        currentEntry.bestPotentialRank = potentialRank;
        currentEntry.bestPotential = potentialLevel;
      }

      if (toStringValue(bestReview?.recommendation_verdict).length > currentEntry.latestVerdict.length) {
        currentEntry.latestVerdict = toStringValue(bestReview?.recommendation_verdict);
      }
    }

    const targetEntry = playerMap.get(playerKey);
    if (!targetEntry) {
      return;
    }

    playerReviews.forEach((review) => {
      PLAYER_ATTRIBUTE_FIELDS.forEach((field) => {
        const value = review[field];
        if (typeof value === 'number' && Number.isFinite(value)) {
          targetEntry.metricTotals[field] += value;
          targetEntry.metricCounts[field] += 1;
        }
      });
    });
  });

  const entries = Array.from(playerMap.values())
    .map((entry): PlayerHubEntry => {
      const sortedTrendPoints = [...entry.trendPoints]
        .filter((point) => point.score > 0)
        .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
      const trendState = getTrendState(sortedTrendPoints);
      const metrics = PLAYER_ATTRIBUTE_FIELDS.reduce((accumulator, field) => {
        const total = entry.metricTotals[field];
        const count = entry.metricCounts[field];
        accumulator[field] = count > 0 ? roundOneDecimal(total / count) : 0;
        return accumulator;
      }, {} as PlayerMetricsAverages);
      const watchlistRow = watchlistByKey.get(entry.playerKey);

      return {
        playerKey: entry.playerKey,
        name: entry.name,
        clubLabel: entry.clubLabel,
        latestReportId: entry.latestReportId,
        latestPlayerId: entry.latestPlayerId,
        latestReportDate: entry.latestReportDate,
        latestFixture: entry.latestFixture,
        latestCompetition: entry.latestCompetition,
        reportCount: entry.reportIds.size,
        mentionCount: entry.mentionCount,
        averageScore: roundOneDecimal(averageNumbers(entry.scoreValues)),
        latestScore: sortedTrendPoints[sortedTrendPoints.length - 1]?.score || 0,
        averageRating: roundOneDecimal(averageNumbers(entry.ratingValues)),
        bestPotential: entry.bestPotential,
        latestVerdict: entry.latestVerdict || 'Monitor closely',
        overview: entry.overview,
        strengths: buildShortExcerpt(entry.strengths, entry.overview),
        improvementAreas: buildShortExcerpt(entry.improvementAreas),
        trend: trendState.trend,
        trendDelta: trendState.delta,
        metrics,
        trendPoints: sortedTrendPoints.slice(-6),
        isWatchlisted: Boolean(watchlistRow),
        watchlistId: watchlistRow?.id,
      };
    })
    .sort((left, right) => {
      if (right.averageScore !== left.averageScore) {
        return right.averageScore - left.averageScore;
      }

      if (getPotentialRank(right.bestPotential) !== getPotentialRank(left.bestPotential)) {
        return getPotentialRank(right.bestPotential) - getPotentialRank(left.bestPotential);
      }

      return right.reportCount - left.reportCount;
    });

  const topReported = entries
    .filter((entry) => entry.averageScore >= 3.2 || getPotentialRank(entry.bestPotential) >= 3)
    .slice(0, 6);

  const pendingReviewCount = entries.filter((entry) => {
    const verdict = entry.latestVerdict.toLowerCase();
    return (
      entry.reportCount <= 1 ||
      entry.trend === 'down' ||
      verdict.includes('monitor') ||
      verdict.includes('follow') ||
      verdict.includes('review')
    );
  }).length;

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const reportsThisWeek = reports.filter((report) => {
    const basis = toStringValue(report.date) || report.created_at;
    const time = new Date(basis).getTime();
    return !Number.isNaN(time) && time >= sevenDaysAgo;
  }).length;

  const recentReports = reports.slice(0, 6).map((report) => ({
    id: report.id,
    competition: toStringValue(report.competition) || 'Friendly',
    date: toStringValue(report.date) || report.created_at,
    fixture: buildFixtureLabel(report),
    venue: toStringValue(report.venue) || 'Unknown venue',
    focus: buildShortExcerpt(toStringValue(report.focus), toStringValue(report.general_notes)),
    scoutName: toStringValue(report.scout_name) || 'Scout team',
    createdAt: report.created_at,
  }));

  return {
    totalTrackedPlayers: entries.length,
    watchlistCount: entries.filter((entry) => entry.isWatchlisted).length,
    highPotentialCount: entries.filter((entry) => getPotentialRank(entry.bestPotential) >= 3).length,
    reportedWellCount: topReported.length,
    pendingReviewCount,
    reportsThisWeek,
    entries,
    topReported,
    watchlist: entries.filter((entry) => entry.isWatchlisted),
    recentReports,
  };
}

export async function addPlayerToWatchlist(player: Pick<PlayerHubEntry, 'playerKey' | 'name' | 'clubLabel' | 'latestPlayerId' | 'latestReportId'>) {
  const authUser = await getCurrentAuthUser();
  const payload = {
    user_id: authUser.id,
    player_key: player.playerKey,
    player_name: player.name,
    club_label: player.clubLabel,
    source_player_id: player.latestPlayerId,
    source_report_id: player.latestReportId,
    notes: null,
  };

  const { data, error } = await supabase
    .from('watchlist_players')
    .upsert(payload, { onConflict: 'user_id,player_key' })
    .select('id, user_id, player_key, player_name, club_label, source_player_id, source_report_id, notes, created_at')
    .single();

  if (error) {
    throw error;
  }

  return (data as WatchlistPlayerRow).id;
}

export async function removePlayerFromWatchlist(playerKey: string) {
  const authUser = await getCurrentAuthUser();
  const { error } = await supabase
    .from('watchlist_players')
    .delete()
    .eq('user_id', authUser.id)
    .eq('player_key', playerKey);

  if (error) {
    throw error;
  }
}

export async function fetchReportComments(reportId: string): Promise<ReportComment[]> {
  const authUser = await getCurrentAppUser();
  const { data, error } = await supabase
    .from('report_comments')
    .select('id, report_id, author_id, content, created_at')
    .eq('report_id', reportId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const commentRows = (data || []) as ReportCommentRow[];
  const authorIds = Array.from(new Set(commentRows.map((comment) => comment.author_id)));

  let profilesById = new Map<string, ProfileRow>();
  if (authorIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, name, organization, role')
      .in('id', authorIds);

    if (profilesError) {
      throw profilesError;
    }

    profilesById = new Map(((profiles || []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  }

  return commentRows.map((comment) => {
    const author = profilesById.get(comment.author_id);
    return {
      id: comment.id,
      reportId: comment.report_id,
      authorId: comment.author_id,
      authorName: author?.name || getDisplayName(author?.email),
      authorEmail: author?.email || '',
      content: comment.content,
      createdAt: comment.created_at,
      isAuthor: comment.author_id === authUser.id,
    };
  });
}

export async function addReportComment(reportId: string, content: string): Promise<ReportComment> {
  const authUser = await getCurrentAppUser();
  const payload = {
    id: createId(),
    report_id: reportId,
    author_id: authUser.id,
    content: content.trim(),
  };

  const { data, error } = await supabase
    .from('report_comments')
    .insert(payload)
    .select('id, report_id, author_id, content, created_at')
    .single();

  if (error) {
    throw error;
  }

  const comment = data as ReportCommentRow;
  return {
    id: comment.id,
    reportId: comment.report_id,
    authorId: comment.author_id,
    authorName: authUser.name,
    authorEmail: authUser.email,
    content: comment.content,
    createdAt: comment.created_at,
    isAuthor: true,
  };
}

export async function deleteReportComment(commentId: string) {
  const { error } = await supabase
    .from('report_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    throw error;
  }
}

export async function fetchUserSettings() {
  const authUser = await getCurrentAuthUser();
  const { data, error } = await supabase
    .from('user_settings')
    .select('football_api_provider, football_api_key')
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    football_api_provider: data?.football_api_provider || DEFAULT_SETTINGS.football_api_provider,
    football_api_key: data?.football_api_key || DEFAULT_SETTINGS.football_api_key,
  };
}

export async function saveUserSettings(settings: AppSettings) {
  const authUser = await getCurrentAuthUser();
  const payload = {
    user_id: authUser.id,
    football_api_provider: settings.football_api_provider,
    football_api_key: settings.football_api_key,
  };

  const { error } = await supabase.from('user_settings').upsert(payload);
  if (error) {
    throw error;
  }

  return settings;
}

function buildFunctionUrl(functionName: string, params?: Record<string, string>) {
  const baseUrl = (import.meta.env.VITE_NETLIFY_FUNCTIONS_BASE_URL || '/.netlify/functions').replace(/\/$/, '');
  const url = new URL(`${baseUrl}/${functionName}`, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
}

function buildInternalApiUrl(path: string) {
  return new URL(path, window.location.origin).toString();
}

async function callFunction<T>(functionName: string, params?: Record<string, string>) {
  return callFunctionRequest<T>(functionName, {
    method: 'GET',
  }, params);
}

async function callFunctionRequest<T>(
  functionName: string,
  init: RequestInit,
  params?: Record<string, string>,
) {
  assertSupabaseConfigured();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be signed in to use team import.');
  }

  const response = await fetch(buildFunctionUrl(functionName, params), {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  let body: any = null;
  try {
    body = await response.json();
  } catch (error) {
    body = null;
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        'Netlify function not found. For local import testing, run the app with Netlify Dev or set VITE_NETLIFY_FUNCTIONS_BASE_URL.',
      );
    }

    throw new Error(body?.error || `Request failed with status ${response.status}.`);
  }

  return body as T;
}

async function callAuthorizedApiRequest<T>(path: string, init: RequestInit) {
  assertSupabaseConfigured();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be signed in to use the admin assistant.');
  }

  const response = await fetch(buildInternalApiUrl(path), {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  let body: any = null;
  try {
    body = await response.json();
  } catch (error) {
    body = null;
  }

  if (!response.ok) {
    throw new Error(body?.error || `Request failed with status ${response.status}.`);
  }

  return body as T;
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read file.'));
        return;
      }

      const [, base64 = ''] = result.split(',');
      resolve(base64);
    };

    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export async function searchFootballTeams(query: string) {
  return callFunction<Array<{ id: string; name: string; logo?: string }>>('football-search', { query });
}

export async function fetchFootballSquad(teamId: string) {
  return callFunction<Array<{ id: string; name: string; number?: number; position?: string }>>(
    'football-squad',
    { teamId },
  );
}

export async function extractHandwrittenReport(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are supported right now.');
  }

  if (file.size > 7 * 1024 * 1024) {
    throw new Error('Image is too large. Use a file under 7 MB.');
  }

  const content = await readFileAsBase64(file);

  return callFunctionRequest<OcrReportResult>('ocr-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      content,
    }),
  });
}

export async function fetchAdminAiInsights(context: AdminAiContext) {
  return callAuthorizedApiRequest<AdminAiInsights>('/api/admin-ai/insights', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ context }),
  });
}

export async function sendAdminChatMessage(context: AdminAiContext, messages: AdminChatMessage[]) {
  return callAuthorizedApiRequest<{ reply: string }>('/api/admin-ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ context, messages }),
  });
}

const VIDEO_BUCKET = 'report-videos';
export const MAX_REPORT_VIDEO_BYTES = 30 * 1024 * 1024; // 30 MB
export const MAX_REPORT_VIDEO_DURATION_SECONDS = 90; // 1 minute 30 seconds
export const ALLOWED_REPORT_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;

function loadVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      video.load();
    };

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      cleanup();
      resolve(duration);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('The selected video could not be read. Try MP4, MOV or WebM.'));
    };

    video.src = objectUrl;
  });
}

function getReportVideoPath(reportId: string, file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
  return `${reportId}/clip.${ext}`;
}

async function removeExistingReportVideos(reportId: string) {
  const { data, error } = await supabase.storage
    .from(VIDEO_BUCKET)
    .list(reportId, { limit: 20 });

  if (error) throw error;

  if (!data?.length) return;

  const paths = data
    .filter((entry) => entry.name)
    .map((entry) => `${reportId}/${entry.name}`);

  if (!paths.length) return;

  const { error: removeError } = await supabase.storage
    .from(VIDEO_BUCKET)
    .remove(paths);

  if (removeError) throw removeError;
}

export async function uploadReportVideo(reportId: string, file: File): Promise<string> {
  assertSupabaseConfigured();

  if (file.size > MAX_REPORT_VIDEO_BYTES) {
    throw new Error(`Video is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 30 MB.`);
  }

  if (!ALLOWED_REPORT_VIDEO_TYPES.includes(file.type as (typeof ALLOWED_REPORT_VIDEO_TYPES)[number])) {
    throw new Error('Only MP4, MOV or WebM files are supported.');
  }

  const durationSeconds = await loadVideoDuration(file);
  if (!durationSeconds || durationSeconds > MAX_REPORT_VIDEO_DURATION_SECONDS) {
    throw new Error('Video is too long. Maximum allowed duration is 1 minute 30 seconds.');
  }

  await removeExistingReportVideos(reportId);

  const storagePath = getReportVideoPath(reportId, file);

  const { error: uploadError } = await supabase.storage
    .from(VIDEO_BUCKET)
    .upload(storagePath, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from(VIDEO_BUCKET)
    .getPublicUrl(storagePath);

  const publicUrl = urlData.publicUrl;

  const { error: updateError } = await supabase
    .from('reports')
    .update({ video_url: publicUrl })
    .eq('id', reportId);

  if (updateError) throw updateError;

  return publicUrl;
}

export async function deleteReportVideo(reportId: string, _videoUrl: string): Promise<void> {
  assertSupabaseConfigured();

  await removeExistingReportVideos(reportId);

  const { error: updateError } = await supabase
    .from('reports')
    .update({ video_url: null })
    .eq('id', reportId);

  if (updateError) throw updateError;
}
