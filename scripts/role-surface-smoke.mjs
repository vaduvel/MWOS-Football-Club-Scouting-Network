import { config as loadEnv } from 'dotenv';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import {
  canAccessOversightModule,
  canAccessPlayerHub,
  canAccessScoutingModule,
  canAccessTrainingModule,
  canAccessTransportModule,
} from '../src/lib/roleAccessDomain.ts';
import { getClubHomeViewMode } from '../src/lib/clubHomeDomain.ts';
import { getLeadershipWorkspaceMode } from '../src/lib/leadershipWorkspaceDomain.ts';

loadEnv({ path: '.env.local' });

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

const qaAccounts = [
  {
    key: 'admin',
    email: 'danielvaduva994+qa-admin@gmail.com',
    expectedHome: 'admin',
    expectedLeadership: 'admin',
    expectedModules: {
      training: true,
      transport: true,
      scouting: true,
      players: true,
      oversight: true,
    },
  },
  {
    key: 'technical_director',
    email: 'danielvaduva994+qa-td@gmail.com',
    expectedHome: 'technical_director',
    expectedLeadership: 'technical_director',
    expectedModules: {
      training: true,
      transport: true,
      scouting: true,
      players: true,
      oversight: true,
    },
  },
  {
    key: 'board_observer',
    email: 'danielvaduva994+qa-board@gmail.com',
    expectedHome: 'board_observer',
    expectedLeadership: 'board_observer',
    expectedModules: {
      training: false,
      transport: false,
      scouting: false,
      players: false,
      oversight: true,
    },
  },
  {
    key: 'coach',
    email: 'danielvaduva994+qa-coach@gmail.com',
    expectedHome: 'coach',
    expectedLeadership: 'none',
    expectedModules: {
      training: true,
      transport: true,
      scouting: false,
      players: false,
      oversight: false,
    },
  },
  {
    key: 'driver',
    email: 'danielvaduva994+qa-driver@gmail.com',
    expectedHome: 'driver',
    expectedLeadership: 'none',
    expectedModules: {
      training: false,
      transport: true,
      scouting: false,
      players: false,
      oversight: false,
    },
  },
  {
    key: 'scout',
    email: 'danielvaduva994+qa-scout@gmail.com',
    expectedHome: 'scout',
    expectedLeadership: 'none',
    expectedModules: {
      training: false,
      transport: false,
      scouting: true,
      players: true,
      oversight: false,
    },
  },
];

export async function runRoleSurfaceSmoke({ password = process.env.ROLE_QA_PASSWORD || 'RoleQa123!' } = {}) {
  const failures = [];
  const results = [];

  for (const account of qaAccounts) {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: account.email,
      password,
    });

    if (signInError || !signInData.user) {
      failures.push({
        account: account.key,
        email: account.email,
        issue: `Sign in failed: ${signInError?.message || 'unknown error'}`,
      });
      continue;
    }

    const userId = signInData.user.id;
    const [rolesRes, teamsRes] = await Promise.all([
      supabase.from('user_roles').select('roles!inner(slug)').eq('user_id', userId),
      supabase.from('user_team_assignments').select('team_id').eq('user_id', userId),
    ]);

    if (rolesRes.error) {
      failures.push({
        account: account.key,
        email: account.email,
        issue: `Role lookup failed: ${rolesRes.error.message}`,
      });
      await supabase.auth.signOut();
      continue;
    }

    if (teamsRes.error) {
      failures.push({
        account: account.key,
        email: account.email,
        issue: `Team lookup failed: ${teamsRes.error.message}`,
      });
      await supabase.auth.signOut();
      continue;
    }

    const roleSlugs = (rolesRes.data || [])
      .flatMap((row) => (Array.isArray(row.roles) ? row.roles : row.roles ? [row.roles] : []))
      .map((role) => String(role.slug || '').trim().toLowerCase())
      .filter(Boolean);

    const user = { roles: roleSlugs };
    const actualModules = {
      training: canAccessTrainingModule(user),
      transport: canAccessTransportModule(user),
      scouting: canAccessScoutingModule(user),
      players: canAccessPlayerHub(user),
      oversight: canAccessOversightModule(user),
    };
    const actualHome = getClubHomeViewMode(roleSlugs);
    const actualLeadership = getLeadershipWorkspaceMode(roleSlugs);

    const mismatches = [];

    if (actualHome !== account.expectedHome) {
      mismatches.push(`home mode expected ${account.expectedHome}, got ${actualHome}`);
    }

    if (actualLeadership !== account.expectedLeadership) {
      mismatches.push(
        `leadership mode expected ${account.expectedLeadership}, got ${actualLeadership}`,
      );
    }

    for (const [moduleKey, expected] of Object.entries(account.expectedModules)) {
      if (actualModules[moduleKey] !== expected) {
        mismatches.push(
          `${moduleKey} access expected ${expected ? 'enabled' : 'disabled'}, got ${
            actualModules[moduleKey] ? 'enabled' : 'disabled'
          }`,
        );
      }
    }

    results.push({
      account: account.key,
      email: account.email,
      roles: roleSlugs,
      assignedTeams: (teamsRes.data || []).length,
      home: actualHome,
      leadership: actualLeadership,
      modules: actualModules,
      ok: mismatches.length === 0,
      ...(mismatches.length ? { mismatches } : {}),
    });

    if (mismatches.length > 0) {
      failures.push({
        account: account.key,
        email: account.email,
        issue: mismatches.join('; '),
      });
    }

    await supabase.auth.signOut();
  }

  return {
    ok: failures.length === 0,
    checked: qaAccounts.length,
    results,
    failures,
  };
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const password = process.argv[2] || process.env.ROLE_QA_PASSWORD || 'RoleQa123!';
  const payload = await runRoleSurfaceSmoke({ password });
  console.log(JSON.stringify(payload, null, 2));

  if (payload.failures.length > 0) {
    process.exitCode = 1;
  }
}
