import { expect, it } from 'vitest';
import { resolveTrainingDay } from './trainingDaySelection';
it('defaults to today in the current week and preserves explicit days', () => {
  const today = new Date(2026, 8, 9, 12);
  expect(resolveTrainingDay(null, '2026-09-07', today)).toBe(2);
  expect(resolveTrainingDay('0', '2026-09-07', today)).toBe(0);
  expect(resolveTrainingDay(null, '2026-09-14', today)).toBe(0);
  expect(resolveTrainingDay('1.5', '2026-09-07', today)).toBe(2);
});
