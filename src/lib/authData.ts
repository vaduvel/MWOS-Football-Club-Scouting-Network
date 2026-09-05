import type { Session, User } from '@supabase/supabase-js';
import { assertSupabaseConfigured, supabase } from './supabase';
import { isAuthSessionMissingUserError } from './authSessionDomain';
import { MODULE_ACCESS_ROLE_SLUGS } from './roleAccessDomain';

export { isAuthSessionMissingUserError } from './authSessionDomain';

export interface AppRole {
  slug: string;
  label: string;
}

export interface AppTeam {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  organization: string;
  role: string;
  roles: string[];
  roleLabels: string[];
  teams: AppTeam[];
}

export interface ProfileRow {
  id: string;
  email: string;
  name: string | null;
  organization: string | null;
  role: string | null;
}

export interface UserRoleJoinRow {
  roles:
    | {
        slug: string;
        label: string;
      }
    | {
        slug: string;
        label: string;
      }[]
    | null;
}

export interface UserTeamJoinRow {
  team_id: string;
  teams:
    | {
        id: string;
        slug: string;
        name: string;
        is_active: boolean;
      }
    | {
        id: string;
        slug: string;
        name: string;
        is_active: boolean;
      }[]
    | null;
}

const CLUB_ROLE_PRIORITY = [
  'admin',
  'executive_director',
  'technical_director',
  'coach',
  'driver',
  'scout',
  'board_observer',
] as const;
export function getDisplayName(email: string | null | undefined) {
  if (!email) return 'Scout User';
  return email.split('@')[0] || 'Scout User';
}

export function normalizeRoleSlug(value: string | null | undefined) {
  return (value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

export function formatRoleLabel(slug: string) {
  return slug
    .split('_')
    .map((token) => (token ? `${token[0]?.toUpperCase() || ''}${token.slice(1)}` : token))
    .join(' ');
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

function getPrimaryRoleLabel(roleSlugs: string[]) {
  const [primaryRole] = normalizeRoleList(roleSlugs);
  if (primaryRole) {
    return formatRoleLabel(primaryRole);
  }

  return 'Pending';
}

export function userHasRole(user: Pick<AppUser, 'roles'> | null | undefined, role: string) {
  const target = normalizeRoleSlug(role);
  if (!target || !user) return false;
  return user.roles.some((item) => normalizeRoleSlug(item) === target);
}

export function userHasAnyRole(user: Pick<AppUser, 'roles'> | null | undefined, roles: readonly string[]) {
  return roles.some((role) => userHasRole(user, role));
}

export function canAccessTrainingModule(user: Pick<AppUser, 'roles'> | null | undefined) {
  return userHasAnyRole(user, MODULE_ACCESS_ROLE_SLUGS.training);
}

export function canAccessMatchDayModule(user: Pick<AppUser, 'roles'> | null | undefined) {
  return userHasAnyRole(user, MODULE_ACCESS_ROLE_SLUGS.matchDay);
}

export function canAccessTransportModule(user: Pick<AppUser, 'roles'> | null | undefined) {
  return userHasAnyRole(user, MODULE_ACCESS_ROLE_SLUGS.transport);
}

export function canAccessScoutingModule(user: Pick<AppUser, 'roles'> | null | undefined) {
  return userHasAnyRole(user, MODULE_ACCESS_ROLE_SLUGS.scouting);
}

export function canAccessPlayerHub(user: Pick<AppUser, 'roles'> | null | undefined) {
  return userHasAnyRole(user, MODULE_ACCESS_ROLE_SLUGS.playerHub);
}

export function canCreateScoutingReports(user: Pick<AppUser, 'roles'> | null | undefined) {
  return userHasAnyRole(user, MODULE_ACCESS_ROLE_SLUGS.scoutingAuthoring);
}

export function canAccessOversightModule(user: Pick<AppUser, 'roles'> | null | undefined) {
  return userHasAnyRole(user, MODULE_ACCESS_ROLE_SLUGS.oversight);
}

export function canManageAnnouncements(user: Pick<AppUser, 'roles'> | null | undefined) {
  return userHasAnyRole(user, ['admin', 'executive_director', 'technical_director']);
}

export function getPrimaryRoleSlug(user: Pick<AppUser, 'roles'> | null | undefined) {
  if (!user) return 'pending';
  return normalizeRoleList(user.roles)[0] || 'pending';
}

export function getDefaultModulePath(user: Pick<AppUser, 'roles'> | null | undefined) {
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

function toAppUser(profile: ProfileRow, roles: AppRole[], teams: AppTeam[]): AppUser {
  const normalizedRoles = normalizeRoleList(roles.map((item) => item.slug));
  const roleLabels = roles
    .map((item) => item.label?.trim() || formatRoleLabel(item.slug))
    .filter(Boolean);

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name || getDisplayName(profile.email),
    organization: profile.organization || '',
    role: getPrimaryRoleLabel(normalizedRoles),
    roles: normalizedRoles,
    roleLabels: roleLabels.length > 0 ? roleLabels : [getPrimaryRoleLabel(normalizedRoles)],
    teams,
  };
}

export async function getCurrentAuthUser() {
  assertSupabaseConfigured();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error('You must be signed in to continue.');
  }

  return user;
}

export async function getCurrentAppUser() {
  const user = await getCurrentAuthUser();
  return upsertProfile(user);
}

async function loadUserAccess(userId: string): Promise<{ roles: AppRole[]; teams: AppTeam[] }> {
  const [rolesResponse, teamsResponse] = await Promise.all([
    supabase
      .from('user_roles')
      .select('roles!inner(slug, label)')
      .eq('user_id', userId),
    supabase
      .from('user_team_assignments')
      .select('team_id, teams!inner(id, slug, name, is_active)')
      .eq('user_id', userId),
  ]);

  if (rolesResponse.error) {
    throw rolesResponse.error;
  }

  if (teamsResponse.error) {
    throw teamsResponse.error;
  }

  const roles = ((rolesResponse.data || []) as UserRoleJoinRow[])
    .flatMap((row) => {
      const joined = row.roles;
      if (!joined) return [];
      return Array.isArray(joined) ? joined : [joined];
    })
    .map((role) => ({
      slug: normalizeRoleSlug(role.slug),
      label: role.label?.trim() || formatRoleLabel(role.slug),
    }));

  const teams = ((teamsResponse.data || []) as UserTeamJoinRow[])
    .flatMap((row) => {
      const joined = row.teams;
      if (!joined) return [];
      return Array.isArray(joined) ? joined : [joined];
    })
    .map((team) => ({
      id: team.id,
      slug: team.slug,
      name: team.name,
      is_active: Boolean(team.is_active),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return { roles, teams };
}

async function upsertProfile(user: User) {
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, email, name, organization, role')
    .eq('id', user.id)
    .maybeSingle();

  const metadata = user.user_metadata || {};
  const payload = {
    id: user.id,
    email: user.email || '',
    name: metadata.name || getDisplayName(user.email),
    organization: metadata.organization || '',
    role: existingProfile?.role || 'Pending',
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload)
    .select('id, email, name, organization, role')
    .single();

  if (error) {
    throw error;
  }

  const access = await loadUserAccess(user.id);
  return toAppUser(data as ProfileRow, access.roles, access.teams);
}

async function hydrateAuthenticatedUser(user: User) {
  try {
    const { reconcilePendingStaffInvitations } = await import('./data');
    await reconcilePendingStaffInvitations();
  } catch (error) {
    console.warn('Could not reconcile pending staff invitations during authentication.', error);
  }

  return upsertProfile(user);
}

export async function getSessionWithProfile(): Promise<{ session: Session | null; user: AppUser | null }> {
  assertSupabaseConfigured();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session) {
    return { session: null, user: null };
  }

  const user = await hydrateAuthenticatedUser(session.user);
  return { session, user };
}

export function subscribeToAuthChanges(
  callback: (payload: { session: Session | null; user: AppUser | null }) => void,
) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_, session) => {
    void (async () => {
      if (!session) {
        callback({ session: null, user: null });
        return;
      }

      try {
        const user = await hydrateAuthenticatedUser(session.user);
        callback({ session, user });
      } catch (error) {
        console.error('Failed to hydrate profile after auth change.', error);
        if (isAuthSessionMissingUserError(error)) {
          try {
            await clearLocalAuthSession();
          } catch (signOutError) {
            console.warn('Failed to clear invalid auth session after change event.', signOutError);
          }
        }
        callback({ session: null, user: null });
      }
    })();
  });

  return () => subscription.unsubscribe();
}

export async function signIn(email: string, password: string) {
  assertSupabaseConfigured();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  if (!data.session) {
    throw new Error('Sign-in succeeded but no session was returned.');
  }

  const user = await hydrateAuthenticatedUser(data.user);
  return { session: data.session, user };
}

export async function signUp(
  email: string,
  password: string,
  name: string,
  organization: string,
) {
  assertSupabaseConfigured();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        organization,
      },
    },
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Account creation failed. Please try again.');
  }

  if (!data.session) {
    return {
      session: null,
      user: null,
      emailConfirmationRequired: true,
    };
  }

  const user = await hydrateAuthenticatedUser(data.user);
  return {
    session: data.session,
    user,
    emailConfirmationRequired: false,
  };
}

export async function signOut() {
  assertSupabaseConfigured();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function clearLocalAuthSession() {
  assertSupabaseConfigured();
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) {
    throw error;
  }
}

export async function requestPasswordReset(email: string) {
  assertSupabaseConfigured();

  const explicitAppUrl = import.meta.env.VITE_APP_URL?.trim();
  const redirectTo =
    explicitAppUrl && explicitAppUrl.length > 0
      ? `${explicitAppUrl.replace(/\/$/, '')}/reset-password`
      : typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    throw error;
  }
}

export async function updatePassword(nextPassword: string) {
  assertSupabaseConfigured();

  const { error } = await supabase.auth.updateUser({
    password: nextPassword,
  });

  if (error) {
    throw error;
  }
}
