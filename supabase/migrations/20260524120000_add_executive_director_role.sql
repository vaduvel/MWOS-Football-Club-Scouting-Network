insert into public.roles (slug, label, description)
values (
  'executive_director',
  'Executive Director',
  'Strategic player development and club-wide read access'
)
on conflict (slug) do update
set
  label = excluded.label,
  description = excluded.description;

create or replace function public.can_view_training_team(target_team_id uuid)
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
    or (public.has_role('coach') and public.belongs_to_team(target_team_id));
$$;

create or replace function public.can_view_match_day_team(target_team_id uuid)
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
    or (public.has_role('coach') and public.belongs_to_team(target_team_id));
$$;

create or replace function public.can_view_transport_plan(target_plan_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.transport_plans
    where transport_plans.id = target_plan_id
      and (
        public.is_admin()
        or public.has_role('executive_director')
        or public.has_role('technical_director')
        or public.has_role('board_observer')
        or (public.has_role('coach') and public.belongs_to_team(transport_plans.team_id))
        or transport_plans.driver_user_id = auth.uid()
      )
  );
$$;

create or replace function public.can_manage_club_announcements()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin() or public.has_role('executive_director') or public.has_role('technical_director');
$$;

create or replace function public.can_view_club_announcement(
  target_team_ids uuid[],
  expires_at timestamptz,
  archived_at timestamptz
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    archived_at is null
    and (expires_at is null or expires_at > timezone('utc', now()))
    and public.has_any_role(array['admin', 'executive_director', 'technical_director', 'board_observer', 'coach', 'driver', 'scout'])
    and (
      public.can_manage_club_announcements()
      or public.has_role('board_observer')
      or coalesce(array_length(target_team_ids, 1), 0) = 0
      or exists (
        select 1
        from public.user_team_assignments uta
        where uta.user_id = auth.uid()
          and uta.team_id = any (coalesce(target_team_ids, array[]::uuid[]))
      )
    );
$$;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (
  auth.uid() = id
  or public.has_any_role(array['admin', 'executive_director', 'technical_director', 'board_observer'])
);

drop policy if exists "user_roles_select_accessible" on public.user_roles;
create policy "user_roles_select_accessible"
on public.user_roles
for select
to authenticated
using (
  auth.uid() = user_id
  or public.has_any_role(array['admin', 'executive_director', 'technical_director'])
);

drop policy if exists "user_team_assignments_select_accessible" on public.user_team_assignments;
create policy "user_team_assignments_select_accessible"
on public.user_team_assignments
for select
to authenticated
using (
  auth.uid() = user_id
  or public.has_any_role(array['admin', 'executive_director', 'technical_director'])
);

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
on public.reports
for select
using (
  auth.uid() = user_id
  or public.is_admin()
  or public.has_any_role(array['executive_director', 'technical_director', 'board_observer'])
);

drop policy if exists "players_select_own" on public.players;
create policy "players_select_own"
on public.players
for select
using (
  exists (
    select 1
    from public.reports
    where reports.id = players.report_id
      and (
        reports.user_id = auth.uid()
        or public.is_admin()
        or public.has_any_role(array['executive_director', 'technical_director', 'board_observer'])
      )
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
      and (
        reports.user_id = auth.uid()
        or public.is_admin()
        or public.has_any_role(array['executive_director', 'technical_director', 'board_observer'])
      )
  )
);

drop policy if exists "report_comments_select_accessible" on public.report_comments;
create policy "report_comments_select_accessible"
on public.report_comments
for select
using (
  exists (
    select 1
    from public.reports
    where reports.id = report_comments.report_id
      and (
        reports.user_id = auth.uid()
        or public.is_admin()
        or public.has_any_role(array['executive_director', 'technical_director', 'board_observer'])
      )
  )
);
