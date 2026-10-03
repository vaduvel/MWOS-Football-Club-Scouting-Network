import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPlayerHubData, getReportCompetitionLabel } from './data';
import { createEmptyTipsEvaluation, TIPS_SECTIONS } from './tipsEvaluationDomain';

const { from } = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('./supabase', () => ({ supabase: { from }, assertSupabaseConfigured: vi.fn() }));
vi.mock('./authData', async (importOriginal) => ({
  ...await importOriginal<typeof import('./authData')>(),
  getCurrentAppUser: async () => ({ id: 'scout-1', roles: ['scout'] }),
}));

function report(id: string, date: string, reportType: 'match' | 'individual' = 'match') {
  return {
    id,
    report_type: reportType,
    date,
    created_at: `${date}T12:00:00Z`,
    home_team: 'External Club',
    away_team: reportType === 'match' ? 'Opponent' : null,
  };
}

function player(id: string, reportId: string, rating: number | null, name = 'Reviewed Player') {
  return { id, report_id: reportId, name, rating, team_side: 'home', club_player_id: null };
}

function review(playerId: string, reportId: string, score: number | null) {
  return {
    id: `review-${playerId}`,
    player_id: playerId,
    report_id: reportId,
    pace: score,
    strength: score,
    stamina: score,
    agility: score,
    decision_making: score,
    composure: score,
    work_rate: score,
    positioning: score,
  };
}

function seed(tables: Record<string, unknown[]>) {
  const selections = new Map<string, string>();
  from.mockImplementation((table: string) => {
    // Exercise the real fetch/aggregation boundary using the rows returned by
    // each query, while keeping this regression independent of production data.
    const query = Promise.resolve({ data: tables[table] || [], error: null });
    return Object.assign(query, {
      select: (columns: string) => { selections.set(table, columns); return query; },
      eq: () => query,
      order: () => query,
    });
  });
  return selections;
}

beforeEach(() => from.mockReset());

describe('Player Hub score aggregation', () => {
  it('uses the TIPS division for individual reports without changing match competition labels', () => {
    const tips = createEmptyTipsEvaluation();
    tips.competitionLevel = 'Div 1';
    expect(getReportCompetitionLabel({ report_type: 'individual', competition: null, tips_evaluation: tips })).toBe('Div 1');
    expect(getReportCompetitionLabel({ report_type: 'individual', competition: null, tips_evaluation: createEmptyTipsEvaluation() })).toBe('Competition not provided');
    expect(getReportCompetitionLabel({ report_type: 'match', competition: 'Cup' })).toBe('Cup');
    expect(getReportCompetitionLabel({ report_type: 'match', competition: null })).toBe('Friendly');
  });
  it.each([1, 7, 10])('keeps the eight-attribute score on /5 when match rating is %s/10', async (rating) => {
    seed({
      reports: [report('match-1', '2026-09-20')],
      players: [player('player-1', 'match-1', rating)],
      player_reviews: [{ ...review('player-1', 'match-1', 3), pace: 5 }],
    });

    const overview = await fetchPlayerHubData();

    expect(overview.entries).toHaveLength(1);
    expect(overview.entries[0]).toMatchObject({
      averageScore: 3.3,
      latestScore: 3.3,
      averageRating: rating,
      metrics: { pace: 5, strength: 3, positioning: 3 },
      trendPoints: [{ reportId: 'match-1', score: 3.3 }],
    });
  });

  it('aggregates individual and match reviews together without mixing their rating scales', async () => {
    seed({
      reports: [report('match-1', '2026-09-20'), report('individual-1', '2026-09-19', 'individual')],
      players: [player('match-player', 'match-1', 10), player('individual-player', 'individual-1', null)],
      player_reviews: [review('match-player', 'match-1', 5), review('individual-player', 'individual-1', 3)],
    });

    const overview = await fetchPlayerHubData();

    expect(overview.entries).toHaveLength(1);
    expect(overview.entries[0]).toMatchObject({
      reportCount: 2,
      averageScore: 4,
      latestScore: 5,
      averageRating: 10,
      trend: 'up',
      trendDelta: 2,
      trendPoints: [
        { reportId: 'individual-1', score: 3 },
        { reportId: 'match-1', score: 5 },
      ],
    });
  });

  it('ranks players and selects reported-well candidates by review evidence, not match rating', async () => {
    seed({
      reports: [report('match-1', '2026-09-20'), report('individual-1', '2026-09-19', 'individual')],
      players: [
        player('match-player', 'match-1', 10, 'High match rating'),
        player('individual-player', 'individual-1', null, 'Stronger review'),
      ],
      player_reviews: [review('match-player', 'match-1', 2), review('individual-player', 'individual-1', 4)],
    });

    const overview = await fetchPlayerHubData();

    expect(overview.entries.map(({ name, averageScore }) => ({ name, averageScore }))).toEqual([
      { name: 'Stronger review', averageScore: 4 },
      { name: 'High match rating', averageScore: 2 },
    ]);
    expect(overview.topReported.map(({ name }) => name)).toEqual(['Stronger review']);
  });

  it('does not turn a match rating into a scouting score when a narrative-only review has no scores', async () => {
    seed({
      reports: [report('match-1', '2026-09-20')],
      players: [player('player-1', 'match-1', 8)],
      player_reviews: [{ ...review('player-1', 'match-1', null), overview: 'First observation only.' }],
    });

    const overview = await fetchPlayerHubData();

    expect(overview.entries[0]).toMatchObject({
      averageScore: 0,
      latestScore: 0,
      averageRating: 8,
      trendPoints: [],
    });
    expect(overview.topReported).toEqual([]);
  });

  it('scores a TIPS-only player from /10 evidence without using untouched 1-5 placeholders', async () => {
    const tips = createEmptyTipsEvaluation();
    tips.attributes.first_touch.score = 8;
    tips.overallAssessment = 'keep_monitoring';
    const selections = seed({
      reports: [{ ...report('individual-tips', '2026-09-21', 'individual'), tips_evaluation: tips }],
      players: [player('tips-player', 'individual-tips', null)],
      player_reviews: [review('tips-player', 'individual-tips', 3)],
    });

    const overview = await fetchPlayerHubData();

    expect(selections.get('reports')).toContain('tips_evaluation');

    expect(overview.entries).toHaveLength(1);
    expect(overview.entries[0]).toMatchObject({
      reportCount: 1,
      averageScore: 4,
      latestScore: 4,
      latestVerdict: 'Keep monitoring',
      bestPotential: 'Not assessed',
      latestScoringMethod: 'tips',
      metrics: { pace: 0, strength: 0 },
      tipsMetrics: { technique: 4, intelligence: 0, personality: 0, speed: 0 },
      trendPoints: [{ reportId: 'individual-tips', score: 4 }],
    });
  });

  it('separates a strongly rated TIPS player from a weakly rated one and shows the entered division', async () => {
    const high = createEmptyTipsEvaluation();
    const low = createEmptyTipsEvaluation();
    for (const section of TIPS_SECTIONS) for (const [key] of section.attributes) {
      high.attributes[key].score = 9;
      low.attributes[key].score = 3;
    }
    low.competitionLevel = 'Div 1';
    seed({
      reports: [
        { ...report('high', '2026-10-02', 'individual'), tips_evaluation: high, competition: null },
        { ...report('low', '2026-10-02', 'individual'), tips_evaluation: low, competition: null },
      ],
      players: [player('high-player', 'high', null, 'High player'), player('low-player', 'low', null, 'Low player')],
      player_reviews: [review('high-player', 'high', 3), review('low-player', 'low', 3)],
    });

    const overview = await fetchPlayerHubData();
    const highEntry = overview.entries.find(entry => entry.name === 'High player');
    const lowEntry = overview.entries.find(entry => entry.name === 'Low player');
    expect(highEntry).toMatchObject({ averageScore: 4.5, latestScore: 4.5, latestCompetition: 'Competition not provided', tipsMetrics: { technique: 4.5, intelligence: 4.5, personality: 4.5, speed: 4.5 } });
    expect(lowEntry).toMatchObject({ averageScore: 1.5, latestScore: 1.5, latestCompetition: 'Div 1', tipsMetrics: { technique: 1.5, intelligence: 1.5, personality: 1.5, speed: 1.5 } });
    expect(overview.recentReports.find(item => item.id === 'low')?.competition).toBe('Div 1');
  });

  it('does not list an empty new TIPS draft as scouting evidence', async () => {
    seed({
      reports: [{ ...report('individual-empty', '2026-09-21', 'individual'), tips_evaluation: createEmptyTipsEvaluation() }],
      players: [player('empty-player', 'individual-empty', null)],
      player_reviews: [review('empty-player', 'individual-empty', 3)],
    });

    expect((await fetchPlayerHubData()).entries).toHaveLength(0);
  });
});
