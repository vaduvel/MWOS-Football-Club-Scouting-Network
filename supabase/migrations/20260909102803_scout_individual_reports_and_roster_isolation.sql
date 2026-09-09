-- Scouts work with external scouting players, not the internal club roster.
create or replace function public.can_view_club_roster(target_team_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select public.has_any_role(array['admin','executive_director','technical_director','board_observer'])
  or (public.has_any_role(array['coach','team_manager']) and public.belongs_to_team(target_team_id)); $$;

alter table public.reports add column report_type text not null default 'match'
  check (report_type in ('match','individual'));

create function public.guard_scout_roster_link()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if new.club_player_id is not null and auth.uid() is not null
    and not exists (select 1 from public.club_players where id=new.club_player_id) then
    raise exception 'Internal roster access is required to link this player' using errcode='42501';
  end if;
  return new;
end;
$$;
create trigger guard_scout_roster_link before insert or update of club_player_id on public.players
for each row execute function public.guard_scout_roster_link();
