import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { format, startOfWeek } from 'date-fns';

loadEnv({ path: '.env.local' });

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  throw new Error('Usage: node scripts/.tmp-oversight-slice4-smoke.mjs <email> <password>');
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

const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

if (signInError || !signInData.user) {
  throw new Error(`Sign in failed: ${signInError?.message || 'unknown error'}`);
}

const userId = signInData.user.id;
const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
const today = format(new Date(), 'yyyy-MM-dd');

const [rolesRes, profileRes] = await Promise.all([
  supabase.from('user_roles').select('roles!inner(slug, label)').eq('user_id', userId),
  supabase.from('profiles').select('id, email, name').eq('id', userId).single(),
]);

if (rolesRes.error) throw rolesRes.error;
if (profileRes.error) throw profileRes.error;

const roles = (rolesRes.data || [])
  .flatMap((row) => (Array.isArray(row.roles) ? row.roles : row.roles ? [row.roles] : []))
  .map((role) => role.slug);

const canAccess = roles.some((role) => ['admin', 'technical_director', 'board_observer'].includes(role));
const canSeeStaffCoverage = roles.some((role) => ['admin', 'technical_director'].includes(role));
const canSeeInvitationFeed = roles.includes('admin');

if (!canAccess) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        stage: 'permission-check',
        message: 'User does not have oversight access.',
        roles,
      },
      null,
      2,
    ),
  );
  await supabase.auth.signOut();
  process.exit(0);
}

const [
  profilesRes,
  teamsRes,
  trainingRes,
  transportRes,
  reportsRes,
  userRolesRes,
  assignmentsRes,
  invitesRes,
] = await Promise.all([
  supabase.from('profiles').select('id, email, name'),
  supabase.from('teams').select('id, slug, name, is_active').eq('is_active', true).order('sort_order', { ascending: true }),
  supabase
    .from('training_plans')
    .select('id, team_id, week_start, status')
    .eq('week_start', weekStart),
  supabase
    .from('transport_plans')
    .select('id, team_id, status, driver_user_id, event_date')
    .gte('event_date', today)
    .neq('status', 'cancelled')
    .neq('status', 'completed'),
  supabase
    .from('reports')
    .select('id, created_at')
    .order('created_at', { ascending: false })
    .limit(12),
  canSeeStaffCoverage
    ? supabase.from('user_roles').select('user_id, roles!inner(slug, label)')
    : Promise.resolve({ data: [], error: null }),
  canSeeStaffCoverage
    ? supabase.from('user_team_assignments').select('user_id, team_id')
    : Promise.resolve({ data: [], error: null }),
  canSeeInvitationFeed
    ? supabase.from('staff_invitations').select('id, status').order('created_at', { ascending: false }).limit(12)
    : Promise.resolve({ data: [], error: null }),
]);

if (profilesRes.error) throw profilesRes.error;
if (teamsRes.error) throw teamsRes.error;
if (trainingRes.error) throw trainingRes.error;
if (transportRes.error) throw transportRes.error;
if (reportsRes.error) throw reportsRes.error;
if ('error' in userRolesRes && userRolesRes.error) throw userRolesRes.error;
if ('error' in assignmentsRes && assignmentsRes.error) throw assignmentsRes.error;
if ('error' in invitesRes && invitesRes.error) throw invitesRes.error;

const pendingInvitations = (invitesRes.data || []).filter((row) => row.status === 'pending').length;

await supabase.auth.signOut();

console.log(
  JSON.stringify(
    {
      ok: true,
      user: {
        email,
        name: profileRes.data.name || profileRes.data.email,
        roles,
      },
      weekStart,
      metrics: {
        staffAccounts: (profilesRes.data || []).length,
        activeTeams: (teamsRes.data || []).length,
        trainingCoverage: new Set((trainingRes.data || []).map((row) => row.team_id)).size,
        upcomingTransportPlans: (transportRes.data || []).length,
        reportsLast7Days: (reportsRes.data || []).length,
        pendingInvitations,
      },
      visibility: {
        canSeeStaffCoverage,
        canSeeInvitationFeed,
      },
      rows: {
        trainingPlans: (trainingRes.data || []).length,
        transportPlans: (transportRes.data || []).length,
        reports: (reportsRes.data || []).length,
        roleAssignments: (userRolesRes.data || []).length,
        teamAssignments: (assignmentsRes.data || []).length,
        invitations: (invitesRes.data || []).length,
      },
    },
    null,
    2,
  ),
);
