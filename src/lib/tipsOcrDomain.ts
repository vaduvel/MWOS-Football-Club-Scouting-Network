import { TIPS_SECTIONS, type TipsAttributeKey, type TipsEvaluation } from './tipsEvaluationDomain';

export const TIPS_OCR_DETAILS = [
  ['positions', 'Position(s)'], ['preferredFoot', 'Preferred foot'],
  ['nationality', 'Nationality'], ['matchObserved', 'Match observed'],
  ['competitionLevel', 'Competition / level'], ['otherNotes', 'Other notes'],
  ['physicality', 'Physicality'],
] as const;

export type TipsOcrDetailKey = typeof TIPS_OCR_DETAILS[number][0];
export type TipsOcrKey = TipsOcrDetailKey | TipsAttributeKey;
export type TipsOcrFields = Partial<Record<TipsOcrKey, string>>;
export const TIPS_OCR_FIELDS: ReadonlyArray<readonly [TipsOcrKey, string]> = [
  ...TIPS_OCR_DETAILS,
  ...TIPS_SECTIONS.flatMap(section => section.attributes.map(([key, label]) => [key, `${section.title} · ${label} (1-10)`] as const)),
];

const DETAIL_ALIASES: Record<TipsOcrDetailKey, string[]> = {
  positions: ['position', 'positions', 'position(s)'], preferredFoot: ['preferred foot', 'foot'],
  nationality: ['nationality'], matchObserved: ['match observed', 'match'],
  competitionLevel: ['competition / level', 'competition level', 'level'],
  otherNotes: ['other notes'], physicality: ['physicality'],
};

function normalized(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function valueForLabel(lines: string[], aliases: string[]) {
  const labels = aliases.map(normalized);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const separator = line.search(/[:：]/);
    if (separator >= 0 && labels.includes(normalized(line.slice(0, separator)))) {
      return line.slice(separator + 1).trim() || lines[i + 1]?.trim() || '';
    }
    for (const alias of aliases) {
      const match = line.match(new RegExp(`^${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}\\s+(.+)$`, 'i'));
      if (match) return match[1].trim();
    }
    if (labels.includes(normalized(line))) return lines[i + 1]?.trim() || '';
  }
  return '';
}

export function parseTipsOcrText(text: string) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const fields: TipsOcrFields = {};
  const warnings: string[] = [];
  const looksLikeTips = /\bTIPS\s+Methodology\b/i.test(text) ||
    /\b(?:TECHNIQUE|INTELLIGENCE|PERSONALITY|SPEED)\b[\s\S]*\b1\s*[-–/]\s*10\b/i.test(text);
  if (!looksLikeTips) return { fields, warnings, recognized: false };

  for (const [key] of TIPS_OCR_DETAILS) {
    const value = valueForLabel(lines, DETAIL_ALIASES[key]);
    if (value && !/^[_\-\s]+$/.test(value)) fields[key] = value.slice(0, 3000);
  }
  for (const section of TIPS_SECTIONS) for (const [key, label] of section.attributes) {
    const aliases = key === 'finishing' ? [label, 'Finishing', 'Finishing striking'] :
      key === 'acceleration_pace' ? [label, 'Acceleration pace'] :
      key === 'body_language_work_ethic' ? [label, 'Body language work ethic'] :
      key === 'stamina_work_rate' ? [label, 'Stamina work rate'] : [label];
    const value = valueForLabel(lines, aliases);
    if (!value) continue;
    const match = value.match(/^(\d{1,2})(?:\s*(?:\/|out of)\s*(\d{1,2}))?(?:\b|$)/i);
    if (!match) continue;
    const score = Number(match[1]);
    const denominator = match[2] ? Number(match[2]) : 10;
    if (denominator === 10 && score >= 1 && score <= 10) fields[key] = String(score);
    else warnings.push(`${label} needs review: ${value}`);
  }
  return { fields, warnings, recognized: true };
}

export function applyTipsOcrFields(current: TipsEvaluation, fields: TipsOcrFields, selected: TipsOcrKey[]) {
  const next: TipsEvaluation = { ...current, attributes: { ...current.attributes } };
  const selectedKeys = new Set(selected);
  for (const [key] of TIPS_OCR_DETAILS) {
    const value = fields[key]?.trim();
    if (selectedKeys.has(key) && value) next[key] = value;
  }
  for (const section of TIPS_SECTIONS) for (const [key] of section.attributes) {
    const value = fields[key];
    if (!selectedKeys.has(key) || !value) continue;
    const score = Number(value);
    if (!Number.isInteger(score) || score < 1 || score > 10) throw new Error('Review TIPS scores before applying. They must be whole numbers from 1 to 10.');
    next.attributes[key] = { ...current.attributes[key], score };
  }
  return next;
}
