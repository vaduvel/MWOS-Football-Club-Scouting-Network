export interface RoleAccessUserShape {
  roles: string[];
}

export const MODULE_ACCESS_ROLE_SLUGS = {
  training: ['admin', 'executive_director', 'technical_director', 'coach'],
  matchDay: ['admin', 'executive_director', 'technical_director', 'board_observer', 'coach'],
  transport: ['admin', 'executive_director', 'technical_director', 'coach', 'driver'],
  scouting: ['admin', 'executive_director', 'technical_director', 'scout'],
  playerHub: ['admin', 'executive_director', 'technical_director', 'scout'],
  scoutingAuthoring: ['admin', 'scout'],
  oversight: ['admin', 'executive_director', 'technical_director', 'board_observer'],
} as const;

const CLUB_ROLE_PRIORITY = [
  'admin',
  'executive_director',
  'technical_director',
  'coach',
  'driver',
  'scout',
  'board_observer',
] as const;

export function normalizeRoleSlug(value: string | null | undefined) {
  return (value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

export function normalizeRoleList(values: string[]) {
  const unique = Array.from(new Set(values.map((value) => normalizeRoleSlug(value)).filter(Boolean)));
  unique.sort((left, right) => {
    const leftIndex = CLUB_ROLE_PRIORITY.indexOf(left as (typeof CLUB_ROLE_PRIORITY)[number]);
    const rightIndex = CLUB_ROLE_PRIORITY.indexOf(right as (typeof CLUB_ROLE_PRIORITY)[number]);
    const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
    if (normalizedLeft !== normalizedRight) {
      return normalizedLeft - normalizedRight;
    }
    return left.localeCompare(right);
  });
  return unique;
}

export function userHasRole(user: RoleAccessUserShape | null | undefined, role: string) {
  const target = normalizeRoleSlug(role);
  if (!target || !user) return false;
  return user.roles.some((item) => normalizeRoleSlug(item) === target);
}

export function userHasAnyRole(user: RoleAccessUserShape | null | undefined, roles: readonly string[]) {
  return roles.some((role) => userHasRole(user, role));
}

export function canAccessTrainingModule(user: RoleAccessUserShape | null | undefined) {
  return userHasAnyRole(user, MODULE_ACCESS_ROLE_SLUGS.training);
}

export function canAccessMatchDayModule(user: RoleAccessUserShape | null | undefined) {
  return userHasAnyRole(user, MODULE_ACCESS_ROLE_SLUGS.matchDay);
}

export function canAccessTransportModule(user: RoleAccessUserShape | null | undefined) {
  return userHasAnyRole(user, MODULE_ACCESS_ROLE_SLUGS.transport);
}

export function canAccessScoutingModule(user: RoleAccessUserShape | null | undefined) {
  return userHasAnyRole(user, MODULE_ACCESS_ROLE_SLUGS.scouting);
}

export function canAccessPlayerHub(user: RoleAccessUserShape | null | undefined) {
  return userHasAnyRole(user, MODULE_ACCESS_ROLE_SLUGS.playerHub);
}

export function canCreateScoutingReports(user: RoleAccessUserShape | null | undefined) {
  return userHasAnyRole(user, MODULE_ACCESS_ROLE_SLUGS.scoutingAuthoring);
}

export function canAccessOversightModule(user: RoleAccessUserShape | null | undefined) {
  return userHasAnyRole(user, MODULE_ACCESS_ROLE_SLUGS.oversight);
}

export function getPrimaryRoleSlug(user: RoleAccessUserShape | null | undefined) {
  if (!user) return 'pending';
  return normalizeRoleList(user.roles)[0] || 'pending';
}

export function orderTeamsWithAssignmentsFirst<T extends { id: string }>(
  teams: T[],
  assignedTeams: Array<{ id: string }> = [],
) {
  const assignedOrder = new Map(assignedTeams.map((team, index) => [team.id, index]));

  return [...teams].sort((left, right) => {
    const leftRank = assignedOrder.get(left.id);
    const rightRank = assignedOrder.get(right.id);
    const leftAssigned = leftRank !== undefined;
    const rightAssigned = rightRank !== undefined;

    if (leftAssigned !== rightAssigned) return leftAssigned ? -1 : 1;
    if (leftAssigned && rightAssigned) return leftRank - rightRank;
    return 0;
  });
}

export function getDefaultModulePath(user: RoleAccessUserShape | null | undefined) {
  if (canAccessOversightModule(user)) {
    return '/oversight';
  }

  if (canAccessTrainingModule(user)) {
    return '/training';
  }

  if (canAccessTransportModule(user)) {
    return '/transport';
  }

  if (canAccessScoutingModule(user)) {
    return '/scouting';
  }

  return '/';
}
