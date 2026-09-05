// Real PostgreSQL engine, with only the Supabase-managed Auth/Storage shell mocked.
// This does not contact any remote database or validate the Supabase service APIs.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const db = new PGlite({ extensions: { pgcrypto } });
const shell = `
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb; $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1)-1];
  $$;
  grant usage on schema auth, storage to authenticated, anon, service_role;
  grant all on storage.objects to authenticated, service_role;
`;
try {
  await db.exec(shell);
  const baseline = await readFile(new URL('../supabase/migrations/20260518000000_fresh_project_foundation.sql', import.meta.url), 'utf8');
  for (const file of (await readdir(new URL('../supabase/migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
    console.log(`PASS ${file}`);
  }
  await db.exec(baseline); // Existing complete projects must be unchanged.
  const { rows } = await db.query(`select tablename from pg_tables where schemaname='public'`);
  for (const table of ['club_announcements', 'club_announcement_reads', 'club_players', 'match_days', 'match_day_players', 'reports']) {
    assert(rows.some(row => row.tablename === table), `${table} exists`);
  }
  await db.exec(`insert into auth.users(id,email,raw_user_meta_data) values ('00000000-0000-4000-a000-000000000001','qa@example.test','{"role":"admin"}');`);
  assert.equal((await db.query('select role from profiles')).rows[0].role, 'Pending');
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000001', false); update profiles set role='admin' where id=auth.uid();`);
  assert.equal((await db.query('select is_admin() as allowed')).rows[0].allowed, false);
  console.log('PASS complete migration chain, repeat bootstrap, signup and profile-spoof security');
} finally {
  await db.close();
}

for (const fixture of ['partial-schema', 'existing-auth-user', 'existing-storage-object']) {
  const guardedDb = new PGlite({ extensions: { pgcrypto } });
  try {
    await guardedDb.exec(shell);
    if (fixture === 'partial-schema') await guardedDb.exec('create table public.profiles(id uuid)');
    if (fixture === 'existing-auth-user') await guardedDb.exec("insert into auth.users(id) values (gen_random_uuid())");
    if (fixture === 'existing-storage-object') await guardedDb.exec("insert into storage.objects(name) values ('keep-existing-data')");
    const baseline = await readFile(new URL('../supabase/migrations/20260518000000_fresh_project_foundation.sql', import.meta.url), 'utf8');
    await assert.rejects(guardedDb.exec(baseline), /MWOS bootstrap refused/);
    console.log(`PASS bootstrap refuses ${fixture}`);
  } finally {
    await guardedDb.close();
  }
}
