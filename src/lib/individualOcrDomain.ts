export const INDIVIDUAL_OCR_FIELDS = [
  ['player_name', 'Player name'], ['club', 'Player club'], ['position', 'Position'],
  ['date', 'Observation date'], ['venue', 'Observation location'],
  ['overview', 'Overview / observation notes'], ['strengths', 'Strengths'],
  ['areas_to_improve', 'Areas to improve'], ['verdict', 'Short verdict'],
  ['potential', 'Potential level'],
  ['pace', 'Pace (1-5)'], ['strength', 'Strength (1-5)'],
  ['stamina', 'Stamina (1-5)'], ['agility', 'Agility (1-5)'],
  ['decision_making', 'Decision making (1-5)'], ['composure', 'Composure (1-5)'],
  ['work_rate', 'Work rate (1-5)'], ['positioning', 'Positioning (1-5)'],
] as const;

export type IndividualOcrFieldKey = typeof INDIVIDUAL_OCR_FIELDS[number][0];
export type IndividualOcrFields = Partial<Record<IndividualOcrFieldKey, string>>;
export const INDIVIDUAL_OCR_SCORE_KEYS: ReadonlyArray<IndividualOcrFieldKey> = [
  'pace', 'strength', 'stamina', 'agility', 'decision_making', 'composure', 'work_rate', 'positioning',
];

const LABELS: Record<IndividualOcrFieldKey, ReadonlyArray<string>> = {
  player_name: ['player', 'player name', 'full name', 'name of player'],
  club: ['club', 'current club', 'players club', 'player club', 'team'],
  position: ['position', 'positions', 'playing position'],
  date: ['date', 'observation date', 'date observed', 'date of report', 'report date'],
  venue: ['venue', 'location', 'observation location', 'match venue'],
  overview: ['observation notes', 'player notes', 'overview', 'general notes'],
  strengths: ['strengths', 'key strengths', 'strong points'],
  areas_to_improve: ['areas to improve', 'areas for improvement', 'improvements', 'weaknesses'],
  verdict: ['short verdict', 'verdict', 'recommendation'],
  potential: ['potential', 'potential level'],
  pace: ['pace'], strength: ['strength', 'physical strength'], stamina: ['stamina'],
  agility: ['agility'], decision_making: ['decision making'], composure: ['composure'],
  work_rate: ['work rate'], positioning: ['positioning'],
};

function normalizeLabel(value: string) {
  return value.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function findValue(lines: string[], aliases: ReadonlyArray<string>) {
  const normalizedAliases = aliases.map(normalizeLabel);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const separator = line.search(/[:：]/);
    if (separator >= 0) {
      const label = normalizeLabel(line.slice(0, separator));
      if (normalizedAliases.includes(label)) return line.slice(separator + 1).trim() || lines[index + 1]?.trim() || '';
    }
    const normalized = normalizeLabel(line);
    if (normalizedAliases.includes(normalized)) return lines[index + 1]?.trim() || '';
    for (const alias of aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      const match = line.match(new RegExp(`^${escaped}\\s+(.+)$`, 'i'));
      if (match) return match[1].trim();
    }
  }
  return '';
}

function toIsoDate(value: string) {
  const iso = value.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const numeric = value.match(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/);
  if (numeric) return validDate(Number(numeric[3]), Number(numeric[2]), Number(numeric[1]));
  const english = value.match(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i);
  if (english) {
    const month = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(english[2].toLowerCase()) + 1;
    return validDate(Number(english[3]), month, Number(english[1]));
  }
  return '';
}

function validDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
}

function parseScore(value: string) {
  const match = value.match(/\b(\d{1,2})(?:\s*(?:\/|out of)\s*(\d{1,2}))?\b/i);
  if (!match) return '';
  const score = Number(match[1]);
  const denominator = match[2] ? Number(match[2]) : 5;
  return denominator === 5 && score >= 1 && score <= 5 ? String(score) : '';
}

export function parseIndividualOcrText(text: string) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const fields: IndividualOcrFields = {};
  const warnings: string[] = [];
  for (const [key] of INDIVIDUAL_OCR_FIELDS) {
    const raw = findValue(lines, LABELS[key]);
    if (!raw) continue;
    if (key === 'date') {
      const date = toIsoDate(raw);
      if (date) fields.date = date;
      else warnings.push(`Could not interpret date: ${raw}`);
    } else if (key === 'potential') {
      const normalized = raw.toLowerCase().replace(/[^a-z]/g, '');
      const level = ['Academy', 'Semi-pro', 'Pro', 'Elite'].find(value => value.toLowerCase().replace(/[^a-z]/g, '') === normalized);
      if (level) fields.potential = level;
      else warnings.push(`Potential level needs review: ${raw}`);
    } else if (INDIVIDUAL_OCR_SCORE_KEYS.includes(key)) {
      const score = parseScore(raw);
      if (score) fields[key] = score;
      else warnings.push(`${INDIVIDUAL_OCR_FIELDS.find(([candidate]) => candidate === key)?.[1]} was not mapped: ${raw}`);
    } else fields[key] = raw.slice(0, 3000);
  }
  if (/\bTIPS\s+Methodology\b/i.test(text) || /\bscore\s*1\s*[-–]\s*10\b/i.test(text)) {
    warnings.push('TIPS uses a separate 1-10 scale. Its scores are never converted to the existing 1-5 evaluation.');
  }
  return { fields, warnings };
}
