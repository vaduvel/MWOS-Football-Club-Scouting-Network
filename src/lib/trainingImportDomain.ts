import { format, isValid, parseISO } from 'date-fns';

import { buildTrainingWeek, type TrainingDayDraft } from './trainingDomain';

export type TrainingImportKind = 'manual' | 'pdf_import' | 'image_import';
export type TrainingImportReviewState = 'ready' | 'needs_review' | 'missing_info';

export interface ImportedTrainingSourceDraft {
  fileName: string;
  mimeType: string;
  rawText: string;
  previewText: string;
}

export interface ImportedTrainingDayDraft extends TrainingDayDraft {
  reviewState: TrainingImportReviewState;
  importedExcerpt: string;
}

export interface ImportedTrainingDraft {
  source: ImportedTrainingSourceDraft;
  days: ImportedTrainingDayDraft[];
}

type ParsedTrainingBlock = {
  weekday: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  objectives: string;
  exercises: string;
  notes: string;
  importedExcerpt: string;
};

const WEEKDAY_TOKENS = [
  ['monday', 'mon', 'luni', 'lun'],
  ['tuesday', 'tue', 'tues', 'marti', 'marți', 'mar'],
  ['wednesday', 'wed', 'miercuri', 'mie'],
  ['thursday', 'thu', 'thur', 'thurs', 'joi'],
  ['friday', 'fri', 'vineri', 'vin'],
  ['saturday', 'sat', 'sambata', 'sâmbătă', 'sam'],
  ['sunday', 'sun', 'duminica', 'duminică', 'dum'],
] as const;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function buildPreviewText(value: string) {
  const normalized = normalizeWhitespace(value);
  return normalized.length > 240 ? `${normalized.slice(0, 237).trimEnd()}...` : normalized;
}

function findWeekdayName(line: string) {
  const lower = normalizeWhitespace(line).toLowerCase();

  for (const [index, aliases] of WEEKDAY_TOKENS.entries()) {
    if (aliases.some((alias) => new RegExp(`\\b${alias}\\b`, 'i').test(lower))) {
      return {
        index,
        weekday: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][index]!,
      };
    }
  }

  return null;
}

function parseDateToken(value: string) {
  const match = value.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
  if (!match) return '';

  const [, dayRaw, monthRaw, yearRaw] = match;
  const dayNumber = Number(dayRaw);
  const monthNumber = Number(monthRaw);
  const yearNumber = Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw);

  if (
    !Number.isInteger(dayNumber) ||
    !Number.isInteger(monthNumber) ||
    !Number.isInteger(yearNumber) ||
    dayNumber < 1 ||
    dayNumber > 31 ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    return '';
  }

  const candidate = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber));
  if (
    !isValid(candidate) ||
    candidate.getUTCFullYear() !== yearNumber ||
    candidate.getUTCMonth() !== monthNumber - 1 ||
    candidate.getUTCDate() !== dayNumber
  ) {
    return '';
  }

  const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
  const day = dayRaw.padStart(2, '0');
  const month = monthRaw.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function stripScheduleMarkers(line: string) {
  let cleaned = normalizeWhitespace(line);

  for (const aliases of WEEKDAY_TOKENS) {
    for (const alias of aliases) {
      cleaned = cleaned.replace(new RegExp(`\\b${alias}\\b`, 'gi'), ' ');
    }
  }

  cleaned = cleaned.replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g, ' ');
  return normalizeWhitespace(cleaned.replace(/\s+([.,;:])/g, '$1').replace(/[.,;:\-–—]+$/g, ''));
}

function resolveWeekdayFromIsoDate(value: string) {
  if (!value) return '';

  const parsed = parseISO(value);
  if (!isValid(parsed)) {
    return '';
  }

  return format(parsed, 'EEEE');
}

function parseTimeToken(value: string) {
  const compactMatch = value.match(/\b(\d{1,2})(\d{2})\s*(a\.?m?\.?|p\.?m?\.?|am|pm|hrs|hr)\b/i);
  if (compactMatch) {
    const [, hoursRaw, minutesRaw, suffixRaw = ''] = compactMatch;
    let hours = Number(hoursRaw);
    const suffix = suffixRaw.toLowerCase();

    if (suffix.includes('pm') && hours < 12) {
      hours += 12;
    } else if (suffix.includes('am') && hours === 12) {
      hours = 0;
    }

    if (!Number.isFinite(hours) || hours > 23) return '';
    return `${String(hours).padStart(2, '0')}:${minutesRaw}`;
  }

  const match = value.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m?\.?|p\.?m?\.?|am|pm|hrs|hr)?\b/i);
  if (!match) return '';

  let hours = Number(match[1]);
  const minutes = match[2] || '00';
  const suffix = (match[3] || '').toLowerCase();

  if (suffix.includes('pm') && hours < 12) {
    hours += 12;
  } else if (suffix.includes('am') && hours === 12) {
    hours = 0;
  }

  if (!Number.isFinite(hours) || hours > 23) return '';
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function parseLocation(lines: string[]) {
  const labeled = lines.find((line) => /^(venue|location|stadium)\b/i.test(line));
  if (labeled) {
    return normalizeWhitespace(labeled.replace(/^(venue|location|stadium)\s*[:\-]?\s*/i, ''));
  }

  const inferred = lines.find((line) => /\b(stadium|sports club|pitch|gym|hall|ground)\b/i.test(line));
  return inferred ? normalizeWhitespace(inferred) : '';
}

function parseStartTime(lines: string[]) {
  const specific = lines.find((line) => /\b(training starts|start time|kick off training|session starts)\b/i.test(line));
  if (specific) {
    return parseTimeToken(specific);
  }

  const generic = lines.find((line) => /\b\d{1,2}[:.]?\d{0,2}\s*(a\.?m?\.?|p\.?m?\.?|am|pm|hrs|hr)\b/i.test(line));
  return generic ? parseTimeToken(generic) : '';
}

function parseEndTime(lines: string[]) {
  const specific = lines.find((line) => /\b(end|finish|until)\b/i.test(line));
  return specific ? parseTimeToken(specific) : '';
}

function splitBlockLines(lines: string[]) {
  const operationalNotes: string[] = [];
  const contentLines: string[] = [];

  for (const line of lines) {
    const hasWeekdayOrDate = Boolean(findWeekdayName(line) || parseDateToken(line));

    if (hasWeekdayOrDate) {
      const cleanedHeadline = stripScheduleMarkers(line);
      if (cleanedHeadline && !parseTimeToken(cleanedHeadline)) {
        contentLines.push(cleanedHeadline);
      }
      continue;
    }

    if (
      /\b(departure|arrival|meeting point|bring|water bottle|ice ?bath|transport|samora|ngoni)\b/i.test(line)
    ) {
      operationalNotes.push(normalizeWhitespace(line));
      continue;
    }

    if (/\b(training starts|start time|kick off training|session starts)\b/i.test(line)) {
      continue;
    }

    if (/^(venue|location|stadium)\b/i.test(line)) {
      continue;
    }

    contentLines.push(normalizeWhitespace(line));
  }

  return {
    notes: operationalNotes.join('\n'),
    contentLines,
  };
}

function buildParsedBlock(rawLines: string[]) {
  const joined = rawLines.join('\n');
  const firstWeekday = rawLines.map(findWeekdayName).find(Boolean) || null;
  const date = rawLines.map(parseDateToken).find(Boolean) || '';
  const location = parseLocation(rawLines);
  const startTime = parseStartTime(rawLines);
  const endTime = parseEndTime(rawLines);
  const { notes, contentLines } = splitBlockLines(rawLines);
  const content = contentLines.join('\n');

  let objectives = '';
  let exercises = '';

  if (contentLines.length === 1) {
    objectives = content;
  } else if (contentLines.length > 1) {
    objectives = contentLines[0] || '';
    exercises = contentLines.slice(1).join('\n');
  }

  return {
    weekday: firstWeekday?.weekday || resolveWeekdayFromIsoDate(date),
    date,
    startTime,
    endTime,
    location,
    objectives,
    exercises,
    notes,
    importedExcerpt: buildPreviewText(joined),
  } satisfies ParsedTrainingBlock;
}

function extractDayBlocks(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  if (!lines.length) {
    return [] as ParsedTrainingBlock[];
  }

  const indices = lines
    .map((line, index) => {
      const hasWeekday = Boolean(findWeekdayName(line));
      const hasDate = Boolean(parseDateToken(line));
      return hasWeekday || hasDate ? index : -1;
    })
    .filter((index) => index >= 0);

  if (!indices.length) {
    return [buildParsedBlock(lines)];
  }

  return indices.map((startIndex, arrayIndex) => {
    const endIndex = indices[arrayIndex + 1] ?? lines.length;
    return buildParsedBlock(lines.slice(startIndex, endIndex));
  });
}

export function inferTrainingImportKind(mimeType: string): TrainingImportKind {
  if (mimeType.startsWith('image/')) return 'image_import';
  if (mimeType === 'application/pdf') return 'pdf_import';
  return 'manual';
}

export function classifyImportedTrainingDay(day: Pick<ParsedTrainingBlock, 'weekday' | 'date' | 'startTime' | 'endTime' | 'location' | 'objectives' | 'exercises' | 'notes'>): TrainingImportReviewState {
  const hasContent = [day.objectives, day.exercises, day.notes]
    .some((value) => normalizeWhitespace(value).length > 0);

  if (day.date && day.startTime && day.location && hasContent) {
    return 'ready';
  }

  if (day.startTime || day.endTime || day.location || hasContent) {
    return 'needs_review';
  }

  return 'missing_info';
}

export function buildImportedTrainingDraft(input: {
  fileName: string;
  mimeType: string;
  extractedText: string;
  weekStart: string;
}): ImportedTrainingDraft {
  const week = buildTrainingWeek(input.weekStart).map(
    (day): ImportedTrainingDayDraft => ({
      ...day,
      reviewState: 'missing_info',
      importedExcerpt: '',
    }),
  );

  const parsedBlocks = extractDayBlocks(input.extractedText);

  for (const block of parsedBlocks) {
    const indexFromDate = block.date
      ? week.findIndex((day) => day.date === block.date)
      : -1;
    const indexFromWeekday = block.weekday
      ? week.findIndex((day) => day.weekday === block.weekday)
      : -1;
    const targetIndex = indexFromDate >= 0 ? indexFromDate : indexFromWeekday;

    if (targetIndex < 0) {
      continue;
    }

    const current = week[targetIndex]!;
    const resolvedBlock = {
      ...block,
      date: block.date || current.date,
    };
    const reviewState = classifyImportedTrainingDay(resolvedBlock);
    week[targetIndex] = {
      ...current,
      dayType: reviewState === 'missing_info' ? current.dayType : 'training',
      sessionTitle: resolvedBlock.objectives || current.sessionTitle,
      startTime: resolvedBlock.startTime,
      endTime: resolvedBlock.endTime,
      location: resolvedBlock.location,
      objectives: resolvedBlock.objectives,
      exercises: resolvedBlock.exercises,
      notes: resolvedBlock.notes,
      reviewState,
      importedExcerpt: resolvedBlock.importedExcerpt,
    };
  }

  return {
    source: {
      fileName: input.fileName,
      mimeType: input.mimeType,
      rawText: input.extractedText.trim(),
      previewText: buildPreviewText(input.extractedText),
    },
    days: week,
  };
}
