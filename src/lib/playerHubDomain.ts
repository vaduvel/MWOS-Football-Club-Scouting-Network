type TrendPointInput = {
  score: number;
};

type RosterSnapshotPlayer = {
  primaryPosition: string;
  heightCm: number | null;
  weightKg: number | null;
  bmi?: number | null;
  hasCompleteAnthropometrics: boolean;
  dominantFoot: 'right' | 'left' | 'both' | 'unknown';
};

export type PlayerHubMetricKey =
  | 'pace'
  | 'strength'
  | 'stamina'
  | 'agility'
  | 'decision_making'
  | 'composure'
  | 'work_rate'
  | 'positioning';

export interface RosterOnlyPlayerHubInput {
  id: string;
  displayName: string;
  teamName: string;
  squadNumber: number | null;
  primaryPosition: string | null;
  isWatchlisted?: boolean;
  watchlistId?: string;
}

export interface PlayerDevelopmentSummaryInput {
  linkedClubPlayerId: string | null;
  reportCount: number;
  bestPotential: string;
  latestVerdict: string;
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

export function buildNumericComparison(
  value: number | null,
  baseline: number | null,
  digits = 1,
) {
  if (value === null || baseline === null || Number.isNaN(value) || Number.isNaN(baseline)) {
    return {
      difference: null,
      direction: 'unavailable' as const,
      label: 'No comparison yet',
    };
  }

  const difference = Number((value - baseline).toFixed(digits));
  if (Math.abs(difference) < 0.05) {
    return {
      difference,
      direction: 'level' as const,
      label: 'Right on team average',
    };
  }

  return {
    difference,
    direction: difference > 0 ? ('above' as const) : ('below' as const),
    label: `${Math.abs(difference).toFixed(digits)} ${difference > 0 ? 'above' : 'below'} team average`,
  };
}

export function buildTrendChartPath(points: TrendPointInput[], width = 240, height = 92) {
  const validPoints = points.filter((point) => Number.isFinite(point.score) && point.score > 0);
  if (!validPoints.length) {
    return '';
  }

  const safeWidth = Math.max(60, width);
  const safeHeight = Math.max(36, height);
  const maxScore = Math.max(...validPoints.map((point) => point.score));
  const minScore = Math.min(...validPoints.map((point) => point.score));
  const range = Math.max(0.5, maxScore - minScore);

  return validPoints
    .map((point, index) => {
      const x =
        validPoints.length === 1
          ? safeWidth / 2
          : (index / (validPoints.length - 1)) * safeWidth;
      const normalized = (point.score - minScore) / range;
      const y = safeHeight - normalized * safeHeight;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

export function buildTrendChartStops(points: TrendPointInput[], width = 240, height = 92) {
  const validPoints = points.filter((point) => Number.isFinite(point.score) && point.score > 0);
  if (!validPoints.length) {
    return [];
  }

  const safeWidth = Math.max(60, width);
  const safeHeight = Math.max(36, height);
  const maxScore = Math.max(...validPoints.map((point) => point.score));
  const minScore = Math.min(...validPoints.map((point) => point.score));
  const range = Math.max(0.5, maxScore - minScore);

  return validPoints.map((point, index) => {
    const x =
      validPoints.length === 1
        ? safeWidth / 2
        : (index / (validPoints.length - 1)) * safeWidth;
    const normalized = (point.score - minScore) / range;
    const y = safeHeight - normalized * safeHeight;
    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      score: point.score,
    };
  });
}

export function buildClubRosterSnapshot(players: RosterSnapshotPlayer[]) {
  const playersWithHeight = players.filter((player) => typeof player.heightCm === 'number');
  const playersWithWeight = players.filter((player) => typeof player.weightKg === 'number');
  const playersWithBmi = players.filter((player) => typeof player.bmi === 'number');
  const completeCount = players.filter((player) => player.hasCompleteAnthropometrics).length;
  const positionCounts = new Map<string, number>();
  const footCounts = {
    left: 0,
    right: 0,
    both: 0,
    unknown: 0,
  };

  players.forEach((player) => {
    const position = player.primaryPosition || 'Position missing';
    positionCounts.set(position, (positionCounts.get(position) || 0) + 1);
    footCounts[player.dominantFoot] += 1;
  });

  const averageHeightCm =
    playersWithHeight.length > 0
      ? Number(
          (
            playersWithHeight.reduce((total, player) => total + (player.heightCm || 0), 0) /
            playersWithHeight.length
          ).toFixed(1),
        )
      : null;
  const averageWeightKg =
    playersWithWeight.length > 0
      ? Number(
          (
            playersWithWeight.reduce((total, player) => total + (player.weightKg || 0), 0) /
            playersWithWeight.length
          ).toFixed(1),
        )
      : null;
  const averageBmi =
    playersWithBmi.length > 0
      ? Number(
          (
            playersWithBmi.reduce((total, player) => total + (player.bmi || 0), 0) /
            playersWithBmi.length
          ).toFixed(1),
        )
      : null;

  return {
    averageHeightCm,
    averageWeightKg,
    averageBmi,
    completeRate:
      players.length > 0 ? Math.round((completeCount / players.length) * 100) : 0,
    footCounts,
    positionMix: Array.from(positionCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
      .slice(0, 6),
  };
}

export function buildRosterOnlyPlayerHubEntry(input: RosterOnlyPlayerHubInput) {
  const positionLabel = input.primaryPosition?.trim() || 'Position missing';
  const squadLabel = input.squadNumber ? `#${input.squadNumber}` : 'No squad number';
  const metricDefaults = {
    pace: 0,
    strength: 0,
    stamina: 0,
    agility: 0,
    decision_making: 0,
    composure: 0,
    work_rate: 0,
    positioning: 0,
  } satisfies Record<PlayerHubMetricKey, number>;

  return {
    playerKey: `club:${input.id}`,
    linkedClubPlayerId: input.id,
    name: input.displayName.trim() || 'Unnamed roster player',
    clubLabel: input.teamName.trim() || 'Club roster',
    latestReportId: '',
    latestPlayerId: '',
    latestReportDate: '',
    latestFixture: `${positionLabel} · ${squadLabel}`,
    latestCompetition: 'Internal roster',
    reportCount: 0,
    mentionCount: 0,
    averageScore: 0,
    latestScore: 0,
    averageRating: 0,
    bestPotential: 'Unreviewed',
    latestVerdict: 'Awaiting first scouting report',
    overview: 'Internal roster player. Link scouting reports to build the football record.',
    strengths: 'Create the first scouting report to identify strengths.',
    improvementAreas: 'No improvement focus logged yet.',
    trend: 'steady' as const,
    trendDelta: 0,
    metrics: metricDefaults,
    trendPoints: [],
    isWatchlisted: Boolean(input.isWatchlisted),
    watchlistId: input.watchlistId,
  };
}

export function buildPlayerDevelopmentSummary(entries: PlayerDevelopmentSummaryInput[]) {
  const internalRosterProfiles = entries.filter((entry) => Boolean(entry.linkedClubPlayerId)).length;
  const linkedScoutingProfiles = entries.filter(
    (entry) => Boolean(entry.linkedClubPlayerId) && entry.reportCount > 0,
  ).length;
  const rosterWithoutScouting = entries.filter(
    (entry) => Boolean(entry.linkedClubPlayerId) && entry.reportCount === 0,
  ).length;
  const externalScoutingProfiles = entries.filter(
    (entry) => !entry.linkedClubPlayerId && entry.reportCount > 0,
  ).length;
  const executiveShortlist = entries.filter((entry) => {
    const verdict = entry.latestVerdict.toLowerCase();
    return (
      getPotentialRank(entry.bestPotential) >= 3 ||
      verdict.includes('green') ||
      verdict.includes('trial') ||
      verdict.includes('shortlist')
    );
  }).length;

  return {
    internalRosterProfiles,
    linkedScoutingProfiles,
    rosterWithoutScouting,
    externalScoutingProfiles,
    executiveShortlist,
    scoutingCoverageRate:
      internalRosterProfiles > 0 ? Math.round((linkedScoutingProfiles / internalRosterProfiles) * 100) : 0,
  };
}

export type PlayerDevelopmentSummary = ReturnType<typeof buildPlayerDevelopmentSummary>;
