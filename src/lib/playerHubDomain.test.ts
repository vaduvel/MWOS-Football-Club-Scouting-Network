import { describe, expect, it } from 'vitest';

import {
  buildClubRosterSnapshot,
  buildAnthropometricComparisonRows,
  buildNumericComparison,
  buildPlayerDevelopmentSummary,
  buildRadarChartPoints,
  buildRadarChartPolygon,
  buildRosterOnlyPlayerHubEntry,
  buildTeamRosterAnalytics,
  buildTrendChartPath,
  buildTrendChartStops,
} from './playerHubDomain';

describe('buildTrendChartPath', () => {
  it('returns empty path when there are no valid scores', () => {
    expect(buildTrendChartPath([{ score: 0 }, { score: -1 }])).toBe('');
  });

  it('builds an svg path across valid trend points', () => {
    expect(buildTrendChartPath([{ score: 2.5 }, { score: 3.5 }, { score: 4.5 }], 100, 50)).toBe(
      'M0.00,50.00 L50.00,25.00 L100.00,0.00',
    );
  });
});

describe('buildTrendChartStops', () => {
  it('returns chart coordinates in order', () => {
    expect(buildTrendChartStops([{ score: 2.5 }, { score: 4.5 }], 100, 50)).toEqual([
      { x: 0, y: 50, score: 2.5 },
      { x: 100, y: 0, score: 4.5 },
    ]);
  });
});

describe('buildRadarChartPoints', () => {
  it('maps metric values to clockwise radar coordinates', () => {
    const points = buildRadarChartPoints(
      [
        { label: 'Pace', value: 5 },
        { label: 'Strength', value: 2.5 },
        { label: 'Stamina', value: 0 },
        { label: 'Decision', value: 5 },
      ],
      100,
      40,
    );

    expect(points).toEqual([
      { label: 'Pace', value: 5, normalizedValue: 1, x: 50, y: 10 },
      { label: 'Strength', value: 2.5, normalizedValue: 0.5, x: 70, y: 50 },
      { label: 'Stamina', value: 0, normalizedValue: 0, x: 50, y: 50 },
      { label: 'Decision', value: 5, normalizedValue: 1, x: 10, y: 50 },
    ]);
  });

  it('clamps invalid metric values and builds a polygon string', () => {
    const points = buildRadarChartPoints(
      [
        { label: 'Pace', value: 8 },
        { label: 'Strength', value: -2 },
        { label: 'Stamina', value: Number.NaN },
        { label: 'Decision', value: 3 },
      ],
      100,
      40,
    );

    expect(points.map((point) => point.normalizedValue)).toEqual([1, 0, 0, 0.6]);
    expect(buildRadarChartPolygon(points)).toBe('50,10 50,50 50,50 26,50');
  });
});

describe('buildClubRosterSnapshot', () => {
  it('summarizes averages, completion and positions', () => {
    expect(
      buildClubRosterSnapshot([
        {
          primaryPosition: 'CM',
          heightCm: 178,
          weightKg: 72,
          bmi: 22.7,
          hasCompleteAnthropometrics: true,
          dominantFoot: 'right',
        },
        {
          primaryPosition: 'CM',
          heightCm: 182,
          weightKg: 76,
          bmi: 22.9,
          hasCompleteAnthropometrics: true,
          dominantFoot: 'left',
        },
        {
          primaryPosition: 'CB',
          heightCm: null,
          weightKg: null,
          bmi: null,
          hasCompleteAnthropometrics: false,
          dominantFoot: 'both',
        },
      ]),
    ).toEqual({
      averageHeightCm: 180,
      averageWeightKg: 74,
      averageBmi: 22.8,
      completeRate: 67,
      footCounts: {
        left: 1,
        right: 1,
        both: 1,
        unknown: 0,
      },
      positionMix: [
        { label: 'CM', count: 2 },
        { label: 'CB', count: 1 },
      ],
    });
  });
});

describe('buildTeamRosterAnalytics', () => {
  it('builds mobile-ready team roster analytics', () => {
    expect(
      buildTeamRosterAnalytics([
        {
          primaryPosition: 'CM',
          heightCm: 178,
          weightKg: 72,
          bmi: 22.7,
          hasCompleteAnthropometrics: true,
          dominantFoot: 'right',
        },
        {
          primaryPosition: 'CM',
          heightCm: 182,
          weightKg: 76,
          bmi: 22.9,
          hasCompleteAnthropometrics: true,
          dominantFoot: 'left',
        },
        {
          primaryPosition: 'CB',
          heightCm: null,
          weightKg: null,
          bmi: null,
          hasCompleteAnthropometrics: false,
          dominantFoot: 'both',
        },
        {
          primaryPosition: 'LW',
          heightCm: 170,
          weightKg: null,
          bmi: null,
          hasCompleteAnthropometrics: false,
          dominantFoot: 'unknown',
        },
      ]),
    ).toEqual({
      totalPlayers: 4,
      completePlayers: 2,
      missingPlayers: 2,
      completeRate: 50,
      dataHealthLabel: '2 players need data',
      physicalRows: [
        { label: 'Average height', valueLabel: '176.7 cm', detail: '3 players measured' },
        { label: 'Average weight', valueLabel: '74 kg', detail: '2 players measured' },
        { label: 'Average BMI', valueLabel: '22.8', detail: '2 players measured' },
      ],
      positionRows: [
        { label: 'CM', count: 2, percent: 50, barPercent: 50 },
        { label: 'CB', count: 1, percent: 25, barPercent: 25 },
        { label: 'LW', count: 1, percent: 25, barPercent: 25 },
      ],
      footRows: [
        { label: 'Right foot', count: 1, percent: 25, barPercent: 25 },
        { label: 'Left foot', count: 1, percent: 25, barPercent: 25 },
        { label: 'Both feet', count: 1, percent: 25, barPercent: 25 },
        { label: 'Unknown foot', count: 1, percent: 25, barPercent: 25 },
      ],
    });
  });

  it('keeps empty roster analytics renderable', () => {
    expect(buildTeamRosterAnalytics([])).toEqual({
      totalPlayers: 0,
      completePlayers: 0,
      missingPlayers: 0,
      completeRate: 0,
      dataHealthLabel: 'No roster data yet',
      physicalRows: [
        { label: 'Average height', valueLabel: '-- cm', detail: 'No players measured' },
        { label: 'Average weight', valueLabel: '-- kg', detail: 'No players measured' },
        { label: 'Average BMI', valueLabel: '--', detail: 'No players measured' },
      ],
      positionRows: [],
      footRows: [],
    });
  });
});

describe('buildNumericComparison', () => {
  it('describes values above and below the team average', () => {
    expect(buildNumericComparison(184, 180, 0)).toEqual({
      difference: 4,
      direction: 'above',
      label: '4 above team average',
    });

    expect(buildNumericComparison(73, 74, 0)).toEqual({
      difference: -1,
      direction: 'below',
      label: '1 below team average',
    });
  });

  it('returns level when values are effectively equal', () => {
    expect(buildNumericComparison(22.84, 22.8, 1)).toEqual({
      difference: 0,
      direction: 'level',
      label: 'Right on team average',
    });
  });
});

describe('buildAnthropometricComparisonRows', () => {
  it('builds centered comparison markers against team averages', () => {
    expect(
      buildAnthropometricComparisonRows([
        { label: 'Height', value: 184, baseline: 180, unit: 'cm', digits: 0, tolerance: 12 },
        { label: 'Weight', value: 72, baseline: 74, unit: 'kg', digits: 0, tolerance: 10 },
        { label: 'BMI', value: 22.84, baseline: 22.8, unit: '', digits: 1, tolerance: 3 },
      ]),
    ).toEqual([
      {
        label: 'Height',
        valueLabel: '184 cm',
        baselineLabel: '180 cm avg',
        context: '4 above team average',
        tone: 'above',
        difference: 4,
        playerPercent: 64,
        baselinePercent: 50,
      },
      {
        label: 'Weight',
        valueLabel: '72 kg',
        baselineLabel: '74 kg avg',
        context: '2 below team average',
        tone: 'below',
        difference: -2,
        playerPercent: 41.6,
        baselinePercent: 50,
      },
      {
        label: 'BMI',
        valueLabel: '22.8',
        baselineLabel: '22.8 avg',
        context: 'Right on team average',
        tone: 'level',
        difference: 0,
        playerPercent: 50,
        baselinePercent: 50,
      },
    ]);
  });

  it('keeps unavailable metrics renderable without fake chart positions', () => {
    expect(
      buildAnthropometricComparisonRows([
        { label: 'Height', value: null, baseline: 180, unit: 'cm', digits: 0, tolerance: 12 },
      ]),
    ).toEqual([
      {
        label: 'Height',
        valueLabel: '-- cm',
        baselineLabel: '180 cm avg',
        context: 'No comparison yet',
        tone: 'unavailable',
        difference: null,
        playerPercent: null,
        baselinePercent: null,
      },
    ]);
  });
});

describe('buildRosterOnlyPlayerHubEntry', () => {
  it('creates a stable internal profile before scouting reports exist', () => {
    expect(
      buildRosterOnlyPlayerHubEntry({
        id: 'player-1',
        displayName: 'Tawanda Moyo',
        teamName: 'U17',
        squadNumber: 8,
        primaryPosition: 'CM',
        isWatchlisted: true,
        watchlistId: 'watch-1',
      }),
    ).toMatchObject({
      playerKey: 'club:player-1',
      linkedClubPlayerId: 'player-1',
      name: 'Tawanda Moyo',
      clubLabel: 'U17',
      latestReportId: '',
      latestPlayerId: '',
      reportCount: 0,
      mentionCount: 0,
      averageScore: 0,
      bestPotential: 'Unreviewed',
      latestVerdict: 'Awaiting first scouting report',
      strengths: 'Create the first scouting report to identify strengths.',
      improvementAreas: 'No improvement focus logged yet.',
      isWatchlisted: true,
      watchlistId: 'watch-1',
    });
  });
});

describe('buildPlayerDevelopmentSummary', () => {
  it('separates linked scouting, roster gaps and external scouting entries', () => {
    expect(
      buildPlayerDevelopmentSummary([
        {
          linkedClubPlayerId: 'club-1',
          reportCount: 2,
          bestPotential: 'Elite',
          latestVerdict: 'Green light for trial',
        },
        {
          linkedClubPlayerId: 'club-2',
          reportCount: 0,
          bestPotential: 'Unreviewed',
          latestVerdict: 'Awaiting first scouting report',
        },
        {
          linkedClubPlayerId: null,
          reportCount: 1,
          bestPotential: 'Pro',
          latestVerdict: 'Monitor externally',
        },
      ]),
    ).toEqual({
      internalRosterProfiles: 2,
      linkedScoutingProfiles: 1,
      rosterWithoutScouting: 1,
      externalScoutingProfiles: 1,
      executiveShortlist: 2,
      scoutingCoverageRate: 50,
    });
  });
});
