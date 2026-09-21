import type { Player, PlayerReview, Report } from '../store/report';

export type DraftRecord = {
  version: 2;
  userId: string;
  key: string;
  report: Report;
  savedAt: string;
};

const REPORT_TEXT_FIELDS = [
  'competition', 'date', 'venue', 'kickoff', 'weather', 'pitch', 'home_team',
  'away_team', 'scout_name', 'focus', 'general_notes', 'home_manager',
  'away_manager', 'formation_home', 'formation_away',
] as const;
const REVIEW_TEXT_FIELDS = [
  'overview', 'strengths', 'areas_to_improve', 'recommendation_verdict', 'potential_level',
] as const;
const REVIEW_SCORE_FIELDS = [
  'pace', 'strength', 'stamina', 'agility', 'decision_making', 'composure', 'work_rate', 'positioning',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isId(value: unknown): value is string | number {
  return (typeof value === 'string' && value.length > 0) ||
    (typeof value === 'number' && Number.isFinite(value));
}

function isOptionalNumber(value: unknown) {
  return value === '' || (typeof value === 'number' && Number.isFinite(value));
}

function isPlayer(value: unknown): value is Player {
  return isRecord(value) && isId(value.id) &&
    (value.team_side === 'home' || value.team_side === 'away') &&
    ['name', 'subbed', 'goal'].every((field) => typeof value[field] === 'string') &&
    isOptionalNumber(value.shirt_number) && isOptionalNumber(value.rating) &&
    typeof value.position_x === 'number' && Number.isFinite(value.position_x) &&
    typeof value.position_y === 'number' && Number.isFinite(value.position_y) &&
    (value.club_player_id == null || typeof value.club_player_id === 'string');
}

function isReview(value: unknown): value is PlayerReview {
  return isRecord(value) && isId(value.id) && (value.player_id === '' || isId(value.player_id)) &&
    REVIEW_TEXT_FIELDS.every((field) => typeof value[field] === 'string') &&
    REVIEW_SCORE_FIELDS.every((field) => typeof value[field] === 'number' && Number.isFinite(value[field]));
}

function isReport(value: unknown): value is Report {
  return isRecord(value) &&
    (value.id === undefined || (typeof value.id === 'string' && value.id.length > 0)) &&
    (value.report_type === undefined || value.report_type === 'match' || value.report_type === 'individual') &&
    REPORT_TEXT_FIELDS.every((field) => typeof value[field] === 'string') &&
    ['owner_id', 'owner_name', 'owner_email', 'video_url'].every((field) =>
      value[field] === undefined || typeof value[field] === 'string') &&
    isOptionalNumber(value.home_score) && isOptionalNumber(value.away_score) &&
    Array.isArray(value.players) && value.players.every(isPlayer) &&
    Array.isArray(value.reviews) && value.reviews.every(isReview);
}

export function getReportDraftKey(userId: string, reportId?: string): string {
  if (!userId.trim() || (reportId !== undefined && !reportId.trim())) {
    throw new Error('A report draft requires an authenticated user and a valid report scope.');
  }
  const scope = reportId === undefined ? 'new' : `report:${encodeURIComponent(reportId)}`;
  return `report-draft:v2:${encodeURIComponent(userId)}:${scope}`;
}

export function parseReportDraft(value: unknown, userId: string, reportId?: string): DraftRecord | null {
  if (!isRecord(value) || value.version !== 2 || value.userId !== userId ||
    value.key !== getReportDraftKey(userId, reportId) ||
    typeof value.savedAt !== 'string' || !Number.isFinite(Date.parse(value.savedAt)) ||
    !isReport(value.report) || (reportId !== undefined && value.report.id !== reportId)) {
    return null;
  }
  return value as DraftRecord;
}

export function shouldDeleteReportDraft(
  value: unknown,
  userId: string,
  reportId?: string,
  expectedSnapshot?: string,
): boolean {
  const draft = parseReportDraft(value, userId, reportId);
  if (!draft) return false;
  if (expectedSnapshot === undefined) return true;
  try {
    return JSON.stringify(draft.report) === expectedSnapshot;
  } catch {
    return false;
  }
}
