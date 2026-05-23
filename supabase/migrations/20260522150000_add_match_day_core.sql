create table if not exists public.match_days (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  opponent text not null,
  competition text,
  match_date date not null,
  kickoff_time time,
  venue text,
  status text not null default 'draft' check (status in ('draft', 'published', 'completed', 'cancelled')),
  created_by uuid not null references auth.users (id) on delete cascade,
  updated_by uuid not null references auth.users (id) on delete cascade,
  published_by uuid references auth.users (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.match_day_players (
  match_day_id uuid not null references public.match_days (id) on delete cascade,
  club_player_id uuid not null references public.club_players (id) on delete cascade,
  availability_status text not null default 'available' check (availability_status in ('available', 'doubtful', 'unavailable')),
  selection_status text not null default 'out' check (selection_status in ('starter', 'bench', 'out')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (match_day_id, club_player_id)
);

create index if not exists match_days_team_date_idx
  on public.match_days (team_id, match_date desc);

create index if not exists match_days_status_idx
  on public.match_days (status);

create index if not exists match_day_players_club_player_idx
  on public.match_day_players (club_player_id);

create or replace function public.can_view_match_day_team(target_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_admin()
    or public.has_role('technical_director')
    or public.has_role('board_observer')
    or (public.has_role('coach') and public.belongs_to_team(target_team_id));
$$;

create or replace function public.can_manage_match_day_team(target_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_admin()
    or public.has_role('technical_director')
    or (public.has_role('coach') and public.belongs_to_team(target_team_id));
$$;

drop trigger if exists set_match_days_updated_at on public.match_days;
create trigger set_match_days_updated_at
before update on public.match_days
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_match_day_players_updated_at on public.match_day_players;
create trigger set_match_day_players_updated_at
before update on public.match_day_players
for each row
execute procedure public.set_updated_at();

alter table public.match_days enable row level security;
alter table public.match_day_players enable row level security;

grant select, insert, update, delete on public.match_days to authenticated;
grant select, insert, update, delete on public.match_day_players to authenticated;

drop policy if exists "match_days_select_accessible" on public.match_days;
create policy "match_days_select_accessible"
on public.match_days
for select
to authenticated
using (public.can_view_match_day_team(team_id));

drop policy if exists "match_days_insert_accessible" on public.match_days;
create policy "match_days_insert_accessible"
on public.match_days
for insert
to authenticated
with check (
  created_by = auth.uid()
  and updated_by = auth.uid()
  and public.can_manage_match_day_team(team_id)
);

drop policy if exists "match_days_update_accessible" on public.match_days;
create policy "match_days_update_accessible"
on public.match_days
for update
to authenticated
using (public.can_manage_match_day_team(team_id))
with check (
  updated_by = auth.uid()
  and public.can_manage_match_day_team(team_id)
);

drop policy if exists "match_days_delete_accessible" on public.match_days;
create policy "match_days_delete_accessible"
on public.match_days
for delete
to authenticated
using (public.is_admin() or public.can_manage_match_day_team(team_id));

drop policy if exists "match_day_players_select_accessible" on public.match_day_players;
create policy "match_day_players_select_accessible"
on public.match_day_players
for select
to authenticated
using (
  exists (
    select 1
    from public.match_days
    where match_days.id = match_day_players.match_day_id
      and public.can_view_match_day_team(match_days.team_id)
  )
);

drop policy if exists "match_day_players_insert_accessible" on public.match_day_players;
create policy "match_day_players_insert_accessible"
on public.match_day_players
for insert
to authenticated
with check (
  exists (
    select 1
    from public.match_days
    where match_days.id = match_day_players.match_day_id
      and public.can_manage_match_day_team(match_days.team_id)
  )
);

drop policy if exists "match_day_players_update_accessible" on public.match_day_players;
create policy "match_day_players_update_accessible"
on public.match_day_players
for update
to authenticated
using (
  exists (
    select 1
    from public.match_days
    where match_days.id = match_day_players.match_day_id
      and public.can_manage_match_day_team(match_days.team_id)
  )
)
with check (
  exists (
    select 1
    from public.match_days
    where match_days.id = match_day_players.match_day_id
      and public.can_manage_match_day_team(match_days.team_id)
  )
);

drop policy if exists "match_day_players_delete_accessible" on public.match_day_players;
create policy "match_day_players_delete_accessible"
on public.match_day_players
for delete
to authenticated
using (
  exists (
    select 1
    from public.match_days
    where match_days.id = match_day_players.match_day_id
      and public.can_manage_match_day_team(match_days.team_id)
  )
);
