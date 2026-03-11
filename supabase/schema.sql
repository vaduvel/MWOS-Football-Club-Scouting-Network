create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  organization text,
  role text not null default 'Scout'
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  football_api_provider text not null default 'api-football',
  football_api_key text
);

create table if not exists public.reports (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users (id) on delete cascade,
  competition text,
  date text,
  venue text,
  kickoff text,
  weather text,
  pitch text,
  home_team text,
  home_score integer,
  away_team text,
  away_score integer,
  scout_name text,
  focus text,
  general_notes text,
  home_manager text,
  away_manager text,
  formation_home text not null default '4-3-3',
  formation_away text not null default '4-3-3',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.players (
  id text primary key default gen_random_uuid()::text,
  report_id text not null references public.reports (id) on delete cascade,
  team_side text not null check (team_side in ('home', 'away')),
  shirt_number integer,
  name text,
  subbed text,
  goal text,
  rating numeric(3, 1),
  position_x numeric(5, 2) not null default 50,
  position_y numeric(5, 2) not null default 50,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.player_reviews (
  id text primary key default gen_random_uuid()::text,
  report_id text not null references public.reports (id) on delete cascade,
  player_id text references public.players (id) on delete cascade,
  overview text,
  strengths text,
  areas_to_improve text,
  pace integer not null default 3,
  strength integer not null default 3,
  stamina integer not null default 3,
  agility integer not null default 3,
  decision_making integer not null default 3,
  composure integer not null default 3,
  work_rate integer not null default 3,
  positioning integer not null default 3,
  recommendation_verdict text,
  potential_level text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.watchlist_players (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users (id) on delete cascade,
  player_key text not null,
  player_name text not null,
  club_label text,
  source_player_id text references public.players (id) on delete set null,
  source_report_id text references public.reports (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, player_key)
);

create table if not exists public.report_comments (
  id text primary key default gen_random_uuid()::text,
  report_id text not null references public.reports (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists reports_user_id_idx on public.reports (user_id);
create index if not exists players_report_id_idx on public.players (report_id);
create index if not exists player_reviews_report_id_idx on public.player_reviews (report_id);
create index if not exists watchlist_players_user_id_idx on public.watchlist_players (user_id);
create index if not exists report_comments_report_id_idx on public.report_comments (report_id);
create index if not exists report_comments_author_id_idx on public.report_comments (author_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_reports_updated_at on public.reports;
create trigger set_reports_updated_at
before update on public.reports
for each row
execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, organization, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'organization', ''),
    coalesce(new.raw_user_meta_data->>'role', 'Scout')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = excluded.name,
    organization = excluded.organization,
    role = excluded.role;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
exception
  when others then
    raise warning 'handle_new_user failed for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and lower(role) = 'admin'
  );
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.reports enable row level security;
alter table public.players enable row level security;
alter table public.player_reviews enable row level security;
alter table public.watchlist_players enable row level security;
alter table public.report_comments enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "settings_select_own" on public.user_settings;
create policy "settings_select_own"
on public.user_settings
for select
using (auth.uid() = user_id);

drop policy if exists "settings_insert_own" on public.user_settings;
create policy "settings_insert_own"
on public.user_settings
for insert
with check (auth.uid() = user_id);

drop policy if exists "settings_update_own" on public.user_settings;
create policy "settings_update_own"
on public.user_settings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
on public.reports
for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
on public.reports
for insert
with check (auth.uid() = user_id);

drop policy if exists "reports_update_own" on public.reports;
create policy "reports_update_own"
on public.reports
for update
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "reports_delete_own" on public.reports;
create policy "reports_delete_own"
on public.reports
for delete
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "players_select_own" on public.players;
create policy "players_select_own"
on public.players
for select
using (
  exists (
    select 1
    from public.reports
    where reports.id = players.report_id
      and (reports.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "players_insert_own" on public.players;
create policy "players_insert_own"
on public.players
for insert
with check (
  exists (
    select 1
    from public.reports
    where reports.id = players.report_id
      and (reports.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "players_delete_own" on public.players;
create policy "players_delete_own"
on public.players
for delete
using (
  exists (
    select 1
    from public.reports
    where reports.id = players.report_id
      and (reports.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "player_reviews_select_own" on public.player_reviews;
create policy "player_reviews_select_own"
on public.player_reviews
for select
using (
  exists (
    select 1
    from public.reports
    where reports.id = player_reviews.report_id
      and (reports.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "player_reviews_insert_own" on public.player_reviews;
create policy "player_reviews_insert_own"
on public.player_reviews
for insert
with check (
  exists (
    select 1
    from public.reports
    where reports.id = player_reviews.report_id
      and (reports.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "player_reviews_delete_own" on public.player_reviews;
create policy "player_reviews_delete_own"
on public.player_reviews
for delete
using (
  exists (
    select 1
    from public.reports
    where reports.id = player_reviews.report_id
      and (reports.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "watchlist_players_select_own" on public.watchlist_players;
create policy "watchlist_players_select_own"
on public.watchlist_players
for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "watchlist_players_insert_own" on public.watchlist_players;
create policy "watchlist_players_insert_own"
on public.watchlist_players
for insert
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "watchlist_players_update_own" on public.watchlist_players;
create policy "watchlist_players_update_own"
on public.watchlist_players
for update
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "watchlist_players_delete_own" on public.watchlist_players;
create policy "watchlist_players_delete_own"
on public.watchlist_players
for delete
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "report_comments_select_accessible" on public.report_comments;
create policy "report_comments_select_accessible"
on public.report_comments
for select
using (
  exists (
    select 1
    from public.reports
    where reports.id = report_comments.report_id
      and (reports.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "report_comments_insert_accessible" on public.report_comments;
create policy "report_comments_insert_accessible"
on public.report_comments
for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.reports
    where reports.id = report_comments.report_id
      and (reports.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "report_comments_delete_accessible" on public.report_comments;
create policy "report_comments_delete_accessible"
on public.report_comments
for delete
using (
  author_id = auth.uid()
  or public.is_admin()
);
