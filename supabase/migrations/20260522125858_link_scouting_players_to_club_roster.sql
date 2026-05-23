alter table public.players
  add column if not exists club_player_id uuid references public.club_players (id) on delete set null;

create index if not exists players_club_player_id_idx
  on public.players (club_player_id);
