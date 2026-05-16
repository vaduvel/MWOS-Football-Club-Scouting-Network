import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: '.env.local' });

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  throw new Error('Usage: node scripts/.tmp-training-slice2-smoke.mjs <email> <password>');
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

function addDays(date, count) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getWeekStart(offsetWeeks = 4) {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = addDays(now, mondayOffset + offsetWeeks * 7);
  monday.setHours(12, 0, 0, 0);
  return monday;
}

function buildDays(weekStart) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    if (index === 0 || index === 3) {
      return {
        day_index: index,
        weekday_label: date.toLocaleDateString('en-GB', { weekday: 'long' }),
        calendar_date: formatDate(date),
        day_type: 'training',
        session_title: index === 0 ? 'Speed and lower body' : 'Upper body and conditioning',
        session_type: index === 0 ? 'field' : 'gym',
        start_time: index === 0 ? '10:00' : '15:30',
        end_time: index === 0 ? '11:30' : '17:00',
        location: index === 0 ? 'Main Pitch' : 'Gym Hall',
        focus_tags: index === 0 ? ['speed', 'power', 'lower-body'] : ['upper-body', 'conditioning'],
        intensity: index === 0 ? 3 : 2,
        volume: index === 0 ? 2 : 3,
        objectives: index === 0 ? 'Explosive work and sprint quality.' : 'Strength plus metabolic conditioning.',
        exercises: index === 0 ? 'Flying sprints, drop jumps, back squats.' : 'Bench press, bike intervals.',
        notes: 'Smoke test session.',
      };
    }

    if (index === 2 || index === 5) {
      return {
        day_index: index,
        weekday_label: date.toLocaleDateString('en-GB', { weekday: 'long' }),
        calendar_date: formatDate(date),
        day_type: 'active_recovery',
        session_title: 'Active recovery',
        session_type: 'recovery',
        start_time: null,
        end_time: null,
        location: 'Recovery Zone',
        focus_tags: ['recovery'],
        intensity: 1,
        volume: 1,
        objectives: 'Promote recovery.',
        exercises: 'Mobility and low-intensity flush work.',
        notes: 'Smoke test recovery block.',
      };
    }

    return {
      day_index: index,
      weekday_label: date.toLocaleDateString('en-GB', { weekday: 'long' }),
      calendar_date: formatDate(date),
      day_type: 'rest',
      session_title: 'Rest day',
      session_type: 'recovery',
      start_time: null,
      end_time: null,
      location: null,
      focus_tags: [],
      intensity: 1,
      volume: 1,
      objectives: 'Rest and reset.',
      exercises: null,
      notes: 'Smoke test rest day.',
    };
  });
}

const {
  data: signInData,
  error: signInError,
} = await supabase.auth.signInWithPassword({ email, password });

if (signInError || !signInData.user) {
  throw new Error(`Sign in failed: ${signInError?.message || 'unknown error'}`);
}

const userId = signInData.user.id;

const [profileRes, rolesRes, assignmentsRes] = await Promise.all([
  supabase.from('profiles').select('id, email, name, role').eq('id', userId).single(),
  supabase.from('user_roles').select('roles!inner(slug, label)').eq('user_id', userId),
  supabase.from('user_team_assignments').select('team_id, teams!inner(id, slug, name)').eq('user_id', userId),
]);

if (profileRes.error) throw profileRes.error;
if (rolesRes.error) throw rolesRes.error;
if (assignmentsRes.error) throw assignmentsRes.error;

const roles = (rolesRes.data || []).flatMap((row) => (Array.isArray(row.roles) ? row.roles : [row.roles])).map((role) => role.slug);
const isClubWide = roles.includes('admin') || roles.includes('technical_director');

let team = null;

if (isClubWide) {
  const teamsRes = await supabase.from('teams').select('id, slug, name').eq('is_active', true).order('sort_order', { ascending: true }).limit(1).single();
  if (teamsRes.error) throw teamsRes.error;
  team = teamsRes.data;
} else {
  const firstAssignment = assignmentsRes.data?.[0];
  const joinedTeam = Array.isArray(firstAssignment?.teams) ? firstAssignment.teams[0] : firstAssignment?.teams;
  team = joinedTeam || null;
}

if (!team) {
  throw new Error(`No accessible team found for user. Roles: ${roles.join(', ') || 'none'}`);
}

const canManage = roles.includes('admin') || roles.includes('coach');
const canComment = canManage || roles.includes('technical_director');

const weekStart = getWeekStart(4);
const weekStartIso = formatDate(weekStart);
const headline = `Smoke test plan ${weekStartIso}`;
const objective = 'Verify Slice 2 training schema and RLS.';

const cleanupExistingRes = await supabase
  .from('training_plans')
  .delete()
  .eq('team_id', team.id)
  .eq('week_start', weekStartIso)
  .eq('created_by', userId);

if (cleanupExistingRes.error) throw cleanupExistingRes.error;

const insertPlanRes = await supabase
  .from('training_plans')
  .insert({
    team_id: team.id,
    week_start: weekStartIso,
    headline,
    objective,
    status: 'draft',
    created_by: userId,
    updated_by: userId,
  })
  .select('id, team_id, week_start, status')
  .single();

if (!canManage) {
  console.log(JSON.stringify({
    ok: false,
    stage: 'permission-check',
    message: 'User does not have coach/admin manage access for training plans.',
    roles,
    team: team.name,
  }, null, 2));
  await supabase.auth.signOut();
  process.exit(0);
}

if (insertPlanRes.error) throw insertPlanRes.error;
const plan = insertPlanRes.data;

const days = buildDays(weekStart).map((day) => ({
  plan_id: plan.id,
  ...day,
}));

const upsertDaysRes = await supabase
  .from('training_plan_days')
  .upsert(days, { onConflict: 'plan_id,day_index' })
  .select('id, day_index, day_type, start_time, end_time, location');

if (upsertDaysRes.error) throw upsertDaysRes.error;

let commentId = null;
if (canComment) {
  const commentRes = await supabase
    .from('training_plan_comments')
    .insert({
      plan_id: plan.id,
      day_id: null,
      author_id: userId,
      author_name: profileRes.data.name || profileRes.data.email || 'MWOS Staff',
      author_role_label: roles.includes('technical_director')
        ? 'Technical Director'
        : roles.includes('admin')
          ? 'Admin'
          : 'Coach',
      content: 'Smoke test comment for Slice 2 verification.',
    })
    .select('id')
    .single();

  if (commentRes.error) throw commentRes.error;
  commentId = commentRes.data.id;
}

const [workspacePlanRes, workspaceDaysRes, commentsCountRes] = await Promise.all([
  supabase
    .from('training_plans')
    .select('id, team_id, week_start, headline, objective, status')
    .eq('id', plan.id)
    .single(),
  supabase
    .from('training_plan_days')
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', plan.id),
  supabase
    .from('training_plan_comments')
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', plan.id),
]);

if (workspacePlanRes.error) throw workspacePlanRes.error;
if (workspaceDaysRes.error) throw workspaceDaysRes.error;
if (commentsCountRes.error) throw commentsCountRes.error;

const cleanupRes = await supabase.from('training_plans').delete().eq('id', plan.id);
if (cleanupRes.error) throw cleanupRes.error;

await supabase.auth.signOut();

console.log(JSON.stringify({
  ok: true,
  user: {
    email,
    roles,
    team: team.name,
  },
  smoke: {
    createdPlanId: plan.id,
    dayCount: workspaceDaysRes.count || 0,
    commentCount: commentsCountRes.count || 0,
    commentCreated: Boolean(commentId),
    status: workspacePlanRes.data.status,
  },
  cleanup: 'deleted smoke training plan and cascading records',
}, null, 2));
