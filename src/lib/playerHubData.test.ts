import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPlayerHubData } from './data';

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
  from.mockImplementation((table: string) => {
    // Exercise the real fetch/aggregation boundary using the rows returned by
    // each query, while keeping this regression independent of production data.
    const query = Promise.resolve({ data: tables[table] || [], error: null });
    return Object.assign(query, {
      select: () => query,
      eq: () => query,
      order: () => query,
    });
  });
}

beforeEach(() => from.mockReset());

describe('Player Hub score aggregation', () => {
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
});
