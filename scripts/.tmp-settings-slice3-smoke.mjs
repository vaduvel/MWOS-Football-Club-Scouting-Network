import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: '.env.local' });

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  throw new Error('Usage: node scripts/.tmp-settings-slice3-smoke.mjs <email> <password>');
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function unwrapJoined(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

if (signInError || !signInData.user) {
  throw new Error(`Sign in failed: ${signInError?.message || 'unknown error'}`);
}

const userId = signInData.user.id;

const [profileRes, userSettingsRes, rolesRes, teamsRes, userRolesRes, assignmentsRes, invitationsRes] = await Promise.all([
  supabase.from('profiles').select('id, email, name, organization, role').eq('id', userId).single(),
  supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
  supabase.from('roles').select('slug, label, description').order('label', { ascending: true }),
  supabase.from('teams').select('id, slug, name, is_active').order('sort_order', { ascending: true }),
  supabase.from('user_roles').select('user_id, roles!inner(slug, label)').eq('user_id', userId),
  supabase.from('user_team_assignments').select('user_id, team_id, teams!inner(id, slug, name, is_active)').eq('user_id', userId),
  supabase
    .from('staff_invitations')
    .select(`
      id,
      email,
      full_name,
      status,
      resolved_user_id,
      message_type,
      last_sent_at,
      accepted_at,
      cancelled_at,
      expires_at,
      created_at,
      updated_at,
      inviter_user_id,
      staff_invitation_roles (
        role_id,
        roles (
          id,
          slug,
          label
        )
      ),
      staff_invitation_teams (
        team_id,
        teams (
          id,
          slug,
          name,
          is_active
        )
      )
    `)
    .order('created_at', { ascending: false }),
]);

for (const [name, response] of Object.entries({
  profileRes,
  userSettingsRes,
  rolesRes,
  teamsRes,
  userRolesRes,
  assignmentsRes,
  invitationsRes,
})) {
  if (response.error) {
    throw new Error(`${name} failed: ${response.error.message}`);
  }
}

const roles = (userRolesRes.data || [])
  .flatMap((row) => unwrapJoined(row.roles))
  .map((role) => role.slug);

const assignments = (assignmentsRes.data || []).flatMap((row) => unwrapJoined(row.teams)).map((team) => team.name);

console.log(
  JSON.stringify(
    {
      ok: true,
      profile: profileRes.data,
      settingsLoaded: Boolean(userSettingsRes.data),
      availableRoles: rolesRes.data?.length || 0,
      availableTeams: teamsRes.data?.length || 0,
      userRoles: roles,
      userTeams: assignments,
      invitationsLoaded: invitationsRes.data?.length || 0,
    },
    null,
    2,
  ),
);

await supabase.auth.signOut();
