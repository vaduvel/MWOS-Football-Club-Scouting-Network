export function toNullableFiniteNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseNumberInput(value: string): number | '' {
  return toNullableFiniteNumber(value) ?? '';
}
