create table if not exists public.staff_access_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_name text not null,
  actor_email text not null,
  target_user_id uuid references auth.users (id) on delete set null,
  target_name text not null,
  target_email text not null,
  action_type text not null,
  role_labels text[] not null default array[]::text[],
  team_names text[] not null default array[]::text[],
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.staff_access_events
drop constraint if exists staff_access_events_action_type_check;

alter table public.staff_access_events
add constraint staff_access_events_action_type_check check (
  action_type in (
    'access_updated',
    'access_revoked',
    'invite_created',
    'invite_resent',
    'invite_cancelled',
    'invite_expired',
    'invite_applied_existing',
    'invite_accepted'
  )
);

create index if not exists staff_access_events_created_at_idx
on public.staff_access_events (created_at desc);

create index if not exists staff_access_events_target_email_idx
on public.staff_access_events (target_email);

alter table public.staff_access_events enable row level security;

drop policy if exists "staff_access_events_select_admin" on public.staff_access_events;
create policy "staff_access_events_select_admin"
on public.staff_access_events
for select
to authenticated
using (public.can_manage_staff_access());

drop policy if exists "staff_access_events_insert_admin" on public.staff_access_events;
create policy "staff_access_events_insert_admin"
on public.staff_access_events
for insert
to authenticated
with check (public.can_manage_staff_access());

create or replace function public.complete_staff_invitations(
  target_user_id uuid,
  target_email text,
  target_invitation_token text default null
)
returns table (
  completed_count integer,
  invitation_ids uuid[],
  role_slugs text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(coalesce(target_email, '')));
  matched_invitation_ids uuid[] := array[]::uuid[];
  primary_role_label text;
begin
  if target_user_id is null or normalized_email = '' then
    raise exception 'A user and email are required to complete staff invitations.';
  end if;

  if not exists (
    select 1
    from auth.users
    where id = target_user_id
      and lower(coalesce(email, '')) = normalized_email
  ) then
    raise exception 'The authenticated user does not match the invitation email.';
  end if;

  perform 1
  from public.staff_invitations invitation
  where invitation.email_normalized = normalized_email
    and invitation.status = 'pending'
    and invitation.expires_at > timezone('utc', now())
    and (
      target_invitation_token is null
      or invitation.invitation_token = target_invitation_token
    )
  for update;

  select coalesce(array_agg(invitation.id order by invitation.created_at), array[]::uuid[])
  into matched_invitation_ids
  from public.staff_invitations invitation
  where invitation.email_normalized = normalized_email
    and invitation.status = 'pending'
    and invitation.expires_at > timezone('utc', now())
    and (
      target_invitation_token is null
      or invitation.invitation_token = target_invitation_token
    );

  if cardinality(matched_invitation_ids) = 0 then
    return query
    select 0, array[]::uuid[], array[]::text[];
    return;
  end if;

  insert into public.user_roles (user_id, role_id)
  select target_user_id, invitation_role.role_id
  from public.staff_invitation_roles invitation_role
  where invitation_role.invitation_id = any(matched_invitation_ids)
  on conflict (user_id, role_id) do nothing;

  insert into public.user_team_assignments (user_id, team_id)
  select target_user_id, invitation_team.team_id
  from public.staff_invitation_teams invitation_team
  where invitation_team.invitation_id = any(matched_invitation_ids)
  on conflict (user_id, team_id) do nothing;

  select role.label
  into primary_role_label
  from public.user_roles user_role
  join public.roles role on role.id = user_role.role_id
  where user_role.user_id = target_user_id
  order by
    case role.slug
      when 'admin' then 1
      when 'executive_director' then 2
      when 'technical_director' then 3
      when 'coach' then 4
      when 'driver' then 5
      when 'scout' then 6
      when 'board_observer' then 7
      else 100
    end,
    role.label
  limit 1;

  if primary_role_label is not null then
    update public.profiles
    set role = primary_role_label
    where id = target_user_id;
  end if;

  update public.staff_invitations
  set
    status = 'accepted',
    resolved_user_id = target_user_id,
    accepted_at = timezone('utc', now())
  where id = any(matched_invitation_ids)
    and status = 'pending';

  return query
  select
    cardinality(matched_invitation_ids),
    matched_invitation_ids,
    coalesce(
      array(
        select distinct role.slug
        from public.user_roles user_role
        join public.roles role on role.id = user_role.role_id
        where user_role.user_id = target_user_id
        order by role.slug
      ),
      array[]::text[]
    );
end;
$$;

revoke all on function public.complete_staff_invitations(uuid, text, text) from public;
revoke all on function public.complete_staff_invitations(uuid, text, text) from anon;
revoke all on function public.complete_staff_invitations(uuid, text, text) from authenticated;
grant execute on function public.complete_staff_invitations(uuid, text, text) to service_role;
