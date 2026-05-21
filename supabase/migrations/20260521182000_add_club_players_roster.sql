create table if not exists public.club_players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete restrict,
  source_label text not null default 'anthropometrics_seed',
  source_row_number integer,
  squad_number integer,
  first_name text not null,
  last_name text not null,
  display_name text not null,
  weight_kg numeric(5,2),
  height_cm numeric(5,2),
  bmi numeric(5,2),
  dominant_foot text not null default 'unknown'
    check (dominant_foot in ('right', 'left', 'both', 'unknown')),
  nationality text,
  primary_position text,
  secondary_position text,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (team_id, display_name)
);

create index if not exists club_players_team_id_idx on public.club_players (team_id);
create index if not exists club_players_display_name_idx on public.club_players (display_name);
create index if not exists club_players_primary_position_idx on public.club_players (primary_position);

grant select, insert, update, delete on public.club_players to authenticated;

alter table public.club_players enable row level security;

drop trigger if exists set_club_players_updated_at on public.club_players;
create trigger set_club_players_updated_at
before update on public.club_players
for each row
execute procedure public.set_updated_at();

drop policy if exists "club_players_select_accessible" on public.club_players;
create policy "club_players_select_accessible"
on public.club_players
for select
to authenticated
using (public.can_view_training_team(team_id));

drop policy if exists "club_players_insert_accessible" on public.club_players;
create policy "club_players_insert_accessible"
on public.club_players
for insert
to authenticated
with check (public.can_manage_training_team(team_id));

drop policy if exists "club_players_update_accessible" on public.club_players;
create policy "club_players_update_accessible"
on public.club_players
for update
to authenticated
using (public.can_manage_training_team(team_id))
with check (public.can_manage_training_team(team_id));

drop policy if exists "club_players_delete_accessible" on public.club_players;
create policy "club_players_delete_accessible"
on public.club_players
for delete
to authenticated
using (public.is_admin() or public.can_manage_training_team(team_id));
