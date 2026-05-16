import { createClient } from '@supabase/supabase-js';

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  };
}

function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables.');
  }

  return { url, anonKey };
}

export function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
}

function getServiceSupabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase service role configuration.');
  }

  return { url, serviceRoleKey };
}

export function createServiceSupabaseClient() {
  const { url, serviceRoleKey } = getServiceSupabaseEnv();
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function getPublicAppUrl() {
  const value =
    process.env.APP_BASE_URL ||
    process.env.VITE_APP_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    '';

  return String(value).replace(/\/$/, '');
}

export async function sendTransactionalEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL;
  const replyTo = process.env.NOTIFICATION_REPLY_TO_EMAIL;

  if (!apiKey || !from) {
    return { skipped: true, reason: 'Email provider is not configured.' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || `Resend request failed with status ${response.status}.`);
  }

  return { skipped: false, body };
}

function getAuthorizedSupabaseClient(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) {
    return { error: json(401, { error: 'Missing Authorization header.' }) };
  }

  const { url, anonKey } = getSupabaseEnv();
  const supabase = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return { supabase };
}

export async function requireAuthenticatedUser(event) {
  const { supabase, error } = getAuthorizedSupabaseClient(event);
  if (error) {
    return { error };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: json(401, { error: 'Invalid or expired session.' }) };
  }

  return { supabase, user };
}

export async function requireAdminUser(event) {
  const auth = await requireAuthenticatedUser(event);
  if (auth.error) {
    return auth;
  }

  const [rolesResponse, profileResponse] = await Promise.all([
    auth.supabase
      .from('user_roles')
      .select('roles!inner(slug)')
      .eq('user_id', auth.user.id),
    auth.supabase
      .from('profiles')
      .select('role')
      .eq('id', auth.user.id)
      .maybeSingle(),
  ]);

  if (rolesResponse.error) {
    return { error: json(500, { error: rolesResponse.error.message }) };
  }

  if (profileResponse.error) {
    return { error: json(500, { error: profileResponse.error.message }) };
  }

  const roleRows = rolesResponse.data || [];
  const hasAdminRole = roleRows.some((row) => {
    const joined = Array.isArray(row.roles) ? row.roles : row.roles ? [row.roles] : [];
    return joined.some((role) => String(role.slug || '').trim().toLowerCase() === 'admin');
  });

  if (!hasAdminRole && (profileResponse.data?.role || '').trim().toLowerCase() !== 'admin') {
    return { error: json(403, { error: 'Admin access is required.' }) };
  }

  return auth;
}

export async function getUserSettingsFromEvent(event) {
  const { supabase, error: authError } = await requireAuthenticatedUser(event);
  if (authError) {
    return { error: authError };
  }

  const { data, error } = await supabase
    .from('user_settings')
    .select('football_api_provider, football_api_key')
    .maybeSingle();

  if (error) {
    return { error: json(500, { error: error.message }) };
  }

  if (!data?.football_api_key) {
    return { error: json(400, { error: 'API key not configured in settings.' }) };
  }

  if (data.football_api_provider !== 'api-football') {
    return { error: json(400, { error: 'Unsupported provider.' }) };
  }

  return { settings: data };
}

export async function fetchApiFootball(endpoint, apiKey) {
  const response = await fetch(`https://v3.football.api-sports.io${endpoint}`, {
    headers: {
      'x-apisports-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`API-Football request failed with status ${response.status}.`);
  }

  return response.json();
}

export { json };
