-- Scouts evaluate external players and do not need internal team assignments.
-- This pure metadata helper does not grant data access or change RLS policies.
create or replace function public.role_requires_team(target_slug text)
returns boolean language sql stable security invoker set search_path=public
as $$ select lower(trim(coalesce(target_slug,''))) in ('coach','team_manager','driver'); $$;
