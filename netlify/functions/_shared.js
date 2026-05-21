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

function getHeader(event, name) {
  if (!event?.headers) return '';
  return (
    event.headers[name] ||
    event.headers[name.toLowerCase()] ||
    event.headers[name.toUpperCase()] ||
    ''
  );
}

function getRequestOrigin(event) {
  const explicitOrigin = String(getHeader(event, 'origin') || '').trim();
  if (explicitOrigin) {
    return explicitOrigin.replace(/\/$/, '');
  }

  const proto = String(getHeader(event, 'x-forwarded-proto') || '').trim();
  const host = String(getHeader(event, 'x-forwarded-host') || getHeader(event, 'host') || '').trim();

  if (!host) return '';

  const normalizedProto = proto || 'https';
  return `${normalizedProto}://${host}`.replace(/\/$/, '');
}

export function getPublicAppUrl(event) {
  const configuredUrl = normalizeRuntimeUrl(
    process.env.APP_BASE_URL ||
      process.env.VITE_APP_URL ||
      getVercelPreviewUrl() ||
      getVercelSiteUrl() ||
      process.env.URL ||
      process.env.DEPLOY_PRIME_URL ||
      '',
  );
  const requestOrigin = normalizeRuntimeUrl(getRequestOrigin(event));
  const context = getRuntimeContext();

  if ((context === 'branch-deploy' || context === 'deploy-preview') && requestOrigin) {
    return requestOrigin;
  }

  if (!configuredUrl && requestOrigin) {
    return requestOrigin;
  }

  return configuredUrl || requestOrigin || '';
}

export function getEmailRuntimeStatus(event) {
  const configured = Boolean(process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM_EMAIL);
  const publicAppUrl = getPublicAppUrl(event) || null;

  return {
    configured,
    sender: process.env.NOTIFICATION_FROM_EMAIL || null,
    replyTo: process.env.NOTIFICATION_REPLY_TO_EMAIL || null,
    publicAppUrl,
    deliveryMode: configured ? 'transactional_email' : 'manual_link_fallback',
    setupHint: configured
      ? 'Transactional invite and alert emails are ready.'
      : 'Add RESEND_API_KEY and NOTIFICATION_FROM_EMAIL to the server environment. Until then, use manual invite links or WhatsApp sharing from Settings.',
  };
}

function resolveNotificationFromEmail() {
  const configuredFrom = String(process.env.NOTIFICATION_FROM_EMAIL || '').trim();
  if (!configuredFrom) return '';

  if (configuredFrom.toLowerCase().includes('@resend.dev')) {
    return 'MWOS Club Management <access@mwos-hub.com>';
  }

  return configuredFrom;
}

function normalizeRuntimeUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/$/, '');
}

function normalizeVercelUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    return normalizeRuntimeUrl(trimmed);
  }

  return normalizeRuntimeUrl(`https://${trimmed}`);
}

function getVercelSiteUrl() {
  return (
    normalizeVercelUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    normalizeVercelUrl(process.env.VERCEL_URL)
  );
}

function getVercelPreviewUrl() {
  return normalizeVercelUrl(process.env.VERCEL_BRANCH_URL);
}

function getRuntimeContext() {
  const vercelTarget = String(process.env.VERCEL_TARGET_ENV || process.env.VERCEL_ENV || '')
    .trim()
    .toLowerCase();

  if (vercelTarget === 'production') {
    return 'production';
  }

  if (vercelTarget === 'preview') {
    return process.env.VERCEL_BRANCH_URL ? 'branch-deploy' : 'deploy-preview';
  }

  if (process.env.CONTEXT) {
    return String(process.env.CONTEXT).trim().toLowerCase();
  }

  if (process.env.NETLIFY_LOCAL === 'true') {
    return 'local';
  }

  return 'unknown';
}

export function getAppRuntimeStatus(event) {
  const context = getRuntimeContext();
  const branch = String(process.env.BRANCH || process.env.HEAD || '').trim() || null;
  const commitRef = String(process.env.COMMIT_REF || '').trim() || null;
  const siteUrl = normalizeRuntimeUrl(process.env.URL) || getVercelSiteUrl();
  const deployPrimeUrl = normalizeRuntimeUrl(process.env.DEPLOY_PRIME_URL) || getVercelPreviewUrl();
  const publicAppUrl = normalizeRuntimeUrl(getPublicAppUrl(event));
  const releaseBranch = String(process.env.RELEASE_BRANCH || 'feat/club-management').trim() || null;
  const branchMatchesRelease = branch && releaseBranch ? branch === releaseBranch : null;

  const recommendedPublicUrl =
    context === 'branch-deploy' || context === 'deploy-preview'
      ? deployPrimeUrl || siteUrl || publicAppUrl
      : siteUrl || publicAppUrl;

  const matchesRecommendedPublicUrl = Boolean(
    publicAppUrl && recommendedPublicUrl && publicAppUrl === recommendedPublicUrl,
  );

  let setupHint = 'Runtime URL alignment looks good for this deployment.';

  if (!publicAppUrl) {
    setupHint = 'Set APP_BASE_URL or VITE_APP_URL so invite and reset links point to a real app URL.';
  } else if (context === 'local') {
    setupHint = 'Local runtime is fine for development, but live invite links should be verified again on the public deployment URL.';
  } else if (
    (context === 'branch-deploy' || context === 'deploy-preview') &&
    recommendedPublicUrl &&
    !matchesRecommendedPublicUrl
  ) {
    setupHint =
      'This preview deployment is still generating public links for a different URL. If you want to test invite or reset flows here, align APP_BASE_URL / VITE_APP_URL with the preview URL.';
  } else if (context === 'production' && siteUrl && publicAppUrl !== siteUrl) {
    setupHint =
      'Production is live, but the configured public app URL does not match the deployed site URL. Align APP_BASE_URL / VITE_APP_URL before broad staff rollout.';
  }

  return {
    context,
    branch,
    commitRef,
    siteUrl,
    deployPrimeUrl,
    publicAppUrl,
    recommendedPublicUrl,
    releaseBranch,
    branchMatchesRelease,
    matchesRecommendedPublicUrl,
    setupHint,
  };
}

export async function sendTransactionalEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = resolveNotificationFromEmail();
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
