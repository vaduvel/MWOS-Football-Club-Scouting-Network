export const TIPS_SECTIONS = [
  { key: 'technique', title: 'Technique', attributes: [
    ['first_touch', 'First touch'], ['passing', 'Passing'], ['receiving', 'Receiving'],
    ['dribbling', 'Dribbling'], ['ball_protection', 'Ball protection'],
    ['weak_foot', 'Weak foot'], ['heading', 'Heading'], ['finishing', 'Finishing / striking'],
  ] },
  { key: 'intelligence', title: 'Intelligence', attributes: [
    ['scanning', 'Scanning'], ['play_forward', 'Play forward'], ['problem_solving', 'Problem solving'],
    ['movement_before_receiving', 'Movement before receiving'], ['recognise_space', 'Recognise space'],
    ['adaptability', 'Adaptability'], ['off_ball_movement', 'Off-ball movement'], ['vision', 'Vision'],
  ] },
  { key: 'personality', title: 'Personality', attributes: [
    ['leadership', 'Leadership'], ['competitiveness', 'Competitiveness'], ['bravery', 'Bravery'],
    ['coachability', 'Coachability'], ['communication', 'Communication'],
    ['reaction_after_mistakes', 'Reaction after mistakes'], ['body_language_work_ethic', 'Body language & work ethic'],
  ] },
  { key: 'speed', title: 'Speed', attributes: [
    ['acceleration_pace', 'Acceleration / pace'], ['agility', 'Agility'],
    ['reaction_speed', 'Reaction speed'], ['decision_speed', 'Decision speed'],
    ['playing_speed', 'Playing speed'], ['thinking_speed', 'Thinking speed'],
    ['stamina_work_rate', 'Stamina & work rate'],
  ] },
] as const;

export type TipsAttributeKey = typeof TIPS_SECTIONS[number]['attributes'][number][0];
export type TipsAssessment = '' | 'not_for_mwos' | 'keep_monitoring' | 'recommended';
export interface TipsAttributeValue { score: number | ''; notes: string }
export interface TipsEvaluation {
  version: 1;
  positions: string;
  preferredFoot: string;
  nationality: string;
  matchObserved: string;
  competitionLevel: string;
  otherNotes: string;
  physicality: string;
  overallAssessment: TipsAssessment;
  attributes: Record<TipsAttributeKey, TipsAttributeValue>;
}

export const TIPS_ASSESSMENTS: ReadonlyArray<{ value: Exclude<TipsAssessment, ''>; label: string }> = [
  { value: 'not_for_mwos', label: 'Not for MWOS FC' },
  { value: 'keep_monitoring', label: 'Keep monitoring' },
  { value: 'recommended', label: 'Recommended for trials & registration' },
];

export function createEmptyTipsEvaluation(): TipsEvaluation {
  const attributes = Object.fromEntries(
    TIPS_SECTIONS.flatMap(section => section.attributes.map(attribute => [attribute[0], { score: '' as const, notes: '' }])),
  ) as TipsEvaluation['attributes'];
  return {
    version: 1, positions: '', preferredFoot: '', nationality: '', matchObserved: '',
    competitionLevel: '', otherNotes: '', physicality: '', overallAssessment: '', attributes,
  };
}

export function normalizeTipsEvaluation(value: unknown): TipsEvaluation | null {
  if (!value || typeof value !== 'object' || (value as { version?: unknown }).version !== 1) return null;
  const source = value as Partial<TipsEvaluation>;
  const normalized = createEmptyTipsEvaluation();
  for (const key of ['positions', 'preferredFoot', 'nationality', 'matchObserved', 'competitionLevel', 'otherNotes', 'physicality'] as const) {
    normalized[key] = typeof source[key] === 'string' ? source[key].slice(0, 3000) : '';
  }
  if (TIPS_ASSESSMENTS.some(option => option.value === source.overallAssessment)) normalized.overallAssessment = source.overallAssessment!;
  for (const section of TIPS_SECTIONS) for (const [key] of section.attributes) {
    const entry = source.attributes?.[key];
    normalized.attributes[key] = {
      score: Number.isInteger(entry?.score) && Number(entry?.score) >= 1 && Number(entry?.score) <= 10 ? Number(entry?.score) : '',
      notes: typeof entry?.notes === 'string' ? entry.notes.slice(0, 3000) : '',
    };
  }
  return normalized;
}

export function hasTipsContent(tips: TipsEvaluation | null | undefined) {
  if (!tips) return false;
  if (tips.overallAssessment || tips.positions || tips.preferredFoot || tips.nationality || tips.matchObserved || tips.competitionLevel || tips.otherNotes || tips.physicality) return true;
  return TIPS_SECTIONS.some(section => section.attributes.some(attribute => tips.attributes[attribute[0]].score !== '' || tips.attributes[attribute[0]].notes.trim()));
}
