import { describe, expect, it } from 'vitest';

import {
  canManageOversightTransport,
  canManageStaffAccess,
  canSeeStaffCoverage,
  getLeadershipWorkspaceMode,
  getOversightHeroCopy,
} from './leadershipWorkspaceDomain';

describe('getLeadershipWorkspaceMode', () => {
  it('prioritizes admin over other leadership roles', () => {
    expect(getLeadershipWorkspaceMode(['technical_director', 'admin'])).toBe('admin');
  });

  it('distinguishes technical director and board observer', () => {
    expect(getLeadershipWorkspaceMode(['technical_director'])).toBe('technical_director');
    expect(getLeadershipWorkspaceMode(['board_observer'])).toBe('board_observer');
    expect(getLeadershipWorkspaceMode(['coach'])).toBe('none');
  });
});

describe('leadership workspace capabilities', () => {
  it('keeps staff access management admin-only', () => {
    expect(canManageStaffAccess('admin')).toBe(true);
    expect(canManageStaffAccess('technical_director')).toBe(false);
    expect(canManageStaffAccess('board_observer')).toBe(false);
  });

  it('allows transport interventions for admin and technical director only', () => {
    expect(canManageOversightTransport('admin')).toBe(true);
    expect(canManageOversightTransport('technical_director')).toBe(true);
    expect(canManageOversightTransport('board_observer')).toBe(false);
  });

  it('shows staff coverage to admin and technical director only', () => {
    expect(canSeeStaffCoverage('admin')).toBe(true);
    expect(canSeeStaffCoverage('technical_director')).toBe(true);
    expect(canSeeStaffCoverage('board_observer')).toBe(false);
  });
});

describe('getOversightHeroCopy', () => {
  it('returns admin operations copy', () => {
    expect(getOversightHeroCopy('admin')).toEqual(
      expect.objectContaining({
        eyebrow: 'Admin Leadership Workspace',
        title: 'Oversight',
      }),
    );
  });

  it('returns technical director copy', () => {
    expect(getOversightHeroCopy('technical_director')).toEqual(
      expect.objectContaining({
        eyebrow: 'Technical Director Workspace',
      }),
    );
  });

  it('returns board observer copy', () => {
    expect(getOversightHeroCopy('board_observer')).toEqual(
      expect.objectContaining({
        eyebrow: 'Board Briefing',
      }),
    );
  });
});
