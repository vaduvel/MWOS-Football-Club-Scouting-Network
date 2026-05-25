type TrendPointInput = {
  score: number;
};

type RadarMetricInput = {
  label: string;
  value: number;
  maxValue?: number;
};

type AnthropometricComparisonInput = {
  label: string;
  value: number | null;
  baseline: number | null;
  unit: string;
  digits?: number;
  tolerance: number;
};

export type AnthropometricComparisonRow = {
  label: string;
  valueLabel: string;
  baselineLabel: string;
  context: string;
  tone: 'above' | 'below' | 'level' | 'unavailable';
  difference: number | null;
  playerPercent: number | null;
  baselinePercent: number | null;
};

export type RadarChartPoint = {
  label: string;
  value: number;
  normalizedValue: number;
  x: number;
  y: number;
};

type RosterSnapshotPlayer = {
  primaryPosition: string;
  heightCm: number | null;
  weightKg: number | null;
  bmi?: number | null;
  hasCompleteAnthropometrics: boolean;
  dominantFoot: 'right' | 'left' | 'both' | 'unknown';
};

export type TeamRosterAnalyticsRow = {
  label: string;
  count: number;
  percent: number;
  barPercent: number;
};

export type TeamRosterPhysicalRow = {
  label: string;
  valueLabel: string;
  detail: string;
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

export type GlobalScoutingPipelineStageKey =
  | 'fresh_intel'
  | 'technical_review'
  | 'executive_shortlist'
  | 'trial_ready';

export type GlobalScoutingPipelineTone = 'neutral' | 'review' | 'shortlist' | 'ready';

export interface GlobalScoutingPipelineInput {
  playerKey: string;
  name: string;
  clubLabel: string;
  latestReportId: string;
  latestFixture: string;
  latestCompetition: string;
  averageScore: number;
  bestPotential: string;
  latestVerdict: string;
  isWatchlisted: boolean;
  reportCount: number;
  linkedClubPlayerId: string | null;
}

export interface GlobalScoutingPipelineCandidate {
  playerKey: string;
  name: string;
  clubLabel: string;
  latestReportId: string;
  latestFixture: string;
  latestCompetition: string;
  averageScore: number;
  bestPotential: string;
  latestVerdict: string;
  isWatchlisted: boolean;
  reportCount: number;
  linkedClubPlayerId: string | null;
  stageKey: GlobalScoutingPipelineStageKey;
  signalLabel: string;
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

function roundChartCoordinate(value: number) {
  return Number(value.toFixed(2));
}

function clampMetricValue(value: number, maxValue: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), maxValue);
}

function formatComparisonValue(value: number | null, unit: string, digits: number) {
  const suffix = unit ? ` ${unit}` : '';
  if (value === null || !Number.isFinite(value)) {
    return `--${suffix}`;
  }

  return `${value.toFixed(digits)}${suffix}`;
}

function clampPercent(value: number) {
  return Math.min(Math.max(value, 8), 92);
}

function roundPercent(value: number) {
  return Number(value.toFixed(1));
}

function formatCompactNumber(value: number | null, digits = 1) {
  if (value === null || !Number.isFinite(value)) return '--';
  const fixedValue = value.toFixed(digits);
  return fixedValue.endsWith('.0') ? fixedValue.slice(0, -2) : fixedValue;
}

function formatMeasuredDetail(count: number) {
  if (count === 0) return 'No players measured';
  if (count === 1) return '1 player measured';
  return `${count} players measured`;
}

function buildDistributionRows(entries: Array<[string, number]>, total: number) {
  if (total === 0) return [];

  return entries
    .filter(([, count]) => count > 0)
    .map(([label, count]) => {
      const percent = Math.round((count / total) * 100);
      return {
        label,
        count,
        percent,
        barPercent: Math.max(8, percent),
      };
    });
}

export function buildRadarChartPoints(
  metrics: RadarMetricInput[],
  size = 180,
  radius = 72,
): RadarChartPoint[] {
  if (!metrics.length) return [];

  const center = size / 2;
  const safeRadius = Math.max(12, Math.min(radius, center));
  const angleStep = (Math.PI * 2) / metrics.length;

  return metrics.map((metric, index) => {
    const maxValue = Math.max(1, metric.maxValue || 5);
    const clampedValue = clampMetricValue(metric.value, maxValue);
    const normalizedValue = clampedValue / maxValue;
    const angle = -Math.PI / 2 + angleStep * index;
    const pointRadius = safeRadius * normalizedValue;

    return {
      label: metric.label,
      value: clampedValue,
      normalizedValue: roundChartCoordinate(normalizedValue),
      x: roundChartCoordinate(center + Math.cos(angle) * pointRadius),
      y: roundChartCoordinate(center + Math.sin(angle) * pointRadius),
    };
  });
}

export function buildRadarChartPolygon(points: RadarChartPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
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

export function buildAnthropometricComparisonRows(
  metrics: AnthropometricComparisonInput[],
): AnthropometricComparisonRow[] {
  return metrics.map((metric) => {
    const digits = metric.digits ?? 1;
    const comparison = buildNumericComparison(metric.value, metric.baseline, digits);
    const baselineLabel = metric.baseline === null || !Number.isFinite(metric.baseline)
      ? `--${metric.unit ? ` ${metric.unit}` : ''} avg`
      : `${formatComparisonValue(metric.baseline, metric.unit, digits)} avg`;

    if (comparison.difference === null) {
      return {
        label: metric.label,
        valueLabel: formatComparisonValue(metric.value, metric.unit, digits),
        baselineLabel,
        context: comparison.label,
        tone: comparison.direction,
        difference: null,
        playerPercent: null,
        baselinePercent: null,
      };
    }

    const safeTolerance = Math.max(0.1, metric.tolerance);
    const playerPercent = roundPercent(clampPercent(50 + (comparison.difference / safeTolerance) * 42));

    return {
      label: metric.label,
      valueLabel: formatComparisonValue(metric.value, metric.unit, digits),
      baselineLabel,
      context: comparison.label,
      tone: comparison.direction,
      difference: comparison.difference,
      playerPercent,
      baselinePercent: 50,
    };
  });
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

export function buildTeamRosterAnalytics(players: RosterSnapshotPlayer[]) {
  const snapshot = buildClubRosterSnapshot(players);
  const totalPlayers = players.length;
  const completePlayers = players.filter((player) => player.hasCompleteAnthropometrics).length;
  const missingPlayers = Math.max(0, totalPlayers - completePlayers);
  const heightCount = players.filter((player) => typeof player.heightCm === 'number').length;
  const weightCount = players.filter((player) => typeof player.weightKg === 'number').length;
  const bmiCount = players.filter((player) => typeof player.bmi === 'number').length;

  const dataHealthLabel =
    totalPlayers === 0
      ? 'No roster data yet'
      : missingPlayers === 0
        ? 'All roster data complete'
        : `${missingPlayers} ${missingPlayers === 1 ? 'player needs' : 'players need'} data`;

  return {
    totalPlayers,
    completePlayers,
    missingPlayers,
    completeRate: snapshot.completeRate,
    dataHealthLabel,
    physicalRows: [
      {
        label: 'Average height',
        valueLabel: `${formatCompactNumber(snapshot.averageHeightCm)} cm`,
        detail: formatMeasuredDetail(heightCount),
      },
      {
        label: 'Average weight',
        valueLabel: `${formatCompactNumber(snapshot.averageWeightKg)} kg`,
        detail: formatMeasuredDetail(weightCount),
      },
      {
        label: 'Average BMI',
        valueLabel: formatCompactNumber(snapshot.averageBmi),
        detail: formatMeasuredDetail(bmiCount),
      },
    ],
    positionRows: buildDistributionRows(
      snapshot.positionMix.map((row) => [row.label, row.count]),
      totalPlayers,
    ),
    footRows: buildDistributionRows(
      [
        ['Right foot', snapshot.footCounts.right],
        ['Left foot', snapshot.footCounts.left],
        ['Both feet', snapshot.footCounts.both],
        ['Unknown foot', snapshot.footCounts.unknown],
      ],
      totalPlayers,
    ),
  };
}

export type TeamRosterAnalytics = ReturnType<typeof buildTeamRosterAnalytics>;

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

const GLOBAL_SCOUTING_STAGES: Array<{
  key: GlobalScoutingPipelineStageKey;
  label: string;
  description: string;
  tone: GlobalScoutingPipelineTone;
}> = [
  {
    key: 'fresh_intel',
    label: 'Fresh intel',
    description: 'New reports that still need context before leadership action.',
    tone: 'neutral',
  },
  {
    key: 'technical_review',
    label: 'Technical review',
    description: 'Profiles Wilson should validate before they move up.',
    tone: 'review',
  },
  {
    key: 'executive_shortlist',
    label: 'Executive shortlist',
    description: 'High-potential or watchlisted players for Adrian to track.',
    tone: 'shortlist',
  },
  {
    key: 'trial_ready',
    label: 'Trial ready',
    description: 'Green-light candidates ready for trial or direct follow-up.',
    tone: 'ready',
  },
];

const GLOBAL_SCOUTING_STAGE_PRIORITY: Record<GlobalScoutingPipelineStageKey, number> = {
  fresh_intel: 1,
  technical_review: 2,
  executive_shortlist: 3,
  trial_ready: 4,
};

function normalizeVerdict(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function hasAnySignal(value: string, signals: string[]) {
  return signals.some((signal) => value.includes(signal));
}

function classifyGlobalScoutingCandidate(entry: GlobalScoutingPipelineInput): {
  stageKey: GlobalScoutingPipelineStageKey;
  signalLabel: string;
} | null {
  if (entry.reportCount === 0 && !entry.isWatchlisted) return null;

  const verdict = normalizeVerdict(entry.latestVerdict);
  const potentialRank = getPotentialRank(entry.bestPotential);
  const score = Number.isFinite(entry.averageScore) ? entry.averageScore : 0;

  if (
    hasAnySignal(verdict, ['green', 'trial', 'recommend', 'ready']) ||
    (potentialRank >= 4 && score >= 3.8)
  ) {
    return {
      stageKey: 'trial_ready',
      signalLabel: hasAnySignal(verdict, ['green']) ? 'Green light' : 'Trial-ready',
    };
  }

  if (
    entry.isWatchlisted ||
    hasAnySignal(verdict, ['shortlist']) ||
    (potentialRank >= 3 && score >= 3.2)
  ) {
    return {
      stageKey: 'executive_shortlist',
      signalLabel: entry.isWatchlisted ? 'Watchlisted' : 'High potential',
    };
  }

  if (
    potentialRank >= 3 ||
    score >= 3 ||
    hasAnySignal(verdict, ['monitor', 'follow', 'review', 'validate'])
  ) {
    return {
      stageKey: 'technical_review',
      signalLabel: hasAnySignal(verdict, ['monitor', 'follow', 'review']) ? 'Review needed' : 'Technical signal',
    };
  }

  return {
    stageKey: 'fresh_intel',
    signalLabel: 'Fresh intel',
  };
}

function compareGlobalScoutingCandidates(
  left: GlobalScoutingPipelineCandidate,
  right: GlobalScoutingPipelineCandidate,
) {
  const stageDelta =
    GLOBAL_SCOUTING_STAGE_PRIORITY[right.stageKey] - GLOBAL_SCOUTING_STAGE_PRIORITY[left.stageKey];
  if (stageDelta !== 0) return stageDelta;

  if (right.averageScore !== left.averageScore) return right.averageScore - left.averageScore;

  const potentialDelta = getPotentialRank(right.bestPotential) - getPotentialRank(left.bestPotential);
  if (potentialDelta !== 0) return potentialDelta;

  if (Number(right.isWatchlisted) !== Number(left.isWatchlisted)) {
    return Number(right.isWatchlisted) - Number(left.isWatchlisted);
  }

  if (right.reportCount !== left.reportCount) return right.reportCount - left.reportCount;

  return left.name.localeCompare(right.name);
}

export function buildGlobalScoutingPipeline(entries: GlobalScoutingPipelineInput[]) {
  const candidates = entries
    .map((entry): GlobalScoutingPipelineCandidate | null => {
      const classification = classifyGlobalScoutingCandidate(entry);
      if (!classification) return null;

      return {
        playerKey: entry.playerKey,
        name: entry.name,
        clubLabel: entry.clubLabel,
        latestReportId: entry.latestReportId,
        latestFixture: entry.latestFixture,
        latestCompetition: entry.latestCompetition,
        averageScore: Number.isFinite(entry.averageScore) ? entry.averageScore : 0,
        bestPotential: entry.bestPotential || 'Unreviewed',
        latestVerdict: entry.latestVerdict || 'No verdict yet',
        isWatchlisted: Boolean(entry.isWatchlisted),
        reportCount: entry.reportCount,
        linkedClubPlayerId: entry.linkedClubPlayerId,
        stageKey: classification.stageKey,
        signalLabel: classification.signalLabel,
      };
    })
    .filter((candidate): candidate is GlobalScoutingPipelineCandidate => Boolean(candidate))
    .sort(compareGlobalScoutingCandidates);

  const totalCandidates = candidates.length;
  const byStage = new Map<GlobalScoutingPipelineStageKey, GlobalScoutingPipelineCandidate[]>();
  candidates.forEach((candidate) => {
    const stageCandidates = byStage.get(candidate.stageKey) || [];
    stageCandidates.push(candidate);
    byStage.set(candidate.stageKey, stageCandidates);
  });

  const stageRows = GLOBAL_SCOUTING_STAGES.map((stage) => {
    const stageCandidates = byStage.get(stage.key) || [];
    const percent = totalCandidates > 0 ? Math.round((stageCandidates.length / totalCandidates) * 100) : 0;

    return {
      key: stage.key,
      label: stage.label,
      description: stage.description,
      tone: stage.tone,
      count: stageCandidates.length,
      percent,
      barPercent: stageCandidates.length > 0 ? Math.max(8, percent) : 0,
      candidates: stageCandidates.slice(0, 3),
    };
  });

  const activeCandidates = candidates.filter((candidate) => candidate.stageKey !== 'fresh_intel').length;
  const executiveFollowUp = candidates.filter((candidate) =>
    ['executive_shortlist', 'trial_ready'].includes(candidate.stageKey),
  ).length;
  const executiveSignalLabel =
    totalCandidates === 0
      ? 'No scouting candidates yet'
      : `${executiveFollowUp} executive follow-up ${executiveFollowUp === 1 ? 'candidate' : 'candidates'}`;

  return {
    totalCandidates,
    activeCandidates,
    executiveSignalLabel,
    stageRows,
    priorityCandidates: candidates.slice(0, 3),
  };
}

export type GlobalScoutingPipelineSummary = ReturnType<typeof buildGlobalScoutingPipeline>;
