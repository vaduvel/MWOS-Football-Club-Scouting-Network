import { describe, expect, it } from 'vitest';
import {
  canAccessOversightModule,
  canAccessMatchDayModule,
  canAccessPlayerHub,
  canAccessScoutingModule,
  canAccessTrainingModule,
  canAccessTransportModule,
  getDefaultModulePath,
  getPrimaryRoleSlug,
  normalizeRoleList,
  userHasRole,
} from './roleAccessDomain';

describe('roleAccessDomain', () => {
  it('normalizes and sorts role lists by club priority', () => {
    expect(normalizeRoleList(['Scout', ' admin ', 'coach', 'coach'])).toEqual([
      'admin',
      'coach',
      'scout',
    ]);
    expect(normalizeRoleList(['technical_director', 'executive_director'])).toEqual([
      'executive_director',
      'technical_director',
    ]);
  });

  it('computes module access by role', () => {
    expect(canAccessOversightModule({ roles: ['executive_director'] })).toBe(true);
    expect(canAccessScoutingModule({ roles: ['executive_director'] })).toBe(true);
    expect(canAccessPlayerHub({ roles: ['executive_director'] })).toBe(true);
    expect(canAccessOversightModule({ roles: ['board_observer'] })).toBe(true);
    expect(canAccessMatchDayModule({ roles: ['board_observer'] })).toBe(true);
    expect(canAccessTrainingModule({ roles: ['coach'] })).toBe(true);
    expect(canAccessMatchDayModule({ roles: ['coach'] })).toBe(true);
    expect(canAccessTransportModule({ roles: ['coach'] })).toBe(true);
    expect(canAccessTransportModule({ roles: ['driver'] })).toBe(true);
    expect(canAccessScoutingModule({ roles: ['scout'] })).toBe(true);
    expect(canAccessPlayerHub({ roles: ['scout'] })).toBe(true);
    expect(canAccessPlayerHub({ roles: ['driver'] })).toBe(false);
  });

  it('combines access for staff with multiple operational roles', () => {
    const coachDriver = { roles: ['driver', 'coach'] };

    expect(getPrimaryRoleSlug(coachDriver)).toBe('coach');
    expect(getDefaultModulePath(coachDriver)).toBe('/training');
    expect(canAccessTrainingModule(coachDriver)).toBe(true);
    expect(canAccessTransportModule(coachDriver)).toBe(true);
    expect(canAccessScoutingModule(coachDriver)).toBe(false);
    expect(canAccessOversightModule(coachDriver)).toBe(false);
  });

  it('keeps single-purpose staff out of unrelated modules', () => {
    const coach = { roles: ['coach'] };
    const driver = { roles: ['driver'] };
    const boardObserver = { roles: ['board_observer'] };

    expect(canAccessTrainingModule(coach)).toBe(true);
    expect(canAccessTransportModule(coach)).toBe(true);
    expect(canAccessTransportModule(driver)).toBe(true);
    expect(canAccessTrainingModule(driver)).toBe(false);
    expect(canAccessMatchDayModule(driver)).toBe(false);
    expect(canAccessOversightModule(boardObserver)).toBe(true);
    expect(canAccessTrainingModule(boardObserver)).toBe(false);
    expect(canAccessTransportModule(boardObserver)).toBe(false);
    expect(canAccessScoutingModule(boardObserver)).toBe(false);
  });

  it('computes the primary role and default module path', () => {
    expect(getPrimaryRoleSlug({ roles: ['scout', 'admin'] })).toBe('admin');
    expect(getDefaultModulePath({ roles: ['executive_director'] })).toBe('/oversight');
    expect(getDefaultModulePath({ roles: ['board_observer'] })).toBe('/oversight');
    expect(getDefaultModulePath({ roles: ['coach'] })).toBe('/training');
    expect(getDefaultModulePath({ roles: ['driver'] })).toBe('/transport');
    expect(getDefaultModulePath({ roles: ['scout'] })).toBe('/scouting');
  });

  it('checks role membership safely', () => {
    expect(userHasRole({ roles: ['technical_director'] }, 'Technical Director')).toBe(true);
    expect(userHasRole({ roles: ['coach'] }, 'admin')).toBe(false);
  });
});
