import { describe, expect, it } from 'vitest';

import * as data from './data';
import {
  canAccessPlayerHub,
  canAccessScoutingModule,
} from './data';

function makeUser(roles: string[]) {
  return { roles };
}

describe('scouting access matrix', () => {
  it('allows technical directors into the scouting workspace for review', () => {
    expect(canAccessScoutingModule(makeUser(['technical_director']))).toBe(true);
  });

  it('allows executive directors into scouting and player intelligence review', () => {
    expect(canAccessScoutingModule(makeUser(['executive_director']))).toBe(true);
    expect(canAccessPlayerHub(makeUser(['executive_director']))).toBe(true);
  });

  it('allows technical directors into player hub review flows', () => {
    expect(canAccessPlayerHub(makeUser(['technical_director']))).toBe(true);
  });

  it('keeps board observers out of scouting workspace routes', () => {
    expect(canAccessScoutingModule(makeUser(['board_observer']))).toBe(false);
    expect(canAccessPlayerHub(makeUser(['board_observer']))).toBe(false);
  });

  it('keeps technical directors out of scouting authoring flows', () => {
    expect('canCreateScoutingReports' in data).toBe(true);
    expect((data as { canCreateScoutingReports?: (user: { roles: string[] }) => boolean }).canCreateScoutingReports?.(makeUser(['executive_director']))).toBe(false);
    expect((data as { canCreateScoutingReports?: (user: { roles: string[] }) => boolean }).canCreateScoutingReports?.(makeUser(['technical_director']))).toBe(false);
    expect((data as { canCreateScoutingReports?: (user: { roles: string[] }) => boolean }).canCreateScoutingReports?.(makeUser(['scout']))).toBe(true);
  });
});
