export type ClubPlayerFoot = 'right' | 'left' | 'both' | 'unknown';

export interface ClubPlayerDraft {
  squadNumber: string;
  firstName: string;
  lastName: string;
  displayName: string;
  weightKg: string;
  heightCm: string;
  bmi: string;
  dominantFoot: ClubPlayerFoot;
  nationality: string;
  primaryPosition: string;
  secondaryPosition: string;
  notes: string;
  isActive: boolean;
}

export interface ClubPlayerSavePayload {
  team_id: string;
  source_label: string;
  source_row_number: number | null;
  squad_number: number | null;
  first_name: string;
  last_name: string;
  display_name: string;
  weight_kg: number | null;
  height_cm: number | null;
  bmi: number | null;
  dominant_foot: ClubPlayerFoot;
  nationality: string | null;
  primary_position: string | null;
  secondary_position: string | null;
  notes: string | null;
  is_active: boolean;
}

export function normalizeClubPlayerText(value: string | null | undefined) {
  return (value || '').trim();
}

export function normalizeClubPlayerName(value: string | null | undefined) {
  return normalizeClubPlayerText(value).replace(/\s+/g, ' ');
}

export function buildClubPlayerDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
) {
  return [normalizeClubPlayerName(firstName), normalizeClubPlayerName(lastName)]
    .filter(Boolean)
    .join(' ')
    .trim();
}

export function normalizeClubPlayerFoot(value: string | null | undefined): ClubPlayerFoot {
  const normalized = normalizeClubPlayerText(value).toLowerCase();

  if (!normalized) return 'unknown';
  if (['r', 'right', 'right foot'].includes(normalized)) return 'right';
  if (['l', 'left', 'left foot'].includes(normalized)) return 'left';
  if (
    ['r / l', 'l / r', 'r/l', 'l/r', 'both', 'ambidextrous', 'right / left'].includes(normalized)
  ) {
    return 'both';
  }

  return 'unknown';
}

export function formatClubPlayerFoot(value: ClubPlayerFoot) {
  if (value === 'right') return 'Right foot';
  if (value === 'left') return 'Left foot';
  if (value === 'both') return 'Both feet';
  return 'Foot unknown';
}

export function normalizeClubPlayerPosition(value: string | null | undefined) {
  return normalizeClubPlayerText(value).replace(/\s+/g, ' ');
}

export function parseClubPlayerNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalPositiveNumber(
  value: string,
  label: string,
  errors: string[],
  options: { integer?: boolean } = {},
) {
  const normalized = normalizeClubPlayerText(value);
  if (!normalized) return null;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    errors.push(`${label} must be a valid number.`);
    return null;
  }

  if (parsed <= 0) {
    errors.push(`${label} must be greater than 0.`);
    return null;
  }

  if (options.integer && !Number.isInteger(parsed)) {
    errors.push(`${label} must be a whole number.`);
    return null;
  }

  return parsed;
}

function toNullableText(value: string) {
  const normalized = normalizeClubPlayerText(value).replace(/\s+/g, ' ');
  return normalized || null;
}

function roundMetric(value: number | null, digits = 2) {
  if (value === null || !Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

export function createEmptyClubPlayerDraft(): ClubPlayerDraft {
  return {
    squadNumber: '',
    firstName: '',
    lastName: '',
    displayName: '',
    weightKg: '',
    heightCm: '',
    bmi: '',
    dominantFoot: 'unknown',
    nationality: '',
    primaryPosition: '',
    secondaryPosition: '',
    notes: '',
    isActive: true,
  };
}

export function toClubPlayerDraft(input: {
  squadNumber: number | null;
  firstName: string;
  lastName: string;
  displayName: string;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
  dominantFoot: ClubPlayerFoot;
  nationality: string;
  primaryPosition: string;
  secondaryPosition: string;
  notes: string;
  isActive: boolean;
}): ClubPlayerDraft {
  return {
    squadNumber: input.squadNumber === null ? '' : String(input.squadNumber),
    firstName: input.firstName,
    lastName: input.lastName,
    displayName: input.displayName,
    weightKg: input.weightKg === null ? '' : String(input.weightKg),
    heightCm: input.heightCm === null ? '' : String(input.heightCm),
    bmi: input.bmi === null ? '' : String(input.bmi),
    dominantFoot: input.dominantFoot,
    nationality: input.nationality,
    primaryPosition: input.primaryPosition,
    secondaryPosition: input.secondaryPosition,
    notes: input.notes,
    isActive: input.isActive,
  };
}

export function buildClubPlayerSavePayload(teamId: string, draft: ClubPlayerDraft): {
  payload: ClubPlayerSavePayload | null;
  errors: string[];
} {
  const errors: string[] = [];
  const normalizedTeamId = normalizeClubPlayerText(teamId);
  const firstName = normalizeClubPlayerName(draft.firstName);
  const lastName = normalizeClubPlayerName(draft.lastName);
  const explicitDisplayName = normalizeClubPlayerName(draft.displayName);
  const displayName = explicitDisplayName || buildClubPlayerDisplayName(firstName, lastName);

  if (!normalizedTeamId) {
    errors.push('Choose a team before saving the player.');
  }

  if (!displayName) {
    errors.push('Add at least a first name, last name or display name.');
  }

  const squadNumber = parseOptionalPositiveNumber(draft.squadNumber, 'Squad number', errors, {
    integer: true,
  });
  const heightCm = parseOptionalPositiveNumber(draft.heightCm, 'Height', errors);
  const weightKg = parseOptionalPositiveNumber(draft.weightKg, 'Weight', errors);
  const explicitBmi = parseOptionalPositiveNumber(draft.bmi, 'BMI', errors);
  const computedBmi =
    explicitBmi === null && heightCm !== null && weightKg !== null
      ? weightKg / (heightCm / 100) ** 2
      : explicitBmi;

  if (errors.length) {
    return {
      payload: null,
      errors,
    };
  }

  return {
    payload: {
      team_id: normalizedTeamId,
      source_label: 'manual_roster_editor',
      source_row_number: null,
      squad_number: squadNumber,
      first_name: firstName || displayName,
      last_name: lastName || '-',
      display_name: displayName,
      weight_kg: roundMetric(weightKg),
      height_cm: roundMetric(heightCm),
      bmi: roundMetric(computedBmi),
      dominant_foot: normalizeClubPlayerFoot(draft.dominantFoot),
      nationality: toNullableText(draft.nationality),
      primary_position: toNullableText(draft.primaryPosition),
      secondary_position: toNullableText(draft.secondaryPosition),
      notes: toNullableText(draft.notes),
      is_active: draft.isActive,
    },
    errors: [],
  };
}

export function formatClubPlayerMetric(
  value: number | null | undefined,
  suffix: string,
  digits = 0,
) {
  if (value === null || value === undefined || Number.isNaN(value)) return `-- ${suffix}`;
  return `${value.toFixed(digits)} ${suffix}`;
}

export function hasCompleteAnthropometrics(input: {
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
}) {
  return (
    input.heightCm !== null &&
    input.weightKg !== null &&
    input.bmi !== null
  );
}
