import { describe, expect, it } from 'vitest';

import { buildClubRosterSnapshot, buildNumericComparison, buildTrendChartPath, buildTrendChartStops } from './playerHubDomain';

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
