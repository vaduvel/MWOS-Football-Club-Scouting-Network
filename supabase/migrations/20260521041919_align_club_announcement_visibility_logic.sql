-- Recovered verbatim from the production migration ledger during audited reconciliation.
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
    and public.has_any_role(array['admin', 'technical_director', 'board_observer', 'coach', 'driver', 'scout'])
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
