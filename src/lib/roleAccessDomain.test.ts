import { describe, expect, it } from 'vitest';
import {
  canAccessOversightModule,
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
  });

  it('computes module access by role', () => {
    expect(canAccessOversightModule({ roles: ['board_observer'] })).toBe(true);
    expect(canAccessTrainingModule({ roles: ['coach'] })).toBe(true);
    expect(canAccessTransportModule({ roles: ['driver'] })).toBe(true);
    expect(canAccessScoutingModule({ roles: ['scout'] })).toBe(true);
    expect(canAccessPlayerHub({ roles: ['scout'] })).toBe(true);
    expect(canAccessPlayerHub({ roles: ['driver'] })).toBe(false);
  });

  it('computes the primary role and default module path', () => {
    expect(getPrimaryRoleSlug({ roles: ['scout', 'admin'] })).toBe('admin');
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
