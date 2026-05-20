import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { addDays, format, startOfWeek } from 'date-fns';

loadEnv({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnon = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnon || !supabaseService) {
  throw new Error('Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY in .env.local');
}

const appBaseUrl = process.env.QA_APP_URL || 'http://127.0.0.1:3005';
const usersTotal = Number(process.env.QA_LOAD_USERS || process.argv[2] || 20);
const concurrency = Number(process.env.QA_LOAD_CONCURRENCY || process.argv[3] || 10);
const password = process.env.QA_LOAD_PASSWORD || process.env.ROLE_QA_PASSWORD || 'RoleQa123!';
const emailPrefix = process.env.QA_LOAD_EMAIL_PREFIX || 'danielvaduva994+qa-load-';
const maxLoginAttempts = Number(process.env.QA_LOGIN_RETRIES || 4);
const baseRetryDelayMs = Number(process.env.QA_LOGIN_RETRY_MS || 250);
const loginStaggerMs = Number(process.env.QA_LOGIN_STAGGER_MS || 0);
const loginJitterMs = Number(process.env.QA_LOGIN_JITTER_MS || 0);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const serviceClient = createClient(supabaseUrl, supabaseService, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

function roundMs(valueMs) {
  return Math.round(valueMs * 100) / 100;
}

function isRateLimitError(error) {
  if (!error) return false;
  const status =
    error.status ||
    error.statusCode ||
    error.code ||
    0;
  const message = String(error.message || '').toLowerCase();

  return status === 429 || message.includes('rate limit') || message.includes('too many requests');
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

async function safeSelectAllUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...(data?.users || []));
    if (!data?.users || data.users.length < 1000) break;
  }
  return users;
}

async function resolveLookupMaps() {
  const [roleRows, teamRows] = await Promise.all([
    serviceClient.from('roles').select('id, slug'),
    serviceClient.from('teams').select('id, slug, is_active').order('sort_order'),
  ]);

  if (roleRows.error) throw roleRows.error;
  if (teamRows.error) throw teamRows.error;

  const roleBySlug = new Map((roleRows.data || []).map((row) => [row.slug, row.id]));
  const activeTeams = (teamRows.data || []).filter((team) => team.is_active);

  return { roleBySlug, activeTeams };
}

async function getExistingLoadUsers(prefix, allUsers) {
  const map = new Map();
  for (const user of allUsers) {
    if (user.email && user.email.startsWith(prefix)) {
      map.set(user.email, user.id);
    }
  }
  return map;
}

async function upsertUserRoleAndTeam({ userId, roleId, teamId }) {
  const [roleRes, teamRes] = await Promise.all([
    serviceClient.from('user_roles').upsert(
      { user_id: userId, role_id: roleId },
      { onConflict: 'user_id,role_id', ignoreDuplicates: true },
    ),
    serviceClient.from('user_team_assignments').upsert(
      { user_id: userId, team_id: teamId },
      { onConflict: 'user_id,team_id', ignoreDuplicates: true },
    ),
  ]);

  if (roleRes.error) throw roleRes.error;
  if (teamRes.error) throw teamRes.error;
}

async function buildLoadUsers(count) {
  const allUsers = await safeSelectAllUsers();
  const { roleBySlug, activeTeams } = await resolveLookupMaps();
  const existing = await getExistingLoadUsers(emailPrefix, allUsers);
  const results = [];
  let created = 0;

  for (let index = 1; index <= count; index += 1) {
    const roleSlug = index <= Math.ceil(count / 2) ? 'coach' : 'driver';
    const team = activeTeams[(index - 1) % activeTeams.length];
    const email = `${emailPrefix}${String(index).padStart(2, '0')}@gmail.com`;
    const displayName = `QA Load ${roleSlug.toUpperCase()} ${String(index).padStart(2, '0')}`;

    const userId = existing.get(email);

    if (userId) {
      results.push({
        userId,
        email,
        roleSlug,
        teamId: team.id,
        created: false,
        startDelayMs: Math.max(0, loginStaggerMs) * (index - 1),
      });
      // keep assignments in sync if user already exists.
      await upsertUserRoleAndTeam({
        userId,
        roleId: roleBySlug.get(roleSlug),
        teamId: team.id,
      });
      continue;
    }

    const { data: createdUser, error } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: displayName },
    });
    if (error) {
      throw new Error(`Create user failed for ${email}: ${error.message}`);
    }

    if (!createdUser.user?.id) {
      throw new Error(`Create user did not return id for ${email}`);
    }

    created += 1;
    await upsertUserRoleAndTeam({
      userId: createdUser.user.id,
      roleId: roleBySlug.get(roleSlug),
      teamId: team.id,
    });

    results.push({
      userId: createdUser.user.id,
      email,
      roleSlug,
      teamId: team.id,
      created: true,
      startDelayMs: Math.max(0, loginStaggerMs) * (index - 1),
    });
  }

  return {
    users: results,
    createdCount: created,
    roleBySlug,
    activeTeams,
    totalUsers: results.length,
    existingUsers: results.length - created,
  };
}

async function loadUserPage(path) {
  const start = performance.now();
  const response = await fetch(path, {
    method: 'GET',
    headers: {
      'user-agent': 'QA-load-smoke',
    },
  });
  return {
    status: response.status,
    timeMs: roundMs(performance.now() - start),
  };
}

function chunk(items, size) {
  const buckets = [];
  for (let i = 0; i < items.length; i += size) {
    buckets.push(items.slice(i, i + size));
  }
  return buckets;
}

async function loadSingleUser(user) {
  const client = createClient(supabaseUrl, supabaseAnon, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const timings = {
    signInMs: 0,
    dbQueriesMs: 0,
    trainingPageMs: 0,
    routePageMs: 0,
  };
  const started = performance.now();
  const jitter = Math.floor(Math.random() * Math.max(0, loginJitterMs + 1));
  if (user.startDelayMs || jitter) {
    await sleep((user.startDelayMs || 0) + jitter);
  }

  let signInData = null;
  let signInError = null;
  const signInStart = performance.now();

  for (let attempt = 0; attempt < maxLoginAttempts; attempt += 1) {
    ({ data: signInData, error: signInError } = await client.auth.signInWithPassword({
      email: user.email,
      password,
    }));

    if (!signInError && signInData?.user) {
      break;
    }

    if (isRateLimitError(signInError) && attempt < maxLoginAttempts - 1) {
      const delay = Math.min(4000, baseRetryDelayMs * 2 ** attempt) + Math.floor(Math.random() * 100);
      await sleep(delay);
      continue;
    }

    break;
  }

  timings.signInMs = roundMs(performance.now() - signInStart);

  if (signInError || !signInData.user) {
    return {
      email: user.email,
      roleSlug: user.roleSlug,
      success: false,
      error: `signIn failed: ${signInError?.message || 'unknown'}`,
      timings,
      totalMs: roundMs(performance.now() - started),
    };
  }

  const sessionUserId = signInData.user.id;

  const dbStart = performance.now();
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const dbQueries = [client.from('profiles').select('id, email, name').eq('id', sessionUserId)];

  if (user.roleSlug === 'coach') {
    dbQueries.push(
      client
        .from('training_plans')
        .select('id, status, headline')
        .eq('team_id', user.teamId)
        .gte('week_start', weekStart),
    );
  }

  if (user.roleSlug === 'driver') {
    dbQueries.push(
      client
        .from('transport_plans')
        .select('id, title, event_date, status')
        .eq('team_id', user.teamId)
        .gte('event_date', tomorrow),
    );
  }

  dbQueries.push(client.from('app_notifications').select('id', { count: 'exact', head: true }).eq('recipient_user_id', sessionUserId));

  const settled = await Promise.all(dbQueries.map((q) => q.then && q));
  const failedQuery = settled.find((item) => item?.error);
  timings.dbQueriesMs = roundMs(performance.now() - dbStart);

  let routePath = `${appBaseUrl}/login`;
  if (user.roleSlug === 'coach') {
    routePath = `${appBaseUrl}/training?team=${user.teamId}&week=${weekStart}&day=0`;
  } else if (user.roleSlug === 'driver') {
    routePath = `${appBaseUrl}/transport?team=${user.teamId}`;
  }

  const routeStart = performance.now();
  const route = await loadUserPage(routePath);
  timings.routePageMs = route.timeMs;

  const routePage = { status: route.status, responseMs: route.timeMs };

  await client.auth.signOut();

  if (failedQuery) {
    return {
      email: user.email,
      roleSlug: user.roleSlug,
      success: false,
      error: `query failed: ${failedQuery.error.message}`,
      timings,
      routeStatus: route.status,
      totalMs: roundMs(performance.now() - started),
      queryCount: dbQueries.length,
      routePage,
    };
  }

  return {
    email: user.email,
    roleSlug: user.roleSlug,
    success: true,
    teamId: user.teamId,
    timings,
    routeStatus: route.status,
    totalMs: roundMs(performance.now() - started),
    queryCount: dbQueries.length,
    routePage,
  };
}

async function runLoadTest(users) {
  const allResults = [];
  const buckets = chunk(users, Math.max(1, concurrency));
  for (const batch of buckets) {
    const batchResults = await Promise.all(batch.map((user) => loadSingleUser(user)));
    allResults.push(...batchResults);
  }

  const success = allResults.filter((item) => item.success);
  const fails = allResults.filter((item) => !item.success);

  const signInTimes = success.map((r) => r.timings.signInMs);
  const dbTimes = success.map((r) => r.timings.dbQueriesMs);
  const routeTimes = success.map((r) => r.timings.routePageMs);

  return {
    requestedUsers: allResults.length,
    successCount: success.length,
    failCount: fails.length,
    failedSamples: fails,
    latencies: {
      signIn: {
        avgMs: roundMs(signInTimes.reduce((sum, val) => sum + val, 0) / Math.max(signInTimes.length, 1)),
        p95Ms: percentile(signInTimes, 95),
        maxMs: signInTimes.length ? roundMs(Math.max(...signInTimes)) : 0,
      },
      dbQueries: {
        avgMs: roundMs(dbTimes.reduce((sum, val) => sum + val, 0) / Math.max(dbTimes.length, 1)),
        p95Ms: percentile(dbTimes, 95),
        maxMs: dbTimes.length ? roundMs(Math.max(...dbTimes)) : 0,
      },
      route: {
        avgMs: roundMs(routeTimes.reduce((sum, val) => sum + val, 0) / Math.max(routeTimes.length, 1)),
        p95Ms: percentile(routeTimes, 95),
        maxMs: routeTimes.length ? roundMs(Math.max(...routeTimes)) : 0,
      },
    },
    all: allResults,
  };
}

async function runPageSmoke() {
  const endpoints = ['/', '/login', '/training', '/transport', '/settings', '/notifications', '/players'];
  const results = await Promise.all(
    endpoints.map(async (path) => {
      const url = `${appBaseUrl.replace(/\/$/, '')}${path}`;
      const start = performance.now();
      try {
        const resp = await fetch(url);
        return { path, status: resp.status, ms: roundMs(performance.now() - start), ok: resp.ok };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Request failed';
        return { path, status: 0, ms: roundMs(performance.now() - start), ok: false, error: message };
      }
    }),
  );

  return {
    okCount: results.filter((r) => r.ok).length,
    total: results.length,
    results,
  };
}

async function run() {
  const staticSmoke = await runPageSmoke();
  const built = await buildLoadUsers(usersTotal);
  const loadTest = await runLoadTest(built.users);

  const report = {
    timestamp: new Date().toISOString(),
    config: {
      targetUsers: usersTotal,
      appBaseUrl,
      concurrency,
      passwordProvided: Boolean(password),
      activeTeams: built.activeTeams.length,
      createdUsers: built.createdCount,
      existingUsers: built.existingUsers,
    },
    pageSmoke: staticSmoke,
    loadTest,
  };

  console.log(JSON.stringify(report, null, 2));

  const passScore =
    loadTest.failCount === 0 &&
    staticSmoke.okCount === staticSmoke.total &&
    loadTest.successCount >= Math.max(1, Math.floor(usersTotal * 0.95));

  if (!passScore) {
    process.exitCode = 1;
  } else {
    console.log('\nPASS: load test stable for requested profile.');
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
