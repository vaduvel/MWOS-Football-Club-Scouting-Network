-- Repair club-wide read access for leadership roles. This migration is
-- intentionally idempotent because production may contain an older version of
-- the policies with narrower role lists.

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_team_assignments enable row level security;
alter table public.reports enable row level security;
alter table public.players enable row level security;
alter table public.player_reviews enable row level security;
alter table public.report_comments enable row level security;

grant select on table public.profiles to authenticated;
grant select on table public.user_roles to authenticated;
grant select on table public.user_team_assignments to authenticated;
grant select on table public.reports to authenticated;
grant select on table public.players to authenticated;
grant select on table public.player_reviews to authenticated;
grant select on table public.report_comments to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
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
to authenticated
using (
  auth.uid() = user_id
  or public.has_any_role(array['admin', 'executive_director', 'technical_director', 'board_observer'])
);

drop policy if exists "players_select_own" on public.players;
create policy "players_select_own"
on public.players
for select
to authenticated
using (
  exists (
    select 1
    from public.reports
    where reports.id = players.report_id
      and (
        reports.user_id = auth.uid()
        or public.has_any_role(array['admin', 'executive_director', 'technical_director', 'board_observer'])
      )
  )
);

drop policy if exists "player_reviews_select_own" on public.player_reviews;
create policy "player_reviews_select_own"
on public.player_reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.reports
    where reports.id = player_reviews.report_id
      and (
        reports.user_id = auth.uid()
        or public.has_any_role(array['admin', 'executive_director', 'technical_director', 'board_observer'])
      )
  )
);

drop policy if exists "report_comments_select_accessible" on public.report_comments;
create policy "report_comments_select_accessible"
on public.report_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.reports
    where reports.id = report_comments.report_id
      and (
        reports.user_id = auth.uid()
        or public.has_any_role(array['admin', 'executive_director', 'technical_director', 'board_observer'])
      )
  )
);
