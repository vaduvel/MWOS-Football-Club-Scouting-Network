alter table public.match_days
  add column if not exists transport_plan_id uuid references public.transport_plans (id) on delete set null;

create unique index if not exists match_days_transport_plan_id_unique_idx
  on public.match_days (transport_plan_id)
  where transport_plan_id is not null;

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
    or (public.has_role('coach') and public.belongs_to_team(target_team_id))
    or (public.has_role('driver') and public.belongs_to_team(target_team_id));
$$;

create or replace function public.can_manage_transport_plan(target_plan_id uuid)
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
        or public.has_role('technical_director')
        or (public.has_role('coach') and public.belongs_to_team(transport_plans.team_id))
        or transport_plans.driver_user_id = auth.uid()
      )
  );
$$;
