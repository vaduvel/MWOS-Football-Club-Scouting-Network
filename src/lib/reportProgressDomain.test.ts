import { describe, expect, it } from 'vitest';

import type { Report } from '../store/report';
import { buildReportProgress } from './reportProgressDomain';

function makeBaseReport(): Report {
  return {
    id: 'report-1',
    competition: '',
    date: '',
    venue: '',
    kickoff: '',
    weather: '',
    pitch: '',
    home_team: '',
    home_score: '',
    away_team: '',
    away_score: '',
    scout_name: '',
    focus: '',
    general_notes: '',
    home_manager: '',
    away_manager: '',
    formation_home: '4-3-3',
    formation_away: '4-3-3',
    players: [],
    reviews: [],
  };
}

describe('buildReportProgress', () => {
  it('starts with zero completed sections for an empty report', () => {
    const progress = buildReportProgress(makeBaseReport());

    expect(progress.completedCount).toBe(0);
    expect(progress.items.map((item) => item.status)).toEqual([
      'needs_attention',
      'needs_attention',
      'needs_attention',
      'needs_attention',
    ]);
  });

  it('marks match setup complete when core fixture fields exist', () => {
    const report = makeBaseReport();
    report.competition = 'Premier League';
    report.date = '2026-05-17';
    report.home_team = 'MWOS';
    report.away_team = 'Ngezi';

    const progress = buildReportProgress(report);

    expect(progress.items[0]).toEqual(
      expect.objectContaining({
        key: 'match_setup',
        status: 'complete',
      }),
    );
  });

  it('marks squad and shape complete when both teams have named players', () => {
    const report = makeBaseReport();
    report.players = [
      { id: 1, team_side: 'home', shirt_number: 7, name: 'Player One', subbed: '', goal: '', rating: '', position_x: 20, position_y: 20 },
      { id: 2, team_side: 'away', shirt_number: 9, name: 'Player Two', subbed: '', goal: '', rating: '', position_x: 80, position_y: 20 },
    ];

    const progress = buildReportProgress(report);

    expect(progress.items[1]?.status).toBe('complete');
    expect(progress.items[2]?.status).toBe('complete');
  });

  it('marks reviews complete when at least one review has meaningful scouting content', () => {
    const report = makeBaseReport();
    report.reviews = [
      {
        id: 1,
        player_id: 1,
        overview: 'Aggressive ball-carrying performance.',
        strengths: '',
        areas_to_improve: '',
        pace: 3,
        strength: 3,
        stamina: 3,
        agility: 3,
        decision_making: 3,
        composure: 3,
        work_rate: 3,
        positioning: 3,
        recommendation_verdict: '',
        potential_level: 'Academy',
      },
    ];

    const progress = buildReportProgress(report);

    expect(progress.items[3]).toEqual(
      expect.objectContaining({
        key: 'player_reviews',
        status: 'complete',
      }),
    );
  });
});
