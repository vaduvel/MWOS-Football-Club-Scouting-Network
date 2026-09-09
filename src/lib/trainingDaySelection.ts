export function resolveTrainingDay(value: string | null, weekStart: string, today = new Date()) {
  if (value !== null && /^[0-6]$/.test(value)) return Number(value);
  const start = new Date(`${weekStart}T00:00:00`);
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const offset = Math.round((day.getTime() - start.getTime()) / 86400000);
  return offset >= 0 && offset <= 6 ? offset : 0;
}
