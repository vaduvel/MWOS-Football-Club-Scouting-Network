export type LeadershipWorkspaceMode =
  | 'admin'
  | 'technical_director'
  | 'board_observer'
  | 'none';

export interface OversightHeroCopy {
  eyebrow: string;
  title: string;
  description: string;
}

function normalizeRole(value: string) {
  return value.trim().toLowerCase();
}

export function getLeadershipWorkspaceMode(roleSlugs: string[]): LeadershipWorkspaceMode {
  const roles = new Set(roleSlugs.map(normalizeRole).filter(Boolean));

  if (roles.has('admin')) return 'admin';
  if (roles.has('technical_director')) return 'technical_director';
  if (roles.has('board_observer')) return 'board_observer';
  return 'none';
}

export function canManageStaffAccess(mode: LeadershipWorkspaceMode) {
  return mode === 'admin';
}

export function canManageOversightTransport(mode: LeadershipWorkspaceMode) {
  return mode === 'admin' || mode === 'technical_director';
}

export function canSeeStaffCoverage(mode: LeadershipWorkspaceMode) {
  return mode === 'admin' || mode === 'technical_director';
}

export function getOversightHeroCopy(mode: LeadershipWorkspaceMode): OversightHeroCopy {
  switch (mode) {
    case 'admin':
      return {
        eyebrow: 'Admin Leadership Workspace',
        title: 'Oversight',
        description:
          'Run the operational club view across planning, transport, scouting activity, and staff onboarding from one surface.',
      };
    case 'technical_director':
      return {
        eyebrow: 'Technical Director Workspace',
        title: 'Oversight',
        description:
          'Review weekly planning, transport readiness, and football activity club-wide, then step into the right workspace when your guidance is needed.',
      };
    case 'board_observer':
      return {
        eyebrow: 'Board Briefing',
        title: 'Oversight',
        description:
          'Follow a clean, read-only summary of training publication, transport readiness, and scouting pulse without entering edit flows.',
      };
    case 'none':
    default:
      return {
        eyebrow: 'Leadership Workspace',
        title: 'Oversight',
        description:
          'One read-first leadership surface for club planning, transport readiness, scouting activity and staff onboarding.',
      };
  }
}
