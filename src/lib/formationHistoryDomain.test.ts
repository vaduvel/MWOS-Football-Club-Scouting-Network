import { beforeEach, describe, expect, it } from 'vitest';
import { useReportStore, type Player, type Report } from '../store/report';
import { buildFormationPresetUpdate, buildPlayerPlacementUpdate } from './formationHistoryDomain';

const players: Player[] = [
  { id: 'home-1', team_side: 'home', shirt_number: 1, name: 'QA Home', subbed: '', goal: '', rating: '', position_x: 50, position_y: 90 },
  { id: 'away-1', team_side: 'away', shirt_number: 1, name: 'QA Away GK', subbed: '', goal: '', rating: '', position_x: 50, position_y: 90 },
  { id: 'away-2', team_side: 'away', shirt_number: 2, name: 'QA Away Defender', subbed: '', goal: '', rating: '', position_x: 85, position_y: 75 },
];

const report: Report = {
  competition: '', date: '', venue: '', kickoff: '', weather: '', pitch: '',
  home_team: 'QA Home', home_score: '', away_team: 'QA Away', away_score: '',
  scout_name: '', focus: '', general_notes: '', home_manager: '', away_manager: '',
  formation_home: '4-3-3', formation_away: '4-3-3', players, reviews: [],
};

describe('formation actions as one undoable change', () => {
  beforeEach(() => useReportStore.getState().setCurrentReport(report));

  it('undoes and redoes the preset and all player placements together', () => {
    useReportStore.getState().mergeReportFields(buildFormationPresetUpdate(report, 'away', '4-4-2', [
      { x: 49, y: 91 }, { x: 80, y: 70 },
    ]));

    expect(useReportStore.getState().history).toHaveLength(1);
    expect(useReportStore.getState().currentReport?.formation_away).toBe('4-4-2');
    expect(useReportStore.getState().currentReport?.players.map((player) => player.position_x)).toEqual([50, 49, 80]);

    useReportStore.getState().undo();
    expect(useReportStore.getState().currentReport?.formation_away).toBe('4-3-3');
    expect(useReportStore.getState().currentReport?.players.map((player) => player.position_x)).toEqual([50, 50, 85]);

    useReportStore.getState().redo();
    expect(useReportStore.getState().currentReport?.formation_away).toBe('4-4-2');
    expect(useReportStore.getState().currentReport?.players.map((player) => player.position_x)).toEqual([50, 49, 80]);
  });

  it('undoes a two-player slot swap in one step', () => {
    useReportStore.getState().mergeReportFields(buildPlayerPlacementUpdate(report, 'away-1', { x: 85, y: 75 }, 'away-2'));
    expect(useReportStore.getState().history).toHaveLength(1);
    expect(useReportStore.getState().currentReport?.players.map((player) => player.position_x)).toEqual([50, 85, 50]);

    useReportStore.getState().undo();
    expect(useReportStore.getState().currentReport?.players.map((player) => player.position_x)).toEqual([50, 50, 85]);
  });
});
