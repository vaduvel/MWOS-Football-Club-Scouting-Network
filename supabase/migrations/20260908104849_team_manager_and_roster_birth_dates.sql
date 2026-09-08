-- Team managers organize assigned-team fixtures and transport, not sporting selection.
insert into public.roles(slug, label, description)
values ('team_manager', 'Team Manager', 'Match-day logistics and transport for assigned teams')
on conflict(slug) do update set label=excluded.label, description=excluded.description;

alter table public.club_players add column date_of_birth date;
alter table public.club_players add constraint club_players_birth_date_not_future
  check (date_of_birth is null or (isfinite(date_of_birth) and date_of_birth <= current_date));

create or replace function public.role_requires_team(target_slug text)
returns boolean language sql stable security definer set search_path=public
as $$ select lower(coalesce(target_slug,'')) in ('coach','team_manager','driver','scout'); $$;

create or replace function public.can_view_club_roster(target_team_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select public.has_any_role(array['admin','executive_director','technical_director','board_observer','scout'])
  or (public.has_any_role(array['coach','team_manager']) and public.belongs_to_team(target_team_id)); $$;

create or replace function public.can_view_match_day_team(target_team_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select public.has_any_role(array['admin','executive_director','technical_director','board_observer'])
  or (public.has_any_role(array['coach','team_manager']) and public.belongs_to_team(target_team_id)); $$;

-- Keep can_manage_match_day_team unchanged: it protects squad selection.
create or replace function public.can_manage_match_day_fixture(target_team_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select public.can_manage_match_day_team(target_team_id)
  or (public.has_role('team_manager') and public.belongs_to_team(target_team_id)); $$;
revoke all on function public.can_manage_match_day_fixture(uuid) from public, anon;
grant execute on function public.can_manage_match_day_fixture(uuid) to authenticated, service_role;

drop policy match_days_insert_accessible on public.match_days;
create policy match_days_insert_accessible on public.match_days for insert to authenticated
with check (created_by=auth.uid() and updated_by=auth.uid() and public.can_manage_match_day_fixture(team_id));
drop policy match_days_update_accessible on public.match_days;
create policy match_days_update_accessible on public.match_days for update to authenticated
using (public.can_manage_match_day_fixture(team_id))
with check (updated_by=auth.uid() and public.can_manage_match_day_fixture(team_id));
-- Deletion remains with existing sporting/admin roles; managers may cancel a fixture.

create or replace function public.can_create_transport_team(target_team_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select public.has_any_role(array['admin','technical_director'])
  or (public.has_any_role(array['coach','team_manager','driver']) and public.belongs_to_team(target_team_id)); $$;

create or replace function public.can_view_transport_plan(target_plan_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.transport_plans p where p.id=target_plan_id and (
  public.has_any_role(array['admin','executive_director','technical_director','board_observer'])
  or (public.has_any_role(array['coach','team_manager']) and public.belongs_to_team(p.team_id))
  or (public.has_role('driver') and p.driver_user_id=auth.uid())
)); $$;

create or replace function public.can_manage_transport_plan(target_plan_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.transport_plans p where p.id=target_plan_id and (
  public.has_any_role(array['admin','technical_director'])
  or (public.has_any_role(array['coach','team_manager']) and public.belongs_to_team(p.team_id))
  or (public.has_role('driver') and p.driver_user_id=auth.uid())
)); $$;

create or replace function public.can_comment_transport_plan(target_plan_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select public.can_manage_transport_plan(target_plan_id); $$;

-- An update must not transfer a plan outside the caller's assigned-team scope.
drop policy transport_plans_update_accessible on public.transport_plans;
create policy transport_plans_update_accessible on public.transport_plans for update to authenticated
using (public.can_manage_transport_plan(id))
with check (updated_by=auth.uid() and public.can_manage_transport_plan(id) and public.can_create_transport_team(team_id));

create or replace function public.can_view_club_announcement(target_team_ids uuid[], expires_at timestamptz, archived_at timestamptz)
returns boolean language sql stable security definer set search_path=public
as $$ select archived_at is null and (expires_at is null or expires_at > timezone('utc',now()))
  and public.has_any_role(array['admin','executive_director','technical_director','board_observer','coach','team_manager','driver','scout'])
  and (public.can_manage_club_announcements() or public.has_role('board_observer')
    or coalesce(array_length(target_team_ids,1),0)=0
    or exists(select 1 from public.user_team_assignments u where u.user_id=auth.uid()
      and u.team_id=any(coalesce(target_team_ids,array[]::uuid[])))); $$;

-- Return only names/IDs needed for driver selection, restricted to shared assigned teams.
create function public.list_team_transport_drivers()
returns table(user_id uuid, name text, team_names text[])
language sql stable security definer set search_path=public
as $$ select p.id, coalesce(nullif(p.name,''),'Driver'), array_agg(distinct t.name order by t.name)
  from public.profiles p join public.user_team_assignments u on u.user_id=p.id
  join public.teams t on t.id=u.team_id
  where auth.uid() is not null and public.has_role('team_manager')
    and public.belongs_to_team(t.id) and t.is_active
    and exists(select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id
      where ur.user_id=p.id and r.slug='driver')
  group by p.id,p.name order by coalesce(nullif(p.name,''),'Driver'); $$;
revoke all on function public.list_team_transport_drivers() from public, anon;
grant execute on function public.list_team_transport_drivers() to authenticated;

create function public.team_transport_driver_allowed(target_team_id uuid, target_driver_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select target_driver_id is null or public.has_any_role(array['admin','technical_director'])
  or (public.has_role('team_manager') and public.belongs_to_team(target_team_id) and exists (
    select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id
    join public.user_team_assignments u on u.user_id=ur.user_id
    where ur.user_id=target_driver_id and r.slug='driver' and u.team_id=target_team_id
  )) or (not public.has_role('team_manager')); $$;
revoke all on function public.team_transport_driver_allowed(uuid,uuid) from public, anon;
grant execute on function public.team_transport_driver_allowed(uuid,uuid) to authenticated;

drop policy transport_plans_insert_accessible on public.transport_plans;
create policy transport_plans_insert_accessible on public.transport_plans for insert to authenticated
with check (created_by=auth.uid() and updated_by=auth.uid() and public.can_create_transport_team(team_id)
  and public.team_transport_driver_allowed(team_id,driver_user_id));
drop policy transport_plans_update_accessible on public.transport_plans;
create policy transport_plans_update_accessible on public.transport_plans for update to authenticated
using (public.can_manage_transport_plan(id))
with check (updated_by=auth.uid() and public.can_manage_transport_plan(id)
  and public.can_create_transport_team(team_id) and public.team_transport_driver_allowed(team_id,driver_user_id));
