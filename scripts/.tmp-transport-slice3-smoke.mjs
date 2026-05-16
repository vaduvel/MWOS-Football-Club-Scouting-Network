import { config as loadEnv } from 'dotenv';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: '.env.local' });

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  throw new Error('Usage: node scripts/.tmp-transport-slice3-smoke.mjs <email> <password>');
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

const [profileRes, rolesRes, assignmentsRes, driversRolesRes] = await Promise.all([
  supabase.from('profiles').select('id, email, name, role').eq('id', userId).single(),
  supabase.from('user_roles').select('roles!inner(slug, label)').eq('user_id', userId),
  supabase.from('user_team_assignments').select('team_id, teams!inner(id, slug, name)').eq('user_id', userId),
  supabase.from('user_roles').select('user_id, roles!inner(slug)').eq('roles.slug', 'driver'),
]);

if (profileRes.error) throw profileRes.error;
if (rolesRes.error) throw rolesRes.error;
if (assignmentsRes.error) throw assignmentsRes.error;
if (driversRolesRes.error) throw driversRolesRes.error;

const roles = (rolesRes.data || []).flatMap((row) => (Array.isArray(row.roles) ? row.roles : [row.roles])).map((role) => role.slug);
const canCreate = roles.includes('admin') || roles.includes('technical_director');

if (!canCreate) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        stage: 'permission-check',
        message: 'User does not have admin or technical_director access for transport plans.',
        roles,
      },
      null,
      2,
    ),
  );
  await supabase.auth.signOut();
  process.exit(0);
}

const firstAssignment = assignmentsRes.data?.[0];
const assignedTeam = Array.isArray(firstAssignment?.teams) ? firstAssignment.teams[0] : firstAssignment?.teams;

let team = assignedTeam || null;

if (!team) {
  const teamRes = await supabase
    .from('teams')
    .select('id, slug, name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(1)
    .single();
  if (teamRes.error) throw teamRes.error;
  team = teamRes.data;
}

const driverIds = Array.from(
  new Set(
    (driversRolesRes.data || []).flatMap((row) => {
      const joined = Array.isArray(row.roles) ? row.roles : row.roles ? [row.roles] : [];
      return joined.some((role) => role.slug === 'driver') ? [row.user_id] : [];
    }),
  ),
);

if (!driverIds.length) {
  throw new Error('No driver account exists yet. Assign at least one user the driver role before transport smoke testing.');
}

const driverProfilesRes = await supabase.from('profiles').select('id, email, name').in('id', driverIds);
if (driverProfilesRes.error) throw driverProfilesRes.error;
const driver = driverProfilesRes.data?.[0];

if (!driver) {
  throw new Error('Could not resolve a driver profile for transport smoke test.');
}

const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 14);
const eventDate = futureDate.toISOString().slice(0, 10);

const cleanupExistingRes = await supabase
  .from('transport_plans')
  .delete()
  .eq('team_id', team.id)
  .eq('title', 'Slice 3 transport smoke');

if (cleanupExistingRes.error) throw cleanupExistingRes.error;

const planId = randomUUID();
const insertPlanRes = await supabase
  .from('transport_plans')
  .insert({
    id: planId,
    team_id: team.id,
    title: 'Slice 3 transport smoke',
    context_type: 'match',
    event_date: eventDate,
    departure_time: '08:30',
    arrival_target_time: '10:15',
    meeting_point: 'Main Gate',
    destination: 'Harare Test Venue',
    driver_user_id: driver.id,
    contact_notes: 'Call the admin if the bus is late.',
    travel_notes: 'Smoke test trip.',
    status: 'published',
    created_by: userId,
    updated_by: userId,
    published_by: userId,
    published_at: new Date().toISOString(),
  });

if (insertPlanRes.error) throw insertPlanRes.error;

const planReadAfterInsertRes = await supabase
  .from('transport_plans')
  .select('id, title, team_id, status, destination, driver_user_id')
  .eq('id', planId)
  .single();

if (planReadAfterInsertRes.error) throw planReadAfterInsertRes.error;

const plan = planReadAfterInsertRes.data;

const insertCommentRes = await supabase
  .from('transport_plan_comments')
  .insert({
    plan_id: plan.id,
    author_id: userId,
    author_name: profileRes.data.name || profileRes.data.email || 'MWOS Staff',
    author_role_label: roles.includes('technical_director') ? 'Technical Director' : 'Admin',
    content: 'Smoke test comment for transport slice.',
  })
  .select('id')
  .single();

if (insertCommentRes.error) throw insertCommentRes.error;

const [planReadRes, commentsCountRes] = await Promise.all([
  supabase
    .from('transport_plans')
    .select('id, title, team_id, status, destination, driver_user_id')
    .eq('id', plan.id)
    .single(),
  supabase
    .from('transport_plan_comments')
    .select('id', { head: true, count: 'exact' })
    .eq('plan_id', plan.id),
]);

if (planReadRes.error) throw planReadRes.error;
if (commentsCountRes.error) throw commentsCountRes.error;

const cleanupPlanRes = await supabase.from('transport_plans').delete().eq('id', plan.id);
if (cleanupPlanRes.error) throw cleanupPlanRes.error;

await supabase.auth.signOut();

console.log(
  JSON.stringify(
    {
      ok: true,
      user: {
        email,
        roles,
      },
      team: team.name,
      driver: driver.name || driver.email,
      planCreated: Boolean(planReadRes.data?.id),
      commentCount: commentsCountRes.count || 0,
    },
    null,
    2,
  ),
);
