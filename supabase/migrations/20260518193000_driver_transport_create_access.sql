create or replace function public.can_create_transport_team(target_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_admin()
    or public.has_role('technical_director')
    or (public.has_role('driver') and public.belongs_to_team(target_team_id));
$$;
