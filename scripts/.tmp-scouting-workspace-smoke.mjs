import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: '.env.local' });

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  throw new Error('Usage: node scripts/.tmp-scouting-workspace-smoke.mjs <email> <password>');
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars.');
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

const [reportsRes, playersRes, watchlistRes] = await Promise.all([
  supabase
    .from('reports')
    .select('id, created_at')
    .order('created_at', { ascending: false })
    .limit(12),
  supabase
    .from('players')
    .select('id')
    .limit(250),
  supabase
    .from('watchlist_players')
    .select('id')
    .eq('user_id', userId)
    .limit(250),
]);

if (reportsRes.error) throw reportsRes.error;
if (playersRes.error) throw playersRes.error;
if (watchlistRes.error) throw watchlistRes.error;

const reports = reportsRes.data || [];
const players = playersRes.data || [];
const watchlist = watchlistRes.data || [];

const sampleReportId = reports[0]?.id || null;

await supabase.auth.signOut();

console.log(
  JSON.stringify(
    {
      ok: true,
      user: email,
      counts: {
        reports: reports.length,
        trackedPlayers: players.length,
        shortlist: watchlist.length,
        recentReports: reports.length,
      },
      sampleReportId,
      reportEditorPath: sampleReportId ? `/scouting/report/${sampleReportId}` : '/scouting/report/new',
    },
    null,
    2,
  ),
);
