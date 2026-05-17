type MinimalRole = {
  slug: string;
  label: string;
};

type MinimalTeam = {
  name: string;
};

type MinimalClubUser = {
  id: string;
  name: string;
  email: string;
  roles: readonly MinimalRole[];
  teams: readonly MinimalTeam[];
};

type MinimalInvitation = {
  id: string;
  fullName: string;
  email: string;
  status: string;
  roles: readonly MinimalRole[];
  teams: readonly MinimalTeam[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

type MinimalEvent = {
  id: string;
  targetName: string;
  targetEmail: string;
  actorName: string;
  title: string;
  detail: string;
  tone: 'info' | 'success' | 'warning';
  roleLabels: readonly string[];
  teamNames: readonly string[];
  createdAt: string;
};

type RoleTeamFilterInput = {
  query: string;
  roleSlug: string;
  teamName: string;
};

type InvitationFilterInput = RoleTeamFilterInput & {
  statusScope: 'all' | 'pending' | 'history';
};

type EventFilterInput = RoleTeamFilterInput & {
  tone: 'all' | 'info' | 'success' | 'warning';
};

function normalizeValue(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function normalizeToken(value: string | null | undefined) {
  return normalizeValue(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesToken(haystack: readonly string[], needle: string) {
  if (!needle) return true;
  return haystack.some((value) => normalizeToken(value).includes(needle));
}

function matchesRole(roleSlug: string, roles: readonly MinimalRole[]) {
  if (!roleSlug || roleSlug === 'all') return true;
  const normalizedRole = normalizeToken(roleSlug);
  return roles.some((role) => normalizeToken(role.slug) === normalizedRole || normalizeToken(role.label) === normalizedRole);
}

function matchesTeam(teamName: string, teams: ReadonlyArray<MinimalTeam | { name: string }>) {
  if (!teamName || teamName === 'all') return true;
  const normalizedTeam = normalizeToken(teamName);
  return teams.some((team) => normalizeToken(team.name) === normalizedTeam);
}

export function filterClubAccessUsers<T extends MinimalClubUser>(users: readonly T[], filters: RoleTeamFilterInput) {
  const normalizedQuery = normalizeToken(filters.query);
  return users.filter((user) => {
    const searchable = [
      user.name,
      user.email,
      ...user.roles.flatMap((role) => [role.slug, role.label]),
      ...user.teams.map((team) => team.name),
    ];

    return (
      includesToken(searchable, normalizedQuery) &&
      matchesRole(filters.roleSlug, user.roles) &&
      matchesTeam(filters.teamName, user.teams)
    );
  });
}

export function filterStaffInvitations<T extends MinimalInvitation>(
  invitations: readonly T[],
  filters: InvitationFilterInput,
) {
  const normalizedQuery = normalizeToken(filters.query);
  return invitations.filter((invitation) => {
    const inScope =
      filters.statusScope === 'all'
        ? true
        : filters.statusScope === 'pending'
          ? invitation.status === 'pending'
          : invitation.status !== 'pending';

    const searchable = [
      invitation.fullName,
      invitation.email,
      invitation.status,
      ...invitation.roles.flatMap((role) => [role.slug, role.label]),
      ...invitation.teams.map((team) => team.name),
    ];

    return (
      inScope &&
      includesToken(searchable, normalizedQuery) &&
      matchesRole(filters.roleSlug, invitation.roles) &&
      matchesTeam(filters.teamName, invitation.teams)
    );
  });
}

export function filterStaffAccessEvents<T extends MinimalEvent>(events: readonly T[], filters: EventFilterInput) {
  const normalizedQuery = normalizeToken(filters.query);
  return events.filter((event) => {
    const searchable = [
      event.targetName,
      event.targetEmail,
      event.actorName,
      event.title,
      event.detail,
      ...event.roleLabels,
      ...event.teamNames,
    ];

    return (
      includesToken(searchable, normalizedQuery) &&
      (filters.tone === 'all' || event.tone === filters.tone) &&
      (filters.roleSlug === 'all' || includesToken(event.roleLabels, normalizeToken(filters.roleSlug))) &&
      (filters.teamName === 'all' || includesToken(event.teamNames, normalizeToken(filters.teamName)))
    );
  });
}

export function buildStaffOperationsMetrics(
  input: {
    users: readonly MinimalClubUser[];
    invitations: readonly MinimalInvitation[];
    events: readonly MinimalEvent[];
  },
  options?: {
    nowIso?: string;
  },
) {
  const now = options?.nowIso ? new Date(options.nowIso).getTime() : Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  return {
    activeStaffCount: input.users.filter((user) => user.roles.length > 0).length,
    pendingInvitationCount: input.invitations.filter((invitation) => invitation.status === 'pending').length,
    stalePendingInvitationCount: input.invitations.filter((invitation) => {
      if (invitation.status !== 'pending') return false;
      const expiryTime = new Date(invitation.expiresAt || invitation.updatedAt || invitation.createdAt).getTime();
      return Number.isFinite(expiryTime) && expiryTime < now;
    }).length,
    multiTeamStaffCount: input.users.filter((user) => user.teams.length > 1).length,
    recentChangesCount: input.events.filter((event) => new Date(event.createdAt).getTime() >= sevenDaysAgo).length,
  };
}
