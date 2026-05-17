import { roleRequiresTeam } from './inviteDomain';

function normalizeRoleSlug(roleSlug: string) {
  return roleSlug.trim().toLowerCase().replace(/\s+/g, '_');
}

export function normalizeClubAccessSelection(input: { roleSlugs: string[]; teamIds: string[] }) {
  const roleSlugs = Array.from(
    new Set(
      input.roleSlugs
        .map(normalizeRoleSlug)
        .filter(Boolean),
    ),
  );

  const teamIds = roleSlugs.length === 0
    ? []
    : Array.from(
        new Set(
          input.teamIds
            .map((teamId) => teamId.trim())
            .filter(Boolean),
        ),
      );

  return {
    roleSlugs,
    teamIds,
  };
}

export function validateClubAccessSelection(input: { roleSlugs: string[]; teamIds: string[] }) {
  const { roleSlugs, teamIds } = normalizeClubAccessSelection(input);

  if (roleSlugs.some(roleRequiresTeam) && teamIds.length === 0) {
    throw new Error('Select at least one team for coach, driver, or scout access.');
  }

  return {
    roleSlugs,
    teamIds,
  };
}

export function isRemovingOwnAdminRole(input: {
  actingUserId?: string;
  targetUserId: string;
  actingUserRoles: string[];
  nextRoleSlugs: string[];
}) {
  const actorRoles = new Set(input.actingUserRoles.map(normalizeRoleSlug));
  const nextRoles = new Set(input.nextRoleSlugs.map(normalizeRoleSlug));

  return input.actingUserId === input.targetUserId && actorRoles.has('admin') && !nextRoles.has('admin');
}

export function buildClubAccessActionLabels(input: { roleSlugs: string[]; teamIds: string[] }) {
  const { roleSlugs, teamIds } = normalizeClubAccessSelection(input);
  const isClearing = roleSlugs.length === 0 && teamIds.length === 0;

  return {
    saveLabel: isClearing ? 'Revoke Club Access' : 'Save Club Access',
    successLabel: isClearing ? 'Club access revoked' : 'Club access updated',
    clearLabel: isClearing ? 'Access Already Cleared' : 'Clear Club Access',
    isClearing,
  };
}
