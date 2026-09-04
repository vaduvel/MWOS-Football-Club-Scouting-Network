import { describe, expect, it } from 'vitest';
import {
  buildScoutingWorkspaceActions,
  buildScoutingWorkspaceHero,
  buildScoutingWorkspaceMetrics,
} from './scoutingWorkspaceDomain';

describe('scoutingWorkspaceDomain', () => {
  it('returns leadership hero copy for admin-style users', () => {
    const hero = buildScoutingWorkspaceHero(true);

    expect(hero.title).toBe('Scouting Oversight');
    expect(hero.searchPlaceholder).toContain('creators');
  });

  it('returns executive director copy for global talent review', () => {
    const hero = buildScoutingWorkspaceHero('executive_director');

    expect(hero.eyebrow).toBe('Global Scouting Pipeline');
    expect(hero.title).toBe('Talent Intelligence');
    expect(hero.searchPlaceholder).toContain('players');
  });

  it('returns operator hero copy for scouts', () => {
    const hero = buildScoutingWorkspaceHero(false);

    expect(hero.title).toBe('Scouting Reports');
    expect(hero.searchPlaceholder).toContain('notes');
  });

  it('builds leadership metrics with tracked players and competitions', () => {
    const metrics = buildScoutingWorkspaceMetrics({
      isLeadership: true,
      totalReports: 18,
      reportsThisWeek: 4,
      filteredReports: 12,
      trackedPlayers: 27,
      shortlistCount: 8,
      competitionsTracked: 6,
    });

    expect(metrics).toHaveLength(4);
    expect(metrics[2]).toMatchObject({ label: 'Tracked Players', value: 27 });
    expect(metrics[3]).toMatchObject({ label: 'Competitions', value: 6 });
  });

  it('builds role-aware quick actions', () => {
    const leadershipActions = buildScoutingWorkspaceActions({
      isLeadership: true,
      hasTrackedPlayers: true,
      canCreateReports: true,
    });
    const reviewActions = buildScoutingWorkspaceActions({
      isLeadership: true,
      hasTrackedPlayers: true,
      canCreateReports: false,
    });
    const scoutActions = buildScoutingWorkspaceActions({
      isLeadership: false,
      hasTrackedPlayers: false,
      canCreateReports: true,
    });

    expect(leadershipActions.map((action) => action.label)).toEqual(['New Report', 'Player Hub', 'Oversight']);
    expect(reviewActions.map((action) => action.label)).toEqual(['Player Hub', 'Oversight']);
    expect(scoutActions.map((action) => action.label)).toEqual(['New Report', 'Player Hub', 'Club Home']);
  });
});
