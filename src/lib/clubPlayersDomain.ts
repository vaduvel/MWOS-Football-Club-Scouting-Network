export type ClubPlayerFoot = 'right' | 'left' | 'both' | 'unknown';

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
