export interface RoleAccessUserShape {
  roles: string[];
}

const CLUB_ROLE_PRIORITY = [
  'admin',
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

export function userHasAnyRole(user: RoleAccessUserShape | null | undefined, roles: string[]) {
  return roles.some((role) => userHasRole(user, role));
}

export function canAccessTrainingModule(user: RoleAccessUserShape | null | undefined) {
  return userHasAnyRole(user, ['admin', 'technical_director', 'coach']);
}

export function canAccessTransportModule(user: RoleAccessUserShape | null | undefined) {
  return userHasAnyRole(user, ['admin', 'technical_director', 'driver']);
}

export function canAccessScoutingModule(user: RoleAccessUserShape | null | undefined) {
  return userHasAnyRole(user, ['admin', 'technical_director', 'scout']);
}

export function canAccessPlayerHub(user: RoleAccessUserShape | null | undefined) {
  return userHasAnyRole(user, ['admin', 'technical_director', 'scout']);
}

export function canCreateScoutingReports(user: RoleAccessUserShape | null | undefined) {
  return userHasAnyRole(user, ['admin', 'scout']);
}

export function canAccessOversightModule(user: RoleAccessUserShape | null | undefined) {
  return userHasAnyRole(user, ['admin', 'technical_director', 'board_observer']);
}

export function getPrimaryRoleSlug(user: RoleAccessUserShape | null | undefined) {
  if (!user) return 'pending';
  return normalizeRoleList(user.roles)[0] || 'pending';
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
