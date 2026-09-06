-- Align only differences observed between production and the verified fresh schema.
create or replace function public.can_view_club_roster(target_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_admin()
    or public.has_role('executive_director')
    or public.has_role('technical_director')
    or public.has_role('board_observer')
    or public.has_role('scout')
    or (public.has_role('coach') and public.belongs_to_team(target_team_id));
$$;

drop policy if exists "club_players_select_accessible" on public.club_players;
create policy "club_players_select_accessible"
on public.club_players
for select
to authenticated
using (public.can_view_club_roster(team_id));

-- Full unique index matches PostgREST ON CONFLICT inference; NULL keys remain distinct.
create unique index app_notifications_event_key_full_idx on public.app_notifications (recipient_user_id, event_key);
drop index public.app_notifications_event_key_idx;
alter index public.app_notifications_event_key_full_idx rename to app_notifications_event_key_idx;
