import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { handler as inviteStaffHandler } from '../netlify/functions/invite-staff.js';

loadEnv({ path: '.env.local' });

const [adminEmail, adminPassword, inviteEmail, deliveryMode = 'email'] = process.argv.slice(2);

if (!adminEmail || !adminPassword || !inviteEmail) {
  throw new Error('Usage: node scripts/.tmp-invite-staff-smoke.mjs <admin-email> <admin-password> <invite-email> [email|manual_link|whatsapp_share]');
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const appBaseUrl = process.env.VITE_APP_URL || 'http://127.0.0.1:3005';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase public env vars.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
  email: adminEmail,
  password: adminPassword,
});

if (signInError || !signInData.session) {
  throw new Error(`Sign in failed: ${signInError?.message || 'unknown error'}`);
}

const accessToken = signInData.session.access_token;

const { data: firstTeamRow, error: firstTeamError } = await supabase
  .from('teams')
  .select('id, slug, name')
  .eq('slug', 'first-team')
  .single();

if (firstTeamError || !firstTeamRow) {
  throw new Error(`Failed to resolve first-team: ${firstTeamError?.message || 'missing team'}`);
}

const targetName = 'Daniel Vaduva Invite Smoke';
const invitePayload = {
  fullName: targetName,
  email: inviteEmail,
  roleSlugs: ['coach'],
  teamIds: [firstTeamRow.id],
  deliveryMode,
};

const response = await inviteStaffHandler({
  httpMethod: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(invitePayload),
});

const body = response?.body ? JSON.parse(response.body) : {};

const { data: inviteRows, error: inviteRowsError } = await supabase
  .from('staff_invitations')
  .select('id, email, full_name, status, message_type, created_at, resolved_user_id')
  .eq('email_normalized', inviteEmail.trim().toLowerCase())
  .order('created_at', { ascending: false })
  .limit(3);

if (inviteRowsError) {
  throw new Error(`Invite lookup failed: ${inviteRowsError.message}`);
}

console.log(
  JSON.stringify(
    {
      ok: Number(response.statusCode) >= 200 && Number(response.statusCode) < 300,
      status: response.statusCode,
      body,
      activationLinkReturned: Boolean(body?.activationLink),
      deliveryStatus: body?.delivery?.status || null,
      deliveryMode,
      inviteRows: inviteRows || [],
      appBaseUrl,
    },
    null,
    2,
  ),
);

await supabase.auth.signOut();
