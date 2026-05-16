import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: '.env.local' });

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  throw new Error('Usage: node scripts/.tmp-notifications-workspace-smoke.mjs <email> <password>');
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

const notificationsRes = await supabase
  .from('app_notifications')
  .select('id, type, title, read_at, email_sent_at, created_at')
  .eq('recipient_user_id', userId)
  .order('created_at', { ascending: false })
  .limit(12);

if (notificationsRes.error) throw notificationsRes.error;

const items = notificationsRes.data || [];
const trainingCount = items.filter((item) => item.type !== 'transport_plan_updated').length;
const transportCount = items.filter((item) => item.type === 'transport_plan_updated').length;
const unreadCount = items.filter((item) => !item.read_at).length;
const emailedCount = items.filter((item) => Boolean(item.email_sent_at)).length;

await supabase.auth.signOut();

console.log(
  JSON.stringify(
    {
      ok: true,
      user: email,
      counts: {
        total: items.length,
        unread: unreadCount,
        training: trainingCount,
        transport: transportCount,
        emailed: emailedCount,
      },
    },
    null,
    2,
  ),
);
