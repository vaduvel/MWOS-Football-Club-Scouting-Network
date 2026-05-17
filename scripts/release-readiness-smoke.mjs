import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { format, startOfWeek, subDays } from 'date-fns';
import { getAdminAiRuntimeStatus } from '../server/admin-ai.js';
import { getEmailRuntimeStatus } from '../netlify/functions/_shared.js';
import { buildLaunchReadiness } from '../src/lib/settingsReadinessDomain.ts';

loadEnv({ path: '.env.local' });

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  throw new Error('Usage: node scripts/release-readiness-smoke.mjs <admin-email> <admin-password>');
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const publicAppUrl = process.env.VITE_APP_URL || process.env.APP_BASE_URL || '';

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
const reportsSince = subDays(new Date(), 7).toISOString();
const today = format(new Date(), 'yyyy-MM-dd');
const nowIso = new Date().toISOString();

const [profileRes, rolesRes, settingsRes, invitesRes, trainingRes, transportRes, reportsRes] = await Promise.all([
  supabase.from('profiles').select('id, email, name').eq('id', userId).single(),
  supabase.from('user_roles').select('roles!inner(slug, label)').eq('user_id', userId),
  supabase
    .from('user_settings')
    .select(
      'football_api_provider, football_api_key, email_training_plan_published, email_training_td_comment, email_training_reminder, email_training_schedule_change, email_transport_updates',
    )
    .eq('user_id', userId)
    .maybeSingle(),
  supabase
    .from('staff_invitations')
    .select('id, status, expires_at')
    .order('created_at', { ascending: false }),
  supabase
    .from('training_plans')
    .select('id, status')
    .eq('week_start', weekStart),
  supabase
    .from('transport_plans')
    .select('id, status, event_date')
    .gte('event_date', today),
  supabase
    .from('reports')
    .select('id, created_at')
    .gte('created_at', reportsSince),
]);

if (profileRes.error) throw profileRes.error;
if (rolesRes.error) throw rolesRes.error;
if (settingsRes.error) throw settingsRes.error;
if (invitesRes.error) throw invitesRes.error;
if (trainingRes.error) throw trainingRes.error;
if (transportRes.error) throw transportRes.error;
if (reportsRes.error) throw reportsRes.error;

const roles = (rolesRes.data || [])
  .flatMap((row) => (Array.isArray(row.roles) ? row.roles : row.roles ? [row.roles] : []))
  .map((role) => role.slug);

const footballApiProvider = settingsRes.data?.football_api_provider || 'api-football';
const footballApiKey = settingsRes.data?.football_api_key || '';
const adminAiStatus = getAdminAiRuntimeStatus();
const adminEmailStatus = getEmailRuntimeStatus();
const launchReadiness = buildLaunchReadiness({
  publicAppUrl,
  footballApiProvider,
  footballApiKey,
  adminAiStatus,
  adminEmailStatus,
});

const pendingInvitations = (invitesRes.data || []).filter((item) => item.status === 'pending');
const stalePendingInvitations = pendingInvitations.filter((item) => item.expires_at && item.expires_at < nowIso);

await supabase.auth.signOut();

console.log(
  JSON.stringify(
    {
      ok: true,
      admin: {
        email,
        name: profileRes.data.name || profileRes.data.email,
        roles,
      },
      publicAppUrl,
      launchReadiness,
      counts: {
        pendingInvitations: pendingInvitations.length,
        stalePendingInvitations: stalePendingInvitations.length,
        trainingPlansThisWeek: (trainingRes.data || []).length,
        upcomingTransportPlans: (transportRes.data || []).length,
        reportsLast7Days: (reportsRes.data || []).length,
      },
      integrationSnapshot: {
        footballApiProvider,
        hasFootballApiKey: footballApiKey.trim().length > 0,
        adminAiConfigured: adminAiStatus.configured,
        emailDeliveryConfigured: adminEmailStatus.configured,
      },
    },
    null,
    2,
  ),
);
