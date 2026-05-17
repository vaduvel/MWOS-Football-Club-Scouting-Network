import type { PlayerReview, Report } from '../store/report';

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
  const hasFormations = hasTeamSheets && hasText(report.formation_home) && hasText(report.formation_away);
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
        ? 'Formation setup is ready for both teams.'
        : 'Confirm both team shapes after the squads are in place.',
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
