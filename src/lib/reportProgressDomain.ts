import type { Player, PlayerReview, Report } from '../store/report';

export type ReportProgressStatus = 'complete' | 'needs_attention';

export interface ReportProgressItem {
  key: 'match_setup' | 'team_sheets' | 'formations' | 'player_reviews';
  label: string;
  status: ReportProgressStatus;
  detail: string;
}

export interface ReportProgressSummary {
  completedCount: number;
  totalCount: number;
  items: ReportProgressItem[];
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function hasNamedPlayerForSide(report: Report, side: 'home' | 'away') {
  return report.players.some((player) => player.team_side === side && hasText(player.name));
}

// Team-sheet rows start at 50/50. Until a scout moves a player or applies a
// formation preset, that point is only a placeholder, not a pitch assignment.
export function isPlayerPositioned(player: Player) {
  return Number.isFinite(player.position_x) && Number.isFinite(player.position_y) &&
    player.position_x >= 0 && player.position_x <= 100 &&
    player.position_y >= 0 && player.position_y <= 100 &&
    (player.position_x !== 50 || player.position_y !== 50);
}

export function getPositionedPlayersForSide(report: Report, side: 'home' | 'away') {
  return report.players.filter((player) => player.team_side === side && hasText(player.name) && isPlayerPositioned(player));
}

function hasReadyFormationForSide(report: Report, side: 'home' | 'away') {
  const namedPlayers = report.players.filter((player) => player.team_side === side && hasText(player.name));
  const formation = side === 'home' ? report.formation_home : report.formation_away;
  return hasText(formation) && namedPlayers.length > 0 &&
    getPositionedPlayersForSide(report, side).length >= Math.min(11, namedPlayers.length);
}

export function countPositionedFormationSides(report: Report) {
  return (['home', 'away'] as const).filter((side) => getPositionedPlayersForSide(report, side).length > 0).length;
}

function hasMeaningfulReview(review: PlayerReview) {
  return (
    hasText(String(review.player_id || '')) ||
    hasText(review.overview) ||
    hasText(review.strengths) ||
    hasText(review.areas_to_improve) ||
    hasText(review.recommendation_verdict)
  );
}

export function buildReportProgress(report: Report): ReportProgressSummary {
  const hasMatchSetup =
    hasText(report.competition) &&
    hasText(report.date) &&
    hasText(report.home_team) &&
    hasText(report.away_team);

  const hasHomePlayer = hasNamedPlayerForSide(report, 'home');
  const hasAwayPlayer = hasNamedPlayerForSide(report, 'away');
  const hasTeamSheets = hasHomePlayer && hasAwayPlayer;
  const hasFormations = hasTeamSheets &&
    hasReadyFormationForSide(report, 'home') && hasReadyFormationForSide(report, 'away');
  const hasReviews = report.reviews.some(hasMeaningfulReview);

  const items: ReportProgressItem[] = [
    {
      key: 'match_setup',
      label: 'Match setup',
      status: hasMatchSetup ? 'complete' : 'needs_attention',
      detail: hasMatchSetup
        ? 'Core fixture details are in place.'
        : 'Add competition, date, and both team names.',
    },
    {
      key: 'team_sheets',
      label: 'Team sheets',
      status: hasTeamSheets ? 'complete' : 'needs_attention',
      detail: hasTeamSheets
        ? 'Both sides already have named players.'
        : 'Add at least one named player for both teams.',
    },
    {
      key: 'formations',
      label: 'Formations',
      status: hasFormations ? 'complete' : 'needs_attention',
      detail: hasFormations
        ? 'Players are placed in both team shapes.'
        : 'Place the starting players (up to 11 per team) on both pitches.',
    },
    {
      key: 'player_reviews',
      label: 'Player reviews',
      status: hasReviews ? 'complete' : 'needs_attention',
      detail: hasReviews
        ? 'At least one scouting review is already written.'
        : 'Add a player review with a note, verdict, or linked player.',
    },
  ];

  return {
    completedCount: items.filter((item) => item.status === 'complete').length,
    totalCount: items.length,
    items,
  };
}
