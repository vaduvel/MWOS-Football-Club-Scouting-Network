import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { format, startOfWeek, subDays } from 'date-fns';

loadEnv({ path: '.env.local' });

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  throw new Error('Usage: node scripts/.tmp-club-home-smoke.mjs <email> <password>');
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

function getViewMode(roles) {
  if (roles.some((role) => ['admin', 'technical_director', 'board_observer'].includes(role))) {
    return 'leadership';
  }
  if (roles.includes('coach')) return 'coach';
  if (roles.includes('driver')) return 'driver';
  if (roles.includes('scout')) return 'scout';
  return 'pending';
}

const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

if (signInError || !signInData.user) {
  throw new Error(`Sign in failed: ${signInError?.message || 'unknown error'}`);
}

const userId = signInData.user.id;
const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
const reportsSince = subDays(new Date(), 7).toISOString();

const [profileRes, rolesRes, assignmentsRes] = await Promise.all([
  supabase.from('profiles').select('id, email, name').eq('id', userId).single(),
  supabase.from('user_roles').select('roles!inner(slug, label)').eq('user_id', userId),
  supabase.from('user_team_assignments').select('team_id, teams!inner(id, slug, name)').eq('user_id', userId),
]);

if (profileRes.error) throw profileRes.error;
if (rolesRes.error) throw rolesRes.error;
if (assignmentsRes.error) throw assignmentsRes.error;

const roles = (rolesRes.data || [])
  .flatMap((row) => (Array.isArray(row.roles) ? row.roles : row.roles ? [row.roles] : []))
  .map((role) => role.slug);

const view = getViewMode(roles);
const canTraining = roles.some((role) => ['admin', 'technical_director', 'coach'].includes(role));
const canTransport = roles.some((role) => ['admin', 'technical_director', 'coach', 'driver'].includes(role));
const canScouting = roles.some((role) => ['admin', 'scout'].includes(role));
const canLeadership = roles.some((role) => ['admin', 'technical_director', 'board_observer'].includes(role));

const [notificationsRes, trainingRes, transportRes, reportsRes, invitesRes] = await Promise.all([
  supabase
    .from('app_notifications')
    .select('id, type, title, read_at')
    .eq('recipient_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(6),
  canTraining
    ? supabase.from('training_plans').select('id, team_id, status').eq('week_start', weekStart)
    : Promise.resolve({ data: [], error: null }),
  canTransport
    ? supabase
        .from('transport_plans')
        .select('id, team_id, status, event_date')
        .neq('status', 'cancelled')
        .neq('status', 'completed')
        .order('event_date', { ascending: true })
        .limit(6)
    : Promise.resolve({ data: [], error: null }),
  canScouting
    ? supabase
        .from('reports')
        .select('id, created_at')
        .gte('created_at', reportsSince)
        .order('created_at', { ascending: false })
        .limit(6)
    : Promise.resolve({ data: [], error: null }),
  canLeadership
    ? supabase
        .from('staff_invitations')
        .select('id, status')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(6)
    : Promise.resolve({ data: [], error: null }),
]);

if (notificationsRes.error) throw notificationsRes.error;
if ('error' in trainingRes && trainingRes.error) throw trainingRes.error;
if ('error' in transportRes && transportRes.error) throw transportRes.error;
if ('error' in reportsRes && reportsRes.error) throw reportsRes.error;
if ('error' in invitesRes && invitesRes.error) throw invitesRes.error;

await supabase.auth.signOut();

console.log(
  JSON.stringify(
    {
      ok: true,
      user: {
        email,
        name: profileRes.data.name || profileRes.data.email,
        roles,
        view,
      },
      assignedTeams: (assignmentsRes.data || []).length,
      counts: {
        notifications: (notificationsRes.data || []).length,
        unreadNotifications: (notificationsRes.data || []).filter((item) => !item.read_at).length,
        trainingPlans: (trainingRes.data || []).length,
        upcomingTransport: (transportRes.data || []).length,
        reportsLast7Days: (reportsRes.data || []).length,
        pendingInvitations: (invitesRes.data || []).length,
      },
    },
    null,
    2,
  ),
);
