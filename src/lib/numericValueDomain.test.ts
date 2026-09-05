import { describe, expect, it } from 'vitest';

import { parseNumberInput, toNullableFiniteNumber } from './numericValueDomain';

describe('toNullableFiniteNumber', () => {
  it('keeps finite numbers, including zero', () => {
    expect(toNullableFiniteNumber(0)).toBe(0);
    expect(toNullableFiniteNumber(4.5)).toBe(4.5);
  });

  it('normalizes numeric input strings before persistence', () => {
    expect(toNullableFiniteNumber('0')).toBe(0);
    expect(toNullableFiniteNumber('12')).toBe(12);
    expect(toNullableFiniteNumber('4.5')).toBe(4.5);
  });

  it('maps empty or invalid values to null', () => {
    expect(toNullableFiniteNumber('')).toBeNull();
    expect(toNullableFiniteNumber('not-a-number')).toBeNull();
    expect(toNullableFiniteNumber(Number.NaN)).toBeNull();
  });
});

describe('parseNumberInput', () => {
  it('keeps empty inputs empty and converts numeric fields to numbers', () => {
    expect(parseNumberInput('')).toBe('');
    expect(parseNumberInput('3')).toBe(3);
  });
});
