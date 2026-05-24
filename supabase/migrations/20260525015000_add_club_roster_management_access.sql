create or replace function public.can_manage_club_roster(target_team_id uuid)
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

drop policy if exists "club_players_insert_accessible" on public.club_players;
create policy "club_players_insert_accessible"
on public.club_players
for insert
to authenticated
with check (public.can_manage_club_roster(team_id));

drop policy if exists "club_players_update_accessible" on public.club_players;
create policy "club_players_update_accessible"
on public.club_players
for update
to authenticated
using (public.can_manage_club_roster(team_id))
with check (public.can_manage_club_roster(team_id));

drop policy if exists "club_players_delete_accessible" on public.club_players;
create policy "club_players_delete_accessible"
on public.club_players
for delete
to authenticated
using (public.can_manage_club_roster(team_id));
