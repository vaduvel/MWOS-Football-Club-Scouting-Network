import type { Report } from '../store/report';
import { createId } from './ids';
import { createEmptyTipsEvaluation } from './tipsEvaluationDomain';

export function createIndividualReport(scoutName: string): Report {
  const playerId = createId();
  return {
    id: createId(), report_type: 'individual', competition: '', date: new Date().toISOString().slice(0,10),
    venue: '', kickoff: '', weather: '', pitch: '', home_team: '', away_team: '', home_score: '', away_score: '',
    scout_name: scoutName, focus: '', general_notes: '', home_manager: '', away_manager: '', formation_home: '', formation_away: '',
    tips_evaluation: createEmptyTipsEvaluation(),
    players: [{id: playerId, name: '', club_player_id: null, team_side: 'home', shirt_number: '', subbed: '', goal: '', rating: '', position_x: 50, position_y: 50}],
    reviews: [{id: createId(), player_id: playerId, overview: '', strengths: '', areas_to_improve: '', pace: 3, strength: 3, stamina: 3, agility: 3, decision_making: 3, composure: 3, work_rate: 3, positioning: 3, recommendation_verdict: '', potential_level: 'Academy'}],
  };
}

export function validateIndividualReport(report: Report): string | null {
  if (report.report_type !== 'individual' || report.players.length !== 1 || report.reviews.length !== 1) return 'An individual report needs one player and one evaluation.';
  if (!report.players[0].name.trim()) return 'Enter the player name before saving.';
  if (String(report.reviews[0].player_id) !== String(report.players[0].id)) return 'The evaluation must belong to this player.';
  if (report.players[0].club_player_id) return 'Individual scouting reports must use an external player.';
  return null;
}

export function recoverIndividualDraft(raw: string | null, current: Report, isNew: boolean): Report | null {
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as Report;
    if (draft.report_type !== 'individual' || (!isNew && draft.id !== current.id)) return null;
    if (!Array.isArray(draft.players) || draft.players.length !== 1 || !Array.isArray(draft.reviews) || draft.reviews.length !== 1) return null;
    if (typeof draft.players[0]?.name !== 'string' || draft.players[0].club_player_id) return null;
    if (String(draft.players[0].id) !== String(draft.reviews[0]?.player_id)) return null;
    for (const key of ['home_team', 'date', 'venue', 'scout_name'] as const) if (typeof draft[key] !== 'string') return null;
    for (const key of ['overview', 'strengths', 'areas_to_improve', 'recommendation_verdict', 'potential_level'] as const) if (typeof draft.reviews[0][key] !== 'string') return null;
    return draft;
  } catch { return null; }
}
