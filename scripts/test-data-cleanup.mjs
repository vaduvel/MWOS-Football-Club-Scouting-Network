import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { buildStaffMaintenanceSummary } from '../src/lib/staffOperationsDomain.ts';

loadEnv({ path: '.env.local' });

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const includeUsers = args.has('--users');
const includeInvitations = args.has('--invitations');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
}

if (apply && !includeUsers && !includeInvitations) {
  throw new Error('Use --users and/or --invitations together with --apply.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function toJoinedRows(entry, key) {
  const raw = entry?.[key];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function mapInvitationRoles(rows) {
  return rows
    .flatMap((row) => toJoinedRows(row, 'roles'))
    .map((role) => ({
      slug: String(role.slug || '').trim().toLowerCase(),
      label: role.label?.trim() || String(role.slug || ''),
    }));
}

function mapInvitationTeams(rows) {
  return rows
    .flatMap((row) => toJoinedRows(row, 'teams'))
    .map((team) => ({
      name: team.name,
    }));
}

const [{ data: profiles, error: profilesError }, { data: roleRows, error: roleRowsError }, { data: teamRows, error: teamRowsError }, { data: invitations, error: invitationsError }] =
  await Promise.all([
    supabase.from('profiles').select('id, email, name'),
    supabase.from('user_roles').select('user_id, roles!inner(slug, label)'),
    supabase.from('user_team_assignments').select('user_id, teams!inner(name)'),
    supabase
      .from('staff_invitations')
      .select(`
        id,
        email,
        full_name,
        status,
        created_at,
        updated_at,
        expires_at,
        staff_invitation_roles (
          role_id,
          roles (
            slug,
            label
          )
        ),
        staff_invitation_teams (
          team_id,
          teams (
            name
          )
        )
      `),
  ]);

if (profilesError) throw profilesError;
if (roleRowsError) throw roleRowsError;
if (teamRowsError) throw teamRowsError;
if (invitationsError) throw invitationsError;

const rolesByUser = new Map();
for (const row of roleRows || []) {
  const existing = rolesByUser.get(row.user_id) || [];
  const joinedRoles = toJoinedRows(row, 'roles').map((role) => ({
    slug: String(role.slug || '').trim().toLowerCase(),
    label: role.label?.trim() || String(role.slug || ''),
  }));
  rolesByUser.set(row.user_id, existing.concat(joinedRoles));
}

const teamsByUser = new Map();
for (const row of teamRows || []) {
  const existing = teamsByUser.get(row.user_id) || [];
  const joinedTeams = toJoinedRows(row, 'teams').map((team) => ({
    name: team.name,
  }));
  teamsByUser.set(row.user_id, existing.concat(joinedTeams));
}

const users = (profiles || []).map((profile) => ({
  id: profile.id,
  name: profile.name || profile.email?.split('@')[0] || 'Unknown',
  email: profile.email,
  roles: rolesByUser.get(profile.id) || [],
  teams: teamsByUser.get(profile.id) || [],
}));

const invitationRecords = (invitations || []).map((invitation) => ({
  id: invitation.id,
  fullName: invitation.full_name,
  email: invitation.email,
  status: invitation.status,
  roles: mapInvitationRoles(invitation.staff_invitation_roles || []),
  teams: mapInvitationTeams(invitation.staff_invitation_teams || []),
  createdAt: invitation.created_at,
  updatedAt: invitation.updated_at,
  expiresAt: invitation.expires_at,
}));

const summary = buildStaffMaintenanceSummary({
  users,
  invitations: invitationRecords,
});

const result = {
  ok: true,
  mode: apply ? 'apply' : 'dry-run',
  candidates: {
    invitations: summary.likelyTestInvitations,
    users: summary.likelyTestUsers,
  },
  applied: {
    deletedInvitationCount: 0,
    deletedUserCount: 0,
  },
};

if (apply && includeInvitations && summary.likelyTestInvitations.length > 0) {
  const invitationIds = summary.likelyTestInvitations.map((item) => item.id);
  const { error } = await supabase.from('staff_invitations').delete().in('id', invitationIds);
  if (error) throw error;
  result.applied.deletedInvitationCount = invitationIds.length;
}

if (apply && includeUsers && summary.likelyTestUsers.length > 0) {
  for (const user of summary.likelyTestUsers) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      throw error;
    }
    result.applied.deletedUserCount += 1;
  }
}

console.log(JSON.stringify(result, null, 2));
